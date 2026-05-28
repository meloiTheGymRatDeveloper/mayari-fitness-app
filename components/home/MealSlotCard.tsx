import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { colors, typography, spacing } from '../../constants/theme';
import { useDeleteFoodLog } from '../../hooks/useNutrition';
import type { FoodLogWithItem, MealSlot } from '../../types/database';

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
  logs: FoodLogWithItem[];
  date: string;
  hasYesterdayData: boolean;
  isCopying: boolean;
  onAdd: () => void;
  onSmartCopy: () => void;
}

export default function MealSlotCard({ slot, calories, itemCount, logs, date, hasYesterdayData, isCopying, onAdd, onSmartCopy }: Props) {
  const { label, emoji } = SLOT_META[slot];
  const isEmpty = itemCount === 0;
  const [expanded, setExpanded] = useState(false);
  const deleteLog = useDeleteFoodLog();

  function confirmDelete(log: FoodLogWithItem) {
    Alert.alert(
      'Remove food?',
      `Remove "${log.food_item?.name ?? 'this item'}" from ${label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteLog.mutate({ logId: log.id, date }),
        },
      ]
    );
  }

  return (
    <View style={[styles.card, isEmpty && styles.cardEmpty]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.left}
          onPress={() => !isEmpty && setExpanded(e => !e)}
          activeOpacity={isEmpty ? 1 : 0.7}
        >
          <Text style={styles.slotLabel}>{emoji} {label}</Text>
          <Text style={styles.sub}>
            {isEmpty
              ? 'Nothing logged yet'
              : `${Math.round(calories)} kcal · ${itemCount} item${itemCount !== 1 ? 's' : ''}`}
          </Text>
        </TouchableOpacity>
        <View style={styles.actions}>
          {!isEmpty && (
            <TouchableOpacity onPress={() => setExpanded(e => !e)} style={styles.chevronBtn}>
              <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>
          )}
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

      {expanded && (
        <View style={styles.foodList}>
          {logs.map(log => {
            const cal = Math.round((log.food_item?.calories_per_100g ?? 0) * (log.quantity_g ?? 0) / 100);
            const protein = Math.round((log.food_item?.protein_per_100g ?? 0) * (log.quantity_g ?? 0) / 100);
            return (
              <View key={log.id} style={styles.logRow}>
                <View style={styles.logLeft}>
                  <Text style={styles.logName} numberOfLines={1}>{log.food_item?.name ?? '—'}</Text>
                  <Text style={styles.logMeta}>{log.quantity_g}g · {protein}g protein</Text>
                </View>
                <Text style={styles.logCal}>{cal} kcal</Text>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => confirmDelete(log)}
                  disabled={deleteLog.isPending}
                >
                  <Text style={styles.deleteText}>✕</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.secondary, borderRadius: 12,
    padding: spacing.md, borderWidth: 1, borderColor: 'rgba(196,165,90,0.12)',
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
  },
  cardEmpty: { borderStyle: 'dashed' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left: { flex: 1 },
  slotLabel: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  sub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chevronBtn: { padding: 4 },
  chevron: { color: colors.text.muted, fontSize: 10 },
  copyBtn: {
    backgroundColor: colors.bg.elevated, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 1, borderColor: colors.border,
  },
  copyText: { color: colors.brand.secondary, fontSize: 10 },
  addBtn: {
    width: 28, height: 28, backgroundColor: colors.brand.gold,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  addText: { color: '#fff', fontSize: 18, lineHeight: 20 },
  foodList: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  logRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 4, gap: spacing.sm,
  },
  logLeft: { flex: 1 },
  logName: { color: colors.text.primary, fontSize: typography.xs, fontWeight: '500' },
  logMeta: { color: colors.text.muted, fontSize: 10, marginTop: 1 },
  logCal: { color: colors.text.secondary, fontSize: typography.xs },
  deleteBtn: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.error + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  deleteText: { color: colors.error, fontSize: 11, fontWeight: '700' },
});
