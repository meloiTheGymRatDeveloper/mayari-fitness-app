// Run from mayari/ directory:
//   $env:EXPO_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
//   npx tsx supabase/seed/phFoods.ts

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// All macros are per 100g
const PH_FOODS = [
  // Rice dishes
  { name: 'Sinangag', name_fil: 'Sinangag', calories_per_100g: 180, protein_per_100g: 3.5, carbs_per_100g: 36, fat_per_100g: 2.5, fiber_per_100g: 0.5, sodium_mg_per_100g: 220 },
  { name: 'Fried Rice', name_fil: 'Pritong Kanin', calories_per_100g: 175, protein_per_100g: 3, carbs_per_100g: 35, fat_per_100g: 3, fiber_per_100g: 0.4, sodium_mg_per_100g: 200 },
  { name: 'Lugaw', name_fil: 'Lugaw', calories_per_100g: 65, protein_per_100g: 1.5, carbs_per_100g: 14, fat_per_100g: 0.2, fiber_per_100g: 0.2, sodium_mg_per_100g: 80 },
  { name: 'Arroz Caldo', name_fil: 'Arroz Caldo', calories_per_100g: 80, protein_per_100g: 5, carbs_per_100g: 13, fat_per_100g: 1, fiber_per_100g: 0.2, sodium_mg_per_100g: 320 },
  { name: 'Champorado', name_fil: 'Champorado', calories_per_100g: 130, protein_per_100g: 2.5, carbs_per_100g: 28, fat_per_100g: 1.5, fiber_per_100g: 1.5, sodium_mg_per_100g: 45 },

  // Meat dishes
  { name: 'Adobong Manok', name_fil: 'Adobong Manok', calories_per_100g: 180, protein_per_100g: 20, carbs_per_100g: 5, fat_per_100g: 9, fiber_per_100g: 0.2, sodium_mg_per_100g: 680 },
  { name: 'Adobong Baboy', name_fil: 'Adobong Baboy', calories_per_100g: 250, protein_per_100g: 17, carbs_per_100g: 5, fat_per_100g: 18, fiber_per_100g: 0.1, sodium_mg_per_100g: 740 },
  { name: 'Lechon Baboy', name_fil: 'Lechon Baboy', calories_per_100g: 400, protein_per_100g: 23, carbs_per_100g: 0, fat_per_100g: 34, sodium_mg_per_100g: 520 },
  { name: 'Sisig', name_fil: 'Sisig', calories_per_100g: 280, protein_per_100g: 18, carbs_per_100g: 5, fat_per_100g: 22, sodium_mg_per_100g: 860 },
  { name: 'Bulalo', name_fil: 'Bulalo', calories_per_100g: 180, protein_per_100g: 14, carbs_per_100g: 3, fat_per_100g: 13, sodium_mg_per_100g: 340 },
  { name: 'Dinuguan', name_fil: 'Dinuguan', calories_per_100g: 220, protein_per_100g: 12, carbs_per_100g: 6, fat_per_100g: 17, sodium_mg_per_100g: 480 },
  { name: 'Longganisa', name_fil: 'Longganisa', calories_per_100g: 320, protein_per_100g: 14, carbs_per_100g: 5, fat_per_100g: 27, sodium_mg_per_100g: 920 },
  { name: 'Tocino', name_fil: 'Tocino', calories_per_100g: 280, protein_per_100g: 16, carbs_per_100g: 15, fat_per_100g: 18, sodium_mg_per_100g: 780 },
  { name: 'Tapa', name_fil: 'Tapa', calories_per_100g: 250, protein_per_100g: 24, carbs_per_100g: 8, fat_per_100g: 14, sodium_mg_per_100g: 650 },
  { name: 'Inihaw na Manok', name_fil: 'Inihaw na Manok', calories_per_100g: 165, protein_per_100g: 28, carbs_per_100g: 0, fat_per_100g: 6, sodium_mg_per_100g: 290 },
  { name: 'Kare-kare', name_fil: 'Kare-kare', calories_per_100g: 200, protein_per_100g: 15, carbs_per_100g: 10, fat_per_100g: 12, fiber_per_100g: 2, sodium_mg_per_100g: 560 },

  // Soups / Stews
  { name: 'Sinigang na Baboy', name_fil: 'Sinigang na Baboy', calories_per_100g: 100, protein_per_100g: 8, carbs_per_100g: 5, fat_per_100g: 6, fiber_per_100g: 1, sodium_mg_per_100g: 420 },
  { name: 'Sinigang na Bangus', name_fil: 'Sinigang na Bangus', calories_per_100g: 90, protein_per_100g: 12, carbs_per_100g: 4, fat_per_100g: 3, fiber_per_100g: 1, sodium_mg_per_100g: 380 },
  { name: 'Tinola', name_fil: 'Tinola', calories_per_100g: 80, protein_per_100g: 14, carbs_per_100g: 4, fat_per_100g: 2, fiber_per_100g: 0.5, sodium_mg_per_100g: 310 },
  { name: 'Tokwa\'t Baboy', name_fil: 'Tokwa\'t Baboy', calories_per_100g: 200, protein_per_100g: 15, carbs_per_100g: 6, fat_per_100g: 14, sodium_mg_per_100g: 640 },

  // Fish / Seafood
  { name: 'Bangus (Grilled)', name_fil: 'Inihaw na Bangus', calories_per_100g: 150, protein_per_100g: 22, carbs_per_100g: 0, fat_per_100g: 7, sodium_mg_per_100g: 180, potassium_mg_per_100g: 390 },
  { name: 'Tilapia (Steamed)', name_fil: 'Nilutong Tilapia', calories_per_100g: 95, protein_per_100g: 20, carbs_per_100g: 0, fat_per_100g: 2, sodium_mg_per_100g: 160, potassium_mg_per_100g: 380 },
  { name: 'Tinapa', name_fil: 'Tinapa', calories_per_100g: 200, protein_per_100g: 25, carbs_per_100g: 0, fat_per_100g: 11, sodium_mg_per_100g: 1200 },
  { name: 'Daing na Bangus', name_fil: 'Daing na Bangus', calories_per_100g: 230, protein_per_100g: 26, carbs_per_100g: 0, fat_per_100g: 14, sodium_mg_per_100g: 1400 },
  { name: 'Sardinas (Canned in Tomato)', name_fil: 'Sardinas', calories_per_100g: 130, protein_per_100g: 15, carbs_per_100g: 4, fat_per_100g: 6, sodium_mg_per_100g: 450, iron_mg_per_100g: 2.5 },
  { name: 'Kinilaw', name_fil: 'Kinilaw', calories_per_100g: 120, protein_per_100g: 18, carbs_per_100g: 4, fat_per_100g: 4, sodium_mg_per_100g: 320 },

  // Vegetables / Legumes
  { name: 'Kangkong (Sauteed)', name_fil: 'Ginisang Kangkong', calories_per_100g: 35, protein_per_100g: 3, carbs_per_100g: 5, fat_per_100g: 0.5, fiber_per_100g: 2, iron_mg_per_100g: 2, vitamin_c_mg_per_100g: 55 },
  { name: 'Monggo Guisado', name_fil: 'Ginisang Monggo', calories_per_100g: 130, protein_per_100g: 8, carbs_per_100g: 20, fat_per_100g: 3, fiber_per_100g: 4, iron_mg_per_100g: 2.5 },
  { name: 'Pinakbet', name_fil: 'Pinakbet', calories_per_100g: 100, protein_per_100g: 5, carbs_per_100g: 12, fat_per_100g: 4, fiber_per_100g: 3, sodium_mg_per_100g: 380 },
  { name: 'Kamote (Boiled)', name_fil: 'Nilagang Kamote', calories_per_100g: 90, protein_per_100g: 2, carbs_per_100g: 21, fat_per_100g: 0.1, fiber_per_100g: 3, potassium_mg_per_100g: 440, vitamin_c_mg_per_100g: 20 },
  { name: 'Tokwa (Fried)', name_fil: 'Pritong Tokwa', calories_per_100g: 270, protein_per_100g: 18, carbs_per_100g: 8, fat_per_100g: 18, calcium_mg_per_100g: 200 },

  // Eggs
  { name: 'Itlog (Boiled)', name_fil: 'Nilagang Itlog', calories_per_100g: 155, protein_per_100g: 13, carbs_per_100g: 1, fat_per_100g: 11, sodium_mg_per_100g: 124, cholesterol_mg_per_100g: 370, vitamin_b12_mcg_per_100g: 0.9 },
  { name: 'Scrambled Eggs', name_fil: 'Scrambled Eggs', calories_per_100g: 150, protein_per_100g: 10, carbs_per_100g: 2, fat_per_100g: 11, sodium_mg_per_100g: 210, cholesterol_mg_per_100g: 340 },

  // Preserved / Canned
  { name: 'Spam (Classic)', name_fil: 'Spam', calories_per_100g: 290, protein_per_100g: 13, carbs_per_100g: 3, fat_per_100g: 26, sodium_mg_per_100g: 1540 },

  // Noodles
  { name: 'Pancit Canton', name_fil: 'Pancit Canton', calories_per_100g: 160, protein_per_100g: 8, carbs_per_100g: 28, fat_per_100g: 3, fiber_per_100g: 1.5, sodium_mg_per_100g: 520 },
  { name: 'Pancit Bihon', name_fil: 'Pancit Bihon', calories_per_100g: 140, protein_per_100g: 6, carbs_per_100g: 26, fat_per_100g: 2, fiber_per_100g: 1, sodium_mg_per_100g: 440 },
  { name: 'Lomi', name_fil: 'Lomi', calories_per_100g: 155, protein_per_100g: 9, carbs_per_100g: 22, fat_per_100g: 3, sodium_mg_per_100g: 580 },
  { name: 'Palabok', name_fil: 'Palabok', calories_per_100g: 200, protein_per_100g: 8, carbs_per_100g: 30, fat_per_100g: 6, sodium_mg_per_100g: 490 },

  // Bread / Baked goods
  { name: 'Pan de Sal', name_fil: 'Pan de Sal', calories_per_100g: 300, protein_per_100g: 8, carbs_per_100g: 56, fat_per_100g: 5, fiber_per_100g: 2, sodium_mg_per_100g: 420 },
  { name: 'Ensaymada', name_fil: 'Ensaymada', calories_per_100g: 380, protein_per_100g: 6, carbs_per_100g: 50, fat_per_100g: 18, sodium_mg_per_100g: 260 },
  { name: 'Pandelimon', name_fil: 'Pandelimon', calories_per_100g: 280, protein_per_100g: 6, carbs_per_100g: 52, fat_per_100g: 5, sodium_mg_per_100g: 310 },
  { name: 'Tasty Bread', name_fil: 'Tinapay', calories_per_100g: 265, protein_per_100g: 8, carbs_per_100g: 50, fat_per_100g: 3.5, fiber_per_100g: 2.5, sodium_mg_per_100g: 480 },

  // Kakanin / Desserts
  { name: 'Biko', name_fil: 'Biko', calories_per_100g: 290, protein_per_100g: 3, carbs_per_100g: 62, fat_per_100g: 5, sodium_mg_per_100g: 60 },
  { name: 'Puto', name_fil: 'Puto', calories_per_100g: 200, protein_per_100g: 4, carbs_per_100g: 40, fat_per_100g: 3, sodium_mg_per_100g: 220 },
  { name: 'Maja Blanca', name_fil: 'Maja Blanca', calories_per_100g: 210, protein_per_100g: 3, carbs_per_100g: 38, fat_per_100g: 6, sodium_mg_per_100g: 80 },
  { name: 'Kutsinta', name_fil: 'Kutsinta', calories_per_100g: 180, protein_per_100g: 2, carbs_per_100g: 43, fat_per_100g: 0.5, sodium_mg_per_100g: 110 },
  { name: 'Palitaw', name_fil: 'Palitaw', calories_per_100g: 175, protein_per_100g: 3, carbs_per_100g: 38, fat_per_100g: 1, sodium_mg_per_100g: 40 },
  { name: 'Buko Pandan', name_fil: 'Buko Pandan', calories_per_100g: 200, protein_per_100g: 2, carbs_per_100g: 32, fat_per_100g: 8, sodium_mg_per_100g: 55 },

  // Dessert drinks / cold
  { name: 'Halo-halo', name_fil: 'Halo-halo', calories_per_100g: 170, protein_per_100g: 4, carbs_per_100g: 35, fat_per_100g: 3, sodium_mg_per_100g: 70 },
  { name: 'Mais con Hielo', name_fil: 'Mais con Hielo', calories_per_100g: 120, protein_per_100g: 2, carbs_per_100g: 28, fat_per_100g: 0.5, sodium_mg_per_100g: 40 },
  { name: 'Gulaman', name_fil: 'Gulaman', calories_per_100g: 35, protein_per_100g: 1, carbs_per_100g: 8, fat_per_100g: 0, sodium_mg_per_100g: 15 },
];

async function main() {
  console.log(`Seeding ${PH_FOODS.length} Filipino foods...`);

  const rows = PH_FOODS.map(f => ({
    ...f,
    is_ph_local: true,
    source: 'ph_seed' as const,
  }));

  const { error } = await supabase.from('food_items').insert(rows);
  if (error) { console.error('Seed error:', error); process.exit(1); }
  console.log(`Done! Seeded ${rows.length} Filipino foods.`);
}

main().catch(err => { console.error(err); process.exit(1); });
