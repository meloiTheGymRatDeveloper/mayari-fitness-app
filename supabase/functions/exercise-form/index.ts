// supabase/functions/exercise-form/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WORKOUTX_BASE = "https://api.workoutxapp.com/v1";

interface WorkoutXExercise {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  difficulty: string;
  instructions: string[];
  gifUrl: string;
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
    if (
      !body ||
      typeof body.exerciseId !== "string" ||
      typeof body.exerciseName !== "string"
    ) {
      return new Response(JSON.stringify({ error: "exerciseId and exerciseName are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const exerciseId: string = body.exerciseId;
    const exerciseName: string = body.exerciseName;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Cache check: return from DB if all primary fields are present
    const { data: cached } = await serviceClient
      .from("exercises")
      .select("form_gif_url, instructions, workoutx_target, workoutx_equipment, workoutx_difficulty, workoutx_body_part")
      .eq("id", exerciseId)
      .single();

    if (cached?.form_gif_url && cached?.instructions) {
      return new Response(
        JSON.stringify({
          gifUrl: cached.form_gif_url,
          instructions: cached.instructions,
          target: cached.workoutx_target ?? null,
          equipment: cached.workoutx_equipment ?? null,
          difficulty: cached.workoutx_difficulty ?? null,
          bodyPart: cached.workoutx_body_part ?? null,
          cached: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cache miss — call WorkoutX API
    const workoutxKey = Deno.env.get("WORKOUTX_API_KEY");
    if (!workoutxKey) {
      // API key not yet configured — return graceful empty so UI shows "coming soon"
      return new Response(
        JSON.stringify({ gifUrl: null, instructions: null, target: null, equipment: null, difficulty: null, bodyPart: null, cached: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchName = encodeURIComponent(exerciseName.toLowerCase().trim());
    const apiRes = await fetch(`${WORKOUTX_BASE}/exercises/name/${searchName}`, {
      headers: { "X-WorkoutX-Key": workoutxKey },
      signal: AbortSignal.timeout(8000),
    });

    if (!apiRes.ok) {
      console.error("WorkoutX API error:", apiRes.status, await apiRes.text());
      return new Response(
        JSON.stringify({ gifUrl: null, instructions: null, target: null, equipment: null, difficulty: null, bodyPart: null, cached: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: WorkoutXExercise[] = await apiRes.json();
    if (!Array.isArray(results) || results.length === 0) {
      return new Response(
        JSON.stringify({ gifUrl: null, instructions: null, target: null, equipment: null, difficulty: null, bodyPart: null, cached: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const match = results[0];
    const gifUrl = match.gifUrl ?? null;
    const instructions = Array.isArray(match.instructions) ? match.instructions : null;
    const target = match.target ?? null;
    const equipment = match.equipment ?? null;
    const difficulty = match.difficulty ?? null;
    const bodyPart = match.bodyPart ?? null;

    // Store in DB so future requests hit cache
    const { error: updateError } = await serviceClient
      .from("exercises")
      .update({
        form_gif_url: gifUrl,
        instructions,
        workoutx_target: target,
        workoutx_equipment: equipment,
        workoutx_difficulty: difficulty,
        workoutx_body_part: bodyPart,
      })
      .eq("id", exerciseId);
    if (updateError) {
      console.error("Cache write failed:", updateError.message);
    }

    return new Response(
      JSON.stringify({ gifUrl, instructions, target, equipment, difficulty, bodyPart, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("exercise-form error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
