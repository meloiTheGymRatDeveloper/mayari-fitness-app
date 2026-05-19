import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useWorkoutStore } from '../../stores/workoutStore';
import { colors, typography, spacing } from '../../constants/theme';

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function RestTimer() {
  const router = useRouter();
  const isResting = useWorkoutStore(s => s.isResting);
  const restSecondsLeft = useWorkoutStore(s => s.restSecondsLeft);
  const { tickRest, skipRest, setRest } = useWorkoutStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isResting) {
      intervalRef.current = setInterval(() => tickRest(), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isResting, tickRest]);

  return (
    <Modal visible={isResting} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.label}>REST</Text>
          <Text style={styles.time}>{fmt(restSecondsLeft)}</Text>

          <View style={styles.adjustRow}>
            <TouchableOpacity
              style={styles.adjustBtn}
              onPress={() => setRest(Math.max(10, restSecondsLeft - 30))}
            >
              <Text style={styles.adjustText}>−30s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adjustBtn}
              onPress={() => setRest(restSecondsLeft + 30)}
            >
              <Text style={styles.adjustText}>+30s</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.skipBtn} onPress={skipRest}>
            <Text style={styles.skipText}>Skip Rest</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.coachBtn}
            onPress={() => { skipRest(); router.push('/(tabs)/coach'); }}
          >
            <Text style={styles.coachText}>Ask Coach 🌙</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.bg.elevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
    paddingBottom: 40,
  },
  label: { color: colors.text.muted, fontSize: typography.sm, letterSpacing: 2, textTransform: 'uppercase', marginBottom: spacing.sm },
  time: { color: colors.text.primary, fontSize: 72, fontWeight: '700', marginBottom: spacing.lg },
  adjustRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  adjustBtn: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 80,
    alignItems: 'center',
  },
  adjustText: { color: colors.text.primary, fontSize: typography.base, fontWeight: '600' },
  skipBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  skipText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
  coachBtn: { paddingVertical: spacing.sm },
  coachText: { color: colors.brand.secondary, fontSize: typography.sm },
});
