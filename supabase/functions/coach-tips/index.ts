// supabase/functions/coach-tips/index.ts
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

interface FoodLogWithItem {
  quantity_g: number;
  food_items: { calories_per_100g: number | null; protein_per_100g: number | null } | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    // 2. Service role client for DB reads/writes
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 3. Get user profile (calorie_goal, protein_goal_g, workout_days, body_weight_kg)
    const { data: profile } = await serviceClient
      .from("users")
      .select("calorie_goal, protein_goal_g, workout_days, body_weight_kg, experience_level")
      .eq("id", userId)
      .single();

    // 4. Get today's food logs sum
    const today = new Date().toISOString().split("T")[0];
    const { data: logsWithItems } = await serviceClient
      .from("food_logs")
      .select("quantity_g, food_items(calories_per_100g, protein_per_100g)")
      .eq("user_id", userId)
      .gte("logged_at", `${today}T00:00:00.000Z`)
      .lte("logged_at", `${today}T23:59:59.999Z`);

    let totalCalories = 0;
    let totalProtein = 0;
    for (const log of (logsWithItems ?? []) as FoodLogWithItem[]) {
      const item = log.food_items;
      if (item && log.quantity_g) {
        totalCalories += ((item.calories_per_100g ?? 0) / 100) * log.quantity_g;
        totalProtein += ((item.protein_per_100g ?? 0) / 100) * log.quantity_g;
      }
    }

    // 5. Get today's workout sessions
    const { data: workoutSessions } = await serviceClient
      .from("workout_sessions")
      .select("id")
      .eq("user_id", userId)
      .gte("started_at", `${today}T00:00:00.000Z`)
      .lte("started_at", `${today}T23:59:59.999Z`);
    const workoutCount = workoutSessions?.length ?? 0;

    // 6. Get streaks
    const { data: streaks } = await serviceClient
      .from("streaks")
      .select("workout_current")
      .eq("user_id", userId)
      .single();

    // 7. Get today's personal records
    const { data: todayPRs } = await serviceClient
      .from("personal_records")
      .select("exercise_name")
      .eq("user_id", userId)
      .gte("achieved_at", `${today}T00:00:00.000Z`)
      .lte("achieved_at", `${today}T23:59:59.999Z`)
      .limit(1);

    // 8. Determine tip type (priority: pr > streak > nutrition > workout > general)
    let tipType = "general";
    let tipContext: Record<string, unknown> = {};

    if (todayPRs && todayPRs.length > 0) {
      tipType = "pr";
      tipContext = { exercise_name: todayPRs[0].exercise_name };
    } else if (streaks?.workout_current && streaks.workout_current > 0 && streaks.workout_current % 7 === 0) {
      tipType = "streak";
      tipContext = { streak_days: streaks.workout_current };
    } else if (profile?.calorie_goal || profile?.protein_goal_g) {
      const calGoal = profile.calorie_goal ?? 0;
      const protGoal = profile.protein_goal_g ?? 0;
      if (calGoal > 0 && totalCalories > calGoal * 1.1) {
        tipType = "nutrition";
        tipContext = { calories: Math.round(totalCalories), goal: calGoal, protein_g: Math.round(totalProtein), protein_goal: protGoal };
      } else if (protGoal > 0 && totalProtein < protGoal * 0.8) {
        tipType = "nutrition";
        tipContext = { calories: Math.round(totalCalories), goal: calGoal, protein_g: Math.round(totalProtein), protein_goal: protGoal };
      }
    }

    if (tipType === "general" && workoutCount === 0) {
      // Check if today is a scheduled workout day
      // workout_days uses ISO weekday: 1=Mon, 2=Tue, ..., 7=Sun
      const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert to 1=Mon, 7=Sun
      if (profile?.workout_days?.includes(isoDay)) {
        tipType = "workout";
        tipContext = {};
      }
    }

    // 9. Dedup: check if tip of this type already exists today
    const { data: existingTip } = await serviceClient
      .from("coach_tips")
      .select("id")
      .eq("user_id", userId)
      .eq("tip_type", tipType)
      .gte("created_at", `${today}T00:00:00.000Z`)
      .lte("created_at", `${today}T23:59:59.999Z`)
      .limit(1);

    if (existingTip && existingTip.length > 0) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 10. Build prompt by tip type
    const prompts: Record<string, string> = {
      nutrition: `You are Mayari, a Filipino fitness coach. The user has logged ${tipContext.calories}kcal today against a ${tipContext.goal}kcal goal (protein: ${tipContext.protein_g}g of ${tipContext.protein_goal}g target). Write one short encouraging tip in Taglish (1-2 sentences) about their nutrition today. Never mention you're an AI. Be warm and specific.`,
      workout: `You are Mayari, a Filipino fitness coach. The user missed their scheduled workout today. Write one short motivating message in Taglish (1-2 sentences). Never mention you're an AI. Be warm and encouraging.`,
      streak: `You are Mayari, a Filipino fitness coach. The user just hit a ${tipContext.streak_days}-day workout streak. Write one short celebration message in Taglish (1-2 sentences). Never mention you're an AI. Be enthusiastic!`,
      pr: `You are Mayari, a Filipino fitness coach. The user just set a new personal record on ${tipContext.exercise_name}. Write one short celebration message in Taglish (1-2 sentences). Never mention you're an AI. Be enthusiastic!`,
      general: `You are Mayari, a Filipino fitness coach. Write one short general fitness motivation tip in Taglish (1-2 sentences) for a Filipino fitness enthusiast. Never mention you're an AI. Be warm and specific.`,
    };

    // 11. Call Claude Haiku
    const claudeResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: prompts[tipType] }],
    });

    if (!claudeResponse.content || claudeResponse.content.length === 0) {
      return new Response(JSON.stringify({ error: "Empty response from AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firstBlock = claudeResponse.content[0];
    if (firstBlock.type !== "text") {
      console.error("coach-tips: unexpected content type:", firstBlock.type);
      return new Response(JSON.stringify({ error: "Invalid AI response type" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = firstBlock.text.trim();

    // 12. Store tip
    const { data: newTip, error: insertError } = await serviceClient
      .from("coach_tips")
      .insert({ user_id: userId, content, tip_type: tipType })
      .select()
      .single();

    if (insertError) {
      console.error("coach-tips: insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save tip" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ tip_id: newTip.id, tip_type: tipType, content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("coach-tips error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
