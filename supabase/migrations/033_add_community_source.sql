-- Restore 'community' to food_items source constraint
-- (migration 029 overwrote the constraint added in 032)
ALTER TABLE public.food_items DROP CONSTRAINT IF EXISTS food_items_source_check;
ALTER TABLE public.food_items ADD CONSTRAINT food_items_source_check
  CHECK (source IN ('custom', 'open_food_facts', 'ph_seed', 'usda', 'community'));
