import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICES = { monthly: 89, yearly: 799 } as const;
const REFERRAL_DISCOUNT_PESOS = 20;
const CONSISTENCY_DISCOUNT_PCT = 0.1;

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

    const body = await req.json().catch(() => ({}));
    const plan: "monthly" | "yearly" = body.plan === "yearly" ? "yearly" : "monthly";

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const basePrice = PRICES[plan];
    let finalPrice = basePrice;

    // Discounts only apply to monthly billing — yearly rate is already discounted
    if (plan === "monthly") {
      const [{ data: isConsistent }, { data: referralDiscount }] = await Promise.all([
        supabase.rpc("evaluate_consistency", { uid: userId }),
        supabase.rpc("calculate_referral_discount", { uid: userId }),
      ]);

      const consistencyDiscount = isConsistent
        ? Math.round(basePrice * CONSISTENCY_DISCOUNT_PCT)
        : 0;
      const refDiscount = (referralDiscount as number) > 0 ? REFERRAL_DISCOUNT_PESOS : 0;
      finalPrice = Math.max(1, basePrice - consistencyDiscount - refDiscount);
    }

    const paymongoSecret = Deno.env.get("PAYMONGO_SECRET_KEY")!;
    const encoded = btoa(`${paymongoSecret}:`);

    const description = plan === "yearly"
      ? "Mayari Pro — 1 year"
      : "Mayari Pro — 1 month";

    const paymongoRes = await fetch("https://api.paymongo.com/v1/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${encoded}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: finalPrice * 100,
            currency: "PHP",
            description,
            remarks: `user_id:${userId},plan:${plan}`,
          },
        },
      }),
    });

    if (!paymongoRes.ok) {
      const errBody = await paymongoRes.text();
      console.error("PayMongo error:", errBody);
      return new Response(JSON.stringify({ error: "Payment provider error" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymongoData = await paymongoRes.json();
    const checkoutUrl = paymongoData?.data?.attributes?.checkout_url as string;

    return new Response(
      JSON.stringify({ checkout_url: checkoutUrl, amount_pesos: finalPrice, plan }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-payment-link error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
