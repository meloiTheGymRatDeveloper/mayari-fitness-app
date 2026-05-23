// supabase/functions/verify-photo/index.ts
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    // Verify JWT
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
    if (!body || typeof body.photoUrl !== "string" || !body.photoUrl.trim()) {
      return new Response(JSON.stringify({ error: "photoUrl is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { photoUrl } = body as { photoUrl: string };

    // Download image bytes from Supabase Storage (signed URL)
    const imageResponse = await fetch(photoUrl, { signal: AbortSignal.timeout(5000) });
    if (!imageResponse.ok) {
      return new Response(JSON.stringify({ error: "Could not fetch image" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(imageBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    const claudeResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: base64 },
            },
            {
              type: "text",
              text: `This is a photo of food, likely Filipino home cooking or restaurant food.
Identify each distinct food item visible and estimate nutrition for the portion shown.
Return ONLY valid JSON (no markdown, no explanation):
{
  "items": [
    {"name": string, "quantity_g": number, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number}
  ],
  "confidence": "low"|"medium"|"high"
}
Rules:
- List each dish or ingredient separately (e.g., rice, ulam, vegetables as separate items)
- quantity_g is the estimated grams of that specific item in the photo
- calories/protein_g/carbs_g/fat_g are for the actual quantity shown (not per 100g)
- Use Filipino serving sizes as defaults for common dishes
- If the image is not food, return exactly: {"error": "not_food"}`,
            },
          ],
        },
      ],
    });

    const text =
      claudeResponse.content[0].type === "text" ? claudeResponse.content[0].text.trim() : "{}";

    // Strip markdown code fences if Claude added them anyway
    const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let result: unknown;
    try {
      result = JSON.parse(jsonText);
    } catch {
      console.error("verify-photo: Claude returned invalid JSON:", jsonText.slice(0, 200));
      return new Response(JSON.stringify({ error: "parse_error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("verify-photo error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
