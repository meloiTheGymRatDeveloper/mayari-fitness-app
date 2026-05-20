import type { Gender } from '../types/database';

export interface CalorieTargets {
  bmr: number;
  tdee: number;
  calorie_target: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

const PAL: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
};

export function computeBMR(params: {
  weight_kg: number;
  height_cm: number;
  age_years: number;
  gender: Gender;
  body_fat_pct: number | null | undefined;
}): number {
  const { weight_kg, height_cm, age_years, gender, body_fat_pct } = params;

  if (body_fat_pct != null) {
    const lbm = weight_kg * (1 - body_fat_pct / 100);
    return Math.round(370 + 21.6 * lbm);
  }

  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age_years;
  return Math.round(gender === 'male' ? base + 5 : base - 161);
}

export function computeAgeYears(birthdate: string): number {
  return Math.floor(
    (Date.now() - new Date(birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
  );
}

export function computeAllTargets(profile: {
  body_weight_kg: number;
  height_cm: number;
  birthdate: string;
  gender: Gender;
  body_fat_pct: number | null | undefined;
  activity_level: string;
  primary_goal: string;
}): CalorieTargets {
  const age = computeAgeYears(profile.birthdate);
  const bmr = computeBMR({
    weight_kg: profile.body_weight_kg,
    height_cm: profile.height_cm,
    age_years: age,
    gender: profile.gender,
    body_fat_pct: profile.body_fat_pct,
  });

  const pal = PAL[profile.activity_level] ?? 1.375;
  const tdee = Math.round(bmr * pal);

  let calorie_target: number;
  if (profile.primary_goal === 'lose_fat') {
    calorie_target = Math.max(tdee - 500, bmr + 200);
  } else if (profile.primary_goal === 'build_muscle') {
    calorie_target = tdee + 250;
  } else if (profile.primary_goal === 'improve_fitness') {
    calorie_target = tdee - 100;
  } else {
    calorie_target = tdee;
  }

  const needsHighProtein =
    profile.primary_goal === 'build_muscle' ||
    profile.primary_goal === 'lose_fat' ||
    ['moderately_active', 'very_active', 'extremely_active'].includes(profile.activity_level);

  const protein_g = Math.round(profile.body_weight_kg * (needsHighProtein ? 1.6 : 1.0));
  const fat_g = Math.round((calorie_target * 0.25) / 9);
  const remaining = calorie_target - protein_g * 4 - fat_g * 9;
  const carbs_g = Math.max(Math.round(remaining / 4), 50);

  return { bmr, tdee, calorie_target, protein_g, carbs_g, fat_g };
}
