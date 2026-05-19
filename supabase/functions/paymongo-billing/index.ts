import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYMONGO_BASE = "https://api.paymongo.com/v1";

function authHeader(): string {
  const secret = Deno.env.get("PAYMONGO_SECRET_KEY")!;
  return `Basic ${btoa(`${secret}:`)}`;
}

async function pmPost(path: string, body: unknown): Promise<Response> {
  return fetch(`${PAYMONGO_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authHeader(),
    },
    body: JSON.stringify(body),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authorizationHeader = req.headers.get("Authorization");
    if (!authorizationHeader) return respond({ error: "Unauthorized" }, 401);

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authorizationHeader } } }
    );
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) return respond({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({})) as { action?: string };
    const { action } = body;
    if (!action) return respond({ error: "Missing action" }, 400);

    // ── create_subscription ───────────────────────────────────────────────────
    if (action === "create_subscription") {
      const planId = Deno.env.get("PAYMONGO_PLAN_ID")!;

      // Reuse existing customer if available
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("paymongo_customer_id")
        .eq("user_id", user.id)
        .maybeSingle();

      let customerId = existing?.paymongo_customer_id as string | undefined;

      if (!customerId) {
        const custRes = await pmPost("/customers", {
          data: { attributes: { email: user.email } },
        });
        if (!custRes.ok) {
          const err = await custRes.text();
          console.error("PayMongo customer error:", err);
          return respond({ error: "Could not create customer" }, 502);
        }
        const custData = await custRes.json();
        customerId = custData.data.id as string;
      }

      const subRes = await pmPost("/subscriptions", {
        data: {
          attributes: {
            plan_id: planId,
            customer_id: customerId,
          },
        },
      });
      if (!subRes.ok) {
        const err = await subRes.text();
        console.error("PayMongo subscription error:", err);
        return respond({ error: "Could not create subscription" }, 502);
      }
      const subData = await subRes.json();
      const subscriptionId = subData.data.id as string;
      // PayMongo returns payment_url for the hosted checkout page
      const checkoutUrl = subData.data.attributes.payment_url as string;

      await supabase.from("subscriptions").upsert(
        { user_id: user.id, paymongo_customer_id: customerId, paymongo_subscription_id: subscriptionId },
        { onConflict: "user_id" }
      );

      return respond({ checkout_url: checkoutUrl });
    }

    // ── cancel_subscription ───────────────────────────────────────────────────
    if (action === "cancel_subscription") {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("paymongo_subscription_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (sub?.paymongo_subscription_id) {
        const cancelRes = await fetch(
          `${PAYMONGO_BASE}/subscriptions/${sub.paymongo_subscription_id}`,
          { method: "DELETE", headers: { Authorization: authHeader() } }
        );
        if (!cancelRes.ok) {
          const err = await cancelRes.text();
          console.error("PayMongo cancel error:", err);
          // Continue to update DB even if PayMongo errors — user wants to cancel
        }
      }

      const [subRes, userRes] = await Promise.all([
        supabase.from("subscriptions").update({
          tier: "free",
          paymongo_subscription_id: null,
          current_period_end: null,
        }).eq("user_id", user.id),
        supabase.from("users").update({
          subscription_status: "free",
          subscription_expires_at: null,
        }).eq("id", user.id),
      ]);

      if (subRes.error) {
        console.error("cancel_subscription DB error (subscriptions):", subRes.error);
        return respond({ error: "Failed to update subscription" }, 500);
      }
      if (userRes.error) {
        console.error("cancel_subscription DB error (users):", userRes.error);
        return respond({ error: "Failed to update user status" }, 500);
      }

      return respond({ ok: true });
    }

    return respond({ error: "Unknown action" }, 400);

  } catch (err) {
    console.error("paymongo-billing error:", err);
    return respond({ error: "Internal server error" }, 500);
  }
});
