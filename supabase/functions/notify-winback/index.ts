// supabase/functions/notify-winback/index.ts
// Daily at 12:00 Manila. Pushes when last activity was exactly 5 or exactly 14 days ago.
import { createClient } from "npm:@supabase/supabase-js@2";

function manilaDayString(offsetDays: number): string {
  const nowManila = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Manila" });
  const d = new Date(`${nowManila}T00:00:00+08:00`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toLocaleDateString("sv-SE", { timeZone: "Asia/Manila" });
}
function manilaDayStartUtc(dayStr: string): string {
  return new Date(`${dayStr}T00:00:00+08:00`).toISOString();
}

Deno.serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Users active on/after day-4 are NOT lapsed 5+ days → exclude.
    const activeSinceDay4 = manilaDayStartUtc(manilaDayString(-4));

    async function activeUserSet(sinceIso: string, untilIso?: string): Promise<Set<string>> {
      let food = supabase.from("food_logs").select("user_id").gte("logged_at", sinceIso);
      let workouts = supabase.from("workout_sessions").select("user_id").gte("started_at", sinceIso);
      if (untilIso) {
        food = food.lt("logged_at", untilIso);
        workouts = workouts.lt("started_at", untilIso);
      }
      const [f, w] = await Promise.all([food, workouts]);
      if (f.error) throw f.error;
      if (w.error) throw w.error;
      const set = new Set<string>();
      for (const r of f.data ?? []) set.add((r as { user_id: string }).user_id);
      for (const r of w.data ?? []) set.add((r as { user_id: string }).user_id);
      return set;
    }

    const recentlyActive = await activeUserSet(activeSinceDay4);
    const activeOnDay5 = await activeUserSet(
      manilaDayStartUtc(manilaDayString(-5)), manilaDayStartUtc(manilaDayString(-4)));
    const activeDay13toDay5 = await activeUserSet(
      manilaDayStartUtc(manilaDayString(-13)), manilaDayStartUtc(manilaDayString(-4)));
    const activeOnDay14 = await activeUserSet(
      manilaDayStartUtc(manilaDayString(-14)), manilaDayStartUtc(manilaDayString(-13)));

    const day5Targets = [...activeOnDay5].filter((id) => !recentlyActive.has(id));
    const day14Targets = [...activeOnDay14].filter(
      (id) => !activeDay13toDay5.has(id) && !recentlyActive.has(id));

    const targets: Array<{ id: string; body: string }> = [
      ...day5Targets.map((id) => ({
        id, body: "Namiss ka namin! 🌙 Si Coach Mayari may tips para sa comeback mo." })),
      ...day14Targets.map((id) => ({
        id, body: "Kumusta ka na? One quick log lang para bumalik sa groove. 💪" })),
    ];
    if (targets.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: users, error } = await supabase
      .from("users")
      .select("id, push_token")
      .in("id", targets.map((t) => t.id))
      .eq("notif_winback_enabled", true)
      .not("push_token", "is", null);
    if (error) throw error;

    const tokenById = new Map(
      (users ?? []).map((u: { id: string; push_token: string }) => [u.id, u.push_token]));
    const sendable = targets.filter((t) => tokenById.has(t.id));

    await Promise.allSettled(
      sendable.map((t) =>
        fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            to: tokenById.get(t.id),
            title: "Coach Mayari 🌙",
            body: t.body,
            sound: "default",
            data: { url: "/(tabs)" },
          }),
        })
      )
    );

    return new Response(JSON.stringify({ sent: sendable.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-winback error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
