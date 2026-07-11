// supabase/functions/notify-nutrition-reminder/index.ts
// Fires at 11:00 and 19:00 Manila (cron). Reminds users who haven't logged ANY food today.
import { createClient } from "npm:@supabase/supabase-js@2";

const LUNCH_COPY = [
  "Kumain ka na ba? Log your lunch para tuloy ang streak! 🍚",
  "Halfway through the day — anong kinain mo? Quick log lang! 🥗",
];
const EVENING_COPY = [
  "Wala ka pang food log today. Quick log lang bago matulog! 🌙",
  "Huwag kalimutan i-log ang meals mo — 10 seconds lang! 🍽️",
];

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const manilaDate = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Manila" });
    const manilaHour = parseInt(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Manila", hour: "numeric", hour12: false }),
      10
    ) % 24;
    const dayStartUtc = new Date(`${manilaDate}T00:00:00+08:00`).toISOString();
    const copyPool = manilaHour < 15 ? LUNCH_COPY : EVENING_COPY;

    // Everyone who already logged food today (any log counts — NOT streaks.last_nutrition_date,
    // which only updates after 3 meal slots)
    const { data: logged, error: logErr } = await supabase
      .from("food_logs")
      .select("user_id")
      .gte("logged_at", dayStartUtc);
    if (logErr) throw logErr;
    const loggedSet = new Set((logged ?? []).map((r: { user_id: string }) => r.user_id));

    const { data: users, error } = await supabase
      .from("users")
      .select("id, push_token, display_name")
      .eq("notif_nutrition_enabled", true)
      .not("push_token", "is", null);
    if (error) throw error;

    const eligible = (users ?? []).filter((u: { id: string }) => !loggedSet.has(u.id));

    await Promise.allSettled(
      eligible.map((u: { push_token: string }, i: number) =>
        fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            to: u.push_token,
            title: "Coach Mayari 🌙",
            body: copyPool[i % copyPool.length],
            sound: "default",
            data: { url: "/(tabs)/nutrition" },
          }),
        })
      )
    );

    return new Response(
      JSON.stringify({ sent: eligible.length, slot: manilaHour < 15 ? "lunch" : "evening" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("notify-nutrition-reminder error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
