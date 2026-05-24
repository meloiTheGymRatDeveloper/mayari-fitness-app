import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, Alert, StyleSheet, TextInput, Keyboard,
  TouchableWithoutFeedback, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../stores/authStore';
import { supabase } from '../../../lib/supabase';
import { saveWorkoutPlan } from '../../../lib/workoutGenerator';
import { EXERCISE_ALTERNATIVES } from '../../../constants/exerciseAlternatives';
import { colors, typography, spacing } from '../../../constants/theme';
import type { PlanData, PlannedExercise } from '../../../types/database';

// Equipment compatibility check
function isCompatible(exerciseId: string, equipmentType: string): boolean {
  const barbellOnly = ['barbell-row', 'barbell-curl', 'deadlift', 'squat', 'barbell-curl', 'bench-press', 'overhead-press', 'incline-bench-press'];
  const cableOnly = ['cable-row', 'tricep-pushdown', 'lat-pulldown'];
  if (equipmentType === 'bodyweight') {
    return !barbellOnly.includes(exerciseId) && !cableOnly.includes(exerciseId);
  }
  if (equipmentType === 'dumbbells') {
    return !barbellOnly.includes(exerciseId) && !cableOnly.includes(exerciseId);
  }
  return true; // full_gym and barbell can do everything
}

export default function PlanPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    planJson: string;
    splitType: string;
    splitLabel: string;
    daysPerWeek: string;
  }>();
  const queryClient = useQueryClient();
  const profile = useAuthStore(s => s.profile);
  const userId = useAuthStore(s => s.session?.user.id);

  const [planData, setPlanData] = useState<PlanData>(() => {
    try { return JSON.parse(params.planJson); }
    catch { return { days: [] }; }
  });
  const [swapModal, setSwapModal] = useState<{ dayIdx: number; exerciseIdx: number; append: boolean } | null>(null);
  const [editModal, setEditModal] = useState<{ dayIdx: number; exerciseIdx: number } | null>(null);
  const [editSets, setEditSets] = useState('');
  const [editRepsLow, setEditRepsLow] = useState('');
  const [editRepsHigh, setEditRepsHigh] = useState('');
  const [saving, setSaving] = useState(false);

  const equipmentType = profile?.equipment_type ?? 'full_gym';

  // Get alternatives for swap modal
  function getAlternatives(exerciseId: string): string[] {
    const alts = EXERCISE_ALTERNATIVES[exerciseId] ?? [];
    return alts.filter(id => isCompatible(id, equipmentType));
  }

  function handleSwap(dayIdx: number, exerciseIdx: number) {
    setSwapModal({ dayIdx, exerciseIdx, append: false });
  }

  function handleAddExercise(dayIdx: number) {
    // For adding, use a generic set of push/pull/legs/core exercises
    setSwapModal({ dayIdx, exerciseIdx: -1, append: true });
  }

  function handleDelete(dayIdx: number, exerciseIdx: number) {
    Alert.alert(
      'Remove exercise',
      `Remove ${planData.days[dayIdx].exercises[exerciseIdx].exercise_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setPlanData(prev => {
              const days = prev.days.map((day, di) => {
                if (di !== dayIdx) return day;
                return {
                  ...day,
                  exercises: day.exercises.filter((_, ei) => ei !== exerciseIdx),
                };
              });
              return { days };
            });
          },
        },
      ]
    );
  }

  function openEditModal(dayIdx: number, exerciseIdx: number) {
    const ex = planData.days[dayIdx]?.exercises[exerciseIdx];
    if (!ex) return;
    setEditSets(String(ex.sets));
    setEditRepsLow(String(ex.reps_low));
    setEditRepsHigh(String(ex.reps_high));
    setEditModal({ dayIdx, exerciseIdx });
  }

  function handleSaveEdit() {
    if (!editModal) return;
    const sets = Math.max(1, parseInt(editSets) || 3);
    const repsLow = Math.max(1, parseInt(editRepsLow) || 8);
    const repsHigh = Math.max(repsLow, parseInt(editRepsHigh) || 12);
    const { dayIdx, exerciseIdx } = editModal;
    setPlanData(prev => {
      const days = prev.days.map((day, di) => {
        if (di !== dayIdx) return day;
        return {
          ...day,
          exercises: day.exercises.map((ex, ei) =>
            ei === exerciseIdx ? { ...ex, sets, reps_low: repsLow, reps_high: repsHigh } : ex
          ),
        };
      });
      return { days };
    });
    setEditModal(null);
  }

  function handleSelectAlternative(altId: string) {
    if (!swapModal) return;
    const { dayIdx, exerciseIdx, append } = swapModal;
    setSwapModal(null);

    setPlanData(prev => {
      const days = prev.days.map((day, di) => {
        if (di !== dayIdx) return day;
        const newExercise: PlannedExercise = {
          exercise_id: altId,
          exercise_name: altId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          muscle_group: day.exercises[0]?.muscle_group ?? 'push',
          sets: 3,
          reps_low: 8,
          reps_high: 12,
          rest_seconds: 180,
        };
        if (append) {
          return { ...day, exercises: [...day.exercises, newExercise] };
        }
        return {
          ...day,
          exercises: day.exercises.map((ex, ei) =>
            ei === exerciseIdx ? { ...newExercise, sets: ex.sets, reps_low: ex.reps_low, reps_high: ex.reps_high } : ex
          ),
        };
      });
      return { days };
    });
  }

  async function handleSave() {
    if (!userId || !profile) return;
    setSaving(true);
    try {
      await saveWorkoutPlan(supabase, userId, {
        splitType: params.splitType,
        splitLabel: params.splitLabel,
        daysPerWeek: Number(params.daysPerWeek),
        planData,
      }, Number(params.daysPerWeek));
      await queryClient.invalidateQueries({ queryKey: ['workout_plan'] });
      router.replace('/(tabs)/workout');
    } catch {
      Alert.alert('Error', 'Could not save plan. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // For swap modal: get exercise list
  const swapTargetId = swapModal && !swapModal.append
    ? planData.days[swapModal.dayIdx]?.exercises[swapModal.exerciseIdx]?.exercise_id
    : null;
  const modalOptions = swapTargetId
    ? getAlternatives(swapTargetId)
    : Object.keys(EXERCISE_ALTERNATIVES).filter(id => isCompatible(id, equipmentType));

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.splitLabel}>{params.splitLabel}</Text>

        {planData.days.map((day, dayIdx) => (
          <View key={dayIdx} style={styles.daySection}>
            <Text style={styles.dayLabel}>{day.day_label}</Text>

            {day.exercises.map((ex, exIdx) => (
              <View key={exIdx} style={styles.exerciseRow}>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{ex.exercise_name}</Text>
                  <Text style={styles.exerciseMeta}>{ex.sets} sets × {ex.reps_low}–{ex.reps_high} reps</Text>
                </View>
                <View style={styles.exerciseActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(dayIdx, exIdx)}>
                    <Text style={styles.actionBtnText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleSwap(dayIdx, exIdx)}>
                    <Text style={styles.actionBtnText}>⇄</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(dayIdx, exIdx)}>
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.addBtn} onPress={() => handleAddExercise(dayIdx)}>
              <Text style={styles.addBtnText}>＋ Add exercise</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Plan →'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Sets / Reps Modal */}
      <Modal visible={editModal !== null} transparent animationType="slide" onRequestClose={() => { Keyboard.dismiss(); setEditModal(null); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex1}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Edit Exercise</Text>

                  <View style={styles.editRow}>
                    <Text style={styles.editLabel}>Sets</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editSets}
                      onChangeText={setEditSets}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                    />
                  </View>

                  <View style={styles.editRow}>
                    <Text style={styles.editLabel}>Reps (low)</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editRepsLow}
                      onChangeText={setEditRepsLow}
                      keyboardType="number-pad"
                      maxLength={3}
                      selectTextOnFocus
                    />
                  </View>

                  <View style={styles.editRow}>
                    <Text style={styles.editLabel}>Reps (high)</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editRepsHigh}
                      onChangeText={setEditRepsHigh}
                      keyboardType="number-pad"
                      maxLength={3}
                      selectTextOnFocus
                    />
                  </View>

                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalCancel} onPress={() => { Keyboard.dismiss(); setEditModal(null); }}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Swap / Add Modal */}
      <Modal visible={swapModal !== null} transparent animationType="slide" onRequestClose={() => setSwapModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {swapModal?.append ? 'Add Exercise' : 'Swap Exercise'}
            </Text>
            <ScrollView style={styles.modalList}>
              {modalOptions.map(id => (
                <TouchableOpacity key={id} style={styles.modalOption} onPress={() => handleSelectAlternative(id)}>
                  <Text style={styles.modalOptionText}>
                    {id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </Text>
                </TouchableOpacity>
              ))}
              {modalOptions.length === 0 && (
                <Text style={styles.modalEmpty}>No alternatives available for this equipment.</Text>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setSwapModal(null)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  flex1: { flex: 1 },
  container: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  splitLabel: { color: colors.text.secondary, fontSize: typography.sm, marginBottom: spacing.lg },
  daySection: { marginBottom: spacing.xl },
  dayLabel: { color: colors.text.primary, fontSize: typography.xl, fontWeight: '700', marginBottom: spacing.md },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  exerciseInfo: { flex: 1 },
  exerciseName: { color: colors.text.primary, fontSize: typography.base, fontWeight: '600' },
  exerciseMeta: { color: colors.text.muted, fontSize: typography.sm },
  exerciseActions: { flexDirection: 'row', gap: 4 },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: { color: colors.text.primary, fontSize: typography.base },
  deleteBtn: { backgroundColor: '#EF444420' },
  deleteBtnText: { color: '#EF4444', fontSize: typography.sm },
  addBtn: { marginTop: spacing.sm },
  addBtnText: { color: colors.brand.primary, fontSize: typography.sm, fontWeight: '600' },
  saveBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bg.elevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  modalTitle: { color: colors.text.primary, fontSize: typography.xl, fontWeight: '700', marginBottom: spacing.md },
  editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  editLabel: { color: colors.text.secondary, fontSize: typography.base, flex: 1 },
  editInput: {
    backgroundColor: colors.bg.primary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text.primary,
    fontSize: typography.base,
    fontWeight: '600',
    textAlign: 'center',
    width: 72,
    paddingVertical: spacing.sm,
  },
  modalList: { maxHeight: 300 },
  modalOption: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalOptionText: { color: colors.text.primary, fontSize: typography.base },
  modalEmpty: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center', paddingVertical: spacing.lg },
  modalCancel: {
    marginTop: spacing.md,
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCancelText: { color: colors.brand.primary, fontSize: typography.base, fontWeight: '700' },
});
