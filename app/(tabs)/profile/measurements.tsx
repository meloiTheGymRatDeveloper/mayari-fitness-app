import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useMeasurements, useAddMeasurement } from '../../../hooks/useBodyMeasurements';
import { colors, typography, spacing } from '../../../constants/theme';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import type { BodyMeasurement } from '../../../types/database';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  const today = todayStr();
  if (dateStr === today) return 'Today';
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface FormState {
  weight_kg: string;
  body_fat_pct: string;
  waist_cm: string;
  chest_cm: string;
  arms_cm: string;
  legs_cm: string;
}

const EMPTY_FORM: FormState = {
  weight_kg: '', body_fat_pct: '', waist_cm: '',
  chest_cm: '', arms_cm: '', legs_cm: '',
};

function measurementToForm(m: BodyMeasurement): FormState {
  return {
    weight_kg: m.weight_kg?.toString() ?? '',
    body_fat_pct: m.body_fat_pct?.toString() ?? '',
    waist_cm: m.waist_cm?.toString() ?? '',
    chest_cm: m.chest_cm?.toString() ?? '',
    arms_cm: m.arms_cm?.toString() ?? '',
    legs_cm: m.legs_cm?.toString() ?? '',
  };
}

export default function MeasurementsScreen() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const { data: history = [], isLoading: loadingHistory } = useMeasurements();
  const addMeasurement = useAddMeasurement();

  function setField(key: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function selectHistoryRow(entry: BodyMeasurement) {
    setEditingDate(entry.measured_at);
    setForm(measurementToForm(entry));
  }

  function resetForm() {
    setEditingDate(null);
    setForm(EMPTY_FORM);
  }

  function save() {
    if (!form.weight_kg.trim()) {
      Alert.alert('Weight required', 'Please enter your weight to save a measurement.');
      return;
    }
    const targetDate = editingDate ?? todayStr();
    const existing = history.find(m => m.measured_at === targetDate);
    if (!editingDate && existing) {
      Alert.alert(
        'Entry exists',
        'You already have a measurement for today. Update it?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Update', onPress: () => doSave(targetDate) },
        ]
      );
      return;
    }
    doSave(targetDate);
  }

  function doSave(targetDate: string) {
    const payload = {
      measured_at: targetDate,
      weight_kg: form.weight_kg.trim() ? parseFloat(form.weight_kg) : null,
      body_fat_pct: form.body_fat_pct.trim() ? parseFloat(form.body_fat_pct) : null,
      waist_cm: form.waist_cm.trim() ? parseFloat(form.waist_cm) : null,
      chest_cm: form.chest_cm.trim() ? parseFloat(form.chest_cm) : null,
      arms_cm: form.arms_cm.trim() ? parseFloat(form.arms_cm) : null,
      legs_cm: form.legs_cm.trim() ? parseFloat(form.legs_cm) : null,
      notes: null,
    };
    addMeasurement.mutate(payload, {
      onSuccess: resetForm,
      onError: (e) => Alert.alert('Error', e instanceof Error ? e.message : 'Could not save measurement.'),
    });
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>{editingDate ? `Editing ${formatDate(editingDate)}` : "Today's Measurements"}</Text>

      <View style={styles.formCard}>
        <Input label="Weight (kg) *" value={form.weight_kg} onChangeText={v => setField('weight_kg', v)} keyboardType="decimal-pad" placeholder="e.g. 70.5" />
        <Input label="Body Fat %" value={form.body_fat_pct} onChangeText={v => setField('body_fat_pct', v)} keyboardType="decimal-pad" placeholder="e.g. 18.0" />
        <View style={styles.twoCol}>
          <View style={styles.halfField}>
            <Input label="Waist (cm)" value={form.waist_cm} onChangeText={v => setField('waist_cm', v)} keyboardType="decimal-pad" placeholder="e.g. 80" />
          </View>
          <View style={styles.halfField}>
            <Input label="Chest (cm)" value={form.chest_cm} onChangeText={v => setField('chest_cm', v)} keyboardType="decimal-pad" placeholder="e.g. 95" />
          </View>
        </View>
        <View style={styles.twoCol}>
          <View style={styles.halfField}>
            <Input label="Arms (cm)" value={form.arms_cm} onChangeText={v => setField('arms_cm', v)} keyboardType="decimal-pad" placeholder="e.g. 35" />
          </View>
          <View style={styles.halfField}>
            <Input label="Legs (cm)" value={form.legs_cm} onChangeText={v => setField('legs_cm', v)} keyboardType="decimal-pad" placeholder="e.g. 55" />
          </View>
        </View>
        <View style={styles.formActions}>
          {editingDate && (
            <Button label="Cancel" variant="outline" onPress={resetForm} style={styles.halfBtn} />
          )}
          <Button
            label={editingDate ? 'Update Entry' : 'Save Measurement'}
            onPress={save}
            loading={addMeasurement.isPending}
            style={editingDate ? styles.halfBtn : styles.fullBtn}
          />
        </View>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>History</Text>

      {loadingHistory ? (
        <ActivityIndicator color={colors.brand.primary} style={styles.historyLoader} />
      ) : history.length === 0 ? (
        <Text style={styles.emptyText}>Wala pang measurements. I-log na ngayon!</Text>
      ) : (
        history.map(entry => (
          <TouchableOpacity key={entry.id} style={styles.historyRow} onPress={() => selectHistoryRow(entry)}>
            <View>
              <Text style={styles.historyDate}>{formatDate(entry.measured_at)}</Text>
              <Text style={styles.historyDetails}>
                {[
                  entry.weight_kg != null && `${entry.weight_kg} kg`,
                  entry.body_fat_pct != null && `${entry.body_fat_pct}% BF`,
                  entry.waist_cm != null && `Waist ${entry.waist_cm}cm`,
                ].filter(Boolean).join('  ·  ')}
              </Text>
            </View>
            <Text style={styles.historyChevron}>›</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  sectionTitle: {
    color: colors.text.secondary, fontSize: typography.xs,
    fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  formCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 16, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, gap: spacing.sm,
  },
  twoCol: { flexDirection: 'row', gap: spacing.sm },
  halfField: { flex: 1 },
  formActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  halfBtn: { flex: 1 },
  fullBtn: { flex: 1 },
  historyLoader: { marginTop: spacing.lg },
  emptyText: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center', marginTop: spacing.xl },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: 12, padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  historyDate: { color: colors.text.primary, fontSize: typography.base, fontWeight: '600' },
  historyDetails: { color: colors.text.muted, fontSize: typography.sm, marginTop: 2 },
  historyChevron: { color: colors.text.muted, fontSize: typography.xl },
});
