-- 029_food_search_improvements.sql

-- Add pg_trgm extension for trigram search support (defensive guard)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Add 'usda' to source check constraint
ALTER TABLE public.food_items
  DROP CONSTRAINT IF EXISTS food_items_source_check;
ALTER TABLE public.food_items
  ADD CONSTRAINT food_items_source_check
  CHECK (source IN ('custom', 'open_food_facts', 'ph_seed', 'usda'));

-- 2. Add source_id column (stores external IDs: USDA fdcId, etc.)
ALTER TABLE public.food_items
  ADD COLUMN IF NOT EXISTS source_id text;

CREATE UNIQUE INDEX IF NOT EXISTS food_items_source_source_id_idx
  ON public.food_items (source, source_id)
  WHERE source_id IS NOT NULL;

-- 3. Update INSERT policy to allow 'usda' source from mobile
DROP POLICY IF EXISTS "Authenticated users can insert food items" ON public.food_items;
CREATE POLICY "Authenticated users can insert food items" ON public.food_items
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND source IN ('custom', 'open_food_facts', 'usda')
  );

-- 4. Trigram index on name_fil for fuzzy Filipino-name search
CREATE INDEX IF NOT EXISTS food_items_name_fil_trgm_idx
  ON public.food_items USING gin (name_fil gin_trgm_ops);

-- 5. search_foods RPC: searches English + Filipino names, PH results first
CREATE OR REPLACE FUNCTION public.search_foods(q text, lim int DEFAULT 20)
RETURNS SETOF public.food_items
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.food_items
  WHERE
    name ILIKE '%' || q || '%'
    OR name_fil ILIKE '%' || q || '%'
    OR similarity(name, q) > 0.15
    OR (name_fil IS NOT NULL AND similarity(name_fil, q) > 0.15)
  ORDER BY
    CASE WHEN is_ph_local THEN 0 ELSE 1 END ASC,
    GREATEST(
      CASE WHEN name ILIKE '%' || q || '%' THEN 0.8 ELSE 0.0 END,
      CASE WHEN name_fil ILIKE '%' || q || '%' THEN 0.8 ELSE 0.0 END,
      similarity(name, q),
      COALESCE(similarity(name_fil, q), 0.0)
    ) DESC
  LIMIT lim;
$$;

REVOKE EXECUTE ON FUNCTION public.search_foods(text, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.search_foods(text, int) TO authenticated;
