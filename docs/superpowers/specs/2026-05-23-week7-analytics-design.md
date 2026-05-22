# Week 7 — Advanced Analytics: TanStack Query Hook Extraction

## Goal

`progress.tsx` (884 lines) already implements the complete 4-section analytics dashboard (body weight, nutrition trends, workout analytics, consistency score). The gap is identical to Weeks 5 and 6: data-fetching lives in a monolithic `loadAnalytics` function with raw `supabase` calls and 20+ `useState` hooks instead of TanStack Query. This spec covers extracting that logic into three domain hooks and refactoring the screen to use them.

## Architecture

Three new hook files follow the single-responsibility pattern established in `useBuddies.ts`, `useBodyMeasurements.ts`, `useFasting.ts`, etc. Each hook fetches, transforms, and returns chart-ready data for its section. The screen swaps the entire `loadAnalytics` block for three hook calls. `ScoreRing`, `Section`, `EmptyState`, `Chip`, and the `StyleSheet` stay in `progress.tsx` — they are only used there and don't warrant extraction.

## Files

### Created
- `hooks/useBodyAnalytics.ts` — body_measurements query + rolling average, weight delta, chart arrays
- `hooks/useNutritionAnalytics.ts` — food_logs query + daily macro aggregation, calorie chart, net carbs, best/worst day chips
- `hooks/useWorkoutAnalytics.ts` — workout_sessions, conditional workout_sets + exercises, personal_records; returns chart arrays, muscle pie data, PR cards

### Modified
- `app/(tabs)/profile/progress.tsx` — remove `loadAnalytics`, all `useState` declarations, and `useEffect`; replace with three hook calls; 884 → ~300 lines

---

## hooks/useBodyAnalytics.ts

### useBodyAnalytics()
- `useQuery` fetching from `body_measurements` where `weight_kg IS NOT NULL`, last 90 days, ordered ascending
- `queryKey: ['body_analytics', userId]`
- `enabled: !!userId`
- `staleTime: 300_000` (body data changes at most once a day)
- `targetWeight` read from `useAuthStore` profile (already in client state — no extra query)
- Returns:
  - `weightLineData: { value: number; label?: string }[]` — downsampled to ≤12 points, label every 3rd
  - `weightAvgData: { value: number }[]` — 7-point rolling average over sampled points
  - `weightChange30: number | null` — last minus first within last 30 days; null if <2 points
  - `currentWeight: number | null` — last entry's weight_kg
  - `targetWeight: number | null` — from profile
  - `hasData: boolean` — true when ≥2 raw data points

---

## hooks/useNutritionAnalytics.ts

### useNutritionAnalytics()
- `useQuery` fetching from `food_logs` with join `food_item:food_items(calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g)`, last 56 days
- `queryKey: ['nutrition_analytics', userId]`
- `enabled: !!userId`
- `staleTime: 300_000`
- `calorieGoal` and `net_carbs_display` read from `useAuthStore` profile (no extra query)
- Returns:
  - `calLineData: { value: number; dataPointColor?: string }[]` — 30 entries, green ≤ goal / red > goal
  - `weeklyMacroStack` — 8-week stacked bar data (protein / carbs / fat avg per week)
  - `netCarbsData: { value: number }[]` — 30-day net carbs (carbs − fiber, floored at 0)
  - `showNetCarbs: boolean` — from profile
  - `calorieGoal: number` — from profile, default 2000
  - `bestNutritionDay: string | null` — short date label of highest-protein day within goal
  - `worstNutritionDay: string | null` — short date label of most-over-goal day
  - `hasData: boolean` — true when ≥3 logged days in last 30
  - `nutritionDays: number` — count of days with ≥3 meal slots logged (used for consistency score)

---

## hooks/useWorkoutAnalytics.ts

### useWorkoutAnalytics()
- Two-phase fetch (all inside one `queryFn`):
  1. `workout_sessions` (last 84 days) + `personal_records` (all-time) in `Promise.all`
  2. If sessions exist in last 30 days: `workout_sets` for those session IDs → `exercises` for those exercise IDs (sequential)
- `queryKey: ['workout_analytics', userId]`
- `enabled: !!userId`
- `staleTime: 60_000` (workout data updates during active sessions)
- `plannedDaysPerWeek` read from `useAuthStore` profile (`profile.workout_days.length`)
- Returns:
  - `weeklyVolData: { value: number; label: string; frontColor: string }[]` — 12 weeks of total volume
  - `weeklyFreqData: { value: number; label: string; frontColor: string }[]` — 12 weeks of session count, green ≥ goal / red < goal
  - `muscleData: { value: number; color: string; text: string }[]` — push/pull/legs/core % of volume, last 30 days; empty array if no sets
  - `prCards: { exercise: string; weight_kg: number; reps: number; date: string }[]` — top 5 key lifts (Bench Press, Squat, Deadlift, Overhead Press, Barbell Row)
  - `plannedDaysPerWeek: number` — from profile, default 3
  - `hasData: boolean` — true when ≥1 session
  - `uniqueWorkoutDays: number` — count of distinct workout days in last 30 (used for consistency score)

---

## Screen Refactor — progress.tsx

### Remove
- Lines 232–262: all 20 `useState` declarations (body, nutrition, workout, consistency state)
- Lines 264–267: `useEffect` calling `loadAnalytics`
- Lines 269–480: entire `loadAnalytics` function

### Add
```typescript
const { data: body, isLoading: bodyLoading } = useBodyAnalytics();
const { data: nutrition, isLoading: nutritionLoading } = useNutritionAnalytics();
const { data: workout, isLoading: workoutLoading } = useWorkoutAnalytics();
const loading = bodyLoading || nutritionLoading || workoutLoading;
```

### Consistency Score (stays in screen)
```typescript
const wRaw = Math.min(50, ((workout?.uniqueWorkoutDays ?? 0) / ((workout?.plannedDaysPerWeek ?? 3) * 4)) * 50);
const nRaw = Math.min(50, ((nutrition?.nutritionDays ?? 0) / 30) * 50);
const totalScore = Math.min(100, Math.round(wRaw + nRaw));
const wScore = Math.round((wRaw / 50) * 100);
const nScore = Math.round((nRaw / 50) * 100);
```

### Each section reads from its hook
- Body section: `body?.hasData`, `body?.weightLineData ?? []`, `body?.weightAvgData ?? []`, etc.
- Nutrition section: `nutrition?.hasData`, `nutrition?.calLineData ?? []`, `nutrition?.showNetCarbs`, etc.
- Workout section: `workout?.hasData`, `workout?.weeklyVolData ?? []`, `workout?.muscleData ?? []`, etc.
- Consistency section: `totalScore`, `wScore`, `nScore` computed inline as above

---

## Out of Scope

- New charts or UI features — the existing dashboard is complete; this is a refactor only
- Time range toggles (7d/30d/90d) — not in Week 7 scope
- Splitting `ScoreRing`, `Section`, `EmptyState`, `Chip` into separate files — only used in progress.tsx; YAGNI
- New tests — no standalone pure functions extracted; existing 29 tests remain the suite
- `useBodyMeasurements.ts` — untouched; returns raw `BodyMeasurement[]` for measurements screen; analytics hooks need chart-ready data
