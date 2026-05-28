import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedProps, withTiming, createAnimatedComponent,
} from 'react-native-reanimated';
import { colors, typography, spacing, fonts, labelStyle } from '../../constants/theme';

const AnimatedCircle = createAnimatedComponent(Circle);
const R = 28;
const STROKE = 6;
const SIZE = (R + STROKE) * 2;
const CIRC = 2 * Math.PI * R;

export function calcArcProgress(consumed: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(consumed / goal, 1);
}

export function calcNetCarbs(carbs: number, fiber: number): number {
  return Math.max(0, carbs - fiber);
}

function MacroBar({
  label, consumed, goal, color,
}: { label: string; consumed: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  return (
    <View style={mb.row}>
      <View style={mb.labelRow}>
        <Text style={mb.label}>{label}</Text>
        <Text style={[mb.value, { color }]}>
          {Math.round(consumed)}/{goal}g
        </Text>
      </View>
      <View style={mb.track}>
        <View style={[mb.fill, { width: `${pct * 100}%` as `${number}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const mb = StyleSheet.create({
  row: { marginBottom: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  label: { color: colors.text.muted, fontSize: typography.xs },
  value: { fontSize: typography.xs, fontFamily: fonts.semibold },
  track: { height: 4, backgroundColor: colors.bg.elevated, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
});

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

export default function CaloriesCard({
  consumed, goal, caloriesBurned, protein, carbs, fat, showNetCarbs, fiber,
}: Props) {
  const progress = useSharedValue(0);
  const pct = calcArcProgress(consumed, goal);
  const carbsLabel = showNetCarbs ? 'Net Carbs' : 'Carbs';
  const carbsConsumed = showNetCarbs ? calcNetCarbs(carbs.consumed, fiber ?? 0) : carbs.consumed;

  useEffect(() => {
    progress.value = withTiming(pct, { duration: 600 });
  }, [pct, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRC * (1 - progress.value),
  }));

  return (
    <View style={styles.card}>
      <Text style={labelStyle}>Today's Balance</Text>
      <View style={styles.body}>
        <View style={styles.arcWrap}>
          <Svg width={SIZE} height={SIZE}>
            <Circle
              cx={SIZE / 2} cy={SIZE / 2} r={R}
              stroke={colors.bg.elevated}
              strokeWidth={STROKE}
              fill="none"
            />
            <AnimatedCircle
              cx={SIZE / 2} cy={SIZE / 2} r={R}
              stroke={colors.brand.gold}
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={CIRC}
              strokeLinecap="round"
              rotation={-90}
              origin={`${SIZE / 2}, ${SIZE / 2}`}
              animatedProps={animatedProps}
            />
          </Svg>
          <View style={styles.arcCenter}>
            <Text style={styles.arcKcal}>{Math.round(consumed)}</Text>
            <Text style={styles.arcGoal}>/{goal}</Text>
          </View>
        </View>

        <View style={styles.macros}>
          <MacroBar label="Protein" consumed={protein.consumed} goal={protein.goal} color="#A78BFA" />
          <MacroBar label={carbsLabel} consumed={carbsConsumed} goal={carbs.goal} color="#6366F1" />
          <MacroBar label="Fat" consumed={fat.consumed} goal={fat.goal} color={colors.brand.gold} />
        </View>
      </View>

      {caloriesBurned > 0 && (
        <Text style={styles.burnText}>🔥 −{caloriesBurned} kcal burned today</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(196,165,90,0.15)',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  body: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  arcWrap: { alignItems: 'center', justifyContent: 'center' },
  arcCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arcKcal: {
    color: colors.text.primary,
    fontSize: typography.sm,
    fontFamily: fonts.bold,
  },
  arcGoal: { color: colors.text.muted, fontSize: 9 },
  macros: { flex: 1 },
  burnText: {
    color: colors.text.muted,
    fontSize: typography.xs,
    marginTop: spacing.sm,
  },
});
