import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, fonts } from '../../constants/theme';
import Button from './Button';

interface EmptyStateProps {
  emoji: string;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export default function EmptyState({ emoji, title, subtitle, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {ctaLabel && onCta && (
        <Button label={ctaLabel} onPress={onCta} style={styles.cta} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl,
  },
  emoji: { fontSize: 56, marginBottom: spacing.md, textAlign: 'center' },
  title: {
    color: colors.text.primary, fontSize: typography.xl, fontWeight: '700',
    textAlign: 'center', marginBottom: spacing.sm, fontFamily: fonts.bold,
  },
  subtitle: {
    color: colors.text.secondary, fontSize: typography.sm,
    textAlign: 'center', lineHeight: 20, marginBottom: spacing.xl,
  },
  cta: { minWidth: 180 },
});
