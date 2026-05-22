# Week 7 — Advanced Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the monolithic `loadAnalytics` function in `progress.tsx` (884 lines, 20+ useState hooks) into three TanStack Query hooks — `useBodyAnalytics`, `useNutritionAnalytics`, `useWorkoutAnalytics` — and refactor the screen to use them, shrinking it to ~300 lines.

**Architecture:** Three domain hooks each own one section's data-fetching and transformation. Shared date utilities live in `lib/analyticsHelpers.ts` to avoid duplication across all three hooks. The screen replaces the monolithic load with three hook calls; the consistency score remains inline math on the hooks' returned data.

**Tech Stack:** TypeScript, React Native, Expo Router, TanStack Query (`@tanstack/react-query`), Supabase, Zustand (`useAuthStore`)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `lib/analyticsHelpers.ts` | Shared date utilities used by all three hooks |
| Create | `hooks/useBodyAnalytics.ts` | Body measurements query + chart transformation |
| Create | `hooks/useNutritionAnalytics.ts` | Food logs query + macro/calorie transformation |
| Create | `hooks/useWorkoutAnalytics.ts` | Sessions + sets + exercises + PRs |
| Modify | `app/(tabs)/profile/progress.tsx` | Remove loadAnalytics; use three hooks |

---

## Context — What Already Exists

`app/(tabs)/profile/progress.tsx` (884 lines) is a fully working analytics screen. It has four sections (Body & Weight, Nutrition Trends, Workout Analytics, Consistency Score) and renders charts from `react-native-gifted-charts`. The screen currently does all data fetching inside one `loadAnalytics` async function triggered by `useEffect`. Your job is to move that logic into hooks — **no new UI features, no chart changes**.

The existing hooks in `hooks/` follow this exact pattern:
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export function useMyHook() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['my_key', userId],
    queryFn: async () => { /* supabase fetch */ },
    enabled: !!userId,
    staleTime: 30_000,
  });
}
```

Read `hooks/useFasting.ts` and `hooks/useBodyMeasurements.ts` before starting — they are the reference implementation.

---

### Task 1: Shared Date Helpers

**Files:**
- Create: `lib/analyticsHelpers.ts`

- [ ] **Step 1: Create `lib/analyticsHelpers.ts`**

```typescript
export function subDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() - days);
  return d;
}

export function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function shortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export function getMonday(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - ((day + 6) % 7));
  copy.setHours(0, 0, 0, 0);
  return copy;
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/analyticsHelpers.ts
git commit -m "feat: add shared analytics date helpers"
```

---

### Task 2: useBodyAnalytics Hook

**Files:**
- Create: `hooks/useBodyAnalytics.ts`

- [ ] **Step 1: Create `hooks/useBodyAnalytics.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { subDays, toDateStr, shortDate } from '../lib/analyticsHelpers';

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

export interface BodyAnalytics {
  weightLineData: { value: number; label?: string }[];
  weightAvgData: { value: number }[];
  weightChange30: number | null;
  currentWeight: number | null;
  targetWeight: number | null;
  hasData: boolean;
}

export function useBodyAnalytics() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const profile = useAuthStore((s) => s.profile);

  return useQuery<BodyAnalytics>({
    queryKey: ['body_analytics', userId],
    queryFn: async (): Promise<BodyAnalytics> => {
      const now = new Date();
      const d90 = subDays(now, 90);
      const d30 = subDays(now, 30);

      const { data, error } = await supabase
        .from('body_measurements')
        .select('measured_at, weight_kg')
        .eq('user_id', userId!)
        .gte('measured_at', toDateStr(d90))
        .not('weight_kg', 'is', null)
        .order('measured_at', { ascending: true });

      if (error) throw error;

      const rawBody = (data ?? []).map(b => ({
        date: b.measured_at,
        weight: b.weight_kg as number,
      }));

      if (rawBody.length < 2) {
        return {
          weightLineData: [],
          weightAvgData: [],
          weightChange30: null,
          currentWeight: rawBody.length === 1 ? rawBody[0].weight : null,
          targetWeight: profile?.target_weight_kg ?? null,
          hasData: false,
        };
      }

      const sampled = rawBody.filter(
        (_, i) =>
          i % Math.max(1, Math.floor(rawBody.length / 12)) === 0 ||
          i === rawBody.length - 1,
      );

      const weightLineData = sampled.map((p, i) => ({
        value: p.weight,
        label: i % 3 === 0 ? shortDate(p.date) : '',
      }));

      const weightAvgData = rollingAvg(sampled, 7);

      const last30Body = rawBody.filter(b => b.date >= toDateStr(d30));
      const weightChange30 =
        last30Body.length >= 2
          ? parseFloat(
              (
                last30Body[last30Body.length - 1].weight - last30Body[0].weight
              ).toFixed(1),
            )
          : null;

      return {
        weightLineData,
        weightAvgData,
        weightChange30,
        currentWeight: rawBody[rawBody.length - 1].weight,
        targetWeight: profile?.target_weight_kg ?? null,
        hasData: true,
      };
    },
    enabled: !!userId,
    staleTime: 300_000,
  });
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add hooks/useBodyAnalytics.ts
git commit -m "feat: add useBodyAnalytics TanStack Query hook"
```

---

### Task 3: useNutritionAnalytics Hook

**Files:**
- Create: `hooks/useNutritionAnalytics.ts`

- [ ] **Step 1: Create `hooks/useNutritionAnalytics.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { colors } from '../constants/theme';
import { subDays, toDateStr, shortDate, getMonday } from '../lib/analyticsHelpers';

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
  const weeks: {
    key: string;
    label: string;
    protein: number;
    carbs: number;
    fat: number;
    count: number;
  }[] = [];

  for (let i = numWeeks - 1; i >= 0; i--) {
    const start = getMonday(subDays(now, i * 7));
    weeks.push({
      key: toDateStr(start),
      label: shortDate(toDateStr(start)),
      protein: 0,
      carbs: 0,
      fat: 0,
      count: 0,
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
      {
        value: w.count > 0 ? Math.round(w.protein / w.count) : 0,
        color: colors.brand.primary,
      },
      {
        value: w.count > 0 ? Math.round(w.carbs / w.count) : 0,
        color: colors.brand.secondary,
      },
      {
        value: w.count > 0 ? Math.round(w.fat / w.count) : 0,
        color: colors.brand.accent,
      },
    ],
  }));
}

export interface NutritionAnalytics {
  calLineData: { value: number; dataPointColor?: string }[];
  weeklyMacroStack: { label: string; stackData: { value: number; color: string }[] }[];
  netCarbsData: { value: number }[];
  showNetCarbs: boolean;
  calorieGoal: number;
  bestNutritionDay: string | null;
  worstNutritionDay: string | null;
  hasData: boolean;
  nutritionDays: number;
}

export function useNutritionAnalytics() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const profile = useAuthStore((s) => s.profile);

  return useQuery<NutritionAnalytics>({
    queryKey: ['nutrition_analytics', userId],
    queryFn: async (): Promise<NutritionAnalytics> => {
      const now = new Date();
      const d30 = subDays(now, 30);
      const d56 = subDays(now, 56);

      const cGoal = profile?.calorie_goal ?? 2000;
      const showNetCarbs = profile?.net_carbs_display ?? true;

      const { data: foodLogs, error } = await supabase
        .from('food_logs')
        .select(
          'logged_at, meal_slot, quantity_g, food_item:food_items(calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g)',
        )
        .eq('user_id', userId!)
        .gte('logged_at', d56.toISOString());

      if (error) throw error;

      const daily: Record<string, DayNutrition> = {};

      (foodLogs ?? []).forEach(log => {
        const date = log.logged_at.split('T')[0];
        const fi = log.food_item as unknown as {
          calories_per_100g: number | null;
          protein_per_100g: number | null;
          carbs_per_100g: number | null;
          fat_per_100g: number | null;
          fiber_per_100g: number | null;
        } | null;
        if (!fi) return;
        const q = log.quantity_g / 100;
        if (!daily[date]) {
          daily[date] = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            slots: new Set(),
          };
        }
        daily[date].calories += (fi.calories_per_100g ?? 0) * q;
        daily[date].protein += (fi.protein_per_100g ?? 0) * q;
        daily[date].carbs += (fi.carbs_per_100g ?? 0) * q;
        daily[date].fat += (fi.fat_per_100g ?? 0) * q;
        daily[date].fiber += (fi.fiber_per_100g ?? 0) * q;
        daily[date].slots.add(log.meal_slot);
      });

      const last30Dates: string[] = [];
      for (let i = 29; i >= 0; i--) last30Dates.push(toDateStr(subDays(now, i)));

      const calLineData = last30Dates.map(date => ({
        value: Math.round(daily[date]?.calories ?? 0),
        dataPointColor:
          (daily[date]?.calories ?? 0) > 0
            ? (daily[date]?.calories ?? 0) <= cGoal
              ? colors.success
              : colors.error
            : colors.bg.elevated,
      }));

      const weeklyMacroStack = buildWeeklyMacros(daily, 8);

      const netCarbsData = last30Dates.map(date => ({
        value: Math.max(
          0,
          Math.round((daily[date]?.carbs ?? 0) - (daily[date]?.fiber ?? 0)),
        ),
      }));

      const last30LoggedDays = Object.entries(daily).filter(
        ([d]) => d >= toDateStr(d30),
      );

      const nutritionDays = Object.entries(daily).filter(
        ([d, nd]) => d >= toDateStr(d30) && nd.slots.size >= 3,
      ).length;

      let bestNutritionDay: string | null = null;
      let worstNutritionDay: string | null = null;

      if (last30LoggedDays.length >= 3) {
        const bestDay = last30LoggedDays
          .filter(([, d]) => d.calories <= cGoal)
          .sort((a, b) => b[1].protein - a[1].protein)[0];
        bestNutritionDay = bestDay ? shortDate(bestDay[0]) : null;

        const worstDay = last30LoggedDays.sort(
          (a, b) => b[1].calories - cGoal - (a[1].calories - cGoal),
        )[0];
        worstNutritionDay =
          worstDay && worstDay[1].calories > cGoal
            ? shortDate(worstDay[0])
            : null;
      }

      return {
        calLineData,
        weeklyMacroStack,
        netCarbsData,
        showNetCarbs,
        calorieGoal: cGoal,
        bestNutritionDay,
        worstNutritionDay,
        hasData: last30LoggedDays.length >= 3,
        nutritionDays,
      };
    },
    enabled: !!userId,
    staleTime: 300_000,
  });
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add hooks/useNutritionAnalytics.ts
git commit -m "feat: add useNutritionAnalytics TanStack Query hook"
```

---

### Task 4: useWorkoutAnalytics Hook

**Files:**
- Create: `hooks/useWorkoutAnalytics.ts`

- [ ] **Step 1: Create `hooks/useWorkoutAnalytics.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { colors } from '../constants/theme';
import { subDays, toDateStr, shortDate, getMonday } from '../lib/analyticsHelpers';

function buildWeeklySessions(
  sessions: { started_at: string; total_volume_kg: number }[],
  numWeeks: number,
  plannedPerWeek: number,
): {
  volData: { value: number; label: string; frontColor: string }[];
  freqData: { value: number; label: string; frontColor: string }[];
} {
  const now = new Date();
  const volumeMap: Record<string, number> = {};
  const countMap: Record<string, number> = {};
  const labels: string[] = [];

  for (let i = numWeeks - 1; i >= 0; i--) {
    const key = toDateStr(getMonday(subDays(now, i * 7)));
    volumeMap[key] = 0;
    countMap[key] = 0;
    labels.push(shortDate(key));
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

export interface WorkoutAnalytics {
  weeklyVolData: { value: number; label: string; frontColor: string }[];
  weeklyFreqData: { value: number; label: string; frontColor: string }[];
  muscleData: { value: number; color: string; text: string }[];
  prCards: { exercise: string; weight_kg: number; reps: number; date: string }[];
  plannedDaysPerWeek: number;
  hasData: boolean;
  uniqueWorkoutDays: number;
}

export function useWorkoutAnalytics() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const profile = useAuthStore((s) => s.profile);

  return useQuery<WorkoutAnalytics>({
    queryKey: ['workout_analytics', userId],
    queryFn: async (): Promise<WorkoutAnalytics> => {
      const now = new Date();
      const d30 = subDays(now, 30);
      const d84 = subDays(now, 84);
      const wDays = profile?.workout_days?.length ?? 3;

      const [sessionRes, prRes] = await Promise.all([
        supabase
          .from('workout_sessions')
          .select('id, started_at, total_volume_kg')
          .eq('user_id', userId!)
          .gte('started_at', d84.toISOString())
          .order('started_at', { ascending: true }),
        supabase
          .from('personal_records')
          .select('exercise_name, weight_kg, reps, achieved_at')
          .eq('user_id', userId!),
      ]);

      if (sessionRes.error) throw sessionRes.error;
      if (prRes.error) throw prRes.error;

      const sessions = sessionRes.data ?? [];
      const { volData, freqData } = buildWeeklySessions(sessions, 12, wDays);

      const last30Sessions = sessions.filter(
        s => s.started_at >= d30.toISOString(),
      );
      const uniqueWorkoutDays = new Set(
        last30Sessions.map(s => s.started_at.split('T')[0]),
      ).size;

      // Phase 2: muscle group breakdown — only if sessions exist in last 30 days
      let muscleData: { value: number; color: string; text: string }[] = [];

      const last30SessionIds = last30Sessions.map(s => s.id);
      if (last30SessionIds.length > 0) {
        const setsRes = await supabase
          .from('workout_sets')
          .select('weight_kg, reps, exercise_id')
          .in('session_id', last30SessionIds);

        if (setsRes.error) throw setsRes.error;

        const exerciseIds = [
          ...new Set((setsRes.data ?? []).map(s => s.exercise_id)),
        ];
        let muscleMap: Record<string, string> = {};

        if (exerciseIds.length > 0) {
          const exRes = await supabase
            .from('exercises')
            .select('id, muscle_group')
            .in('id', exerciseIds);
          if (exRes.error) throw exRes.error;
          muscleMap = Object.fromEntries(
            (exRes.data ?? []).map(e => [e.id, e.muscle_group]),
          );
        }

        const mgVolume: Record<string, number> = {
          push: 0,
          pull: 0,
          legs: 0,
          core: 0,
        };
        (setsRes.data ?? []).forEach(s => {
          const mg = muscleMap[s.exercise_id] ?? 'push';
          mgVolume[mg] = (mgVolume[mg] ?? 0) + s.weight_kg * s.reps;
        });

        const totalVol = Object.values(mgVolume).reduce((a, b) => a + b, 0);
        if (totalVol > 0) {
          muscleData = (
            [
              {
                value: Math.round((mgVolume.push / totalVol) * 100),
                color: colors.brand.primary,
                text: 'Push',
              },
              {
                value: Math.round((mgVolume.pull / totalVol) * 100),
                color: colors.brand.secondary,
                text: 'Pull',
              },
              {
                value: Math.round((mgVolume.legs / totalVol) * 100),
                color: colors.brand.accent,
                text: 'Legs',
              },
              {
                value: Math.round((mgVolume.core / totalVol) * 100),
                color: colors.success,
                text: 'Core',
              },
            ] as { value: number; color: string; text: string }[]
          ).filter(d => d.value > 0);
        }
      }

      // PR cards — top 5 key lifts only
      const keyLifts = [
        'Bench Press',
        'Squat',
        'Deadlift',
        'Overhead Press',
        'Barbell Row',
      ];
      const prMap: Record<
        string,
        { weight_kg: number; reps: number; achieved_at: string }
      > = {};
      (prRes.data ?? []).forEach(pr => {
        if (keyLifts.includes(pr.exercise_name)) prMap[pr.exercise_name] = pr;
      });
      const prCards = keyLifts
        .filter(name => prMap[name])
        .map(name => ({
          exercise: name,
          ...prMap[name]!,
          date: shortDate(prMap[name]!.achieved_at),
        }));

      return {
        weeklyVolData: volData,
        weeklyFreqData: freqData,
        muscleData,
        prCards,
        plannedDaysPerWeek: wDays,
        hasData: sessions.length > 0,
        uniqueWorkoutDays,
      };
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add hooks/useWorkoutAnalytics.ts
git commit -m "feat: add useWorkoutAnalytics TanStack Query hook"
```

---

### Task 5: Refactor progress.tsx

**Files:**
- Modify: `app/(tabs)/profile/progress.tsx` (884 → ~300 lines)

**What to remove:**
- Lines 19–147: all helper functions (`subDays`, `toDateStr`, `getMonday`, `shortDate`, `shortWeek`, `rollingAvg`, `DayNutrition` interface, `buildWeeklyMacros`, `buildWeeklySessions`)
- Lines 232–262: all 20 `useState` declarations
- Lines 264–480: the `useEffect` + entire `loadAnalytics` function

**What stays:** `ScoreRing`, `Section`, `EmptyState`, `Chip`, all JSX sections, `StyleSheet`

- [ ] **Step 1: Replace the entire file content**

```typescript
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
  }, [score]);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  return (
    <Svg width={RING_SIZE} height={RING_SIZE}>
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_R}
        stroke={colors.bg.elevated}
        strokeWidth={16}
        fill="none"
      />
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

  const { data: body, isLoading: bodyLoading } = useBodyAnalytics();
  const { data: nutrition, isLoading: nutritionLoading } = useNutritionAnalytics();
  const { data: workout, isLoading: workoutLoading } = useWorkoutAnalytics();

  const loading = bodyLoading || nutritionLoading || workoutLoading;

  // Consistency score — derived from hook data, no extra fetch
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
              data={body.weightLineData}
              data2={body.weightAvgData}
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
              spacing={CHART_W / Math.max(body.weightLineData.length, 6)}
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
              {body.currentWeight != null && <Chip label={`Current: ${body.currentWeight}kg`} />}
              {body.targetWeight != null && <Chip label={`Target: ${body.targetWeight}kg`} />}
            </View>
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
              data={nutrition.calLineData}
              width={CHART_W}
              height={150}
              color={colors.brand.primary}
              thickness={2}
              dataPointsRadius={3}
              noOfSections={4}
              spacing={CHART_W / Math.max(nutrition.calLineData.length, 15)}
              initialSpacing={8}
              endSpacing={8}
              maxValue={Math.ceil(Math.max(nutrition.calorieGoal * 1.3, ...nutrition.calLineData.map(d => d.value)) / 200) * 200}
              referenceLine1Config={{
                color: colors.brand.accent,
                dashWidth: 4,
                dashGap: 4,
                thickness: 1.5,
              }}
              referenceLine1Position={nutrition.calorieGoal}
              isAnimated
            />
            <Text style={styles.refLineNote}>— Calorie goal ({nutrition.calorieGoal} kcal)</Text>

            <Text style={[styles.chartLabel, { marginTop: spacing.lg }]}>
              Weekly Avg Macros — Protein / Carbs / Fat (g)
            </Text>
            <BarChart
              {...chartCommonProps}
              stackData={nutrition.weeklyMacroStack.map(w => ({
                stacks: w.stackData,
                label: w.label.replace(/[A-Za-z]+ /, ''),
              }))}
              width={CHART_W}
              height={150}
              barWidth={20}
              spacing={CHART_W / Math.max(nutrition.weeklyMacroStack.length * 2, 16) - 10}
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

            {nutrition.showNetCarbs && (
              <>
                <Text style={[styles.chartLabel, { marginTop: spacing.lg }]}>
                  Net Carbs (last 30 days)
                </Text>
                <LineChart
                  {...chartCommonProps}
                  data={nutrition.netCarbsData}
                  width={CHART_W}
                  height={120}
                  color={colors.brand.accent}
                  thickness={2}
                  dataPointsRadius={0}
                  hideDataPoints
                  noOfSections={3}
                  spacing={CHART_W / Math.max(nutrition.netCarbsData.length, 15)}
                  initialSpacing={8}
                  endSpacing={8}
                  isAnimated
                />
              </>
            )}

            {(nutrition.bestNutritionDay || nutrition.worstNutritionDay) && (
              <View style={styles.chipRow}>
                {nutrition.bestNutritionDay && (
                  <Chip label={`Best day: ${nutrition.bestNutritionDay}`} color={colors.success} />
                )}
                {nutrition.worstNutritionDay && (
                  <Chip label={`Watch this: ${nutrition.worstNutritionDay}`} color={colors.error} />
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
              data={workout.weeklyVolData}
              width={CHART_W}
              height={150}
              barWidth={16}
              spacing={CHART_W / Math.max(workout.weeklyVolData.length * 2, 12) - 8}
              initialSpacing={8}
              noOfSections={4}
              isAnimated
            />

            <Text style={[styles.chartLabel, { marginTop: spacing.lg }]}>
              Workouts per Week vs. Goal ({workout.plannedDaysPerWeek}×/week)
            </Text>
            <BarChart
              {...chartCommonProps}
              data={workout.weeklyFreqData}
              width={CHART_W}
              height={120}
              barWidth={16}
              spacing={CHART_W / Math.max(workout.weeklyFreqData.length * 2, 12) - 8}
              initialSpacing={8}
              noOfSections={Math.max(workout.plannedDaysPerWeek, 3)}
              maxValue={Math.max(workout.plannedDaysPerWeek + 1, 7)}
              referenceLine1Position={workout.plannedDaysPerWeek}
              referenceLine1Config={{ color: colors.brand.primary, dashWidth: 4, dashGap: 4, thickness: 1.5 }}
              isAnimated
            />

            {workout.muscleData.length > 0 && (
              <>
                <Text style={[styles.chartLabel, { marginTop: spacing.lg }]}>
                  Volume by Muscle Group (last 30 days)
                </Text>
                <View style={styles.pieRow}>
                  <PieChart
                    donut
                    data={workout.muscleData}
                    radius={70}
                    innerRadius={45}
                    centerLabelComponent={() => (
                      <Text style={styles.pieCenter}>30d</Text>
                    )}
                  />
                  <View style={styles.pieLegend}>
                    {workout.muscleData.map(d => (
                      <View key={d.text} style={styles.pieLegendRow}>
                        <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                        <Text style={styles.legendText}>{d.text} {d.value}%</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}

            {workout.prCards.length > 0 && (
              <>
                <Text style={[styles.chartLabel, { marginTop: spacing.lg }]}>
                  Personal Records
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.prCardRow}>
                    {workout.prCards.map(pr => (
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
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Run the test suite**

Run: `npx jest --passWithNoTests`
Expected: 29 tests passing, 0 failing

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/profile/progress.tsx
git commit -m "refactor: progress screen uses useBodyAnalytics, useNutritionAnalytics, useWorkoutAnalytics hooks"
```
