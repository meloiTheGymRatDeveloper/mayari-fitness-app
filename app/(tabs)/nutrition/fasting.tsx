import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  AppState,
  AppStateStatus,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../../lib/supabase';
import { colors, typography, spacing, fonts } from '../../../constants/theme';
import type { FastingLog } from '../../../types/database';
import { useMayariTriggers } from '../../../hooks/useMayariTriggers';
import { useFeatureAccess } from '../../../hooks/useFeatureAccess';
import ProGate from '../../../components/ui/ProGate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function timeRemaining(until: Date): { hours: number; minutes: number } {
  const diff = Math.max(0, until.getTime() - Date.now());
  return {
    hours: Math.floor(diff / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
  };
}

// ---------------------------------------------------------------------------
// Preset config
// ---------------------------------------------------------------------------

type Preset = '16:8' | '18:6' | '20:4' | 'OMAD';

const PRESET_HOURS: Record<Preset, number> = {
  '16:8': 16,
  '18:6': 18,
  '20:4': 20,
  'OMAD': 23,
};

const ALL_PRESETS: Preset[] = ['16:8', '18:6', '20:4', 'OMAD'];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function FastingScreen() {
  const { canUse } = useFeatureAccess();
  const [loading, setLoading] = useState(true);
  const [activeFast, setActiveFast] = useState<FastingLog | null>(null);
  const [history, setHistory] = useState<FastingLog[]>([]);

  // State A controls
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>('16:8');
  const [customHours, setCustomHours] = useState<number>(16);

  // Force re-render every minute for the live timer
  const [, setTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { fire } = useMayariTriggers();
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userId = useRef<string | null>(null);

  // ------------------------------------------------------------------
  // Data loading
  // ------------------------------------------------------------------

  const loadData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;
      userId.current = user.id;

      // Active fast
      const { data: activeData, error: activeError } = await supabase
        .from('fasting_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeError) throw activeError;
      setActiveFast(activeData ?? null);

      // History (last 7, any status)
      const { data: historyData, error: historyError } = await supabase
        .from('fasting_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(7);

      if (historyError) throw historyError;
      setHistory(historyData ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load fasting data.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-complete a fast when the eating window has passed
  const checkAutoComplete = useCallback(async () => {
    if (!activeFast || activeFast.status !== 'active') return;
    if (!activeFast.eating_window_end) return;

    const windowEnd = new Date(activeFast.eating_window_end);
    if (Date.now() >= windowEnd.getTime()) {
      try {
        const { error } = await supabase
          .from('fasting_logs')
          .update({
            status: 'completed',
            fasting_end: activeFast.eating_window_end,
          })
          .eq('id', activeFast.id);

        if (error) throw error;
        fire('fasting_completed', { window_hours: activeFast.target_window_hours });
        await loadData();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Could not auto-complete fast.';
        Alert.alert('Error', message);
      }
    }
  }, [activeFast, loadData]);

  // AppState listener — re-check when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          checkAutoComplete();
        }
      }
    );
    return () => subscription.remove();
  }, [checkAutoComplete]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 60-second tick for the live timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTick((t) => t + 1);
      checkAutoComplete();
    }, 60000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [checkAutoComplete]);

  // IF window warning — fires 30 minutes before eating window opens
  useEffect(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (!activeFast?.eating_window_start) return;

    const warningAt = new Date(activeFast.eating_window_start).getTime() - 30 * 60 * 1000;
    const delay = warningAt - Date.now();
    if (delay <= 0) return;

    warningTimerRef.current = setTimeout(() => {
      const startTime = new Date(activeFast.eating_window_start!).toLocaleTimeString('en-PH', {
        hour: 'numeric', minute: '2-digit', hour12: true,
      });
      fire('if_window_warning', { eating_start_time: startTime });
    }, delay);

    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [activeFast?.eating_window_start, fire]);

  if (!canUse('intermittentFasting')) {
    return (
      <ProGate
        title="Intermittent Fasting"
        description="Track your fasting window, get a 30-minute heads-up before your eating window opens, and let Mayari coach you through it."
      />
    );
  }

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------

  const handleStartFast = async () => {
    if (!userId.current) return;
    try {
      const fastingStart = new Date();
      const eatingWindowStart = new Date(
        fastingStart.getTime() + customHours * 3600000
      );
      const eatingWindowEnd = new Date(
        eatingWindowStart.getTime() + (24 - customHours) * 3600000
      );

      const { error } = await supabase.from('fasting_logs').insert({
        user_id: userId.current,
        target_window_hours: customHours,
        fasting_start: fastingStart.toISOString(),
        eating_window_start: eatingWindowStart.toISOString(),
        eating_window_end: eatingWindowEnd.toISOString(),
        status: 'active',
      });

      if (error) throw error;
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start fast.';
      Alert.alert('Error', message);
    }
  };

  const handleEndFastEarly = () => {
    if (!activeFast) return;
    Alert.alert(
      'End Fast Early?',
      'This will cancel your current fast. Are you sure?',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'End Fast',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('fasting_logs')
                .update({
                  status: 'cancelled',
                  fasting_end: new Date().toISOString(),
                })
                .eq('id', activeFast.id);

              if (error) throw error;
              await loadData();
            } catch (err: unknown) {
              const message =
                err instanceof Error ? err.message : 'Failed to end fast.';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const handleEndEatingWindow = () => {
    if (!activeFast) return;
    Alert.alert(
      'End Eating Window?',
      'This will mark your fast as completed.',
      [
        { text: 'Not Yet', style: 'cancel' },
        {
          text: 'Complete Fast',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('fasting_logs')
                .update({
                  status: 'completed',
                  fasting_end: new Date().toISOString(),
                })
                .eq('id', activeFast.id);

              if (error) throw error;
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await loadData();
            } catch (err: unknown) {
              const message =
                err instanceof Error ? err.message : 'Failed to complete fast.';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  // ------------------------------------------------------------------
  // Preset / hours controls
  // ------------------------------------------------------------------

  const handlePresetTap = (preset: Preset) => {
    setSelectedPreset(preset);
    setCustomHours(PRESET_HOURS[preset]);
  };

  const handleDecrement = () => {
    const next = Math.max(12, customHours - 1);
    setCustomHours(next);
    // If the new value still matches a preset, highlight it; otherwise clear
    const match = ALL_PRESETS.find((p) => PRESET_HOURS[p] === next) ?? null;
    setSelectedPreset(match);
  };

  const handleIncrement = () => {
    const next = Math.min(23, customHours + 1);
    setCustomHours(next);
    const match = ALL_PRESETS.find((p) => PRESET_HOURS[p] === next) ?? null;
    setSelectedPreset(match);
  };

  // ------------------------------------------------------------------
  // Derived state
  // ------------------------------------------------------------------

  const now = Date.now();

  const isEatingWindow =
    activeFast !== null &&
    activeFast.eating_window_start !== null &&
    now >= new Date(activeFast.eating_window_start).getTime();

  const isFastingPeriod =
    activeFast !== null &&
    activeFast.eating_window_start !== null &&
    now < new Date(activeFast.eating_window_start).getTime();

  // Compute eating-window preview for State A
  const previewEatingStart = new Date(Date.now() + customHours * 3600000);
  const previewEatingEnd = new Date(
    previewEatingStart.getTime() + (24 - customHours) * 3600000
  );

  // ------------------------------------------------------------------
  // Sub-renders
  // ------------------------------------------------------------------

  const renderStateA = () => (
    <View style={styles.stateContainer}>
      <Text style={styles.noFastLabel}>Not currently fasting</Text>

      {/* Preset chips */}
      <View style={styles.presetRow}>
        {ALL_PRESETS.map((preset) => (
          <TouchableOpacity
            key={preset}
            style={[
              styles.presetChip,
              selectedPreset === preset && styles.presetChipSelected,
            ]}
            onPress={() => handlePresetTap(preset)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.presetChipText,
                selectedPreset === preset && styles.presetChipTextSelected,
              ]}
            >
              {preset}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom hours stepper */}
      <View style={styles.stepperRow}>
        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={handleDecrement}
          activeOpacity={0.75}
        >
          <Text style={styles.stepperBtnText}>−</Text>
        </TouchableOpacity>

        <View style={styles.stepperDisplay}>
          <Text style={styles.stepperHours}>{customHours}h</Text>
        </View>

        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={handleIncrement}
          activeOpacity={0.75}
        >
          <Text style={styles.stepperBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.previewLabel}>
        Fast for {customHours}h · Eat{' '}
        {formatTime(previewEatingStart)} – {formatTime(previewEatingEnd)}
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleStartFast}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>Start Fast</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStateB = () => {
    if (!activeFast || !activeFast.eating_window_start) return null;
    const eatingStart = new Date(activeFast.eating_window_start);
    const { hours, minutes } = timeRemaining(eatingStart);

    return (
      <View style={styles.stateContainer}>
        {/* Ring */}
        <View style={[styles.ring, styles.ringFasting]}>
          <Text style={styles.ringTime}>
            {hours}h {minutes}m
          </Text>
          <Text style={styles.ringLabel}>left in fast</Text>
        </View>

        <Text style={styles.windowLabel}>
          Eating window opens at {formatTime(eatingStart)}
        </Text>

        <TouchableOpacity
          style={styles.dangerOutlineButton}
          onPress={handleEndFastEarly}
          activeOpacity={0.85}
        >
          <Text style={styles.dangerOutlineButtonText}>End Fast Early</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStateC = () => {
    if (!activeFast || !activeFast.eating_window_end) return null;
    const eatingEnd = new Date(activeFast.eating_window_end);
    const { hours, minutes } = timeRemaining(eatingEnd);

    return (
      <View style={styles.stateContainer}>
        {/* Ring */}
        <View style={[styles.ring, styles.ringEating]}>
          <Text style={styles.ringTime}>
            {hours}h {minutes}m
          </Text>
          <Text style={styles.ringLabel}>left to eat</Text>
        </View>

        <Text style={styles.windowLabel}>
          Eating window closes at {formatTime(eatingEnd)}
        </Text>

        <TouchableOpacity
          style={styles.successOutlineButton}
          onPress={handleEndEatingWindow}
          activeOpacity={0.85}
        >
          <Text style={styles.successOutlineButtonText}>End Eating Window</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHistoryBadge = (log: FastingLog) => {
    if (log.status === 'completed') return '✅';
    if (log.status === 'cancelled') return '⚡';
    return '🔄';
  };

  const renderActualHours = (log: FastingLog) => {
    if (!log.fasting_end) return '—';
    const diff =
      new Date(log.fasting_end).getTime() -
      new Date(log.fasting_start).getTime();
    return `${Math.round(diff / 3600000)}h`;
  };

  const renderHistory = () => (
    <>
      <Text style={styles.sectionTitle}>Recent Fasts</Text>
      {history.length === 0 ? (
        <Text style={styles.emptyHistory}>No fasting history yet.</Text>
      ) : (
        history.map((log) => {
          const dateStr = new Date(log.fasting_start).toLocaleDateString(
            'en-PH',
            { month: 'short', day: 'numeric' }
          );
          const pattern = `${log.target_window_hours}:${24 - log.target_window_hours}`;
          const actual = renderActualHours(log);
          const badge = renderHistoryBadge(log);

          return (
            <View key={log.id} style={styles.historyRow}>
              <Text style={styles.historyDate}>{dateStr}</Text>
              <Text style={styles.historyPattern}>{pattern}</Text>
              <Text style={styles.historyActual}>{actual}</Text>
              <Text style={styles.historyBadge}>{badge}</Text>
            </View>
          );
        })
      )}
    </>
  );

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>Intermittent Fasting</Text>

      {/* Status Card */}
      <View style={styles.statusCard}>
        {!activeFast && renderStateA()}
        {isFastingPeriod && renderStateB()}
        {isEatingWindow && renderStateC()}
      </View>

      {/* History */}
      {renderHistory()}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  heading: {
    color: colors.text.primary,
    fontSize: typography['2xl'],
    fontFamily: fonts.extrabold,
    marginBottom: spacing.lg,
  },

  // Status card
  statusCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stateContainer: {
    alignItems: 'center',
  },

  // State A — no active fast
  noFastLabel: {
    color: colors.text.muted,
    fontSize: typography.base,
    marginBottom: spacing.lg,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg.elevated,
  },
  presetChipSelected: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  presetChipText: {
    color: colors.text.secondary,
    fontSize: typography.sm,
    fontFamily: fonts.semibold,
  },
  presetChipTextSelected: {
    color: colors.text.primary,
  },

  // Stepper (+/- controls)
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnText: {
    color: colors.text.primary,
    fontSize: typography.xl,
    fontFamily: fonts.bold,
    lineHeight: 24,
  },
  stepperDisplay: {
    width: 72,
    alignItems: 'center',
  },
  stepperHours: {
    color: colors.text.primary,
    fontSize: typography['2xl'],
    fontFamily: fonts.extrabold,
  },
  previewLabel: {
    color: colors.text.secondary,
    fontSize: typography.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },

  // Primary button (Start Fast)
  primaryButton: {
    width: '100%',
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: typography.base,
    fontFamily: fonts.bold,
  },

  // Ring
  ring: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    marginBottom: spacing.lg,
  },
  ringFasting: {
    borderColor: colors.brand.primary,
  },
  ringEating: {
    borderColor: colors.success,
  },
  ringTime: {
    color: colors.text.primary,
    fontSize: 28,
    fontFamily: fonts.extrabold,
  },
  ringLabel: {
    color: colors.text.muted,
    fontSize: typography.xs,
    marginTop: spacing.xs,
  },
  windowLabel: {
    color: colors.text.secondary,
    fontSize: typography.sm,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },

  // Danger outline button (End Fast Early)
  dangerOutlineButton: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.error,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  dangerOutlineButtonText: {
    color: colors.error,
    fontSize: typography.base,
    fontFamily: fonts.bold,
  },

  // Success outline button (End Eating Window)
  successOutlineButton: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.success,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  successOutlineButtonText: {
    color: colors.success,
    fontSize: typography.base,
    fontFamily: fonts.bold,
  },

  // History section
  sectionTitle: {
    color: colors.text.primary,
    fontSize: typography.lg,
    fontFamily: fonts.bold,
    marginBottom: spacing.md,
  },
  emptyHistory: {
    color: colors.text.muted,
    fontSize: typography.sm,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyDate: {
    flex: 2,
    color: colors.text.secondary,
    fontSize: typography.sm,
  },
  historyPattern: {
    flex: 2,
    color: colors.text.primary,
    fontSize: typography.sm,
    fontFamily: fonts.semibold,
    textAlign: 'center',
  },
  historyActual: {
    flex: 2,
    color: colors.text.secondary,
    fontSize: typography.sm,
    textAlign: 'center',
  },
  historyBadge: {
    flex: 1,
    fontSize: typography.base,
    textAlign: 'right',
  },
});
