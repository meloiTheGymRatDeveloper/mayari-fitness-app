import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, fonts, labelStyle } from '../../../constants/theme';
import { useStreaks, useStreakCalendar } from '../../../hooks/useStreaks';
import Skeleton from '../../../components/ui/Skeleton';

const MILESTONES = [7, 30, 100];

function MilestoneBadge({ days, longest }: { days: number; longest: number }) {
  const unlocked = longest >= days;
  return (
    <View style={[styles.milestoneBadge, unlocked && styles.milestoneBadgeUnlocked]}>
      <Text style={styles.milestoneDays}>{days}</Text>
      <Text style={styles.milestoneDaysLabel}>days</Text>
      {unlocked && <Text style={styles.milestoneStar}>⭐</Text>}
    </View>
  );
}

function CalendarGrid({ workoutDays, nutritionDays }: { workoutDays: Set<string>; nutritionDays: Set<string> }) {
  const today = new Date();
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().substring(0, 10));
  }
  return (
    <View style={styles.calendarGrid}>
      {days.map(day => {
        const hasWorkout = workoutDays.has(day);
        const hasNutrition = nutritionDays.has(day);
        const label = new Date(day).getDate().toString();
        return (
          <View key={day} style={styles.calendarCell}>
            {hasWorkout && hasNutrition ? (
              <View style={styles.halfHalf}>
                <View style={[styles.halfLeft, { backgroundColor: colors.brand.primary }]} />
                <View style={[styles.halfRight, { backgroundColor: colors.brand.secondary }]} />
              </View>
            ) : hasWorkout ? (
              <View style={[styles.calendarDot, { backgroundColor: colors.brand.primary }]} />
            ) : hasNutrition ? (
              <View style={[styles.calendarDot, { backgroundColor: colors.brand.secondary }]} />
            ) : (
              <View style={[styles.calendarDot, { backgroundColor: colors.bg.elevated }]} />
            )}
            <Text style={styles.calendarLabel}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function StreaksScreen() {
  const { data: streaks, isLoading: loadingStreaks } = useStreaks();
  const { data: calendar, isLoading: loadingCalendar } = useStreakCalendar();

  const workoutCurrent = streaks?.workout_current ?? 0;
  const nutritionCurrent = streaks?.nutrition_current ?? 0;
  const workoutLongest = streaks?.workout_longest ?? 0;
  const nutritionLongest = streaks?.nutrition_longest ?? 0;
  const longestOverall = Math.max(workoutLongest, nutritionLongest);

  const workoutMessage = workoutCurrent > 0
    ? `${workoutCurrent} days na! Tuloy lang! 🔥`
    : 'Magsimula ulit tayo 💪 Ngayon na!';
  const nutritionMessage = nutritionCurrent > 0
    ? `${nutritionCurrent} days na! Tuloy lang! 🥗`
    : 'I-log ang pagkain mo ngayon! 🍳';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.screenTitle}>Streaks</Text>
      {loadingStreaks ? (
        <View style={styles.streakRow}>
          <Skeleton width="47%" height={140} borderRadius={20} />
          <Skeleton width="47%" height={140} borderRadius={20} />
        </View>
      ) : (
        <View style={styles.streakRow}>
          <View style={styles.streakCard}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakNumber}>{workoutCurrent}</Text>
            <Text style={styles.streakTypeLabel}>Workout Streak</Text>
            <Text style={styles.streakMessage}>{workoutMessage}</Text>
          </View>
          <View style={styles.streakCard}>
            <Text style={styles.streakEmoji}>🥗</Text>
            <Text style={styles.streakNumber}>{nutritionCurrent}</Text>
            <Text style={styles.streakTypeLabel}>Nutrition Streak</Text>
            <Text style={styles.streakMessage}>{nutritionMessage}</Text>
          </View>
        </View>
      )}
      <View style={styles.pbRow}>
        <Text style={styles.pbText}>
          Best: {workoutLongest} days workout · {nutritionLongest} days nutrition
        </Text>
      </View>
      <Text style={styles.sectionTitle}>Milestones</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.milestonesScroll}>
        <View style={styles.milestonesRow}>
          {MILESTONES.map(days => (
            <MilestoneBadge key={days} days={days} longest={longestOverall} />
          ))}
        </View>
      </ScrollView>
      <Text style={styles.sectionTitle}>Last 30 Days</Text>
      <View style={styles.legendRow}>
        <View style={[styles.legendDot, { backgroundColor: colors.brand.primary }]} />
        <Text style={styles.legendText}>Workout</Text>
        <View style={[styles.legendDot, { backgroundColor: colors.brand.secondary }]} />
        <Text style={styles.legendText}>Nutrition (3+ meals)</Text>
      </View>
      {loadingCalendar ? (
        <Skeleton width="100%" height={200} borderRadius={16} style={{ marginTop: spacing.sm }} />
      ) : (
        <View style={styles.calendarCard}>
          <CalendarGrid
            workoutDays={calendar?.workoutDays ?? new Set()}
            nutritionDays={calendar?.nutritionDays ?? new Set()}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing['2xl'] },
  screenTitle: { color: colors.text.primary, fontSize: typography['2xl'], fontFamily: fonts.extrabold, marginBottom: spacing.lg },
  streakRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  streakCard: {
    flex: 1, backgroundColor: colors.bg.secondary, borderRadius: 20,
    padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  streakEmoji: { fontSize: 32, marginBottom: 4 },
  streakNumber: { color: colors.text.primary, fontSize: typography['3xl'], fontFamily: fonts.extrabold },
  streakTypeLabel: { color: colors.text.secondary, fontSize: typography.xs, fontFamily: fonts.semibold, marginTop: 2 },
  streakMessage: { color: colors.brand.secondary, fontSize: typography.xs, fontFamily: fonts.regular, textAlign: 'center', marginTop: 4 },
  pbRow: {
    backgroundColor: colors.bg.elevated, borderRadius: 12, padding: spacing.sm,
    marginBottom: spacing.lg, alignItems: 'center',
  },
  pbText: { color: colors.text.secondary, fontSize: typography.sm, fontFamily: fonts.regular },
  sectionTitle: {
    ...labelStyle,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  milestonesScroll: { marginBottom: spacing.md },
  milestonesRow: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.md },
  milestoneBadge: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.bg.elevated,
    borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  milestoneBadgeUnlocked: { borderColor: colors.brand.accent, backgroundColor: colors.brand.accent + '22' },
  milestoneDays: { color: colors.text.primary, fontSize: typography.xl, fontFamily: fonts.extrabold },
  milestoneDaysLabel: { color: colors.text.muted, fontSize: typography.xs, fontFamily: fonts.regular },
  milestoneStar: { fontSize: 16, position: 'absolute', top: 4, right: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { color: colors.text.secondary, fontSize: typography.xs },
  calendarCard: {
    backgroundColor: colors.bg.secondary, borderRadius: 16, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  calendarCell: { width: '17%', alignItems: 'center', marginBottom: 4 },
  calendarDot: { width: 28, height: 28, borderRadius: 14 },
  calendarLabel: { color: colors.text.muted, fontSize: 10, marginTop: 2 },
  halfHalf: { width: 28, height: 28, borderRadius: 14, overflow: 'hidden', flexDirection: 'row' },
  halfLeft: { flex: 1 },
  halfRight: { flex: 1 },
});
