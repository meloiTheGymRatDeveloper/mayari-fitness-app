/**
 * Bulk-imports USDA FoodData Central Foundation + SR Legacy foods into Supabase.
 *
 * Foundation: ~1,700 foods — highest-quality nutrient data (USDA lab-tested)
 * SR Legacy:  ~8,000 foods — comprehensive ingredient database
 *
 * Usage:
 *   node scripts/seed-usda.js
 *
 * Prerequisites:
 *   1. Add SUPABASE_SERVICE_ROLE_KEY to your .env file (never commit this key)
 *   2. Get a free USDA API key at https://fdc.nal.usda.gov/api-key-signup.html
 *      and set EXPO_PUBLIC_FDC_API_KEY in .env (DEMO_KEY is capped at 30 req/hr)
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ── Env loading ──────────────────────────────────────────────────────────────

const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FDC_KEY       = process.env.EXPO_PUBLIC_FDC_API_KEY ?? 'DEMO_KEY';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('\nERROR: Missing required env vars.');
  console.error('  EXPO_PUBLIC_SUPABASE_URL  — in your .env file');
  console.error('  SUPABASE_SERVICE_ROLE_KEY — get from Supabase dashboard → Project Settings → API\n');
  process.exit(1);
}

if (FDC_KEY === 'DEMO_KEY') {
  console.warn('\nWARNING: Using DEMO_KEY (30 requests/hour). Script will sleep between pages.');
  console.warn('For faster import, get a free key at https://fdc.nal.usda.gov/api-key-signup.html\n');
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Nutrient ID constants (matches lib/foodSearch.ts) ────────────────────────

const N = {
  ENERGY: 1008, PROTEIN: 1003, CARBS: 1005, FAT: 1004,
  FIBER: 1079, SUGAR: 2000, SAT_FAT: 1258,
  POLY_FAT: 1257, MONO_FAT: 1292,
  SODIUM: 1093, POTASSIUM: 1092, CALCIUM: 1087,
  IRON: 1089, MAGNESIUM: 1090, PHOSPHORUS: 1091, ZINC: 1095,
  VITAMIN_A: 1106, VITAMIN_C: 1162, VITAMIN_D: 1114,
  VITAMIN_B12: 1178, FOLATE: 1177, CHOLESTEROL: 1253,
};

function mapFood(food) {
  const nMap = {};
  for (const { nutrientId, value } of (food.foodNutrients ?? [])) {
    nMap[nutrientId] = value;
  }
  const g = (id) => nMap[id] ?? null;
  return {
    name:                          food.description.trim(),
    name_fil:                      null,
    brand:                         food.brandName?.trim() ?? null,
    is_ph_local:                   false,
    calories_per_100g:             g(N.ENERGY),
    protein_per_100g:              g(N.PROTEIN),
    carbs_per_100g:                g(N.CARBS),
    fat_per_100g:                  g(N.FAT),
    fiber_per_100g:                g(N.FIBER),
    sugar_per_100g:                g(N.SUGAR),
    saturated_fat_per_100g:        g(N.SAT_FAT),
    polyunsaturated_fat_per_100g:  g(N.POLY_FAT),
    monounsaturated_fat_per_100g:  g(N.MONO_FAT),
    sodium_mg_per_100g:            g(N.SODIUM),
    potassium_mg_per_100g:         g(N.POTASSIUM),
    calcium_mg_per_100g:           g(N.CALCIUM),
    iron_mg_per_100g:              g(N.IRON),
    magnesium_mg_per_100g:         g(N.MAGNESIUM),
    phosphorus_mg_per_100g:        g(N.PHOSPHORUS),
    zinc_mg_per_100g:              g(N.ZINC),
    vitamin_a_mcg_per_100g:        g(N.VITAMIN_A),
    vitamin_c_mg_per_100g:         g(N.VITAMIN_C),
    vitamin_d_mcg_per_100g:        g(N.VITAMIN_D),
    vitamin_b12_mcg_per_100g:      g(N.VITAMIN_B12),
    folate_mcg_per_100g:           g(N.FOLATE),
    cholesterol_mg_per_100g:       g(N.CHOLESTEROL),
    barcode:                       null,
    source:                        'usda',
    source_id:                     String(food.fdcId),
  };
}

// ── Fetch with retry ─────────────────────────────────────────────────────────

async function fetchWithRetry(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url);
    if (res.status === 429) {
      const wait = attempt * 30_000;
      console.log(`\n  Rate limited. Waiting ${wait / 1000}s before retry ${attempt}/${retries}...`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} from USDA API`);
    return res;
  }
  throw new Error('Max retries exceeded (rate limited)');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Upsert batch ─────────────────────────────────────────────────────────────

async function upsertBatch(rows) {
  const { error } = await supabase
    .from('food_items')
    .upsert(rows, { onConflict: 'source,source_id', ignoreDuplicates: true });
  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║  USDA FoodData Central bulk import    ║');
  console.log('╚═══════════════════════════════════════╝\n');

  const PAGE_SIZE  = 200;
  const DELAY_MS   = FDC_KEY === 'DEMO_KEY' ? 2500 : 250;
  let page         = 1;
  let total        = 0;

  while (true) {
    const params = new URLSearchParams({
      dataType:   'Foundation,SR Legacy',
      pageSize:   String(PAGE_SIZE),
      pageNumber: String(page),
      api_key:    FDC_KEY,
    });

    process.stdout.write(`  Page ${String(page).padStart(3, ' ')}: fetching...`);

    let foods;
    try {
      const res = await fetchWithRetry(
        `https://api.nal.usda.gov/fdc/v1/foods/list?${params}`
      );
      foods = await res.json();
    } catch (err) {
      console.error(`\n  ERROR on page ${page}: ${err.message}`);
      process.exit(1);
    }

    if (!Array.isArray(foods) || foods.length === 0) {
      process.stdout.write(' done.\n');
      break;
    }

    const rows = foods.map(mapFood);
    await upsertBatch(rows);
    total += rows.length;

    process.stdout.write(` inserted ${rows.length} (running total: ${total})\n`);

    if (foods.length < PAGE_SIZE) break;

    page++;
    await sleep(DELAY_MS);
  }

  console.log(`\n✓ Done. Imported ${total} USDA foods into food_items.\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
