-- Seed Philippine local food items (per 100g values)
INSERT INTO public.food_items (name, name_fil, is_ph_local, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sodium_mg_per_100g, source)
VALUES
-- Rice Staples
('Steamed White Rice', 'Kanin', true, 130, 2.4, 28.2, 0.3, 0.4, 1, 'ph_seed'),
('Garlic Fried Rice', 'Sinangag', true, 181, 3.5, 37.0, 2.0, 0.5, 180, 'ph_seed'),
('Champorado', 'Champorado', true, 168, 3.2, 32.0, 3.5, 1.2, 45, 'ph_seed'),
('Arroz Caldo', 'Arroz Caldo', true, 98, 6.2, 15.5, 1.5, 0.5, 320, 'ph_seed'),
('Lugaw', 'Lugaw', true, 76, 2.0, 16.5, 0.4, 0.3, 180, 'ph_seed'),
('Goto', 'Goto', true, 110, 8.0, 13.0, 3.0, 0.3, 380, 'ph_seed'),
('Brown Rice', 'Kayumangging Kanin', true, 123, 2.7, 25.6, 1.0, 1.8, 1, 'ph_seed'),

-- Chicken Dishes
('Chicken Adobo', 'Adobong Manok', true, 210, 23.0, 4.8, 11.0, 0.2, 780, 'ph_seed'),
('Tinola', 'Tinola', true, 90, 12.0, 3.5, 3.2, 0.8, 380, 'ph_seed'),
('Lechon Manok', 'Lechon Manok', true, 215, 25.0, 3.0, 12.0, 0.0, 450, 'ph_seed'),
('Fried Chicken', 'Pritong Manok', true, 298, 24.0, 8.5, 19.0, 0.5, 480, 'ph_seed'),
('Chicken Inasal', 'Inasal na Manok', true, 185, 24.5, 2.5, 9.0, 0.0, 420, 'ph_seed'),

-- Pork Dishes
('Pork Adobo', 'Adobong Baboy', true, 290, 22.0, 4.5, 20.0, 0.2, 820, 'ph_seed'),
('Lechon Kawali', 'Lechon Kawali', true, 448, 25.0, 2.0, 37.5, 0.0, 620, 'ph_seed'),
('Bistek Tagalog', 'Bistek Tagalog', true, 218, 22.0, 4.2, 12.5, 0.3, 680, 'ph_seed'),
('Kare-Kare', 'Kare-Kare', true, 198, 18.0, 7.5, 11.0, 1.5, 420, 'ph_seed'),
('Caldereta', 'Caldereta', true, 230, 20.0, 8.0, 13.5, 1.0, 520, 'ph_seed'),
('Menudo', 'Menudo', true, 188, 18.0, 9.5, 9.5, 1.2, 490, 'ph_seed'),
('Mechado', 'Mechado', true, 198, 21.0, 6.0, 10.5, 0.8, 510, 'ph_seed'),
('Afritada', 'Afritada', true, 185, 19.0, 7.8, 9.0, 1.0, 480, 'ph_seed'),
('Dinuguan', 'Dinuguan', true, 195, 16.0, 5.5, 13.0, 0.5, 680, 'ph_seed'),
('Longganisa', 'Longganisa', true, 320, 16.0, 10.0, 25.0, 0.5, 850, 'ph_seed'),
('Tocino', 'Tocino', true, 280, 20.0, 18.0, 14.0, 0.0, 680, 'ph_seed'),
('Tapa', 'Tapa', true, 250, 28.0, 6.0, 13.0, 0.0, 750, 'ph_seed'),
('Bulalo', 'Bulalo', true, 178, 18.0, 2.5, 10.8, 0.0, 320, 'ph_seed'),
('Nilaga', 'Nilaga', true, 152, 15.0, 8.0, 6.5, 1.2, 380, 'ph_seed'),
('Pork Chop', 'Pritong Porkchop', true, 290, 25.0, 0.0, 21.0, 0.0, 450, 'ph_seed'),
('Liempo', 'Inihaw na Liempo', true, 380, 22.0, 0.0, 32.0, 0.0, 380, 'ph_seed'),

-- Seafood
('Sinigang na Baboy', 'Sinigang na Baboy', true, 148, 14.5, 4.2, 8.0, 1.0, 450, 'ph_seed'),
('Sinigang na Hipon', 'Sinigang na Hipon', true, 95, 12.0, 5.0, 3.0, 1.2, 480, 'ph_seed'),
('Sinigang na Isda', 'Sinigang na Isda', true, 110, 14.0, 4.5, 4.0, 1.0, 460, 'ph_seed'),
('Paksiw na Bangus', 'Paksiw na Bangus', true, 148, 20.0, 3.5, 6.0, 0.5, 520, 'ph_seed'),
('Grilled Bangus', 'Inihaw na Bangus', true, 162, 25.0, 0.0, 6.5, 0.0, 210, 'ph_seed'),
('Daing na Bangus', 'Daing na Bangus', true, 195, 28.0, 2.0, 8.5, 0.0, 680, 'ph_seed'),
('Grilled Tilapia', 'Inihaw na Tilapia', true, 128, 26.0, 0.0, 2.3, 0.0, 190, 'ph_seed'),
('Dried Anchovies', 'Dilis', true, 280, 53.0, 0.0, 7.0, 0.0, 1200, 'ph_seed'),
('Crispy Dilis', 'Pritong Dilis', true, 310, 50.0, 5.0, 10.0, 0.0, 1350, 'ph_seed'),
('Paksiw na Isda', 'Paksiw na Isda', true, 130, 20.0, 2.0, 5.0, 0.5, 510, 'ph_seed'),

-- Vegetables / Plant-based
('Pinakbet', 'Pinakbet', true, 120, 5.0, 10.5, 7.0, 3.0, 410, 'ph_seed'),
('Laing', 'Laing', true, 202, 6.0, 9.5, 16.0, 2.5, 380, 'ph_seed'),
('Ginisang Ampalaya', 'Ginisang Ampalaya', true, 72, 4.5, 7.5, 3.0, 2.5, 280, 'ph_seed'),
('Ginisang Kangkong', 'Ginisang Kangkong', true, 65, 4.0, 6.0, 2.5, 1.8, 260, 'ph_seed'),
('Chopsuey', 'Chopsuey', true, 98, 5.5, 10.0, 4.5, 2.8, 420, 'ph_seed'),
('Monggo', 'Ginisang Monggo', true, 142, 9.5, 20.0, 3.0, 5.5, 380, 'ph_seed'),

-- Eggs
('Scrambled Egg', 'Scrambled Itlog', true, 148, 10.0, 1.5, 11.0, 0.0, 180, 'ph_seed'),
('Boiled Egg', 'Nilutong Itlog', true, 155, 13.0, 1.1, 11.0, 0.0, 124, 'ph_seed'),
('Salted Egg', 'Itlog na Maalat', true, 202, 14.0, 1.5, 16.0, 0.0, 1540, 'ph_seed'),
('Tortang Talong', 'Tortang Talong', true, 138, 8.5, 6.5, 9.0, 1.5, 280, 'ph_seed'),

-- Noodles
('Pancit Canton', 'Pancit Canton', true, 152, 7.0, 23.0, 3.5, 1.2, 480, 'ph_seed'),
('Pancit Bihon', 'Pancit Bihon', true, 132, 5.0, 25.0, 2.0, 0.8, 380, 'ph_seed'),
('Pancit Malabon', 'Pancit Malabon', true, 165, 8.0, 24.0, 4.5, 1.0, 520, 'ph_seed'),
('Lomi', 'Lomi', true, 145, 9.0, 19.0, 3.8, 0.8, 620, 'ph_seed'),
('Mami', 'Mami', true, 112, 8.0, 15.0, 2.2, 0.5, 480, 'ph_seed'),
('Sotanghon Soup', 'Sotanghon', true, 110, 6.5, 16.5, 2.0, 0.5, 420, 'ph_seed'),

-- Bread & Pastries
('Pandesal', 'Pandesal', true, 272, 8.5, 52.0, 3.5, 1.5, 380, 'ph_seed'),
('Ensaymada', 'Ensaymada', true, 358, 7.0, 52.0, 14.5, 1.0, 320, 'ph_seed'),
('Monay', 'Monay', true, 280, 8.0, 55.0, 3.0, 1.2, 350, 'ph_seed'),
('Spanish Bread', 'Spanish Bread', true, 340, 7.5, 52.0, 12.0, 1.0, 310, 'ph_seed'),
('Tasty Bread', 'Tasty', true, 265, 9.0, 50.0, 3.5, 2.0, 450, 'ph_seed'),

-- Street Food
('Fish Ball', 'Fish Ball', true, 152, 10.0, 19.5, 3.5, 0.5, 680, 'ph_seed'),
('Kikiam', 'Kikiam', true, 168, 9.5, 18.0, 6.0, 1.0, 580, 'ph_seed'),
('Kwek-kwek', 'Kwek-kwek', true, 158, 8.0, 12.5, 8.5, 0.5, 420, 'ph_seed'),
('Isaw', 'Isaw', true, 198, 20.5, 4.5, 10.5, 0.0, 480, 'ph_seed'),
('Banana Cue', 'Banana Cue', true, 200, 1.8, 42.0, 3.8, 2.5, 30, 'ph_seed'),
('Turon', 'Turon', true, 228, 2.2, 40.0, 7.0, 2.0, 120, 'ph_seed'),
('Squid Ball', 'Squid Ball', true, 148, 9.5, 18.0, 4.0, 0.5, 650, 'ph_seed'),
('Tempura (street)', 'Tempura', true, 162, 8.5, 20.0, 5.5, 0.5, 580, 'ph_seed'),

-- Desserts / Kakanin
('Halo-Halo', 'Halo-Halo', true, 178, 3.5, 35.0, 4.0, 1.2, 85, 'ph_seed'),
('Leche Flan', 'Leche Flan', true, 320, 8.0, 36.0, 16.0, 0.0, 145, 'ph_seed'),
('Bibingka', 'Bibingka', true, 278, 5.0, 42.0, 10.5, 0.8, 280, 'ph_seed'),
('Puto', 'Puto', true, 172, 4.0, 33.0, 3.0, 0.5, 185, 'ph_seed'),
('Kutsinta', 'Kutsinta', true, 158, 2.0, 37.5, 0.5, 0.5, 120, 'ph_seed'),
('Suman', 'Suman', true, 178, 3.0, 38.0, 2.0, 0.8, 95, 'ph_seed'),
('Biko', 'Biko', true, 318, 4.0, 56.0, 9.0, 0.8, 105, 'ph_seed'),
('Maja Blanca', 'Maja Blanca', true, 218, 3.5, 34.0, 8.0, 0.5, 95, 'ph_seed'),
('Palitaw', 'Palitaw', true, 188, 3.5, 38.0, 2.5, 0.8, 65, 'ph_seed'),
('Sapin-Sapin', 'Sapin-Sapin', true, 210, 2.5, 42.0, 4.5, 0.5, 80, 'ph_seed'),
('Cassava Cake', 'Cassava Cake', true, 265, 3.0, 40.0, 11.0, 1.5, 155, 'ph_seed'),
('Puto Bumbong', 'Puto Bumbong', true, 195, 3.5, 38.0, 4.0, 1.2, 75, 'ph_seed'),

-- Beverages
('Taho', 'Taho', true, 100, 4.2, 18.0, 1.8, 0.2, 45, 'ph_seed'),
('Calamansi Juice', 'Kalamansi Juice', true, 38, 0.5, 9.5, 0.2, 0.5, 8, 'ph_seed'),
('Coconut Milk', 'Gata', true, 230, 2.3, 5.5, 23.8, 2.2, 15, 'ph_seed'),
('Buko Juice', 'Buko Juice', true, 22, 0.7, 4.7, 0.2, 1.1, 25, 'ph_seed'),
('Sago at Gulaman', 'Sago at Gulaman', true, 118, 0.5, 29.5, 0.2, 0.8, 12, 'ph_seed'),

-- Condiments & Basics
('Shrimp Paste', 'Bagoong Alamang', true, 112, 14.0, 4.5, 4.0, 0.0, 2800, 'ph_seed'),
('Fish Sauce', 'Patis', true, 35, 5.5, 2.8, 0.0, 0.0, 7700, 'ph_seed'),
('Atchara', 'Atchara', true, 78, 0.8, 19.0, 0.2, 1.2, 380, 'ph_seed'),
('Cane Vinegar', 'Sukang Paombong', true, 18, 0.0, 0.0, 0.0, 0.0, 5, 'ph_seed'),
('Soy Sauce', 'Toyo', true, 53, 8.0, 5.0, 0.1, 0.5, 5700, 'ph_seed'),

-- Common Snacks
('Chicharon', 'Chicharon', true, 545, 60.0, 0.0, 33.0, 0.0, 1680, 'ph_seed'),
('kropek', 'Kropek', true, 480, 25.0, 50.0, 20.0, 0.0, 980, 'ph_seed'),
('Cornick', 'Cornick', true, 468, 10.0, 72.0, 16.0, 4.0, 550, 'ph_seed')
;
