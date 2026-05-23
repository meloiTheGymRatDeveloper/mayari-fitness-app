-- Partial unique indexes cannot be used as ON CONFLICT targets by PostgREST
-- (PostgreSQL requires the exact WHERE clause, which PostgREST omits).
-- Replacing both with non-partial indexes. In PostgreSQL, NULL != NULL in unique
-- indexes, so multiple NULL barcodes / source_ids are still permitted.

-- 1. Fix barcode index
DROP INDEX IF EXISTS public.food_items_barcode_idx;
CREATE UNIQUE INDEX food_items_barcode_idx ON public.food_items (barcode);

-- 2. Fix (source, source_id) index
DROP INDEX IF EXISTS public.food_items_source_source_id_idx;
CREATE UNIQUE INDEX food_items_source_source_id_idx ON public.food_items (source, source_id);

-- 3. Add 'community' to INSERT policy so admin approvals can insert community items
DROP POLICY IF EXISTS "Authenticated users can insert food items" ON public.food_items;
CREATE POLICY "Authenticated users can insert food items" ON public.food_items
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND source IN ('custom', 'open_food_facts', 'usda', 'community')
  );
