import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useUIStore } from '../../stores/uiStore';
import { colors, typography, spacing } from '../../constants/theme';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';

const SLOT_LABELS = {
  almusal: '🌅 Almusal',
  tanghalian: '☀️ Tanghalian',
  merienda: '🍵 Merienda',
  hapunan: '🌙 Hapunan',
} as const;

const OPTIONS = [
  { key: 'manual',  emoji: '✏️', label: 'Manual',    sub: 'Know your macros?',       highlight: false },
  { key: 'search',  emoji: '🔍', label: 'Search',    sub: 'Find food by name',        highlight: false },
  { key: 'voice',   emoji: '🎙️', label: 'Voice Log', sub: '"I had sinangag…"',        highlight: true  },
  { key: 'scan',    emoji: '📸', label: 'Meal Scan', sub: 'Photo → AI estimate',      highlight: false },
  { key: 'barcode', emoji: '▦',  label: 'Barcode',   sub: 'Scan packaged food',       highlight: false },
  { key: 'usual',   emoji: '⭐', label: 'Usual',     sub: 'One-tap from favorites',   highlight: false },
] as const;

export default function LogModal() {
  const router = useRouter();
  const { logModalOpen, logModalMealSlot, logModalDate, closeLogModal } = useUIStore();
  const { isPro } = useFeatureAccess();

  function handleOption(key: string) {
    closeLogModal();
    const params = { meal_slot: logModalMealSlot, date: logModalDate, origin: 'home' };
    if (key === 'search') router.push({ pathname: '/(tabs)/nutrition/search', params });
    else if (key === 'barcode') router.push({ pathname: '/(tabs)/nutrition/barcode', params });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else if (key === 'scan')   router.push({ pathname: '/(tabs)/nutrition/photo' as any, params });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else if (key === 'voice')  router.push({ pathname: '/(tabs)/nutrition/voice' as any, params });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else if (key === 'manual') router.push({ pathname: '/(tabs)/nutrition/manual' as any, params });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else if (key === 'usual')  router.push({ pathname: '/(tabs)/nutrition/usual' as any, params });
  }

  if (!logModalOpen) return null;

  return (
    <Modal visible={logModalOpen} transparent animationType="slide" onRequestClose={closeLogModal}>
      <TouchableWithoutFeedback onPress={closeLogModal}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.titleRow}>
          <Text style={styles.title}>Log Food</Text>
          <View style={styles.slotPill}>
            <Text style={styles.slotText}>{SLOT_LABELS[logModalMealSlot]}</Text>
          </View>
        </View>
        <View style={styles.grid}>
          {OPTIONS.map((opt) => {
            const isLocked = !isPro && (opt.key === 'voice' || opt.key === 'scan');
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.option, opt.highlight && styles.optionHighlight]}
                onPress={() => handleOption(opt.key)}
              >
                <View style={[styles.optionIcon, opt.highlight && styles.optionIconHighlight]}>
                  <Text style={styles.emoji}>{opt.emoji}</Text>
                </View>
                <Text style={styles.optionLabel}>{opt.label}</Text>
                <Text style={styles.optionSub}>{opt.sub}</Text>
                {isLocked && <Text style={styles.lockBadge}>🔒 Pro</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderTopColor: colors.border,
    padding: spacing.md, paddingBottom: spacing['2xl'],
  },
  handle: {
    width: 36, height: 4, backgroundColor: colors.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  slotPill: {
    backgroundColor: colors.bg.elevated, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.brand.primary,
  },
  slotText: { color: colors.brand.secondary, fontSize: typography.xs, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  option: {
    width: '47%', backgroundColor: colors.bg.elevated,
    borderRadius: 14, padding: spacing.md, alignItems: 'center',
    gap: spacing.xs, borderWidth: 1, borderColor: colors.border,
  },
  optionHighlight: { borderColor: colors.brand.primary },
  optionIcon: {
    width: 40, height: 40, backgroundColor: colors.bg.secondary,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  optionIconHighlight: { backgroundColor: colors.brand.primary },
  emoji: { fontSize: 20 },
  optionLabel: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '600' },
  optionSub: { color: colors.text.muted, fontSize: 10, textAlign: 'center' },
  lockBadge: {
    fontSize: 10,
    color: colors.brand.primary,
    marginTop: 2,
  },
});
