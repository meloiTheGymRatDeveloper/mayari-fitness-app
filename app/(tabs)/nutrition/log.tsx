import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRecentFoods } from '../../../hooks/useNutrition';
import { colors, typography, spacing } from '../../../constants/theme';
import type { MealSlot } from '../../../types/database';

const SLOT_LABELS: Record<MealSlot, string> = {
  almusal: 'Almusal', tanghalian: 'Tanghalian', merienda: 'Merienda', hapunan: 'Hapunan',
};

const ACTIONS = [
  { icon: '✏️', label: 'Manual Entry', route: '/(tabs)/nutrition/manual' },
  { icon: '🔍', label: 'Search Food',  route: '/(tabs)/nutrition/search' },
  { icon: '📷', label: 'Scan Barcode', route: '/(tabs)/nutrition/barcode' },
  { icon: '🎤', label: 'Speak Food',   route: '/(tabs)/nutrition/voice' },
  { icon: '📸', label: 'Camera',       route: '/(tabs)/nutrition/photo' },
] as const;

export default function LogFoodScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { meal_slot, date } = useLocalSearchParams<{ meal_slot: MealSlot; date: string }>();
  const { data: recent = [], isLoading } = useRecentFoods();

  function goFood(foodId: string) {
    router.push({ pathname: '/(tabs)/nutrition/food/[id]', params: { id: foodId, meal_slot, date } });
  }

  return (
    <ScrollView style={[styles.scroll, { paddingTop: insets.top }]} contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>Log Food</Text>
      <Text style={styles.sub}>{meal_slot ? SLOT_LABELS[meal_slot] : ''}</Text>

      <View style={styles.actionsGrid}>
        {ACTIONS.map(action => (
          <TouchableOpacity
            key={action.route}
            style={styles.actionBtn}
            onPress={() => router.push({ pathname: action.route as never, params: { meal_slot, date } })}
          >
            <Text style={styles.actionIcon}>{action.icon}</Text>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Recent Foods</Text>

      {isLoading ? (
        <ActivityIndicator color={colors.brand.primary} />
      ) : recent.length === 0 ? (
        <Text style={styles.empty}>No recent foods. Search to add your first!</Text>
      ) : (
        recent.map(food => (
          <TouchableOpacity key={food.id} style={styles.recentItem} onPress={() => goFood(food.id)}>
            <View>
              <Text style={styles.recentName}>{food.name}</Text>
              {food.brand && <Text style={styles.recentBrand}>{food.brand}</Text>}
            </View>
            <Text style={styles.recentCal}>{food.calories_per_100g} kcal/100g</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  back: { marginBottom: spacing.lg },
  backText: { color: colors.brand.primary, fontSize: typography.base },
  heading: { color: colors.text.primary, fontSize: typography['2xl'], fontWeight: '700' },
  sub: { color: colors.brand.secondary, fontSize: typography.base, marginBottom: spacing.lg },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  actionBtn: { width: '47%', backgroundColor: colors.bg.secondary, borderRadius: 16, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  actionIcon: { fontSize: 32, marginBottom: spacing.xs },
  actionLabel: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600', textAlign: 'center' },
  sectionTitle: { color: colors.text.secondary, fontSize: typography.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  empty: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center', marginTop: spacing.lg },
  recentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  recentName: { color: colors.text.primary, fontSize: typography.base },
  recentBrand: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  recentCal: { color: colors.text.muted, fontSize: typography.sm },
});
