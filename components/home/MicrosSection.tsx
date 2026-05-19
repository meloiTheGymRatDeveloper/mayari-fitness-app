import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../constants/theme';

interface MicroRowProps {
  label: string;
  consumed: number;
  rda: number;
}

function MicroRow({ label, consumed, rda }: MicroRowProps) {
  const pct = rda > 0 ? Math.min(consumed / rda, 1) : 0;
  const color = pct < 0.5 ? colors.error : pct < 0.8 ? colors.warning : colors.success;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` as `${number}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.pct, pct < 0.5 && styles.pctLow]}>{Math.round(pct * 100)}%</Text>
    </View>
  );
}

interface Props {
  vitaminC: { consumed: number; rda: number };
  iron: { consumed: number; rda: number };
  calcium: { consumed: number; rda: number };
}

export default function MicrosSection({ vitaminC, iron, calcium }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Micronutrients</Text>
      <MicroRow label="Vitamin C" consumed={vitaminC.consumed} rda={vitaminC.rda} />
      <MicroRow label="Iron" consumed={iron.consumed} rda={iron.rda} />
      <MicroRow label="Calcium" consumed={calcium.consumed} rda={calcium.rda} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.secondary, borderRadius: 14,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
  },
  title: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600', marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  label: { color: colors.text.secondary, fontSize: typography.xs, width: 72 },
  track: { flex: 1, backgroundColor: colors.border, borderRadius: 3, height: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  pct: { color: colors.text.secondary, fontSize: 10, width: 34, textAlign: 'right' },
  pctLow: { color: colors.error },
});
