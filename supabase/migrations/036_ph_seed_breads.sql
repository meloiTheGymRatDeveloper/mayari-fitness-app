-- 036_ph_seed_breads.sql
-- Popular Philippine bread and bakery products
INSERT INTO public.food_items
  (name, name_fil, brand, barcode, is_ph_local, calories_per_100g, protein_per_100g,
   carbs_per_100g, fat_per_100g, fiber_per_100g, sodium_mg_per_100g, source)
VALUES

-- ============================================================
-- GARDENIA
-- ============================================================
('Classic White Bread', 'Classic White Bread', 'Gardenia', '4800229007007', true, 267, 8.3, 52.0, 3.3, 1.7, 467, 'ph_seed'),
('Classic White Bread 600g', 'Classic White Bread', 'Gardenia', '4800229007014', true, 267, 8.3, 52.0, 3.3, 1.7, 467, 'ph_seed'),
('Wheat Bread', 'Wheat Bread', 'Gardenia', '4800229001005', true, 240, 9.0, 45.0, 3.5, 4.0, 440, 'ph_seed'),
('Whole Wheat Bread', 'Whole Wheat Bread', 'Gardenia', '4800229002002', true, 235, 9.5, 43.0, 3.5, 5.0, 430, 'ph_seed'),
('Raisin Bread', 'Raisin Bread', 'Gardenia', '4800229002001', true, 280, 7.5, 55.0, 4.0, 2.5, 350, 'ph_seed'),
('Wheat Raisin Loaf', 'Wheat Raisin Loaf', 'Gardenia', NULL, true, 275, 7.8, 53.0, 4.0, 3.0, 360, 'ph_seed'),
('High Fiber Wheat Loaf', 'High Fiber Wheat Loaf', 'Gardenia', NULL, true, 228, 9.8, 42.0, 3.0, 6.5, 410, 'ph_seed'),
('Oat Bread', 'Oat Bread', 'Gardenia', NULL, true, 245, 9.0, 45.5, 4.0, 4.5, 420, 'ph_seed'),
('Milky Soft Loaf', 'Milky Soft Loaf', 'Gardenia', NULL, true, 285, 8.0, 54.0, 5.0, 1.5, 430, 'ph_seed'),

-- ============================================================
-- MONDE NISSIN / GOLDEN BAKE
-- ============================================================
('White Bread', 'White Bread', 'Golden Bake', NULL, true, 265, 8.0, 52.0, 3.2, 1.5, 460, 'ph_seed'),
('Wheat Bread', 'Wheat Bread', 'Golden Bake', NULL, true, 242, 8.8, 44.5, 3.3, 3.8, 440, 'ph_seed'),

-- ============================================================
-- PAN DE SAL (generic & brands)
-- ============================================================
('Pan de Sal', 'Pan de Sal', NULL, NULL, true, 258, 8.5, 50.0, 3.0, 1.8, 430, 'ph_seed'),
('Soft Pan de Sal', 'Malambot na Pan de Sal', 'Gardenia', NULL, true, 265, 8.2, 51.0, 3.5, 1.5, 420, 'ph_seed'),

-- ============================================================
-- PINOY BAKERY STAPLES
-- ============================================================
('Pandesal (bakery)', 'Pandesal', NULL, NULL, true, 256, 8.3, 49.5, 3.0, 1.8, 425, 'ph_seed'),
('Ensaymada', 'Ensaymada', NULL, NULL, true, 380, 7.5, 48.0, 18.0, 1.0, 370, 'ph_seed'),
('Spanish Bread', 'Spanish Bread', NULL, NULL, true, 355, 7.0, 52.0, 13.5, 1.2, 380, 'ph_seed'),
('Monay', 'Monay', NULL, NULL, true, 265, 8.0, 52.0, 3.5, 1.8, 400, 'ph_seed'),
('Putok / Star Bread', 'Putok', NULL, NULL, true, 270, 8.2, 52.5, 3.5, 1.5, 410, 'ph_seed'),
('Tasty Bread (sliced)', 'Tasty Bread', NULL, NULL, true, 270, 8.5, 52.0, 3.8, 1.5, 450, 'ph_seed')

ON CONFLICT DO NOTHING;
