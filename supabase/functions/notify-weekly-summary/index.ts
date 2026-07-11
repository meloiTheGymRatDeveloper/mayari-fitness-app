import { createClient } from "npm:@supabase/supabase-js@2";

interface UserRow {
  id: string;
  push_token: string;
  display_name: string;
  streaks: { workout_current: number }[] | { workout_current: number } | null;
}

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: users, error } = await supabase
      .from("users")
      .select("id, push_token, display_name, streaks(workout_current)")
      .eq("notif_weekly_summary", true)
      .not("push_token", "is", null) as { data: UserRow[] | null; error: unknown };

    if (error) throw error;

    const results = await Promise.allSettled(
      (users ?? []).map(async (u) => {
        const [workoutRes, foodRes] = await Promise.all([
          supabase
            .from("workout_sessions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", u.id)
            .not("ended_at", "is", null)
            .gte("started_at", sevenDaysAgo),
          supabase
            .from("food_logs")
            .select("logged_at, quantity_g, food_items(calories_per_100g)")
            .eq("user_id", u.id)
            .gte("logged_at", sevenDaysAgo),
        ]);

        if (workoutRes.error) {
          console.error(`notify-weekly-summary: workout query failed for user ${u.id}:`, workoutRes.error);
          return;
        }
        if (foodRes.error) {
          console.error(`notify-weekly-summary: food query failed for user ${u.id}:`, foodRes.error);
          return;
        }

        const workoutCount = workoutRes.count ?? 0;

        // Average daily calories over days that have any log
        const dailyCalories: Record<string, number> = {};
        for (const log of (foodRes.data ?? [])) {
          const day = (log.logged_at as string).substring(0, 10);
          const food = Array.isArray(log.food_items) ? log.food_items[0] : log.food_items;
          const cal = ((food as { calories_per_100g?: number } | null)?.calories_per_100g ?? 0)
            * ((log.quantity_g as number) ?? 0) / 100;
          dailyCalories[day] = (dailyCalories[day] ?? 0) + cal;
        }
        const calorieValues = Object.values(dailyCalories);
        const avgCal = calorieValues.length > 0
          ? Math.round(calorieValues.reduce((a, b) => a + b, 0) / calorieValues.length)
          : 0;

        const streakRow = Array.isArray(u.streaks) ? u.streaks[0] : u.streaks;
        const streak = streakRow?.workout_current ?? 0;

        const summaryText = `Weekly recap, ${u.display_name}! 📊 This week: ${workoutCount} workout${workoutCount === 1 ? "" : "s"}, avg ${avgCal} kcal/day, ${streak}-day streak.`;

        // Land the recap in the Coach Mayari chat thread too (renders as an insight tip)
        const { error: tipErr } = await supabase.from("coach_tips").insert({
          user_id: u.id,
          tip_type: "insight",
          content: `${summaryText}\n\nReply here kung may tanong ka sa week mo! 💬`,
        });
        if (tipErr) {
          console.error(`notify-weekly-summary: tip insert failed for user ${u.id}:`, tipErr.message);
        }

        return fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            to: u.push_token,
            title: "Weekly Summary 🌙",
            body: `This week: ${workoutCount} workouts, avg ${avgCal} kcal/day, ${streak}-day streak. Keep it up! 🌙`,
            sound: "default",
          }),
        });
      })
    );

    const failCount = results.filter(r => r.status === "rejected").length;
    if (failCount > 0) {
      console.error(`notify-weekly-summary: ${failCount} of ${results.length} users failed`);
    }

    return new Response(JSON.stringify({ sent: results.length - failCount, failed: failCount }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-weekly-summary error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
