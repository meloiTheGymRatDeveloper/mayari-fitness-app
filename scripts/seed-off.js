/**
 * Bulk-imports Open Food Facts Philippines products into Supabase.
 *
 * Fetches all products tagged with "philippines" from the OFF API (~30k–50k items).
 * These are branded and packaged foods sold in the Philippines — the gap that
 * USDA doesn't cover (Century Tuna, Magnolia, Lucky Me, etc.).
 *
 * Usage:
 *   node scripts/seed-off.js
 *
 * Prerequisites:
 *   Add SUPABASE_SERVICE_ROLE_KEY to your .env file (never commit this key).
 *   No OFF API key needed.
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

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('\nERROR: Missing required env vars.');
  console.error('  EXPO_PUBLIC_SUPABASE_URL  — in your .env file');
  console.error('  SUPABASE_SERVICE_ROLE_KEY — get from Supabase dashboard → Project Settings → API\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── OFF product mapper ───────────────────────────────────────────────────────

function mapProduct(p) {
  const n   = p.nutriments ?? {};
  const mg  = (v) => (v != null ? v * 1000 : null);
  const mcg = (v) => (v != null ? v * 1000 : null);
  return {
    name:                          (p.product_name ?? '').trim() || null,
    name_fil:                      null,
    brand:                         p.brands?.split(',')[0]?.trim() ?? null,
    is_ph_local:                   true,
    calories_per_100g:             n['energy-kcal_100g'] ?? null,
    protein_per_100g:              n['proteins_100g']    ?? null,
    carbs_per_100g:                n['carbohydrates_100g'] ?? null,
    fat_per_100g:                  n['fat_100g']           ?? null,
    fiber_per_100g:                n['fiber_100g']         ?? null,
    sugar_per_100g:                n['sugars_100g']        ?? null,
    saturated_fat_per_100g:        n['saturated-fat_100g'] ?? null,
    polyunsaturated_fat_per_100g:  n['polyunsaturated-fat_100g'] ?? null,
    monounsaturated_fat_per_100g:  n['monounsaturated-fat_100g'] ?? null,
    sodium_mg_per_100g:            mg(n['sodium_100g']),
    potassium_mg_per_100g:         mg(n['potassium_100g']),
    calcium_mg_per_100g:           mg(n['calcium_100g']),
    iron_mg_per_100g:              mg(n['iron_100g']),
    magnesium_mg_per_100g:         mg(n['magnesium_100g']),
    phosphorus_mg_per_100g:        null,
    zinc_mg_per_100g:              null,
    vitamin_a_mcg_per_100g:        mcg(n['vitamin-a_100g']),
    vitamin_c_mg_per_100g:         n['vitamin-c_100g'] ?? null,
    vitamin_d_mcg_per_100g:        null,
    vitamin_b12_mcg_per_100g:      mcg(n['vitamin-b12_100g']),
    folate_mcg_per_100g:           null,
    cholesterol_mg_per_100g:       mg(n['cholesterol_100g']),
    barcode:                       p.code?.trim() || null,
    source:                        'open_food_facts',
    source_id:                     p.code?.trim() || null,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(page, pageSize, country) {
  const fields = 'code,product_name,brands,nutriments';
  const url = country === 'world'
    ? `https://world.openfoodfacts.org/cgi/search.pl?` +
        `action=process&tagtype_0=countries&tag_contains_0=contains&tag_0=philippines` +
        `&json=1&page_size=${pageSize}&page=${page}&fields=${fields}`
    : `https://ph.openfoodfacts.org/cgi/search.pl?` +
        `action=process&json=1&page_size=${pageSize}&page=${page}&fields=${fields}`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 429) { await sleep(attempt * 10_000); continue; }
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      if (attempt === 3) throw err;
      await sleep(attempt * 3_000);
    }
  }
}

async function upsertBatch(rows) {
  // Split into chunks of 200 — PostgREST has a request size limit
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await supabase
      .from('food_items')
      .upsert(chunk, { onConflict: 'barcode', ignoreDuplicates: true });
    if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function importCountry(label) {
  const PAGE_SIZE = 200;
  let page        = 1;
  let total       = 0;
  let totalPages  = null;

  console.log(`\n── ${label} ─────────────────────────────────────`);

  while (true) {
    const suffix = totalPages ? `/${totalPages}` : '';
    process.stdout.write(`  Page ${String(page).padStart(3, ' ')}${suffix}: fetching...`);

    let json;
    try {
      json = await fetchPage(page, PAGE_SIZE, label === 'World (PH-tagged)' ? 'world' : 'ph');
    } catch (err) {
      console.error(`\n  ERROR on page ${page}: ${err.message}`);
      break;
    }

    if (totalPages === null && json.count) {
      totalPages = Math.ceil(json.count / PAGE_SIZE);
    }

    const products = (json.products ?? []).filter(
      (p) => p.product_name?.trim() && p.code?.trim()
    );

    if (products.length === 0) {
      process.stdout.write(' no more products.\n');
      break;
    }

    const rows = products.map(mapProduct).filter((r) => r.name);
    if (rows.length > 0) await upsertBatch(rows);
    total += rows.length;

    process.stdout.write(` ${String(rows.length).padStart(3)} valid (total: ${total})\n`);

    if ((json.products ?? []).length < PAGE_SIZE) break;

    page++;
    await sleep(500); // Be polite to OFF servers
  }

  return total;
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  Open Food Facts — Philippines bulk import   ║');
  console.log('╚══════════════════════════════════════════════╝');

  // Pass 1: ph.openfoodfacts.org — PH-specific endpoint (faster, more relevant)
  const phTotal = await importCountry('ph.openfoodfacts.org');

  // Pass 2: world endpoint filtered to PH country tag — catches products
  // that are sold in PH but not in the PH-specific database
  const worldTotal = await importCountry('World (PH-tagged)');

  console.log(`\n✓ Done.`);
  console.log(`  ph.openfoodfacts.org : ${phTotal} foods`);
  console.log(`  world (PH-tagged)    : ${worldTotal} foods`);
  console.log(`  Total                : ${phTotal + worldTotal} upserted\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
