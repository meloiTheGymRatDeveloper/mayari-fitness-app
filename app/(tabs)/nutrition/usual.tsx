import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUsualFoods, usePinFood, useUnpinFood, useLogUsualFood, type UsualFood } from '../../../hooks/useUsual';
import { colors, typography, spacing, fonts } from '../../../constants/theme';
import type { MealSlot } from '../../../types/database';

export default function UsualScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { meal_slot, date } = useLocalSearchParams<{ meal_slot: MealSlot; date: string }>();
  const { pinned, frequent } = useUsualFoods();
  const pinFood = usePinFood();
  const unpinFood = useUnpinFood();
  const logFood = useLogUsualFood();

  const pinnedIds = new Set(pinned.map((p) => p.food_item_id));

  function handleLog(item: UsualFood) {
    logFood.mutate(
      { foodItemId: item.food_item_id, quantityG: item.typical_qty_g, mealSlot: meal_slot!, date: date! },
      { onSuccess: () => router.replace('/(tabs)') }
    );
  }

  function handleLongPress(item: UsualFood) {
    const isPinned = pinnedIds.has(item.food_item_id);
    Alert.alert(
      isPinned ? 'Unpin?' : 'Pin?',
      isPinned ? `Remove "${item.name}" from pinned favorites?` : `Add "${item.name}" to pinned favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isPinned ? 'Unpin' : 'Pin',
          onPress: () => isPinned ? unpinFood.mutate(item.food_item_id) : pinFood.mutate(item.food_item_id),
        },
      ]
    );
  }

  const allItems = [
    ...pinned.map((i) => ({ ...i, section: 'pinned' as const })),
    ...frequent.filter((i) => !pinnedIds.has(i.food_item_id)).map((i) => ({ ...i, section: 'frequent' as const })),
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Usual</Text>
        <View style={{ width: 60 }} />
      </View>
      <FlatList
        data={allItems}
        keyExtractor={(item) => item.food_item_id + item.section}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          pinned.length > 0 ? <Text style={styles.sectionHeader}>⭐ Pinned Favorites</Text> : null
        }
        renderItem={({ item, index }) => {
          const showFreqHeader = item.section === 'frequent' && (index === 0 || allItems[index - 1]?.section === 'pinned');
          return (
            <>
              {showFreqHeader && <Text style={styles.sectionHeader}>🔥 Frequent</Text>}
              <TouchableOpacity
                style={styles.item}
                onPress={() => handleLog(item)}
                onLongPress={() => handleLongPress(item)}
                delayLongPress={500}
              >
                <View style={styles.itemLeft}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemSub}>{item.typical_qty_g}g · {Math.round(item.calories)} kcal</Text>
                </View>
                {pinnedIds.has(item.food_item_id) && <Text style={styles.pinBadge}>📌</Text>}
                <Text style={styles.tapHint}>Tap to log</Text>
              </TouchableOpacity>
            </>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>No usual foods yet.{'\n'}Log food a few times and it'll appear here.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  back: { color: colors.brand.primary, fontSize: typography.base, width: 60 },
  title: { color: colors.text.primary, fontSize: typography.lg, fontFamily: fonts.bold },
  list: { padding: spacing.lg, gap: spacing.sm },
  sectionHeader: {
    color: colors.text.muted, fontSize: typography.xs, fontFamily: fonts.bold,
    letterSpacing: 1, marginBottom: spacing.xs, marginTop: spacing.xs,
  },
  item: {
    backgroundColor: colors.bg.secondary, borderRadius: 12,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', alignItems: 'center',
  },
  itemLeft: { flex: 1 },
  itemName: { color: colors.text.primary, fontSize: typography.sm, fontFamily: fonts.semibold },
  itemSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  pinBadge: { fontSize: 14, marginRight: spacing.xs },
  tapHint: { color: colors.brand.primary, fontSize: typography.xs },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: spacing['2xl'], lineHeight: 22 },
});
