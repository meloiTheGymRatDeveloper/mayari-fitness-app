import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

interface ParsedFood {
  name: string;
  quantity_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
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

    const body = await req.json().catch(() => null);
    const transcript: string = body?.transcript ?? "";

    if (!transcript.trim()) {
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `You are a Filipino food nutrition assistant. Parse this voice transcript into structured food entries.

Transcript: "${transcript}"

Rules:
- Understand Tagalog, English, and Taglish (e.g., "kumain ako ng", "kinain ko", "I had")
- Convert Filipino quantities: "isang tasa" = 240ml/g, "kalahating tasa" = 120g, "isang kutsara" = 15g, "isang piraso ng tinapay" = 30g, "isang plato" = 200-300g context-dependent
- Use typical Filipino serving sizes for common dishes (e.g., 1 cup kanin = 180g, 1 viand serving = 150-200g)
- Return calories and macros for the actual quantity described (not per 100g)
- Each food item is a separate object in the array

Return ONLY valid JSON, no explanation:
[{"name":"Food Name","quantity_g":200,"calories":250,"protein_g":15,"carbs_g":30,"fat_g":8}]

If no food detected, return: []`,
      }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text.trim() : "[]";
    const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let items: ParsedFood[] = [];
    try {
      const parsed = JSON.parse(jsonText);
      items = Array.isArray(parsed) ? parsed : [];
    } catch {
      console.error("voice-log: Claude returned invalid JSON:", jsonText.slice(0, 200));
    }

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("voice-log error:", err);
    return new Response(JSON.stringify({ items: [], error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
