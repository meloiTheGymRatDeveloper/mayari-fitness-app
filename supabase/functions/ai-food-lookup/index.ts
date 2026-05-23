import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

interface FoodEstimate {
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  serving_size_g: number;
  serving_description: string;
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
    const foodName: string = (body?.food_name ?? "").trim();

    if (!foodName) {
      return new Response(JSON.stringify({ error: "food_name is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{
        role: "user",
        content: `You are a nutrition database assistant specializing in Philippine and international foods.

Estimate the nutritional content for: "${foodName}"

Rules:
- Provide values per 100g (normalized, not per serving)
- For Filipino dishes (e.g. adobo, sinigang, kare-kare, sisig, lechon), use typical homemade Philippine recipe values
- For restaurant items, use widely-published values for that chain
- For branded/packaged foods, use label values if well-known
- serving_size_g should be the typical single serving in grams (e.g. 1 cup rice = 180g, 1 burger = 150g)
- serving_description should be a short human-readable serving (e.g. "1 cup", "1 piece", "1 slice")
- All numeric values must be non-negative numbers, rounded to 1 decimal place

Return ONLY valid JSON, no explanation:
{
  "name": "Exact canonical food name",
  "calories_per_100g": 0.0,
  "protein_per_100g": 0.0,
  "carbs_per_100g": 0.0,
  "fat_per_100g": 0.0,
  "fiber_per_100g": 0.0,
  "serving_size_g": 100,
  "serving_description": "100g"
}`,
      }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let estimate: FoodEstimate | null = null;
    try {
      estimate = JSON.parse(jsonText) as FoodEstimate;
    } catch {
      console.error("ai-food-lookup: Claude returned invalid JSON:", jsonText.slice(0, 200));
      return new Response(JSON.stringify({ error: "Could not estimate macros for this food." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(estimate), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-food-lookup error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
