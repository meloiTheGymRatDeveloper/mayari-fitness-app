import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, fonts } from '../../constants/theme';

interface ProGateProps {
  title: string;
  description: string;
}

export default function ProGate({ title, description }: ProGateProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <Text style={styles.moon}>🌙</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <Pressable
        style={styles.upgradeBtn}
        onPress={() => router.push('/(tabs)/profile/subscription')}
      >
        <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
      </Pressable>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backBtnText}>Maybe Later</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  moon: {
    fontSize: 56,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    fontFamily: fonts.bold,
  },
  description: {
    fontSize: typography.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: fonts.regular,
  },
  upgradeBtn: {
    backgroundColor: colors.brand.gold,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl * 1.5,
    borderRadius: 12,
    marginTop: spacing.lg,
  },
  upgradeBtnText: {
    color: colors.bg.primary,
    fontSize: typography.base,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  backBtn: {
    paddingVertical: spacing.sm,
  },
  backBtnText: {
    color: colors.text.muted,
    fontSize: typography.sm,
  },
});
