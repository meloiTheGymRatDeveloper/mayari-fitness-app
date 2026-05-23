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

// Returns true when no DB result matches ≥60% of the query words (3+ word queries only).
// Signals a specific branded/restaurant item that probably isn't seeded yet.
function isWeakMatch(items: FoodItem[], q: string): boolean {
  const words = q.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (words.length < 3 || items.length === 0) return false;
  const best = Math.max(
    ...items.map(item => {
      const text = (item.name + ' ' + (item.brand ?? '')).toLowerCase();
      return words.filter(w => text.includes(w)).length / words.length;
    }),
  );
  return best < 0.6;
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
  // Tracks the query string that fired the current AI call.
  // When a response arrives we compare against this to drop stale results.
  const queryRef = useRef('');

  useEffect(() => {
    const trimmed = query.trim();
    queryRef.current = trimmed;   // always in sync — used for staleness checks
    setAiEstimate(null);
    setAiLoading(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!trimmed) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const items = await searchFoods(query);
        setResults(items);
        // Auto-trigger AI when:
        //   (a) DB+USDA+OFF found nothing, OR
        //   (b) results exist but look like a weak match for the specific query
        if (items.length === 0 || isWeakMatch(items, trimmed)) {
          fireAI(trimmed);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  function fireAI(snap: string) {
    setAiLoading(true);
    supabase.functions
      .invoke('ai-food-lookup', { body: { food_name: snap } })
      .then(({ data, error }) => {
        if (queryRef.current !== snap) return; // query changed while AI was running
        if (!error && data && !data.error) setAiEstimate(data as AIEstimate);
      })
      .catch(() => { /* silently ignore — manual entry is the fallback */ })
      .finally(() => { if (queryRef.current === snap) setAiLoading(false); });
  }

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

  // AI result row — reused in both the empty state and the footer
  function renderAIRow() {
    if (!aiEstimate) return null;
    return (
      <TouchableOpacity style={styles.item} onPress={goAIFood}>
        <View style={styles.itemLeft}>
          <View style={styles.nameRow}>
            <Text style={styles.itemName}>{aiEstimate.name}</Text>
            <Text style={styles.aiBadge}>AI</Text>
          </View>
          <Text style={styles.itemBrand}>
            {aiEstimate.serving_description} typical · tap to confirm & log
          </Text>
        </View>
        <Text style={styles.itemCal}>{aiEstimate.calories_per_100g} kcal/100g</Text>
      </TouchableOpacity>
    );
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

        // ── Empty state (0 DB results) ────────────────────────────────────────
        ListEmptyComponent={
          query && !loading ? (
            aiLoading ? (
              <View style={styles.aiLoadingRow}>
                <ActivityIndicator color={colors.brand.primary} size="small" />
                <Text style={styles.aiLoadingText}>Getting AI estimate...</Text>
              </View>
            ) : aiEstimate ? (
              <View>
                <Text style={styles.sectionLabel}>Not in database — AI estimate</Text>
                {renderAIRow()}
                <TouchableOpacity style={styles.manualBtnFooter} onPress={goManual}>
                  <Text style={styles.footerBtnText}>✏️ Not right? Enter Manually</Text>
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

        // ── Footer (DB results exist) ─────────────────────────────────────────
        ListFooterComponent={
          filtered.length > 0 ? (
            <View style={styles.footerBlock}>
              {/* AI result or loading — shown when auto/manual triggered */}
              {aiLoading && (
                <View style={styles.aiLoadingRow}>
                  <ActivityIndicator color={colors.brand.primary} size="small" />
                  <Text style={styles.aiLoadingText}>Getting AI estimate...</Text>
                </View>
              )}
              {aiEstimate && !aiLoading && (
                <>
                  <Text style={styles.sectionLabel}>🤖 AI estimate for "{query}"</Text>
                  {renderAIRow()}
                </>
              )}
              {/* Manual escape hatch — always visible when no AI result yet */}
              {!aiEstimate && !aiLoading && (
                <TouchableOpacity
                  style={styles.askAIRow}
                  onPress={() => fireAI(query.trim())}
                >
                  <Text style={styles.askAIText}>🤖 Not what you're looking for? Ask AI</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.manualBtnFooter} onPress={goManual}>
                <Text style={styles.footerBtnText}>✏️ Enter Manually</Text>
              </TouchableOpacity>
            </View>
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
  // AI loading
  aiLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  aiLoadingText: { color: colors.text.muted, fontSize: typography.sm },
  // Section separators
  sectionLabel: {
    color: colors.text.muted,
    fontSize: typography.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: spacing.sm,
  },
  // Empty state
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
  // Footer
  footerBlock: { marginTop: spacing.lg, gap: spacing.xs },
  askAIRow: { paddingVertical: spacing.sm, alignItems: 'center' },
  askAIText: { color: colors.brand.primary, fontSize: typography.sm },
  manualBtnFooter: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  footerBtnText: { color: colors.text.muted, fontSize: typography.sm },
});
