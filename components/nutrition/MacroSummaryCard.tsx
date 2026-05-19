import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing } from '../../constants/theme';
import type { FoodLogWithItem, UserProfile } from '../../types/database';
import { calculateNetCarbs } from '../../lib/nutrition';

function scale(value: number | null, quantity_g: number): number {
  if (value == null) return 0;
  return (value * quantity_g) / 100;
}

function calcTotals(logs: FoodLogWithItem[]) {
  let cal = 0, protein = 0, carbs = 0, fat = 0, fiber = 0, sugar = 0;
  let sodium = 0, calcium = 0, iron = 0, potassium = 0, vitC = 0, vitB12 = 0;
  for (const log of logs) {
    const f = log.food_item;
    const q = log.quantity_g;
    cal += scale(f.calories_per_100g, q);
    protein += scale(f.protein_per_100g, q);
    carbs += scale(f.carbs_per_100g, q);
    fat += scale(f.fat_per_100g, q);
    fiber += scale(f.fiber_per_100g, q);
    sugar += scale(f.sugar_per_100g, q);
    sodium += scale(f.sodium_mg_per_100g, q);
    calcium += scale(f.calcium_mg_per_100g, q);
    iron += scale(f.iron_mg_per_100g, q);
    potassium += scale(f.potassium_mg_per_100g, q);
    vitC += scale(f.vitamin_c_mg_per_100g, q);
    vitB12 += scale(f.vitamin_b12_mcg_per_100g, q);
  }
  return { cal, protein, carbs, fat, fiber, sugar, sodium, calcium, iron, potassium, vitC, vitB12 };
}

function getGoals(profile: UserProfile | null) {
  if (!profile) return { calories: 2000, protein: 120, carbs: 250, fat: 65 };
  if (profile.calorie_goal) {
    return {
      calories: profile.calorie_goal,
      protein: profile.protein_goal_g ?? 120,
      carbs: profile.carbs_goal_g ?? 250,
      fat: profile.fat_goal_g ?? 65,
    };
  }
  const age = profile.birthdate
    ? Math.floor((Date.now() - new Date(profile.birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 25;
  const weight = profile.body_weight_kg ?? 70;
  const height = profile.height_cm ?? 170;
  const bmr = 10 * weight + 6.25 * height - 5 * age;
  const days = profile.workout_days?.length ?? 3;
  const activity = days <= 1 ? 1.2 : days <= 3 ? 1.375 : days <= 5 ? 1.55 : 1.725;
  const tdee = Math.round(bmr * activity);
  const calories = profile.primary_goal === 'lose_fat' ? tdee - 400 : profile.primary_goal === 'build_muscle' ? tdee + 250 : tdee;
  const protein = Math.round(weight * 1.8);
  const fat = Math.round(weight * 0.8);
  const carbs = Math.max(Math.round((calories - protein * 4 - fat * 9) / 4), 50);
  return { calories, protein, carbs, fat };
}

function ProgressBar({ value, max, color = colors.brand.primary }: { value: number; max: number; color?: string }) {
  const pct = Math.min(value / max, 1);
  return (
    <View style={pb.track}>
      <View style={[pb.fill, { width: `${pct * 100}%` as `${number}%`, backgroundColor: color }]} />
    </View>
  );
}

const pb = StyleSheet.create({
  track: { height: 6, backgroundColor: colors.bg.elevated, borderRadius: 3, overflow: 'hidden', flex: 1 },
  fill: { height: '100%', borderRadius: 3 },
});

interface Props {
  logs: FoodLogWithItem[];
  profile: UserProfile | null;
}

export default function MacroSummaryCard({ logs, profile }: Props) {
  const [tab, setTab] = useState<'macros' | 'nutrients'>('macros');
  const totals = calcTotals(logs);
  const goals = getGoals(profile);
  const remaining = Math.round(goals.calories - totals.cal);
  const isOver = remaining < 0;

  const hasNutrientData = logs.some(l =>
    l.food_item.sodium_mg_per_100g != null ||
    l.food_item.calcium_mg_per_100g != null ||
    l.food_item.iron_mg_per_100g != null
  );

  return (
    <View style={styles.card}>
      <View style={styles.tabRow}>
        {(['macros', 'nutrients'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'macros' ? 'Macros' : 'Nutrients'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'macros' && (
        <View>
          <Text style={[styles.calRemaining, { color: isOver ? colors.error : colors.success }]}>
            {Math.abs(remaining)} kcal {isOver ? 'over' : 'remaining'}
          </Text>

          {[
            { label: 'Protein', current: totals.protein, goal: goals.protein, color: '#6366F1', unit: 'g' },
            { label: 'Carbs', current: totals.carbs, goal: goals.carbs, color: '#F59E0B', unit: 'g' },
            { label: 'Fat', current: totals.fat, goal: goals.fat, color: '#EF4444', unit: 'g' },
          ].map(({ label, current, goal, color, unit }) => (
            <View key={label} style={styles.macroRow}>
              <Text style={styles.macroLabel}>{label}</Text>
              <ProgressBar value={current} max={goal} color={color} />
              <Text style={styles.macroMeta}>{Math.round(current)}/{goal}{unit}</Text>
            </View>
          ))}

          <View style={styles.subRow}>
            <Text style={styles.subText}>Fiber {Math.round(totals.fiber)}g</Text>
            <Text style={styles.subText}>·</Text>
            <Text style={styles.subText}>Sugar {Math.round(totals.sugar)}g</Text>
          </View>
          {profile?.net_carbs_display !== false && (
            <View style={styles.netCarbsRow}>
              <Text style={styles.subText}>Net Carbs</Text>
              <Text style={styles.netCarbsValue}>{Math.round(calculateNetCarbs(totals.carbs, totals.fiber))}g</Text>
            </View>
          )}
        </View>
      )}

      {tab === 'nutrients' && (
        <View>
          {totals.sodium > 1800 && (
            <View style={styles.warningChip}>
              <Text style={styles.warningText}>Mataas ang sodium mo ngayon ⚠️</Text>
            </View>
          )}

          {[
            { emoji: '🧂', label: 'Sodium', value: totals.sodium, goal: 2300, unit: 'mg', isLimit: true },
            { emoji: '🦴', label: 'Calcium', value: totals.calcium, goal: 1000, unit: 'mg' },
            { emoji: '🩸', label: 'Iron', value: totals.iron, goal: 18, unit: 'mg' },
            { emoji: '⚡', label: 'Potassium', value: totals.potassium, goal: 4700, unit: 'mg' },
            { emoji: '🍊', label: 'Vitamin C', value: totals.vitC, goal: 90, unit: 'mg' },
            { emoji: '💊', label: 'Vitamin B12', value: totals.vitB12, goal: 2.4, unit: 'mcg' },
          ].map(({ emoji, label, value, goal, unit, isLimit }) => {
            const pct = value / goal;
            const barColor = isLimit && pct > 0.8 ? colors.error : colors.brand.primary;
            return (
              <View key={label} style={styles.nutrientRow}>
                <Text style={styles.nutrientEmoji}>{emoji}</Text>
                <View style={styles.nutrientBody}>
                  <View style={styles.nutrientHeader}>
                    <Text style={styles.nutrientLabel}>{label}</Text>
                    <Text style={styles.nutrientValue}>
                      {value < 1 ? value.toFixed(1) : Math.round(value)}/{goal}{unit}
                    </Text>
                  </View>
                  <ProgressBar value={value} max={goal} color={barColor} />
                </View>
              </View>
            );
          })}

          {!hasNutrientData && (
            <Text style={styles.noDataNote}>Data only shown for foods with nutrient info.</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bg.secondary, borderRadius: 16, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  tabRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  tab: { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center', backgroundColor: colors.bg.elevated },
  tabActive: { backgroundColor: colors.brand.primary },
  tabText: { color: colors.text.secondary, fontSize: typography.sm, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  calRemaining: { fontSize: typography['2xl'], fontWeight: '700', textAlign: 'center', marginBottom: spacing.md },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  macroLabel: { color: colors.text.secondary, fontSize: typography.sm, width: 52 },
  macroMeta: { color: colors.text.muted, fontSize: typography.xs, width: 72, textAlign: 'right' },
  subRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  subText: { color: colors.text.muted, fontSize: typography.xs },
  netCarbsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  netCarbsValue: { color: colors.brand.primary, fontSize: typography.xs, fontWeight: '600' },
  nutrientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  nutrientEmoji: { fontSize: 18, width: 24 },
  nutrientBody: { flex: 1 },
  nutrientHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  nutrientLabel: { color: colors.text.secondary, fontSize: typography.xs },
  nutrientValue: { color: colors.text.muted, fontSize: typography.xs },
  warningChip: { backgroundColor: '#EF444420', borderRadius: 8, padding: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.error },
  warningText: { color: colors.error, fontSize: typography.xs, textAlign: 'center' },
  noDataNote: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center', marginTop: spacing.sm },
});
