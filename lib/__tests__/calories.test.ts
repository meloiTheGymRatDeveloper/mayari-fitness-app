import { computeBMR, computeAllTargets } from '../calories';

describe('computeBMR', () => {
  it('uses Katch-McArdle when body_fat_pct provided', () => {
    // LBM = 70 × (1 − 0.20) = 56 kg
    // BMR = 370 + 21.6 × 56 = 1579.6 → 1580
    expect(
      computeBMR({ weight_kg: 70, height_cm: 170, age_years: 25, gender: 'male', body_fat_pct: 20 })
    ).toBe(1580);
  });

  it('uses Mifflin-St Jeor for male without body_fat_pct', () => {
    // 10×70 + 6.25×170 − 5×25 + 5 = 700 + 1062.5 − 125 + 5 = 1642.5 → 1643
    expect(
      computeBMR({ weight_kg: 70, height_cm: 170, age_years: 25, gender: 'male', body_fat_pct: null })
    ).toBe(1643);
  });

  it('uses female formula for prefer_not_to_say', () => {
    // 10×60 + 6.25×165 − 5×28 − 161 = 600 + 1031.25 − 140 − 161 = 1330.25 → 1330
    expect(
      computeBMR({ weight_kg: 60, height_cm: 165, age_years: 28, gender: 'prefer_not_to_say', body_fat_pct: null })
    ).toBe(1330);
  });

  it('uses female formula for female', () => {
    expect(
      computeBMR({ weight_kg: 60, height_cm: 165, age_years: 28, gender: 'female', body_fat_pct: null })
    ).toBe(1330);
  });
});

describe('computeAllTargets', () => {
  const base = {
    body_weight_kg: 70,
    height_cm: 170,
    birthdate: '2000-01-01',
    gender: 'male' as const,
    body_fat_pct: null,
    activity_level: 'lightly_active',
    primary_goal: 'maintain',
  };

  it('TDEE = BMR × 1.375 for lightly_active', () => {
    const r = computeAllTargets(base);
    expect(r.tdee).toBe(Math.round(r.bmr * 1.375));
  });

  it('TDEE = BMR × 1.2 for sedentary', () => {
    const r = computeAllTargets({ ...base, activity_level: 'sedentary' });
    expect(r.tdee).toBe(Math.round(r.bmr * 1.2));
  });

  it('calorie_target = TDEE − 500 for lose_fat', () => {
    const r = computeAllTargets({ ...base, primary_goal: 'lose_fat' });
    const expected = Math.max(r.tdee - 500, r.bmr + 200);
    expect(r.calorie_target).toBe(expected);
  });

  it('calorie_target = TDEE + 250 for build_muscle', () => {
    const r = computeAllTargets({ ...base, primary_goal: 'build_muscle' });
    expect(r.calorie_target).toBe(r.tdee + 250);
  });

  it('calorie_target = TDEE − 100 for improve_fitness', () => {
    const r = computeAllTargets({ ...base, primary_goal: 'improve_fitness' });
    expect(r.calorie_target).toBe(r.tdee - 100);
  });

  it('calorie_target = TDEE for maintain', () => {
    const r = computeAllTargets(base);
    expect(r.calorie_target).toBe(r.tdee);
  });

  it('protein = 1.6 g/kg for build_muscle', () => {
    const r = computeAllTargets({ ...base, primary_goal: 'build_muscle' });
    expect(r.protein_g).toBe(Math.round(70 * 1.6));
  });

  it('protein = 1.6 g/kg for lose_fat', () => {
    const r = computeAllTargets({ ...base, primary_goal: 'lose_fat' });
    expect(r.protein_g).toBe(Math.round(70 * 1.6));
  });

  it('protein = 1.0 g/kg for sedentary maintain', () => {
    const r = computeAllTargets({ ...base, activity_level: 'sedentary', primary_goal: 'maintain' });
    expect(r.protein_g).toBe(Math.round(70 * 1.0));
  });

  it('fat = 25% of calorie_target / 9', () => {
    const r = computeAllTargets(base);
    expect(r.fat_g).toBe(Math.round(r.calorie_target * 0.25 / 9));
  });

  it('carbs fill remaining calories after protein and fat', () => {
    const r = computeAllTargets(base);
    const remaining = r.calorie_target - r.protein_g * 4 - r.fat_g * 9;
    expect(r.carbs_g).toBe(Math.max(Math.round(remaining / 4), 50));
  });
});
