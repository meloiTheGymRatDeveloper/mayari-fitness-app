import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../constants/theme';
import type { MealSlot } from '../../types/database';

const SLOT_META: Record<MealSlot, { label: string; emoji: string }> = {
  almusal: { label: 'Almusal', emoji: '🌅' },
  tanghalian: { label: 'Tanghalian', emoji: '☀️' },
  merienda: { label: 'Merienda', emoji: '🍵' },
  hapunan: { label: 'Hapunan', emoji: '🌙' },
};

interface Props {
  slot: MealSlot;
  calories: number;
  itemCount: number;
  hasYesterdayData: boolean;
  isCopying: boolean;
  onAdd: () => void;
  onSmartCopy: () => void;
}

export default function MealSlotCard({ slot, calories, itemCount, hasYesterdayData, isCopying, onAdd, onSmartCopy }: Props) {
  const { label, emoji } = SLOT_META[slot];
  const isEmpty = itemCount === 0;
  return (
    <View style={[styles.card, isEmpty && styles.cardEmpty]}>
      <View style={styles.left}>
        <Text style={styles.slotLabel}>{emoji} {label}</Text>
        <Text style={styles.sub}>
          {isEmpty ? 'Nothing logged yet' : `${Math.round(calories)} kcal · ${itemCount} item${itemCount !== 1 ? 's' : ''}`}
        </Text>
      </View>
      <View style={styles.actions}>
        {hasYesterdayData && (
          <TouchableOpacity style={styles.copyBtn} onPress={onSmartCopy} disabled={isCopying}>
            <Text style={styles.copyText}>📋 Copy yesterday</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
          <Text style={styles.addText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.secondary, borderRadius: 12,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
  },
  cardEmpty: { borderStyle: 'dashed' },
  left: { flex: 1 },
  slotLabel: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  copyBtn: {
    backgroundColor: colors.bg.elevated, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 1, borderColor: colors.border,
  },
  copyText: { color: colors.brand.secondary, fontSize: 10 },
  addBtn: {
    width: 28, height: 28, backgroundColor: colors.brand.primary,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  addText: { color: colors.white, fontSize: 18, lineHeight: 20 },
});
