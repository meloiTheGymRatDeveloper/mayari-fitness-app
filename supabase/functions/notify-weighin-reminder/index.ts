// supabase/functions/notify-weighin-reminder/index.ts
// Daily at 08:00 Manila. Weekly prefs fire Sundays; monthly prefs fire on the 1st.
// Skips anyone with a body_measurements row inside the window.
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const manilaDateStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Manila" });
    const manilaDay = new Date(`${manilaDateStr}T00:00:00+08:00`);
    const weekday = manilaDay.getUTCDay(); // Manila-midnight anchored; 0 = Sunday
    const dayOfMonth = parseInt(manilaDateStr.slice(8, 10), 10);

    const isSunday = weekday === 0;
    const isFirst = dayOfMonth === 1;
    if (!isSunday && !isFirst) {
      return new Response(JSON.stringify({ sent: 0, reason: "not a reminder day" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    function dateMinusDays(days: number): string {
      const d = new Date(`${manilaDateStr}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - days);
      return d.toISOString().slice(0, 10);
    }

    async function measuredSinceSet(sinceDate: string): Promise<Set<string>> {
      const { data, error } = await supabase
        .from("body_measurements")
        .select("user_id")
        .gte("measured_at", sinceDate);
      if (error) throw error;
      return new Set((data ?? []).map((r: { user_id: string }) => r.user_id));
    }

    const freqs: Array<"weekly" | "monthly"> = [];
    if (isSunday) freqs.push("weekly");
    if (isFirst) freqs.push("monthly");

    let sent = 0;
    for (const freq of freqs) {
      const windowStart = freq === "weekly" ? dateMinusDays(6) : dateMinusDays(27);
      const measured = await measuredSinceSet(windowStart);

      const { data: users, error } = await supabase
        .from("users")
        .select("id, push_token")
        .eq("notif_weighin", freq)
        .not("push_token", "is", null);
      if (error) throw error;

      const eligible = (users ?? []).filter((u: { id: string }) => !measured.has(u.id));
      await Promise.allSettled(
        eligible.map((u: { push_token: string }) =>
          fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              to: u.push_token,
              title: "Weigh-in day! ⚖️",
              body: "Update your weight para makita mo ang progress mo. 🌙",
              sound: "default",
              data: { url: "/(tabs)/profile/measurements" },
            }),
          })
        )
      );
      sent += eligible.length;
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-weighin-reminder error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
