import { supabase } from './supabase';
import type { FoodItem } from '../types/database';

interface OFFNutriments {
  'energy-kcal_100g'?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  fiber_100g?: number;
  sugars_100g?: number;
  'saturated-fat_100g'?: number;
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

function mapOFFProduct(p: OFFProduct): Omit<FoodItem, 'id' | 'created_at' | 'updated_at'> {
  const n = p.nutriments ?? {};
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
    polyunsaturated_fat_per_100g: null,
    monounsaturated_fat_per_100g: null,
    sodium_mg_per_100g: n.sodium_100g != null ? n.sodium_100g * 1000 : null,
    potassium_mg_per_100g: n.potassium_100g != null ? n.potassium_100g * 1000 : null,
    calcium_mg_per_100g: n.calcium_100g != null ? n.calcium_100g * 1000 : null,
    iron_mg_per_100g: n.iron_100g != null ? n.iron_100g * 1000 : null,
    magnesium_mg_per_100g: n.magnesium_100g != null ? n.magnesium_100g * 1000 : null,
    phosphorus_mg_per_100g: null,
    zinc_mg_per_100g: null,
    vitamin_a_mcg_per_100g: n['vitamin-a_100g'] != null ? n['vitamin-a_100g'] * 1000 : null,
    vitamin_c_mg_per_100g: n['vitamin-c_100g'] ?? null,
    vitamin_d_mcg_per_100g: null,
    vitamin_b12_mcg_per_100g: n['vitamin-b12_100g'] != null ? n['vitamin-b12_100g'] * 1000 : null,
    folate_mcg_per_100g: null,
    cholesterol_mg_per_100g: n.cholesterol_100g != null ? n.cholesterol_100g * 1000 : null,
    barcode: p.code ?? null,
    source: 'open_food_facts' as const,
  };
}

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

export async function searchFoods(query: string): Promise<FoodItem[]> {
  if (!query.trim()) return [];

  // 1. PH local foods first
  const { data: phData } = await supabase
    .from('food_items')
    .select('*')
    .ilike('name', `%${query}%`)
    .eq('is_ph_local', true)
    .limit(10);

  // 2. International cached foods
  const { data: intlData } = await supabase
    .from('food_items')
    .select('*')
    .ilike('name', `%${query}%`)
    .eq('is_ph_local', false)
    .limit(10);

  const local = (phData ?? []) as FoodItem[];
  const cached = (intlData ?? []) as FoodItem[];
  const combined = [...local, ...cached];

  if (combined.length >= 15) return combined;

  // 3. Open Food Facts fallback
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=10&fields=code,product_name,brands,nutriments`;
    const res = await fetch(url);
    if (!res.ok) return combined;
    const json: OFFSearchResponse = await res.json();
    const products = (json.products ?? []).filter(p => p.product_name?.trim() && p.code?.trim());
    const offResults = await cacheOFFProducts(products);
    return [...combined, ...offResults];
  } catch {
    return combined;
  }
}

export async function getFoodByBarcode(barcode: string): Promise<FoodItem | null> {
  // 1. Check local cache first
  const { data: cached } = await supabase
    .from('food_items')
    .select('*')
    .eq('barcode', barcode)
    .maybeSingle();

  if (cached) return cached as FoodItem;

  // 2. Fetch from Open Food Facts
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    if (!res.ok) return null;
    const json: OFFProductResponse = await res.json();
    if (json.status !== 1 || !json.product?.product_name?.trim()) return null;

    const row = { ...mapOFFProduct({ ...json.product, code: barcode }) };
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
