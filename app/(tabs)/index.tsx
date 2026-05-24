import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useDailyNutrition } from '../../hooks/useDailyNutrition';
import { useDailyTip } from '../../hooks/useCoach';
import { useLatestTip } from '../../hooks/useCoachTips';
import { useSmartCopy, useYesterdaySlotHasData } from '../../hooks/useSmartCopy';
import { useStreaks } from '../../hooks/useStreaks';
import DayStrip from '../../components/home/DayStrip';
import CaloriesCard from '../../components/home/CaloriesCard';
import MealSlotCard from '../../components/home/MealSlotCard';
import MicrosSection from '../../components/home/MicrosSection';
import StreakMilestoneToast from '../../components/shared/StreakMilestoneToast';
import { colors, typography, spacing } from '../../constants/theme';
import type { MealSlot } from '../../types/database';

const MEAL_SLOTS: MealSlot[] = ['almusal', 'tanghalian', 'merienda', 'hapunan'];
const MILESTONES = [3, 7, 14, 30, 60, 100];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function SlotRow({ slot, date, daily }: { slot: MealSlot; date: string; daily: ReturnType<typeof useDailyNutrition> }) {
  const openLogModal = useUIStore((s) => s.openLogModal);
  const smartCopy = useSmartCopy();
  const { data: hasYesterday = false } = useYesterdaySlotHasData(slot, date);
  const slotData = daily.slotTotals[slot];
  return (
    <MealSlotCard
      slot={slot}
      calories={slotData.calories}
      itemCount={slotData.itemCount}
      logs={slotData.logs}
      date={date}
      hasYesterdayData={hasYesterday}
      isCopying={smartCopy.isPending}
      onAdd={() => openLogModal(slot, date)}
      onSmartCopy={() => smartCopy.mutate({ slot, targetDate: date })}
    />
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const [date, setDate] = useState(todayStr);
  const daily = useDailyNutrition(date);
  const name = profile?.display_name ?? 'Ka-tropa';

  const { data: dailyTip, isLoading: tipLoading } = useDailyTip();
  const latestTip = useLatestTip();
  const { data: streaks } = useStreaks();
  const [activeMilestone, setActiveMilestone] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const current = streaks?.workout_current ?? 0;
    if (!MILESTONES.includes(current)) return;
    AsyncStorage.getItem('lastStreakMilestone').then((stored) => {
      if (cancelled) return;
      if (stored === String(current)) return;
      setActiveMilestone(current);
      AsyncStorage.setItem('lastStreakMilestone', String(current));
      setTimeout(() => { if (!cancelled) setActiveMilestone(null); }, 3700);
    });
    return () => { cancelled = true; };
  }, [streaks?.workout_current]);

  return (
    <View style={styles.screenWrapper}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.greetRow}>
          <View>
            <Text style={styles.greeting}>Kumusta, {name}! 💪</Text>
            <Text style={styles.dateText}>
              {new Date(date + 'T12:00:00Z').toLocaleDateString('en-PH', {
                weekday: 'long', month: 'long', day: 'numeric',
              })}
            </Text>
          </View>
          <TouchableOpacity style={styles.calBtn}>
            <Ionicons name="calendar-outline" size={22} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <DayStrip selectedDate={date} onSelectDate={setDate} />

        <View style={{ height: spacing.sm }} />

        {latestTip && (
          <View style={styles.tipCard}>
            <Text style={styles.tipCardLabel}>🌙 Mayari says</Text>
            <Text style={styles.tipCardContent}>{latestTip.content}</Text>
          </View>
        )}

        <CaloriesCard
          consumed={daily.totals.calories}
          goal={daily.calorieGoal}
          caloriesBurned={daily.caloriesBurned}
          protein={{ consumed: daily.totals.protein, goal: daily.proteinGoal }}
          carbs={{ consumed: daily.totals.carbs, goal: daily.carbsGoal }}
          fat={{ consumed: daily.totals.fat, goal: daily.fatGoal }}
          showNetCarbs={profile?.net_carbs_display}
          fiber={daily.totals.fiber}
        />

        <Text style={styles.sectionLabel}>Meals</Text>
        {MEAL_SLOTS.map((slot) => (
          <SlotRow key={slot} slot={slot} date={date} daily={daily} />
        ))}

        <MicrosSection
          vitaminC={daily.micros.vitaminC}
          iron={daily.micros.iron}
          calcium={daily.micros.calcium}
        />

        <TouchableOpacity
          style={styles.coachCard}
          onPress={() => router.push('/(tabs)/coach')}
          activeOpacity={0.8}
        >
          <Text style={styles.coachTitle}>🌙 Coach Mayari</Text>
          <Text style={styles.coachBody}>
            {tipLoading
              ? 'Loading today\'s tip...'
              : dailyTip ?? 'Ready to start? Tap Coach to generate your first workout plan!'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.plannerCard} onPress={() => router.push('/(tabs)/nutrition/mealplan' as never)} activeOpacity={0.8}>
          <View>
            <Text style={styles.plannerTitle}>📅 Meal Planner</Text>
            <Text style={styles.plannerSub}>Plan this week's meals</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.brand.primary} />
        </TouchableOpacity>
      </ScrollView>
      <StreakMilestoneToast milestone={activeMilestone} />
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { paddingBottom: spacing['2xl'] },
  greetRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: spacing.lg, marginBottom: spacing.md,
  },
  greeting: { color: colors.text.primary, fontSize: typography['2xl'], fontWeight: 'bold' },
  dateText: { color: colors.text.muted, fontSize: typography.sm, marginTop: spacing.xs },
  calBtn: {
    backgroundColor: colors.bg.secondary, borderRadius: 10,
    padding: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  tipCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  tipCardLabel: { color: colors.brand.secondary, fontSize: typography.sm, fontWeight: '600', marginBottom: 4 },
  tipCardContent: { color: colors.text.primary, fontSize: typography.base, lineHeight: 22 },
  sectionLabel: {
    color: colors.text.muted, fontSize: 10, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase',
    paddingHorizontal: spacing.lg, marginBottom: spacing.xs, marginTop: spacing.xs,
  },
  coachCard: {
    marginHorizontal: spacing.lg, marginTop: spacing.sm,
    backgroundColor: colors.bg.elevated, borderRadius: 14,
    padding: spacing.md, borderWidth: 1, borderColor: colors.brand.primary,
  },
  coachTitle: { color: colors.brand.secondary, fontSize: typography.sm, fontWeight: '600', marginBottom: spacing.xs },
  coachBody: { color: colors.text.secondary, fontSize: typography.sm, lineHeight: 20 },
  plannerCard: {
    marginHorizontal: spacing.lg, marginTop: spacing.sm,
    backgroundColor: colors.bg.elevated, borderRadius: 14,
    padding: spacing.md, borderWidth: 1, borderColor: colors.brand.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  plannerTitle: { color: colors.brand.secondary, fontSize: typography.sm, fontWeight: '600', marginBottom: 2 },
  plannerSub: { color: colors.text.muted, fontSize: typography.xs },
});
