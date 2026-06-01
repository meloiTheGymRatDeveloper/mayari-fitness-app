import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
  Modal, TextInput, Keyboard, TouchableWithoutFeedback,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../../../../stores/authStore';
import { useWorkoutStore } from '../../../../../stores/workoutStore';
import { supabase } from '../../../../../lib/supabase';
import { updatePlanDayExercises } from '../../../../../lib/workoutGenerator';
import { EXERCISE_ALTERNATIVES } from '../../../../../constants/exerciseAlternatives';
import { colors, typography, spacing, fonts } from '../../../../../constants/theme';
import type { WorkoutPlan, DayPlan, PlannedExercise } from '../../../../../types/database';

export default function DayExercisesScreen() {
  const { planId, dayIdx: dayIdxParam } = useLocalSearchParams<{ planId: string; dayIdx: string }>();
  const router = useRouter();
  const userId = useAuthStore(s => s.session?.user.id);
  const { startSession } = useWorkoutStore();

  const dayIdx = parseInt(dayIdxParam ?? '0', 10);

  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [exercises, setExercises] = useState<PlannedExercise[]>([]);
  const [dayLabel, setDayLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editModal, setEditModal] = useState<number | null>(null);
  const [editSets, setEditSets] = useState('');
  const [editRepsLow, setEditRepsLow] = useState('');
  const [editRepsHigh, setEditRepsHigh] = useState('');

  const [addModal, setAddModal] = useState(false);
  const [customExName, setCustomExName] = useState('');

  useEffect(() => {
    if (!userId || !planId) return;
    supabase
      .from('workout_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', userId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setLoading(false); return; }
        const p = data as WorkoutPlan;
        const day: DayPlan = p.plan_data.days[dayIdx];
        setPlan(p);
        setDayLabel(day?.day_label ?? 'Workout');
        setExercises(day?.exercises ?? []);
        setLoading(false);
      });
  }, [userId, planId, dayIdx]);

  const persistExercises = useCallback(async (updated: PlannedExercise[]) => {
    if (!plan || !userId) return;
    setSaving(true);
    try {
      const newPlanData = {
        days: plan.plan_data.days.map((d, i) =>
          i === dayIdx ? { ...d, exercises: updated } : d
        ),
      };
      await updatePlanDayExercises(supabase, userId, plan.id, newPlanData);
      setPlan(prev => prev ? { ...prev, plan_data: newPlanData } : prev);
    } catch {
      Alert.alert('Error', 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }, [plan, userId, dayIdx]);

  function openEdit(idx: number) {
    const ex = exercises[idx];
    if (!ex) return;
    setEditSets(String(ex.sets));
    setEditRepsLow(String(ex.reps_low));
    setEditRepsHigh(String(ex.reps_high));
    setEditModal(idx);
  }

  function handleSaveEdit() {
    if (editModal === null) return;
    const sets = Math.max(1, parseInt(editSets) || 3);
    const repsLow = Math.max(1, parseInt(editRepsLow) || 8);
    const repsHigh = Math.max(repsLow, parseInt(editRepsHigh) || 12);
    const updated = exercises.map((ex, i) =>
      i === editModal ? { ...ex, sets, reps_low: repsLow, reps_high: repsHigh } : ex
    );
    setExercises(updated);
    setEditModal(null);
    Keyboard.dismiss();
    persistExercises(updated);
  }

  function handleDelete(idx: number) {
    const ex = exercises[idx];
    Alert.alert('Remove exercise', `Remove ${ex.exercise_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          const updated = exercises.filter((_, i) => i !== idx);
          setExercises(updated);
          persistExercises(updated);
        },
      },
    ]);
  }

  function handleAddExercise(id: string, displayName?: string) {
    setAddModal(false);
    setCustomExName('');
    const newEx: PlannedExercise = {
      exercise_id: id,
      exercise_name: displayName ?? id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      muscle_group: 'push',
      sets: 3,
      reps_low: 8,
      reps_high: 12,
      rest_seconds: 90,
    };
    const updated = [...exercises, newEx];
    setExercises(updated);
    persistExercises(updated);
  }

  function handleAddCustomExercise() {
    const name = customExName.trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    handleAddExercise(id || 'custom', name);
  }

  async function handleStart() {
    if (!userId || !plan) return;
    setStarting(true);
    try {
      const dayPlan: DayPlan = { day_label: dayLabel, exercises };
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: userId,
          plan_id: plan.id,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error || !data) throw new Error(error?.message ?? 'Session create failed');
      startSession(data.id, plan.id, dayPlan);
      router.push('/(tabs)/workout/gym/active');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not start workout');
    } finally {
      setStarting(false);
    }
  }

  const allExerciseIds = Object.keys(EXERCISE_ALTERNATIVES);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.heading}>{dayLabel}</Text>
          {saving && <ActivityIndicator size="small" color={colors.text.muted} />}
        </View>

        {exercises.map((ex, idx) => (
          <View key={idx} style={styles.exRow}>
            <View style={styles.exInfo}>
              <Text style={styles.exName}>{ex.exercise_name}</Text>
              <Text style={styles.exMeta}>{ex.sets} sets × {ex.reps_low}–{ex.reps_high} reps</Text>
            </View>
            <View style={styles.exActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(idx)}>
                <Text style={styles.actionBtnText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnRed]} onPress={() => handleDelete(idx)}>
                <Text style={styles.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addExBtn} onPress={() => setAddModal(true)}>
          <Text style={styles.addExBtnText}>＋ Add exercise</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.startBtn, (starting || exercises.length === 0) && styles.startBtnOff]}
          onPress={handleStart}
          disabled={starting || exercises.length === 0}
        >
          <Text style={styles.startBtnText}>
            {starting ? 'Starting...' : `Start ${dayLabel}`}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => { Keyboard.dismiss(); setEditModal(null); }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex1}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Edit Exercise</Text>

                  {[
                    { label: 'Sets', value: editSets, setter: setEditSets },
                    { label: 'Reps (low)', value: editRepsLow, setter: setEditRepsLow },
                    { label: 'Reps (high)', value: editRepsHigh, setter: setEditRepsHigh },
                  ].map(({ label, value, setter }) => (
                    <View key={label} style={styles.editRow}>
                      <Text style={styles.editLabel}>{label}</Text>
                      <TextInput
                        style={styles.editInput}
                        value={value}
                        onChangeText={setter}
                        keyboardType="number-pad"
                        maxLength={3}
                        selectTextOnFocus
                      />
                    </View>
                  ))}

                  <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveEdit}>
                    <Text style={styles.modalSaveBtnText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { Keyboard.dismiss(); setEditModal(null); }}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Exercise Modal */}
      <Modal
        visible={addModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setAddModal(false); setCustomExName(''); }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex1}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Add Exercise</Text>

                  <View style={styles.customInputRow}>
                    <TextInput
                      style={styles.customInput}
                      placeholder="Type custom exercise name..."
                      placeholderTextColor={colors.text.muted}
                      value={customExName}
                      onChangeText={setCustomExName}
                      returnKeyType="done"
                      onSubmitEditing={handleAddCustomExercise}
                    />
                    <TouchableOpacity
                      style={[styles.customAddBtn, !customExName.trim() && styles.customAddBtnOff]}
                      onPress={handleAddCustomExercise}
                      disabled={!customExName.trim()}
                    >
                      <Text style={styles.customAddBtnText}>Add</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.orDivider}>— or pick from list —</Text>

                  <ScrollView style={styles.modalList}>
                    {allExerciseIds.map(id => (
                      <TouchableOpacity
                        key={id}
                        style={styles.modalOption}
                        onPress={() => handleAddExercise(id)}
                      >
                        <Text style={styles.modalOptionText}>
                          {id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setAddModal(false); setCustomExName(''); }}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  flex1: { flex: 1 },
  centered: { flex: 1, backgroundColor: colors.bg.primary, justifyContent: 'center', alignItems: 'center' },
  container: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  heading: { color: colors.text.primary, fontSize: typography['2xl'], fontFamily: fonts.bold },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  exInfo: { flex: 1 },
  exName: { color: colors.text.primary, fontSize: typography.base, fontFamily: fonts.semibold },
  exMeta: { color: colors.text.muted, fontSize: typography.sm, fontFamily: fonts.regular, marginTop: 2 },
  exActions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnRed: { backgroundColor: '#EF444420' },
  actionBtnText: { fontSize: 14 },
  deleteBtnText: { color: colors.error, fontSize: typography.sm, fontFamily: fonts.bold },
  addExBtn: { paddingVertical: spacing.sm, marginBottom: spacing.xl },
  addExBtnText: { color: colors.brand.primary, fontSize: typography.sm, fontFamily: fonts.semibold },
  startBtn: {
    backgroundColor: colors.brand.gold,
    borderRadius: 14,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  startBtnOff: { opacity: 0.5 },
  startBtnText: { color: colors.bg.primary, fontSize: typography.lg, fontFamily: fonts.bold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.bg.elevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  modalTitle: { color: colors.text.primary, fontSize: typography.xl, fontFamily: fonts.bold, marginBottom: spacing.md },
  editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  editLabel: { color: colors.text.secondary, fontSize: typography.base, fontFamily: fonts.medium, flex: 1 },
  editInput: {
    backgroundColor: colors.bg.primary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text.primary,
    fontSize: typography.base,
    fontFamily: fonts.semibold,
    textAlign: 'center',
    width: 72,
    paddingVertical: spacing.sm,
  },
  customInputRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  customInput: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    color: colors.text.primary,
    fontSize: typography.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  customAddBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  customAddBtnOff: { opacity: 0.4 },
  customAddBtnText: { color: '#fff', fontSize: typography.sm, fontFamily: fonts.bold },
  orDivider: { color: colors.text.muted, fontSize: typography.xs, fontFamily: fonts.regular, textAlign: 'center', marginBottom: spacing.sm },
  modalList: { maxHeight: 260 },
  modalOption: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalOptionText: { color: colors.text.primary, fontSize: typography.base, fontFamily: fonts.regular },
  modalSaveBtn: {
    backgroundColor: colors.brand.gold,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  modalSaveBtnText: { color: colors.bg.primary, fontSize: typography.base, fontFamily: fonts.bold },
  modalCancelBtn: { marginTop: spacing.sm, alignItems: 'center', padding: spacing.md },
  modalCancelText: { color: colors.brand.primary, fontSize: typography.base, fontFamily: fonts.bold },
});
