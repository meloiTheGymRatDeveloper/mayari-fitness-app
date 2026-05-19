import { createClient } from "npm:@supabase/supabase-js@2";

interface UserRow {
  id: string;
  push_token: string;
  display_name: string;
  streaks: { workout_current: number; last_workout_date: string | null }[]
         | { workout_current: number; last_workout_date: string | null }
         | null;
}

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toLocaleDateString("sv-SE", { timeZone: "Asia/Manila" });

    const { data: users, error } = await supabase
      .from("users")
      .select("id, push_token, display_name, streaks!inner(workout_current, last_workout_date)")
      .eq("notif_streak_alert", true)
      .not("push_token", "is", null) as { data: UserRow[] | null; error: unknown };

    if (error) throw error;

    const eligible = (users ?? []).filter((u) => {
      const streakRow = Array.isArray(u.streaks) ? u.streaks[0] : u.streaks;
      if (!streakRow) return false;
      return (streakRow.workout_current ?? 0) > 0 && streakRow.last_workout_date === yesterday;
    });

    await Promise.allSettled(
      eligible.map((u) => {
        const streakRow = Array.isArray(u.streaks) ? u.streaks[0] : u.streaks;
        const n = streakRow?.workout_current ?? 0;
        return fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            to: u.push_token,
            title: "Streak Alert! 🔥",
            body: `Log a workout today or your ${n}-day streak ends! 🔥`,
            sound: "default",
          }),
        });
      })
    );

    return new Response(JSON.stringify({ sent: eligible.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-streak-alert error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
