import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, fonts, labelStyle } from '../../../../constants/theme';
import { useFeatureAccess } from '../../../../hooks/useFeatureAccess';
import { useStravaConnection, useConnectStrava } from '../../../../hooks/useStrava';
import { useCardioEnrollment, useCardioSessions, useEnrollInPlan } from '../../../../hooks/useCardio';
import { cyclingPlans, getCyclingPlan, getCyclingWeek } from '../../../../constants/cyclingPlans';
import type { CardioSessionSubtype } from '../../../../types/database';

const RED = colors.error;

export default function CyclingHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPro } = useFeatureAccess();

  const { data: stravaConnection } = useStravaConnection();
  const { data: enrollment } = useCardioEnrollment('cycling');
  const { data: recentSessions = [] } = useCardioSessions('cycling', 5);
  const { mutateAsync: connectStrava, isPending: connectingStrava } = useConnectStrava();
  const { mutateAsync: enrollInPlan } = useEnrollInPlan();

  const [showPlanPicker, setShowPlanPicker] = useState(false);

  const activePlan = enrollment ? getCyclingPlan(enrollment.plan_template_id) : null;
  const currentWeek = activePlan ? getCyclingWeek(activePlan, enrollment!.current_week) : null;
  const todaySession = currentWeek?.sessions[0] ?? null;
  const progressPct = activePlan && enrollment
    ? ((enrollment.current_week - 1) / activePlan.totalWeeks) * 100
    : 0;

  const handleEnroll = async (planId: string) => {
    try {
      await enrollInPlan({ planTemplateId: planId, workoutType: 'cycling' });
      setShowPlanPicker(false);
    } catch {
      Alert.alert('Error', 'Could not enroll in plan.');
    }
  };

  const handleStartSession = (subtype: CardioSessionSubtype) => {
    if (!todaySession) return;
    router.push({
      pathname: '/(tabs)/workout/cycling/active' as never,
      params: {
        subtype,
        sessionType: todaySession.type,
        durationMin: String(todaySession.durationMin ?? 60),
        distanceKm: String(todaySession.distanceKm ?? 0),
        description: todaySession.description,
        intervals: todaySession.intervals ? JSON.stringify(todaySession.intervals) : '',
      },
    } as never);
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.md }]}
    >
      <Text style={styles.heading}>Cycling</Text>
      <Text style={styles.sub}>
        {stravaConnection ? 'Strava connected ✓' : 'Outdoor & indoor rides'}
      </Text>

      {/* Strava connect banner */}
      {isPro && !stravaConnection && (
        <TouchableOpacity
          style={styles.stravaBanner}
          onPress={() => connectStrava().catch(() => Alert.alert('Error', 'Could not connect Strava.'))}
          disabled={connectingStrava}
        >
          <Text style={styles.stravaBannerTitle}>🔗 Connect Strava</Text>
          <Text style={styles.stravaBannerSub}>Auto-sync outdoor rides · Pro feature</Text>
        </TouchableOpacity>
      )}

      {/* Active plan card (Pro) */}
      {isPro && activePlan && enrollment ? (
        <View style={styles.planCard}>
          <View style={styles.planCardHeader}>
            <View>
              <Text style={[labelStyle, { color: RED }]}>Active Plan</Text>
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
              <Text style={styles.todayTitle}>{todaySession.description}</Text>
              <Text style={styles.todayMeta}>
                {todaySession.durationMin ? `~${todaySession.durationMin} min` : ''}
                {todaySession.distanceKm ? ` · ${todaySession.distanceKm} km` : ''}
                {todaySession.preferredSubtype !== 'either'
                  ? ` · ${todaySession.preferredSubtype === 'outdoor' ? 'Outdoor' : 'Indoor'}`
                  : ''}
              </Text>
            </View>
          )}

          {/* Outdoor / Indoor start buttons */}
          <View style={styles.subtypeRow}>
            <TouchableOpacity
              style={styles.subtypeBtn}
              onPress={() => handleStartSession('outdoor')}
            >
              <Text style={styles.subtypeBtnText}>🚴 Outdoor</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.subtypeBtn, styles.subtypeBtnSecondary]}
              onPress={() => handleStartSession('indoor')}
            >
              <Text style={[styles.subtypeBtnText, styles.subtypeBtnTextSecondary]}>🏠 Indoor</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.noPlanCard}>
          <Text style={styles.noPlanEmoji}>🚴</Text>
          <Text style={styles.noPlanTitle}>No active plan</Text>
          {isPro ? (
            <>
              <Text style={styles.noPlanSub}>Start a structured cycling plan</Text>
              <TouchableOpacity style={styles.browsePlansBtn} onPress={() => setShowPlanPicker(true)}>
                <Text style={styles.browsePlansBtnText}>Browse Plans</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.noPlanSub}>Upgrade to Pro to access training plans</Text>
          )}
          {/* Quick start without a plan */}
          <View style={styles.quickStartRow}>
            <TouchableOpacity
              style={styles.quickStartBtn}
              onPress={() => router.push({
                pathname: '/(tabs)/workout/cycling/active' as never,
                params: { subtype: 'outdoor', sessionType: 'easy', durationMin: '60', distanceKm: '0', description: 'Free outdoor ride', intervals: '' },
              } as never)}
            >
              <Text style={styles.quickStartText}>🚴 Start Outdoor Ride</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickStartBtn, styles.quickStartBtnAlt]}
              onPress={() => router.push({
                pathname: '/(tabs)/workout/cycling/active' as never,
                params: { subtype: 'indoor', sessionType: 'easy', durationMin: '45', distanceKm: '0', description: 'Indoor session', intervals: '' },
              } as never)}
            >
              <Text style={styles.quickStartText}>🏠 Start Indoor Ride</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Plan picker */}
      {showPlanPicker && (
        <View style={styles.planPickerCard}>
          <Text style={labelStyle}>Choose a Plan</Text>
          {cyclingPlans.map(plan => (
            <TouchableOpacity key={plan.id} style={styles.planOption} onPress={() => handleEnroll(plan.id)}>
              <Text style={styles.planOptionName}>{plan.name}</Text>
              <Text style={styles.planOptionMeta}>{plan.totalWeeks} weeks · {plan.description.slice(0, 60)}…</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setShowPlanPicker(false)}>
            <Text style={styles.cancelLink}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Recent rides */}
      {recentSessions.length > 0 && (
        <View style={styles.recentSection}>
          <View style={styles.sectionRow}>
            <Text style={labelStyle}>Recent Rides</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/workout/cycling/history' as never)}>
              <Text style={styles.viewAll}>View all →</Text>
            </TouchableOpacity>
          </View>
          {recentSessions.map(s => {
            const metrics = s.cardio_metrics;
            const dateStr = new Date(s.started_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
            const isOutdoor = metrics?.session_subtype === 'outdoor';
            return (
              <View key={s.id} style={styles.recentCard}>
                <View>
                  <View style={styles.recentTitleRow}>
                    <Text style={styles.recentEmoji}>{isOutdoor ? '🚴' : '🏠'}</Text>
                    <Text style={styles.recentDist}>
                      {metrics?.distance_km
                        ? `${metrics.distance_km} km · ${isOutdoor ? 'Outdoor' : 'Indoor'}`
                        : `${isOutdoor ? 'Outdoor ride' : 'Indoor session'}`}
                    </Text>
                  </View>
                  <Text style={styles.recentMeta}>
                    {dateStr}
                    {metrics?.avg_speed_kmh ? ` · ${metrics.avg_speed_kmh} km/h avg` : ''}
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
    borderLeftColor: RED,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  planCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planName: { color: colors.text.primary, fontSize: typography.lg, fontFamily: fonts.bold, marginTop: 2 },
  planWeek: { color: colors.text.muted, fontSize: typography.xs },
  progressBar: { height: 6, backgroundColor: colors.bg.elevated, borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: RED, borderRadius: 3 },
  todayBlock: {
    backgroundColor: colors.bg.elevated,
    borderRadius: 10,
    padding: spacing.sm,
  },
  todayLabel: { color: colors.text.muted, fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: 1 },
  todayTitle: { color: colors.text.primary, fontSize: typography.base, fontFamily: fonts.semibold, marginTop: 4 },
  todayMeta: { color: colors.text.secondary, fontSize: typography.xs, marginTop: 2 },
  subtypeRow: { flexDirection: 'row', gap: spacing.sm },
  subtypeBtn: {
    flex: 1,
    backgroundColor: colors.brand.primary,
    borderRadius: 10,
    padding: spacing.sm,
    alignItems: 'center',
  },
  subtypeBtnSecondary: {
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subtypeBtnText: { color: '#fff', fontSize: typography.sm, fontFamily: fonts.bold },
  subtypeBtnTextSecondary: { color: colors.text.secondary },
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
  quickStartRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, width: '100%' },
  quickStartBtn: {
    flex: 1,
    backgroundColor: RED + '20',
    borderRadius: 10,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: RED + '40',
  },
  quickStartBtnAlt: {
    backgroundColor: colors.bg.elevated,
    borderColor: colors.border,
  },
  quickStartText: { color: colors.text.primary, fontSize: typography.xs, fontFamily: fonts.semibold },
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
  recentTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recentEmoji: { fontSize: 12 },
  recentDist: { color: colors.text.primary, fontSize: typography.sm, fontFamily: fonts.semibold },
  recentMeta: { color: colors.text.secondary, fontSize: typography.xs, marginTop: 2 },
  doneCheck: { color: colors.success, fontSize: typography.sm, fontFamily: fonts.bold },
});
