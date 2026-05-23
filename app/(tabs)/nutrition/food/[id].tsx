import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../../lib/supabase';
import { useLogFood, useUpdateFoodLog, useDeleteFoodLog } from '../../../../hooks/useNutrition';
import { useAddFoodToPlan } from '../../../../hooks/useMealPlan';
import { colors, typography, spacing } from '../../../../constants/theme';
import type { FoodItem, MealSlot, WeekDay } from '../../../../types/database';
import { calculateNetCarbs } from '../../../../lib/nutrition';
import { useAuthStore } from '../../../../stores/authStore';

const DAILY_LIMITS = {
  sodium: 2300, potassium: 4700, calcium: 1000, iron: 18, magnesium: 400,
  cholesterol: 300, vitaminC: 90, vitaminA: 900, vitaminB12: 2.4, folate: 400,
};

function scale(value: number | null | undefined, qty: number): number | null {
  if (value == null) return null;
  return (value * qty) / 100;
}

function pct(value: number | null, limit: number): string {
  if (value == null) return '';
  return ` (${Math.round((value / limit) * 100)}% DV)`;
}

const MEAL_LABELS: Record<MealSlot, string> = {
  almusal: 'Almusal', tanghalian: 'Tanghalian', merienda: 'Merienda', hapunan: 'Hapunan',
};

export default function FoodDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, log_id, meal_slot, date, quantity_g: quantityGParam, aiEstimated, foodName, calories, protein: proteinParam, carbs: carbsParam, fat: fatParam,
    context, week_start_date, plan_day, origin } =
    useLocalSearchParams<{
      id: string;
      log_id?: string;
      meal_slot: MealSlot;
      date: string;
      quantity_g?: string;
      aiEstimated?: string;
      foodName?: string;
      calories?: string;
      protein?: string;
      carbs?: string;
      fat?: string;
      context?: string;
      week_start_date?: string;
      plan_day?: WeekDay;
      origin?: string;
    }>();

  const isAI = aiEstimated === 'true';
  const isEditMode = !!log_id;
  const afterLogDest = origin === 'home' ? '/(tabs)/' : '/(tabs)/nutrition';
  const [food, setFood] = useState<FoodItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [qty, setQty] = useState(quantityGParam ?? '100');
  const [slot, setSlot] = useState<MealSlot>(meal_slot ?? 'almusal');
  const [expanded, setExpanded] = useState(false);
  const logFood = useLogFood();
  const updateLog = useUpdateFoodLog();
  const deleteLog = useDeleteFoodLog();
  const addFoodToPlan = useAddFoodToPlan();
  const isPlanContext = context === 'plan';
  const showNetCarbs = useAuthStore(s => s.profile?.net_carbs_display) !== false;

  useEffect(() => {
    if (isAI) {
      const synth: FoodItem = {
        id: '__ai__',
        name: foodName ?? 'AI Estimated Food',
        name_fil: null,
        brand: null,
        is_ph_local: false,
        calories_per_100g: calories ? parseFloat(calories) : null,
        protein_per_100g: proteinParam ? parseFloat(proteinParam) : null,
        carbs_per_100g: carbsParam ? parseFloat(carbsParam) : null,
        fat_per_100g: fatParam ? parseFloat(fatParam) : null,
        fiber_per_100g: null,
        sugar_per_100g: null,
        saturated_fat_per_100g: null,
        polyunsaturated_fat_per_100g: null,
        monounsaturated_fat_per_100g: null,
        sodium_mg_per_100g: null,
        potassium_mg_per_100g: null,
        calcium_mg_per_100g: null,
        iron_mg_per_100g: null,
        magnesium_mg_per_100g: null,
        phosphorus_mg_per_100g: null,
        zinc_mg_per_100g: null,
        vitamin_a_mcg_per_100g: null,
        vitamin_c_mg_per_100g: null,
        vitamin_d_mcg_per_100g: null,
        vitamin_b12_mcg_per_100g: null,
        folate_mcg_per_100g: null,
        cholesterol_mg_per_100g: null,
        barcode: null,
        source: 'custom',
        source_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setFood(synth);
      setLoading(false);
      return;
    }
    if (!id) return;
    supabase.from('food_items').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error) setFetchError(error.message);
      else setFood(data as FoodItem | null);
      setLoading(false);
    });
  }, [id, isAI, calories, proteinParam, carbsParam, fatParam, foodName]);

  async function handleAdd() {
    if (!food) return;
    const q = parseFloat(qty);
    if (isNaN(q) || q <= 0) { Alert.alert('', 'Enter a valid quantity'); return; }

    if (isPlanContext && week_start_date && plan_day) {
      const calScaled = ((food.calories_per_100g ?? 0) * q) / 100;
      const proteinScaled = ((food.protein_per_100g ?? 0) * q) / 100;
      const carbsScaled = ((food.carbs_per_100g ?? 0) * q) / 100;
      const fatScaled = ((food.fat_per_100g ?? 0) * q) / 100;
      try {
        await addFoodToPlan.mutateAsync({
          weekStartDate: week_start_date,
          planDay: plan_day,
          mealSlot: slot,
          item: {
            food_item_id: food.id,
            name: food.name,
            quantity_g: q,
            calories: Math.round(calScaled),
            protein_g: Math.round(proteinScaled * 10) / 10,
            carbs_g: Math.round(carbsScaled * 10) / 10,
            fat_g: Math.round(fatScaled * 10) / 10,
          },
        });
        router.back();
      } catch (e: unknown) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Could not add to plan');
      }
      return;
    }

    if (isAI) {
      try {
        // Save to food_items so it appears in future searches (no AI needed next time)
        const { data: inserted, error: insertErr } = await supabase
          .from('food_items')
          .insert({
            name: food.name,
            is_ph_local: false,
            calories_per_100g: food.calories_per_100g,
            protein_per_100g: food.protein_per_100g,
            carbs_per_100g: food.carbs_per_100g,
            fat_per_100g: food.fat_per_100g,
            source: 'custom',
          })
          .select('id')
          .single();
        if (insertErr || !inserted) throw new Error(insertErr?.message ?? 'Could not save food');
        await logFood.mutateAsync({ foodItemId: inserted.id, mealSlot: slot, quantityG: q, date });
        router.navigate(afterLogDest as never);
      } catch (e: unknown) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Could not save');
      }
      return;
    }

    if (isEditMode && log_id) {
      try {
        await updateLog.mutateAsync({ logId: log_id, quantityG: q, mealSlot: slot });
        router.navigate(afterLogDest as never);
      } catch (e: unknown) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Could not update log');
      }
      return;
    }

    try {
      await logFood.mutateAsync({ foodItemId: food.id, mealSlot: slot, quantityG: q, date });
      router.navigate(afterLogDest as never);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not log food');
    }
  }

  async function handleDelete() {
    if (!log_id) return;
    Alert.alert('Remove from diary?', food?.name ?? '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await deleteLog.mutateAsync({ logId: log_id, date });
            router.navigate(afterLogDest as never);
          } catch (e: unknown) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Could not remove');
          }
        },
      },
    ]);
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={colors.brand.primary} /></View>;
  }
  if (!food) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFound}>{fetchError ? `Error: ${fetchError}` : 'Food not found.'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.brand.primary }}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const q = parseFloat(qty) || 0;
  const cal = scale(food.calories_per_100g, q);
  const protein = scale(food.protein_per_100g, q);
  const carbs = scale(food.carbs_per_100g, q);
  const fat = scale(food.fat_per_100g, q);
  const fiber = scale(food.fiber_per_100g, q);
  const sugar = scale(food.sugar_per_100g, q);
  const satFat = scale(food.saturated_fat_per_100g, q);
  const sodium = scale(food.sodium_mg_per_100g, q);
  const potassium = scale(food.potassium_mg_per_100g, q);
  const calcium = scale(food.calcium_mg_per_100g, q);
  const iron = scale(food.iron_mg_per_100g, q);
  const magnesium = scale(food.magnesium_mg_per_100g, q);
  const cholesterol = scale(food.cholesterol_mg_per_100g, q);
  const vitC = scale(food.vitamin_c_mg_per_100g, q);
  const vitA = scale(food.vitamin_a_mcg_per_100g, q);
  const vitB12 = scale(food.vitamin_b12_mcg_per_100g, q);
  const folate = scale(food.folate_mcg_per_100g, q);

  const microFields = [sodium, potassium, calcium, iron, magnesium, cholesterol, vitC, vitA, vitB12, folate];
  const hasMicroData = microFields.some(v => v != null && v > 0);

  return (
    <ScrollView style={[styles.scroll, { paddingTop: insets.top }]} contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.nameRow}>
        <Text style={styles.foodName}>{food.name}</Text>
        {food.is_ph_local && <Text style={styles.phBadge}>🇵🇭</Text>}
      </View>
      {food.brand && <Text style={styles.brand}>{food.brand}</Text>}

      <View style={styles.qtyRow}>
        <Text style={styles.qtyLabel}>Quantity (g)</Text>
        <TextInput
          style={styles.qtyInput}
          value={qty}
          onChangeText={setQty}
          keyboardType="numeric"
          selectTextOnFocus
        />
      </View>

      <View style={styles.slotRow}>
        {(['almusal', 'tanghalian', 'merienda', 'hapunan'] as MealSlot[]).map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.slotBtn, slot === s && styles.slotBtnActive]}
            onPress={() => setSlot(s)}
          >
            <Text style={[styles.slotText, slot === s && styles.slotTextActive]}>
              {MEAL_LABELS[s]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.calCard}>
        <Text style={styles.calNumber}>{cal != null ? Math.round(cal) : '—'}</Text>
        <Text style={styles.calUnit}>kcal</Text>
      </View>

      <View style={styles.macroRow}>
        {[
          { label: 'Protein', value: protein, color: '#6366F1' },
          { label: 'Carbs', value: carbs, color: '#F59E0B' },
          { label: 'Fat', value: fat, color: '#EF4444' },
        ].map(({ label, value, color }) => (
          <View key={label} style={[styles.macroPill, { borderColor: color + '66' }]}>
            <Text style={[styles.macroPillValue, { color }]}>{value != null ? Math.round(value) : '—'}g</Text>
            <Text style={styles.macroPillLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.subMacro}>
        Fiber {fiber != null ? fiber.toFixed(1) : '—'}g · Sugar {sugar != null ? sugar.toFixed(1) : '—'}g · Sat Fat {satFat != null ? satFat.toFixed(1) : '—'}g
      </Text>
      {showNetCarbs && (
        <Text style={styles.netCarbsLine}>
          Net Carbs: <Text style={styles.netCarbsValue}>{Math.round(calculateNetCarbs(carbs ?? 0, fiber ?? 0))}g</Text>
        </Text>
      )}

      <TouchableOpacity style={styles.microHeader} onPress={() => setExpanded(e => !e)}>
        <Text style={styles.microTitle}>Micronutrients</Text>
        <Text style={styles.microChevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.microGrid}>
          {!hasMicroData ? (
            <Text style={styles.noMicroText}>Micronutrient data not available for this item.</Text>
          ) : (
            <View style={styles.microColumns}>
              <View style={styles.microCol}>
                {sodium != null && <Text style={[styles.microItem, sodium > 600 && styles.microHighlight]}>🧂 Sodium {Math.round(sodium)}mg{pct(sodium, DAILY_LIMITS.sodium)}</Text>}
                {potassium != null && <Text style={styles.microItem}>⚡ Potassium {Math.round(potassium)}mg{pct(potassium, DAILY_LIMITS.potassium)}</Text>}
                {calcium != null && <Text style={styles.microItem}>🦴 Calcium {Math.round(calcium)}mg{pct(calcium, DAILY_LIMITS.calcium)}</Text>}
                {iron != null && <Text style={styles.microItem}>🩸 Iron {iron.toFixed(1)}mg{pct(iron, DAILY_LIMITS.iron)}</Text>}
                {magnesium != null && <Text style={styles.microItem}>✨ Magnesium {Math.round(magnesium)}mg{pct(magnesium, DAILY_LIMITS.magnesium)}</Text>}
              </View>
              <View style={styles.microCol}>
                {cholesterol != null && <Text style={styles.microItem}>🫀 Cholesterol {Math.round(cholesterol)}mg{pct(cholesterol, DAILY_LIMITS.cholesterol)}</Text>}
                {vitC != null && <Text style={styles.microItem}>🍊 Vit C {vitC.toFixed(1)}mg{pct(vitC, DAILY_LIMITS.vitaminC)}</Text>}
                {vitA != null && <Text style={styles.microItem}>👁 Vit A {Math.round(vitA)}mcg{pct(vitA, DAILY_LIMITS.vitaminA)}</Text>}
                {vitB12 != null && <Text style={styles.microItem}>💊 Vit B12 {vitB12.toFixed(1)}mcg{pct(vitB12, DAILY_LIMITS.vitaminB12)}</Text>}
                {folate != null && <Text style={styles.microItem}>🌿 Folate {Math.round(folate)}mcg{pct(folate, DAILY_LIMITS.folate)}</Text>}
              </View>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.addBtn, (logFood.isPending || addFoodToPlan.isPending || updateLog.isPending) && styles.addBtnOff]}
        onPress={handleAdd}
        disabled={logFood.isPending || addFoodToPlan.isPending || updateLog.isPending}
      >
        <Text style={styles.addBtnText}>
          {(logFood.isPending || addFoodToPlan.isPending || updateLog.isPending)
            ? 'Saving...'
            : isEditMode ? 'Save Changes' : isPlanContext ? 'Add to Plan' : 'Add to Diary'}
        </Text>
      </TouchableOpacity>

      {isEditMode && (
        <TouchableOpacity
          style={[styles.removeBtn, deleteLog.isPending && styles.addBtnOff]}
          onPress={handleDelete}
          disabled={deleteLog.isPending}
        >
          <Text style={styles.removeBtnText}>
            {deleteLog.isPending ? 'Removing...' : 'Remove from Diary'}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  centered: { flex: 1, backgroundColor: colors.bg.primary, justifyContent: 'center', alignItems: 'center' },
  notFound: { color: colors.text.secondary, fontSize: typography.base },
  back: { marginBottom: spacing.lg },
  backText: { color: colors.brand.primary, fontSize: typography.base },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginBottom: 4 },
  foodName: { color: colors.text.primary, fontSize: typography['2xl'], fontWeight: '700', flex: 1 },
  phBadge: { fontSize: 22 },
  brand: { color: colors.text.muted, fontSize: typography.sm, marginBottom: spacing.lg },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  qtyLabel: { color: colors.text.secondary, fontSize: typography.base },
  qtyInput: { backgroundColor: colors.bg.secondary, borderRadius: 10, borderWidth: 1, borderColor: colors.border, color: colors.text.primary, fontSize: typography.xl, fontWeight: '700', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, width: 100, textAlign: 'center' },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.lg },
  slotBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border },
  slotBtnActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  slotText: { color: colors.text.secondary, fontSize: typography.xs, fontWeight: '600' },
  slotTextActive: { color: '#fff' },
  calCard: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginBottom: spacing.md },
  calNumber: { color: colors.text.primary, fontSize: 56, fontWeight: '700' },
  calUnit: { color: colors.text.muted, fontSize: typography.lg },
  macroRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  macroPill: { flex: 1, borderRadius: 12, borderWidth: 1.5, padding: spacing.sm, alignItems: 'center' },
  macroPillValue: { fontSize: typography.lg, fontWeight: '700' },
  macroPillLabel: { color: colors.text.muted, fontSize: typography.xs },
  subMacro: { color: colors.text.muted, fontSize: typography.xs, marginBottom: spacing.lg },
  netCarbsLine: { color: colors.text.muted, fontSize: typography.xs, marginBottom: spacing.lg },
  netCarbsValue: { color: colors.brand.primary, fontWeight: '600' },
  microHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, marginBottom: spacing.sm },
  microTitle: { color: colors.text.secondary, fontSize: typography.base, fontWeight: '600' },
  microChevron: { color: colors.text.muted, fontSize: typography.sm },
  microGrid: { backgroundColor: colors.bg.secondary, borderRadius: 12, padding: spacing.md, marginBottom: spacing.lg },
  microColumns: { flexDirection: 'row', gap: spacing.sm },
  microCol: { flex: 1, gap: spacing.xs },
  microItem: { color: colors.text.secondary, fontSize: typography.xs, lineHeight: 20 },
  microHighlight: { color: colors.error },
  noMicroText: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center' },
  addBtn: { backgroundColor: colors.brand.primary, borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  addBtnOff: { opacity: 0.5 },
  addBtnText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
  removeBtn: { borderWidth: 1, borderColor: colors.error, borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  removeBtnText: { color: colors.error, fontSize: typography.base, fontWeight: '600' },
});
