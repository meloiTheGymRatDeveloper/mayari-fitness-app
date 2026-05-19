// supabase/functions/coach-chat/index.ts
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify JWT and extract authenticated userId
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

    const body = await req.json().catch(() => null);
    if (!body || typeof body.message !== "string" || !body.message.trim()) {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const messageType: "chat" | "plan_generation" =
      body.messageType === "plan_generation" ? "plan_generation" : "chat";
    const mode: string = body.mode ?? "";
    const message = body.message.trim().slice(0, 2000);

    // food_parse mode: structured food parsing for voice/text logging
    if (mode === "food_parse") {
      const systemPrompt = `You are a food parsing assistant for a Filipino fitness app.
The user will describe what they ate in English or Tagalog/Filipino.
Parse their description and return a JSON array of food items.
Common Filipino foods: sinangag (garlic fried rice ~200 kcal/cup), longganisa (~150 kcal/piece), itlog (egg ~70 kcal), adobo (~250 kcal/serving), sinigang (~200 kcal/bowl).
Use 100g as default quantity if not specified.
IMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation.
Format: [{"name":"food name","quantity_g":100,"calories":200,"protein_g":15,"carbs_g":20,"fat_g":8}]`;

      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: "user", content: message }],
      });

      let parsed_foods: unknown[] = [];
      try {
        const text = response.content[0].type === "text" ? response.content[0].text : "[]";
        parsed_foods = JSON.parse(text);
      } catch {
        parsed_foods = [];
      }

      return new Response(JSON.stringify({ parsed_foods }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // fall through to existing chat / plan_generation logic

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch user profile
    const { data: profile } = await supabase
      .from("users")
      .select("display_name, primary_goal, experience_level, workout_days, equipment_type, body_weight_kg, height_cm, calorie_goal, protein_goal_g")
      .eq("id", userId)
      .single();

    if (!profile) {
      console.warn("coach-chat: no profile found for userId:", userId);
    }

    // 2. Fetch last 7 days workout sessions + sets
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: sessions } = await supabase
      .from("workout_sessions")
      .select("total_volume_kg")
      .eq("user_id", userId)
      .gte("started_at", sevenDaysAgo);

    const sessionCount = sessions?.length ?? 0;
    const totalVolume = (sessions ?? []).reduce(
      (sum: number, s: { total_volume_kg: number }) => sum + (s.total_volume_kg ?? 0), 0
    );

    // 3. Fetch last 7 days food logs for nutrition averages
    const { data: foodLogs } = await supabase
      .from("food_logs")
      .select("quantity_g, logged_at, food_item:food_items(calories_per_100g, protein_per_100g)")
      .eq("user_id", userId)
      .gte("logged_at", sevenDaysAgo);

    const dailyTotals: Record<string, { cal: number; protein: number }> = {};
    for (const log of (foodLogs ?? []) as Array<{
      quantity_g: number;
      logged_at: string;
      food_item: { calories_per_100g: number | null; protein_per_100g: number | null } | null;
    }>) {
      const day = log.logged_at.substring(0, 10);
      if (!dailyTotals[day]) dailyTotals[day] = { cal: 0, protein: 0 };
      const q = log.quantity_g / 100;
      dailyTotals[day].cal += (log.food_item?.calories_per_100g ?? 0) * q;
      dailyTotals[day].protein += (log.food_item?.protein_per_100g ?? 0) * q;
    }
    const days = Object.values(dailyTotals);
    const avgCal = days.length
      ? Math.round(days.reduce((s, d) => s + d.cal, 0) / days.length) : 0;
    const avgProtein = days.length
      ? Math.round(days.reduce((s, d) => s + d.protein, 0) / days.length) : 0;

    // 4. Fetch streaks
    const { data: streak } = await supabase
      .from("streaks")
      .select("workout_current, nutrition_current")
      .eq("user_id", userId)
      .single();

    const systemPrompt = `You are Coach Mayari, a science-based fitness and nutrition coach for Filipino users.
You are warm, encouraging, and knowledgeable — like a gym buddy who studied exercise science.

USER PROFILE:
- Name: ${profile?.display_name ?? "User"}
- Goal: ${profile?.primary_goal ?? "improve_fitness"}
- Experience: ${profile?.experience_level ?? "beginner"}
- Workout days per week: ${(profile?.workout_days as number[] | null)?.length ?? 3}
- Equipment: ${profile?.equipment_type ?? "full_gym"}
- Current weight: ${profile?.body_weight_kg ?? "?"}kg, Height: ${profile?.height_cm ?? "?"}cm
- Calorie goal: ${profile?.calorie_goal ?? "not set"} kcal/day, Protein goal: ${profile?.protein_goal_g ?? "not set"}g/day

RECENT ACTIVITY (last 7 days):
- Workouts completed: ${sessionCount}
- Total volume lifted: ${totalVolume}kg
- Average daily calories: ${avgCal} kcal
- Average daily protein: ${avgProtein}g

STREAKS:
- Workout streak: ${streak?.workout_current ?? 0} days
- Nutrition streak: ${streak?.nutrition_current ?? 0} days

TRAINING PRINCIPLES YOU FOLLOW:
- Progressive overload: always suggest increasing weight or reps when user completes all sets
- Protein target: 1.6–2.2g per kg of bodyweight for muscle building
- For fat loss: calorie deficit of 300–500 kcal below TDEE
- Compound lifts first in every session (squat, deadlift, bench, row, OHP)
- Deload every 6th week: reduce volume by 40%
- Beginners: 3 sets 8–12 reps. Intermediate: 4 sets. Advanced: 5 sets.
- Rest: 2–3 minutes for compounds, 60–90 seconds for isolation

FILIPINO FOOD KNOWLEDGE:
High protein budget options: tinapa, itlog, tokwa, canned sardinas, monggo, kangkong.
Common staples: sinangag, pan de sal, kanin.
Use Filipino food names naturally when suggesting meals.

RESPONSE RULES:
- If user writes Tagalog or Taglish, respond in Taglish.
- If English, respond in English.
- Keep responses concise and actionable (under 200 words for chat).
- For plan_generation: output a structured JSON plan with this exact shape:
  { "days": [ { "day_label": "Day 1 — Push", "exercises": [ { "exercise_id": "bench_press", "exercise_name": "Bench Press", "muscle_group": "push", "sets": 4, "reps_low": 8, "reps_high": 12, "rest_seconds": 120 } ] } ] }
- Never recommend supplements. Focus on whole food nutrition.
- Be honest if a goal is unrealistic, but stay encouraging.`;

    const model = messageType === "plan_generation"
      ? "claude-sonnet-4-5"
      : "claude-haiku-4-5";

    const claudeResponse = await anthropic.messages.create({
      model,
      max_tokens: messageType === "plan_generation" ? 2048 : 512,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: message }],
    });

    const responseText =
      claudeResponse.content[0].type === "text" ? claudeResponse.content[0].text : "";

    // Save both turns to coach_messages
    const { error: insertError } = await supabase.from("coach_messages").insert([
      { user_id: userId, role: "user", content: message, message_type: messageType },
      { user_id: userId, role: "assistant", content: responseText, message_type: messageType },
    ]);
    if (insertError) {
      console.error("coach_messages insert failed:", insertError.message);
    }

    return new Response(JSON.stringify({ response: responseText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("coach-chat error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
