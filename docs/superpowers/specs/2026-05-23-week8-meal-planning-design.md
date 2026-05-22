# Week 8 — Meal Planning: Navigation Wire-Up + Hook Extraction

## Goal

`mealplan.tsx` (654 lines), `grocery.tsx` (298 lines), `fasting.tsx`, and `mealbuilder.tsx` are all fully implemented and already use TanStack Query hooks from `useMealPlan.ts`. The gap is identical to Weeks 5–7: screens are not registered in `_layout.tsx` so the Stack navigator cannot manage their headers or back-button state, and `grocery.tsx` has one raw `supabase` call that bypasses the hook layer. This spec covers registering the four screens and extracting the remaining raw call into a hook.

## Architecture

Three files change. No new screens, no new UI.

### Modified
- `app/(tabs)/nutrition/_layout.tsx` — add `fasting`, `mealplan`, `grocery`, `mealbuilder` to the Stack
- `hooks/useMealPlan.ts` — add `useMealPlanById(planId: string | null)` export
- `app/(tabs)/nutrition/grocery.tsx` — replace `loadFromPlan` raw supabase call with `useMealPlanById`; remove `supabase` import

---

## app/(tabs)/nutrition/_layout.tsx

Add four `Stack.Screen` registrations (all with default `headerShown: false` inherited from `screenOptions`):

```typescript
<Stack.Screen name="fasting" />
<Stack.Screen name="mealplan" />
<Stack.Screen name="grocery" />
<Stack.Screen name="mealbuilder" />
```

---

## hooks/useMealPlan.ts — useMealPlanById

New export added to the existing file:

```typescript
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

- No `userId` needed — plan ID already scopes the row
- QueryKey `['meal_plan_by_id', planId]` follows the existing `[entityType, ...params]` pattern
- `staleTime: 300_000` (5 min) — plan data changes rarely; matches `useLatestGroceryList`

---

## app/(tabs)/nutrition/grocery.tsx — Refactor

### Remove
- `import { supabase } from '../../../lib/supabase'`
- The `loadFromPlan(planId: string)` async function

### Add
```typescript
import { useMealPlanById } from '../../../hooks/useMealPlan';

const { data: mealPlanForGrocery } = useMealPlanById(meal_plan_id ?? null);
```

### Update useEffect
Replace the effect that calls `loadFromPlan` with one that watches `mealPlanForGrocery`:

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

All other grocery.tsx logic (checklist, share, add-item modal, debounced save) is untouched.

---

## Out of Scope

- No changes to `mealplan.tsx`, `mealbuilder.tsx`, or `fasting.tsx` — they work as-is
- No new screens, charts, or UI features
- Week 9 (AI Meal Builder) will wire the Edge Function backend for `mealbuilder.tsx`; the screen is registered here but its AI calls may gracefully fail until then
- No new tests — no pure functions extracted; existing 29 tests remain the suite
