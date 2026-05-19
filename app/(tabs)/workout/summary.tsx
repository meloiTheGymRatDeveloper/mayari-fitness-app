import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { fallbackExercises } from '../../../constants/exercises';
import { colors, typography, spacing } from '../../../constants/theme';
import type { WorkoutSession, WorkoutSet, PersonalRecord, Exercise } from '../../../types/database';

interface NewPR { exercise_name: string; weight_kg: number; reps: number; }

interface PRUpsert {
  user_id: string;
  exercise_id: string;
  exercise_name: string;
  weight_kg: number;
  reps: number;
  achieved_at: string;
  muscle_group: Exercise['muscle_group'];
}

function formatDuration(start: string, end: string): string {
  const totalMin = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function SummaryScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [newPRs, setNewPRs] = useState<NewPR[]>([]);

  useEffect(() => {
    if (!sessionId || !userId) return;

    async function load() {
      try {
        const [{ data: sess }, { data: setData }, { data: prData }] = await Promise.all([
          supabase.from('workout_sessions').select('*').eq('id', sessionId).single(),
          supabase.from('workout_sets').select('*').eq('session_id', sessionId),
          supabase.from('personal_records').select('*').eq('user_id', userId),
        ]);

        if (!sess) return;
        setSession(sess as WorkoutSession);
        const allSets = (setData ?? []) as WorkoutSet[];
        setSets(allSets);

        // Build exercise_id → muscle_group map: DB first, fallback constants for seed exercises
        const exerciseIds = [...new Set(allSets.map(s => s.exercise_id))];
        const { data: exData } = await supabase
          .from('exercises')
          .select('id, muscle_group')
          .in('id', exerciseIds);

        const muscleMap = new Map<string, Exercise['muscle_group']>();
        for (const ex of (exData ?? [])) {
          muscleMap.set(ex.id, ex.muscle_group as Exercise['muscle_group']);
        }
        for (const fb of fallbackExercises) {
          if (!muscleMap.has(fb.id)) muscleMap.set(fb.id, fb.muscle_group);
        }

        const existingPRs = (prData ?? []) as PersonalRecord[];
        const prMap = new Map(existingPRs.map(pr => [pr.exercise_id, pr]));

        const byExercise = new Map<string, WorkoutSet[]>();
        for (const s of allSets) {
          const arr = byExercise.get(s.exercise_id) ?? [];
          arr.push(s);
          byExercise.set(s.exercise_id, arr);
        }

        const detected: NewPR[] = [];
        const upserts: PRUpsert[] = [];

        for (const [exId, exSets] of byExercise) {
          const best = exSets.reduce((a, b) =>
            b.weight_kg > a.weight_kg || (b.weight_kg === a.weight_kg && b.reps > a.reps) ? b : a,
          );
          const existing = prMap.get(exId);
          const isNew = !existing ||
            best.weight_kg > existing.weight_kg ||
            (best.weight_kg === existing.weight_kg && best.reps > existing.reps);

          if (isNew) {
            detected.push({ exercise_name: best.exercise_name, weight_kg: best.weight_kg, reps: best.reps });
            upserts.push({
              user_id: userId!,
              exercise_id: exId,
              exercise_name: best.exercise_name,
              weight_kg: best.weight_kg,
              reps: best.reps,
              achieved_at: new Date().toISOString(),
              muscle_group: muscleMap.get(exId) ?? 'push',
            });
          }
        }

        if (upserts.length > 0) {
          const { error: upsertError } = await supabase
            .from('personal_records')
            .upsert(upserts, { onConflict: 'user_id,exercise_id' });
          if (upsertError) throw upsertError;
          await queryClient.invalidateQueries({ queryKey: ['personal_records'] });
        }

        setNewPRs(detected);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [sessionId, userId, queryClient]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Session not found.</Text>
      </View>
    );
  }

  const uniqueExercises = [...new Set(sets.map(s => s.exercise_name))];
  const xp = session.xp_earned;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Workout Complete!</Text>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {session.ended_at ? formatDuration(session.started_at, session.ended_at) : '—'}
          </Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{session.total_volume_kg} kg</Text>
          <Text style={styles.statLabel}>Total Volume</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.brand.accent }]}>+{xp}</Text>
          <Text style={styles.statLabel}>XP Earned</Text>
        </View>
      </View>

      {newPRs.length > 0 && (
        <View style={styles.prCard}>
          <Text style={styles.prTitle}>New Personal Records 🏆</Text>
          {newPRs.map((pr, i) => (
            <View key={i} style={styles.prRow}>
              <Text style={styles.prName}>{pr.exercise_name}</Text>
              <Text style={styles.prValue}>{pr.weight_kg} kg × {pr.reps}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Exercises Completed</Text>
        {uniqueExercises.map(name => (
          <Text key={name} style={styles.exerciseItem}>• {name}</Text>
        ))}
      </View>

      <TouchableOpacity
        style={styles.doneBtn}
        onPress={() => {
          queryClient.invalidateQueries({ queryKey: ['workout_sessions'] });
          router.replace('/(tabs)/workout');
        }}
      >
        <Text style={styles.doneBtnText}>Done</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  centered: { flex: 1, backgroundColor: colors.bg.primary, justifyContent: 'center', alignItems: 'center' },
  heading: { color: colors.text.primary, fontSize: typography['2xl'], fontWeight: '700', marginBottom: spacing.lg },
  errorText: { color: colors.text.secondary, fontSize: typography.base },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statBox: { flex: 1, backgroundColor: colors.bg.secondary, borderRadius: 12, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue: { color: colors.text.primary, fontSize: typography.xl, fontWeight: '700' },
  statLabel: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4 },
  prCard: {
    backgroundColor: colors.bg.elevated,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.brand.accent,
  },
  prTitle: { color: colors.brand.accent, fontSize: typography.lg, fontWeight: '700', marginBottom: spacing.sm },
  prRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  prName: { color: colors.text.primary, fontSize: typography.sm },
  prValue: { color: colors.brand.accent, fontSize: typography.sm, fontWeight: '600' },
  section: { marginBottom: spacing.lg },
  sectionTitle: { color: colors.text.secondary, fontSize: typography.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  exerciseItem: { color: colors.text.primary, fontSize: typography.base, paddingVertical: 3 },
  doneBtn: { backgroundColor: colors.brand.primary, borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
});
