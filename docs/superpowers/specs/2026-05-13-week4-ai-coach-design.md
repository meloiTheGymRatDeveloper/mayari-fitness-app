# Week 4 Design — AI Coach Mayari

**Date:** 2026-05-13
**Status:** Approved
**Scope:** Supabase migration, two Edge Functions, five screens, one hook, dashboard update

---

## Overview

Week 4 wires up the AI brain of the app. It adds Coach Mayari — a Claude-powered fitness and nutrition coach — across three layers: a Supabase migration for message storage, two Edge Functions that call the Claude API, and the mobile screens that connect them. A photo calorie estimation feature is also added to the nutrition tab.

---

## Architecture

```
Mobile App
  └── hooks/useCoach.ts          (TanStack Query + supabase.functions.invoke)
        ├── app/(tabs)/coach/index.tsx      → coach-chat EF (chat)
        ├── app/(tabs)/coach/generate.tsx   → coach-chat EF (plan_generation)
        ├── app/(tabs)/coach/plan.tsx       → INSERT workout_plans
        ├── app/(tabs)/nutrition/photo.tsx  → verify-photo EF
        └── app/(tabs)/index.tsx            → coach-chat EF (daily tip on mount)

Supabase
  ├── migrations/011_coach_messages.sql
  └── functions/
        ├── coach-chat/index.ts   (Claude API — Haiku 4.5 / Sonnet 4.5)
        └── verify-photo/index.ts (Claude API — Haiku 4.5 vision)
```

**Rule:** Claude API is called ONLY from Edge Functions, never from the mobile app. The mobile app calls `supabase.functions.invoke()`.

---

## 1. Migration: `011_coach_messages.sql`

Creates the `coach_messages` table. Note: migrations 008–010 are already taken by food_logs, water_logs, and user_macro_goals respectively.

**Table:** `coach_messages`
- `id uuid PK`
- `user_id uuid REFERENCES users(id)`
- `role text CHECK IN ('user', 'assistant')`
- `content text`
- `message_type text DEFAULT 'chat' CHECK IN ('chat', 'plan_generation', 'photo_analysis')`
- `created_at timestamptz DEFAULT now()`

**RLS:** Users can only SELECT and INSERT their own rows (`user_id = auth.uid()`). No UPDATE or DELETE needed.

**Type:** `CoachMessage` is already defined in `types/database.ts` — no changes needed there.

---

## 2. Edge Function: `coach-chat`

**File:** `supabase/functions/coach-chat/index.ts`

### Request
```typescript
{ message: string, userId: string, messageType: 'chat' | 'plan_generation' }
```

### Response
```typescript
{ response: string }
```

### Data fetching (steps before calling Claude)
1. Fetch user profile from `users` (all fields including `calorie_goal`, `protein_goal_g`)
2. Fetch last 7 workout sessions + their sets — summarize as: session count, total volume lifted, distinct exercises done
3. Fetch last 7 days `food_logs` — compute: avg daily calories, avg protein, avg carbs, avg fat
4. Fetch current row from `streaks`

### Model routing
- `messageType === 'chat'` → `claude-haiku-4-5`
- `messageType === 'plan_generation'` → `claude-sonnet-4-5`

### Prompt caching
System prompt has `cache_control: { type: 'ephemeral' }`. It's ~600–900 tokens and stable across turns for the same user session — caching cuts repeat costs ~90%.

### System prompt template
```
You are Coach Mayari, a science-based fitness and nutrition coach for Filipino users.
You are warm, encouraging, and knowledgeable — like a gym buddy who studied exercise science.

USER PROFILE:
- Name: {display_name}
- Goal: {primary_goal}
- Experience: {experience_level}
- Workout days per week: {workout_days.length}
- Equipment: {equipment_type}
- Current weight: {body_weight_kg}kg, Height: {height_cm}cm
- Calorie goal: {calorie_goal} kcal/day, Protein goal: {protein_goal_g}g/day

RECENT ACTIVITY (last 7 days):
- Workouts completed: {session_count}
- Total volume lifted: {total_volume}kg
- Average daily calories: {avg_calories} kcal
- Average daily protein: {avg_protein}g

STREAKS:
- Workout streak: {workout_streak} days
- Nutrition streak: {nutrition_streak} days

TRAINING PRINCIPLES YOU FOLLOW:
- Progressive overload: always suggest increasing weight or reps when user completes all sets
- Protein target: 1.6–2.2g per kg of bodyweight for muscle building
- For fat loss: calorie deficit of 300–500 kcal below TDEE
- Compound lifts first in every session (squat, deadlift, bench, row, OHP)
- Deload every 6th week: reduce volume by 40%
- Beginners: 3 sets 8–12 reps. Intermediate: 4 sets. Advanced: 5 sets.
- Rest: 2–3 minutes for compounds, 60–90 seconds for isolation

FILIPINO FOOD KNOWLEDGE:
High protein budget options: tinapa, itlog, tokwa, canned sardinas, monggo, kangkong.
Common staples: sinangag, pan de sal, kanin.
Use Filipino food names naturally when suggesting meals.

RESPONSE RULES:
- If user writes Tagalog or Taglish, respond in Taglish.
- If English, respond in English.
- Keep responses concise and actionable (under 200 words for chat).
- For plan_generation: output a structured 7-day plan with exercises, sets, reps.
- Never recommend supplements. Focus on whole food nutrition.
- Be honest if a goal is unrealistic, but stay encouraging.
```

### Side effects
After Claude responds, save both messages to `coach_messages`:
1. `{ user_id, role: 'user', content: message, message_type: messageType }`
2. `{ user_id, role: 'assistant', content: response, message_type: messageType }`

---

## 3. Edge Function: `verify-photo`

**File:** `supabase/functions/verify-photo/index.ts`

### Request
```typescript
{ photoUrl: string, userId: string }
```

### Response
```typescript
{ food_name: string, description: string, calories: number, protein_g: number, carbs_g: number, fat_g: number, confidence: 'low' | 'medium' | 'high' }
// or: { error: 'not_food' }
```

### Flow
1. Download image bytes from Supabase Storage using the `photoUrl`
2. Convert to base64
3. Send to `claude-haiku-4-5` with vision (base64 image block + text prompt)
4. Parse JSON from response text
5. Return parsed result

### Vision prompt
```
This is a photo of food, likely Filipino home cooking or Filipino restaurant food.
Estimate the nutritional content for what appears to be one typical serving.
Return ONLY valid JSON (no markdown):
{ "food_name": string, "description": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "confidence": "low"|"medium"|"high" }
If the image is not food, return: { "error": "not_food" }
```

### Model
`claude-haiku-4-5` — strong vision, fast, low cost (~$0.002 per photo). Upgrade path to `claude-sonnet-4-5` if user feedback shows accuracy issues on complex dishes.

---

## 4. `hooks/useCoach.ts`

New hook encapsulating all coach data access:

- `useCoachMessages()` — TanStack Query, reads `coach_messages` ordered by `created_at ASC`, for current user
- `useTodayMessageCount()` — count of user's messages today (for the 45/50 warning)
- `useSendMessage(messageType)` — mutation that calls `supabase.functions.invoke('coach-chat', ...)`, then invalidates `coach_messages` query
- `useDailyTip()` — calls `coach-chat` with a fixed tip prompt on mount; result cached in React Query for the session

---

## 5. `app/(tabs)/coach/index.tsx` — Full replacement of placeholder

### Layout
- Full-screen dark background (`#0A0A1E`)
- Header: "🌙 Coach Mayari" + subtitle "Science-based · Always here" (indigo text)
- `FlatList` of messages, inverted scroll (latest at bottom)
- Input bar pinned to bottom (TextInput + indigo send button)

### Messages
- Loaded via `useCoachMessages()`
- If no messages exist yet: render the greeting as a synthetic coach bubble (not saved to DB)
  - Greeting: `"Kumusta! I'm Coach Mayari 🌙 I'm your personal fitness and nutrition coach. Ask me anything — workout plans, what to eat, why you're not seeing results. Let's go! 💪"`
- User bubbles: right-aligned, indigo background (`#4F46E5`), white text
- Coach bubbles: left-aligned, dark card background (`#1A1A3E`), primary text
- Animated 3-dot loading bubble while waiting for response

### Quick action chips
Shown below the greeting (hidden once user has sent their first message):
- "Build my workout plan" → navigates to `coach/generate`
- "Check my diet" → sends as chat message
- "Why am I not losing weight?" → sends as chat message

### Daily limit
- Track message count via `useTodayMessageCount()`
- Show yellow warning banner at 45: `"You've sent 45 messages today. Limit is 50."`
- Disable input at 50

---

## 6. `app/(tabs)/coach/generate.tsx` — New screen

- Triggered from quick action chip or Workout home "Generate Plan" button
- Shows moon animation (`Animated` API, rotating/pulsing)
- Text: "Generating your personalized plan..."
- On mount: calls `useSendMessage('plan_generation')` with a fixed prompt:
  `"Generate my personalized workout plan based on my profile and goals."`
- On success: parse plan JSON from response text, navigate to `coach/plan` passing plan data
- On error: show error message + "Try again" button

---

## 7. `app/(tabs)/coach/plan.tsx` — New screen

- Receives plan data as route params (or reads last `plan_generation` message from DB)
- Renders day cards: day label + exercise list with `sets × reps` (e.g., "Bench Press — 4 × 8–12")
- "Save This Plan" button:
  - INSERTs into `workout_plans` (`user_id`, `split_type`, `days_per_week`, `plan_data`, `is_active: true`, `generated_by: 'claude'`)
  - Sets all other user plans to `is_active: false`
  - Navigates to Workout tab
- "Regenerate" button → back to `generate`

---

## 8. `app/(tabs)/nutrition/photo.tsx` — New screen

### Flow
1. **Camera view** — `expo-camera` full screen, shutter button centered at bottom
2. **Preview** — show captured photo with "Analyzing..." spinner overlay
3. **Upload** — `supabase.storage.from('food-photos').upload('{userId}/{timestamp}.jpg', bytes)`
4. **Estimate** — call `verify-photo` Edge Function with the storage URL
5. **Results card** — food name, calories, protein/carbs/fat, confidence badge (green/yellow/red)
6. **"Looks right, add to diary"** → navigate to `food/[id]` screen with params:
   - `aiEstimated: true`, `foodName`, `calories`, `protein`, `carbs`, `fat`
   - On the food detail screen, this creates a new `food_items` row and pre-fills the log form
7. **"Try again"** → back to step 1

### Storage bucket
`food-photos` — created separately in Supabase dashboard. RLS: users can INSERT their own folder (`{userId}/`), no public read.

---

## 9. `app/(tabs)/index.tsx` — Dashboard update

- Coach card becomes `TouchableOpacity` → `router.push('/(tabs)/coach')`
- On mount: `useDailyTip()` fetches a coaching tip and renders it in the card body
- Loading: skeleton text while tip is loading
- Error: falls back to static text `"Ready to start? Tap Coach to generate your first workout plan!"`

---

## Data Flow Summary

```
User taps send
  → useCoach.useSendMessage()
  → supabase.functions.invoke('coach-chat', { message, userId, messageType })
  → Edge Function fetches context from DB
  → Edge Function calls Claude API (Haiku or Sonnet)
  → Edge Function saves messages to coach_messages
  → Edge Function returns { response }
  → TanStack Query invalidates ['coach_messages']
  → FlatList re-renders with new messages
```

---

## Error Handling

- Edge Function errors surface as toast or inline error message (not crash)
- `verify-photo` returning `{ error: 'not_food' }` shows: "Doesn't look like food. Try a clearer photo."
- Network errors during plan generation show retry button
- Missing `ANTHROPIC_API_KEY` secret surfaces as a 500 with logged error (not exposed to client)

---

## Environment Variables

### Mobile (.env) — no changes needed
Existing `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are sufficient.

### Supabase Edge Function secrets — must be set before deploying
```
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

---

## Out of Scope (Week 4)

- PayMongo / subscriptions
- Buddy finder / chat
- Body measurements
- Push notifications
- Streak logic updates
- coach_messages pagination (load-more) — initial load is last 50 messages
