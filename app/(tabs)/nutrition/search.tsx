import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { searchFoods } from '../../../lib/foodSearch';
import { supabase } from '../../../lib/supabase';
import { colors, typography, spacing } from '../../../constants/theme';
import type { FoodItem, MealSlot, WeekDay } from '../../../types/database';

type FoodFilter = 'all' | 'ph' | 'ingredients' | 'branded';

const FILTERS: { key: FoodFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ph', label: '🇵🇭 Filipino' },
  { key: 'ingredients', label: 'Ingredients' },
  { key: 'branded', label: 'Branded' },
];

interface AIEstimate {
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  serving_size_g: number;
  serving_description: string;
}

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
  const [aiEstimate, setAiEstimate] = useState<AIEstimate | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [filter, setFilter] = useState<FoodFilter>('all');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiAbortRef = useRef<boolean>(false);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setAiEstimate(null);
    aiAbortRef.current = true; // cancel any in-flight AI call from the previous query

    if (!query.trim()) {
      setResults([]);
      setAiLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      aiAbortRef.current = false;
      try {
        const items = await searchFoods(query);
        setResults(items);

        // Auto-trigger AI when the database (+ USDA + OFF) found nothing
        if (items.length === 0 && !aiAbortRef.current) {
          setAiLoading(true);
          supabase.functions
            .invoke('ai-food-lookup', { body: { food_name: query.trim() } })
            .then(({ data, error }) => {
              if (aiAbortRef.current) return; // query changed while AI was running
              if (!error && data && !data.error) {
                setAiEstimate(data as AIEstimate);
              }
            })
            .catch(() => { /* silently ignore — manual entry is the fallback */ })
            .finally(() => {
              if (!aiAbortRef.current) setAiLoading(false);
            });
        }
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

  function goAIFood() {
    if (!aiEstimate) return;
    router.push({
      pathname: '/(tabs)/nutrition/food/[id]',
      params: {
        id: '__ai__',
        aiEstimated: 'true',
        foodName: aiEstimate.name,
        calories: String(aiEstimate.calories_per_100g),
        protein: String(aiEstimate.protein_per_100g),
        carbs: String(aiEstimate.carbs_per_100g),
        fat: String(aiEstimate.fat_per_100g),
        quantity_g: String(aiEstimate.serving_size_g),
        meal_slot, date, context, week_start_date, plan_day, origin,
      },
    });
  }

  function goManual() {
    router.push({
      pathname: '/(tabs)/nutrition/manual' as never,
      params: { meal_slot, date, origin },
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
            aiLoading ? (
              <View style={styles.aiLoadingRow}>
                <ActivityIndicator color={colors.brand.primary} size="small" />
                <Text style={styles.aiLoadingText}>Getting AI estimate...</Text>
              </View>
            ) : aiEstimate ? (
              <View>
                <Text style={styles.aiSectionLabel}>Not in database — AI estimate</Text>
                <TouchableOpacity style={styles.item} onPress={goAIFood}>
                  <View style={styles.itemLeft}>
                    <View style={styles.nameRow}>
                      <Text style={styles.itemName}>{aiEstimate.name}</Text>
                      <Text style={styles.aiBadge}>AI</Text>
                    </View>
                    <Text style={styles.itemBrand}>
                      {aiEstimate.serving_description} typical serving · tap to confirm
                    </Text>
                  </View>
                  <Text style={styles.itemCal}>{aiEstimate.calories_per_100g} kcal/100g</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.manualBtnFooter} onPress={goManual}>
                  <Text style={styles.addBtnText}>✏️ Not right? Enter Manually</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <Text style={styles.empty}>
                  {results.length > 0 && filtered.length === 0
                    ? `No ${FILTERS.find(f => f.key === filter)?.label ?? filter} results for "${query}". Try "All".`
                    : `Wala pang results para sa "${query}".`}
                </Text>
                <TouchableOpacity style={styles.manualBtn} onPress={goManual}>
                  <Text style={styles.manualBtnText}>✏️ Enter Manually</Text>
                </TouchableOpacity>
              </View>
            )
          ) : null
        }
        ListFooterComponent={
          filtered.length > 0 ? (
            <TouchableOpacity style={styles.manualBtnFooter} onPress={goManual}>
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
  aiBadge: {
    fontSize: typography.xs,
    color: colors.brand.primary,
    backgroundColor: colors.brand.primary + '22',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    fontWeight: '700',
  },
  itemBrand: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  nameFil: { color: colors.text.muted, fontSize: typography.xs, fontStyle: 'italic', marginTop: 1 },
  itemCal: { color: colors.text.muted, fontSize: typography.sm },
  aiLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    justifyContent: 'center',
  },
  aiLoadingText: { color: colors.text.muted, fontSize: typography.sm },
  aiSectionLabel: {
    color: colors.text.muted,
    fontSize: typography.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  emptyWrap: { alignItems: 'center', marginTop: 40, gap: spacing.md },
  empty: { color: colors.text.muted, textAlign: 'center' },
  manualBtn: {
    borderWidth: 1,
    borderColor: colors.brand.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  manualBtnText: { color: colors.brand.primary, fontSize: typography.sm, fontWeight: '600' },
  manualBtnFooter: {
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
