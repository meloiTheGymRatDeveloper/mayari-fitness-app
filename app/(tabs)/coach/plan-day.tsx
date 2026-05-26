// app/(tabs)/coach/plan-day.tsx
import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { usePlanEditorStore } from '../../../stores/planEditorStore';
import { colors, typography, spacing } from '../../../constants/theme';
import type { PlannedExercise } from '../../../types/database';

const MUSCLE_GROUPS = ['push', 'pull', 'legs', 'core'] as const;
type MuscleGroup = typeof MUSCLE_GROUPS[number];

const MUSCLE_COLORS: Record<MuscleGroup, string> = {
  push: '#6366F1',
  pull: '#22C55E',
  legs: '#F59E0B',
  core: '#F472B6',
};

const EMPTY_FORM: Partial<PlannedExercise> = {
  exercise_name: '',
  sets: 3,
  reps_low: 8,
  reps_high: 12,
  rest_seconds: 60,
  muscle_group: 'push',
};

function ExerciseForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Partial<PlannedExercise>;
  onSave: (ex: PlannedExercise) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);

  function handleSave() {
    if (!form.exercise_name?.trim()) {
      Alert.alert('Required', 'Exercise name cannot be empty.');
      return;
    }
    onSave({
      exercise_id: form.exercise_id ?? `custom_${Date.now()}`,
      exercise_name: form.exercise_name.trim(),
      sets: Number(form.sets) || 3,
      reps_low: Number(form.reps_low) || 8,
      reps_high: Number(form.reps_high) || 12,
      rest_seconds: Number(form.rest_seconds) || 60,
      muscle_group: (form.muscle_group as MuscleGroup) ?? 'push',
    });
  }

  return (
    <View style={styles.formCard}>
      <Text style={styles.formLabel}>Exercise Name</Text>
      <TextInput
        style={styles.input}
        value={form.exercise_name}
        onChangeText={v => setForm(f => ({ ...f, exercise_name: v }))}
        placeholder="e.g. Bench Press"
        placeholderTextColor={colors.text.muted}
      />

      <View style={styles.formRow}>
        <View style={styles.formField}>
          <Text style={styles.formLabel}>Sets</Text>
          <TextInput
            style={styles.inputSmall}
            value={String(form.sets ?? '')}
            onChangeText={v => setForm(f => ({ ...f, sets: Number(v) || undefined }))}
            keyboardType="numeric"
            placeholderTextColor={colors.text.muted}
          />
        </View>
        <View style={styles.formField}>
          <Text style={styles.formLabel}>Reps (low)</Text>
          <TextInput
            style={styles.inputSmall}
            value={String(form.reps_low ?? '')}
            onChangeText={v => setForm(f => ({ ...f, reps_low: Number(v) || undefined }))}
            keyboardType="numeric"
            placeholderTextColor={colors.text.muted}
          />
        </View>
        <View style={styles.formField}>
          <Text style={styles.formLabel}>Reps (high)</Text>
          <TextInput
            style={styles.inputSmall}
            value={String(form.reps_high ?? '')}
            onChangeText={v => setForm(f => ({ ...f, reps_high: Number(v) || undefined }))}
            keyboardType="numeric"
            placeholderTextColor={colors.text.muted}
          />
        </View>
        <View style={styles.formField}>
          <Text style={styles.formLabel}>Rest (s)</Text>
          <TextInput
            style={styles.inputSmall}
            value={String(form.rest_seconds ?? '')}
            onChangeText={v => setForm(f => ({ ...f, rest_seconds: Number(v) || undefined }))}
            keyboardType="numeric"
            placeholderTextColor={colors.text.muted}
          />
        </View>
      </View>

      <Text style={styles.formLabel}>Muscle Group</Text>
      <View style={styles.muscleChips}>
        {MUSCLE_GROUPS.map(g => {
          const active = form.muscle_group === g;
          return (
            <TouchableOpacity
              key={g}
              style={[styles.muscleChip, active && { backgroundColor: MUSCLE_COLORS[g] }]}
              onPress={() => setForm(f => ({ ...f, muscle_group: g }))}
            >
              <Text style={[styles.muscleChipText, active && styles.muscleChipTextActive]}>
                {g}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.formActions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PlanDayScreen() {
  const { dayIdx: dayIdxRaw } = useLocalSearchParams<{ dayIdx: string }>();
  const dayIdx = parseInt(dayIdxRaw ?? '0', 10);

  const { plan, duration, updateExercise, addExercise, deleteExercise } = usePlanEditorStore();
  const day = plan?.days[dayIdx];

  // null = not editing; -1 = adding new; >=0 = editing that index
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  if (!day) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load day data.</Text>
      </View>
    );
  }

  function handleDeleteExercise(exIdx: number) {
    Alert.alert(
      'Remove Exercise',
      `Remove "${day!.exercises[exIdx].exercise_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteExercise(dayIdx, exIdx),
        },
      ],
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: day.day_label }} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.sub}>
          {day.exercises.length} exercises · ~{duration} min
        </Text>

        {day.exercises.map((ex, i) => {
          const color = MUSCLE_COLORS[ex.muscle_group as MuscleGroup] ?? colors.brand.secondary;
          const isEditing = editingIdx === i;

          if (isEditing) {
            return (
              <ExerciseForm
                key={i}
                initial={ex}
                onSave={updated => {
                  updateExercise(dayIdx, i, updated);
                  setEditingIdx(null);
                }}
                onCancel={() => setEditingIdx(null)}
              />
            );
          }

          return (
            <View key={i} style={styles.exCard}>
              <View style={styles.exHeader}>
                <Text style={styles.exName}>{ex.exercise_name}</Text>
                <View style={styles.exActions}>
                  <View style={[styles.muscleTag, { backgroundColor: color + '33' }]}>
                    <Text style={[styles.muscleText, { color }]}>{ex.muscle_group}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => setEditingIdx(i)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.iconBtnText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => handleDeleteExercise(i)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.iconBtnText}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{ex.sets}</Text>
                  <Text style={styles.statLabel}>sets</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{ex.reps_low}–{ex.reps_high}</Text>
                  <Text style={styles.statLabel}>reps</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{ex.rest_seconds}s</Text>
                  <Text style={styles.statLabel}>rest</Text>
                </View>
              </View>
            </View>
          );
        })}

        {editingIdx === -1 ? (
          <ExerciseForm
            initial={EMPTY_FORM}
            onSave={ex => {
              addExercise(dayIdx, ex);
              setEditingIdx(null);
            }}
            onCancel={() => setEditingIdx(null)}
          />
        ) : (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setEditingIdx(-1)}
          >
            <Text style={styles.addBtnText}>+ Add Exercise</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  centered: {
    flex: 1, backgroundColor: colors.bg.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  sub: { color: colors.text.muted, fontSize: typography.sm, marginBottom: spacing.lg },
  exCard: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  exHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  exName: {
    color: colors.text.primary,
    fontSize: typography.base,
    fontWeight: '700',
    flex: 1,
    marginRight: spacing.sm,
  },
  exActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  muscleTag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  muscleText: { fontSize: typography.xs, fontWeight: '700', textTransform: 'capitalize' },
  iconBtn: { padding: 4 },
  iconBtnText: { fontSize: 15 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.elevated,
    borderRadius: 8,
    padding: spacing.sm,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  statLabel: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },
  addBtn: {
    borderWidth: 1,
    borderColor: colors.brand.primary,
    borderRadius: 12,
    borderStyle: 'dashed',
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  addBtnText: { color: colors.brand.primary, fontSize: typography.base, fontWeight: '600' },
  // Form styles
  formCard: {
    backgroundColor: colors.bg.elevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  formLabel: {
    color: colors.text.secondary,
    fontSize: typography.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text.primary,
    fontSize: typography.base,
  },
  formRow: { flexDirection: 'row', gap: spacing.sm },
  formField: { flex: 1 },
  inputSmall: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    color: colors.text.primary,
    fontSize: typography.sm,
    textAlign: 'center',
  },
  muscleChips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.sm },
  muscleChip: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  muscleChipText: { color: colors.text.secondary, fontSize: typography.sm, textTransform: 'capitalize' },
  muscleChipTextActive: { color: colors.white, fontWeight: '700' },
  formActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: { color: colors.text.secondary, fontSize: typography.sm, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.brand.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveBtnText: { color: colors.white, fontSize: typography.sm, fontWeight: '700' },
  errorText: { color: colors.error, fontSize: typography.base },
});
