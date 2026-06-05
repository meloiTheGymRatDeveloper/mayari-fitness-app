import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
function getSpeech() {
  try { return require('expo-speech') as typeof import('expo-speech'); } catch { return null; }
}
import { colors, typography, spacing, fonts } from '../../../../constants/theme';
import { useFeatureAccess } from '../../../../hooks/useFeatureAccess';

const AMBER = colors.warning;

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

function estimatedDistance(elapsedSeconds: number, targetPaceMinPerKm: number): number {
  if (targetPaceMinPerKm <= 0) return 0;
  return (elapsedSeconds / 60) / targetPaceMinPerKm;
}

export default function RunningActiveSession() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPro } = useFeatureAccess();
  const { sessionType, distanceKm, description, targetPace } = useLocalSearchParams<{
    sessionType: string;
    distanceKm: string;
    description: string;
    targetPace: string;
  }>();

  const [elapsed, setElapsed] = useState(0);
  const [audioCuesOn, setAudioCuesOn] = useState(isPro);
  const lastAnnouncedKm = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const targetDistKm = parseFloat(distanceKm ?? '5');
  const targetPaceNum = parseFloat(targetPace ?? '7');

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Audio km cues (Pro feature)
  useEffect(() => {
    if (!isPro || !audioCuesOn) return;
    const estDist = estimatedDistance(elapsed, targetPaceNum);
    const currentKm = Math.floor(estDist);
    if (currentKm > lastAnnouncedKm.current && currentKm > 0) {
      lastAnnouncedKm.current = currentKm;
      const pace = targetPaceNum;
      const paceMin = Math.floor(pace);
      const paceSec = Math.round((pace - paceMin) * 60);
      getSpeech()?.speak(
        `${currentKm} kilometer. Estimated pace: ${paceMin} minutes ${paceSec} seconds per kilometer.`,
        { language: 'en-PH', rate: 0.9 },
      );
    }
  }, [elapsed, isPro, audioCuesOn, targetPaceNum]);

  const handleEnd = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    getSpeech()?.stop();
    router.replace({
      pathname: '/(tabs)/workout/running/summary' as never,
      params: { elapsed: String(elapsed), targetDistKm: distanceKm },
    } as never);
  }, [elapsed, distanceKm, router]);

  const estimatedKm = estimatedDistance(elapsed, targetPaceNum).toFixed(2);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.sessionMeta}>
        <Text style={styles.sessionType}>{sessionType?.toUpperCase() ?? 'EASY RUN'}</Text>
        <Text style={styles.sessionTitle}>
          {description || `${targetDistKm} km run`}
        </Text>
      </View>

      {/* Target */}
      <View style={styles.targetCard}>
        <Text style={styles.targetLabel}>YOUR TARGET</Text>
        <Text style={styles.targetDist}>{targetDistKm} km</Text>
        {targetPaceNum > 0 && (
          <Text style={styles.targetPace}>
            Target pace: {Math.floor(targetPaceNum)}:{Math.round((targetPaceNum % 1) * 60).toString().padStart(2, '0')}/km
          </Text>
        )}
      </View>

      {/* Timer */}
      <View style={styles.timerCard}>
        <Text style={styles.timerLabel}>SESSION TIMER</Text>
        <Text style={styles.timer}>{formatTime(elapsed)}</Text>
        <Text style={styles.stravaNote}>Running in Strava — we'll sync when you're done</Text>
        {isPro && (
          <Text style={styles.estDist}>~{estimatedKm} km estimated</Text>
        )}
      </View>

      {/* Audio cues toggle (Pro) */}
      {isPro && (
        <TouchableOpacity
          style={styles.audioCueRow}
          onPress={() => setAudioCuesOn(prev => !prev)}
        >
          <Text style={styles.audioCueEmoji}>🔊</Text>
          <Text style={styles.audioCueText}>
            Audio cues {audioCuesOn ? 'on' : 'off'}
          </Text>
          <Text style={styles.audioCueMeta}>Every 1 km</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.endBtn} onPress={handleEnd}>
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
    gap: spacing.lg,
  },
  sessionMeta: { gap: 4 },
  sessionType: {
    color: AMBER,
    fontSize: typography.xs,
    fontFamily: fonts.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sessionTitle: { color: colors.text.primary, fontSize: typography.xl, fontFamily: fonts.bold },
  targetCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  targetLabel: { color: colors.text.muted, fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: 1 },
  targetDist: { color: colors.text.primary, fontSize: typography['3xl'], fontFamily: fonts.bold },
  targetPace: { color: colors.text.secondary, fontSize: typography.sm },
  timerCard: {
    backgroundColor: colors.brand.primary + '15',
    borderRadius: 14,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.brand.primary + '40',
    gap: 4,
  },
  timerLabel: { color: colors.text.muted, fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: 1 },
  timer: { color: colors.brand.primary, fontSize: 56, fontFamily: fonts.bold },
  stravaNote: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },
  estDist: { color: AMBER, fontSize: typography.xs, fontFamily: fonts.semibold },
  audioCueRow: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  audioCueEmoji: { fontSize: 18 },
  audioCueText: { flex: 1, color: colors.text.primary, fontSize: typography.sm, fontFamily: fonts.semibold },
  audioCueMeta: { color: colors.text.muted, fontSize: typography.xs },
  endBtn: {
    backgroundColor: colors.error,
    borderRadius: 14,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: 'auto',
  },
  endBtnText: { color: '#fff', fontSize: typography.base, fontFamily: fonts.bold },
});
