import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../../constants/theme';

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
  },
  description: {
    fontSize: typography.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  upgradeBtn: {
    backgroundColor: colors.brand.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl * 1.5,
    borderRadius: 12,
    marginTop: spacing.lg,
  },
  upgradeBtnText: {
    color: colors.text.primary,
    fontSize: typography.base,
    fontWeight: '700',
  },
  backBtn: {
    paddingVertical: spacing.sm,
  },
  backBtnText: {
    color: colors.text.muted,
    fontSize: typography.sm,
  },
});
