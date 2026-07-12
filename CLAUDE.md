# Mayari — Fitness App
> Philippine-market fitness companion: workout planning, calorie tracking, AI coaching, gym buddy finder.

---

## 🌙 Project Overview

**Mayari** (named after the Philippine moon goddess of balance and strength) is a React Native mobile app targeting Filipino fitness enthusiasts. It combines:
- Science-based workout planning and tracking
- Calorie tracking with a localized Philippine food database + photo estimation
- AI coaching powered by Claude API (Coach Mayari)
- Gym buddy finder (proximity-based social)
- Referral and consistency-based discount subscription model

**Market**: Philippines only (Phase 1)
**Pricing**: ₱89/month or ₱799/year. Referral discount: ₱20/month off per active referral (recurring, max 1 discount per month). Free tier available.
**Target launch**: Beta at ₱50/month (Early Access).

---

## 🛠 Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Mobile App | Expo SDK + React Native (TypeScript) | One codebase for iOS + Android |
| Navigation | Expo Router (file-based) | `app/` directory structure |
| Backend / DB | Supabase | PostgreSQL + Auth + Storage + Realtime + Edge Functions |
| AI — All Features | Anthropic Claude API | Called ONLY from Edge Functions, never from mobile |
| Payments | PayMongo | GCash, Maya, Visa/Mastercard |
| State (client) | Zustand | Simple stores per domain |
| State (server) | TanStack Query (React Query) | All Supabase data fetching |
| Location | Expo Location | Buddy finder GPS |
| Camera / Video | Expo Camera + expo-av | Barcode scan, photo log |
| Push Notifications | Expo Notifications | Weekly summaries, streak alerts |
| Maps | React Native Maps | Buddy finder map (Phase 2) |

---

## 📁 Project Folder Structure

```
mayari/
├── app/
│   ├── (auth)/
│   │   ├── index.tsx          # Splash / onboarding slides
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   ├── verify.tsx         # OTP verification
│   │   └── onboarding/
│   │       └── [step].tsx     # 7-step profile setup wizard
│   ├── (tabs)/
│   │   ├── _layout.tsx        # Tab bar config (5 tabs)
│   │   ├── index.tsx          # Home / Dashboard
│   │   ├── workout/
│   │   │   ├── index.tsx      # Workout home (today's plan)
│   │   │   ├── active.tsx     # Active workout logging
│   │   │   ├── summary.tsx    # Post-workout summary
│   │   │   ├── history.tsx
│   │   │   ├── records.tsx    # Personal records
│   │   │   └── exercise/
│   │   │       ├── index.tsx  # Exercise library
│   │   │       └── [id].tsx   # Exercise detail
│   │   ├── coach/
│   │   │   ├── index.tsx      # Coach Mayari chat (CENTER TAB)
│   │   │   ├── generate.tsx   # Generate workout plan mode
│   │   │   └── plan.tsx       # Plan preview / confirm
│   │   ├── nutrition/
│   │   │   ├── index.tsx      # Food diary (today)
│   │   │   ├── log.tsx        # Log food screen
│   │   │   ├── search.tsx     # Food search
│   │   │   ├── barcode.tsx    # Barcode scanner
│   │   │   ├── photo.tsx      # Photo calorie estimation
│   │   │   ├── food/[id].tsx  # Food item detail / confirm
│   │   │   └── goals.tsx      # Macro + calorie goals
│   │   └── profile/
│   │       ├── index.tsx      # My profile
│   │       ├── measurements.tsx
│   │       ├── progress.tsx   # Charts: weight, measurements
│   │       ├── buddies/
│   │       │   ├── find.tsx   # Buddy finder
│   │       │   ├── list.tsx   # My buddies
│   │       │   └── chat/[id].tsx
│   │       ├── streaks.tsx
│   │       ├── referral.tsx
│   │       ├── subscription.tsx
│   │       └── settings.tsx
├── components/
│   ├── ui/                    # Base components (Button, Card, Input, etc.)
│   ├── workout/               # WorkoutCard, SetLogger, RestTimer, ExerciseRow
│   ├── nutrition/             # MacroRing, FoodCard, MealSection
│   ├── coach/                 # ChatBubble, CoachCard, PlanCard
│   └── shared/                # StreakBadge, PRBadge, Avatar, ProgressChart
├── lib/
│   ├── supabase.ts            # Supabase client (anon key, public URL)
│   ├── queryClient.ts         # TanStack Query client config
│   └── paymongo.ts            # PayMongo client helper
├── stores/
│   ├── authStore.ts           # Zustand: user session, profile
│   ├── workoutStore.ts        # Zustand: active workout state
│   └── uiStore.ts             # Zustand: theme, language pref
├── hooks/
│   ├── useAuth.ts
│   ├── useWorkout.ts
│   ├── useNutrition.ts
│   ├── useCoach.ts
│   └── useBuddies.ts
├── types/
│   └── database.ts            # TypeScript types matching Supabase schema
├── constants/
│   ├── exercises.ts           # Fallback exercise data
│   ├── phFoods.ts             # Seed PH food items
│   └── theme.ts               # Colors, typography (dark mode first)
├── supabase/
│   ├── migrations/            # SQL migration files (one per feature)
│   └── functions/
│       ├── coach-chat/        # Claude API chat endpoint
│       ├── verify-photo/      # Claude Vision photo calorie estimation
│       └── gen-flashcards/    # (Phase 2) PDF → flashcards
└── CLAUDE.md                  # This file
```

---

## 🗄 Database Schema

All tables: UUID PKs, `created_at` + `updated_at` timestamps, RLS enabled.

### users
```sql
id uuid PK (references auth.users)
username text UNIQUE
display_name text
avatar_url text
birthdate date
experience_level text CHECK IN ('beginner','intermediate','advanced')
primary_goal text CHECK IN ('build_muscle','lose_fat','maintain','improve_fitness')
equipment_type text CHECK IN ('full_gym','dumbbells','barbell','bodyweight')
workout_days int[] -- e.g. [1,3,5] for Mon/Wed/Fri
session_duration_min int -- 45, 60, 75, or 90
body_weight_kg decimal
height_cm decimal
target_weight_kg decimal
language_pref text DEFAULT 'en' CHECK IN ('en','fil')
meal_time_style text DEFAULT 'filipino' CHECK IN ('filipino','generic')
location_lat decimal
location_lng decimal
location_precision text DEFAULT 'approx' CHECK IN ('exact','approx','hidden')
subscription_status text DEFAULT 'free' CHECK IN ('free','beta','active','achiever')
subscription_expires_at timestamptz
referral_code text UNIQUE
referred_by uuid REFERENCES users(id)
```

### workout_plans
```sql
id uuid PK
user_id uuid REFERENCES users(id)
split_type text -- 'full_body', 'upper_lower', 'ppl'
days_per_week int
plan_data jsonb -- full routine object
is_active boolean DEFAULT true
generated_by text DEFAULT 'claude'
```

### workout_sessions
```sql
id uuid PK
user_id uuid REFERENCES users(id)
plan_id uuid REFERENCES workout_plans(id)
started_at timestamptz
ended_at timestamptz
total_volume_kg decimal
notes text
xp_earned int DEFAULT 0
```

### workout_sets
```sql
id uuid PK
session_id uuid REFERENCES workout_sessions(id)
exercise_id text -- from exercise library
exercise_name text
set_number int
weight_kg decimal
reps int
is_warmup boolean DEFAULT false
completed_at timestamptz
```

### exercises (seed data from Wger API)
```sql
id text PK -- wger exercise ID
name text
muscle_group text -- 'push','pull','legs','core'
muscles_primary text[]
muscles_secondary text[]
equipment text[]
category text
description text
```

### personal_records
```sql
id uuid PK
user_id uuid REFERENCES users(id)
exercise_id text
exercise_name text
weight_kg decimal
reps int
achieved_at timestamptz
```

### food_items
```sql
id uuid PK
name text
name_fil text -- Filipino name if applicable
brand text
is_ph_local boolean DEFAULT false
calories_per_100g decimal
protein_per_100g decimal
carbs_per_100g decimal
fat_per_100g decimal
fiber_per_100g decimal
sugar_per_100g decimal
barcode text
source text DEFAULT 'custom' CHECK IN ('custom','open_food_facts','ph_seed')
```

### food_logs
```sql
id uuid PK
user_id uuid REFERENCES users(id)
food_item_id uuid REFERENCES food_items(id)
meal_slot text CHECK IN ('almusal','tanghalian','merienda','hapunan')
quantity_g decimal
logged_at timestamptz
photo_url text -- if logged by photo
ai_estimated boolean DEFAULT false
```

### body_measurements
```sql
id uuid PK
user_id uuid REFERENCES users(id)
measured_at date
weight_kg decimal
body_fat_pct decimal
waist_cm decimal
chest_cm decimal
arms_cm decimal
legs_cm decimal
notes text
```

### coach_messages
```sql
id uuid PK
user_id uuid REFERENCES users(id)
role text CHECK IN ('user','assistant')
content text
message_type text DEFAULT 'chat' CHECK IN ('chat','plan_generation','photo_analysis')
created_at timestamptz
```

### streaks
```sql
id uuid PK
user_id uuid REFERENCES users(id) UNIQUE
workout_current int DEFAULT 0
workout_longest int DEFAULT 0
nutrition_current int DEFAULT 0
nutrition_longest int DEFAULT 0
last_workout_date date
last_nutrition_date date
```

### fasting_logs
```sql
id uuid PK
user_id uuid REFERENCES users(id)
target_window_hours int          -- e.g. 16 for 16:8
fasting_start timestamptz
eating_window_start timestamptz  -- fasting_start + target_window_hours
eating_window_end timestamptz    -- eating_window_start + (24 - target_window_hours)h
fasting_end timestamptz          -- actual end
status text CHECK IN ('active','completed','cancelled')
created_at timestamptz
```

### meal_plans
```sql
id uuid PK
user_id uuid REFERENCES users(id)
name text
plan_data jsonb  -- { "monday": { "almusal": [{food_item_id, name, quantity_g, calories, protein, carbs, fat}], ... }, ... }
is_template boolean DEFAULT false
created_at timestamptz
updated_at timestamptz
```

### grocery_lists
```sql
id uuid PK
user_id uuid REFERENCES users(id)
meal_plan_id uuid REFERENCES meal_plans(id)
name text
items jsonb  -- [{ name, quantity, unit, category, checked }]
created_at timestamptz
```

### referrals
Discount structure: referrer gets ₱20/month off while the referred user's subscription is active. Only 1 referral discount applies per month regardless of how many referrals. Discount is recurring — it applies every billing cycle, not just once.
```sql
id uuid PK
referrer_id uuid REFERENCES users(id)
referred_user_id uuid REFERENCES users(id) UNIQUE
status text DEFAULT 'pending' CHECK IN ('pending','active','expired')
activated_at timestamptz
```

### subscriptions
```sql
id uuid PK
user_id uuid REFERENCES users(id) UNIQUE
paymongo_customer_id text
paymongo_subscription_id text
tier text DEFAULT 'free'
price_paid_cents int
current_period_start timestamptz
current_period_end timestamptz
referral_discount_pct int DEFAULT 0  -- ₱20 off per active referral (max 1/month)
consistency_discount_pct int DEFAULT 0  -- 10% off if ≥24 workout days in last 30
```

---

## 💰 Subscription Tiers

### Free
- Workout logging (sets, reps, weight)
- Exercise library + personal records
- Food diary: manual entry, food search (local DB + USDA + Open Food Facts), barcode scanner
- Daily calorie + macros overview (calories, protein, carbs, fat, fiber, sugar)
- Net carbs toggle
- Streak tracking
- Body measurements logging + basic weight chart

### Pro — ₱89/month or ₱799/year
Everything in Free, plus:
- **Coach Mayari** — AI-generated tips (post-workout, nutrition, streak, PR, proactive analysis)
- **Photo calorie estimation** — Claude Vision via `verify-photo` edge function
- **Voice food logging** — Tagalog/English/Taglish via `voice-log` edge function
- **AI food lookup** — Claude fallback when food not found in any DB
- **Intermittent fasting timer** — with 30-min eating window push notification
- **Advanced analytics** — 4-section dashboard: body, nutrition trends, workout analytics, consistency score
- **Consistency discount** — 10% off subscription if ≥24 workout days in last 30
- **Push notifications** — streak alerts, weekly summary, PR alerts, IF window warning

### Referral Discount (both tiers)
- ₱20/month off for each month a referred user stays active (max 1 discount per month)
- Applied at billing time via `create-payment-link` edge function
- Referral code generated on signup via `handle_new_user()` DB trigger

---

## 🧪 Developer Pro Access

To test Pro features without going through PayMongo, run this in the Supabase SQL editor after registering:

```sql
UPDATE public.users
SET
  subscription_status = 'active',
  subscription_expires_at = now() + interval '1 year'
WHERE username = 'YOUR_USERNAME';

INSERT INTO public.subscriptions (
  user_id,
  tier,
  price_paid_cents,
  current_period_start,
  current_period_end,
  referral_discount_pct,
  consistency_discount_pct
)
SELECT
  id,
  'active',
  8900,
  now(),
  now() + interval '1 year',
  0,
  0
FROM public.users
WHERE username = 'YOUR_USERNAME'
ON CONFLICT (user_id) DO UPDATE SET
  tier = 'active',
  current_period_end = now() + interval '1 year';
```

Replace `YOUR_USERNAME` with your actual username. This grants 1 year of Pro access instantly.

---

## 📱 Navigation — 5 Tabs

```
Tab 1: Home    (app/(tabs)/index.tsx)
Tab 2: Workout (app/(tabs)/workout/index.tsx)
Tab 3: 🌙 Coach  (app/(tabs)/coach/index.tsx)  ← CENTER TAB, most prominent
Tab 4: Nutrition (app/(tabs)/nutrition/index.tsx)
Tab 5: Profile   (app/(tabs)/profile/index.tsx)
```

Tab bar is dark (`#0F0F2E` background). Coach tab has indigo highlight (`#4F46E5`).

**Coach tab notification badge**: The Coach tab shows a numeric badge (`tabBarBadge`) for unread coach tips, reminders, and contextual notifications. Badge count comes from `useCoach` hook — counts `coach_messages` rows with `role = 'assistant'` and `message_type = 'tip'` that were created after the user's last visit to the Coach tab. The last-seen timestamp is stored locally (Zustand `uiStore`) and compared against the latest tip's `created_at`. Badge resets to 0 when user opens the Coach tab.

---

## 🤖 AI Coach — Edge Function Pattern

**CRITICAL: Never call Claude API from the mobile app. Always use Supabase Edge Functions.**

### coach-chat function
Located at `supabase/functions/coach-chat/index.ts`

System prompt includes:
- User profile (goal, experience, available days, equipment, weight/height)
- Last 7 days workout summary
- Last 7 days nutrition averages (calories, protein, carbs, fat)
- Current streaks
- Science-based training principles (PPL splits, progressive overload, 1.6-2.2g protein/kg, deload every 6th week)
- Filipino food context (knows local foods by name)
- Responds in user's language (if they write Tagalog, respond Tagalog)

Model: `claude-3-5-haiku-20241022` for chat, `claude-sonnet-4-5` for plan generation.

### verify-photo function
Located at `supabase/functions/verify-photo/index.ts`

Takes a photo URL, sends to Claude Vision, returns calorie estimate.
Response format: `{ calories: number, protein_g: number, carbs_g: number, fat_g: number, description: string, confidence: 'low'|'medium'|'high' }`

---

## 🎨 Design System

**Theme**: Dark mode first.

```typescript
// constants/theme.ts
export const colors = {
  bg: {
    primary:   '#0A0A1E',  // Deep night
    secondary: '#13132E',  // Card background
    elevated:  '#1A1A3E',  // Modal / sheet
  },
  brand: {
    primary:   '#6366F1',  // Moonrise indigo
    secondary: '#A78BFA',  // Star violet
    accent:    '#F59E0B',  // Starlight gold (PRs, achievements)
  },
  text: {
    primary:   '#F1F5F9',
    secondary: '#94A3B8',
    muted:     '#475569',
  },
  success: '#22C55E',
  warning: '#F59E0B',
  error:   '#EF4444',
  border:  '#1E2040',
}
```

**Language**: English UI with Taglish flavour in greetings and empty states.
Examples:
- Dashboard greeting: `"Kumusta, {name}! 💪"`
- Empty workout: `"Wala pang workout ngayon. Magsimula na tayo!"`
- Streak milestone: `"{n} days na! Tuloy lang! 🔥"`

**Meal slot labels** (toggle in settings):
- Filipino: Almusal / Tanghalian / Merienda / Hapunan
- Generic: Breakfast / Lunch / Snack / Dinner

---

## 🔑 Environment Variables

### Mobile app (.env) — safe to expose
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=
```

### Supabase Edge Function secrets — NEVER in mobile app
```
ANTHROPIC_API_KEY=
PAYMONGO_SECRET_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Set via: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`

---

## 🏗 Build Order

| Week | Focus | Key Deliverables |
|------|-------|-----------------|
| 1 | Foundation | Expo init, Supabase schema + RLS, Auth screens, Onboarding wizard, Tab shell |
| 2 | Workout Engine | Exercise library (Wger seed), Routine generator, Active workout, Rest timer |
| 3 | Nutrition | PH food DB, Open Food Facts API, Food diary, Barcode scanner, Macros |
| 4 | AI Coach | Edge Functions, Coach chat, Photo calorie estimation, Plan generation |
| 5 | Net Carbs + IF | Net carb tracking throughout app, Intermittent fasting timer + food diary integration |
| 6 | Social | Profile screen, Body measurements, Buddy finder (PostGIS), Buddy chat (Realtime) |
| 7 | Advanced Analytics | 4-section analytics dashboard: body, nutrition trends, workout analytics, consistency score |
| 8 | Money + Polish | Streaks (DB triggers), Referrals, PayMongo, Settings, Push notifications, Final polish |
| ~~9~~ | ~~Meal Planning~~ | **Deferred to Phase 2** — Weekly meal planner, Grocery list, AI Meal Builder. Code exists but feature is hidden from navigation. |

## 🔮 Phase 2 Roadmap (Post-Beta)

- **Meal Planning** — Weekly meal planner, AI Meal Builder, Grocery list (code exists, hidden from nav)
- **Adaptive Calorie Targets** — `mayari-analyze` edge function monitors weight trend vs predicted deficit/surplus. If weight isn't moving as expected over 2+ weeks, Coach Mayari suggests adjusting calorie targets. Uses existing `body_measurements` + `food_logs` data. Pro feature.

**Current phase: Beta Launch**

---

## ✅ Coding Conventions

- **TypeScript strict mode** — no `any` types
- **Every Supabase table** gets RLS policies written in the same migration
- **Folder-per-feature** for components: `components/workout/`, `components/nutrition/`, etc.
- **One hook per data domain**: `useWorkout`, `useNutrition`, `useCoach`, etc.
- **TanStack Query** for all Supabase reads. Zustand only for local UI/session state
- **No inline styles** — use StyleSheet or a theme-aware style utility
- **Error handling**: every async function has try/catch, errors surface to the UI gracefully
- **Supabase types**: regenerate `types/database.ts` after every migration using `supabase gen types typescript`

---

## 📋 Current Status

**Phase: Beta Launch Prep**

All core features (Weeks 1–8) plus the Workout Types Expansion are complete. Week 9 (Meal Planning + AI Meal Builder) is deferred to Phase 2 — code exists but is hidden from navigation.

### ✅ Completed (Weeks 1–8)
- Auth + 8-step onboarding wizard
- Workout engine: multi-plan support, active logging, rest timer, SetLogger autofill, exercise form GIFs (WorkoutX)
- Nutrition: food diary, 4-tier search, barcode scanner, photo estimation, voice logging, manual entry, net carbs, IF timer
- AI Coach: one-way tip cards, `mayari-triggers` edge function (10 events), `mayari-analyze` proactive analysis (12 checks, pg_cron 3×/day)
- Advanced analytics: body, nutrition trends, workout, consistency score
- Streaks (DB triggers)
- PayMongo integration, referral system, push notifications

### ✅ Completed (Post-Week 8 Polish)
- **Free vs Pro gating** — `useFeatureAccess` hook + `ProGate` component. All gated screens wired.
- **Subscription pricing** — `create-payment-link` edge function: ₱50/month beta, ₱89/month, ₱799/year.
- **Referral discount** — flat ₱20/month off when ≥1 active referral (capped at 1 discount).
- **Coach tab badge** — `useUnreadTipCount()` wired to `tabBarBadge`. Clears on coach tab open.
- **Exercises table seeding** — `045_seed_exercises.sql` seeds 23 exercises with slug IDs.
- **UI/UX redesign** — Gold token system, Plus Jakarta Sans fonts, Phosphor Duotone icons, arc rings, moon orb, gold CTAs.

### ✅ Completed (Workout Types Expansion — 2026-06-03)
- **4 workout types** — Gym, Home Workout, Running, Cycling. `workout/index.tsx` is now a type-selection landing page (4 cards). Gym screens moved to `workout/gym/`.
- **Home Workout** — Equipment tier picker (bodyweight/minimal/home_gym), tier-filtered exercise generator, circuit mode (Pro), harder/easier variant swaps (Pro), SetLogger bodyweight mode (weight nullable).
- **Running** — Template plans (C25K, 5K, 10K, Half Marathon), active session with elapsed timer, audio km cues via `expo-speech` (Pro), manual log, run history.
- **Cycling** — Template plans (Endurance/Intervals/Weight Loss/Sportive), outdoor (Strava sync) and indoor (interval tracking with effort rating) sub-modes, ride history.
- **Strava Integration** — OAuth via `expo-web-browser` + deep link `mayari://strava/callback`. `strava-auth` and `strava-sync` edge functions deployed. Client ID: 254812. Token auto-refresh with 60s buffer. Dedup via `strava_activity_id`. Strava API subscription: ₱125/month.
- **New DB tables** — `cardio_metrics`, `cardio_plan_enrollments`, `strava_connections` (migration 047 + 048).
- **New hooks** — `useCardio`, `useStrava`, `useHomePlans`.

### ✅ Completed (Post-Workout-Types Polish — 2026-06-04)
- **Affiliate Gear section** — `GearSection` component in Profile (between Body and Account). Xiaomi HOTO (Premium) + Mijia (Budget) cards. "Soon" buttons activate when affiliate URLs are set in `components/profile/GearSection.tsx`.
- **Buddy finder removed** — screens, hook, nav entries, and types deleted. DB tables retained for data safety.

### ✅ Completed (Consistency & Coach Improvements — 2026-07-12)
Spec: `docs/superpowers/specs/2026-07-12-mayari-improvements-design.md` (gitignored). Server side deployed to prod 2026-07-12 (migrations 049–051 + 7 edge functions).
- **Nutrition logging reminder** — `notify-nutrition-reminder`, cron 11:00/19:00 Manila, only fires if no food log today (queries `food_logs` directly — `streaks.last_nutrition_date` needs 3 meal slots). Taglish copy, deep-links to nutrition tab. Toggle: `notif_nutrition_enabled`.
- **Win-back push** — `notify-winback`, daily 12:00 Manila, fires when last activity (food or workout) was exactly 5 or exactly 14 days ago. Toggle: `notif_winback_enabled`.
- **Weigh-in reminder** — `notify-weighin-reminder`, daily 08:00 Manila; weekly pref fires Sundays, monthly on the 1st, skips users with a recent `body_measurements` row. Pref: `notif_weighin` ('off'|'weekly'|'monthly').
- **Notification deep links** — `data.url` in push payloads; response listener in `app/_layout.tsx` routes on tap.
- **Push permission timing** — request moved from app start to a post-onboarding modal (`lib/pushNotifications.ts`: `registerPushIfGranted` at startup, `requestAndRegisterPush` from onboarding).
- **Two-way referral** — referred users get ₱20 off their FIRST paid month (beta + monthly, not yearly). `referrals.welcome_discount_status` ('available'→'redeemed'); applied in `create-payment-link` (marks description with `[W20]`), redeemed in `paymongo-webhook` only on `payment.paid`. UI: signup hint, referral screen two-way copy, subscription discount breakdown.
- **Coach Mayari chat** — Coach tab is now chat-first: merged thread (`coach_messages` chat bubbles + `coach_tips` inline tip cards, sorted by time via `lib/coachChat.ts` `mergeThread`). 5 user messages/day, enforced server-side in `coach-chat` (429 + `remaining` in every response, Manila midnight reset). Conversation memory (last 10 turns), today's calorie/macro totals + 3 recent tips in the system prompt. Context-aware suggestion chips built client-side (`buildSuggestionChips`). Hooks: `useCoachChat.ts`. Pro-only (same ProGate).
- **Weekly recap in chat** — `notify-weekly-summary` also inserts an `insight` coach_tip so the recap appears in the thread.
- **Streak freeze ("Pahinga Pass")** — automatic: one missed day is bridged if no freeze was used in the past 7 days (per streak type). Trigger update in migration 051; `streaks.workout_freeze_used_on` / `nutrition_freeze_used_on`; 🛡️ note on streaks screen.
- **Referral share card** — `ReferralShareCard` captured via `react-native-view-shot`, shared via `expo-sharing` (NATIVE MODULES — requires new binary, not OTA).
- **Onboarding polish** — "Let's Go" button full-width.
- **Migration history reconciled** — remote timestamped orphan rows removed, local sequential files marked applied; `supabase db push` now works normally.
- **Android v21 (1.1.0)** bumped in `android/app/build.gradle` + `app.json`.
- **NOT yet done:** Apple Health / Health Connect sync (spec #10, deliberately post-beta — Play health declaration required), gear affiliate URLs (owner task via Involve Asia), on-device verification checklist in `docs/superpowers/plans/2026-07-12-mayari-improvements.md`.

### 🔧 Pending / In Progress
- **Beta launch prep** — see checklist below

---

## 🚀 Beta Launch Checklist

### 🎨 App Assets

| Asset | Spec | Status |
|---|---|---|
| App icon | 1024×1024 PNG, no transparency, no alpha, no rounded corners (OS adds them) | ⬜ |
| Android adaptive icon | 1024×1024 foreground PNG + solid background color (`#0A0A1E`) | ⬜ |
| Splash screen | Centered moon logo on `#0A0A1E`, exported as `splash-icon.png` (already in app.json) | ⬜ |
| App Store screenshots | 6.7" iPhone required; 5.5" iPhone optional; min 3 screenshots | ⬜ |
| Play Store screenshots | 16:9 phone screenshots, min 2 | ⬜ |
| App Store preview video | Optional but recommended — 15–30s screen recording | ⬜ |

**Icon file locations (Expo):**
```
assets/
  icon.png          ← 1024×1024, used for iOS App Store + Android
  adaptive-icon.png ← 1024×1024 foreground layer (Android)
  splash-icon.png   ← already configured in app.json
  favicon.png       ← 48×48 for web (optional)
```

---

### 💳 Payments & Pricing

- [ ] Switch PayMongo to **live mode** keys — replace test keys in Supabase secrets:
  ```
  PAYMONGO_PUBLIC_KEY=pk_live_...
  PAYMONGO_SECRET_KEY=sk_live_...
  ```
- [ ] Update `EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY` in `.env` with live public key
- [ ] Create beta price in PayMongo dashboard — ₱50/month recurring
- [ ] Update `create-payment-link` edge function with beta price ID
- [ ] Re-register PayMongo webhook with live endpoint URL (Dashboard → Developers → Webhooks)
- [ ] End-to-end payment test: subscribe → `payment.paid` webhook → DB status update → app shows Pro

---

### 🧾 JuanTax — BIR-Compliant Invoicing

**What:** After every successful `payment.paid` webhook, call Juan API to auto-generate and email a BIR-compliant invoice to the customer.

**Prerequisites:**
- [ ] Register at [Juan (JuanTax)](https://juan.ac) and get API key
- [ ] Have your business TIN, registered name, and address ready
- [ ] Set secret: `npx supabase secrets set JUAN_API_KEY=your_key_here`

**DB change needed — add invoice log column:**
```sql
-- Migration: 046_juan_invoice_log.sql
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS juan_invoice_id text,
  ADD COLUMN IF NOT EXISTS juan_invoice_sent_at timestamptz;
```

**Implementation — modify `paymongo-webhook` edge function:**

In the `payment.paid` handler, after the subscription upsert succeeds, add a fire-and-forget Juan API call:

```typescript
// After successful subscription upsert in payment.paid handler:
const customerEmail = paymentData?.billing?.email as string | undefined;
const customerName  = paymentData?.billing?.name  as string | undefined;
const amountPesos   = amountCents / 100;

if (userId && customerEmail) {
  fireAndForgetJuanInvoice({
    supabase,
    userId,
    customerEmail,
    customerName: customerName ?? 'Mayari User',
    amountPesos,
    description: amountCents === 5000 ? 'Mayari Beta — ₱50/month'
               : amountCents === 8900 ? 'Mayari Pro — ₱89/month'
               : 'Mayari Pro — ₱799/year',
  });
}
```

**`fireAndForgetJuanInvoice` helper (add above `Deno.serve`):**

```typescript
async function fireAndForgetJuanInvoice(opts: {
  supabase: ReturnType<typeof createClient>;
  userId: string;
  customerEmail: string;
  customerName: string;
  amountPesos: number;
  description: string;
}) {
  const JUAN_API_KEY = Deno.env.get("JUAN_API_KEY");
  if (!JUAN_API_KEY) {
    console.warn("JUAN_API_KEY not set — skipping invoice generation");
    return;
  }

  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch("https://api.juan.ac/v1/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${JUAN_API_KEY}`,
        },
        body: JSON.stringify({
          customer: {
            name:  opts.customerName,
            email: opts.customerEmail,
          },
          items: [{
            description: opts.description,
            quantity: 1,
            unit_price: opts.amountPesos,
          }],
          send_email: true,
          // Business details — fill in after Juan account setup
          seller: {
            name:    "YOUR_BUSINESS_NAME",
            tin:     "YOUR_TIN",
            address: "YOUR_ADDRESS",
          },
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Juan API ${res.status}: ${body}`);
      }

      const invoice = await res.json();
      const invoiceId = invoice?.id ?? invoice?.data?.id;

      // Log invoice ID against the subscription
      if (invoiceId) {
        await opts.supabase.from("subscriptions").update({
          juan_invoice_id: invoiceId,
          juan_invoice_sent_at: new Date().toISOString(),
        }).eq("user_id", opts.userId);
      }

      console.log(`Juan invoice created: ${invoiceId} for ${opts.customerEmail}`);
      return;

    } catch (err) {
      console.error(`Juan invoice attempt ${attempt}/${MAX_ATTEMPTS} failed:`, err);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, attempt * 1000)); // 1s, 2s backoff
      }
    }
  }

  console.error(`Juan invoice failed after ${MAX_ATTEMPTS} attempts for user ${opts.userId} — payment unaffected`);
}
```

**Checklist:**
- [ ] Apply migration `046_juan_invoice_log.sql`
- [ ] Fill in `seller.name`, `seller.tin`, `seller.address` in the function
- [ ] Set `JUAN_API_KEY` secret in Supabase
- [ ] Deploy updated webhook: `npx supabase functions deploy paymongo-webhook`
- [ ] Verify Juan API docs at https://docs.juan.ac — confirm endpoint and payload shape before deploying
- [ ] Test: trigger a test payment → confirm invoice email arrives + `juan_invoice_id` logged in DB

---

### 📱 Builds & Distribution

- [ ] **iOS EAS preview build** — `npx eas build --profile preview --platform ios`
  - Requires Apple Developer account + device UDID registered via `npx eas device:create`
  - Bundle ID: `com.mayari.app`
- [ ] **Android EAS preview build** — `npx eas build --profile preview --platform android`
- [ ] Install preview builds on test devices and smoke test all 5 tabs
- [ ] Verify push notifications fire on real device (streak alert, weekly summary)

---

### 🔒 Legal & Compliance

- [ ] **Privacy Policy** page — required for App Store submission. Must cover: data collected, Claude AI usage, location data (buddy finder), payment data. Host at a public URL (e.g. Notion, simple web page).
- [ ] **Terms of Service** page — subscription terms, refund policy, acceptable use
- [ ] Add Privacy Policy URL to `app.json` → `expo.ios.privacyManifest` and App Store Connect
- [ ] BIR registration if not already done (required for issuing receipts via JuanTax)
- [x] **Delete Account** — in-app flow: confirmation modal in `app/(tabs)/profile/settings.tsx` → `delete-account` Edge Function. Web URL for Play Console: https://clever-antique-3e9.notion.site/Mayari-Account-Data-Deletion-Request-3799e0aa48848032af2add72428b5a0e

---

### 🧪 QA — Full Flow Test

- [ ] Register new account → complete onboarding wizard
- [ ] Log a workout → verify streak increments
- [ ] Log food via photo → verify confidence badge / PH database badge shows
- [ ] Subscribe (beta ₱10) → verify PayMongo payment goes through → subscription status updates → Pro features unlock → JuanTax invoice received in email
- [ ] Test referral flow: share code → new user signs up with code → referral discount applies
- [ ] Buddy finder: enable location → find nearby users → send request → accept → chat
- [ ] Coach tab: verify tips appear + badge increments + clears on open
- [ ] Android: verify tab bar does not overlap system nav buttons
- [ ] iOS: verify home indicator area is clear
