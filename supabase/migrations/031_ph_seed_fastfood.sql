-- 031_ph_seed_fastfood.sql
INSERT INTO public.food_items
  (name, name_fil, brand, is_ph_local, calories_per_100g, protein_per_100g,
   carbs_per_100g, fat_per_100g, fiber_per_100g, sodium_mg_per_100g, source)
VALUES

-- ============================================================
-- JOLLIBEE
-- ============================================================
('Chicken Joy (1 pc)', 'Chicken Joy', 'Jollibee', true, 248, 19.0, 7.8, 16.5, 0.5, 580, 'ph_seed'),
('Jolly Spaghetti', 'Jolly Spaghetti', 'Jollibee', true, 170, 7.0, 27.0, 4.5, 1.2, 580, 'ph_seed'),
('Yum Burger', 'Yum Burger', 'Jollibee', true, 265, 11.5, 27.0, 12.0, 1.0, 540, 'ph_seed'),
('Burger Steak', 'Burger Steak', 'Jollibee', true, 195, 12.5, 14.5, 9.8, 0.8, 680, 'ph_seed'),
('Peach Mango Pie', 'Peach Mango Pie', 'Jollibee', true, 265, 2.8, 35.0, 13.0, 0.8, 220, 'ph_seed'),
('Palabok Fiesta', 'Palabok Fiesta', 'Jollibee', true, 175, 8.5, 26.0, 4.5, 1.0, 750, 'ph_seed'),
('Jolly Hotdog', 'Jolly Hotdog', 'Jollibee', true, 280, 9.5, 27.0, 15.0, 0.5, 820, 'ph_seed'),

-- ============================================================
-- McDONALD'S PHILIPPINES
-- ============================================================
('McChicken Sandwich', 'McChicken', 'McDonald''s', false, 212, 11.5, 23.0, 8.5, 1.2, 560, 'ph_seed'),
('Regular Fries', 'Regular Fries', 'McDonald''s', false, 320, 3.5, 42.0, 15.5, 3.8, 480, 'ph_seed'),
('Big Mac', 'Big Mac', 'McDonald''s', false, 245, 13.0, 20.0, 12.0, 1.5, 590, 'ph_seed'),
('Hotcakes with Syrup', 'Hotcakes', 'McDonald''s', false, 275, 5.5, 55.0, 5.5, 1.0, 460, 'ph_seed'),

-- ============================================================
-- CHOWKING
-- ============================================================
('Chao Fan (Fried Rice)', 'Chao Fan', 'Chowking', true, 165, 5.5, 28.0, 4.0, 0.8, 640, 'ph_seed'),
('Pork Asado Siopao', 'Siopao Asado', 'Chowking', true, 230, 9.0, 33.5, 7.0, 1.0, 520, 'ph_seed'),
('Wonton Noodle Soup', 'Wonton Soup', 'Chowking', true, 118, 7.5, 16.5, 2.5, 0.5, 780, 'ph_seed'),
('Lauriat Rice (Steamed)', 'Lauriat Rice', 'Chowking', true, 165, 3.5, 35.5, 1.0, 0.4, 280, 'ph_seed'),

-- ============================================================
-- MANG INASAL
-- ============================================================
('Chicken Inasal Paa', 'Inasal Paa', 'Mang Inasal', true, 210, 21.0, 3.5, 12.5, 0.0, 580, 'ph_seed'),
('Chicken Inasal Pecho', 'Inasal Pecho', 'Mang Inasal', true, 175, 23.5, 2.5, 8.5, 0.0, 520, 'ph_seed'),

-- ============================================================
-- GREENWICH / PIZZA
-- ============================================================
('Greenwich Hawaiian Pizza (per slice)', 'Hawaiian Pizza', 'Greenwich', true, 238, 10.5, 30.0, 8.5, 1.5, 590, 'ph_seed'),

-- ============================================================
-- INSTANT NOODLES (dry/uncooked, per 100g)
-- ============================================================
('Lucky Me! Pancit Canton (Original)', 'Lucky Me! Pancit Canton', 'Lucky Me!', true, 430, 9.2, 60.5, 16.8, 1.5, 1380, 'ph_seed'),
('Lucky Me! Chicken Mami', 'Lucky Me! Chicken Mami', 'Lucky Me!', true, 360, 9.0, 58.0, 10.5, 0.8, 1100, 'ph_seed'),
('Lucky Me! Beef Noodle Soup', 'Lucky Me! Beef Noodles', 'Lucky Me!', true, 345, 8.5, 56.0, 9.8, 0.8, 1050, 'ph_seed'),

-- ============================================================
-- CANNED / PRESERVED (per 100g of drained product)
-- ============================================================
('Argentina Corned Beef', 'Corned Beef', 'Argentina', true, 175, 13.5, 4.2, 11.5, 0.0, 760, 'ph_seed'),
('Ligo Sardines in Tomato Sauce', 'Sardinas sa Tomato', 'Ligo', true, 132, 15.5, 3.8, 5.8, 0.0, 430, 'ph_seed'),
('Century Tuna in Water', 'Tuna sa Tubig', 'Century Tuna', true, 98, 21.5, 0.0, 1.2, 0.0, 350, 'ph_seed'),
('Purefoods Liver Spread', 'Liver Spread', 'Purefoods', true, 215, 8.5, 10.8, 15.0, 0.0, 980, 'ph_seed'),
('Spam Classic', 'Spam', 'Spam', false, 290, 13.0, 3.0, 25.5, 0.0, 1540, 'ph_seed'),

-- ============================================================
-- BEVERAGES & POWDERS (per 100g of powder / per 100ml of drink)
-- ============================================================
('Milo (Powder)', 'Milo', 'Nestlé Milo', false, 394, 9.7, 66.8, 10.4, 2.5, 120, 'ph_seed'),
('Bear Brand Powdered Milk', 'Bear Brand', 'Bear Brand', false, 370, 25.0, 50.0, 5.5, 0.0, 260, 'ph_seed'),
('Nescafé 3-in-1 Classic (prepared per 100ml)', 'Nescafé 3-in-1', 'Nescafé', false, 54, 0.8, 10.5, 1.3, 0.0, 38, 'ph_seed'),
('Royal Soft Drink (per 100ml)', 'Royal', 'Royal', true, 44, 0.0, 11.0, 0.0, 0.0, 10, 'ph_seed'),
('Nestlé All-Purpose Cream', 'All-Purpose Cream', 'Nestlé', false, 290, 2.5, 15.0, 25.0, 0.0, 45, 'ph_seed')

ON CONFLICT DO NOTHING;
