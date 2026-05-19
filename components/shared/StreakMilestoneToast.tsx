import { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../constants/theme';

const MILESTONE_MESSAGES: Record<number, string> = {
  3:   '3 days! Magaling! 🔥',
  7:   'Isang linggo na! Keep it up! 🔥',
  14:  '2 weeks strong! Tuloy lang! 💪',
  30:  '30 days! Incredible! 🌙',
  60:  "2 months! You're unstoppable! ⚡",
  100: '100 DAYS! Legend status! 🏆',
};

interface Props {
  milestone: number | null;
}

export default function StreakMilestoneToast({ milestone }: Props) {
  const translateY = useRef(new Animated.Value(-100)).current;
  // Keep last non-null milestone so message stays visible during slide-out
  const lastMilestone = useRef<number | null>(null);

  useEffect(() => {
    if (milestone === null) return;
    lastMilestone.current = milestone;
    Animated.sequence([
      Animated.timing(translateY, { toValue: 0,    duration: 350, useNativeDriver: true }),
      Animated.delay(2600),
      Animated.timing(translateY, { toValue: -100, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [milestone, translateY]);

  const displayMilestone = milestone ?? lastMilestone.current;
  if (displayMilestone === null) return null;

  const message = MILESTONE_MESSAGES[displayMilestone] ?? `${displayMilestone} days! Keep it up! 🔥`;

  return (
    <Animated.View style={[styles.toast, { transform: [{ translateY }] }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: colors.brand.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: typography.base,
    fontWeight: '700',
    textAlign: 'center',
  },
});
