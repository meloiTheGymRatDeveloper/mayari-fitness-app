# Week 6 — Social: TanStack Query Hooks + Screen Refactors

## Goal

All Week 6 UI screens (profile, measurements, buddy finder, buddy list) already exist and are functional. The gap is that they fetch data via raw `supabase` calls in `useEffect`/`useState` blocks instead of TanStack Query hooks — inconsistent with the rest of the codebase (`useWorkout`, `useNutrition`, `useFasting`, etc.). This spec covers extracting that data-fetching into proper hooks and refactoring the screens to use them, plus fixing one TypeScript error.

## Architecture

Two new hook files follow the single-responsibility pattern already established in this codebase. Each screen swaps its raw fetch block for a hook call. `chat/[id].tsx` is left untouched — its Supabase Realtime subscription pattern is correct and doesn't map to `useQuery`. `progress.tsx` (884 lines) is left untouched — it works and splitting it belongs in Week 7 (Advanced Analytics) when it will be actively modified.

## Files

### Created
- `hooks/useBuddies.ts` — six exports covering buddy discovery, requests, connections, and mutations
- `hooks/useBodyMeasurements.ts` — two exports covering measurement history and add

### Modified
- `app/(tabs)/profile/buddies/find.tsx` — replace raw supabase location block with `useFindNearbyUsers`
- `app/(tabs)/profile/buddies/list.tsx` — replace dual `useEffect` queries with `useBuddyRequests` + `useBuddyConnections`; replace inline mutations with `useAcceptRequest` / `useDeclineRequest`
- `app/(tabs)/profile/measurements.tsx` — replace `useCallback` load + `useState` history with `useMeasurements`; replace inline insert with `useAddMeasurement`
- `app/(tabs)/nutrition/search.tsx` — fix TypeScript route error (one-line cast)

---

## hooks/useBuddies.ts

### useFindNearbyUsers(radiusKm: number, goalFilter: string | null)
- `useQuery` calling the `find_nearby_users` Supabase RPC
- `queryKey: ['nearby_users', userId, radiusKm, goalFilter]`
- `enabled: !!userId`
- `staleTime: 60_000` (location data doesn't change second-to-second)
- Returns `NearbyUser[]`

### useBuddyRequests()
- `useQuery` fetching from `buddy_requests` where `sender_id = userId OR receiver_id = userId` and `status = 'pending'`
- `queryKey: ['buddy_requests', userId]`
- Returns `{ incoming: BuddyRequest[], outgoing: BuddyRequest[] }`
- `staleTime: 30_000`

### useBuddyConnections()
- `useQuery` fetching from `buddy_connections` where `user_a_id = userId OR user_b_id = userId`
- `queryKey: ['buddy_connections', userId]`
- Returns `BuddyConnection[]`
- `staleTime: 30_000`

### useSendBuddyRequest()
- `useMutation` inserting into `buddy_requests` with `{ sender_id, receiver_id, status: 'pending' }`
- `onSuccess`: invalidates `['buddy_requests', userId]`

### useAcceptRequest()
- `useMutation` taking `{ requestId: string, senderId: string }`
- Updates `buddy_requests` status to `'accepted'`
- Inserts into `buddy_connections` with `{ user_a_id: userId, user_b_id: senderId }`
- `onSuccess`: invalidates `['buddy_requests', userId]` and `['buddy_connections', userId]`

### useDeclineRequest()
- `useMutation` taking `requestId: string`
- Updates `buddy_requests` status to `'rejected'`
- `onSuccess`: invalidates `['buddy_requests', userId]`

---

## hooks/useBodyMeasurements.ts

### useMeasurements()
- `useQuery` fetching from `body_measurements` ordered by `measured_at` descending, limit 10
- `queryKey: ['measurements', userId]`
- `enabled: !!userId`
- `staleTime: 300_000` (5 minutes — measurements change rarely)
- Returns `BodyMeasurement[]`

### useAddMeasurement()
- `useMutation` upserting into `body_measurements`
- `onConflict: 'user_id,measured_at'` — one measurement per user per day; later call overwrites earlier same-day entry
- `onSuccess`: invalidates `['measurements', userId]`

---

## Screen Refactors

### buddies/find.tsx
- Remove: `useEffect` + `useState` that calls `find_nearby_users` RPC directly
- Add: `const { data: nearbyUsers = [], isLoading } = useFindNearbyUsers(radius, goalFilter);`
- Location permission request stays in the screen (UI concern, not data concern)
- Filter state (`radius`, `goalFilter`) stays in the screen as `useState` — passed as args to the hook

### buddies/list.tsx
- Remove: dual `useEffect` loading incoming/outgoing requests and connections
- Add: `const { data: requests } = useBuddyRequests();` and `const { data: connections } = useBuddyConnections();`
- Remove: inline `supabase.from('buddy_requests').update(...)` accept/decline calls
- Add: `const acceptRequest = useAcceptRequest();` and `const declineRequest = useDeclineRequest();`

### measurements.tsx
- Remove: `useCallback` load function + `useState` for history + `useEffect` calling it
- Add: `const { data: history = [], isLoading } = useMeasurements();`
- Remove: inline `supabase.from('body_measurements').upsert(...)` insert
- Add: `const addMeasurement = useAddMeasurement();`

---

## TypeScript Fix

`app/(tabs)/nutrition/search.tsx` line 78: `router.push('/(tabs)/nutrition/food/add')` produces a TS2820 error because Expo Router's typed routes doesn't recognise `add` as a valid dynamic segment. Fix with `as never` cast on the route string. Runtime behaviour is unaffected — the route is correctly defined at `app/(tabs)/nutrition/food/add.tsx`.

---

## Out of Scope

- `chat/[id].tsx` — Realtime subscription is correct; no changes needed
- `progress.tsx` — 884 lines, works correctly; split deferred to Week 7
- New tests — no pure functions exist in buddy/measurement logic worth unit testing; existing 29 tests remain the suite
- Optimistic updates — not needed for beta; screens respond fast enough on mutation success + invalidation
