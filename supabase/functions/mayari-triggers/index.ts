// supabase/functions/mayari-triggers/index.ts
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  type TriggerEvent,
  TRIGGER_CATEGORY,
  DEDUP_HOURS,
  buildPrompt,
} from "../_shared/mayari-prompts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

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

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json() as {
      trigger_event: TriggerEvent;
      context: Record<string, unknown>;
      send_push?: boolean;
    };

    const { trigger_event, context = {}, send_push = false } = body;

    if (!trigger_event || !DEDUP_HOURS[trigger_event]) {
      return new Response(JSON.stringify({ error: "Invalid trigger_event" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplication check
    const dedupSince = new Date(Date.now() - DEDUP_HOURS[trigger_event] * 3600000).toISOString();
    const { data: existing } = await serviceClient
      .from("coach_tips")
      .select("id")
      .eq("user_id", user.id)
      .eq("trigger_event", trigger_event)
      .gte("created_at", dedupSince)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate tip
    const prompt = buildPrompt(trigger_event, context);
    const claudeRes = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    });

    const content = (claudeRes.content[0] as { type: string; text: string }).text.trim();
    const tip_type = TRIGGER_CATEGORY[trigger_event];

    const { data: newTip, error: insertError } = await serviceClient
      .from("coach_tips")
      .insert({ user_id: user.id, content, tip_type, trigger_event })
      .select()
      .single();

    if (insertError) throw insertError;

    // Optional push notification
    if (send_push) {
      await serviceClient.functions.invoke("send-push", {
        body: { user_id: user.id, title: "Mayari", body: content },
      });
    }

    return new Response(JSON.stringify({ tip_id: newTip.id, tip_type, trigger_event, content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("mayari-triggers error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
