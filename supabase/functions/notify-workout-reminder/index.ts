import { createClient } from "npm:@supabase/supabase-js@2";

interface UserRow {
  id: string;
  push_token: string;
  display_name: string;
  notif_workout_time: string | null;
  streaks: { last_workout_date: string | null }[] | { last_workout_date: string | null } | null;
}

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Current Manila hour as zero-padded string, e.g. "18"
    const manilaHourRaw = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      hour12: false,
    });
    const currentHour = String(parseInt(manilaHourRaw, 10) % 24).padStart(2, "0");
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Manila" });

    const { data: users, error } = await supabase
      .from("users")
      .select("id, push_token, display_name, notif_workout_time, streaks(last_workout_date)")
      .eq("notif_workout_enabled", true)
      .not("push_token", "is", null) as { data: UserRow[] | null; error: unknown };

    if (error) throw error;

    const eligible = (users ?? []).filter((u) => {
      const userHour = (u.notif_workout_time ?? "18:00").split(":")[0].padStart(2, "0");
      if (userHour !== currentHour) return false;
      const streakRow = Array.isArray(u.streaks) ? u.streaks[0] : u.streaks;
      const lastDate = streakRow?.last_workout_date ?? null;
      return !lastDate || lastDate < today;
    });

    await Promise.allSettled(
      eligible.map((u) =>
        fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            to: u.push_token,
            title: "Time to train!",
            body: `Time to train, ${u.display_name}! 💪 Don't break your streak.`,
            sound: "default",
          }),
        })
      )
    );

    return new Response(JSON.stringify({ sent: eligible.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-workout-reminder error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
