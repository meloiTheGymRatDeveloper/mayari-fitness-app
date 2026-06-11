import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APPLE_PRODUCTION_URL = "https://buy.itunes.apple.com/verifyReceipt";
const APPLE_SANDBOX_URL = "https://sandbox.itunes.apple.com/verifyReceipt";

const PRODUCT_MAP: Record<string, { price_cents: number; months: number }> = {
  "com.mayari.app.pro.monthly": { price_cents: 8900,  months: 1  },
  "com.mayari.app.pro.yearly":  { price_cents: 79900, months: 12 },
};

async function verifyReceipt(url: string, receiptData: string, sharedSecret: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      "receipt-data": receiptData,
      "password": sharedSecret,
      "exclude-old-transactions": true,
    }),
  });
  return res.json() as Promise<{ status: number; latest_receipt_info?: Record<string, string>[] }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { receipt, product_id } = await req.json() as { receipt: string; product_id: string };

    if (!receipt || !product_id) {
      return new Response(JSON.stringify({ error: "Missing receipt or product_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const plan = PRODUCT_MAP[product_id];
    if (!plan) {
      return new Response(JSON.stringify({ error: "Unknown product_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sharedSecret = Deno.env.get("APPLE_SHARED_SECRET") ?? "";

    // Apple recommends always trying production first
    let appleResponse = await verifyReceipt(APPLE_PRODUCTION_URL, receipt, sharedSecret);

    // status 21007 = sandbox receipt sent to production — retry with sandbox
    if (appleResponse.status === 21007) {
      appleResponse = await verifyReceipt(APPLE_SANDBOX_URL, receipt, sharedSecret);
    }

    if (appleResponse.status !== 0) {
      console.error("Apple receipt verification failed, status:", appleResponse.status);
      return new Response(JSON.stringify({ error: `Apple verification failed: ${appleResponse.status}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find most recent transaction for this product
    const allReceipts = appleResponse.latest_receipt_info ?? [];
    const productReceipts = allReceipts.filter((r) => r.product_id === product_id);

    if (productReceipts.length === 0) {
      return new Response(JSON.stringify({ error: "No matching transaction for product" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const latest = productReceipts.sort(
      (a, b) => Number(b.purchase_date_ms) - Number(a.purchase_date_ms),
    )[0];

    const now = new Date();
    const periodEnd = latest.expires_date_ms
      ? new Date(Number(latest.expires_date_ms))
      : new Date(now.getTime() + plan.months * 30 * 24 * 60 * 60 * 1000);

    // Upsert subscription record
    const { error: subError } = await supabase.from("subscriptions").upsert(
      {
        user_id: user.id,
        tier: "active",
        price_paid_cents: plan.price_cents,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        referral_discount_pct: 0,
        consistency_discount_pct: 0,
      },
      { onConflict: "user_id" },
    );
    if (subError) throw subError;

    // Sync users table
    await supabase.from("users").update({
      subscription_status: "active",
      subscription_expires_at: periodEnd.toISOString(),
    }).eq("id", user.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("apple-iap-verify error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
