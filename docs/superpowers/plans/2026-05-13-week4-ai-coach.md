# Week 4 — AI Coach Mayari Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up Coach Mayari — a Claude-powered fitness and nutrition coach — across a Supabase migration, two Edge Functions, a React hook, five screen changes, and a storage bucket.

**Architecture:** The mobile app never calls Claude directly; it calls `supabase.functions.invoke()` which hits Deno Edge Functions that call the Anthropic SDK. Message history is persisted in `coach_messages`. A photo calorie estimation flow uploads to Supabase Storage and calls the `verify-photo` Edge Function.

**Tech Stack:** Expo SDK / React Native (TypeScript), Expo Router, Supabase (PostgreSQL + Edge Functions + Storage), Anthropic SDK (`npm:@anthropic-ai/sdk` in Deno), TanStack Query, Zustand, expo-camera

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `supabase/migrations/011_coach_messages.sql` | Adds `coach_messages` table + RLS |
| Create | `supabase/functions/coach-chat/index.ts` | Claude chat + plan generation EF |
| Create | `supabase/functions/verify-photo/index.ts` | Claude vision photo estimation EF |
| Create | `hooks/useCoach.ts` | TanStack Query hooks for coach data |
| Modify | `app/(tabs)/coach/index.tsx` | Full replacement — chat UI |
| Create | `app/(tabs)/coach/generate.tsx` | Animated plan generation screen |
| Create | `app/(tabs)/coach/plan.tsx` | Plan preview + save screen |
| Create | `app/(tabs)/nutrition/photo.tsx` | Camera → upload → estimate flow |
| Modify | `app/(tabs)/nutrition/food/[id].tsx` | Handle AI-estimated params |
| Modify | `app/(tabs)/index.tsx` | Tappable coach card + daily tip |

---

## Task 1: Migration — `coach_messages` table

**Files:**
- Create: `supabase/migrations/011_coach_messages.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/011_coach_messages.sql
CREATE TABLE IF NOT EXISTS public.coach_messages (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role         text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content      text        NOT NULL,
  message_type text        NOT NULL DEFAULT 'chat'
                           CHECK (message_type IN ('chat', 'plan_generation', 'photo_analysis')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_messages_select_own" ON public.coach_messages
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "coach_messages_insert_own" ON public.coach_messages
  FOR INSERT WITH CHECK (user_id = auth.uid());
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Use the `mcp__supabase__apply_migration` tool with name `011_coach_messages` and the SQL above.

Expected: migration applied, table visible in dashboard under `coach_messages`.

- [ ] **Step 3: Verify table exists**

Use `mcp__supabase__execute_sql` with query:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'coach_messages' ORDER BY ordinal_position;
```
Expected: 6 rows — id, user_id, role, content, message_type, created_at.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/011_coach_messages.sql
git commit -m "feat: add coach_messages table with RLS"
```

---

## Task 2: Edge Function — `coach-chat`

**Files:**
- Modify: `supabase/functions/coach-chat/index.ts` (was `.gitkeep`)

- [ ] **Step 1: Write the Edge Function**

```typescript
// supabase/functions/coach-chat/index.ts
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify JWT and extract authenticated userId
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const { message, messageType } = await req.json() as {
      message: string;
      messageType: "chat" | "plan_generation";
    };

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch user profile
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    // 2. Fetch last 7 days workout sessions + sets
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: sessions } = await supabase
      .from("workout_sessions")
      .select("total_volume_kg, workout_sets(exercise_name)")
      .eq("user_id", userId)
      .gte("started_at", sevenDaysAgo);

    const sessionCount = sessions?.length ?? 0;
    const totalVolume = (sessions ?? []).reduce(
      (sum: number, s: { total_volume_kg: number }) => sum + (s.total_volume_kg ?? 0), 0
    );

    // 3. Fetch last 7 days food logs for nutrition averages
    const { data: foodLogs } = await supabase
      .from("food_logs")
      .select("quantity_g, logged_at, food_item:food_items(calories_per_100g, protein_per_100g)")
      .eq("user_id", userId)
      .gte("logged_at", sevenDaysAgo);

    const dailyTotals: Record<string, { cal: number; protein: number }> = {};
    for (const log of (foodLogs ?? []) as Array<{
      quantity_g: number;
      logged_at: string;
      food_item: { calories_per_100g: number | null; protein_per_100g: number | null } | null;
    }>) {
      const day = log.logged_at.substring(0, 10);
      if (!dailyTotals[day]) dailyTotals[day] = { cal: 0, protein: 0 };
      const q = log.quantity_g / 100;
      dailyTotals[day].cal += (log.food_item?.calories_per_100g ?? 0) * q;
      dailyTotals[day].protein += (log.food_item?.protein_per_100g ?? 0) * q;
    }
    const days = Object.values(dailyTotals);
    const avgCal = days.length
      ? Math.round(days.reduce((s, d) => s + d.cal, 0) / days.length) : 0;
    const avgProtein = days.length
      ? Math.round(days.reduce((s, d) => s + d.protein, 0) / days.length) : 0;

    // 4. Fetch streaks
    const { data: streak } = await supabase
      .from("streaks")
      .select("workout_current, nutrition_current")
      .eq("user_id", userId)
      .single();

    const systemPrompt = `You are Coach Mayari, a science-based fitness and nutrition coach for Filipino users.
You are warm, encouraging, and knowledgeable — like a gym buddy who studied exercise science.

USER PROFILE:
- Name: ${profile?.display_name ?? "User"}
- Goal: ${profile?.primary_goal ?? "improve_fitness"}
- Experience: ${profile?.experience_level ?? "beginner"}
- Workout days per week: ${(profile?.workout_days as number[] | null)?.length ?? 3}
- Equipment: ${profile?.equipment_type ?? "full_gym"}
- Current weight: ${profile?.body_weight_kg ?? "?"}kg, Height: ${profile?.height_cm ?? "?"}cm
- Calorie goal: ${profile?.calorie_goal ?? "not set"} kcal/day, Protein goal: ${profile?.protein_goal_g ?? "not set"}g/day

RECENT ACTIVITY (last 7 days):
- Workouts completed: ${sessionCount}
- Total volume lifted: ${totalVolume}kg
- Average daily calories: ${avgCal} kcal
- Average daily protein: ${avgProtein}g

STREAKS:
- Workout streak: ${streak?.workout_current ?? 0} days
- Nutrition streak: ${streak?.nutrition_current ?? 0} days

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
- For plan_generation: output a structured JSON plan with this exact shape:
  { "days": [ { "day_label": "Day 1 — Push", "exercises": [ { "exercise_id": "bench_press", "exercise_name": "Bench Press", "muscle_group": "push", "sets": 4, "reps_low": 8, "reps_high": 12, "rest_seconds": 120 } ] } ] }
- Never recommend supplements. Focus on whole food nutrition.
- Be honest if a goal is unrealistic, but stay encouraging.`;

    const model = messageType === "plan_generation"
      ? "claude-sonnet-4-5"
      : "claude-haiku-4-5";

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const claudeResponse = await anthropic.messages.create({
      model,
      max_tokens: messageType === "plan_generation" ? 2048 : 512,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: message }],
    });

    const responseText =
      claudeResponse.content[0].type === "text" ? claudeResponse.content[0].text : "";

    // Save both turns to coach_messages
    await supabase.from("coach_messages").insert([
      { user_id: userId, role: "user", content: message, message_type: messageType },
      { user_id: userId, role: "assistant", content: responseText, message_type: messageType },
    ]);

    return new Response(JSON.stringify({ response: responseText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("coach-chat error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

- [ ] **Step 2: Remove the `.gitkeep` stub if present**

```bash
# The file content above replaces the stub entirely — just write/overwrite the file.
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/coach-chat/index.ts
git commit -m "feat: add coach-chat edge function (Haiku chat, Sonnet plan gen)"
```

---

## Task 3: Edge Function — `verify-photo`

**Files:**
- Modify: `supabase/functions/verify-photo/index.ts` (was `.gitkeep`)

- [ ] **Step 1: Write the Edge Function**

```typescript
// supabase/functions/verify-photo/index.ts
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { photoUrl } = await req.json() as { photoUrl: string };

    // Download image bytes from Supabase Storage (signed URL)
    const imageResponse = await fetch(photoUrl);
    if (!imageResponse.ok) throw new Error(`Image fetch failed: ${imageResponse.status}`);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(imageBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const claudeResponse = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: base64 },
            },
            {
              type: "text",
              text: `This is a photo of food, likely Filipino home cooking or Filipino restaurant food.
Estimate the nutritional content for what appears to be one typical serving.
Return ONLY valid JSON (no markdown, no explanation):
{ "food_name": string, "description": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "confidence": "low"|"medium"|"high" }
If the image is not food, return exactly: { "error": "not_food" }`,
            },
          ],
        },
      ],
    });

    const text =
      claudeResponse.content[0].type === "text" ? claudeResponse.content[0].text.trim() : "{}";

    // Strip markdown code fences if Claude added them anyway
    const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const result = JSON.parse(jsonText);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("verify-photo error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/verify-photo/index.ts
git commit -m "feat: add verify-photo edge function (Haiku vision, Filipino food)"
```

---

## Task 4: `hooks/useCoach.ts`

**Files:**
- Create: `hooks/useCoach.ts`

- [ ] **Step 1: Write the hook**

```typescript
// hooks/useCoach.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { CoachMessage, MessageType } from '../types/database';

export function useCoachMessages() {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['coach_messages', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('coach_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as CoachMessage[];
    },
    enabled: !!userId,
  });
}

export function useTodayMessageCount() {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['coach_messages_today', userId],
    queryFn: async () => {
      if (!userId) return 0;
      const today = new Date().toISOString().substring(0, 10);
      const { count, error } = await supabase
        .from('coach_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('role', 'user')
        .gte('created_at', `${today}T00:00:00Z`)
        .lte('created_at', `${today}T23:59:59Z`);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
  });
}

export function useSendMessage(messageType: MessageType = 'chat') {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);
  return useMutation({
    mutationFn: async (message: string): Promise<{ response: string }> => {
      if (!userId) throw new Error('Not logged in');
      const { data, error } = await supabase.functions.invoke('coach-chat', {
        body: { message, messageType },
      });
      if (error) throw error;
      return data as { response: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach_messages', userId] });
      queryClient.invalidateQueries({ queryKey: ['coach_messages_today', userId] });
    },
  });
}

export function useDailyTip() {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['daily_tip', userId],
    queryFn: async (): Promise<string> => {
      if (!userId) return '';
      const { data, error } = await supabase.functions.invoke('coach-chat', {
        body: {
          message: 'Give me one short fitness or nutrition tip for today. Under 40 words. No greeting.',
          messageType: 'chat',
        },
      });
      if (error) throw error;
      return (data as { response: string }).response;
    },
    enabled: !!userId,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors related to `hooks/useCoach.ts`.

- [ ] **Step 3: Commit**

```bash
git add hooks/useCoach.ts
git commit -m "feat: add useCoach hook (messages, daily tip, send, count)"
```

---

## Task 5: `app/(tabs)/coach/index.tsx` — Chat UI

**Files:**
- Modify: `app/(tabs)/coach/index.tsx` (full replacement of placeholder)

- [ ] **Step 1: Replace the file**

```typescript
// app/(tabs)/coach/index.tsx
import { useState, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing } from '../../../constants/theme';
import {
  useCoachMessages, useTodayMessageCount, useSendMessage,
} from '../../../hooks/useCoach';
import type { CoachMessage } from '../../../types/database';

const GREETING: CoachMessage = {
  id: '__greeting__',
  user_id: '',
  role: 'assistant',
  content: "Kumusta! I'm Coach Mayari 🌙 I'm your personal fitness and nutrition coach. Ask me anything — workout plans, what to eat, why you're not seeing results. Let's go! 💪",
  message_type: 'chat',
  created_at: new Date(0).toISOString(),
};

const QUICK_CHIPS = [
  { label: 'Build my workout plan', navigate: true },
  { label: 'Check my diet', navigate: false },
  { label: "Why am I not losing weight?", navigate: false },
] as const;

function MessageBubble({ msg }: { msg: CoachMessage }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser ? styles.rowUser : styles.rowCoach]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleCoach]}>
        <Text style={[styles.bubbleText, isUser ? styles.textUser : styles.textCoach]}>
          {msg.content}
        </Text>
      </View>
    </View>
  );
}

function TypingIndicator() {
  return (
    <View style={[styles.bubbleRow, styles.rowCoach]}>
      <View style={[styles.bubble, styles.bubbleCoach]}>
        <Text style={styles.textCoach}>● ● ●</Text>
      </View>
    </View>
  );
}

export default function CoachScreen() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const flatRef = useRef<FlatList<CoachMessage>>(null);
  const { data: messages = [], isLoading } = useCoachMessages();
  const { data: todayCount = 0 } = useTodayMessageCount();
  const sendMessage = useSendMessage('chat');

  const hasMessages = messages.length > 0;
  const atLimit = todayCount >= 50;
  const showWarning = todayCount >= 45 && todayCount < 50;

  const listData: CoachMessage[] = hasMessages ? messages : [GREETING];

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sendMessage.isPending || atLimit) return;
    setInput('');
    await sendMessage.mutateAsync(text);
  };

  const handleChip = (chip: (typeof QUICK_CHIPS)[number]) => {
    if (chip.navigate) {
      router.push('/(tabs)/coach/generate');
    } else {
      sendMessage.mutateAsync(chip.label);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages.length, sendMessage.isPending]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌙 Coach Mayari</Text>
        <Text style={styles.headerSub}>Science-based · Always here</Text>
      </View>

      {showWarning && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            You've sent {todayCount} messages today. Limit is 50.
          </Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.brand.primary} />
      ) : (
        <FlatList
          ref={flatRef}
          data={sendMessage.isPending ? [...listData, { ...GREETING, id: '__typing__' }] : listData}
          keyExtractor={item => item.id}
          renderItem={({ item }) =>
            item.id === '__typing__' ? <TypingIndicator /> : <MessageBubble msg={item} />
          }
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            !hasMessages ? (
              <View style={styles.chipsRow}>
                {QUICK_CHIPS.map(chip => (
                  <TouchableOpacity
                    key={chip.label}
                    style={styles.chip}
                    onPress={() => handleChip(chip)}
                    disabled={sendMessage.isPending}
                  >
                    <Text style={styles.chipText}>{chip.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null
          }
        />
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={atLimit ? 'Daily limit reached (50/50)' : 'Ask Coach Mayari...'}
          placeholderTextColor={colors.text.muted}
          multiline
          editable={!atLimit}
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (sendMessage.isPending || atLimit || !input.trim()) && styles.sendBtnOff]}
          onPress={handleSend}
          disabled={sendMessage.isPending || atLimit || !input.trim()}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.brand.secondary, fontSize: typography.xl, fontWeight: '700' },
  headerSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  warningBanner: {
    backgroundColor: '#78350F',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  warningText: { color: '#FEF3C7', fontSize: typography.xs },
  listContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bubbleRow: { marginVertical: 4 },
  rowUser: { alignItems: 'flex-end' },
  rowCoach: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleUser: { backgroundColor: '#4F46E5' },
  bubbleCoach: { backgroundColor: colors.bg.elevated },
  bubbleText: { fontSize: typography.sm, lineHeight: 20 },
  textUser: { color: '#fff' },
  textCoach: { color: colors.text.primary },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  chipText: { color: colors.brand.primary, fontSize: typography.xs, fontWeight: '600' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text.primary,
    fontSize: typography.sm,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnOff: { opacity: 0.35 },
  sendBtnText: { color: '#fff', fontSize: typography.xl, fontWeight: '700' },
});
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/coach/index.tsx
git commit -m "feat: replace coach placeholder with full chat UI"
```

---

## Task 6: `app/(tabs)/coach/generate.tsx`

**Files:**
- Create: `app/(tabs)/coach/generate.tsx`

- [ ] **Step 1: Create the file**

```typescript
// app/(tabs)/coach/generate.tsx
import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing } from '../../../constants/theme';
import { useSendMessage } from '../../../hooks/useCoach';

const PLAN_PROMPT =
  'Generate my personalized workout plan based on my profile and goals. Output as JSON only.';

export default function GenerateScreen() {
  const router = useRouter();
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const hasStarted = useRef(false);
  const sendMessage = useSendMessage('plan_generation');

  const spinInterp = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 3000, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.2, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    sendMessage.mutateAsync(PLAN_PROMPT).then(result => {
      router.replace({
        pathname: '/(tabs)/coach/plan',
        params: { plan: result.response },
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (sendMessage.isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Oops, something went wrong. Try again.</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            hasStarted.current = false;
            sendMessage.reset();
            sendMessage.mutateAsync(PLAN_PROMPT).then(result => {
              router.replace({
                pathname: '/(tabs)/coach/plan',
                params: { plan: result.response },
              });
            });
          }}
        >
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <Animated.Text
        style={[styles.moon, { transform: [{ rotate: spinInterp }, { scale: pulse }] }]}
      >
        🌙
      </Animated.Text>
      <Text style={styles.title}>Generating your personalized plan...</Text>
      <Text style={styles.sub}>Analyzing your profile and recent activity</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  moon: { fontSize: 72, marginBottom: spacing.xl },
  title: {
    color: colors.text.primary,
    fontSize: typography.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  sub: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center' },
  errorText: {
    color: colors.error,
    fontSize: typography.base,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  retryText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
  backLink: { marginTop: spacing.sm },
  backLinkText: { color: colors.text.muted, fontSize: typography.sm },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tabs\)/coach/generate.tsx
git commit -m "feat: add generate screen — animated plan generation with Sonnet"
```

---

## Task 7: `app/(tabs)/coach/plan.tsx`

**Files:**
- Create: `app/(tabs)/coach/plan.tsx`

- [ ] **Step 1: Create the file**

```typescript
// app/(tabs)/coach/plan.tsx
import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { colors, typography, spacing } from '../../../constants/theme';
import type { PlanData, DayPlan } from '../../../types/database';

function parsePlan(raw: string): PlanData | null {
  try {
    return JSON.parse(raw) as PlanData;
  } catch {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try { return JSON.parse(match[1]) as PlanData; } catch { /* fall through */ }
    }
    return null;
  }
}

function DayCard({ day }: { day: DayPlan }) {
  return (
    <View style={styles.dayCard}>
      <Text style={styles.dayLabel}>{day.day_label}</Text>
      {day.exercises.map((ex, i) => (
        <View key={i} style={styles.exRow}>
          <Text style={styles.exName}>{ex.exercise_name}</Text>
          <Text style={styles.exMeta}>{ex.sets} × {ex.reps_low}–{ex.reps_high}</Text>
        </View>
      ))}
    </View>
  );
}

export default function PlanScreen() {
  const router = useRouter();
  const { plan: planRaw } = useLocalSearchParams<{ plan: string }>();
  const userId = useAuthStore(s => s.session?.user.id);
  const profile = useAuthStore(s => s.profile);
  const [saving, setSaving] = useState(false);

  const planData = planRaw ? parsePlan(planRaw) : null;

  const handleSave = async () => {
    if (!planData || !userId || !profile) return;
    setSaving(true);
    try {
      await supabase
        .from('workout_plans')
        .update({ is_active: false })
        .eq('user_id', userId);

      const { error } = await supabase.from('workout_plans').insert({
        user_id: userId,
        split_type: 'custom',
        days_per_week: profile.workout_days?.length ?? planData.days.length,
        plan_data: planData,
        is_active: true,
        generated_by: 'claude',
      });
      if (error) throw error;

      router.replace('/(tabs)/workout');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save plan');
    } finally {
      setSaving(false);
    }
  };

  if (!planData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          Could not read the plan. Try regenerating.
        </Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => router.replace('/(tabs)/coach/generate')}
        >
          <Text style={styles.btnText}>Regenerate</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>Your Personalized Plan</Text>
      <Text style={styles.sub}>Generated by Coach Mayari 🌙</Text>

      {planData.days.map((day, i) => <DayCard key={i} day={day} />)}

      <TouchableOpacity
        style={[styles.btn, saving && styles.btnOff]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>Save This Plan</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.regenBtn}
        onPress={() => router.replace('/(tabs)/coach/generate')}
        disabled={saving}
      >
        <Text style={styles.regenBtnText}>Regenerate</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  centered: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  back: { marginBottom: spacing.md },
  backText: { color: colors.brand.primary, fontSize: typography.base },
  heading: {
    color: colors.text.primary,
    fontSize: typography['2xl'],
    fontWeight: '700',
    marginBottom: 4,
  },
  sub: { color: colors.text.muted, fontSize: typography.sm, marginBottom: spacing.lg },
  dayCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayLabel: {
    color: colors.brand.secondary,
    fontSize: typography.lg,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  exRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exName: { color: colors.text.primary, fontSize: typography.sm },
  exMeta: { color: colors.text.muted, fontSize: typography.sm },
  btn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  btnOff: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
  regenBtn: {
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  regenBtnText: { color: colors.text.secondary, fontSize: typography.base, fontWeight: '600' },
  errorText: {
    color: colors.error,
    fontSize: typography.base,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tabs\)/coach/plan.tsx
git commit -m "feat: add plan screen — day cards, save to workout_plans"
```

---

## Task 8: `app/(tabs)/nutrition/photo.tsx`

**Files:**
- Create: `app/(tabs)/nutrition/photo.tsx`

- [ ] **Step 1: Create the file**

```typescript
// app/(tabs)/nutrition/photo.tsx
import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { supabase } from '../../../../lib/supabase';
import { useAuthStore } from '../../../../stores/authStore';
import { colors, typography, spacing } from '../../../../constants/theme';

type Confidence = 'low' | 'medium' | 'high';

interface EstimateResult {
  food_name: string;
  description: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: Confidence;
}

const CONFIDENCE_COLOR: Record<Confidence, string> = {
  high: colors.success,
  medium: colors.warning,
  low: colors.error,
};

export default function PhotoScreen() {
  const router = useRouter();
  const userId = useAuthStore(s => s.session?.user.id);
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<EstimateResult | null>(null);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
    if (photo) setPhotoUri(photo.uri);
  };

  const handleAnalyze = async () => {
    if (!photoUri || !userId) return;
    setAnalyzing(true);
    try {
      const filename = `${userId}/${Date.now()}.jpg`;
      const fetchRes = await fetch(photoUri);
      const arrayBuffer = await fetchRes.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('food-photos')
        .upload(filename, arrayBuffer, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: signedData, error: signError } = await supabase.storage
        .from('food-photos')
        .createSignedUrl(filename, 300);
      if (signError || !signedData?.signedUrl) throw new Error('Could not get signed URL');

      const { data, error } = await supabase.functions.invoke('verify-photo', {
        body: { photoUrl: signedData.signedUrl },
      });
      if (error) throw error;

      if ((data as { error?: string }).error === 'not_food') {
        Alert.alert('', "Doesn't look like food. Try a clearer photo.");
        setPhotoUri(null);
        return;
      }
      setResult(data as EstimateResult);
    } catch (e: unknown) {
      Alert.alert('Analysis failed', e instanceof Error ? e.message : 'Please try again');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddToDiary = () => {
    if (!result) return;
    router.push({
      pathname: '/(tabs)/nutrition/food/[id]',
      params: {
        id: '__ai__',
        aiEstimated: 'true',
        foodName: result.food_name,
        calories: String(result.calories),
        protein: String(result.protein_g),
        carbs: String(result.carbs_g),
        fat: String(result.fat_g),
      },
    });
  };

  if (!permission) {
    return <View style={styles.centered}><ActivityIndicator color={colors.brand.primary} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permText}>Camera permission is required to log food by photo.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Results view
  if (result) {
    const conf = result.confidence;
    return (
      <View style={styles.resultsRoot}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.foodName}>{result.food_name}</Text>
        <Text style={styles.desc}>{result.description}</Text>
        <View style={[styles.badge, { backgroundColor: CONFIDENCE_COLOR[conf] + '22' }]}>
          <Text style={[styles.badgeText, { color: CONFIDENCE_COLOR[conf] }]}>
            {conf.toUpperCase()} CONFIDENCE
          </Text>
        </View>
        <View style={styles.macroRow}>
          {[
            { label: 'Calories', value: `${result.calories}`, unit: 'kcal', color: colors.text.primary },
            { label: 'Protein', value: `${result.protein_g}g`, unit: '', color: '#6366F1' },
            { label: 'Carbs', value: `${result.carbs_g}g`, unit: '', color: '#F59E0B' },
            { label: 'Fat', value: `${result.fat_g}g`, unit: '', color: '#EF4444' },
          ].map(item => (
            <View key={item.label} style={styles.macroCard}>
              <Text style={[styles.macroValue, { color: item.color }]}>
                {item.value}{item.unit}
              </Text>
              <Text style={styles.macroLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.btn} onPress={handleAddToDiary}>
          <Text style={styles.btnText}>Looks right, add to diary</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => { setResult(null); setPhotoUri(null); }}
        >
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Photo preview view
  if (photoUri) {
    return (
      <View style={styles.root}>
        <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
        {analyzing ? (
          <View style={styles.overlay}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={styles.overlayText}>Analyzing...</Text>
          </View>
        ) : (
          <View style={styles.previewBtns}>
            <TouchableOpacity style={styles.btn} onPress={handleAnalyze}>
              <Text style={styles.btnText}>Analyze Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.retryBtn} onPress={() => setPhotoUri(null)}>
              <Text style={styles.retryText}>Retake</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // Camera view
  return (
    <View style={styles.root}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <View style={styles.cameraUI}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>Point at your food</Text>
          <TouchableOpacity style={styles.shutter} onPress={handleCapture}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  centered: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  camera: { flex: 1 },
  cameraUI: { flex: 1, justifyContent: 'space-between', padding: spacing.lg },
  closeBtn: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint: {
    color: '#fff',
    fontSize: typography.sm,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  shutter: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  preview: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  overlayText: { color: '#fff', fontSize: typography.base },
  previewBtns: {
    position: 'absolute',
    bottom: spacing.xl,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  resultsRoot: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    padding: spacing.lg,
  },
  back: { marginBottom: spacing.md },
  backText: { color: colors.brand.primary, fontSize: typography.base },
  foodName: {
    color: colors.text.primary,
    fontSize: typography['2xl'],
    fontWeight: '700',
    marginBottom: 4,
  },
  desc: {
    color: colors.text.secondary,
    fontSize: typography.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  badgeText: { fontSize: typography.xs, fontWeight: '700' },
  macroRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  macroCard: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  macroValue: { fontSize: typography.base, fontWeight: '700' },
  macroLabel: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  btn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  btnText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
  retryBtn: {
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: { color: colors.text.secondary, fontSize: typography.base, fontWeight: '600' },
  permText: {
    color: colors.text.secondary,
    fontSize: typography.base,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  backLink: { marginTop: spacing.md },
  backLinkText: { color: colors.text.muted, fontSize: typography.sm },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/\(tabs\)/nutrition/photo.tsx
git commit -m "feat: add photo calorie estimation screen (camera → upload → Claude vision)"
```

---

## Task 9: Update `app/(tabs)/nutrition/food/[id].tsx` — AI params

**Files:**
- Modify: `app/(tabs)/nutrition/food/[id].tsx`

The screen currently only handles `{ id, meal_slot, date }` params. When navigated from `photo.tsx` with `id='__ai__'` and `aiEstimated='true'`, it should skip the DB fetch, build a synthetic food object from params, and on save: INSERT into `food_items` first, then log with `ai_estimated: true`.

- [ ] **Step 1: Update params parsing and food fetch logic**

Replace lines 29–46 (the `useLocalSearchParams` call and `useEffect`) with:

```typescript
  const { id, meal_slot, date, aiEstimated, foodName, calories, protein, carbs, fat } =
    useLocalSearchParams<{
      id: string;
      meal_slot: MealSlot;
      date: string;
      aiEstimated?: string;
      foodName?: string;
      calories?: string;
      protein?: string;
      carbs?: string;
      fat?: string;
    }>();

  const isAI = aiEstimated === 'true';
```

- [ ] **Step 2: Replace the useEffect with AI-aware logic**

Replace the existing `useEffect` block (lines 39–46):

```typescript
  useEffect(() => {
    if (isAI) {
      // Build a synthetic FoodItem from AI params — no DB fetch needed
      const synth: FoodItem = {
        id: '__ai__',
        name: foodName ?? 'AI Estimated Food',
        name_fil: null,
        brand: null,
        is_ph_local: false,
        calories_per_100g: calories ? parseFloat(calories) : null,
        protein_per_100g: protein ? parseFloat(protein) : null,
        carbs_per_100g: carbs ? parseFloat(carbs) : null,
        fat_per_100g: fat ? parseFloat(fat) : null,
        fiber_per_100g: null,
        sugar_per_100g: null,
        saturated_fat_per_100g: null,
        polyunsaturated_fat_per_100g: null,
        monounsaturated_fat_per_100g: null,
        sodium_mg_per_100g: null,
        potassium_mg_per_100g: null,
        calcium_mg_per_100g: null,
        iron_mg_per_100g: null,
        magnesium_mg_per_100g: null,
        phosphorus_mg_per_100g: null,
        zinc_mg_per_100g: null,
        vitamin_a_mcg_per_100g: null,
        vitamin_c_mg_per_100g: null,
        vitamin_d_mcg_per_100g: null,
        vitamin_b12_mcg_per_100g: null,
        folate_mcg_per_100g: null,
        cholesterol_mg_per_100g: null,
        barcode: null,
        source: 'custom',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      // AI food: qty is already in grams from the estimate (treat as 100g serving)
      setQty('100');
      setFood(synth);
      setLoading(false);
      return;
    }
    if (!id) return;
    supabase.from('food_items').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error) setFetchError(error.message);
      else setFood(data as FoodItem | null);
      setLoading(false);
    });
  }, [id, isAI]);
```

- [ ] **Step 3: Update `handleAdd` to create the food_items row for AI estimates**

Replace the existing `handleAdd` function (lines 48–57):

```typescript
  async function handleAdd() {
    if (!food) return;
    const q = parseFloat(qty);
    if (isNaN(q) || q <= 0) { Alert.alert('', 'Enter a valid quantity'); return; }

    if (isAI) {
      // For AI-estimated food: create a food_items row first, then log it
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) { Alert.alert('Error', 'Not logged in'); return; }

      const { data: inserted, error: insertErr } = await supabase
        .from('food_items')
        .insert({
          name: food.name,
          is_ph_local: false,
          calories_per_100g: food.calories_per_100g,
          protein_per_100g: food.protein_per_100g,
          carbs_per_100g: food.carbs_per_100g,
          fat_per_100g: food.fat_per_100g,
          source: 'custom',
        })
        .select('id')
        .single();
      if (insertErr || !inserted) {
        Alert.alert('Error', insertErr?.message ?? 'Could not save food');
        return;
      }
      const { error: logErr } = await supabase.from('food_logs').insert({
        user_id: userId,
        food_item_id: inserted.id,
        meal_slot: slot,
        quantity_g: q,
        logged_at: new Date().toISOString(),
        ai_estimated: true,
      });
      if (logErr) { Alert.alert('Error', logErr.message); return; }
      router.back();
      return;
    }

    try {
      await logFood.mutateAsync({ foodItemId: food.id, mealSlot: slot, quantityG: q, date });
      router.back();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not log food');
    }
  }
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/\(tabs\)/nutrition/food/\[id\].tsx
git commit -m "feat: food detail handles AI-estimated params — creates food_items row on add"
```

---

## Task 10: Update `app/(tabs)/index.tsx` — Dashboard

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Add imports**

At the top of the file, add after the existing imports:

```typescript
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useDailyTip } from '../../hooks/useCoach';
```

(Note: `View`, `Text`, `StyleSheet`, `ScrollView` are already imported. Only add what's missing.)

- [ ] **Step 2: Use router and daily tip inside `HomeScreen`**

Inside `export default function HomeScreen()`, add at the top of the function body:

```typescript
  const router = useRouter();
  const { data: dailyTip, isLoading: tipLoading } = useDailyTip();
```

- [ ] **Step 3: Replace the static `coachCard` View**

Replace:
```typescript
      <View style={styles.coachCard}>
        <Text style={styles.coachTitle}>🌙 Coach Mayari</Text>
        <Text style={styles.coachBody}>
          Ready to start your fitness journey? Tap Coach to generate your first workout plan!
        </Text>
      </View>
```

With:
```typescript
      <TouchableOpacity
        style={styles.coachCard}
        onPress={() => router.push('/(tabs)/coach')}
        activeOpacity={0.8}
      >
        <Text style={styles.coachTitle}>🌙 Coach Mayari</Text>
        <Text style={styles.coachBody}>
          {tipLoading
            ? 'Loading today\'s tip...'
            : dailyTip ?? 'Ready to start? Tap Coach to generate your first workout plan!'}
        </Text>
      </TouchableOpacity>
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/\(tabs\)/index.tsx
git commit -m "feat: dashboard coach card navigates to coach tab, shows daily tip"
```

---

## Task 11: Supabase Infrastructure Setup

**No code files — all via CLI / MCP tools.**

- [ ] **Step 1: Create the `food-photos` storage bucket**

In Supabase dashboard → Storage → New bucket:
- Name: `food-photos`
- Public: **OFF** (private)
- File size limit: 5MB
- Allowed MIME types: `image/jpeg, image/png, image/webp`

Then add an RLS policy on the `storage.objects` table (via SQL editor):
```sql
-- Allow authenticated users to INSERT into their own folder
CREATE POLICY "food_photos_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'food-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to SELECT their own files (for signed URL creation)
CREATE POLICY "food_photos_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'food-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

- [ ] **Step 2: Set the Anthropic API key secret**

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
```

Expected output: `Finished supabase secrets set.`

- [ ] **Step 3: Deploy both Edge Functions**

```bash
supabase functions deploy coach-chat
supabase functions deploy verify-photo
```

Expected: both show `Deployed Function coach-chat` and `Deployed Function verify-photo`.

- [ ] **Step 4: Smoke-test `coach-chat` with curl**

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/coach-chat \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"message":"Kumusta! What should I eat for breakfast?","messageType":"chat"}'
```
Expected: `{"response":"..."}` with a Coach Mayari reply in under 5 seconds.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "chore: week 4 complete — AI coach, photo estimation, dashboard update"
```

---

## Self-Review Checklist

- [x] Migration is `011` (not 008 — those are taken)
- [x] Model strings: `claude-haiku-4-5` (chat/photo), `claude-sonnet-4-5` (plan gen) — not retired models
- [x] Claude API called only from Edge Functions, never from mobile
- [x] JWT verified in both Edge Functions before using userId
- [x] Prompt caching on system prompt (`cache_control: { type: 'ephemeral' }`)
- [x] `useDailyTip` uses `staleTime: 24h` so it's called once per session
- [x] Daily message limit: warning at 45, hard block at 50
- [x] AI food flow: creates `food_items` row with `source: 'custom'` + logs with `ai_estimated: true`
- [x] Signed URL (not public URL) passed to `verify-photo` — bucket is private
- [x] `food-photos` bucket RLS restricts to own userId folder
- [x] Plan JSON parsing handles both raw JSON and markdown-fenced JSON from Claude
