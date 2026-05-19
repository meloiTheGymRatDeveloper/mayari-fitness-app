import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../constants/theme';
import type { WaterLog } from '../../types/database';

interface Props {
  logs: WaterLog[];
  onAdd: () => void;
  onRemove: (lastId: string) => void;
}

const TOTAL_GLASSES = 8;
const ML_PER_GLASS = 250;

export default function WaterBar({ logs, onAdd, onRemove }: Props) {
  const totalMl = logs.reduce((sum, l) => sum + l.amount_ml, 0);
  const filled = Math.min(Math.floor(totalMl / ML_PER_GLASS), TOTAL_GLASSES);
  const lastLog = logs[logs.length - 1];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>💧 Water</Text>
        <Text style={styles.count}>{filled} / {TOTAL_GLASSES} glasses</Text>
      </View>
      <View style={styles.glassRow}>
        {Array.from({ length: TOTAL_GLASSES }, (_, i) => {
          const isFilled = i < filled;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => isFilled && lastLog ? onRemove(lastLog.id) : onAdd()}
              style={[styles.glass, isFilled && styles.glassFilled]}
            >
              <Text style={styles.glassIcon}>{isFilled ? '💧' : '○'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.text.primary,
    fontSize: typography.base,
    fontWeight: '600',
  },
  count: {
    color: colors.text.muted,
    fontSize: typography.sm,
  },
  glassRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  glass: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  glassFilled: {
    backgroundColor: '#6366F120',
    borderColor: colors.brand.primary,
  },
  glassIcon: {
    fontSize: 16,
  },
});
