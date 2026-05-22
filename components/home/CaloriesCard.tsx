import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../constants/theme';

interface MacroProps {
  label: string;
  consumed: number;
  goal: number;
  color: string;
}

function MacroBar({ label, consumed, goal, color }: MacroProps) {
  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  return (
    <View style={styles.macro}>
      <Text style={[styles.macroValue, { color }]}>{Math.round(consumed)}g</Text>
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width: `${pct * 100}%` as `${number}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

interface Props {
  consumed: number;
  goal: number;
  caloriesBurned: number;
  protein: { consumed: number; goal: number };
  carbs: { consumed: number; goal: number };
  fat: { consumed: number; goal: number };
  showNetCarbs?: boolean;
  fiber?: number;
}

export default function CaloriesCard({ consumed, goal, caloriesBurned, protein, carbs, fat, showNetCarbs, fiber }: Props) {
  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const carbsLabel = showNetCarbs ? 'Net Carbs' : 'Carbs';
  const carbsConsumed = showNetCarbs ? Math.max(0, carbs.consumed - (fiber ?? 0)) : carbs.consumed;
  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.label}>Calories</Text>
        <Text style={styles.count}>{Math.round(consumed)} / {goal} kcal</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` as `${number}%` }]} />
      </View>
      {caloriesBurned > 0 && (
        <View style={styles.burnedRow}>
          <View style={styles.burnedDot} />
          <Text style={styles.burnedText}>−{caloriesBurned} kcal burned from workout</Text>
        </View>
      )}
      <View style={styles.macroRow}>
        <MacroBar label="Protein" consumed={protein.consumed} goal={protein.goal} color={colors.brand.primary} />
        <MacroBar label={carbsLabel} consumed={carbsConsumed} goal={carbs.goal} color={colors.warning} />
        <MacroBar label="Fat" consumed={fat.consumed} goal={fat.goal} color={colors.success} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.text.primary,
    fontSize: typography.sm,
    fontWeight: '600',
  },
  count: {
    color: colors.text.secondary,
    fontSize: typography.xs,
  },
  track: {
    backgroundColor: colors.border,
    borderRadius: 6,
    height: 10,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  fill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: colors.brand.primary,
  },
  burnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  burnedDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: colors.error,
  },
  burnedText: {
    color: colors.text.secondary,
    fontSize: typography.xs,
  },
  macroRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  macro: {
    flex: 1,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: typography.sm,
    fontWeight: '700',
  },
  macroLabel: {
    color: colors.text.muted,
    fontSize: typography.xs,
  },
  macroTrack: {
    width: '100%',
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginTop: 3,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: 2,
  },
});
