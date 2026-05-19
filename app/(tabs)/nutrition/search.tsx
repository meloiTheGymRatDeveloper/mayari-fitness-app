import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { searchFoods } from '../../../lib/foodSearch';
import { colors, typography, spacing } from '../../../constants/theme';
import type { FoodItem, MealSlot, WeekDay } from '../../../types/database';

export default function FoodSearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { meal_slot, date, context, week_start_date, plan_day } =
    useLocalSearchParams<{
      meal_slot: MealSlot;
      date: string;
      context?: string;
      week_start_date?: string;
      plan_day?: WeekDay;
    }>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const items = await searchFoods(query);
        setResults(items);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function goFood(food: FoodItem) {
    router.push({
      pathname: '/(tabs)/nutrition/food/[id]',
      params: { id: food.id, meal_slot, date, context, week_start_date, plan_day },
    });
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search foods..."
          placeholderTextColor={colors.text.muted}
          autoFocus
        />
      </View>

      {loading && <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 24 }} />}

      <FlatList
        data={results}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => goFood(item)}>
            <View style={styles.itemLeft}>
              <View style={styles.nameRow}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.is_ph_local && <Text style={styles.phBadge}>🇵🇭</Text>}
              </View>
              {item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}
            </View>
            <Text style={styles.itemCal}>{item.calories_per_100g ?? '—'} kcal</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          query && !loading ? <Text style={styles.empty}>No results found.</Text> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  header: { padding: spacing.lg, gap: spacing.sm },
  back: { marginBottom: spacing.xs },
  backText: { color: colors.brand.primary, fontSize: typography.base },
  input: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text.primary,
    fontSize: typography.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'] },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemLeft: { flex: 1, marginRight: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  itemName: { color: colors.text.primary, fontSize: typography.base },
  phBadge: { fontSize: 14 },
  itemBrand: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  itemCal: { color: colors.text.muted, fontSize: typography.sm },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 40 },
});
