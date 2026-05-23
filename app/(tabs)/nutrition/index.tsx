import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../stores/authStore';
import { useFoodLogs, useWaterLogs, useAddWater, useRemoveWater } from '../../../hooks/useNutrition';
import MacroSummaryCard from '../../../components/nutrition/MacroSummaryCard';
import MealSection from '../../../components/nutrition/MealSection';
import WaterBar from '../../../components/nutrition/WaterBar';
import { colors, typography, spacing } from '../../../constants/theme';
import { useLatestGroceryList } from '../../../hooks/useMealPlan';
import Skeleton from '../../../components/ui/Skeleton';
import { useActiveFast } from '../../../hooks/useFasting';
import { useDeleteFoodLog } from '../../../hooks/useNutrition';
import type { MealSlot } from '../../../types/database';

const MEAL_SLOTS: MealSlot[] = ['almusal', 'tanghalian', 'merienda', 'hapunan'];

const SLOT_HOURS: Record<MealSlot, number> = {
  almusal: 7,
  tanghalian: 12,
  merienda: 15,
  hapunan: 19,
};

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

  const { data: groceryList } = useLatestGroceryList();
  const groceryBadgeCount = (groceryList?.items ?? []).filter(i => !i.checked).length;

  const mealStyle = profile?.meal_time_style ?? 'filipino';
  const isLoading = logsLoading || waterLoading;

  return (
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
        <TouchableOpacity style={styles.chip} onPress={() => router.push('/(tabs)/nutrition/mealplan')}>
          <Text style={styles.chipText}>📅 Meal Plan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chip} onPress={() => router.push('/(tabs)/nutrition/grocery')}>
          <View style={styles.chipInner}>
            <Text style={styles.chipText}>🛒 Grocery</Text>
            {groceryBadgeCount > 0 && (
              <View style={styles.chipBadge}>
                <Text style={styles.chipBadgeText}>{groceryBadgeCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chip} onPress={() => router.push('/(tabs)/nutrition/mealbuilder')}>
          <Text style={styles.chipText}>🤖 Meal Builder</Text>
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
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
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
  fastingBanner: {
    backgroundColor: '#6366F120',
    borderWidth: 1,
    borderColor: colors.brand.primary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  fastingBannerText: { color: colors.brand.secondary, fontSize: typography.sm },
  dimmed: { opacity: 0.4 },
  chipInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipBadge: {
    backgroundColor: colors.brand.primary, borderRadius: 10,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chipBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  errorBlock: { alignItems: 'center', paddingVertical: spacing.xl },
  errorText: { color: colors.text.secondary, fontSize: typography.base, marginBottom: spacing.md },
  retryBtn: { backgroundColor: colors.brand.primary, borderRadius: 12, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  retryBtnText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
});
