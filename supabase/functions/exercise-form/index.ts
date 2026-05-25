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

    // Cache check: return from DB if already stored
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

    const rawBody = await apiRes.text();
    let parsed: unknown;
    try { parsed = JSON.parse(rawBody); } catch { parsed = null; }

    // Handle plain array or wrapped { data/exercises/results } shapes
    let resultsArr: WorkoutXExercise[] = [];
    if (Array.isArray(parsed)) {
      resultsArr = parsed as WorkoutXExercise[];
    } else if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      const inner = obj.data ?? obj.exercises ?? obj.results ?? obj.exercise ?? null;
      if (Array.isArray(inner)) resultsArr = inner as WorkoutXExercise[];
      else if (inner && typeof inner === "object") resultsArr = [inner as WorkoutXExercise];
    }

    if (resultsArr.length === 0) {
      return new Response(
        JSON.stringify({ gifUrl: null, instructions: null, target: null, equipment: null, difficulty: null, bodyPart: null, cached: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const match = resultsArr[0];
    const rawGifUrl: string | null = match.gifUrl ?? null;
    const instructions = Array.isArray(match.instructions) ? match.instructions : null;
    const target = match.target ?? null;
    const equipment = match.equipment ?? null;
    const difficulty = match.difficulty ?? null;
    const bodyPart = match.bodyPart ?? null;

    // Download GIF from WorkoutX (requires API key) and re-host in Supabase Storage
    // so the mobile app can load it without auth headers.
    let publicGifUrl: string | null = null;
    if (rawGifUrl) {
      try {
        const gifRes = await fetch(rawGifUrl, {
          headers: { "X-WorkoutX-Key": workoutxKey },
          signal: AbortSignal.timeout(15000),
        });
        if (gifRes.ok) {
          const gifBytes = await gifRes.arrayBuffer();
          const fileName = `${exerciseId}.gif`;
          const { error: uploadError } = await serviceClient.storage
            .from("exercise-gifs")
            .upload(fileName, gifBytes, { contentType: "image/gif", upsert: true });
          if (!uploadError) {
            const { data: urlData } = serviceClient.storage
              .from("exercise-gifs")
              .getPublicUrl(fileName);
            publicGifUrl = urlData.publicUrl;
          } else {
            console.error("GIF upload error:", uploadError.message);
          }
        } else {
          console.error("GIF fetch error:", gifRes.status);
        }
      } catch (e) {
        console.error("GIF download/upload failed:", e);
      }
    }

    // Persist metadata + public GIF URL so next request is served from cache
    const { error: updateError } = await serviceClient
      .from("exercises")
      .update({
        form_gif_url: publicGifUrl,
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
      JSON.stringify({ gifUrl: publicGifUrl, instructions, target, equipment, difficulty, bodyPart, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("exercise-form error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
