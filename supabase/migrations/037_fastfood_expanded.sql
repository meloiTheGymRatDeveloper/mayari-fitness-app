-- 037_fastfood_expanded.sql
-- Deduplicate existing branded food_items, add unique index, upsert expanded fast food data.

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 1: Remove exact duplicates (same name+brand), keeping the oldest row
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM public.food_items
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY lower(name), lower(coalesce(brand, ''))
             ORDER BY created_at, id
           ) AS rn
    FROM public.food_items
  ) sub
  WHERE rn > 1
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2: Partial unique index on branded items
-- ─────────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uidx_food_items_name_brand
  ON public.food_items (lower(name), lower(brand))
  WHERE brand IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3: Upsert expanded fast food data (all macros per 100 g)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.food_items
  (name, name_fil, brand, is_ph_local, calories_per_100g, protein_per_100g,
   carbs_per_100g, fat_per_100g, fiber_per_100g, sodium_mg_per_100g, source)
VALUES

-- ─── McDONALD'S PHILIPPINES ──────────────────────────────────────────────────
-- Serving → per 100g conversions shown in comments
('Cheeseburger', 'Cheeseburger', 'McDonald''s', false,
 259, 12.9, 28.4, 10.3, 1.3, 586, 'ph_seed'),          -- 116g→300kcal
('Double Cheeseburger', 'Double Cheeseburger', 'McDonald''s', false,
 290, 16.1, 21.9, 16.1, 1.2, 772, 'ph_seed'),           -- 155g→450kcal
('McSpicy Chicken Sandwich', 'McSpicy', 'McDonald''s', false,
 273, 14.1, 25.3, 13.1, 1.0, 374, 'ph_seed'),           -- 198g→540kcal
('Quarter Pounder with Cheese', 'Quarter Pounder', 'McDonald''s', false,
 304, 17.5, 23.4, 15.2, 1.2, 578, 'ph_seed'),           -- 171g→520kcal
('Chicken McNuggets 6 pcs', 'McNuggets', 'McDonald''s', false,
 271, 15.0, 17.0, 16.0, 0.5, 510, 'ph_seed'),           -- ~100g
('Filet-O-Fish', 'Filet-O-Fish', 'McDonald''s', false,
 287, 11.0, 28.7, 14.0, 1.2, 485, 'ph_seed'),           -- 136g→390kcal
('McFlurry Oreo', 'McFlurry Oreo', 'McDonald''s', false,
 136, 4.0, 22.0, 3.6, 0.3, 90, 'ph_seed'),              -- 250g→340kcal
('Iced Coffee (Regular)', 'Iced Coffee', 'McDonald''s', false,
 52, 1.8, 8.0, 1.5, 0.0, 65, 'ph_seed'),                -- 350ml→182kcal

-- Refresh existing McD items with corrected per-100g values
('McChicken Sandwich', 'McChicken', 'McDonald''s', false,
 212, 11.5, 23.0, 8.5, 1.2, 560, 'ph_seed'),
('Regular Fries', 'Regular Fries', 'McDonald''s', false,
 320, 3.5, 42.0, 15.5, 3.8, 480, 'ph_seed'),
('Big Mac', 'Big Mac', 'McDonald''s', false,
 245, 13.0, 20.0, 12.0, 1.5, 590, 'ph_seed'),
('Hotcakes with Syrup', 'Hotcakes', 'McDonald''s', false,
 275, 5.5, 55.0, 5.5, 1.0, 460, 'ph_seed'),

-- ─── KFC PHILIPPINES ─────────────────────────────────────────────────────────
('Original Recipe Chicken', 'Original Recipe', 'KFC', false,
 214, 15.0, 6.7, 14.2, 0.3, 700, 'ph_seed'),            -- 120g→257kcal
('Crispy Chicken', 'Crispy Chicken', 'KFC', false,
 282, 17.5, 12.5, 19.2, 0.5, 750, 'ph_seed'),           -- 120g→338kcal
('Chicken Fillet Burger', 'Chicken Burger', 'KFC', false,
 238, 13.0, 27.0, 9.2, 1.5, 459, 'ph_seed'),            -- 185g→440kcal
('Zinger Burger', 'Zinger', 'KFC', false,
 277, 14.0, 29.0, 11.8, 1.5, 419, 'ph_seed'),           -- 186g→515kcal
('Coleslaw', 'Coleslaw', 'KFC', false,
 146, 1.2, 16.9, 8.5, 1.5, 192, 'ph_seed'),             -- 130g→190kcal
('Mashed Potato', 'Mashed Potato', 'KFC', false,
 96, 1.9, 14.8, 3.3, 1.2, 430, 'ph_seed'),              -- 135g→130kcal
('Gravy Fries', 'Gravy Fries', 'KFC', false,
 256, 3.3, 35.0, 11.1, 3.0, 267, 'ph_seed'),            -- 180g→460kcal
('Corn on the Cob', 'Corn on the Cob', 'KFC', false,
 100, 3.2, 20.8, 1.5, 2.5, 20, 'ph_seed'),              -- 100g serving

-- ─── BURGER KING PHILIPPINES ─────────────────────────────────────────────────
('Whopper', 'Whopper', 'Burger King', false,
 227, 9.7, 16.9, 13.8, 1.8, 293, 'ph_seed'),            -- 290g→657kcal
('Whopper Jr', 'Whopper Jr', 'Burger King', false,
 182, 7.6, 18.8, 8.8, 1.0, 306, 'ph_seed'),             -- 170g→310kcal
('Cheeseburger', 'Cheeseburger', 'Burger King', false,
 281, 14.0, 25.6, 13.2, 1.0, 595, 'ph_seed'),           -- 121g→340kcal
('Chicken Royale', 'Chicken Royale', 'Burger King', false,
 239, 11.5, 25.7, 10.1, 1.5, 303, 'ph_seed'),           -- 218g→520kcal
('BK Onion Rings', 'Onion Rings', 'Burger King', false,
 333, 4.2, 45.8, 15.0, 3.0, 567, 'ph_seed'),            -- 120g→400kcal
('BK Fries (Medium)', 'BK Fries', 'Burger King', false,
 285, 3.5, 40.0, 12.0, 3.0, 480, 'ph_seed'),

-- ─── PIZZA HUT PHILIPPINES ───────────────────────────────────────────────────
('Pepperoni Pizza (per slice)', 'Pepperoni Pizza', 'Pizza Hut', false,
 264, 11.8, 32.7, 9.1, 1.5, 564, 'ph_seed'),            -- 110g→290kcal
('Super Supreme Pizza (per slice)', 'Super Supreme', 'Pizza Hut', false,
 277, 11.5, 30.8, 11.5, 2.0, 577, 'ph_seed'),           -- 130g→360kcal
('BBQ Chicken Pizza (per slice)', 'BBQ Chicken Pizza', 'Pizza Hut', false,
 239, 12.2, 30.4, 7.0, 1.5, 513, 'ph_seed'),            -- 115g→275kcal
('Hawaiian Pizza (per slice)', 'Hawaiian Pizza', 'Pizza Hut', false,
 236, 10.0, 31.8, 7.3, 1.5, 509, 'ph_seed'),            -- 110g→260kcal
('Cheesy Bites Pizza (per slice)', 'Cheesy Bites', 'Pizza Hut', false,
 295, 12.0, 35.0, 11.0, 1.5, 590, 'ph_seed'),
('Pasta Marinara', 'Pasta Marinara', 'Pizza Hut', false,
 160, 5.2, 26.0, 4.0, 1.5, 380, 'ph_seed'),             -- 250g→400kcal

-- ─── SHAKEY'S PHILIPPINES ────────────────────────────────────────────────────
('Thin Crust Pepperoni Pizza (per slice)', 'Pepperoni Thin Crust', 'Shakey''s', true,
 259, 10.6, 29.4, 10.6, 1.0, 588, 'ph_seed'),           -- 85g→220kcal
('Mojos', 'Mojos', 'Shakey''s', true,
 270, 3.5, 40.0, 11.0, 3.0, 420, 'ph_seed'),            -- 100g
('Manager''s Choice Pizza (per slice)', 'Manager''s Choice', 'Shakey''s', true,
 257, 11.4, 26.7, 11.4, 1.5, 548, 'ph_seed'),           -- 105g→270kcal
('Chicken N Mojos (1 pc)', 'Chicken N Mojos', 'Shakey''s', true,
 228, 14.0, 14.0, 13.5, 1.2, 520, 'ph_seed'),

-- ─── SUBWAY PHILIPPINES ──────────────────────────────────────────────────────
('6-inch Italian BMT', 'Italian BMT', 'Subway', false,
 180, 9.0, 19.6, 6.9, 2.5, 514, 'ph_seed'),             -- 245g→440kcal
('6-inch Turkey Breast', 'Turkey Sub', 'Subway', false,
 122, 8.3, 20.0, 1.5, 2.5, 361, 'ph_seed'),             -- 230g→280kcal
('6-inch Chicken Teriyaki', 'Chicken Teriyaki Sub', 'Subway', false,
 148, 9.6, 22.4, 2.0, 2.0, 312, 'ph_seed'),             -- 250g→370kcal
('6-inch Veggie Delite', 'Veggie Sub', 'Subway', false,
 106, 4.1, 20.3, 1.2, 2.5, 240, 'ph_seed'),             -- 217g→230kcal
('6-inch Tuna', 'Tuna Sub', 'Subway', false,
 228, 10.8, 18.5, 11.0, 2.0, 380, 'ph_seed'),

-- ─── BONCHON PHILIPPINES ─────────────────────────────────────────────────────
('Soy Garlic Chicken Wings', 'Soy Garlic Wings', 'BonChon', false,
 317, 20.0, 15.0, 20.8, 0.5, 542, 'ph_seed'),           -- 120g→380kcal
('Spicy Chicken Wings', 'Spicy Wings', 'BonChon', false,
 292, 20.0, 11.7, 20.0, 0.5, 483, 'ph_seed'),           -- 120g→350kcal
('Soy Garlic Chicken Drumsticks', 'Soy Garlic Drumstick', 'BonChon', false,
 244, 19.4, 10.0, 14.4, 0.5, 344, 'ph_seed'),           -- 180g→440kcal
('Korean Fried Rice', 'Korean Fried Rice', 'BonChon', false,
 160, 4.0, 25.0, 5.0, 1.5, 193, 'ph_seed'),             -- 300g→480kcal
('BonChon Bibimbap', 'Bibimbap', 'BonChon', false,
 155, 8.5, 20.5, 4.5, 2.0, 380, 'ph_seed'),

-- ─── JOLLIBEE ADDITIONS ──────────────────────────────────────────────────────
('Java Rice', 'Java Rice', 'Jollibee', true,
 165, 3.5, 34.0, 2.7, 0.5, 420, 'ph_seed'),             -- 185g→305kcal
('Jolly Crispy Chicken', 'Crispy Chicken', 'Jollibee', true,
 230, 13.3, 8.7, 15.3, 0.5, 610, 'ph_seed'),            -- 150g→345kcal
('Chickenjoy Bucket (1 pc Bone-In)', 'Chickenjoy', 'Jollibee', true,
 248, 19.0, 7.8, 16.5, 0.5, 580, 'ph_seed'),
('Tuna Pie', 'Tuna Pie', 'Jollibee', true,
 282, 9.1, 31.8, 13.6, 1.5, 480, 'ph_seed'),            -- 110g→310kcal
('Jolly Spaghetti (Party Size per 100g)', 'Jolly Spaghetti Party', 'Jollibee', true,
 170, 7.0, 27.0, 4.5, 1.2, 580, 'ph_seed'),
('Aloha Chicken Sandwich', 'Aloha Chicken', 'Jollibee', true,
 270, 14.5, 29.0, 11.0, 1.0, 560, 'ph_seed'),

-- ─── MANG INASAL ADDITIONS ───────────────────────────────────────────────────
('Chicken Inasal BBQ Solo', 'Inasal BBQ', 'Mang Inasal', true,
 190, 16.0, 6.0, 11.0, 0.0, 560, 'ph_seed'),
('Bangus Sisig', 'Bangus Sisig', 'Mang Inasal', true,
 190, 12.5, 5.0, 14.0, 0.0, 620, 'ph_seed'),
('Beef Pares Mami', 'Beef Pares Mami', 'Mang Inasal', true,
 114, 8.0, 14.5, 3.0, 0.5, 680, 'ph_seed'),

-- ─── CHOWKING ADDITIONS ──────────────────────────────────────────────────────
('Fried Chicken', 'Fried Chicken', 'Chowking', true,
 239, 14.8, 10.3, 15.5, 0.3, 640, 'ph_seed'),           -- 155g→370kcal
('Siomai (4 pcs)', 'Siomai', 'Chowking', true,
 210, 12.0, 18.0, 10.0, 0.5, 580, 'ph_seed'),           -- 100g
('Halo-Halo', 'Halo-Halo', 'Chowking', true,
 89, 1.4, 17.7, 1.7, 0.5, 45, 'ph_seed'),               -- 350g→310kcal
('Beef Wonton Mami', 'Beef Wonton Mami', 'Chowking', true,
 120, 5.7, 15.7, 3.7, 0.5, 680, 'ph_seed'),             -- 350g→420kcal

-- ─── GREENWICH ADDITIONS ─────────────────────────────────────────────────────
('Hawaiian Pizza (per slice)', 'Hawaiian Pizza', 'Greenwich', true,
 238, 10.5, 30.0, 8.5, 1.5, 590, 'ph_seed'),
('Overloaded 4-Cheese Pizza (per slice)', '4-Cheese Pizza', 'Greenwich', true,
 295, 13.0, 32.0, 13.0, 1.0, 620, 'ph_seed'),
('Lasagna', 'Lasagna', 'Greenwich', true,
 180, 9.5, 20.0, 6.5, 1.5, 480, 'ph_seed')

ON CONFLICT (lower(name), lower(brand)) WHERE brand IS NOT NULL
DO UPDATE SET
  calories_per_100g  = EXCLUDED.calories_per_100g,
  protein_per_100g   = EXCLUDED.protein_per_100g,
  carbs_per_100g     = EXCLUDED.carbs_per_100g,
  fat_per_100g       = EXCLUDED.fat_per_100g,
  fiber_per_100g     = EXCLUDED.fiber_per_100g,
  sodium_mg_per_100g = EXCLUDED.sodium_mg_per_100g,
  source             = EXCLUDED.source;
