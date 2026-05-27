// supabase/functions/mayari-analyze/index.ts
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  type TriggerEvent,
  TRIGGER_CATEGORY,
  DEDUP_HOURS,
  buildPrompt,
} from "../_shared/mayari-prompts.ts";

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

const serviceClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ── helpers ──────────────────────────────────────────────────────────────────

async function isDuped(userId: string, trigger: TriggerEvent): Promise<boolean> {
  const since = new Date(Date.now() - DEDUP_HOURS[trigger] * 3600000).toISOString();
  const { data } = await serviceClient
    .from("coach_tips")
    .select("id")
    .eq("user_id", userId)
    .eq("trigger_event", trigger)
    .gte("created_at", since)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

async function insertTip(
  userId: string,
  trigger: TriggerEvent,
  ctx: Record<string, unknown>,
  pushToken?: string | null,
) {
  const prompt = buildPrompt(trigger, ctx);
  const res = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    messages: [{ role: "user", content: prompt }],
  });
  const firstBlock = res.content[0];
  if (!firstBlock || firstBlock.type !== "text") {
    console.error(`insertTip ${trigger}: unexpected Claude response content type`);
    return;
  }
  const content = (firstBlock as { type: "text"; text: string }).text.trim();
  const tip_type = TRIGGER_CATEGORY[trigger];

  const { error } = await serviceClient
    .from("coach_tips")
    .insert({ user_id: userId, content, tip_type, trigger_event: trigger });

  if (error) {
    console.error(`insertTip ${trigger} for ${userId}:`, error);
    return;
  }

  if (pushToken) {
    await serviceClient.functions.invoke("send-push", {
      body: { user_id: userId, title: "Mayari", body: content },
    });
  }
}

// ── per-user analysis checks ──────────────────────────────────────────────────

async function checkWorkoutSilence(userId: string, pushToken: string | null) {
  const since = new Date(Date.now() - 2 * 24 * 3600000).toISOString();
  const { count } = await serviceClient
    .from("workout_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("started_at", since)
    .not("ended_at", "is", null);
  if ((count ?? 0) === 0) {
    if (await isDuped(userId, "workout_silence_2day")) return;
    await insertTip(userId, "workout_silence_2day", {}, pushToken);
  }
}

async function checkWaterReminder(userId: string, pushToken: string | null) {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await serviceClient
    .from("water_logs")
    .select("amount_ml")
    .eq("user_id", userId)
    .gte("logged_at", `${today}T00:00:00Z`);
  const total = (data ?? []).reduce((s: number, r: { amount_ml: number }) => s + r.amount_ml, 0);
  if (total < 500) {
    if (await isDuped(userId, "water_reminder")) return;
    const currentTime = new Date().toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
    await insertTip(userId, "water_reminder", { water_ml: total, current_time: currentTime }, pushToken);
  }
}

async function checkConsecutiveDays(userId: string, pushToken: string | null) {
  const since = new Date(Date.now() - 6 * 24 * 3600000).toISOString();
  const { data } = await serviceClient
    .from("workout_sessions")
    .select("started_at")
    .eq("user_id", userId)
    .gte("started_at", since)
    .not("ended_at", "is", null);
  const days = new Set((data ?? []).map((r: { started_at: string }) => r.started_at.split("T")[0]));
  if (days.size >= 5) {
    if (await isDuped(userId, "rest_day_recommended")) return;
    await insertTip(userId, "rest_day_recommended", { consecutive_days: days.size }, pushToken);
  }
}

async function checkSubscriptionLapse(
  userId: string,
  expiresAt: string | null,
  pushToken: string | null,
) {
  if (!expiresAt) return;
  const daysRemaining = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (daysRemaining > 0 && daysRemaining <= 7) {
    if (await isDuped(userId, "subscription_lapse")) return;
    await insertTip(userId, "subscription_lapse", { days_remaining: daysRemaining }, pushToken);
  }
}

async function checkPostWeekendReset(userId: string, pushToken: string | null) {
  // Only on Mondays (PH time ~UTC+8, cron runs at 00:00 UTC = 08:00 PHT)
  const dayOfWeek = new Date().getDay(); // 1 = Monday
  if (dayOfWeek !== 1) return;

  const friday = new Date(); friday.setDate(friday.getDate() - 3); friday.setHours(0, 0, 0, 0);
  const monday = new Date(); monday.setHours(0, 0, 0, 0);
  const { data } = await serviceClient
    .from("food_logs")
    .select("logged_at")
    .eq("user_id", userId)
    .gte("logged_at", friday.toISOString())
    .lt("logged_at", monday.toISOString());

  const loggedDays = new Set((data ?? []).map((r: { logged_at: string }) => r.logged_at.split("T")[0]));
  if (loggedDays.size < 2) {
    if (await isDuped(userId, "post_weekend_reset")) return;
    await insertTip(userId, "post_weekend_reset", { logged_days: loggedDays.size }, pushToken);
  }
}

async function checkWeeklyPattern(userId: string, pushToken: string | null) {
  const since = new Date(Date.now() - 28 * 24 * 3600000).toISOString();
  const { data } = await serviceClient
    .from("workout_sessions")
    .select("started_at, total_volume_kg")
    .eq("user_id", userId)
    .gte("started_at", since)
    .not("ended_at", "is", null);

  if (!data || data.length < 8) return; // not enough data

  const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const byDay: Record<number, number[]> = {};
  for (const s of data as { started_at: string; total_volume_kg: number }[]) {
    const dow = new Date(s.started_at).getDay();
    if (!byDay[dow]) byDay[dow] = [];
    byDay[dow].push(s.total_volume_kg ?? 0);
  }

  const dayAvgs = Object.entries(byDay)
    .filter(([, vols]) => vols.length >= 2)
    .map(([dow, vols]) => ({
      dow: Number(dow),
      avg: vols.reduce((a, b) => a + b, 0) / vols.length,
    }));

  if (dayAvgs.length < 3) return;
  dayAvgs.sort((a, b) => b.avg - a.avg);

  const best = dayAvgs[0];
  const otherAvg = dayAvgs.slice(1).reduce((s, d) => s + d.avg, 0) / (dayAvgs.length - 1);

  if (best.avg > otherAvg * 1.25) {
    if (await isDuped(userId, "weekly_pattern")) return;
    await insertTip(userId, "weekly_pattern", {
      best_day: DOW_NAMES[best.dow],
      best_day_volume_kg: Math.round(best.avg),
      avg_other_volume_kg: Math.round(otherAvg),
    }, pushToken);
  }
}

async function checkPlateau(userId: string, pushToken: string | null) {
  const { data } = await serviceClient
    .from("body_measurements")
    .select("measured_at, weight_kg")
    .eq("user_id", userId)
    .not("weight_kg", "is", null)
    .order("measured_at", { ascending: false })
    .limit(21);

  if (!data || data.length < 10) return;

  const weights = (data as { weight_kg: number }[]).map(r => r.weight_kg);
  const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
  const allClose = weights.every(w => Math.abs(w - avg) < 0.75);

  if (allClose) {
    if (await isDuped(userId, "plateau_detected")) return;
    await insertTip(userId, "plateau_detected", { weight_kg: avg.toFixed(1) }, pushToken);
  }
}

async function checkFoodVariety(userId: string, pushToken: string | null) {
  const since = new Date(Date.now() - 7 * 24 * 3600000).toISOString();
  const { data } = await serviceClient
    .from("food_logs")
    .select("food_items(name)")
    .eq("user_id", userId)
    .gte("logged_at", since);

  const counts: Record<string, number> = {};
  for (const log of (data ?? []) as { food_items: { name: string } | null }[]) {
    const name = log.food_items?.name;
    if (name) counts[name] = (counts[name] ?? 0) + 1;
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0 && sorted[0][1] >= 10) {
    if (await isDuped(userId, "food_variety_alert")) return;
    await insertTip(userId, "food_variety_alert", {
      top_food: sorted[0][0],
      count: sorted[0][1],
    }, pushToken);
  }
}

async function checkProteinRestDays(
  userId: string,
  workoutDays: number[],
  proteinGoal: number,
  pushToken: string | null,
) {
  if (!workoutDays || workoutDays.length === 0 || !proteinGoal) return;

  const since = new Date(Date.now() - 14 * 24 * 3600000).toISOString();
  const { data } = await serviceClient
    .from("food_logs")
    .select("logged_at, food_items(protein_per_100g), quantity_g")
    .eq("user_id", userId)
    .gte("logged_at", since);

  const restDayProteins: number[] = [];
  const byDay: Record<string, number> = {};

  for (const log of (data ?? []) as { logged_at: string; quantity_g: number; food_items: { protein_per_100g: number | null } | null }[]) {
    const date = log.logged_at.split("T")[0];
    const p = ((log.food_items?.protein_per_100g ?? 0) / 100) * log.quantity_g;
    byDay[date] = (byDay[date] ?? 0) + p;
  }

  for (const [dateStr, protein] of Object.entries(byDay)) {
    const dow = new Date(dateStr + "T12:00:00Z").getDay();
    const isoDow = dow === 0 ? 7 : dow;
    if (!workoutDays.includes(isoDow)) {
      restDayProteins.push(protein);
    }
  }

  if (restDayProteins.length < 3) return;

  const avgRestProtein = restDayProteins.reduce((a, b) => a + b, 0) / restDayProteins.length;
  if (avgRestProtein < proteinGoal * 0.75) {
    if (await isDuped(userId, "protein_low_rest_day")) return;
    await insertTip(userId, "protein_low_rest_day", {
      rest_day_protein_g: Math.round(avgRestProtein),
      protein_goal_g: Math.round(proteinGoal),
    }, pushToken);
  }
}

async function checkLateWorkouts(userId: string, pushToken: string | null) {
  const since = new Date(Date.now() - 7 * 24 * 3600000).toISOString();
  const { data } = await serviceClient
    .from("workout_sessions")
    .select("started_at")
    .eq("user_id", userId)
    .gte("started_at", since)
    .not("ended_at", "is", null);

  const lateCount = (data ?? []).filter((s: { started_at: string }) => {
    const utcHour = new Date(s.started_at).getUTCHours();
    const phtHour = (utcHour + 8) % 24;
    return phtHour >= 22;
  }).length;

  if (lateCount >= 3) {
    if (await isDuped(userId, "late_workout_pattern")) return;
    await insertTip(userId, "late_workout_pattern", { late_count: lateCount }, pushToken);
  }
}

async function checkAbandonedWorkout(userId: string, pushToken: string | null) {
  const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
  const fourHoursAgo = new Date(Date.now() - 4 * 3600000).toISOString();
  const { data } = await serviceClient
    .from("workout_sessions")
    .select("id")
    .eq("user_id", userId)
    .is("ended_at", null)
    .lt("started_at", twoHoursAgo)
    .gte("started_at", fourHoursAgo)
    .limit(1);
  if (data && data.length > 0) {
    if (await isDuped(userId, "abandoned_workout")) return;
    await insertTip(userId, "abandoned_workout", { hours_ago: 2 }, pushToken);
  }
}

async function checkRestDayTomorrow(
  userId: string,
  workoutDays: number[],
  pushToken: string | null,
) {
  if (!workoutDays || workoutDays.length === 0) return;
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDow = tomorrow.getDay();
  const isoTomorrow = tomorrowDow === 0 ? 7 : tomorrowDow;
  if (!workoutDays.includes(isoTomorrow)) {
    const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    if (await isDuped(userId, "rest_day_tomorrow")) return;
    await insertTip(userId, "rest_day_tomorrow", {
      rest_day_name: DOW_NAMES[tomorrowDow],
    }, pushToken);
  }
}

// ── main handler ──────────────────────────────────────────────────────────────

Deno.serve(async () => {
  try {
    const { data: users, error } = await serviceClient
      .from("users")
      .select("id, push_token, workout_days, protein_goal_g, subscription_expires_at, subscription_status")
      .neq("subscription_status", "free");

    if (error) throw error;

    const results = await Promise.allSettled(
      (users ?? []).map(async (user: {
        id: string;
        push_token: string | null;
        workout_days: number[];
        protein_goal_g: number | null;
        subscription_expires_at: string | null;
        subscription_status: string;
      }) => {
        const pt = user.push_token;
        await Promise.allSettled([
          checkWorkoutSilence(user.id, pt),
          checkWaterReminder(user.id, pt),
          checkConsecutiveDays(user.id, pt),
          checkSubscriptionLapse(user.id, user.subscription_expires_at, pt),
          checkPostWeekendReset(user.id, pt),
          checkWeeklyPattern(user.id, pt),
          checkPlateau(user.id, pt),
          checkFoodVariety(user.id, pt),
          checkProteinRestDays(user.id, user.workout_days ?? [], user.protein_goal_g ?? 0, pt),
          checkLateWorkouts(user.id, pt),
          checkAbandonedWorkout(user.id, pt),
          checkRestDayTomorrow(user.id, user.workout_days ?? [], pt),
        ]);
      })
    );

    const failed = results.filter(r => r.status === "rejected").length;
    return new Response(
      JSON.stringify({ processed: results.length, failed }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("mayari-analyze error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});
