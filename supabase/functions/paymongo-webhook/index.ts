import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const rawBody = await req.text();
    const webhookSecret = Deno.env.get("PAYMONGO_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("PAYMONGO_WEBHOOK_SECRET not configured");
      return new Response("Misconfigured", { status: 500 });
    }

    // Verify HMAC-SHA256 signature
    {
      const sigHeader = req.headers.get("paymongo-signature") ?? "";
      const parts = Object.fromEntries(
        sigHeader.split(",").map(p => {
          const idx = p.indexOf("=");
          return [p.slice(0, idx), p.slice(idx + 1)] as [string, string];
        })
      );
      const timestamp = parts["t"] ?? "";
      const sigToVerify = parts["lv"] ?? parts["li"] ?? "";

      // Reject events older than 5 minutes (replay protection)
      const tsMs = parseInt(timestamp, 10) * 1000;
      if (isNaN(tsMs) || Math.abs(Date.now() - tsMs) > 5 * 60 * 1000) {
        return new Response("Expired webhook", { status: 401 });
      }

      const encoder = new TextEncoder();
      const cryptoKey = await crypto.subtle.importKey(
        "raw", encoder.encode(webhookSecret),
        { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
      );
      const signatureBuffer = await crypto.subtle.sign(
        "HMAC", cryptoKey, encoder.encode(`${timestamp}.${rawBody}`)
      );
      const computedSig = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      // Constant-time comparison to prevent timing attacks
      const sigA = encoder.encode(computedSig);
      const sigB = encoder.encode(sigToVerify);
      let mismatch = sigA.length !== sigB.length ? 1 : 0;
      const len = Math.min(sigA.length, sigB.length);
      for (let i = 0; i < len; i++) mismatch |= sigA[i] ^ sigB[i];
      if (mismatch !== 0) {
        return new Response("Invalid signature", { status: 401 });
      }
    }

    const event = JSON.parse(rawBody);
    const eventType = event?.data?.attributes?.type as string;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── payment.paid ──────────────────────────────────────────────────────────
    if (eventType === "payment.paid") {
      const paymentData = event?.data?.attributes?.data?.attributes;
      const remarks = (paymentData?.remarks as string) ?? "";
      const amountCents = (paymentData?.amount as number) ?? 0;

      // payment.paid fires for both payment links and subscription renewals
      // For subscription renewals, look up user by subscription ID on the payment source
      const sourceSubId = paymentData?.source?.id as string | undefined;
      let userId: string | undefined;

      if (sourceSubId) {
        // Payment came from a subscription — look up by subscription ID
        const { data } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("paymongo_subscription_id", sourceSubId)
          .maybeSingle();
        userId = data?.user_id;
      }

      if (!userId) {
        // Fall back to legacy payment link pattern (remarks field)
        const match = remarks.match(/user_id:([a-f0-9-]{36})/);
        userId = match?.[1];
      }

      if (userId) {
        const now = new Date();
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const [subRes, userRes] = await Promise.all([
          supabase.from("subscriptions").upsert({
            user_id: userId,
            tier: "beta",
            price_paid_cents: amountCents,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
          }, { onConflict: "user_id" }),
          supabase.from("users").update({
            subscription_status: "beta",
            subscription_expires_at: periodEnd.toISOString(),
          }).eq("id", userId),
        ]);

        if (subRes.error) throw subRes.error;
        if (userRes.error) throw userRes.error;
      }
    }

    // ── subscription.activated ───────────────────────────────────────────────
    if (eventType === "subscription.activated") {
      const subscriptionId = event?.data?.attributes?.data?.id as string | undefined;
      if (!subscriptionId) return new Response("ok", { status: 200 });

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("paymongo_subscription_id", subscriptionId)
        .maybeSingle();

      if (sub?.user_id) {
        const now = new Date();
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const [subResult, userResult] = await Promise.all([
          supabase.from("subscriptions").upsert({
            user_id: sub.user_id,
            tier: "beta",
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
          }, { onConflict: "user_id" }),
          supabase.from("users").update({
            subscription_status: "beta",
            subscription_expires_at: periodEnd.toISOString(),
          }).eq("id", sub.user_id),
        ]);
        if (subResult.error) throw subResult.error;
        if (userResult.error) throw userResult.error;
      }
    }

    // ── subscription.invoice.paid (renewal) ──────────────────────────────────
    if (eventType === "subscription.invoice.paid") {
      const subscriptionId = event?.data?.attributes?.data?.attributes?.subscription_id as string | undefined;
      if (!subscriptionId) return new Response("ok", { status: 200 });

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("paymongo_subscription_id", subscriptionId)
        .maybeSingle();

      if (sub?.user_id) {
        const now = new Date();
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const [subResult, userResult] = await Promise.all([
          supabase.from("subscriptions").update({
            tier: "beta",
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
          }).eq("user_id", sub.user_id),
          supabase.from("users").update({
            subscription_status: "beta",
            subscription_expires_at: periodEnd.toISOString(),
          }).eq("id", sub.user_id),
        ]);
        if (subResult.error) throw subResult.error;
        if (userResult.error) throw userResult.error;
      }
    }

    // ── subscription.invoice.payment_failed ──────────────────────────────────
    if (eventType === "subscription.invoice.payment_failed") {
      const subscriptionId = event?.data?.attributes?.data?.attributes?.subscription_id as string | undefined;
      if (!subscriptionId) return new Response("ok", { status: 200 });

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("paymongo_subscription_id", subscriptionId)
        .maybeSingle();

      if (sub?.user_id) {
        const [subResult, userResult] = await Promise.all([
          supabase.from("subscriptions").update({
            tier: "free",
            paymongo_subscription_id: null,
          }).eq("user_id", sub.user_id),
          supabase.from("users").update({
            subscription_status: "free",
            subscription_expires_at: null,
          }).eq("id", sub.user_id),
        ]);
        if (subResult.error) throw subResult.error;
        if (userResult.error) throw userResult.error;

        const { data: u } = await supabase
          .from("users")
          .select("push_token")
          .eq("id", sub.user_id)
          .maybeSingle();
        if (u?.push_token) {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              userId: sub.user_id,
              title: "Payment failed",
              body: "Your Mayari subscription could not be renewed. Tap to resubscribe.",
            }),
          });
        }
      }
    }

    // ── subscription.past_due / subscription.unpaid ───────────────────────────
    if (eventType === "subscription.past_due" || eventType === "subscription.unpaid") {
      const subscriptionId = event?.data?.attributes?.data?.id as string | undefined;
      if (!subscriptionId) return new Response("ok", { status: 200 });

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("paymongo_subscription_id", subscriptionId)
        .maybeSingle();

      if (sub?.user_id) {
        const [subResult, userResult] = await Promise.all([
          supabase.from("subscriptions").update({
            tier: "free",
            paymongo_subscription_id: null,
            current_period_end: null,
          }).eq("user_id", sub.user_id),
          supabase.from("users").update({
            subscription_status: "free",
            subscription_expires_at: null,
          }).eq("id", sub.user_id),
        ]);
        if (subResult.error) throw subResult.error;
        if (userResult.error) throw userResult.error;
      }
    }

    return new Response("ok", { status: 200 });

  } catch (err) {
    console.error("paymongo-webhook error:", err);
    return new Response("error", { status: 500 });
  }
});
