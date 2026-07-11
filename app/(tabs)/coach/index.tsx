// app/(tabs)/coach/index.tsx
// Coach Mayari — chat-first screen. One merged thread: proactive tips (coach_tips)
// render inline as tip cards between chat bubbles (coach_messages), sorted by time.
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, FlatList, TextInput,
  KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
} from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { colors, typography, spacing, fonts } from '../../../constants/theme';
import {
  useCoachTips, useMarkAllTipsRead, useRequestTip,
} from '../../../hooks/useCoachTips';
import {
  useCoachChatHistory, useSendChatMessage, useChatRemaining,
} from '../../../hooks/useCoachChat';
import { mergeThread, buildSuggestionChips, type ThreadItem } from '../../../lib/coachChat';
import { useDailyNutrition } from '../../../hooks/useDailyNutrition';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import type { CoachTip } from '../../../types/database';
import ChatBubble from '../../../components/coach/ChatBubble';
import Skeleton from '../../../components/ui/Skeleton';
import { useFeatureAccess } from '../../../hooks/useFeatureAccess';
import ProGate from '../../../components/ui/ProGate';

// ── Icon mapping ──────────────────────────────────────────────────────────────
const TIP_ICONS: Record<string, string> = {
  nutrition: '🥗',
  workout: '💪',
  streak: '🔥',
  pr: '🏆',
  general: '🌙',
  insight: '💡',
  risk: '⚠️',
  achievement: '⭐',
};

// ── Tip colour mapping ────────────────────────────────────────────────────────
const TIP_COLOR: Record<string, string> = {
  streak:      colors.brand.goldLight,
  pr:          colors.brand.accent,
  achievement: colors.brand.accent,
  workout:     colors.brand.secondary,
  nutrition:   colors.success,
  insight:     colors.brand.secondary,
  risk:        colors.error,
  general:     colors.brand.gold,
};
function tipColor(tipType: string): string {
  return TIP_COLOR[tipType] ?? colors.brand.gold;
}

// ── Relative time helper ──────────────────────────────────────────────────────
function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(diff / 86400000);
  return `${days}d ago`;
}

// ── Manila-time helpers for chip context ──────────────────────────────────────
function manilaTodayStr(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Manila' });
}
function manilaHourNow(): number {
  return parseInt(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', hour12: false }),
    10,
  ) % 24;
}

function useTodayHasWorkout(): boolean {
  const userId = useAuthStore(s => s.session?.user.id);
  const date = manilaTodayStr();
  const { data } = useQuery({
    queryKey: ['has_workout_today', userId, date],
    enabled: !!userId,
    queryFn: async () => {
      const dayStartUtc = new Date(`${date}T00:00:00+08:00`).toISOString();
      const { count } = await supabase
        .from('workout_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId!)
        .gte('started_at', dayStartUtc);
      return (count ?? 0) > 0;
    },
  });
  return data ?? false;
}

// ── TipCard ───────────────────────────────────────────────────────────────────
function TipCard({ tip }: { tip: CoachTip }) {
  const color = tipColor(tip.tip_type);
  const typeLabel = tip.tip_type.toUpperCase();
  return (
    <View style={[styles.tipCard, { borderLeftColor: color }]}>
      <View style={styles.tipHeader}>
        <Text style={[styles.tipType, { color }]}>{typeLabel}</Text>
        <Text style={styles.tipDot}> · </Text>
        <Text style={styles.tipTime}>{relativeTime(tip.created_at)}</Text>
      </View>
      <View style={styles.tipBody}>
        <Text style={styles.tipIcon}>{TIP_ICONS[tip.tip_type] ?? '🌙'}</Text>
        <Text style={styles.tipContent}>{tip.content}</Text>
      </View>
    </View>
  );
}

// ── CoachScreen ───────────────────────────────────────────────────────────────
export default function CoachScreen() {
  const { canUse } = useFeatureAccess();
  const insets = useSafeAreaInsets();
  const { data: tips = [], isLoading: tipsLoading } = useCoachTips();
  const { data: messages = [], isLoading: chatLoading } = useCoachChatHistory();
  const markRead = useMarkAllTipsRead();
  const requestTip = useRequestTip();
  const send = useSendChatMessage();
  const remaining = useChatRemaining();
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<ThreadItem>>(null);

  const profile = useAuthStore(s => s.profile);
  const daily = useDailyNutrition(manilaTodayStr());
  const hasWorkoutToday = useTodayHasWorkout();

  const moonY = useSharedValue(0);
  useEffect(() => {
    moonY.value = withRepeat(withTiming(4, { duration: 2000 }), -1, true);
    markRead.mutate();
    requestTip.mutate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const moonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: moonY.value }],
  }));

  const thread = useMemo(() => mergeThread(messages, tips), [messages, tips]);

  const manilaHour = manilaHourNow();
  const manilaWeekday = new Date(`${manilaTodayStr()}T00:00:00+08:00`).getUTCDay();
  const chips = buildSuggestionChips({
    proteinGoalG: profile?.protein_goal_g ?? null,
    proteinConsumedG: daily.totals.protein,
    calorieGoal: profile?.calorie_goal ?? null,
    caloriesConsumed: daily.totals.calories,
    manilaHour,
    isWorkoutDay: (profile?.workout_days ?? []).includes(manilaWeekday),
    hasWorkoutToday,
  });

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || send.isPending || remaining <= 0) return;
    setDraft('');
    send.mutate(trimmed);
  }

  if (!canUse('coachTips')) {
    return (
      <ProGate
        title="Coach Mayari"
        description="Chat with your AI coach and get personalised tips on workouts, nutrition, and streaks — tailored to your Filipino lifestyle."
      />
    );
  }

  const isLoading = tipsLoading || chatLoading;

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
      <Animated.View style={[styles.moonOrb, moonAnimStyle]} pointerEvents="none">
        <View style={styles.moonOrbInner} />
      </Animated.View>
      <Text style={styles.header}>Coach Mayari</Text>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 90}
      >
        {isLoading ? (
          <View style={styles.skeletons}>
            <Skeleton width="100%" height={80} style={{ marginBottom: 8 }} />
            <Skeleton width="100%" height={80} style={{ marginBottom: 8 }} />
            <Skeleton width="100%" height={80} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={thread}
            keyExtractor={(it) => `${it.kind}-${it.item.id}`}
            renderItem={({ item }) =>
              item.kind === 'tip' ? <TipCard tip={item.item} /> : <ChatBubble message={item.item} />
            }
            contentContainerStyle={styles.threadContent}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                Kumusta! Ask Coach Mayari anything — workouts, pagkain, streaks. 🌙
              </Text>
            }
          />
        )}

        {send.isPending && <Text style={styles.typing}>Coach Mayari is typing…</Text>}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={styles.chipScroll}
        >
          {chips.map(chip => (
            <Pressable
              key={chip}
              style={[styles.chip, (remaining <= 0 || send.isPending) && styles.chipDisabled]}
              onPress={() => submit(chip)}
              disabled={remaining <= 0 || send.isPending}
            >
              <Text style={styles.chipText}>{chip}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={remaining > 0 ? 'Message Coach Mayari…' : 'Balik bukas — resets at midnight 🌙'}
            placeholderTextColor={colors.text.muted}
            editable={remaining > 0 && !send.isPending}
            onSubmitEditing={() => submit(draft)}
            returnKeyType="send"
            maxLength={500}
          />
          <Pressable
            style={[styles.sendBtn, (remaining <= 0 || !draft.trim() || send.isPending) && styles.sendBtnDisabled]}
            onPress={() => submit(draft)}
          >
            <Text style={styles.sendBtnText}>➤</Text>
          </Pressable>
        </View>
        <Text style={styles.remainingPill}>
          {remaining} message{remaining === 1 ? '' : 's'} left today
        </Text>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  flex1: { flex: 1 },
  moonOrb: { position: 'absolute', top: 0, right: spacing.lg, zIndex: 10 },
  moonOrbInner: { width: 52, height: 52, borderRadius: 26, opacity: 0.35, backgroundColor: '#C4A55A' },
  header: {
    color: colors.text.primary,
    fontSize: typography['2xl'],
    fontFamily: fonts.bold,
    marginBottom: spacing.md,
  },
  skeletons: { gap: 8 },
  threadContent: { gap: 8, paddingBottom: spacing.sm, flexGrow: 1 },
  emptyText: {
    color: colors.text.secondary,
    fontSize: typography.base,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  typing: { color: colors.text.muted, fontSize: typography.xs, marginBottom: 4, fontStyle: 'italic' },
  chipScroll: { flexGrow: 0, marginBottom: spacing.sm },
  chipRow: { gap: spacing.sm },
  chip: {
    backgroundColor: colors.brand.primary + '22',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.brand.primary + '44',
  },
  chipDisabled: { opacity: 0.4 },
  chipText: { color: colors.brand.secondary, fontSize: typography.xs, fontFamily: fonts.semibold },
  inputRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: typography.sm,
    fontFamily: fonts.regular,
  },
  sendBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 16 },
  remainingPill: {
    color: colors.text.muted,
    fontSize: typography.xs,
    textAlign: 'center',
    paddingVertical: 6,
  },
  tipCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    padding: spacing.md,
    borderLeftWidth: 3,
  },
  tipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  tipType: {
    fontSize: typography.xs,
    fontFamily: fonts.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tipDot: { color: colors.text.muted, fontSize: typography.xs },
  tipTime: { color: colors.text.muted, fontSize: typography.xs },
  tipBody: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  tipIcon: { fontSize: 22 },
  tipContent: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.base,
    lineHeight: 22,
  },
});
