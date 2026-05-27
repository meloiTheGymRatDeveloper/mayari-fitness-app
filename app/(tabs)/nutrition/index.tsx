import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../stores/authStore';
import { useFoodLogs, useWaterLogs, useAddWater, useRemoveWater } from '../../../hooks/useNutrition';
import MacroSummaryCard from '../../../components/nutrition/MacroSummaryCard';
import MealSection from '../../../components/nutrition/MealSection';
import WaterBar from '../../../components/nutrition/WaterBar';
import { colors, typography, spacing } from '../../../constants/theme';
import { useLatestTipByType } from '../../../hooks/useCoachTips';
import Skeleton from '../../../components/ui/Skeleton';
import { useActiveFast } from '../../../hooks/useFasting';
import { useDeleteFoodLog } from '../../../hooks/useNutrition';
import { useTodayCaloriesBurned } from '../../../hooks/useWorkout';
import type { MealSlot } from '../../../types/database';
import { useMayariTriggers } from '../../../hooks/useMayariTriggers';

const MEAL_SLOTS: MealSlot[] = ['almusal', 'tanghalian', 'merienda', 'hapunan'];

const SLOT_HOURS: Record<MealSlot, number> = {
  almusal: 7,
  tanghalian: 12,
  merienda: 15,
  hapunan: 19,
};

function currentMealSlot(): MealSlot {
  const hour = new Date().getHours();
  if (hour < 10) return 'almusal';
  if (hour < 14) return 'tanghalian';
  if (hour < 18) return 'merienda';
  return 'hapunan';
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  const today = todayStr();
  if (dateStr === today) return 'Today';
  const yesterday = addDays(today, -1);
  if (dateStr === yesterday) return 'Yesterday';
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export default function NutritionScreen() {
  const router = useRouter();
  const profile = useAuthStore(s => s.profile);
  const [date, setDate] = useState(todayStr);
  const { data: activeFast = null } = useActiveFast();

  function isSlotOutsideWindow(slot: MealSlot): boolean {
    if (!activeFast?.eating_window_start || !activeFast?.eating_window_end) return false;
    const slotHour = SLOT_HOURS[slot];
    const windowStartHour = new Date(activeFast.eating_window_start).getHours();
    const windowEndHour = new Date(activeFast.eating_window_end).getHours();
    return slotHour < windowStartHour || slotHour >= windowEndHour;
  }

  function formatWindowTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  const { data: foodLogs = [], isLoading: logsLoading, isError: logsError, refetch: refetchLogs } = useFoodLogs(date);
  const { data: waterLogs = [], isLoading: waterLoading } = useWaterLogs(date);
  const addWater = useAddWater();
  const removeWater = useRemoveWater();
  const deleteLog = useDeleteFoodLog();

  const nutritionTip = useLatestTipByType('nutrition');
  const { data: caloriesBurned = 0 } = useTodayCaloriesBurned(todayStr());
  const { fire } = useMayariTriggers();

  const mealStyle = profile?.meal_time_style ?? 'filipino';
  const isLoading = logsLoading || waterLoading;

  useEffect(() => {
    if (date !== todayStr()) return;
    if (foodLogs.length === 0) return;

    const calGoal = profile?.calorie_goal ?? 0;
    const protGoal = profile?.protein_goal_g ?? 0;
    const carbGoal = profile?.carbs_goal_g ?? 0;
    const fatGoal = profile?.fat_goal_g ?? 0;

    let totalCal = 0, totalProt = 0, totalCarb = 0, totalFat = 0;
    for (const log of foodLogs) {
      const item = (log as { food_item?: { calories_per_100g?: number | null; protein_per_100g?: number | null; carbs_per_100g?: number | null; fat_per_100g?: number | null } }).food_item;
      if (!item) continue;
      const q = log.quantity_g / 100;
      totalCal  += (item.calories_per_100g ?? 0) * q;
      totalProt += (item.protein_per_100g  ?? 0) * q;
      totalCarb += (item.carbs_per_100g    ?? 0) * q;
      totalFat  += (item.fat_per_100g      ?? 0) * q;
    }

    if (foodLogs.length === 1) {
      fire('first_food_log_today', {});
    }

    if (calGoal > 0 && totalCal >= calGoal * 0.95 && totalCal <= calGoal * 1.05) {
      fire('calorie_goal_hit', { calories: Math.round(totalCal), goal: calGoal });
    }

    const hour = new Date().getHours();
    if (calGoal > 0 && foodLogs.length >= 3 && hour >= 18 && totalCal < calGoal * 0.6) {
      fire('calorie_deficit_aggressive', { calories: Math.round(totalCal), goal: calGoal });
    }

    const goalsSet = calGoal > 0 && protGoal > 0 && carbGoal > 0 && fatGoal > 0;
    if (goalsSet) {
      const within = (actual: number, goal: number) => actual >= goal * 0.9 && actual <= goal * 1.1;
      if (within(totalCal, calGoal) && within(totalProt, protGoal) && within(totalCarb, carbGoal) && within(totalFat, fatGoal)) {
        fire('full_macro_day', {
          calories: Math.round(totalCal),
          protein_g: Math.round(totalProt),
          carbs_g: Math.round(totalCarb),
          fat_g: Math.round(totalFat),
        });
      }
    }
  }, [foodLogs, date, profile, fire]);

  return (
    <View style={styles.root}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Date header */}
      <View style={styles.dateRow}>
        <TouchableOpacity onPress={() => setDate(d => addDays(d, -1))} style={styles.arrow}>
          <Text style={styles.arrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.dateLabel}>{formatDate(date)}</Text>
        <TouchableOpacity
          onPress={() => setDate(d => addDays(d, 1))}
          style={styles.arrow}
          disabled={date === todayStr()}
        >
          <Text style={[styles.arrowText, date === todayStr() && styles.arrowDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Feature chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipRowContent}>
        <TouchableOpacity style={styles.chip} onPress={() => router.push('/(tabs)/nutrition/fasting')}>
          <Text style={styles.chipText}>⏱ Fasting</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Goals link */}
      <TouchableOpacity style={styles.goalsLink} onPress={() => router.push('/(tabs)/nutrition/goals')}>
        <Text style={styles.goalsLinkText}>Set Macro Goals →</Text>
      </TouchableOpacity>

      {isLoading ? (
        <>
          <Skeleton width={340} height={120} style={{ marginBottom: 8 }} />
          <Skeleton width={340} height={72} style={{ marginBottom: 8 }} />
          <Skeleton width={340} height={72} style={{ marginBottom: 8 }} />
          <Skeleton width={340} height={72} style={{ marginBottom: 8 }} />
          <Skeleton width={340} height={72} style={{ marginBottom: 8 }} />
        </>
      ) : (
        <>
          {logsError && (
            <View style={styles.errorBlock}>
              <Text style={styles.errorText}>Something went wrong</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => refetchLogs()}>
                <Text style={styles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeFast && activeFast.eating_window_start && activeFast.eating_window_end && (
            <View style={styles.fastingBanner}>
              <Text style={styles.fastingBannerText}>
                🌙 Fasting until {formatWindowTime(activeFast.eating_window_start)}.{' '}
                Eating window: {formatWindowTime(activeFast.eating_window_start)} – {formatWindowTime(activeFast.eating_window_end)}
              </Text>
            </View>
          )}

          <MacroSummaryCard logs={foodLogs} profile={profile} />

          {date === todayStr() && nutritionTip && (
            <View style={styles.tipBanner}>
              <Text style={styles.tipBannerText}>{nutritionTip.content}</Text>
            </View>
          )}

          {caloriesBurned > 0 && date === todayStr() && (
            <View style={styles.burnBanner}>
              <Text style={styles.burnBannerText}>🔥 Workout burn: -{caloriesBurned} kcal today</Text>
            </View>
          )}

          {MEAL_SLOTS.map(slot => {
            const outside = activeFast ? isSlotOutsideWindow(slot) : false;
            return (
              <View key={slot} style={outside ? styles.dimmed : undefined}>
                <MealSection
                  slot={slot}
                  logs={foodLogs.filter(l => l.meal_slot === slot)}
                  style={mealStyle}
                  date={date}
                  onDeleteLog={(logId) => deleteLog.mutate({ logId, date })}
                  disabled={outside}
                />
              </View>
            );
          })}

          <WaterBar
            logs={waterLogs}
            onAdd={() => addWater.mutate(date)}
            onRemove={(lastId) => removeWater.mutate({ date, lastId })}
          />
        </>
      )}
    </ScrollView>
    <TouchableOpacity
      style={styles.fab}
      onPress={() => router.push({
        pathname: '/(tabs)/nutrition/voice' as never,
        params: { meal_slot: currentMealSlot(), date },
      })}
    >
      <Text style={styles.fabIcon}>🎤</Text>
    </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { backgroundColor: colors.bg.primary },
  container: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg, marginBottom: spacing.sm },
  arrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  arrowText: { color: colors.brand.primary, fontSize: typography['2xl'], fontWeight: '700' },
  arrowDisabled: { color: colors.text.muted },
  dateLabel: { color: colors.text.primary, fontSize: typography.xl, fontWeight: '700', minWidth: 120, textAlign: 'center' },
  goalsLink: { alignItems: 'flex-end', marginBottom: spacing.md },
  goalsLinkText: { color: colors.brand.primary, fontSize: typography.sm },
  chipRow: { marginBottom: spacing.sm },
  chipRowContent: { paddingRight: spacing.md, gap: spacing.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: colors.text.secondary, fontSize: typography.sm, fontWeight: '600' },
  tipBanner: {
    backgroundColor: '#6366F120',
    borderWidth: 1,
    borderColor: colors.brand.primary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  tipBannerText: { color: colors.brand.secondary, fontSize: typography.sm },
  fastingBanner: {
    backgroundColor: '#6366F120',
    borderWidth: 1,
    borderColor: colors.brand.primary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  fastingBannerText: { color: colors.brand.secondary, fontSize: typography.sm },
  burnBanner: {
    backgroundColor: '#F59E0B20',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  burnBannerText: { color: '#F59E0B', fontSize: typography.sm, fontWeight: '600' },
  dimmed: { opacity: 0.4 },
  errorBlock: { alignItems: 'center', paddingVertical: spacing.xl },
  errorText: { color: colors.text.secondary, fontSize: typography.base, marginBottom: spacing.md },
  retryBtn: { backgroundColor: colors.brand.primary, borderRadius: 12, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  retryBtnText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: { fontSize: 24 },
});
