import { supabase } from './supabase';
import type { FoodItem } from '../types/database';

// ── Open Food Facts types ──────────────────────────────────────────────────

interface OFFNutriments {
  'energy-kcal_100g'?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  fiber_100g?: number;
  sugars_100g?: number;
  'saturated-fat_100g'?: number;
  'polyunsaturated-fat_100g'?: number;
  'monounsaturated-fat_100g'?: number;
  sodium_100g?: number;
  potassium_100g?: number;
  calcium_100g?: number;
  iron_100g?: number;
  magnesium_100g?: number;
  'vitamin-c_100g'?: number;
  'vitamin-a_100g'?: number;
  'vitamin-b12_100g'?: number;
  cholesterol_100g?: number;
}

interface OFFProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  nutriments?: OFFNutriments;
}

interface OFFSearchResponse {
  products?: OFFProduct[];
}

interface OFFProductResponse {
  status: number;
  product?: OFFProduct;
}

// ── USDA FoodData Central types ────────────────────────────────────────────

interface FDCNutrient {
  nutrientId: number;
  nutrientName: string;
  unitName: string;
  value: number;
}

export interface FDCFood {
  fdcId: number;
  description: string;
  brandName?: string;
  dataType: string;
  foodNutrients: FDCNutrient[];
}

interface FDCSearchResponse {
  foods: FDCFood[];
}

const FDC_IDS = {
  ENERGY: 1008, PROTEIN: 1003, CARBS: 1005, FAT: 1004,
  FIBER: 1079, SUGAR: 2000, SAT_FAT: 1258,
  POLY_FAT: 1257, MONO_FAT: 1292,
  SODIUM: 1093, POTASSIUM: 1092, CALCIUM: 1087,
  IRON: 1089, MAGNESIUM: 1090, PHOSPHORUS: 1091, ZINC: 1095,
  VITAMIN_A: 1106, VITAMIN_C: 1162, VITAMIN_D: 1114,
  VITAMIN_B12: 1178, FOLATE: 1177, CHOLESTEROL: 1253,
} as const;

// ── Mapper functions (exported for unit tests) ─────────────────────────────

export function mapOFFProduct(p: OFFProduct): Omit<FoodItem, 'id' | 'created_at' | 'updated_at'> {
  const n = p.nutriments ?? {};
  const mg = (g: number | undefined) => (g != null ? g * 1000 : null);
  const mcg = (g: number | undefined) => (g != null ? g * 1000 : null);
  return {
    name: p.product_name?.trim() ?? 'Unknown',
    name_fil: null,
    brand: p.brands?.split(',')[0]?.trim() ?? null,
    is_ph_local: false,
    calories_per_100g: n['energy-kcal_100g'] ?? null,
    protein_per_100g: n.proteins_100g ?? null,
    carbs_per_100g: n.carbohydrates_100g ?? null,
    fat_per_100g: n.fat_100g ?? null,
    fiber_per_100g: n.fiber_100g ?? null,
    sugar_per_100g: n.sugars_100g ?? null,
    saturated_fat_per_100g: n['saturated-fat_100g'] ?? null,
    polyunsaturated_fat_per_100g: n['polyunsaturated-fat_100g'] ?? null,
    monounsaturated_fat_per_100g: n['monounsaturated-fat_100g'] ?? null,
    sodium_mg_per_100g: mg(n.sodium_100g),
    potassium_mg_per_100g: mg(n.potassium_100g),
    calcium_mg_per_100g: mg(n.calcium_100g),
    iron_mg_per_100g: mg(n.iron_100g),
    magnesium_mg_per_100g: mg(n.magnesium_100g),
    phosphorus_mg_per_100g: null,
    zinc_mg_per_100g: null,
    vitamin_a_mcg_per_100g: mcg(n['vitamin-a_100g']),
    vitamin_c_mg_per_100g: n['vitamin-c_100g'] ?? null,
    vitamin_d_mcg_per_100g: null,
    vitamin_b12_mcg_per_100g: mcg(n['vitamin-b12_100g']),
    folate_mcg_per_100g: null,
    cholesterol_mg_per_100g: mg(n.cholesterol_100g),
    barcode: p.code ?? null,
    source: 'open_food_facts' as const,
    source_id: p.code ?? null,
  };
}

export function mapFDCFood(food: FDCFood): Omit<FoodItem, 'id' | 'created_at' | 'updated_at'> {
  const n: Record<number, number> = {};
  for (const nutrient of food.foodNutrients) {
    n[nutrient.nutrientId] = nutrient.value;
  }
  const get = (id: number) => n[id] ?? null;
  return {
    name: food.description.trim(),
    name_fil: null,
    brand: food.brandName?.trim() ?? null,
    is_ph_local: false,
    calories_per_100g: get(FDC_IDS.ENERGY),
    protein_per_100g: get(FDC_IDS.PROTEIN),
    carbs_per_100g: get(FDC_IDS.CARBS),
    fat_per_100g: get(FDC_IDS.FAT),
    fiber_per_100g: get(FDC_IDS.FIBER),
    sugar_per_100g: get(FDC_IDS.SUGAR),
    saturated_fat_per_100g: get(FDC_IDS.SAT_FAT),
    polyunsaturated_fat_per_100g: get(FDC_IDS.POLY_FAT),
    monounsaturated_fat_per_100g: get(FDC_IDS.MONO_FAT),
    sodium_mg_per_100g: get(FDC_IDS.SODIUM),
    potassium_mg_per_100g: get(FDC_IDS.POTASSIUM),
    calcium_mg_per_100g: get(FDC_IDS.CALCIUM),
    iron_mg_per_100g: get(FDC_IDS.IRON),
    magnesium_mg_per_100g: get(FDC_IDS.MAGNESIUM),
    phosphorus_mg_per_100g: get(FDC_IDS.PHOSPHORUS),
    zinc_mg_per_100g: get(FDC_IDS.ZINC),
    vitamin_a_mcg_per_100g: get(FDC_IDS.VITAMIN_A),
    vitamin_c_mg_per_100g: get(FDC_IDS.VITAMIN_C),
    vitamin_d_mcg_per_100g: get(FDC_IDS.VITAMIN_D),
    vitamin_b12_mcg_per_100g: get(FDC_IDS.VITAMIN_B12),
    folate_mcg_per_100g: get(FDC_IDS.FOLATE),
    cholesterol_mg_per_100g: get(FDC_IDS.CHOLESTEROL),
    barcode: null,
    source: 'usda' as const,
    source_id: String(food.fdcId),
  };
}

// ── Cache helpers ──────────────────────────────────────────────────────────

async function cacheOFFProducts(products: OFFProduct[]): Promise<FoodItem[]> {
  const rows = products
    .filter(p => p.product_name?.trim() && p.code?.trim())
    .map(mapOFFProduct);
  if (rows.length === 0) return [];
  const { data } = await supabase
    .from('food_items')
    .upsert(rows, { onConflict: 'barcode', ignoreDuplicates: false })
    .select();
  return (data ?? []) as FoodItem[];
}

async function cacheUSDAFoods(foods: FDCFood[]): Promise<FoodItem[]> {
  const rows = foods.map(mapFDCFood);
  if (rows.length === 0) return [];
  const { data } = await supabase
    .from('food_items')
    .upsert(rows, { onConflict: 'source,source_id', ignoreDuplicates: true })
    .select();
  return (data ?? []) as FoodItem[];
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function searchFoods(query: string): Promise<FoodItem[]> {
  if (!query.trim()) return [];

  // 1. DB via trigram RPC — searches English + Filipino names, PH results first
  const { data: dbData } = await supabase.rpc('search_foods', { q: query, lim: 20 });
  const dbResults = (dbData ?? []) as FoodItem[];

  if (dbResults.length >= 15) return dbResults;

  // 2. USDA FoodData Central — raw ingredients with full micronutrient profiles
  const usdaResults = await searchUSDA(query);

  // 3. Open Food Facts — branded/packaged products (PH endpoint first)
  const offResults = await searchOFF(query);

  return [...dbResults, ...usdaResults, ...offResults];
}

async function searchUSDA(query: string): Promise<FoodItem[]> {
  const key = process.env.EXPO_PUBLIC_FDC_API_KEY ?? 'DEMO_KEY';
  const params = new URLSearchParams({
    query,
    api_key: key,
    dataType: 'Foundation,SR Legacy',
    pageSize: '8',
  });
  try {
    const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?${params}`);
    if (!res.ok) return [];
    const json: FDCSearchResponse = await res.json();
    return cacheUSDAFoods(json.foods ?? []);
  } catch {
    return [];
  }
}

async function searchOFF(query: string): Promise<FoodItem[]> {
  const fields = 'code,product_name,brands,nutriments';
  const pageSize = '8';
  try {
    // PH-specific endpoint first for local branded products
    const phUrl = `https://ph.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=${pageSize}&fields=${fields}`;
    const phRes = await fetch(phUrl);
    let products: OFFProduct[] = [];

    if (phRes.ok) {
      const phJson: OFFSearchResponse = await phRes.json();
      products = (phJson.products ?? []).filter(p => p.product_name?.trim() && p.code?.trim());
    }

    // Supplement with world endpoint if not enough PH results
    if (products.length < 4) {
      const worldUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=${pageSize}&fields=${fields}`;
      const worldRes = await fetch(worldUrl);
      if (worldRes.ok) {
        const worldJson: OFFSearchResponse = await worldRes.json();
        const worldProducts = (worldJson.products ?? []).filter(p => p.product_name?.trim() && p.code?.trim());
        const existingCodes = new Set(products.map(p => p.code));
        products = [...products, ...worldProducts.filter(p => !existingCodes.has(p.code))];
      }
    }

    return cacheOFFProducts(products);
  } catch {
    return [];
  }
}

async function getFoodByUSDABarcode(barcode: string): Promise<FoodItem | null> {
  const key = process.env.EXPO_PUBLIC_FDC_API_KEY ?? 'DEMO_KEY';
  const params = new URLSearchParams({
    query: barcode,
    api_key: key,
    dataType: 'Branded',
    pageSize: '5',
  });
  try {
    const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?${params}`);
    if (!res.ok) return null;
    const json: FDCSearchResponse = await res.json();
    const match = (json.foods ?? []).find(f => f.dataType === 'Branded');
    if (!match) return null;
    const rows = await cacheUSDAFoods([match]);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function getFoodByUPCItemDB(barcode: string): Promise<FoodItem | null> {
  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
    if (!res.ok) return null;
    const json = await res.json() as {
      code: string;
      items?: Array<{
        title?: string;
        brand?: string;
        nutrition?: {
          energy?: number;
          proteins?: number;
          carbohydrates?: number;
          fat?: number;
          fiber?: number;
          sugars?: number;
        };
      }>;
    };
    const item = json.items?.[0];
    if (!item?.title) return null;
    const n = item.nutrition ?? {};
    const row: Omit<FoodItem, 'id' | 'created_at' | 'updated_at'> = {
      name: item.title,
      name_fil: null,
      brand: item.brand ?? null,
      is_ph_local: false,
      calories_per_100g: n.energy ?? null,
      protein_per_100g: n.proteins ?? null,
      carbs_per_100g: n.carbohydrates ?? null,
      fat_per_100g: n.fat ?? null,
      fiber_per_100g: n.fiber ?? null,
      sugar_per_100g: n.sugars ?? null,
      saturated_fat_per_100g: null,
      polyunsaturated_fat_per_100g: null,
      monounsaturated_fat_per_100g: null,
      sodium_mg_per_100g: null,
      potassium_mg_per_100g: null,
      calcium_mg_per_100g: null,
      iron_mg_per_100g: null,
      magnesium_mg_per_100g: null,
      phosphorus_mg_per_100g: null,
      zinc_mg_per_100g: null,
      vitamin_a_mcg_per_100g: null,
      vitamin_c_mg_per_100g: null,
      vitamin_d_mcg_per_100g: null,
      vitamin_b12_mcg_per_100g: null,
      folate_mcg_per_100g: null,
      cholesterol_mg_per_100g: null,
      barcode,
      source: 'custom' as const,
      source_id: barcode,
    };
    const { data } = await supabase
      .from('food_items')
      .upsert(row, { onConflict: 'barcode', ignoreDuplicates: false })
      .select()
      .single();
    return data as FoodItem | null;
  } catch {
    return null;
  }
}

export async function getFoodByBarcode(barcode: string): Promise<FoodItem | null> {
  // 1. Supabase cache
  const { data: cached } = await supabase
    .from('food_items')
    .select('*')
    .eq('barcode', barcode)
    .maybeSingle();
  if (cached) return cached as FoodItem;

  // 2. Open Food Facts
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    if (res.ok) {
      const json: OFFProductResponse = await res.json();
      if (json.status === 1 && json.product?.product_name?.trim()) {
        const row = mapOFFProduct({ ...json.product, code: barcode });
        const { data } = await supabase
          .from('food_items')
          .upsert(row, { onConflict: 'barcode', ignoreDuplicates: false })
          .select()
          .single();
        if (data) return data as FoodItem;
      }
    }
  } catch { /* fall through */ }

  // 3. USDA Branded Foods
  const usdaResult = await getFoodByUSDABarcode(barcode);
  if (usdaResult) return usdaResult;

  // 4. UPC Item DB
  const upcResult = await getFoodByUPCItemDB(barcode);
  if (upcResult) return upcResult;

  return null;
}
