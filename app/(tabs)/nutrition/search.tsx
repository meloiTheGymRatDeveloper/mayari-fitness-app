import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { searchFoods } from '../../../lib/foodSearch';
import { colors, typography, spacing } from '../../../constants/theme';
import type { FoodItem, MealSlot, WeekDay } from '../../../types/database';

type FoodFilter = 'all' | 'ph' | 'ingredients' | 'branded';

const FILTERS: { key: FoodFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ph', label: '🇵🇭 Filipino' },
  { key: 'ingredients', label: 'Ingredients' },
  { key: 'branded', label: 'Branded' },
];

function sourceLabel(item: FoodItem): string | null {
  if (item.source === 'usda') return 'USDA';
  if (item.source === 'open_food_facts') return 'OFF';
  return null;
}

function applyFilter(items: FoodItem[], filter: FoodFilter): FoodItem[] {
  if (filter === 'ph') return items.filter(f => f.is_ph_local);
  if (filter === 'ingredients') return items.filter(f => !f.brand && f.source !== 'open_food_facts');
  if (filter === 'branded') return items.filter(f => !!f.brand || f.source === 'open_food_facts');
  return items;
}

export default function FoodSearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { meal_slot, date, context, week_start_date, plan_day, origin } =
    useLocalSearchParams<{
      meal_slot: MealSlot;
      date: string;
      context?: string;
      week_start_date?: string;
      plan_day?: WeekDay;
      origin?: string;
    }>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FoodFilter>('all');
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
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const filtered = applyFilter(results, filter);

  function goFood(food: FoodItem) {
    router.push({
      pathname: '/(tabs)/nutrition/food/[id]',
      params: { id: food.id, meal_slot, date, context, week_start_date, plan_day, origin },
    });
  }

  function goAddCustom() {
    router.push({
      pathname: '/(tabs)/nutrition/food/add',
      params: { meal_slot, date, context, week_start_date, plan_day, origin },
    } as never);
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
          placeholder="Search foods, ingredients, brands..."
          placeholderTextColor={colors.text.muted}
          autoFocus
        />
      </View>

      <View style={styles.filterGrid}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 24 }} />}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const badge = sourceLabel(item);
          return (
            <TouchableOpacity style={styles.item} onPress={() => goFood(item)}>
              <View style={styles.itemLeft}>
                <View style={styles.nameRow}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.is_ph_local && <Text style={styles.phBadge}>🇵🇭</Text>}
                  {badge && <Text style={styles.sourceBadge}>{badge}</Text>}
                </View>
                {item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}
                {item.name_fil && item.name_fil !== item.name && (
                  <Text style={styles.nameFil}>{item.name_fil}</Text>
                )}
              </View>
              <Text style={styles.itemCal}>{item.calories_per_100g ?? '—'} kcal</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          query && !loading ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.empty}>
                {results.length > 0 && filtered.length === 0
                  ? `No ${FILTERS.find(f => f.key === filter)?.label ?? filter} results for "${query}". Try "All".`
                  : `Wala pang results para sa "${query}".`}
              </Text>
              <TouchableOpacity style={styles.addBtn} onPress={goAddCustom}>
                <Text style={styles.addBtnText}>+ Add Custom Food</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListFooterComponent={
          filtered.length > 0 ? (
            <TouchableOpacity style={styles.addBtnFooter} onPress={goAddCustom}>
              <Text style={styles.addBtnText}>+ Add Custom Food</Text>
            </TouchableOpacity>
          ) : null
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
  filterGrid: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg.secondary,
  },
  filterChipActive: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primary + '22',
  },
  filterText: { color: colors.text.secondary, fontSize: typography.sm },
  filterTextActive: { color: colors.brand.primary, fontWeight: '600' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'] },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemLeft: { flex: 1, marginRight: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  itemName: { color: colors.text.primary, fontSize: typography.base },
  phBadge: { fontSize: 14 },
  sourceBadge: {
    fontSize: typography.xs,
    color: colors.text.muted,
    backgroundColor: colors.bg.elevated,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  itemBrand: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  nameFil: { color: colors.text.muted, fontSize: typography.xs, fontStyle: 'italic', marginTop: 1 },
  itemCal: { color: colors.text.muted, fontSize: typography.sm },
  emptyWrap: { alignItems: 'center', marginTop: 40, gap: spacing.md },
  empty: { color: colors.text.muted, textAlign: 'center' },
  addBtn: {
    borderWidth: 1,
    borderColor: colors.brand.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  addBtnFooter: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: spacing.lg,
  },
  addBtnText: { color: colors.brand.primary, fontSize: typography.sm, fontWeight: '600' },
});
