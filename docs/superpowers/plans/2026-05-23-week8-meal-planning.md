# Week 8 — Meal Planning Wire-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Register four existing nutrition screens in the Stack navigator and replace the one remaining raw `supabase` call in `grocery.tsx` with a TanStack Query hook.

**Architecture:** Three files change. `_layout.tsx` adds four `Stack.Screen` entries. `useMealPlan.ts` gains one new `useMealPlanById` export. `grocery.tsx` drops the raw `supabase` call and its import, adding the hook instead. No new screens, no new UI.

**Tech Stack:** Expo Router (Stack), TanStack Query (`useQuery`), Supabase JS client, TypeScript strict mode.

---

## Files

| File | Change |
|------|--------|
| `app/(tabs)/nutrition/_layout.tsx` | Add 4 `Stack.Screen` registrations |
| `hooks/useMealPlan.ts` | Add `useMealPlanById` export at end of file |
| `app/(tabs)/nutrition/grocery.tsx` | Remove raw supabase call, add `useMealPlanById` |

---

### Task 1: Register missing screens in nutrition layout

**Files:**
- Modify: `app/(tabs)/nutrition/_layout.tsx`

The current file only registers 6 screens. Four more screens exist and are navigated to from `index.tsx` but are invisible to the Stack navigator. This causes missing header/back-button management.

- [ ] **Step 1: Read the current layout**

Open `app/(tabs)/nutrition/_layout.tsx`. The full current content is:

```typescript
import { Stack } from 'expo-router';

export default function NutritionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="log" />
      <Stack.Screen name="search" />
      <Stack.Screen name="food/[id]" />
      <Stack.Screen name="barcode" />
      <Stack.Screen name="goals" />
    </Stack>
  );
}
```

- [ ] **Step 2: Add the four missing registrations**

Replace the file with:

```typescript
import { Stack } from 'expo-router';

export default function NutritionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="log" />
      <Stack.Screen name="search" />
      <Stack.Screen name="food/[id]" />
      <Stack.Screen name="barcode" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="fasting" />
      <Stack.Screen name="mealplan" />
      <Stack.Screen name="grocery" />
      <Stack.Screen name="mealbuilder" />
    </Stack>
  );
}
```

- [ ] **Step 3: Run TypeScript check**

```
cd mayari && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (zero errors).

- [ ] **Step 4: Run tests**

```
npm test
```

Expected: `Tests: 29 passed, 29 total`

- [ ] **Step 5: Commit**

```bash
git add app/(tabs)/nutrition/_layout.tsx
git commit -m "feat(nutrition): register fasting, mealplan, grocery, mealbuilder in layout"
```

---

### Task 2: Add useMealPlanById hook

**Files:**
- Modify: `hooks/useMealPlan.ts`

`grocery.tsx` needs to fetch a meal plan by its primary key (not by user+week). No existing hook does this. Add it as a new export at the end of `useMealPlan.ts`, before the `useDebounce` utility.

- [ ] **Step 1: Open `hooks/useMealPlan.ts` and navigate to the end**

The file ends at line 421 with:
```typescript
// ─── Debounce hook ────────────────────────────────────────────────────────────

export function useDebounce(fn: (...args: unknown[]) => void, delay: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (...args: unknown[]) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fn(...args), delay);
  };
}
```

- [ ] **Step 2: Insert `useMealPlanById` before `useDebounce`**

Add this block immediately before the `// ─── Debounce hook` comment:

```typescript
// ─── Fetch single plan by ID ─────────────────────────────────────────────────

export function useMealPlanById(planId: string | null) {
  return useQuery<Pick<MealPlan, 'id' | 'plan_data'> | null>({
    queryKey: ['meal_plan_by_id', planId],
    queryFn: async () => {
      if (!planId) return null;
      const { data, error } = await supabase
        .from('meal_plans')
        .select('plan_data, id')
        .eq('id', planId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!planId,
    staleTime: 300_000,
  });
}

```

Note: `userId` is not needed — `planId` already identifies a unique row. `enabled: !!planId` ensures the query never fires when called with `null`.

- [ ] **Step 3: Run TypeScript check**

```
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (zero errors).

- [ ] **Step 4: Run tests**

```
npm test
```

Expected: `Tests: 29 passed, 29 total`

- [ ] **Step 5: Commit**

```bash
git add hooks/useMealPlan.ts
git commit -m "feat(useMealPlan): add useMealPlanById hook"
```

---

### Task 3: Refactor grocery.tsx — replace raw supabase call

**Files:**
- Modify: `app/(tabs)/nutrition/grocery.tsx`

`grocery.tsx` imports `supabase` directly and calls it in an async `loadFromPlan` function. Replace with `useMealPlanById`, which returns the same data reactively. The `useEffect` is updated to watch the hook's `data` instead of awaiting a manual fetch.

- [ ] **Step 1: Update the import block at the top of `grocery.tsx`**

Current lines 9–15:
```typescript
import {
  useLatestGroceryList, useUpsertGroceryList,
  generateGroceryItems, categorizeItem,
} from '../../../hooks/useMealPlan';
import { supabase } from '../../../lib/supabase';
import { colors, typography, spacing } from '../../../constants/theme';
import type { GroceryItem, GroceryCategory, MealPlanData } from '../../../types/database';
```

Replace with (remove `supabase`, add `useMealPlanById`):
```typescript
import {
  useLatestGroceryList, useUpsertGroceryList,
  useMealPlanById, generateGroceryItems, categorizeItem,
} from '../../../hooks/useMealPlan';
import { colors, typography, spacing } from '../../../constants/theme';
import type { GroceryItem, GroceryCategory, MealPlanData } from '../../../types/database';
```

- [ ] **Step 2: Add the hook call inside `GroceryScreen`**

Inside the component function, after the existing hook calls (around line 56), add:

```typescript
const { data: mealPlanForGrocery } = useMealPlanById(meal_plan_id ?? null);
```

The relevant block currently looks like:
```typescript
const { data: existingList, isLoading, refetch } = useLatestGroceryList();
const upsertList = useUpsertGroceryList();
```

Add the new hook on the next line:
```typescript
const { data: existingList, isLoading, refetch } = useLatestGroceryList();
const upsertList = useUpsertGroceryList();
const { data: mealPlanForGrocery } = useMealPlanById(meal_plan_id ?? null);
```

- [ ] **Step 3: Replace the useEffect**

Current `useEffect` (lines 70–82) plus `loadFromPlan` function (lines 84–91):

```typescript
useEffect(() => {
  if (isLoading) return;
  if (meal_plan_id && isFirstLoad.current) {
    isFirstLoad.current = false;
    loadFromPlan(meal_plan_id);
    return;
  }
  if (existingList && isFirstLoad.current) {
    isFirstLoad.current = false;
    setGroceryId(existingList.id);
    setItems(existingList.items);
  }
}, [isLoading, existingList, meal_plan_id]);

async function loadFromPlan(planId: string) {
  const { data } = await supabase.from('meal_plans').select('plan_data, id').eq('id', planId).single();
  if (!data) return;
  const generated = generateGroceryItems(data.plan_data as MealPlanData);
  setGroceryId(existingList?.id ?? null);
  setItems(generated);
  scheduleSave(existingList?.id ?? null, planId, generated);
}
```

Replace both blocks with just the updated `useEffect` (no `loadFromPlan` function):

```typescript
useEffect(() => {
  if (isLoading) return;
  if (meal_plan_id && mealPlanForGrocery && isFirstLoad.current) {
    isFirstLoad.current = false;
    const generated = generateGroceryItems(mealPlanForGrocery.plan_data as MealPlanData);
    setGroceryId(existingList?.id ?? null);
    setItems(generated);
    scheduleSave(existingList?.id ?? null, meal_plan_id, generated);
    return;
  }
  if (existingList && isFirstLoad.current) {
    isFirstLoad.current = false;
    setGroceryId(existingList.id);
    setItems(existingList.items);
  }
}, [isLoading, existingList, meal_plan_id, mealPlanForGrocery]);
```

- [ ] **Step 4: Run TypeScript check**

```
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (zero errors). If you see `supabase` import unused errors, confirm the import was removed in Step 1.

- [ ] **Step 5: Run tests**

```
npm test
```

Expected: `Tests: 29 passed, 29 total`

- [ ] **Step 6: Commit**

```bash
git add app/(tabs)/nutrition/grocery.tsx
git commit -m "refactor(grocery): replace raw supabase call with useMealPlanById"
```
