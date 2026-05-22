# Week 6 — Social: TanStack Query Hooks + Screen Refactors

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract raw supabase data-fetching from the buddy and measurement screens into proper TanStack Query hooks, bringing Week 6 screens in line with the rest of the codebase.

**Architecture:** Two new hook files (`useBuddies.ts`, `useBodyMeasurements.ts`) follow the pattern established by `useFasting.ts`. Each screen's raw `useEffect`/`useCallback`/`supabase` block is replaced with a hook call. The Realtime chat screen and the 884-line progress screen are untouched. A TypeScript route error in `nutrition/search.tsx` is fixed as a bonus.

**Tech Stack:** TanStack Query `useQuery`/`useMutation`, Zustand `useAuthStore`, Supabase JS client, TypeScript strict.

---

## Files

### Created
- `hooks/useBuddies.ts` — `useFindNearbyUsers`, `useBuddyRequests`, `useBuddyConnections`, `useSendBuddyRequest`, `useAcceptRequest`, `useDeclineRequest`
- `hooks/useBodyMeasurements.ts` — `useMeasurements`, `useAddMeasurement`

### Modified
- `app/(tabs)/profile/buddies/find.tsx` — replace `fetchNearby` + `sendRequest` with hooks
- `app/(tabs)/profile/buddies/list.tsx` — replace `load` + inline mutations with hooks
- `app/(tabs)/profile/measurements.tsx` — replace `loadHistory` + `upsert` with hooks
- `app/(tabs)/nutrition/search.tsx` — fix TypeScript route error (one line)

---

## Task 1: Create hooks/useBuddies.ts

**Files:**
- Create: `hooks/useBuddies.ts`

- [ ] **Step 1: Create the file**

Create `hooks/useBuddies.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { NearbyUser, BuddyRequest, BuddyConnection, PrimaryGoal } from '../types/database';

export interface RequestWithUser extends BuddyRequest {
  user: { id: string; display_name: string; avatar_url: string | null; primary_goal: string };
}

export interface ConnectionWithUser extends BuddyConnection {
  other_user: { id: string; display_name: string; avatar_url: string | null; primary_goal: string };
}

export function useFindNearbyUsers(
  coords: { lat: number; lng: number } | null,
  radiusM: number,
  goalFilter: PrimaryGoal | null
) {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery<NearbyUser[]>({
    queryKey: ['nearby_users', userId, coords?.lat, coords?.lng, radiusM, goalFilter],
    queryFn: async () => {
      if (!userId || !coords) return [];
      const { data, error } = await supabase.rpc('find_nearby_users', {
        my_lat: coords.lat,
        my_lng: coords.lng,
        radius_m: radiusM,
        my_user_id: userId,
        goal_filter: goalFilter,
      });
      if (error) throw error;
      return (data ?? []) as NearbyUser[];
    },
    enabled: !!userId && !!coords,
    staleTime: 60_000,
  });
}

export function useBuddyRequests() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery<{ incoming: RequestWithUser[]; outgoing: RequestWithUser[] }>({
    queryKey: ['buddy_requests', userId],
    queryFn: async () => {
      if (!userId) return { incoming: [], outgoing: [] };
      const [incomingRes, outgoingRes] = await Promise.all([
        supabase
          .from('buddy_requests')
          .select('*, user:sender_id(id, display_name, avatar_url, primary_goal)')
          .eq('receiver_id', userId)
          .eq('status', 'pending'),
        supabase
          .from('buddy_requests')
          .select('*, user:receiver_id(id, display_name, avatar_url, primary_goal)')
          .eq('sender_id', userId)
          .eq('status', 'pending'),
      ]);
      if (incomingRes.error) throw incomingRes.error;
      if (outgoingRes.error) throw outgoingRes.error;
      return {
        incoming: (incomingRes.data ?? []) as RequestWithUser[],
        outgoing: (outgoingRes.data ?? []) as RequestWithUser[],
      };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useBuddyConnections() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery<ConnectionWithUser[]>({
    queryKey: ['buddy_connections', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data: connections, error } = await supabase
        .from('buddy_connections')
        .select('*')
        .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);
      if (error) throw error;

      const connectionIds = (connections ?? []).map(c =>
        c.user_a_id === userId ? c.user_b_id : c.user_a_id
      );
      if (connectionIds.length === 0) return [];

      const { data: buddyUsers } = await supabase
        .from('users')
        .select('id, display_name, avatar_url, primary_goal')
        .in('id', connectionIds);

      const userMap: Record<string, { id: string; display_name: string; avatar_url: string | null; primary_goal: string }> = {};
      (buddyUsers ?? []).forEach(u => { userMap[u.id] = u; });

      return (connections ?? []).map(c => ({
        ...c,
        other_user: userMap[c.user_a_id === userId ? c.user_b_id : c.user_a_id] ?? {
          id: '', display_name: 'Unknown', avatar_url: null, primary_goal: 'build_muscle',
        },
      })) as ConnectionWithUser[];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useSendBuddyRequest() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (receiverId: string) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase.from('buddy_requests').insert({
        sender_id: userId,
        receiver_id: receiverId,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['buddy_requests', userId] }),
  });
}

export function useAcceptRequest() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, senderId }: { requestId: string; senderId: string }) => {
      const { error: connError } = await supabase.from('buddy_connections').insert({
        user_a_id: userId,
        user_b_id: senderId,
      });
      if (connError && !connError.message.includes('duplicate')) throw connError;
      const { error: reqError } = await supabase
        .from('buddy_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);
      if (reqError) throw reqError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buddy_requests', userId] });
      queryClient.invalidateQueries({ queryKey: ['buddy_connections', userId] });
    },
  });
}

export function useDeclineRequest() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('buddy_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['buddy_requests', userId] }),
  });
}
```

- [ ] **Step 2: Verify TypeScript — no errors**

```bash
npx tsc --noEmit 2>&1 | grep "useBuddies"
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add hooks/useBuddies.ts
git commit -m "feat: add useBuddies TanStack Query hooks"
```

---

## Task 2: Refactor buddies/find.tsx

**Files:**
- Modify: `app/(tabs)/profile/buddies/find.tsx`

The current file fetches nearby users via a raw `supabase.rpc` call inside a `useCallback` + `useEffect` combo, and sends requests via a raw insert. Replace both with `useFindNearbyUsers` and `useSendBuddyRequest`.

- [ ] **Step 1: Update imports**

Replace the first two import lines:

```typescript
import { useState, useEffect, useCallback } from 'react';
```

With:

```typescript
import { useState, useEffect } from 'react';
```

After the existing `import Button` line, add:

```typescript
import { useFindNearbyUsers, useSendBuddyRequest } from '../../../../hooks/useBuddies';
```

- [ ] **Step 2: Replace state + fetchNearby + second useEffect**

In `BuddyFinderScreen`, find and remove these three lines of state:

```typescript
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<NearbyUser[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
```

And remove the entire `fetchNearby` useCallback (lines starting `const fetchNearby = useCallback(async (lat: number, lng: number)` through its closing `}, [radius, goalFilter]);`).

And remove the second `useEffect`:

```typescript
  useEffect(() => {
    if (myCoords) fetchNearby(myCoords.lat, myCoords.lng);
  }, [radius, goalFilter, myCoords]);
```

Replace all of that with these four lines, placed right after `const [myCoords, setMyCoords] = useState`:

```typescript
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const { data: users = [], isFetching } = useFindNearbyUsers(myCoords, radius, goalFilter);
  const sendRequest = useSendBuddyRequest();
```

- [ ] **Step 3: Remove the raw sendRequest function**

Remove the entire `async function sendRequest` block:

```typescript
  async function sendRequest(targetUserId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('buddy_requests').insert({
      sender_id: user.id,
      receiver_id: targetUserId,
      status: 'pending',
    });
    if (error) { Alert.alert('Error', error.message); return; }
    setSentRequests(prev => new Set([...prev, targetUserId]));
  }
```

- [ ] **Step 4: Update the render — loading indicator and Connect button**

Replace `loading` with `isFetching`:

```typescript
      {isFetching ? (
        <ActivityIndicator color={colors.brand.primary} style={styles.listLoader} />
      ) : (
```

Replace the `TouchableOpacity` for the Connect button:

```typescript
                <TouchableOpacity
                  style={[styles.requestBtn, sent && styles.requestBtnSent]}
                  onPress={() => {
                    if (sent) return;
                    sendRequest.mutate(item.id, {
                      onSuccess: () => setSentRequests(prev => new Set([...prev, item.id])),
                      onError: (e) => Alert.alert('Error', e instanceof Error ? e.message : 'Could not send request.'),
                    });
                  }}
                  disabled={sent || sendRequest.isPending}
                >
```

- [ ] **Step 5: Verify TypeScript — no errors**

```bash
npx tsc --noEmit 2>&1 | grep "buddies/find"
```
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/profile/buddies/find.tsx"
git commit -m "refactor: buddy finder uses useFindNearbyUsers and useSendBuddyRequest"
```

---

## Task 3: Refactor buddies/list.tsx

**Files:**
- Modify: `app/(tabs)/profile/buddies/list.tsx`

The current file fetches requests and connections in a `load` useCallback and handles accept/decline with raw supabase calls. Replace with `useBuddyRequests`, `useBuddyConnections`, `useAcceptRequest`, `useDeclineRequest`.

- [ ] **Step 1: Update imports**

Replace:

```typescript
import { useState, useEffect, useCallback } from 'react';
```

With:

```typescript
import { useState } from 'react';
```

Replace:

```typescript
import { supabase } from '../../../../lib/supabase';
```

With:

```typescript
import { useBuddyRequests, useBuddyConnections, useAcceptRequest, useDeclineRequest } from '../../../../hooks/useBuddies';
import type { RequestWithUser, ConnectionWithUser } from '../../../../hooks/useBuddies';
```

Remove the local `interface RequestWithUser` and `interface ConnectionWithUser` definitions (they are now exported from the hook file).

- [ ] **Step 2: Replace state + load + useEffect in the component**

Remove these state declarations:

```typescript
  const [incoming, setIncoming] = useState<RequestWithUser[]>([]);
  const [outgoing, setOutgoing] = useState<RequestWithUser[]>([]);
  const [connections, setConnections] = useState<ConnectionWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
```

Remove the entire `load` useCallback (the large block starting `const load = useCallback(async () => {`).

Remove `useEffect(() => { load(); }, [load]);`.

Add these lines in their place, right after `const [outgoingExpanded, setOutgoingExpanded] = useState(false);`:

```typescript
  const { data: requestsData, isLoading: loading } = useBuddyRequests();
  const incoming = requestsData?.incoming ?? [];
  const outgoing = requestsData?.outgoing ?? [];
  const { data: connections = [] } = useBuddyConnections();
  const acceptMutation = useAcceptRequest();
  const declineMutation = useDeclineRequest();
```

- [ ] **Step 3: Rewrite acceptRequest and declineRequest**

Remove the existing `async function acceptRequest` and `async function declineRequest` blocks entirely.

Add these two functions in their place:

```typescript
  function acceptRequest(requestId: string, senderId: string) {
    acceptMutation.mutate(
      { requestId, senderId },
      { onError: (e) => Alert.alert('Error', e instanceof Error ? e.message : 'Could not accept request.') }
    );
  }

  function declineRequest(requestId: string) {
    declineMutation.mutate(
      requestId,
      { onError: (e) => Alert.alert('Error', e instanceof Error ? e.message : 'Could not decline request.') }
    );
  }
```

- [ ] **Step 4: Update Button disabled states in JSX**

Find the Accept and Decline buttons and add `disabled` prop:

```typescript
                <Button
                  label="Accept"
                  onPress={() => acceptRequest(item.id, item.sender_id)}
                  style={styles.acceptBtn}
                  disabled={acceptMutation.isPending || declineMutation.isPending}
                />
                <Button
                  label="Decline"
                  variant="outline"
                  onPress={() => declineRequest(item.id)}
                  style={styles.declineBtn}
                  disabled={acceptMutation.isPending || declineMutation.isPending}
                />
```

- [ ] **Step 5: Verify TypeScript — no errors**

```bash
npx tsc --noEmit 2>&1 | grep "buddies/list"
```
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/profile/buddies/list.tsx"
git commit -m "refactor: buddy list uses useBuddyRequests, useBuddyConnections, and mutation hooks"
```

---

## Task 4: Create hooks/useBodyMeasurements.ts

**Files:**
- Create: `hooks/useBodyMeasurements.ts`

- [ ] **Step 1: Create the file**

Create `hooks/useBodyMeasurements.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { BodyMeasurement } from '../types/database';

export function useMeasurements() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery<BodyMeasurement[]>({
    queryKey: ['measurements', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', userId)
        .order('measured_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as BodyMeasurement[];
    },
    enabled: !!userId,
    staleTime: 300_000,
  });
}

export function useAddMeasurement() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<BodyMeasurement, 'id' | 'user_id'>) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('body_measurements')
        .upsert({ ...payload, user_id: userId }, { onConflict: 'user_id,measured_at' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['measurements', userId] }),
  });
}
```

- [ ] **Step 2: Verify TypeScript — no errors**

```bash
npx tsc --noEmit 2>&1 | grep "useBodyMeasurements"
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add hooks/useBodyMeasurements.ts
git commit -m "feat: add useBodyMeasurements TanStack Query hook"
```

---

## Task 5: Refactor measurements.tsx

**Files:**
- Modify: `app/(tabs)/profile/measurements.tsx`

The current file fetches measurement history with a `loadHistory` useCallback and saves with a raw `upsert` function. Replace both with `useMeasurements` and `useAddMeasurement`.

- [ ] **Step 1: Update imports**

Replace:

```typescript
import { useState, useEffect, useCallback } from 'react';
```

With:

```typescript
import { useState } from 'react';
```

Replace:

```typescript
import { supabase } from '../../../lib/supabase';
```

With:

```typescript
import { useMeasurements, useAddMeasurement } from '../../../hooks/useBodyMeasurements';
```

- [ ] **Step 2: Replace state + loadHistory + useEffect in the component**

Remove these state declarations:

```typescript
  const [history, setHistory] = useState<BodyMeasurement[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [saving, setSaving] = useState(false);
```

Remove the entire `loadHistory` useCallback block.

Remove `useEffect(() => { loadHistory(); }, [loadHistory]);`.

Add in their place, right after `const [editingDate, setEditingDate] = useState<string | null>(null);`:

```typescript
  const { data: history = [], isLoading: loadingHistory } = useMeasurements();
  const addMeasurement = useAddMeasurement();
```

- [ ] **Step 3: Rewrite save and upsert**

Remove the existing `async function save()` and `async function upsert()` blocks entirely.

Add these two functions in their place:

```typescript
  function save() {
    if (!form.weight_kg.trim()) {
      Alert.alert('Weight required', 'Please enter your weight to save a measurement.');
      return;
    }
    const targetDate = editingDate ?? todayStr();
    const existing = history.find(m => m.measured_at === targetDate);
    if (!editingDate && existing) {
      Alert.alert(
        'Entry exists',
        'You already have a measurement for today. Update it?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Update', onPress: () => doSave(targetDate) },
        ]
      );
      return;
    }
    doSave(targetDate);
  }

  function doSave(targetDate: string) {
    const payload = {
      measured_at: targetDate,
      weight_kg: form.weight_kg.trim() ? parseFloat(form.weight_kg) : null,
      body_fat_pct: form.body_fat_pct.trim() ? parseFloat(form.body_fat_pct) : null,
      waist_cm: form.waist_cm.trim() ? parseFloat(form.waist_cm) : null,
      chest_cm: form.chest_cm.trim() ? parseFloat(form.chest_cm) : null,
      arms_cm: form.arms_cm.trim() ? parseFloat(form.arms_cm) : null,
      legs_cm: form.legs_cm.trim() ? parseFloat(form.legs_cm) : null,
    };
    addMeasurement.mutate(payload, {
      onSuccess: resetForm,
      onError: (e) => Alert.alert('Error', e instanceof Error ? e.message : 'Could not save measurement.'),
    });
  }
```

- [ ] **Step 4: Update the Save button loading prop**

Find the Save button and replace `loading={saving}` with `loading={addMeasurement.isPending}`:

```typescript
          <Button
            label={editingDate ? 'Update Entry' : 'Save Measurement'}
            onPress={save}
            loading={addMeasurement.isPending}
            style={editingDate ? styles.halfBtn : styles.fullBtn}
          />
```

- [ ] **Step 5: Remove unused BodyMeasurement import if no longer needed**

Check if `BodyMeasurement` is still imported from `types/database`. Since `useMeasurements` returns typed `BodyMeasurement[]` and `selectHistoryRow` takes a `BodyMeasurement` param, keep the import:

```typescript
import type { BodyMeasurement } from '../../../types/database';
```

- [ ] **Step 6: Verify TypeScript — no errors**

```bash
npx tsc --noEmit 2>&1 | grep "measurements"
```
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add "app/(tabs)/profile/measurements.tsx" hooks/useBodyMeasurements.ts
git commit -m "refactor: measurements screen uses useMeasurements and useAddMeasurement hooks"
```

---

## Task 6: Fix TypeScript error in nutrition/search.tsx

**Files:**
- Modify: `app/(tabs)/nutrition/search.tsx`

- [ ] **Step 1: Add `as never` cast to the `food/add` route**

In `app/(tabs)/nutrition/search.tsx`, find the `goAddCustom` function:

```typescript
  function goAddCustom() {
    router.push({
      pathname: '/(tabs)/nutrition/food/add',
      params: { meal_slot, date, context, week_start_date, plan_day, origin },
    });
  }
```

Replace with:

```typescript
  function goAddCustom() {
    router.push({
      pathname: '/(tabs)/nutrition/food/add',
      params: { meal_slot, date, context, week_start_date, plan_day, origin },
    } as never);
  }
```

- [ ] **Step 2: Verify the error is gone**

```bash
npx tsc --noEmit 2>&1 | grep "search.tsx"
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/nutrition/search.tsx"
git commit -m "fix: suppress Expo Router typed-routes false positive on food/add route"
```

---

## Self-Review

**Spec coverage:**
- ✅ `hooks/useBuddies.ts` — Task 1 (6 exports)
- ✅ `hooks/useBodyMeasurements.ts` — Task 4 (2 exports)
- ✅ `buddies/find.tsx` refactor — Task 2
- ✅ `buddies/list.tsx` refactor — Task 3
- ✅ `measurements.tsx` refactor — Task 5
- ✅ TypeScript fix — Task 6

**Type consistency:**
- `RequestWithUser` and `ConnectionWithUser` defined in `hooks/useBuddies.ts` and re-exported; `list.tsx` imports from hook file — consistent.
- `useFindNearbyUsers` takes `coords: { lat: number; lng: number } | null` — find.tsx passes `myCoords` which is `{ lat: number; lng: number } | null` — consistent.
- `useAddMeasurement` mutationFn takes `Omit<BodyMeasurement, 'id' | 'user_id'>` — doSave in measurements.tsx builds exactly this shape — consistent.
- `useAcceptRequest` mutationFn takes `{ requestId: string; senderId: string }` — list.tsx calls `acceptRequest(item.id, item.sender_id)` which maps to `{ requestId: item.id, senderId: item.sender_id }` — consistent.

**Placeholder scan:** None found. All steps have real code.
