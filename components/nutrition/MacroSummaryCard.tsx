import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import {
  useSharedValue, useAnimatedProps, withTiming, createAnimatedComponent,
} from 'react-native-reanimated';
import { colors, typography, spacing, fonts } from '../../constants/theme';
import type { FoodLogWithItem, UserProfile } from '../../types/database';
import { calculateNetCarbs } from '../../lib/nutrition';

const AnimatedCircle = createAnimatedComponent(Circle);
const R = 32;
const STROKE = 7;
const SIZE = (R + STROKE) * 2;
const CIRC = 2 * Math.PI * R;

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

function MacroRow({ label, current, goal, color }: { label: string; current: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.min(current / goal, 1) : 0;
  return (
    <View style={mr.row}>
      <View style={mr.header}>
        <Text style={mr.label}>{label}</Text>
        <Text style={[mr.value, { color }]}>{Math.round(current)}/{goal}g</Text>
      </View>
      <View style={mr.track}>
        <View style={[mr.fill, { width: `${pct * 100}%` as `${number}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const mr = StyleSheet.create({
  row: { marginBottom: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  label: { color: colors.text.muted, fontSize: typography.xs },
  value: { fontSize: typography.xs, fontFamily: fonts.semibold },
  track: { height: 5, backgroundColor: colors.bg.elevated, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});

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
  const progress = useSharedValue(0);
  const pct = goals.calories > 0 ? Math.min(totals.cal / goals.calories, 1) : 0;
  const remaining = Math.round(goals.calories - totals.cal);
  const isOver = remaining < 0;

  useEffect(() => {
    progress.value = withTiming(pct, { duration: 600 });
  }, [pct, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRC * (1 - progress.value),
  }));

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
        <View style={styles.macrosLayout}>
          {/* Arc ring — left */}
          <View style={styles.arcWrap}>
            <Svg width={SIZE} height={SIZE}>
              <Circle
                cx={SIZE / 2} cy={SIZE / 2} r={R}
                stroke={colors.bg.elevated}
                strokeWidth={STROKE}
                fill="none"
              />
              <AnimatedCircle
                cx={SIZE / 2} cy={SIZE / 2} r={R}
                stroke={colors.brand.gold}
                strokeWidth={STROKE}
                fill="none"
                strokeDasharray={CIRC}
                strokeLinecap="round"
                rotation={-90}
                origin={`${SIZE / 2}, ${SIZE / 2}`}
                animatedProps={animatedProps}
              />
            </Svg>
            <View style={styles.arcCenter}>
              <Text style={[styles.arcKcal, { color: isOver ? colors.error : colors.success }]}>
                {Math.abs(remaining)}
              </Text>
              <Text style={styles.arcLabel}>{isOver ? 'over' : 'left'}</Text>
            </View>
          </View>

          {/* Macro bars — right */}
          <View style={styles.macroList}>
            <MacroRow label="Protein" current={totals.protein} goal={goals.protein} color={colors.brand.secondary} />
            <MacroRow label="Carbs" current={totals.carbs} goal={goals.carbs} color={colors.brand.primary} />
            <MacroRow label="Fat" current={totals.fat} goal={goals.fat} color={colors.brand.gold} />
            {profile?.net_carbs_display !== false && (
              <Text style={styles.netCarbs}>
                Net Carbs: {Math.round(calculateNetCarbs(totals.carbs, totals.fiber))}g
              </Text>
            )}
          </View>
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
            const pct2 = value / goal;
            const barColor = isLimit && pct2 > 0.8 ? colors.error : colors.brand.primary;
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
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  tab: { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center', backgroundColor: colors.bg.elevated },
  tabActive: { backgroundColor: colors.brand.primary },
  tabText: { color: colors.text.secondary, fontSize: typography.sm, fontFamily: fonts.medium },
  tabTextActive: { color: colors.white, fontFamily: fonts.bold },
  macrosLayout: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  arcWrap: { alignItems: 'center', justifyContent: 'center' },
  arcCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  arcKcal: { fontSize: typography.lg, fontFamily: fonts.bold },
  arcLabel: { color: colors.text.muted, fontSize: 9 },
  macroList: { flex: 1 },
  netCarbs: { color: colors.brand.primary, fontSize: typography.xs, fontFamily: fonts.semibold, marginTop: 4 },
  nutrientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  nutrientEmoji: { fontSize: 18, width: 24 },
  nutrientBody: { flex: 1 },
  nutrientHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  nutrientLabel: { color: colors.text.secondary, fontSize: typography.xs },
  nutrientValue: { color: colors.text.muted, fontSize: typography.xs },
  warningChip: {
    backgroundColor: '#EF444420',
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error,
  },
  warningText: { color: colors.error, fontSize: typography.xs, textAlign: 'center' },
  noDataNote: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center', marginTop: spacing.sm },
});
