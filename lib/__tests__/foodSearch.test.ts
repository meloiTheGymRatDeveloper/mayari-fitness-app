jest.mock('../supabase', () => ({ supabase: {} }));
import { mapFDCFood, mapOFFProduct } from '../foodSearch';

describe('mapFDCFood', () => {
  const baseFDCFood = {
    fdcId: 171665,
    description: 'Chicken, broiler, breast, skinless, boneless, raw',
    dataType: 'Foundation',
    foodNutrients: [
      { nutrientId: 1008, nutrientName: 'Energy', unitName: 'kcal', value: 120 },
      { nutrientId: 1003, nutrientName: 'Protein', unitName: 'g', value: 23.1 },
      { nutrientId: 1005, nutrientName: 'Carbohydrate', unitName: 'g', value: 0 },
      { nutrientId: 1004, nutrientName: 'Total lipid (fat)', unitName: 'g', value: 1.2 },
      { nutrientId: 1093, nutrientName: 'Sodium', unitName: 'mg', value: 74 },
      { nutrientId: 1092, nutrientName: 'Potassium', unitName: 'mg', value: 370 },
    ],
  };

  it('maps energy, protein, carbs, fat', () => {
    const r = mapFDCFood(baseFDCFood);
    expect(r.calories_per_100g).toBe(120);
    expect(r.protein_per_100g).toBe(23.1);
    expect(r.carbs_per_100g).toBe(0);
    expect(r.fat_per_100g).toBe(1.2);
  });

  it('maps sodium and potassium (mg stays mg — no conversion)', () => {
    const r = mapFDCFood(baseFDCFood);
    expect(r.sodium_mg_per_100g).toBe(74);
    expect(r.potassium_mg_per_100g).toBe(370);
  });

  it('sets source to usda and source_id to fdcId string', () => {
    const r = mapFDCFood(baseFDCFood);
    expect(r.source).toBe('usda');
    expect(r.source_id).toBe('171665');
  });

  it('returns null for missing nutrients', () => {
    const r = mapFDCFood({ fdcId: 99, description: 'Unknown', dataType: 'SR Legacy', foodNutrients: [] });
    expect(r.calories_per_100g).toBeNull();
    expect(r.fiber_per_100g).toBeNull();
  });

  it('sets is_ph_local false and brand null when no brandName', () => {
    const r = mapFDCFood(baseFDCFood);
    expect(r.is_ph_local).toBe(false);
    expect(r.brand).toBeNull();
  });
});

describe('mapOFFProduct', () => {
  it('converts sodium from g to mg', () => {
    const r = mapOFFProduct({ code: '123', product_name: 'Test', nutriments: { sodium_100g: 0.5 } });
    expect(r.sodium_mg_per_100g).toBe(500);
  });

  it('converts calcium from g to mg', () => {
    const r = mapOFFProduct({ code: '123', product_name: 'Test', nutriments: { calcium_100g: 0.1 } });
    expect(r.calcium_mg_per_100g).toBe(100);
  });

  it('sets source to open_food_facts and is_ph_local false', () => {
    const r = mapOFFProduct({ code: '456', product_name: 'Test', nutriments: {} });
    expect(r.source).toBe('open_food_facts');
    expect(r.is_ph_local).toBe(false);
  });

  it('returns null sodium when sodium_100g absent', () => {
    const r = mapOFFProduct({ code: '789', product_name: 'Test', nutriments: {} });
    expect(r.sodium_mg_per_100g).toBeNull();
  });

  it('sets source_id to barcode code', () => {
    const r = mapOFFProduct({ code: 'ABC123', product_name: 'Test', nutriments: {} });
    expect(r.source_id).toBe('ABC123');
  });
});
