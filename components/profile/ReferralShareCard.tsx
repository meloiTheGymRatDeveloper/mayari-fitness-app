// components/profile/ReferralShareCard.tsx
// Branded referral card rendered off-screen at story ratio (360x640 pt ≈ 1080x1920 px),
// captured via react-native-view-shot and shared as an image.
import { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, fonts } from '../../constants/theme';

const ReferralShareCard = forwardRef<View, { code: string }>(({ code }, ref) => (
  <View ref={ref} collapsable={false} style={styles.card}>
    <LinearGradient colors={['#0A0A1E', '#1A1A3E']} style={styles.bg}>
      <Text style={styles.moon}>🌙</Text>
      <Text style={styles.appName}>Mayari</Text>
      <Text style={styles.tagline}>Your fitness kasama</Text>
      <View style={styles.codeBox}>
        <Text style={styles.codeLabel}>USE MY CODE</Text>
        <Text style={styles.code}>{code}</Text>
      </View>
      <Text style={styles.offer}>₱20 off each — ikaw at ako! 🎁</Text>
      <Text style={styles.footer}>Download Mayari on the App Store</Text>
    </LinearGradient>
  </View>
));
ReferralShareCard.displayName = 'ReferralShareCard';
export default ReferralShareCard;

const styles = StyleSheet.create({
  card: { width: 360, height: 640, position: 'absolute', left: -9999 },
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  moon: { fontSize: 72 },
  appName: { color: colors.text.primary, fontFamily: fonts.extrabold, fontSize: 40, letterSpacing: 1 },
  tagline: { color: colors.text.secondary, fontFamily: fonts.regular, fontSize: 16, marginBottom: 24 },
  codeBox: { borderWidth: 2, borderColor: colors.brand.accent, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40, alignItems: 'center', gap: 4 },
  codeLabel: { color: colors.brand.accent, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 2 },
  code: { color: colors.text.primary, fontFamily: fonts.extrabold, fontSize: 32, letterSpacing: 3 },
  offer: { color: colors.brand.secondary, fontFamily: fonts.semibold, fontSize: 18, marginTop: 16 },
  footer: { color: colors.text.muted, fontFamily: fonts.regular, fontSize: 12, marginTop: 32 },
});
