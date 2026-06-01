import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, typography, spacing, fonts, labelStyle } from '../../../../constants/theme';
import { useFeatureAccess } from '../../../../hooks/useFeatureAccess';
import { useSyncFromStrava, useStravaConnection } from '../../../../hooks/useStrava';

const AMBER = colors.warning;
const STRAVA_ORANGE = '#FC4C02';

function formatPace(minPerKm: number): string {
  const min = Math.floor(minPerKm);
  const sec = Math.round((minPerKm - min) * 60);
  return `${min}:${sec.toString().padStart(2, '0')}/km`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function RunningSummary() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPro } = useFeatureAccess();
  const { elapsed } = useLocalSearchParams<{ elapsed: string; targetDistKm: string }>();
  const { data: stravaConnection } = useStravaConnection();
  const { mutateAsync: syncStrava, isPending: syncing } = useSyncFromStrava();

  const [syncedMetrics, setSyncedMetrics] = useState<{
    distance_km: number;
    avg_pace_min_per_km: number;
    duration_seconds: number;
  } | null>(null);

  const handleStravaSync = async () => {
    try {
      await syncStrava('running');
      Alert.alert('Synced!', 'Your run has been synced from Strava.');
    } catch (e) {
      Alert.alert('Sync Failed', 'Could not sync from Strava. Make sure you have a completed activity.');
    }
  };

  const elapsedSec = parseInt(elapsed ?? '0', 10);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.lg }]}
    >
      <Text style={styles.emoji}>🏃</Text>
      <Text style={styles.title}>Run Complete!</Text>
      <Text style={styles.sub}>Sync your results from Strava</Text>

      {isPro && stravaConnection && !syncedMetrics && (
        <View style={styles.stravaCard}>
          <Text style={styles.stravaTitle}>Sync from Strava</Text>
          <Text style={styles.stravaHint}>Pulls your latest completed activity</Text>
          <TouchableOpacity
            style={[styles.syncBtn, syncing && styles.syncBtnOff]}
            onPress={handleStravaSync}
            disabled={syncing}
          >
            <Text style={styles.syncBtnText}>{syncing ? 'Syncing…' : 'Sync Now'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {syncedMetrics && (
        <View style={styles.resultsCard}>
          <Text style={labelStyle}>Synced Results</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{syncedMetrics.distance_km} km</Text>
              <Text style={styles.metricLabel}>Distance</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{formatPace(syncedMetrics.avg_pace_min_per_km)}</Text>
              <Text style={styles.metricLabel}>Avg pace</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{formatDuration(syncedMetrics.duration_seconds)}</Text>
              <Text style={styles.metricLabel}>Duration</Text>
            </View>
          </View>
        </View>
      )}

      {elapsedSec > 0 && !syncedMetrics && (
        <View style={styles.elapsedCard}>
          <Text style={styles.elapsedLabel}>Session time</Text>
          <Text style={styles.elapsedValue}>{formatDuration(elapsedSec)}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(tabs)/workout/running' as never)}>
        <Text style={styles.doneBtnText}>Back to Running</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { padding: spacing.lg, alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: 56 },
  title: { color: colors.text.primary, fontSize: typography['2xl'], fontFamily: fonts.bold },
  sub: { color: colors.text.secondary, fontSize: typography.sm },
  stravaCard: {
    width: '100%',
    backgroundColor: STRAVA_ORANGE + '15',
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: STRAVA_ORANGE + '40',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stravaTitle: { color: STRAVA_ORANGE, fontSize: typography.base, fontFamily: fonts.bold },
  stravaHint: { color: colors.text.secondary, fontSize: typography.xs },
  syncBtn: {
    backgroundColor: STRAVA_ORANGE,
    borderRadius: 10,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    marginTop: 4,
  },
  syncBtnOff: { opacity: 0.5 },
  syncBtnText: { color: '#fff', fontSize: typography.base, fontFamily: fonts.bold },
  resultsCard: {
    width: '100%',
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  metric: { alignItems: 'center' },
  metricValue: { color: colors.text.primary, fontSize: typography.xl, fontFamily: fonts.bold },
  metricLabel: { color: colors.text.secondary, fontSize: typography.xs },
  elapsedCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  elapsedLabel: { color: colors.text.muted, fontSize: typography.xs },
  elapsedValue: { color: colors.text.primary, fontSize: typography.xl, fontFamily: fonts.bold },
  doneBtn: {
    backgroundColor: AMBER,
    borderRadius: 14,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  doneBtnText: { color: '#0A0A1E', fontSize: typography.base, fontFamily: fonts.bold },
});
