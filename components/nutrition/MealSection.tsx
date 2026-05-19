import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing } from '../../constants/theme';
import type { FoodLogWithItem, MealSlot } from '../../types/database';

const SLOT_LABELS: Record<MealSlot, { filipino: string; generic: string }> = {
  almusal:    { filipino: 'Almusal',    generic: 'Breakfast' },
  tanghalian: { filipino: 'Tanghalian', generic: 'Lunch' },
  merienda:   { filipino: 'Merienda',  generic: 'Snack' },
  hapunan:    { filipino: 'Hapunan',   generic: 'Dinner' },
};

function scale(value: number | null, quantity_g: number): number {
  if (value == null) return 0;
  return (value * quantity_g) / 100;
}

interface Props {
  slot: MealSlot;
  logs: FoodLogWithItem[];
  style: 'filipino' | 'generic';
  date: string;
  onDeleteLog: (logId: string) => void;
  disabled?: boolean;
}

export default function MealSection({ slot, logs, style, date, onDeleteLog, disabled = false }: Props) {
  const router = useRouter();
  const label = SLOT_LABELS[slot][style];
  const totalCal = logs.reduce((sum, l) => sum + scale(l.food_item.calories_per_100g, l.quantity_g), 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{label}</Text>
        <View style={styles.headerRight}>
          {logs.length > 0 && (
            <Text style={styles.totalCal}>{Math.round(totalCal)} kcal</Text>
          )}
          {!disabled && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push({ pathname: '/(tabs)/nutrition/log', params: { meal_slot: slot, date } })}
            >
              <Text style={styles.addBtnText}>+</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {logs.map(log => {
        const cal = scale(log.food_item.calories_per_100g, log.quantity_g);
        const protein = scale(log.food_item.protein_per_100g, log.quantity_g);
        return (
          <TouchableOpacity
            key={log.id}
            style={styles.foodRow}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/nutrition/food/[id]',
                params: { id: log.food_item.id, log_id: log.id, meal_slot: slot, quantity_g: String(log.quantity_g), date },
              })
            }
          >
            <View style={styles.foodLeft}>
              <Text style={styles.foodName}>{log.food_item.name}</Text>
              <Text style={styles.foodMeta}>{log.quantity_g}g · {Math.round(protein)}g protein</Text>
            </View>
            <Text style={styles.foodCal}>{Math.round(cal)} kcal</Text>
          </TouchableOpacity>
        );
      })}

      {logs.length === 0 && (
        <Text style={styles.empty}>Nothing logged yet</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.brand.secondary,
    fontSize: typography.base,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  totalCal: {
    color: colors.text.muted,
    fontSize: typography.xs,
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontSize: typography.lg,
    fontWeight: '700',
    lineHeight: 22,
  },
  foodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  foodLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  foodName: {
    color: colors.text.primary,
    fontSize: typography.sm,
  },
  foodMeta: {
    color: colors.text.muted,
    fontSize: typography.xs,
    marginTop: 2,
  },
  foodCal: {
    color: colors.text.secondary,
    fontSize: typography.sm,
  },
  empty: {
    color: colors.text.muted,
    fontSize: typography.xs,
    marginTop: spacing.xs,
  },
});
