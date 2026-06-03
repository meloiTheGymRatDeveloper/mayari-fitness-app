import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { colors, fonts, typography, spacing, labelStyle } from '../../constants/theme';

const HOTO_URL = '';  // paste affiliate link here when ready
const MIJIA_URL = ''; // paste affiliate link here when ready

interface Product {
  url: string;
  rankLabel: string;
  rankColor: string;
  title: string;
  subtitle: string;
  subtitleColor: string;
  iconBg: string;
  cardBorder: string;
}

const PRODUCTS: Product[] = [
  {
    url: HOTO_URL,
    rankLabel: '🥇 PREMIUM CHOICE',
    rankColor: colors.brand.gold,
    title: 'Xiaomi HOTO Smart Kitchen Scale',
    subtitle: '⚡ Connects to Mayari (coming soon)',
    subtitleColor: colors.brand.primary,
    iconBg: colors.brand.gold + '1A',
    cardBorder: colors.brand.gold + '55',
  },
  {
    url: MIJIA_URL,
    rankLabel: '🥈 BUDGET CHOICE',
    rankColor: colors.text.secondary,
    title: 'Xiaomi Mijia Electronic Kitchen Scale',
    subtitle: 'Great value for food logging',
    subtitleColor: colors.text.secondary,
    iconBg: colors.text.secondary + '22',
    cardBorder: colors.border,
  },
];

export default function GearSection() {
  return (
    <View style={styles.section}>
      <Text style={[labelStyle, styles.label]}>⚖️ Recommended Kitchen Scale</Text>
      {PRODUCTS.map((product) => {
        const hasLink = product.url.length > 0;
        return (
          <View key={product.title} style={[styles.card, { borderColor: product.cardBorder }]}>
            <View style={[styles.iconBox, { backgroundColor: product.iconBg }]}>
              <Text style={styles.iconEmoji}>⚖️</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.rankLabel, { color: product.rankColor }]}>
                {product.rankLabel}
              </Text>
              <Text style={styles.title}>{product.title}</Text>
              <Text style={[styles.subtitle, { color: product.subtitleColor }]}>
                {product.subtitle}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.btn, hasLink ? styles.btnActive : styles.btnDisabled]}
              onPress={() => hasLink && Linking.openURL(product.url).catch(() => {})}
              disabled={!hasLink}
              activeOpacity={0.75}
            >
              <Text style={[styles.btnText, hasLink ? styles.btnTextActive : styles.btnTextDisabled]}>
                {hasLink ? 'Shop ›' : 'Soon'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.md,
  },
  label: {
    marginBottom: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.sm + 4,
    marginBottom: spacing.sm,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconEmoji: {
    fontSize: 20,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  rankLabel: {
    fontSize: typography.xs - 1,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text.primary,
    fontSize: typography.xs + 1,
    fontFamily: fonts.semibold,
  },
  subtitle: {
    fontSize: typography.xs - 1,
    fontFamily: fonts.regular,
  },
  btn: {
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    flexShrink: 0,
  },
  btnActive: {
    backgroundColor: colors.brand.primary + '22',
  },
  btnDisabled: {
    backgroundColor: colors.text.muted + '1A',
  },
  btnText: {
    fontSize: typography.xs - 1,
    fontFamily: fonts.bold,
  },
  btnTextActive: {
    color: colors.brand.primary,
  },
  btnTextDisabled: {
    color: colors.text.muted,
  },
});
