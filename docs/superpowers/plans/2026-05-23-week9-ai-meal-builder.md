# Week 9 — AI Meal Builder: Edge Function Deployment Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the `ai-meal-builder` Supabase Edge Function so that `useAIMealBuilder.ts` hook calls resolve against a live function.

**Architecture:** Single operational task — deploy `supabase/functions/ai-meal-builder/index.ts` via the Supabase MCP `deploy_edge_function` tool. No code changes. `ANTHROPIC_API_KEY` is already set (shared with `coach-chat`). After deployment, all three AI meal modes (`suggest`, `build`, `weekly_plan`) are live.

**Tech Stack:** Supabase Edge Functions (Deno), Anthropic Claude API (`claude-haiku-4-5` / `claude-sonnet-4-5`), Supabase MCP tool.

---

## Files

| File | Change |
|------|--------|
| `supabase/functions/ai-meal-builder/index.ts` | Deploy to Supabase (no edits) |

---

### Task 1: Deploy ai-meal-builder Edge Function

**Files:**
- Deploy: `supabase/functions/ai-meal-builder/index.ts`

This is a deployment-only task. The function code is complete and reviewed. Use the `mcp__supabase__deploy_edge_function` tool with the file content below.

- [ ] **Step 1: Deploy the function via Supabase MCP**

Call `mcp__supabase__deploy_edge_function` with these exact parameters:

- `name`: `"ai-meal-builder"`
- `entrypoint_path`: `"index.ts"`
- `verify_jwt`: `true`
- `files`: array with one entry — `name: "index.ts"`, `content`: the full content of `supabase/functions/ai-meal-builder/index.ts`

The full file content to deploy:

```typescript
// mayari/supabase/functions/ai-meal-builder/index.ts
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

type Mode = "suggest" | "build" | "weekly_plan";

interface SuggestContext {
  meal_slot: string;
  remaining_calories: number;
  remaining_protein_g: number;
  remaining_carbs_g: number;
  remaining_fat_g: number;
  preferences?: string;
}

interface BuildContext {
  ingredients: string[];
  calorie_goal: number;
  protein_goal_g: number;
}

interface WeeklyPlanContext {
  calorie_goal: number;
  protein_goal_g: number;
  avoid?: string;
  preferences?: string;
}

function buildSystemPrompt(mealTimeStyle: string): string {
  const slotNames = mealTimeStyle === "filipino"
    ? "Almusal/Tanghalian/Merienda/Hapunan"
    : "Breakfast/Lunch/Snack/Dinner";

  return `You are Coach Mayari, a Filipino nutrition expert and practical home cook. You know Filipino foods by their local names, typical serving sizes, and nutritional values. Always suggest affordable, accessible meals for Filipino households.
STRICT RULES:
- Prioritize: rice, fish, eggs, tofu, canned goods (sardinas, tuna, spam), kangkong, sitaw, kamote.
- Budget: aim under ₱150/meal.
- Return ONLY valid JSON — no markdown, no explanation, no extra text outside the JSON.
- Use meal slot names: ${slotNames}.
- If preferences mention Tagalog words, use Filipino names in the meal_name field.`;
}

function buildUserPrompt(mode: Mode, context: SuggestContext | BuildContext | WeeklyPlanContext): string {
  if (mode === "suggest") {
    const c = context as SuggestContext;
    return `Suggest one meal for ${c.meal_slot}. Remaining macros for today: ${c.remaining_calories} kcal, ${c.remaining_protein_g}g protein, ${c.remaining_carbs_g}g carbs, ${c.remaining_fat_g}g fat.${c.preferences ? " Preference: " + c.preferences : ""}
Return JSON with this exact shape:
{"meal_name":"string","description":"string","ingredients":[{"name":"string","quantity_g":0,"unit":"string"}],"macros":{"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"net_carbs_g":0,"fiber_g":0}}`;
  }

  if (mode === "build") {
    const c = context as BuildContext;
    return `I have these ingredients: ${c.ingredients.join(", ")}. My calorie goal is ${c.calorie_goal} kcal/day and protein goal is ${c.protein_goal_g}g/day. Suggest up to 3 meals I can make.
Return JSON with this exact shape:
{"meals":[{"meal_name":"string","description":"string","ingredients":[{"name":"string","quantity_g":0,"unit":"string"}],"macros":{"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"net_carbs_g":0,"fiber_g":0}}]}`;
  }

  // weekly_plan
  const c = context as WeeklyPlanContext;
  return `Generate a 7-day Filipino meal plan for someone with a daily goal of ${c.calorie_goal} kcal and ${c.protein_goal_g}g protein.${c.avoid ? " Avoid: " + c.avoid + "." : ""}${c.preferences ? " Preferences: " + c.preferences + "." : ""} Include all 4 meal slots per day.
Return JSON with this exact shape (fill all 7 days):
{"plan":{"monday":{"almusal":{"meal_name":"string","description":"string","ingredients":[{"name":"string","quantity_g":0,"unit":"string"}],"macros":{"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"net_carbs_g":0,"fiber_g":0}},"tanghalian":{"meal_name":"string","description":"string","ingredients":[{"name":"string","quantity_g":0,"unit":"string"}],"macros":{"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"net_carbs_g":0,"fiber_g":0}},"merienda":{"meal_name":"string","description":"string","ingredients":[{"name":"string","quantity_g":0,"unit":"string"}],"macros":{"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"net_carbs_g":0,"fiber_g":0}},"hapunan":{"meal_name":"string","description":"string","ingredients":[{"name":"string","quantity_g":0,"unit":"string"}],"macros":{"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"net_carbs_g":0,"fiber_g":0}}},"tuesday":{...},"wednesday":{...},"thursday":{...},"friday":{...},"saturday":{...},"sunday":{...}}}`;
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
    const userId = user.id;

    const body = await req.json().catch(() => null);
    if (!body || !body.mode || !body.context) {
      return new Response(JSON.stringify({ error: "mode and context are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mode = body.mode as Mode;
    if (!["suggest", "build", "weekly_plan"].includes(mode)) {
      return new Response(JSON.stringify({ error: "Invalid mode" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await supabase
      .from("users")
      .select("primary_goal, body_weight_kg, meal_time_style, experience_level, calorie_goal, protein_goal_g")
      .eq("id", userId)
      .maybeSingle();

    const mealTimeStyle = ((profile as Record<string, unknown> | null)?.meal_time_style as string) ?? "filipino";
    const systemPrompt = buildSystemPrompt(mealTimeStyle);
    const userPrompt = buildUserPrompt(mode, body.context);
    const modelId = mode === "weekly_plan" ? "claude-sonnet-4-5" : "claude-haiku-4-5";
    const maxTokens = mode === "weekly_plan" ? 4096 : 1024;

    const claudeResponse = await anthropic.messages.create({
      model: modelId,
      max_tokens: maxTokens,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = claudeResponse.content[0].type === "text" ? claudeResponse.content[0].text : "";

    let result: unknown;
    try {
      result = JSON.parse(rawText);
    } catch {
      console.error("ai-meal-builder: invalid JSON from Claude:", rawText.slice(0, 200));
      return new Response(
        JSON.stringify({ error: "generation_failed", message: "Try again in a moment." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from("coach_messages").insert({
      user_id: userId,
      role: "assistant",
      content: rawText,
      message_type: "chat",
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-meal-builder error:", err);
    return new Response(
      JSON.stringify({ error: "generation_failed", message: "Try again in a moment." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

Expected: MCP tool returns a success response with the function details (id, slug, status).

- [ ] **Step 2: Verify deployment via list_edge_functions**

Call `mcp__supabase__list_edge_functions` and confirm `ai-meal-builder` appears in the list with `status: "ACTIVE"`.

Expected output includes an entry like:
```json
{ "slug": "ai-meal-builder", "status": "ACTIVE", "version": 1 }
```

- [ ] **Step 3: Run tests**

```
cd mayari && npm test
```

Expected: `Tests: 29 passed, 29 total`

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "feat(ai-meal-builder): deploy Edge Function to Supabase

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

Note: `--allow-empty` because this task deploys to Supabase — no local file changes are made.
