// Run from mayari/ directory:
//   $env:EXPO_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
//   npx tsx supabase/seed/exercises.ts

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

interface WgerMuscle { id: number; name_en: string; }
interface WgerEquipment { id: number; name: string; }
interface WgerCategory { id: number; name: string; }
interface WgerTranslation { language: number; name: string; description: string; }
interface WgerExercise {
  id: number;
  category: WgerCategory;
  muscles: WgerMuscle[];
  muscles_secondary: WgerMuscle[];
  equipment: WgerEquipment[];
  translations: WgerTranslation[];
}
interface WgerResponse { count: number; next: string | null; results: WgerExercise[]; }

const PUSH_MUSCLES = new Set([2, 3, 4, 13]);  // ant. deltoid, serratus, pec major, tricep
const PULL_MUSCLES = new Set([1, 8, 12, 14]);  // bicep, lat, trap, brachialis
const LEGS_MUSCLES = new Set([5, 6, 7, 10]);   // biceps femoris, gastro, glute, quad
const CORE_MUSCLES = new Set([9, 11]);          // oblique, rectus abdominis

function getMuscleGroup(categoryId: number, primaryIds: number[]): 'push' | 'pull' | 'legs' | 'core' {
  if (categoryId === 10) return 'core';                    // Abs
  if (categoryId === 9 || categoryId === 14) return 'legs'; // Legs / Calves
  if (categoryId === 11 || categoryId === 13) return 'push'; // Chest / Shoulders
  if (categoryId === 12) return 'pull';                    // Back
  if (primaryIds.some(id => PUSH_MUSCLES.has(id))) return 'push';
  if (primaryIds.some(id => PULL_MUSCLES.has(id))) return 'pull';
  if (primaryIds.some(id => LEGS_MUSCLES.has(id))) return 'legs';
  if (primaryIds.some(id => CORE_MUSCLES.has(id))) return 'core';
  return 'push';
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim();
}

async function fetchAll(): Promise<WgerExercise[]> {
  const all: WgerExercise[] = [];
  let url: string | null = 'https://wger.de/api/v2/exerciseinfo/?format=json&language=2&limit=100';
  while (url && all.length < 600) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Wger API ${res.status}: ${url}`);
    const data: WgerResponse = await res.json();
    all.push(...data.results);
    url = data.next;
  }
  return all;
}

async function main() {
  console.log('Fetching exercises from Wger API...');
  const wgerExercises = await fetchAll();
  console.log(`Fetched ${wgerExercises.length} exercises`);

  const rows = wgerExercises
    .map((ex) => {
      const enTrans = ex.translations.find(t => t.language === 2);
      if (!enTrans?.name?.trim()) return null;
      const primaryIds = ex.muscles.map(m => m.id);
      return {
        id: String(ex.id),
        name: enTrans.name.trim(),
        muscle_group: getMuscleGroup(ex.category.id, primaryIds),
        muscles_primary: ex.muscles.map(m => m.name_en),
        muscles_secondary: ex.muscles_secondary.map(m => m.name_en),
        equipment: ex.equipment.map(e => e.name),
        category: ex.category.name,
        description: stripHtml(enTrans.description),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  console.log(`Upserting ${rows.length} exercises...`);

  // Batch in chunks of 100 to avoid payload limits
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error } = await supabase.from('exercises').upsert(chunk, { onConflict: 'id' });
    if (error) { console.error('Upsert error:', error); process.exit(1); }
    console.log(`  Inserted ${Math.min(i + 100, rows.length)}/${rows.length}`);
  }

  console.log('Done! Exercises seeded successfully.');
}

main().catch(err => { console.error(err); process.exit(1); });
