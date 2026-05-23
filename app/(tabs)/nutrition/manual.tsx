import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { useLogFood } from '../../../hooks/useNutrition';
import { colors, typography, spacing } from '../../../constants/theme';
import type { MealSlot } from '../../../types/database';

const MEAL_LABELS: Record<MealSlot, string> = {
  almusal: 'Almusal', tanghalian: 'Tanghalian', merienda: 'Merienda', hapunan: 'Hapunan',
};

interface Field {
  key: string;
  label: string;
  unit: string;
  required: boolean;
  placeholder: string;
}

const MACRO_FIELDS: Field[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', required: true, placeholder: '0' },
  { key: 'protein',  label: 'Protein',  unit: 'g',    required: true, placeholder: '0' },
  { key: 'carbs',    label: 'Carbs',    unit: 'g',    required: true, placeholder: '0' },
  { key: 'fat',      label: 'Fat',      unit: 'g',    required: true, placeholder: '0' },
  { key: 'fiber',    label: 'Fiber',    unit: 'g',    required: false, placeholder: '0 (optional)' },
];

export default function ManualEntryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { meal_slot, date, origin } =
    useLocalSearchParams<{ meal_slot: MealSlot; date: string; origin?: string }>();

  const [name, setName] = useState('');
  const [servingG, setServingG] = useState('100');
  const [slot, setSlot] = useState<MealSlot>(meal_slot ?? 'almusal');
  const [macros, setMacros] = useState<Record<string, string>>({
    calories: '', protein: '', carbs: '', fat: '', fiber: '',
  });
  const logFood = useLogFood();

  const afterLogDest = origin === 'home' ? '/(tabs)/' : '/(tabs)/nutrition';

  // Reset form every time the screen comes into focus so re-opens start clean
  useFocusEffect(
    useCallback(() => {
      setName('');
      setServingG('100');
      setSlot(meal_slot ?? 'almusal');
      setMacros({ calories: '', protein: '', carbs: '', fat: '', fiber: '' });
    }, [meal_slot]),
  );

  function setMacro(key: string, value: string) {
    setMacros(prev => ({ ...prev, [key]: value }));
  }

  function validate(): string | null {
    if (!name.trim()) return 'Enter a food name.';
    const serving = parseFloat(servingG);
    if (isNaN(serving) || serving <= 0) return 'Enter a valid serving size.';
    for (const field of MACRO_FIELDS) {
      if (!field.required) continue;
      const v = parseFloat(macros[field.key]);
      if (isNaN(v) || v < 0) return `Enter a valid value for ${field.label}.`;
    }
    return null;
  }

  async function handleSave() {
    const err = validate();
    if (err) { Alert.alert('', err); return; }

    const serving = parseFloat(servingG);
    const cal = parseFloat(macros.calories);
    const protein = parseFloat(macros.protein);
    const carbs = parseFloat(macros.carbs);
    const fat = parseFloat(macros.fat);
    const fiber = macros.fiber ? parseFloat(macros.fiber) : null;

    // Convert per-serving values to per-100g for food_items storage
    const factor = 100 / serving;

    try {
      // Step 1: save the food item so it's reusable by all users in Search
      const { data: inserted, error: insertErr } = await supabase
        .from('food_items')
        .insert({
          name: name.trim(),
          is_ph_local: false,
          calories_per_100g: Math.round(cal * factor * 10) / 10,
          protein_per_100g:  Math.round(protein * factor * 10) / 10,
          carbs_per_100g:    Math.round(carbs * factor * 10) / 10,
          fat_per_100g:      Math.round(fat * factor * 10) / 10,
          fiber_per_100g:    fiber != null ? Math.round(fiber * factor * 10) / 10 : null,
          source: 'custom',
        })
        .select('id')
        .single();

      if (insertErr || !inserted) {
        Alert.alert('Error', insertErr?.message ?? 'Could not save food item.');
        return;
      }

      // Step 2: log via the mutation hook so TanStack Query invalidates the
      // food_logs cache for this date and the nutrition diary updates immediately
      await logFood.mutateAsync({
        foodItemId: inserted.id,
        mealSlot: slot,
        quantityG: serving,
        date,
      });

      router.navigate(afterLogDest as never);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.scroll, { paddingTop: insets.top }]}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Manual Entry</Text>
        <Text style={styles.sub}>Enter the name and macros for this food. It will be saved for everyone to find.</Text>

        {/* Meal slot — shown first so it's never missed */}
        <Text style={styles.label}>Meal Slot</Text>
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

        {/* Food name */}
        <Text style={styles.label}>Food Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Lola's Adobong Manok"
          placeholderTextColor={colors.text.muted}
          returnKeyType="next"
          autoFocus
        />

        {/* Serving size */}
        <Text style={styles.label}>Serving Size *</Text>
        <View style={styles.servingRow}>
          <TextInput
            style={[styles.input, styles.servingInput]}
            value={servingG}
            onChangeText={setServingG}
            keyboardType="numeric"
            selectTextOnFocus
          />
          <View style={styles.servingUnit}>
            <Text style={styles.unitText}>grams</Text>
          </View>
        </View>
        <Text style={styles.servingHint}>Enter macros below for this exact serving size.</Text>

        {/* Macro fields */}
        <View style={styles.macroGrid}>
          {MACRO_FIELDS.map(field => (
            <View key={field.key} style={styles.macroCell}>
              <Text style={styles.macroLabel}>
                {field.label}{field.required ? ' *' : ''}
              </Text>
              <View style={styles.macroInputRow}>
                <TextInput
                  style={styles.macroInput}
                  value={macros[field.key]}
                  onChangeText={v => setMacro(field.key, v)}
                  keyboardType="numeric"
                  selectTextOnFocus
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.text.muted}
                />
                <Text style={styles.macroUnit}>{field.unit}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, logFood.isPending && styles.saveBtnOff]}
          onPress={handleSave}
          disabled={logFood.isPending}
        >
          {logFood.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Add to Diary</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  back: { marginBottom: spacing.lg },
  backText: { color: colors.brand.primary, fontSize: typography.base },
  heading: { color: colors.text.primary, fontSize: typography['2xl'], fontWeight: '700', marginBottom: spacing.xs },
  sub: { color: colors.text.muted, fontSize: typography.sm, marginBottom: spacing.xl, lineHeight: 20 },
  label: { color: colors.text.secondary, fontSize: typography.sm, fontWeight: '600', marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text.primary,
    fontSize: typography.base,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  servingRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: 4 },
  servingInput: { flex: 1, marginBottom: 0 },
  servingUnit: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  unitText: { color: colors.text.muted, fontSize: typography.sm },
  servingHint: { color: colors.text.muted, fontSize: typography.xs, marginBottom: spacing.lg },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  macroCell: {
    width: '47%',
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  macroLabel: { color: colors.text.secondary, fontSize: typography.xs, fontWeight: '600', marginBottom: spacing.xs },
  macroInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  macroInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: typography.xl,
    fontWeight: '700',
    padding: 0,
  },
  macroUnit: { color: colors.text.muted, fontSize: typography.xs },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xl },
  slotBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotBtnActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  slotText: { color: colors.text.secondary, fontSize: typography.xs, fontWeight: '600' },
  slotTextActive: { color: '#fff' },
  saveBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveBtnOff: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
});
