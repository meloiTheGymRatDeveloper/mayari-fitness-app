import { useEffect, useRef, useState } from 'react';
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
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { colors, spacing, typography } from '../../../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 48;

// ─── date helpers ────────────────────────────────────────────────────────────

function subDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() - days);
  return d;
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getMonday(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - ((day + 6) % 7));
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function shortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function shortWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

// ─── data processing ─────────────────────────────────────────────────────────

function rollingAvg(
  data: { date: string; weight: number }[],
  window: number,
): { value: number }[] {
  return data.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    const avg = slice.reduce((s, p) => s + p.weight, 0) / slice.length;
    return { value: parseFloat(avg.toFixed(1)) };
  });
}

interface DayNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  slots: Set<string>;
}

function buildWeeklyMacros(
  daily: Record<string, DayNutrition>,
  numWeeks: number,
): { label: string; stackData: { value: number; color: string }[] }[] {
  const now = new Date();
  const weeks: { key: string; label: string; protein: number; carbs: number; fat: number; count: number }[] = [];

  for (let i = numWeeks - 1; i >= 0; i--) {
    const start = getMonday(subDays(now, i * 7));
    weeks.push({
      key: toDateStr(start),
      label: shortWeek(toDateStr(start)),
      protein: 0, carbs: 0, fat: 0, count: 0,
    });
  }

  Object.entries(daily).forEach(([date, d]) => {
    const weekKey = toDateStr(getMonday(new Date(date + 'T12:00:00Z')));
    const week = weeks.find(w => w.key === weekKey);
    if (week) {
      week.protein += d.protein;
      week.carbs += d.carbs;
      week.fat += d.fat;
      week.count++;
    }
  });

  return weeks.map(w => ({
    label: w.label,
    stackData: [
      { value: w.count > 0 ? Math.round(w.protein / w.count) : 0, color: colors.brand.primary },
      { value: w.count > 0 ? Math.round(w.carbs / w.count) : 0, color: colors.brand.secondary },
      { value: w.count > 0 ? Math.round(w.fat / w.count) : 0, color: colors.brand.accent },
    ],
  }));
}

function buildWeeklySessions(
  sessions: { started_at: string; total_volume_kg: number }[],
  numWeeks: number,
  plannedPerWeek: number,
) {
  const now = new Date();
  const volumeMap: Record<string, number> = {};
  const countMap: Record<string, number> = {};
  const labels: string[] = [];

  for (let i = numWeeks - 1; i >= 0; i--) {
    const key = toDateStr(getMonday(subDays(now, i * 7)));
    volumeMap[key] = 0;
    countMap[key] = 0;
    labels.push(shortWeek(key));
  }

  sessions.forEach(s => {
    const key = toDateStr(getMonday(new Date(s.started_at)));
    if (key in volumeMap) {
      volumeMap[key] += s.total_volume_kg;
      countMap[key]++;
    }
  });

  const volData = Object.keys(volumeMap).map((key, i) => ({
    value: Math.round(volumeMap[key]),
    label: labels[i],
    frontColor: colors.brand.primary,
  }));

  const freqData = Object.keys(countMap).map((key, i) => ({
    value: countMap[key],
    label: labels[i],
    frontColor: countMap[key] >= plannedPerWeek ? colors.success : colors.error,
  }));

  return { volData, freqData };
}

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
  }, [score]);

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
        strokeDashoffset={strokeDashoffset as unknown as number}
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
  const [loading, setLoading] = useState(true);

  // Section 1 — Body
  const [weightLineData, setWeightLineData] = useState<{ value: number; label?: string }[]>([]);
  const [weightAvgData, setWeightAvgData] = useState<{ value: number }[]>([]);
  const [weightChange30, setWeightChange30] = useState<number | null>(null);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [hasBodyData, setHasBodyData] = useState(false);

  // Section 2 — Nutrition
  const [calLineData, setCalLineData] = useState<{ value: number; dataPointColor?: string }[]>([]);
  const [weeklyMacroStack, setWeeklyMacroStack] = useState<{ label: string; stackData: { value: number; color: string }[] }[]>([]);
  const [netCarbsData, setNetCarbsData] = useState<{ value: number }[]>([]);
  const [showNetCarbs, setShowNetCarbs] = useState(false);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [bestNutritionDay, setBestNutritionDay] = useState<string | null>(null);
  const [worstNutritionDay, setWorstNutritionDay] = useState<string | null>(null);
  const [hasNutritionData, setHasNutritionData] = useState(false);

  // Section 3 — Workout
  const [weeklyVolData, setWeeklyVolData] = useState<{ value: number; label: string; frontColor: string }[]>([]);
  const [weeklyFreqData, setWeeklyFreqData] = useState<{ value: number; label: string; frontColor: string }[]>([]);
  const [muscleData, setMuscleData] = useState<{ value: number; color: string; text: string }[]>([]);
  const [prCards, setPRCards] = useState<{ exercise: string; weight_kg: number; reps: number; date: string }[]>([]);
  const [hasWorkoutData, setHasWorkoutData] = useState(false);
  const [plannedDaysPerWeek, setPlannedDaysPerWeek] = useState(3);

  // Section 4 — Consistency
  const [totalScore, setTotalScore] = useState(0);
  const [wScore, setWScore] = useState(0);
  const [nScore, setNScore] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;
    loadAnalytics(profile.id);
  }, [profile?.id]);

  async function loadAnalytics(uid: string) {
    setLoading(true);
    try {
      const now = new Date();
      const d30 = subDays(now, 30);
      const d56 = subDays(now, 56);
      const d84 = subDays(now, 84);
      const d90 = subDays(now, 90);

      const [bodyRes, foodRes, sessionRes, prRes, userRes] = await Promise.all([
        supabase
          .from('body_measurements')
          .select('measured_at, weight_kg')
          .eq('user_id', uid)
          .gte('measured_at', toDateStr(d90))
          .not('weight_kg', 'is', null)
          .order('measured_at', { ascending: true }),

        supabase
          .from('food_logs')
          .select('logged_at, meal_slot, quantity_g, food_item:food_items(calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g)')
          .eq('user_id', uid)
          .gte('logged_at', d56.toISOString()),

        supabase
          .from('workout_sessions')
          .select('id, started_at, total_volume_kg')
          .eq('user_id', uid)
          .gte('started_at', d84.toISOString())
          .order('started_at', { ascending: true }),

        supabase
          .from('personal_records')
          .select('exercise_name, weight_kg, reps, achieved_at')
          .eq('user_id', uid),

        supabase
          .from('users')
          .select('calorie_goal, workout_days, target_weight_kg, net_carbs_display, body_weight_kg')
          .eq('id', uid)
          .single(),
      ]);

      // ── user profile ──
      const userD = userRes.data;
      const cGoal = userD?.calorie_goal ?? 2000;
      const wDays = userD?.workout_days?.length ?? 3;
      setCalorieGoal(cGoal);
      setTargetWeight(userD?.target_weight_kg ?? null);
      setShowNetCarbs(userD?.net_carbs_display ?? true);
      setPlannedDaysPerWeek(wDays);

      // ── Section 1: Body Weight ──
      const rawBody = (bodyRes.data ?? []).map(b => ({
        date: b.measured_at,
        weight: b.weight_kg as number,
      }));

      if (rawBody.length >= 2) {
        setHasBodyData(true);

        // Downsample for chart (show every 7th point with weekly labels)
        const sampled = rawBody.filter((_, i) => i % Math.max(1, Math.floor(rawBody.length / 12)) === 0 || i === rawBody.length - 1);
        setWeightLineData(
          sampled.map((p, i) => ({
            value: p.weight,
            label: i % 3 === 0 ? shortDate(p.date) : '',
          })),
        );
        setWeightAvgData(rollingAvg(sampled, 7));

        const last30Body = rawBody.filter(b => b.date >= toDateStr(d30));
        if (last30Body.length >= 2) {
          setWeightChange30(
            parseFloat((last30Body[last30Body.length - 1].weight - last30Body[0].weight).toFixed(1)),
          );
        }
        setCurrentWeight(rawBody[rawBody.length - 1].weight);
      }

      // ── Section 2: Nutrition ──
      const daily: Record<string, DayNutrition> = {};
      const foodLogs = foodRes.data ?? [];

      foodLogs.forEach(log => {
        const date = log.logged_at.split('T')[0];
        const fi = log.food_item as unknown as { calories_per_100g: number | null; protein_per_100g: number | null; carbs_per_100g: number | null; fat_per_100g: number | null; fiber_per_100g: number | null } | null;
        if (!fi) return;
        const q = log.quantity_g / 100;
        if (!daily[date]) daily[date] = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, slots: new Set() };
        daily[date].calories += (fi.calories_per_100g ?? 0) * q;
        daily[date].protein += (fi.protein_per_100g ?? 0) * q;
        daily[date].carbs += (fi.carbs_per_100g ?? 0) * q;
        daily[date].fat += (fi.fat_per_100g ?? 0) * q;
        daily[date].fiber += (fi.fiber_per_100g ?? 0) * q;
        daily[date].slots.add(log.meal_slot);
      });

      const last30Dates: string[] = [];
      for (let i = 29; i >= 0; i--) last30Dates.push(toDateStr(subDays(now, i)));

      const calData = last30Dates.map(date => ({
        value: Math.round(daily[date]?.calories ?? 0),
        dataPointColor: (daily[date]?.calories ?? 0) > 0
          ? ((daily[date]?.calories ?? 0) <= cGoal ? colors.success : colors.error)
          : colors.bg.elevated,
      }));

      setCalLineData(calData);
      setWeeklyMacroStack(buildWeeklyMacros(daily, 8));

      const ncData = last30Dates.map(date => ({
        value: Math.max(0, Math.round((daily[date]?.carbs ?? 0) - (daily[date]?.fiber ?? 0))),
      }));
      setNetCarbsData(ncData);

      // Insight chips: best day (highest protein within goal), watch day (most over goal)
      const last30LoggedDays = Object.entries(daily).filter(([d]) => d >= toDateStr(d30));
      if (last30LoggedDays.length >= 3) {
        setHasNutritionData(true);

        const bestDay = last30LoggedDays
          .filter(([, d]) => d.calories <= cGoal)
          .sort((a, b) => b[1].protein - a[1].protein)[0];
        setBestNutritionDay(bestDay ? shortDate(bestDay[0]) : null);

        const worstDay = last30LoggedDays
          .sort((a, b) => (b[1].calories - cGoal) - (a[1].calories - cGoal))[0];
        setWorstNutritionDay(worstDay && worstDay[1].calories > cGoal ? shortDate(worstDay[0]) : null);
      }

      // ── Section 3: Workout ──
      const sessions = sessionRes.data ?? [];
      if (sessions.length > 0) {
        setHasWorkoutData(true);
      }

      const { volData, freqData } = buildWeeklySessions(sessions, 12, wDays);
      setWeeklyVolData(volData);
      setWeeklyFreqData(freqData);

      // Muscle group breakdown (last 30 days)
      const last30SessionIds = sessions
        .filter(s => s.started_at >= d30.toISOString())
        .map(s => s.id);

      if (last30SessionIds.length > 0) {
        const setsRes = await supabase
          .from('workout_sets')
          .select('weight_kg, reps, exercise_id')
          .in('session_id', last30SessionIds);

        const exerciseIds = [...new Set((setsRes.data ?? []).map(s => s.exercise_id))];

        let muscleMap: Record<string, string> = {};
        if (exerciseIds.length > 0) {
          const exRes = await supabase
            .from('exercises')
            .select('id, muscle_group')
            .in('id', exerciseIds);
          muscleMap = Object.fromEntries((exRes.data ?? []).map(e => [e.id, e.muscle_group]));
        }

        const mgVolume: Record<string, number> = { push: 0, pull: 0, legs: 0, core: 0 };
        (setsRes.data ?? []).forEach(s => {
          const mg = muscleMap[s.exercise_id] ?? 'push';
          mgVolume[mg] = (mgVolume[mg] ?? 0) + s.weight_kg * s.reps;
        });

        const totalVol = Object.values(mgVolume).reduce((a, b) => a + b, 0);
        if (totalVol > 0) {
          setMuscleData([
            { value: Math.round((mgVolume.push / totalVol) * 100), color: colors.brand.primary, text: 'Push' },
            { value: Math.round((mgVolume.pull / totalVol) * 100), color: colors.brand.secondary, text: 'Pull' },
            { value: Math.round((mgVolume.legs / totalVol) * 100), color: colors.brand.accent, text: 'Legs' },
            { value: Math.round((mgVolume.core / totalVol) * 100), color: colors.success, text: 'Core' },
          ].filter(d => d.value > 0));
        }
      }

      // PR cards
      const keyLifts = ['Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Barbell Row'];
      const prMap: Record<string, { weight_kg: number; reps: number; achieved_at: string }> = {};
      (prRes.data ?? []).forEach(pr => {
        if (keyLifts.includes(pr.exercise_name)) prMap[pr.exercise_name] = pr;
      });
      setPRCards(
        keyLifts
          .filter(name => prMap[name])
          .map(name => ({ exercise: name, ...prMap[name]!, date: shortDate(prMap[name]!.achieved_at) })),
      );

      // ── Section 4: Consistency Score ──
      const last30Sessions = sessions.filter(s => s.started_at >= d30.toISOString());
      const uniqueWorkoutDays = new Set(last30Sessions.map(s => s.started_at.split('T')[0]));
      const rawWScore = (uniqueWorkoutDays.size / (wDays * 4)) * 50;
      const computedWScore = Math.min(50, rawWScore);

      const nutritionDays = Object.entries(daily).filter(([d, nd]) => d >= toDateStr(d30) && nd.slots.size >= 3);
      const computedNScore = Math.min(50, (nutritionDays.length / 30) * 50);

      const score = Math.min(100, Math.round(computedWScore + computedNScore));
      setWScore(Math.round((computedWScore / 50) * 100));
      setNScore(Math.round((computedNScore / 50) * 100));
      setTotalScore(score);

    } catch {
      // silently ignore; sections show empty states
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      {/* ─── SECTION 1: Body & Weight ─── */}
      <Section title="Body & Weight">
        {!hasBodyData ? (
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
                    weightChange30 !== null
                      ? ((weightChange30 < 0 && profile?.primary_goal === 'lose_fat') ||
                        (weightChange30 > 0 && profile?.primary_goal === 'build_muscle')
                          ? colors.success
                          : colors.error)
                      : undefined
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
        {!hasNutritionData ? (
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
        {!hasWorkoutData ? (
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
