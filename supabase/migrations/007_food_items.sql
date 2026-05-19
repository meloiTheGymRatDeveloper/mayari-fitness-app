CREATE TABLE IF NOT EXISTS public.food_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_fil text,
  brand text,
  is_ph_local boolean DEFAULT false,
  calories_per_100g decimal,
  protein_per_100g decimal,
  carbs_per_100g decimal,
  fat_per_100g decimal,
  fiber_per_100g decimal,
  sugar_per_100g decimal,
  saturated_fat_per_100g decimal,
  polyunsaturated_fat_per_100g decimal,
  monounsaturated_fat_per_100g decimal,
  sodium_mg_per_100g decimal,
  potassium_mg_per_100g decimal,
  calcium_mg_per_100g decimal,
  iron_mg_per_100g decimal,
  magnesium_mg_per_100g decimal,
  phosphorus_mg_per_100g decimal,
  zinc_mg_per_100g decimal,
  vitamin_a_mcg_per_100g decimal,
  vitamin_c_mg_per_100g decimal,
  vitamin_d_mcg_per_100g decimal,
  vitamin_b12_mcg_per_100g decimal,
  folate_mcg_per_100g decimal,
  cholesterol_mg_per_100g decimal,
  barcode text,
  source text DEFAULT 'custom' CHECK (source IN ('custom','open_food_facts','ph_seed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS food_items_barcode_idx ON public.food_items (barcode) WHERE barcode IS NOT NULL;

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS food_items_name_trgm_idx ON public.food_items USING gin (name gin_trgm_ops);

ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read food items" ON public.food_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert food items" ON public.food_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND source IN ('custom', 'open_food_facts'));

CREATE TRIGGER food_items_updated_at
  BEFORE UPDATE ON public.food_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
