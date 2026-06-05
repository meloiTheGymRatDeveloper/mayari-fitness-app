import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { colors, typography, spacing, fonts, labelStyle } from '../../../../constants/theme';
import { useFeatureAccess } from '../../../../hooks/useFeatureAccess';
import { useStravaConnection, useConnectStrava } from '../../../../hooks/useStrava';
import { useCardioEnrollment, useCardioSessions, useEnrollInPlan } from '../../../../hooks/useCardio';
import { useAuthStore } from '../../../../stores/authStore';
import { supabase } from '../../../../lib/supabase';
import { runningPlans, getRunningPlan, getRunningWeek } from '../../../../constants/runningPlans';
import type { RunSessionType } from '../../../../types/database';

const AMBER = colors.warning;

function sessionTypeLabel(type: RunSessionType): string {
  const map: Record<RunSessionType, string> = {
    easy: 'Easy run',
    tempo: 'Tempo run',
    interval: 'Interval run',
    long: 'Long run',
    rest: 'Rest day',
  };
  return map[type] ?? type;
}

function formatPace(minPerKm: number): string {
  const min = Math.floor(minPerKm);
  const sec = Math.round((minPerKm - min) * 60);
  return `${min}:${sec.toString().padStart(2, '0')}/km`;
}

export default function RunningHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);
  const { isPro, canUse } = useFeatureAccess();

  const { data: stravaConnection } = useStravaConnection();
  const { data: enrollment } = useCardioEnrollment('running');
  const { data: recentSessions = [] } = useCardioSessions('running', 5);
  const { mutateAsync: connectStrava, isPending: connectingStrava } = useConnectStrava();
  const { mutateAsync: enrollInPlan } = useEnrollInPlan();

  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [showManualLog, setShowManualLog] = useState(false);
  const [manualDist, setManualDist] = useState('');
  const [manualDuration, setManualDuration] = useState('');
  const [manualEffort, setManualEffort] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [saving, setSaving] = useState(false);

  const activePlan = enrollment ? getRunningPlan(enrollment.plan_template_id) : null;
  const currentWeek = enrollment && activePlan ? getRunningWeek(activePlan, enrollment.current_week) : null;
  const todaySession = currentWeek?.sessions[0] ?? null;
  const progressPct = activePlan && enrollment
    ? ((enrollment.current_week - 1) / activePlan.totalWeeks) * 100
    : 0;

  const handleEnroll = async (planId: string) => {
    try {
      await enrollInPlan({ planTemplateId: planId, workoutType: 'running' });
      setShowPlanPicker(false);
    } catch {
      Alert.alert('Error', 'Could not enroll in plan.');
    }
  };

  const handleManualSave = async () => {
    if (!userId || !manualDist || !manualDuration) return;
    setSaving(true);
    try {
      const distKm = parseFloat(manualDist);
      const [minStr, secStr] = manualDuration.split(':');
      const totalSeconds = (parseInt(minStr, 10) || 0) * 60 + (parseInt(secStr, 10) || 0);
      const paceMinPerKm = distKm > 0 ? (totalSeconds / 60) / distKm : 0;

      const { data: sessionRow } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: userId,
          started_at: new Date(Date.now() - totalSeconds * 1000).toISOString(),
          ended_at: new Date().toISOString(),
          workout_type: 'running',
          total_volume_kg: 0,
        })
        .select()
        .single();

      if (sessionRow) {
        await supabase.from('cardio_metrics').insert({
          session_id: sessionRow.id,
          distance_km: distKm,
          duration_seconds: totalSeconds,
          avg_pace_min_per_km: paceMinPerKm,
        });
        queryClient.invalidateQueries({ queryKey: ['cardio_sessions', 'running', userId] });
        setShowManualLog(false);
        setManualDist('');
        setManualDuration('');
      }
    } catch {
      Alert.alert('Error', 'Could not save run.');
    } finally {
      setSaving(false);
    }
  };

  // suppress unused warning — canUse is available for future gating
  void canUse;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.md }]}
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backArrow}>‹</Text>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
      <Text style={styles.heading}>Running</Text>
      <Text style={styles.sub}>
        {stravaConnection ? 'Strava connected ✓' : 'Log your runs, track your progress'}
      </Text>

      {/* Strava connect banner (Pro only, not yet connected) */}
      {isPro && !stravaConnection && (
        <TouchableOpacity
          style={styles.stravaBanner}
          onPress={() => connectStrava().catch(() => Alert.alert('Error', 'Could not connect Strava.'))}
          disabled={connectingStrava}
        >
          <Text style={styles.stravaBannerTitle}>🔗 Connect Strava</Text>
          <Text style={styles.stravaBannerSub}>Auto-sync runs after each session</Text>
        </TouchableOpacity>
      )}

      {/* Active plan card (Pro) */}
      {isPro && activePlan && enrollment ? (
        <View style={styles.planCard}>
          <View style={styles.planCardHeader}>
            <View>
              <Text style={[labelStyle, { color: AMBER }]}>Active Plan</Text>
              <Text style={styles.planName}>{activePlan.name}</Text>
            </View>
            <Text style={styles.planWeek}>Week {enrollment.current_week} of {activePlan.totalWeeks}</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          {todaySession && (
            <View style={styles.todayBlock}>
              <Text style={styles.todayLabel}>TODAY'S SESSION</Text>
              <Text style={styles.todayTitle}>
                {sessionTypeLabel(todaySession.type)} — {todaySession.distanceKm} km
              </Text>
              <Text style={styles.todayMeta}>
                {todaySession.targetPaceMinPerKm
                  ? `Target: ${formatPace(todaySession.targetPaceMinPerKm)}`
                  : todaySession.description}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => router.push({
              pathname: '/(tabs)/workout/running/active' as never,
              params: {
                sessionType: todaySession?.type ?? 'easy',
                distanceKm: todaySession?.distanceKm ?? 5,
                description: todaySession?.description ?? '',
                targetPace: todaySession?.targetPaceMinPerKm ?? 7,
              },
            } as never)}
          >
            <Text style={styles.startBtnText}>Start Session</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.noPlanCard}>
          <Text style={styles.noPlanEmoji}>🏃</Text>
          <Text style={styles.noPlanTitle}>No active plan</Text>
          {isPro ? (
            <>
              <Text style={styles.noPlanSub}>Start a structured training program</Text>
              <TouchableOpacity style={styles.browsePlansBtn} onPress={() => setShowPlanPicker(true)}>
                <Text style={styles.browsePlansBtnText}>Browse Plans</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.noPlanSub}>Upgrade to Pro to access structured training plans</Text>
          )}
        </View>
      )}

      {/* Plan picker (Pro) */}
      {showPlanPicker && (
        <View style={styles.planPickerCard}>
          <Text style={labelStyle}>Choose a Plan</Text>
          {runningPlans.map(plan => (
            <TouchableOpacity key={plan.id} style={styles.planOption} onPress={() => handleEnroll(plan.id)}>
              <Text style={styles.planOptionName}>{plan.name}</Text>
              <Text style={styles.planOptionMeta}>
                {plan.isOpenEnded ? 'Open-ended' : `${plan.totalWeeks} weeks`} · {plan.description.slice(0, 60)}…
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setShowPlanPicker(false)}>
            <Text style={styles.cancelLink}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Manual log button (always available) */}
      <TouchableOpacity style={styles.manualBtn} onPress={() => setShowManualLog(!showManualLog)}>
        <Text style={styles.manualBtnEmoji}>✏️</Text>
        <View style={styles.manualBtnText}>
          <Text style={styles.manualBtnTitle}>Log a run manually</Text>
          <Text style={styles.manualBtnSub}>Enter distance, time, and effort</Text>
        </View>
        <Text style={styles.manualChevron}>{showManualLog ? '▲' : '›'}</Text>
      </TouchableOpacity>

      {/* Manual log form */}
      {showManualLog && (
        <View style={styles.manualForm}>
          <View style={styles.manualRow}>
            <View style={styles.manualField}>
              <Text style={styles.manualFieldLabel}>Distance (km)</Text>
              <TextInput
                style={styles.manualInput}
                value={manualDist}
                onChangeText={setManualDist}
                keyboardType="decimal-pad"
                placeholder="5.0"
                placeholderTextColor={colors.text.muted}
              />
            </View>
            <View style={styles.manualField}>
              <Text style={styles.manualFieldLabel}>Duration (mm:ss)</Text>
              <TextInput
                style={styles.manualInput}
                value={manualDuration}
                onChangeText={setManualDuration}
                keyboardType="numeric"
                placeholder="25:00"
                placeholderTextColor={colors.text.muted}
              />
            </View>
          </View>
          <Text style={styles.manualFieldLabel}>Perceived Effort</Text>
          <View style={styles.effortRow}>
            {([1, 2, 3, 4, 5] as const).map(e => (
              <TouchableOpacity
                key={e}
                style={[styles.effortBtn, manualEffort === e && styles.effortBtnActive]}
                onPress={() => setManualEffort(e)}
              >
                <Text style={[styles.effortText, manualEffort === e && styles.effortTextActive]}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.saveManualBtn, saving && styles.saveManualBtnOff]}
            onPress={handleManualSave}
            disabled={saving}
          >
            <Text style={styles.saveManualBtnText}>{saving ? 'Saving…' : 'Save Run'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Recent runs */}
      {recentSessions.length > 0 && (
        <View style={styles.recentSection}>
          <View style={styles.sectionRow}>
            <Text style={labelStyle}>Recent Runs</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/workout/running/history' as never)}>
              <Text style={styles.viewAll}>View all →</Text>
            </TouchableOpacity>
          </View>
          {recentSessions.map(s => {
            const metrics = s.cardio_metrics;
            const dateStr = new Date(s.started_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
            return (
              <View key={s.id} style={styles.recentCard}>
                <View>
                  <Text style={styles.recentDist}>
                    {metrics?.distance_km ? `${metrics.distance_km} km` : 'Run logged'}
                  </Text>
                  <Text style={styles.recentMeta}>
                    {dateStr}
                    {metrics?.avg_pace_min_per_km ? ` · ${formatPace(metrics.avg_pace_min_per_km)}` : ''}
                  </Text>
                </View>
                <Text style={styles.doneCheck}>✓</Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={{ height: spacing['2xl'] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { padding: spacing.lg, gap: spacing.sm },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backArrow: { color: colors.brand.primary, fontSize: 28, lineHeight: 28 },
  backText: { color: colors.brand.primary, fontSize: typography.base, fontFamily: fonts.semibold },
  heading: { color: colors.text.primary, fontSize: typography['2xl'], fontFamily: fonts.bold },
  sub: { color: colors.text.secondary, fontSize: typography.sm },
  stravaBanner: {
    backgroundColor: '#FC4C0215',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FC4C0240',
  },
  stravaBannerTitle: { color: '#FC4C02', fontSize: typography.base, fontFamily: fonts.bold },
  stravaBannerSub: { color: colors.text.secondary, fontSize: typography.xs, marginTop: 2 },
  planCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: AMBER,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  planCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planName: { color: colors.text.primary, fontSize: typography.lg, fontFamily: fonts.bold, marginTop: 2 },
  planWeek: { color: colors.text.muted, fontSize: typography.xs },
  progressBar: {
    height: 6,
    backgroundColor: colors.bg.elevated,
    borderRadius: 3,
  },
  progressFill: { height: 6, backgroundColor: AMBER, borderRadius: 3 },
  todayBlock: {
    backgroundColor: colors.bg.elevated,
    borderRadius: 10,
    padding: spacing.sm,
  },
  todayLabel: { color: colors.text.muted, fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: 1 },
  todayTitle: { color: colors.text.primary, fontSize: typography.base, fontFamily: fonts.semibold, marginTop: 4 },
  todayMeta: { color: colors.text.secondary, fontSize: typography.xs, marginTop: 2 },
  startBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 10,
    padding: spacing.sm,
    alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontSize: typography.base, fontFamily: fonts.bold },
  noPlanCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: spacing.xs,
  },
  noPlanEmoji: { fontSize: 28, marginBottom: 4 },
  noPlanTitle: { color: colors.text.primary, fontSize: typography.base, fontFamily: fonts.bold },
  noPlanSub: { color: colors.text.secondary, fontSize: typography.sm, textAlign: 'center' },
  browsePlansBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: 4,
  },
  browsePlansBtnText: { color: '#fff', fontSize: typography.sm, fontFamily: fonts.bold },
  planPickerCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  planOption: {
    backgroundColor: colors.bg.elevated,
    borderRadius: 10,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planOptionName: { color: colors.text.primary, fontSize: typography.sm, fontFamily: fonts.semibold },
  planOptionMeta: { color: colors.text.secondary, fontSize: typography.xs, marginTop: 2 },
  cancelLink: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center', padding: spacing.sm },
  manualBtn: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  manualBtnEmoji: { fontSize: 20 },
  manualBtnText: { flex: 1 },
  manualBtnTitle: { color: colors.text.primary, fontSize: typography.sm, fontFamily: fonts.semibold },
  manualBtnSub: { color: colors.text.muted, fontSize: typography.xs },
  manualChevron: { color: colors.brand.primary, fontSize: typography.xl },
  manualForm: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  manualRow: { flexDirection: 'row', gap: spacing.sm },
  manualField: { flex: 1 },
  manualFieldLabel: { color: colors.text.muted, fontSize: typography.xs, marginBottom: 4 },
  manualInput: {
    backgroundColor: colors.bg.elevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text.primary,
    fontSize: typography.base,
    padding: spacing.sm,
    textAlign: 'center',
  },
  effortRow: { flexDirection: 'row', gap: spacing.xs },
  effortBtn: {
    flex: 1,
    backgroundColor: colors.bg.elevated,
    borderRadius: 8,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  effortBtnActive: { backgroundColor: AMBER + '25', borderColor: AMBER },
  effortText: { color: colors.text.secondary, fontSize: typography.sm, fontFamily: fonts.bold },
  effortTextActive: { color: AMBER },
  saveManualBtn: {
    backgroundColor: AMBER,
    borderRadius: 10,
    padding: spacing.sm,
    alignItems: 'center',
  },
  saveManualBtnOff: { opacity: 0.5 },
  saveManualBtnText: { color: '#0A0A1E', fontSize: typography.base, fontFamily: fonts.bold },
  recentSection: { gap: spacing.sm },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viewAll: { color: colors.brand.primary, fontSize: typography.sm },
  recentCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 10,
    padding: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  recentDist: { color: colors.text.primary, fontSize: typography.sm, fontFamily: fonts.semibold },
  recentMeta: { color: colors.text.secondary, fontSize: typography.xs, marginTop: 2 },
  doneCheck: { color: colors.success, fontSize: typography.sm, fontFamily: fonts.bold },
});
