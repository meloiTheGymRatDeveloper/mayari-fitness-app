import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../../../stores/authStore';
import { supabase } from '../../../../lib/supabase';
import { colors, typography, spacing, fonts, labelStyle } from '../../../../constants/theme';
import type { CardioSessionSubtype } from '../../../../types/database';
import type { IndoorInterval } from '../../../../constants/cyclingPlans';

const RED = colors.error;

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

type EffortLevel = 'easy' | 'hard' | 'all_out';

const EFFORT_COLOR: Record<EffortLevel, string> = {
  easy: colors.success,
  hard: RED,
  all_out: colors.brand.accent,
};

const EFFORT_LABEL: Record<EffortLevel, string> = {
  easy: 'Easy',
  hard: 'Hard',
  all_out: 'All out',
};

interface IntervalState {
  blockIndex: number;
  repetition: number;
  isResting: boolean;
  blockSecondsLeft: number;
}

export default function CyclingActiveSession() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore(s => s.session?.user.id);
  const { subtype, sessionType, durationMin, distanceKm, description, intervals: intervalsParam } = useLocalSearchParams<{
    subtype: CardioSessionSubtype;
    sessionType: string;
    durationMin: string;
    distanceKm: string;
    description: string;
    intervals: string;
  }>();

  // suppress unused-variable warnings for params not rendered
  void sessionType;
  void durationMin;
  void distanceKm;

  const isOutdoor = subtype === 'outdoor';
  const intervals: IndoorInterval[] = intervalsParam ? JSON.parse(intervalsParam) : [];
  const hasIntervals = intervals.length > 0 && !isOutdoor;

  const [elapsed, setElapsed] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [intervalState, setIntervalState] = useState<IntervalState>({
    blockIndex: 0,
    repetition: 1,
    isResting: false,
    blockSecondsLeft: hasIntervals ? intervals[0].durationMin * 60 : 0,
  });
  const [completedEfforts, setCompletedEfforts] = useState<EffortLevel[]>([]);

  // suppress unused-variable warning — accumulated for future summary use
  void completedEfforts;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intervalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentBlock = hasIntervals ? intervals[intervalState.blockIndex] : null;
  const isLastRep = currentBlock ? intervalState.repetition >= currentBlock.repetitions : true;

  // Start session in DB
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('workout_sessions')
      .insert({
        user_id: userId,
        started_at: new Date().toISOString(),
        workout_type: 'cycling',
        total_volume_kg: 0,
      })
      .select()
      .single()
      .then(({ data }) => {
        if (data) setSessionId(data.id);
      });
  }, [userId]);

  // Elapsed timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Interval timer (indoor only)
  useEffect(() => {
    if (!hasIntervals || isOutdoor) return;
    if (intervalState.blockSecondsLeft <= 0) return;

    intervalTimerRef.current = setInterval(() => {
      setIntervalState(prev => {
        if (prev.blockSecondsLeft <= 1) {
          if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
          return { ...prev, blockSecondsLeft: 0 };
        }
        return { ...prev, blockSecondsLeft: prev.blockSecondsLeft - 1 };
      });
    }, 1000);

    return () => { if (intervalTimerRef.current) clearInterval(intervalTimerRef.current); };
  }, [intervalState.blockIndex, intervalState.isResting, intervalState.repetition]);

  const handleAdvanceInterval = useCallback(() => {
    if (!currentBlock) return;
    if (intervalState.isResting) {
      if (!isLastRep) {
        setIntervalState(prev => ({
          ...prev,
          repetition: prev.repetition + 1,
          isResting: false,
          blockSecondsLeft: currentBlock.durationMin * 60,
        }));
      } else {
        const nextIdx = intervalState.blockIndex + 1;
        if (nextIdx < intervals.length) {
          setIntervalState({
            blockIndex: nextIdx,
            repetition: 1,
            isResting: false,
            blockSecondsLeft: intervals[nextIdx].durationMin * 60,
          });
        }
      }
    } else {
      if (!isLastRep) {
        setIntervalState(prev => ({
          ...prev,
          isResting: true,
          blockSecondsLeft: currentBlock.restMin * 60,
        }));
      } else {
        const nextIdx = intervalState.blockIndex + 1;
        if (nextIdx < intervals.length) {
          setIntervalState({
            blockIndex: nextIdx,
            repetition: 1,
            isResting: false,
            blockSecondsLeft: intervals[nextIdx].durationMin * 60,
          });
        }
      }
    }
  }, [intervalState, currentBlock, intervals, isLastRep]);

  const handleLogEffort = useCallback((effort: EffortLevel) => {
    setCompletedEfforts(prev => [...prev, effort]);
    handleAdvanceInterval();
  }, [handleAdvanceInterval]);

  const handleFinish = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
    if (sessionId) {
      await supabase.from('workout_sessions').update({
        ended_at: new Date().toISOString(),
        total_volume_kg: 0,
      }).eq('id', sessionId);
    }
    router.replace({
      pathname: '/(tabs)/workout/cycling/summary' as never,
      params: { elapsed: String(elapsed), subtype, sessionId: sessionId ?? '' },
    } as never);
  }, [sessionId, elapsed, subtype, router]);

  // ─── OUTDOOR LAYOUT ─────────────────────────────────────────────────────────
  if (isOutdoor) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.sessionMeta}>
          <Text style={styles.sessionTypeLabel}>OUTDOOR · CYCLING</Text>
          <Text style={styles.sessionTitle}>{description || 'Outdoor Ride'}</Text>
        </View>

        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>SESSION TIMER</Text>
          <Text style={[styles.timer, { color: colors.brand.primary }]}>{formatTime(elapsed)}</Text>
          <Text style={styles.stravaNote}>Riding in Strava — we'll sync when you're done</Text>
        </View>

        <TouchableOpacity style={styles.endBtn} onPress={handleFinish}>
          <Text style={styles.endBtnText}>End Ride</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── INDOOR LAYOUT ──────────────────────────────────────────────────────────
  const currentEffort = currentBlock?.effort as EffortLevel | undefined;
  const effortColor = currentEffort ? EFFORT_COLOR[currentEffort] : colors.brand.primary;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.sessionMeta}>
        <Text style={styles.sessionTypeLabel}>INDOOR · STATIONARY BIKE</Text>
        <Text style={styles.sessionTitle}>{description || 'Indoor Session'}</Text>
        <Text style={styles.elapsedSmall}>Elapsed: {formatTime(elapsed)}</Text>
      </View>

      {/* Current interval block */}
      {currentBlock && (
        <View style={[styles.intervalCard, { borderColor: effortColor + '60', backgroundColor: effortColor + '18' }]}>
          <Text style={[styles.intervalBlockLabel, { color: effortColor }]}>
            {intervalState.isResting
              ? `REST · ${currentBlock.repetitions > 1 ? `Rep ${intervalState.repetition} of ${currentBlock.repetitions}` : ''}`
              : `INTERVAL ${intervalState.repetition} OF ${currentBlock.repetitions}`}
          </Text>
          <Text style={styles.intervalBlockDesc}>
            {intervalState.isResting
              ? 'Active rest'
              : `${currentBlock.durationMin > 0 ? `${currentBlock.durationMin} min` : ''} · ${EFFORT_LABEL[currentBlock.effort as EffortLevel]}`}
          </Text>
          <Text style={[styles.intervalTimer, { color: effortColor }]}>
            {formatTime(intervalState.blockSecondsLeft)}
          </Text>
        </View>
      )}

      {/* Session structure overview */}
      {hasIntervals && (
        <ScrollView style={styles.structureScroll} contentContainerStyle={styles.structure}>
          <Text style={labelStyle}>Session Structure</Text>
          {intervals.map((block, idx) => {
            const done = idx < intervalState.blockIndex;
            const current = idx === intervalState.blockIndex;
            const blockEffort = block.effort as EffortLevel;
            return (
              <View
                key={idx}
                style={[
                  styles.structureRow,
                  done && styles.structureRowDone,
                  current && { borderColor: EFFORT_COLOR[blockEffort], borderWidth: 1 },
                ]}
              >
                <View style={[styles.structureDot, { backgroundColor: done ? colors.success : EFFORT_COLOR[blockEffort] }]} />
                <Text style={[styles.structureText, done && styles.structureTextDone]}>
                  {block.repetitions > 1
                    ? `${block.durationMin} min ${EFFORT_LABEL[blockEffort]} × ${block.repetitions}`
                    : `${block.durationMin} min ${EFFORT_LABEL[blockEffort]}`}
                  {block.restMin > 0 ? `, ${block.restMin} min rest` : ''}
                </Text>
                {done && <Text style={styles.structureCheck}>✓</Text>}
                {current && <Text style={[styles.structureCurrent, { color: EFFORT_COLOR[blockEffort] }]}>▶</Text>}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Effort rating (indoor) */}
      {hasIntervals && currentBlock && !intervalState.isResting && (
        <View style={styles.effortRow}>
          <Text style={styles.effortLabel}>Rate this interval:</Text>
          {(['easy', 'hard', 'all_out'] as EffortLevel[]).map(effort => (
            <TouchableOpacity
              key={effort}
              style={[styles.effortBtn, { backgroundColor: EFFORT_COLOR[effort] + '25', borderColor: EFFORT_COLOR[effort] }]}
              onPress={() => handleLogEffort(effort)}
            >
              <Text style={[styles.effortBtnText, { color: EFFORT_COLOR[effort] }]}>{EFFORT_LABEL[effort]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Skip rest button */}
      {hasIntervals && intervalState.isResting && (
        <TouchableOpacity style={styles.skipRestBtn} onPress={handleAdvanceInterval}>
          <Text style={styles.skipRestText}>Skip Rest →</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.endBtn} onPress={handleFinish}>
        <Text style={styles.endBtnText}>End Session</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sessionMeta: { gap: 2 },
  sessionTypeLabel: {
    color: RED,
    fontSize: typography.xs,
    fontFamily: fonts.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sessionTitle: { color: colors.text.primary, fontSize: typography.xl, fontFamily: fonts.bold },
  elapsedSmall: { color: colors.text.muted, fontSize: typography.xs },
  timerCard: {
    backgroundColor: colors.brand.primary + '15',
    borderRadius: 14,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.brand.primary + '40',
    gap: 4,
    marginTop: spacing.sm,
  },
  timerLabel: { color: colors.text.muted, fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: 1 },
  timer: { fontSize: 56, fontFamily: fonts.bold },
  stravaNote: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  intervalCard: {
    borderRadius: 14,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    gap: 4,
  },
  intervalBlockLabel: { fontSize: typography.xs, fontFamily: fonts.bold, letterSpacing: 1, textTransform: 'uppercase' },
  intervalBlockDesc: { color: colors.text.primary, fontSize: typography.base, fontFamily: fonts.semibold },
  intervalTimer: { fontSize: 56, fontFamily: fonts.bold },
  structureScroll: { flex: 1, maxHeight: 160 },
  structure: { gap: spacing.xs },
  structureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.elevated,
    borderRadius: 8,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  structureRowDone: { opacity: 0.5 },
  structureDot: { width: 8, height: 8, borderRadius: 4 },
  structureText: { flex: 1, color: colors.text.primary, fontSize: typography.xs },
  structureTextDone: { color: colors.text.muted },
  structureCheck: { color: colors.success, fontSize: typography.xs },
  structureCurrent: { fontSize: typography.xs },
  effortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  effortLabel: { color: colors.text.muted, fontSize: typography.xs, flex: 1 },
  effortBtn: {
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
  },
  effortBtnText: { fontSize: typography.xs, fontFamily: fonts.bold },
  skipRestBtn: {
    backgroundColor: colors.bg.elevated,
    borderRadius: 10,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipRestText: { color: colors.text.secondary, fontSize: typography.sm, fontFamily: fonts.semibold },
  endBtn: {
    backgroundColor: colors.error,
    borderRadius: 14,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: 'auto',
  },
  endBtnText: { color: '#fff', fontSize: typography.base, fontFamily: fonts.bold },
});
