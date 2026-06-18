import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const rawBody = await req.text();
    const webhookSecret = Deno.env.get("PAYMONGO_WEBHOOK_SECRET");
    if (!webhookSecret) {
      // Return 200 so PayMongo doesn't auto-disable the webhook while we fix
      // the deploy. The misconfiguration must be caught by log alerting, not
      // by webhook retries.
      console.error("PAYMONGO_WEBHOOK_SECRET not configured");
      return new Response("ok", { status: 200 });
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
      // PayMongo signs with `te` in test mode and `li` in live mode. Accept
      // either — which one is present is determined by the dashboard env, not
      // by anything we control here. The HMAC still has to match our secret.
      const sigToVerify = parts["li"] ?? parts["te"] ?? "";

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
      const description = (paymentData?.description as string) ?? "";
      const amountCents = (paymentData?.amount as number) ?? 0;
      const origin = (paymentData?.origin as string) ?? "";

      // payment.paid fires for both Payment Links and PayMongo Subscriptions.
      // For real Subscriptions (recurring), source.id is the subscription ID we
      // stored at signup. For Payment Links, source.id is the payment source
      // (qrph_/card_/gcash_...) and contains NO link reference. PayMongo does
      // NOT propagate the link's `remarks` to the payment event, so the only
      // way to recover user_id from a Link payment is the `description` field,
      // which we encode at link creation in create-payment-link.
      const sourceSubId = paymentData?.source?.id as string | undefined;
      let userId: string | undefined;

      if (origin !== "links" && sourceSubId) {
        // Payment came from a recurring subscription
        const { data } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("paymongo_subscription_id", sourceSubId)
          .maybeSingle();
        userId = data?.user_id;
      }

      if (!userId) {
        // Payment Link: parse user_id from description (primary path)
        const descMatch = description.match(/ID: ([a-f0-9-]{36})/);
        userId = descMatch?.[1];
      }

      if (!userId) {
        // Legacy fallback: very old links used the `remarks` field
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
    // Swallow downstream errors (DB writes, push send, JSON parse) and return
    // 200 so PayMongo doesn't auto-disable the webhook after a transient blip.
    // Failed events are recoverable via manual replay from the dashboard;
    // an auto-disabled webhook blocks every subsequent payment.
    console.error("paymongo-webhook error:", err);
    return new Response("ok", { status: 200 });
  }
});
