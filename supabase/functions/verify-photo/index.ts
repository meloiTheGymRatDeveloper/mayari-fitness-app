// supabase/functions/verify-photo/index.ts
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

// Translate common English Claude dish names to Filipino DB names.
// DB has entries like "Adobong Manok", "Sinigang na Baboy" — Claude returns "chicken adobo", "pork sinigang".
const DISH_ALIASES: Record<string, string> = {
  "chicken adobo": "adobong manok",
  "pork adobo": "adobong baboy",
  "adobo": "adobong manok",
  "pork sinigang": "sinigang na baboy",
  "milkfish sinigang": "sinigang na bangus",
  "bangus sinigang": "sinigang na bangus",
  "grilled bangus": "bangus (grilled)",
  "inihaw na bangus": "bangus (grilled)",
  "fried rice": "sinangag",
  "garlic fried rice": "sinangag",
  "garlic rice": "sinangag",
  "steamed tilapia": "tilapia (steamed)",
  "grilled chicken": "inihaw na manok",
  "chicken inasal": "inihaw na manok",
};

// Duplicated from mayari/lib/photoVerify.ts — Deno edge functions cannot import
// from outside supabase/functions/. Keep these in sync with the lib copy
// (lib copy has Jest tests).
interface Verdict {
  name: string;
  verdict: "keep" | "drop";
  reason?: string;
}

function filterByVisibility<T extends { is_clearly_visible?: boolean }>(items: T[]): T[] {
  return items.filter((item) => item.is_clearly_visible !== false);
}

function applyVerdicts<T extends { name: string }>(items: T[], verdicts: Verdict[]): T[] {
  const lookup = new Map<string, "keep" | "drop">();
  for (const v of verdicts) {
    lookup.set(v.name.trim().toLowerCase(), v.verdict);
  }
  return items.filter((item) => lookup.get(item.name.trim().toLowerCase()) !== "drop");
}

interface ClaudeItem {
  name: string;
  ingredients?: string;
  quantity_g: number;
  calories_low: number;
  calories_mid: number;
  calories_high: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: "low" | "medium" | "high";
  uncertain_about?: string;
  visible_evidence?: string;
  is_clearly_visible?: boolean;
}

interface ClientItem {
  name: string;
  quantity_g: number;
  calories: number;
  calories_low: number;
  calories_high: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: "low" | "medium" | "high";
  db_grounded: boolean;
}

type SupabaseClient = ReturnType<typeof createClient>;

async function groundItem(
  client: SupabaseClient,
  item: ClaudeItem,
): Promise<ClientItem> {
  try {
    const nameLower = item.name.toLowerCase().trim();
    const dbSearchName = DISH_ALIASES[nameLower] ?? nameLower;

    const { data } = await client
      .from("food_items")
      .select("calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g")
      .ilike("name", `%${dbSearchName}%`)
      .eq("is_ph_local", true)
      .limit(1);

    const match = data?.[0];
    if (match) {
      const qty = (item.quantity_g ?? 0) > 0 ? item.quantity_g : 100;
      const scale = qty / 100;
      const dbCalories = Math.round(match.calories_per_100g * scale);
      return {
        name: item.name,
        quantity_g: qty,
        calories: dbCalories,
        calories_low: Math.round(dbCalories * 0.9),
        calories_high: Math.round(dbCalories * 1.1),
        protein_g: Math.round(match.protein_per_100g * scale * 10) / 10,
        carbs_g: Math.round(match.carbs_per_100g * scale * 10) / 10,
        fat_g: Math.round(match.fat_per_100g * scale * 10) / 10,
        confidence: "high",
        db_grounded: true,
      };
    }
  } catch (err) {
    console.warn("verify-photo: groundItem DB lookup failed, using Claude estimate:", err);
  }

  return {
    name: item.name,
    quantity_g: item.quantity_g,
    calories: item.calories_mid,
    calories_low: item.calories_low,
    calories_high: item.calories_high,
    protein_g: item.protein_g,
    carbs_g: item.carbs_g,
    fat_g: item.fat_g,
    confidence: item.confidence,
    db_grounded: false,
  };
}

async function verifyVisibility(
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp",
  base64: string,
  candidateNames: string[],
): Promise<Verdict[] | null> {
  if (candidateNames.length === 0) return [];
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `A previous analyzer reported these items in this food image:
${candidateNames.map((n, i) => `${i + 1}. ${n}`).join("\n")}

Look at the image again. For each item, decide KEEP or DROP.
KEEP only if you can clearly see that exact item in the image.
DROP if you are uncertain, OR if the item might have been assumed from typical meal composition rather than directly observed.

Return ONLY valid JSON, no markdown, no explanation:
{
  "verdicts": [
    { "name": "exact name from the list above", "verdict": "keep" | "drop", "reason": "short reason" }
  ]
}`,
            },
          ],
        },
      ],
    });
    const text =
      response.content[0].type === "text" ? response.content[0].text.trim() : "{}";
    const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(jsonText) as { verdicts?: Verdict[] };
    return parsed.verdicts ?? [];
  } catch (err) {
    console.warn("verify-photo: verification pass failed, returning unfiltered items:", err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.photoUrl !== "string" || !body.photoUrl.trim()) {
      return new Response(JSON.stringify({ error: "photoUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageResponse = await fetch(body.photoUrl as string, { signal: AbortSignal.timeout(5000) });
    if (!imageResponse.ok) {
      return new Response(JSON.stringify({ error: "Could not fetch image" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";
    const mediaType = (["image/jpeg", "image/png", "image/gif", "image/webp"].includes(contentType)
      ? contentType
      : "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(imageBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ""),
    );

    const claudeResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `You are analyzing a food photo for calorie estimation.

A fork or spoon may be visible in the frame — if so, use it to estimate plate diameter and food volume for better portion accuracy.

OBSERVATION DISCIPLINE — read before listing items:
- List ONLY items you can clearly see in the image. If something is ambiguous or you are uncertain it is present, OMIT it.
- Do NOT infer typical meal components (rice, sides, sauces, drinks) unless they are directly visible in the image.
- If you see only one food item, return exactly one item.
- Better to miss an item the user will add manually than to invent one.

For each food component you can actually see:
1. Name the dish (use Filipino names like "adobong manok" when the dish is identifiable as such, otherwise plain English)
2. Note its likely main ingredients
3. Estimate the portion in grams
4. Give a LOW (conservative), MID (best guess), and HIGH (generous) calorie estimate for that portion
5. Rate your confidence in the portion size: low | medium | high
6. Note what you are most uncertain about for that item
7. Provide visible_evidence: a short concrete description tied to the image (e.g. "brown grilled pork cutlet, ~12cm long, center of plate")
8. Set is_clearly_visible to true only if you can directly see this item in the image

Return ONLY valid JSON, no markdown, no explanation:
{
  "items": [
    {
      "name": string,
      "ingredients": string,
      "quantity_g": number,
      "calories_low": number,
      "calories_mid": number,
      "calories_high": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "confidence": "low"|"medium"|"high",
      "uncertain_about": string,
      "visible_evidence": string,
      "is_clearly_visible": boolean
    }
  ],
  "most_uncertain_item": string
}

Rules:
- Separate every distinct component you actually see (rice, ulam, vegetables, sauce each get their own item)
- quantity_g and all macro values are for the actual portion visible — NOT per 100g
- If the image is not food, return exactly: {"error": "not_food"}`,
            },
          ],
        },
      ],
    });

    const text =
      claudeResponse.content[0].type === "text" ? claudeResponse.content[0].text.trim() : "{}";
    const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let parsed: { error?: string; items?: ClaudeItem[] };
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      console.error("verify-photo: Claude returned invalid JSON:", jsonText.slice(0, 200));
      return new Response(JSON.stringify({ error: "parse_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (parsed.error === "not_food") {
      return new Response(JSON.stringify({ error: "not_food" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawItems = parsed.items ?? [];
    const visibleItems = filterByVisibility(rawItems);
    const verdicts = await verifyVisibility(mediaType, base64, visibleItems.map((i) => i.name));
    const survivors = verdicts === null ? visibleItems : applyVerdicts(visibleItems, verdicts);
    console.log(
      `verify-photo: pass1=${rawItems.length} visible=${visibleItems.length} verified=${survivors.length}`,
    );
    const items = await Promise.all(survivors.map((item) => groundItem(anonClient, item)));

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("verify-photo error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
