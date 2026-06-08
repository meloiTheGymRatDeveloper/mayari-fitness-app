import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// FK-safe deletion order: children before parents
const DELETION_ORDER = [
  "workout_sets",
  "workout_sessions",
  "workout_plans",
  "personal_records",
  "food_logs",
  "body_measurements",
  "coach_messages",
  "streaks",
  "fasting_logs",
  "cardio_metrics",
  "cardio_plan_enrollments",
  "strava_connections",
  "referrals",
  "subscriptions",
  "users",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller's JWT to get user ID
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Explicitly delete in FK-safe order before removing auth user
    for (const table of DELETION_ORDER) {
      const col = table === "referrals" ? undefined : "user_id";
      if (col) {
        const { error } = await adminClient.from(table).delete().eq(col, user.id);
        if (error) console.error(`delete-account: failed to delete from ${table}:`, error.message);
      } else {
        // referrals: user may appear as referrer or referred_user
        await adminClient.from("referrals").delete().eq("referrer_id", user.id);
        await adminClient.from("referrals").delete().eq("referred_user_id", user.id);
      }
    }

    // Delete auth user last
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
