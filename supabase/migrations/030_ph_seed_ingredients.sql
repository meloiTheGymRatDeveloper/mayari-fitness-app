-- 030_ph_seed_ingredients.sql
-- Source: FNRI Philippine Food Composition Tables 2019 + USDA FoodData Central
-- Note: ON CONFLICT DO NOTHING has no active constraint to fire on (food_items has no
--       UNIQUE constraint on name/source). This is a one-time seed — safe to run once.
INSERT INTO public.food_items
  (name, name_fil, is_ph_local, calories_per_100g, protein_per_100g,
   carbs_per_100g, fat_per_100g, fiber_per_100g, sodium_mg_per_100g,
   potassium_mg_per_100g, calcium_mg_per_100g, iron_mg_per_100g,
   vitamin_c_mg_per_100g, source)
VALUES

-- ============================================================
-- VEGETABLES (raw unless noted)
-- ============================================================
('Ampalaya', 'Ampalaya (Bitter Melon)', true, 17, 1.0, 3.7, 0.2, 2.8, 13, 296, 19, 0.4, 84, 'ph_seed'),
('Kangkong', 'Kangkong (Water Spinach)', true, 19, 2.6, 3.1, 0.2, 2.1, 113, 312, 77, 1.7, 55, 'ph_seed'),
('Sitaw', 'Sitaw (String Beans)', true, 31, 1.8, 7.0, 0.1, 3.4, 6, 211, 37, 1.0, 12, 'ph_seed'),
('Kalabasa', 'Kalabasa (Squash)', true, 26, 1.0, 6.5, 0.1, 0.5, 2, 340, 21, 0.8, 21, 'ph_seed'),
('Talong', 'Talong (Eggplant)', true, 25, 1.0, 5.9, 0.2, 3.0, 2, 229, 9, 0.2, 2, 'ph_seed'),
('Okra', 'Okra', true, 33, 1.9, 7.5, 0.2, 3.2, 7, 299, 82, 0.6, 23, 'ph_seed'),
('Pechay', 'Pechay (Bok Choy)', true, 13, 1.5, 2.2, 0.2, 1.0, 65, 252, 105, 0.8, 45, 'ph_seed'),
('Repolyo', 'Repolyo (Cabbage)', true, 25, 1.3, 5.8, 0.1, 2.5, 18, 170, 40, 0.5, 36, 'ph_seed'),
('Sayote', 'Sayote (Chayote)', true, 16, 0.8, 3.9, 0.1, 1.7, 2, 125, 17, 0.3, 7, 'ph_seed'),
('Gabi', 'Gabi (Taro)', true, 112, 1.5, 26.5, 0.2, 4.1, 11, 591, 43, 0.6, 4, 'ph_seed'),
('Kamote', 'Kamote (Sweet Potato)', true, 86, 1.6, 20.1, 0.1, 3.0, 55, 337, 30, 0.6, 19, 'ph_seed'),
('Singkamas', 'Singkamas (Jicama)', true, 38, 0.7, 8.8, 0.1, 4.9, 4, 150, 12, 0.6, 20, 'ph_seed'),
('Sibuyas', 'Sibuyas (Onion)', true, 40, 1.1, 9.3, 0.1, 1.7, 4, 146, 23, 0.2, 7, 'ph_seed'),
('Bawang', 'Bawang (Garlic)', true, 149, 6.4, 33.1, 0.5, 2.1, 17, 401, 181, 1.7, 31, 'ph_seed'),
('Luya', 'Luya (Ginger)', true, 80, 1.8, 17.8, 0.8, 2.0, 13, 415, 16, 0.6, 5, 'ph_seed'),
('Kamatis', 'Kamatis (Tomato)', true, 18, 0.9, 3.9, 0.2, 1.2, 5, 237, 10, 0.3, 14, 'ph_seed'),
('Malunggay Dahon', 'Malunggay (Moringa Leaves)', true, 64, 9.4, 8.3, 1.4, 2.0, 9, 337, 185, 4.0, 92, 'ph_seed'), -- 64 kcal per FNRI; macros appear higher due to non-protein nitrogen in protein measurement
('Upo', 'Upo (Bottle Gourd)', true, 14, 0.6, 3.4, 0.0, 0.5, 2, 150, 26, 0.2, 10, 'ph_seed'),
('Labanos', 'Labanos (Daikon Radish)', true, 18, 0.6, 4.1, 0.1, 1.6, 39, 233, 25, 0.4, 15, 'ph_seed'),
('Siling Labuyo', 'Siling Labuyo (Bird''s Eye Chili)', true, 40, 2.0, 9.0, 0.4, 1.5, 9, 322, 14, 1.0, 144, 'ph_seed'),
('Alugbati', 'Alugbati (Malabar Spinach)', true, 19, 1.8, 3.4, 0.3, 0.8, 24, 510, 109, 1.2, 102, 'ph_seed'),
('Patola', 'Patola (Sponge Gourd)', true, 20, 1.2, 4.4, 0.1, 0.5, 3, 139, 18, 0.4, 12, 'ph_seed'),

-- ============================================================
-- RAW MEATS (uncooked, skinless unless noted)
-- ============================================================
('Chicken Breast (Raw)', 'Dibdib ng Manok (Hilaw)', true, 110, 23.1, 0.0, 1.2, 0.0, 74, 370, 11, 0.4, 0, 'ph_seed'),
('Chicken Thigh (Raw)', 'Hita ng Manok (Hilaw)', true, 153, 19.4, 0.0, 7.9, 0.0, 88, 310, 12, 0.7, 0, 'ph_seed'),
('Chicken Wings (Raw)', 'Pakpak ng Manok (Hilaw)', true, 203, 18.3, 0.0, 14.2, 0.0, 87, 170, 12, 0.7, 0, 'ph_seed'),
('Chicken Liver (Raw)', 'Atay ng Manok (Hilaw)', true, 119, 16.9, 0.9, 4.8, 0.0, 71, 220, 8, 8.5, 17, 'ph_seed'),
('Pork Liempo (Raw)', 'Liempo ng Baboy (Hilaw)', true, 518, 9.3, 0.0, 53.0, 0.0, 42, 198, 12, 0.5, 0, 'ph_seed'),
('Pork Kasim / Shoulder (Raw)', 'Kasim ng Baboy (Hilaw)', true, 220, 17.9, 0.0, 16.0, 0.0, 62, 287, 17, 1.0, 0, 'ph_seed'),
('Pork Loin (Raw)', 'Lomo ng Baboy (Hilaw)', true, 143, 20.5, 0.0, 6.6, 0.0, 55, 370, 14, 0.6, 0, 'ph_seed'),
('Ground Pork (Raw)', 'Giniling na Baboy (Hilaw)', true, 263, 17.7, 0.0, 20.8, 0.0, 62, 270, 16, 0.8, 0, 'ph_seed'),
('Pork Liver (Raw)', 'Atay ng Baboy (Hilaw)', true, 134, 21.4, 2.5, 3.7, 0.0, 53, 310, 8, 17.9, 23, 'ph_seed'),
('Beef Sirloin (Raw)', 'Karne ng Baka - Sirloin (Hilaw)', true, 187, 20.1, 0.0, 11.5, 0.0, 55, 318, 8, 2.0, 0, 'ph_seed'),
('Ground Beef (Raw)', 'Giniling na Baka (Hilaw)', true, 254, 17.2, 0.0, 20.0, 0.0, 66, 282, 10, 2.1, 0, 'ph_seed'),
('Beef Short Ribs (Raw)', 'Tadyang ng Baka (Hilaw)', true, 296, 14.5, 0.0, 26.0, 0.0, 52, 230, 17, 1.8, 0, 'ph_seed'),

-- ============================================================
-- RAW SEAFOOD (uncooked)
-- ============================================================
('Bangus (Raw)', 'Bangus (Hilaw - Milkfish)', true, 148, 20.4, 0.0, 7.3, 0.0, 79, 360, 51, 0.5, 0, 'ph_seed'),
('Tilapia (Raw)', 'Tilapia (Hilaw)', true, 96, 20.1, 0.0, 1.7, 0.0, 56, 380, 10, 0.6, 0, 'ph_seed'),
('Galunggong (Raw)', 'Galunggong (Hilaw - Blue Mackerel Scad)', true, 130, 22.0, 0.0, 4.5, 0.0, 72, 314, 31, 1.1, 0, 'ph_seed'),
('Hipon (Raw)', 'Hipon (Hilaw - Shrimp)', true, 99, 24.0, 0.2, 0.3, 0.0, 111, 259, 64, 0.5, 0, 'ph_seed'),
('Pusit (Raw)', 'Pusit (Hilaw - Squid)', true, 92, 15.6, 3.1, 1.4, 0.0, 44, 246, 32, 0.7, 0, 'ph_seed'),
('Tahong (Raw)', 'Tahong (Hilaw - Mussels)', true, 86, 11.9, 3.7, 2.2, 0.0, 286, 268, 26, 3.9, 0, 'ph_seed'),
('Alimango (Raw)', 'Alimango (Hilaw - Mud Crab)', true, 83, 18.0, 0.0, 0.7, 0.0, 293, 262, 89, 0.5, 0, 'ph_seed'),
('Tuna (Raw)', 'Tuna (Hilaw)', true, 109, 24.4, 0.0, 0.5, 0.0, 45, 444, 8, 0.8, 0, 'ph_seed'),
('Talakitok (Raw)', 'Talakitok (Hilaw - Trevally)', true, 134, 20.5, 0.0, 5.7, 0.0, 80, 370, 29, 0.9, 0, 'ph_seed'),
('Tanigue (Raw)', 'Tanigue (Hilaw - Spanish Mackerel)', true, 139, 21.8, 0.0, 6.0, 0.0, 68, 350, 30, 1.0, 0, 'ph_seed'),

-- ============================================================
-- EGGS (raw)
-- ============================================================
('Itlog ng Manok (Hilaw)', 'Itlog ng Manok (Hilaw - Raw Egg)', true, 155, 13.0, 1.1, 10.6, 0.0, 124, 138, 56, 1.8, 0, 'ph_seed'),

-- ============================================================
-- LEGUMES & GRAINS (dry / raw unless noted)
-- ============================================================
('Monggo (Dry)', 'Monggo (Tuyo - Mung Beans)', true, 347, 23.9, 63.0, 1.2, 16.3, 15, 1246, 132, 6.7, 4, 'ph_seed'),
('White Rice (Raw)', 'Bigas (Hilaw - White Rice)', true, 365, 7.1, 80.0, 0.7, 1.3, 1, 115, 28, 0.8, 0, 'ph_seed'),
('Brown Rice (Raw)', 'Kayumangging Bigas (Hilaw)', true, 367, 7.9, 76.2, 2.9, 3.5, 2, 268, 33, 1.5, 0, 'ph_seed'),
('Rolled Oats', 'Oatmeal', false, 389, 16.9, 66.3, 6.9, 10.6, 2, 429, 54, 4.7, 0, 'ph_seed'),
('All-Purpose Flour', 'Harina (All-Purpose)', false, 364, 10.3, 76.3, 1.0, 2.7, 2, 107, 15, 1.2, 0, 'ph_seed'),

-- ============================================================
-- FRUITS
-- ============================================================
('Saba Banana (Raw)', 'Saging na Saba (Hilaw)', true, 89, 1.3, 22.8, 0.4, 2.6, 1, 358, 5, 0.3, 9, 'ph_seed'),
('Lakatan Banana', 'Saging Lakatan', true, 89, 1.1, 22.8, 0.3, 2.6, 1, 358, 5, 0.3, 9, 'ph_seed'),
('Mangga (Ripe)', 'Manggang Hinog (Ripe Mango)', true, 65, 0.5, 17.0, 0.3, 1.8, 1, 168, 11, 0.2, 28, 'ph_seed'),
('Mangga (Green)', 'Manggang Hilaw (Green Mango)', true, 60, 0.8, 15.0, 0.4, 1.6, 2, 168, 10, 0.1, 37, 'ph_seed'),
('Papaya (Ripe)', 'Papaya (Hinog)', true, 43, 0.5, 10.8, 0.3, 1.7, 8, 182, 20, 0.3, 62, 'ph_seed'),
('Calamansi', 'Kalamansi', true, 35, 0.8, 8.5, 0.2, 0.3, 2, 138, 31, 0.3, 35, 'ph_seed'),
('Niyog (Coconut Flesh)', 'Niyog (Coconut Meat)', true, 354, 3.3, 15.2, 33.5, 9.0, 20, 356, 14, 2.4, 3, 'ph_seed'),
('Pineapple', 'Pinya', true, 50, 0.5, 13.1, 0.1, 1.4, 1, 109, 13, 0.3, 48, 'ph_seed'),
('Watermelon', 'Pakwan', true, 30, 0.6, 7.6, 0.2, 0.4, 1, 112, 7, 0.2, 8, 'ph_seed'),
('Suha (Pomelo)', 'Suha', true, 38, 0.8, 9.6, 0.0, 1.0, 1, 216, 4, 0.1, 61, 'ph_seed'),
('Avocado', 'Abokado', true, 160, 2.0, 8.5, 14.7, 6.7, 7, 485, 12, 0.6, 10, 'ph_seed'),
('Guava', 'Bayabas', true, 68, 2.6, 14.3, 1.0, 5.4, 2, 417, 18, 0.3, 228, 'ph_seed'),

-- ============================================================
-- DAIRY & MILK (per 100g / 100ml)
-- ============================================================
('Fresh Cow''s Milk', 'Gatas ng Baka (Sariwa)', false, 61, 3.2, 4.8, 3.3, 0.0, 43, 150, 113, 0.0, 0, 'ph_seed'),
('Condensed Milk (Sweetened)', 'Condensada', false, 321, 7.9, 54.4, 8.7, 0.0, 127, 371, 284, 0.2, 3, 'ph_seed'),
('Evaporated Milk', 'Evaporada', false, 135, 6.8, 10.0, 7.6, 0.0, 108, 303, 261, 0.2, 1, 'ph_seed'),
('Butter (Unsalted)', 'Mantikilya', false, 717, 0.9, 0.1, 81.1, 0.0, 11, 24, 24, 0.0, 0, 'ph_seed'),

-- ============================================================
-- COOKING OILS & FATS
-- ============================================================
('Cooking Oil (Vegetable / Palm)', 'Mantika (Vegetable)', false, 884, 0.0, 0.0, 100.0, 0.0, 0, 0, 0, 0.0, 0, 'ph_seed'),
('Coconut Oil', 'Langis ng Niyog', true, 892, 0.0, 0.0, 99.1, 0.0, 0, 0, 0, 0.0, 0, 'ph_seed'),
('Lard (Pork Fat)', 'Mantika ng Baboy (Taba)', true, 902, 0.0, 0.0, 100.0, 0.0, 0, 0, 0, 0.0, 0, 'ph_seed')

ON CONFLICT DO NOTHING;
