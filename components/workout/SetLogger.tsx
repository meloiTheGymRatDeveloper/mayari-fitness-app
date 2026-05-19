import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../constants/theme';

interface Props {
  setNumber: number;
  defaultWeight?: number;
  disabled?: boolean;
  onDone: (weight: number, reps: number) => void;
}

export default function SetLogger({ setNumber, defaultWeight = 0, disabled = false, onDone }: Props) {
  const [weight, setWeight] = useState(String(defaultWeight || ''));
  const [reps, setReps] = useState('');

  function handleDone() {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps, 10) || 0;
    if (r === 0) return;
    onDone(w, r);
    setReps('');
  }

  return (
    <View style={styles.row}>
      <Text style={styles.setNum}>Set {setNumber}</Text>
      <View style={styles.inputs}>
        <TextInput
          style={styles.input}
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          placeholder="kg"
          placeholderTextColor={colors.text.muted}
          editable={!disabled}
        />
        <Text style={styles.times}>×</Text>
        <TextInput
          style={styles.input}
          value={reps}
          onChangeText={setReps}
          keyboardType="number-pad"
          placeholder="reps"
          placeholderTextColor={colors.text.muted}
          editable={!disabled}
        />
      </View>
      <TouchableOpacity
        style={[styles.doneBtn, (disabled || !reps) && styles.doneBtnOff]}
        onPress={handleDone}
        disabled={disabled || !reps}
      >
        <Text style={styles.doneBtnText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.sm },
  setNum: { color: colors.text.muted, fontSize: typography.sm, width: 40 },
  inputs: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  input: {
    flex: 1,
    backgroundColor: colors.bg.elevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text.primary,
    fontSize: typography.base,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    textAlign: 'center',
  },
  times: { color: colors.text.muted, fontSize: typography.base },
  doneBtn: {
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  doneBtnOff: { opacity: 0.3 },
  doneBtnText: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
});
