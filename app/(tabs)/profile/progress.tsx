import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LineChart, BarChart, PieChart } from 'react-native-gifted-charts';
import { useAuthStore } from '../../../stores/authStore';
import { colors, spacing, typography } from '../../../constants/theme';
import { useBodyAnalytics } from '../../../hooks/useBodyAnalytics';
import { useNutritionAnalytics } from '../../../hooks/useNutritionAnalytics';
import { useWorkoutAnalytics } from '../../../hooks/useWorkoutAnalytics';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 48;

// ─── animated score ring ─────────────────────────────────────────────────────

const RING_R = 90;
const RING_SIZE = 200;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function ScoreRing({ score, color }: { score: number; color: string }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: score / 100,
      duration: 1400,
      useNativeDriver: false,
    }).start();
  }, [score, progress]);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  return (
    <Svg width={RING_SIZE} height={RING_SIZE}>
      {/* Background ring */}
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_R}
        stroke={colors.bg.elevated}
        strokeWidth={16}
        fill="none"
      />
      {/* Progress arc — rotated so it fills from top (12 o'clock) */}
      <AnimatedCircle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_R}
        stroke={color}
        strokeWidth={16}
        fill="none"
        strokeDasharray={`${CIRCUMFERENCE}`}
        strokeDashoffset={strokeDashoffset as unknown as string}
        strokeLinecap="round"
        transform={`rotate(-90, ${RING_SIZE / 2}, ${RING_SIZE / 2})`}
      />
    </Svg>
  );
}

// ─── section wrapper ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function Chip({ label, color }: { label: string; color?: string }) {
  return (
    <View style={[styles.chip, color ? { borderColor: color + '55', backgroundColor: color + '22' } : null]}>
      <Text style={[styles.chipText, color ? { color } : null]}>{label}</Text>
    </View>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const { profile } = useAuthStore();

  const { data: body, isLoading: bodyLoading } = useBodyAnalytics();
  const { data: nutrition, isLoading: nutritionLoading } = useNutritionAnalytics();
  const { data: workout, isLoading: workoutLoading } = useWorkoutAnalytics();
  const loading = bodyLoading || nutritionLoading || workoutLoading;

  const wRaw = Math.min(50, ((workout?.uniqueWorkoutDays ?? 0) / ((workout?.plannedDaysPerWeek ?? 3) * 4)) * 50);
  const nRaw = Math.min(50, ((nutrition?.nutritionDays ?? 0) / 30) * 50);
  const totalScore = Math.min(100, Math.round(wRaw + nRaw));
  const wScore = Math.round((wRaw / 50) * 100);
  const nScore = Math.round((nRaw / 50) * 100);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.loadingText}>Loading your analytics...</Text>
      </View>
    );
  }

  const scoreColor = totalScore >= 80 ? colors.success : totalScore >= 40 ? colors.brand.accent : colors.error;
  const scoreLabel =
    totalScore >= 80
      ? 'Consistently crushing it! 🔥'
      : totalScore >= 40
        ? 'Getting there! Keep the habit going 📈'
        : 'Magsimula ulit tayo 🌙 Every day is a fresh start.';

  const weightChange30 = body?.weightChange30 ?? null;
  const weightChangeLabel =
    weightChange30 !== null
      ? `${weightChange30 > 0 ? '▲' : '▼'} ${Math.abs(weightChange30)}kg in 30 days`
      : null;

  const chartCommonProps = {
    backgroundColor: colors.bg.secondary,
    xAxisColor: colors.border,
    yAxisColor: colors.border,
    xAxisLabelTextStyle: { color: colors.text.muted, fontSize: 10 },
    yAxisTextStyle: { color: colors.text.muted, fontSize: 10 },
    rulesColor: colors.border,
    rulesType: 'dashed' as const,
    hideDataPoints: false,
  };

  const weightLineData = body?.weightLineData ?? [];
  const weightAvgData = body?.weightAvgData ?? [];
  const currentWeight = body?.currentWeight ?? null;
  const targetWeight = body?.targetWeight ?? null;

  const calLineData = nutrition?.calLineData ?? [];
  const weeklyMacroStack = nutrition?.weeklyMacroStack ?? [];
  const netCarbsData = nutrition?.netCarbsData ?? [];
  const showNetCarbs = nutrition?.showNetCarbs ?? true;
  const calorieGoal = nutrition?.calorieGoal ?? 2000;
  const bestNutritionDay = nutrition?.bestNutritionDay ?? null;
  const worstNutritionDay = nutrition?.worstNutritionDay ?? null;

  const weeklyVolData = workout?.weeklyVolData ?? [];
  const weeklyFreqData = workout?.weeklyFreqData ?? [];
  const muscleData = workout?.muscleData ?? [];
  const prCards = workout?.prCards ?? [];
  const plannedDaysPerWeek = workout?.plannedDaysPerWeek ?? 3;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      {/* ─── SECTION 1: Body & Weight ─── */}
      <Section title="Body & Weight">
        {!body?.hasData ? (
          <EmptyState text="Log your weight in Measurements to see your trend 📊" />
        ) : (
          <>
            <LineChart
              {...chartCommonProps}
              data={weightLineData}
              data2={weightAvgData}
              width={CHART_W}
              height={180}
              color={colors.brand.primary}
              color2={colors.brand.secondary}
              thickness={2}
              thickness2={1.5}
              dataPointsColor={colors.brand.primary}
              dataPointsColor2={colors.brand.secondary}
              dataPointsRadius={3}
              dataPointsRadius2={0}
              hideDataPoints2
              curved
              noOfSections={4}
              spacing={CHART_W / Math.max(weightLineData.length, 6)}
              initialSpacing={8}
              endSpacing={8}
              isAnimated
            />
            <View style={styles.chipRow}>
              {weightChangeLabel && (
                <Chip
                  label={weightChangeLabel}
                  color={
                    (weightChange30! < 0 && profile?.primary_goal === 'lose_fat') ||
                    (weightChange30! > 0 && profile?.primary_goal === 'build_muscle')
                      ? colors.success
                      : colors.error
                  }
                />
              )}
              {currentWeight != null && <Chip label={`Current: ${currentWeight}kg`} />}
              {targetWeight != null && <Chip label={`Target: ${targetWeight}kg`} />}
            </View>

            {/* Legend */}
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: colors.brand.primary }]} />
              <Text style={styles.legendText}>Weight</Text>
              <View style={[styles.legendDot, { backgroundColor: colors.brand.secondary, marginLeft: 12 }]} />
              <Text style={styles.legendText}>7-day avg</Text>
            </View>
          </>
        )}
      </Section>

      {/* ─── SECTION 2: Nutrition Trends ─── */}
      <Section title="Nutrition Trends">
        {!nutrition?.hasData ? (
          <EmptyState text="Log food for at least 3 days to see your nutrition trends 🥗" />
        ) : (
          <>
            <Text style={styles.chartLabel}>Daily Calories (last 30 days)</Text>
            <LineChart
              {...chartCommonProps}
              data={calLineData}
              width={CHART_W}
              height={150}
              color={colors.brand.primary}
              thickness={2}
              dataPointsRadius={3}
              noOfSections={4}
              spacing={CHART_W / Math.max(calLineData.length, 15)}
              initialSpacing={8}
              endSpacing={8}
              maxValue={Math.ceil(Math.max(calorieGoal * 1.3, ...calLineData.map(d => d.value)) / 200) * 200}
              referenceLine1Config={{
                color: colors.brand.accent,
                dashWidth: 4,
                dashGap: 4,
                thickness: 1.5,
              }}
              referenceLine1Position={calorieGoal}
              isAnimated
            />
            <Text style={styles.refLineNote}>— Calorie goal ({calorieGoal} kcal)</Text>

            <Text style={[styles.chartLabel, { marginTop: spacing.lg }]}>
              Weekly Avg Macros — Protein / Carbs / Fat (g)
            </Text>
            <BarChart
              {...chartCommonProps}
              stackData={weeklyMacroStack.map(w => ({
                stacks: w.stackData,
                label: w.label.replace(/[A-Za-z]+ /, ''),
              }))}
              width={CHART_W}
              height={150}
              barWidth={20}
              spacing={CHART_W / Math.max(weeklyMacroStack.length * 2, 16) - 10}
              initialSpacing={8}
              noOfSections={4}
              isAnimated
            />

            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: colors.brand.primary }]} />
              <Text style={styles.legendText}>Protein</Text>
              <View style={[styles.legendDot, { backgroundColor: colors.brand.secondary, marginLeft: 10 }]} />
              <Text style={styles.legendText}>Carbs</Text>
              <View style={[styles.legendDot, { backgroundColor: colors.brand.accent, marginLeft: 10 }]} />
              <Text style={styles.legendText}>Fat</Text>
            </View>

            {showNetCarbs && (
              <>
                <Text style={[styles.chartLabel, { marginTop: spacing.lg }]}>
                  Net Carbs (last 30 days)
                </Text>
                <LineChart
                  {...chartCommonProps}
                  data={netCarbsData}
                  width={CHART_W}
                  height={120}
                  color={colors.brand.accent}
                  thickness={2}
                  dataPointsRadius={0}
                  hideDataPoints
                  noOfSections={3}
                  spacing={CHART_W / Math.max(netCarbsData.length, 15)}
                  initialSpacing={8}
                  endSpacing={8}
                  isAnimated
                />
              </>
            )}

            {(bestNutritionDay || worstNutritionDay) && (
              <View style={styles.chipRow}>
                {bestNutritionDay && (
                  <Chip label={`Best day: ${bestNutritionDay}`} color={colors.success} />
                )}
                {worstNutritionDay && (
                  <Chip label={`Watch this: ${worstNutritionDay}`} color={colors.error} />
                )}
              </View>
            )}
          </>
        )}
      </Section>

      {/* ─── SECTION 3: Workout Analytics ─── */}
      <Section title="Workout Analytics">
        {!workout?.hasData ? (
          <EmptyState text="Complete your first workout to see analytics 💪" />
        ) : (
          <>
            <Text style={styles.chartLabel}>Weekly Volume (kg, last 12 weeks)</Text>
            <BarChart
              {...chartCommonProps}
              data={weeklyVolData}
              width={CHART_W}
              height={150}
              barWidth={16}
              spacing={CHART_W / Math.max(weeklyVolData.length * 2, 12) - 8}
              initialSpacing={8}
              noOfSections={4}
              isAnimated
            />

            <Text style={[styles.chartLabel, { marginTop: spacing.lg }]}>
              Workouts per Week vs. Goal ({plannedDaysPerWeek}×/week)
            </Text>
            <BarChart
              {...chartCommonProps}
              data={weeklyFreqData}
              width={CHART_W}
              height={120}
              barWidth={16}
              spacing={CHART_W / Math.max(weeklyFreqData.length * 2, 12) - 8}
              initialSpacing={8}
              noOfSections={Math.max(plannedDaysPerWeek, 3)}
              maxValue={Math.max(plannedDaysPerWeek + 1, 7)}
              referenceLine1Position={plannedDaysPerWeek}
              referenceLine1Config={{ color: colors.brand.primary, dashWidth: 4, dashGap: 4, thickness: 1.5 }}
              isAnimated
            />

            {muscleData.length > 0 && (
              <>
                <Text style={[styles.chartLabel, { marginTop: spacing.lg }]}>
                  Volume by Muscle Group (last 30 days)
                </Text>
                <View style={styles.pieRow}>
                  <PieChart
                    donut
                    data={muscleData}
                    radius={70}
                    innerRadius={45}
                    centerLabelComponent={() => (
                      <Text style={styles.pieCenter}>30d</Text>
                    )}
                  />
                  <View style={styles.pieLegend}>
                    {muscleData.map(d => (
                      <View key={d.text} style={styles.pieLegendRow}>
                        <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                        <Text style={styles.legendText}>{d.text} {d.value}%</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}

            {prCards.length > 0 && (
              <>
                <Text style={[styles.chartLabel, { marginTop: spacing.lg }]}>
                  Personal Records
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.prCardRow}>
                    {prCards.map(pr => (
                      <View key={pr.exercise} style={styles.prCard}>
                        <Text style={styles.prExercise}>{pr.exercise}</Text>
                        <Text style={styles.prWeight}>{pr.weight_kg}kg × {pr.reps}</Text>
                        <Text style={styles.prDate}>{pr.date}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
          </>
        )}
      </Section>

      {/* ─── SECTION 4: Consistency Score ─── */}
      <Section title="Consistency Score">
        <View style={styles.scoreWrap}>
          <View style={styles.ringWrap}>
            <ScoreRing score={totalScore} color={scoreColor} />
            <View style={styles.ringLabel}>
              <Text style={[styles.scoreNumber, { color: scoreColor }]}>{totalScore}</Text>
              <Text style={styles.scoreOf}>/ 100</Text>
            </View>
          </View>
          <Text style={styles.scoreLabel}>{scoreLabel}</Text>
          <View style={styles.chipRow}>
            <Chip label={`Workout consistency: ${wScore}%`} color={colors.brand.primary} />
            <Chip label={`Nutrition consistency: ${nScore}%`} color={colors.brand.secondary} />
          </View>
          <Text style={styles.discountNote}>
            Score ≥ 80 = 10% discount on your subscription, applied automatically.
          </Text>
        </View>
      </Section>

    </ScrollView>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { paddingHorizontal: 24, paddingTop: spacing.lg, paddingBottom: spacing['2xl'] },
  loadingWrap: { flex: 1, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.text.secondary, fontSize: typography.base },

  section: {
    marginBottom: spacing.xl,
    backgroundColor: colors.bg.secondary,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    color: colors.text.secondary,
    fontSize: typography.xs,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  chartLabel: {
    color: colors.text.secondary,
    fontSize: typography.xs,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  refLineNote: {
    color: colors.text.muted,
    fontSize: typography.xs,
    marginTop: 4,
  },

  emptyBox: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: typography.sm,
    textAlign: 'center',
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg.elevated,
  },
  chipText: { color: colors.text.secondary, fontSize: typography.xs },

  legendRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, flexWrap: 'wrap' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  legendText: { color: colors.text.muted, fontSize: typography.xs },

  pieRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.sm },
  pieLegend: { flex: 1, gap: 8 },
  pieLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pieCenter: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700' },

  prCardRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 4 },
  prCard: {
    backgroundColor: colors.bg.elevated,
    borderRadius: 14,
    padding: spacing.md,
    minWidth: 130,
    borderWidth: 1,
    borderColor: colors.brand.accent + '44',
  },
  prExercise: { color: colors.text.secondary, fontSize: typography.xs, fontWeight: '600', marginBottom: 4 },
  prWeight: { color: colors.brand.accent, fontSize: typography.lg, fontWeight: '800' },
  prDate: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },

  scoreWrap: { alignItems: 'center' },
  ringWrap: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  ringLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: { fontSize: 44, fontWeight: '900', lineHeight: 52 },
  scoreOf: { color: colors.text.muted, fontSize: typography.sm },
  scoreLabel: {
    color: colors.text.primary,
    fontSize: typography.base,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  discountNote: {
    color: colors.text.muted,
    fontSize: typography.xs,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
});
