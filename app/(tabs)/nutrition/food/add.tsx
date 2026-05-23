import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../../lib/supabase';
import { useAuthStore } from '../../../../stores/authStore';
import { useSubmitFood } from '../../../../hooks/useNutrition';
import { colors, typography, spacing } from '../../../../constants/theme';
import type { MealSlot, WeekDay } from '../../../../types/database';

interface FieldConfig {
  key: string;
  label: string;
  required: boolean;
  decimal?: boolean;
}

const FIELDS: FieldConfig[] = [
  { key: 'name', label: 'Food Name', required: true },
  { key: 'brand', label: 'Brand (optional)', required: false },
  { key: 'calories_per_100g', label: 'Calories (per 100g)', required: true, decimal: true },
  { key: 'protein_per_100g', label: 'Protein g (per 100g)', required: true, decimal: true },
  { key: 'carbs_per_100g', label: 'Carbs g (per 100g)', required: true, decimal: true },
  { key: 'fat_per_100g', label: 'Fat g (per 100g)', required: true, decimal: true },
  { key: 'fiber_per_100g', label: 'Fiber g (optional)', required: false, decimal: true },
  { key: 'sodium_mg_per_100g', label: 'Sodium mg (optional)', required: false, decimal: true },
];

export default function AddCustomFoodScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuthStore();
  const { meal_slot, date, context, week_start_date, plan_day, origin, barcode } =
    useLocalSearchParams<{
      meal_slot: MealSlot;
      date: string;
      context?: string;
      week_start_date?: string;
      plan_day?: WeekDay;
      origin?: string;
      barcode?: string;
    }>();

  const [values, setValues] = useState<Record<string, string>>(
    barcode ? { barcode } : {}
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [shareWithCommunity, setShareWithCommunity] = useState(!!barcode);
  const submitFood = useSubmitFood();

  function setValue(key: string, val: string) {
    setValues(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    for (const f of FIELDS) {
      if (!f.required) continue;
      const v = values[f.key]?.trim() ?? '';
      if (!v) { e[f.key] = 'Required'; continue; }
      if (f.decimal && isNaN(parseFloat(v))) e[f.key] = 'Must be a number';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate() || !session) return;
    setLoading(true);
    try {
      const base = {
        name: values.name.trim(),
        brand: values.brand?.trim() || null,
        calories_per_100g: parseFloat(values.calories_per_100g),
        protein_per_100g: parseFloat(values.protein_per_100g),
        carbs_per_100g: parseFloat(values.carbs_per_100g),
        fat_per_100g: parseFloat(values.fat_per_100g),
        fiber_per_100g: values.fiber_per_100g ? parseFloat(values.fiber_per_100g) : null,
        sodium_mg_per_100g: values.sodium_mg_per_100g ? parseFloat(values.sodium_mg_per_100g) : null,
        is_ph_local: false,
      };

      if (shareWithCommunity) {
        await submitFood.mutateAsync({ ...base, barcode: barcode ?? null });
        Alert.alert(
          'Submitted!',
          'Thanks for contributing. Your food will be reviewed and added to the community database.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      const { data, error } = await supabase
        .from('food_items')
        .insert({ ...base, source: 'custom' })
        .select()
        .single();
      if (error) { Alert.alert('Error', error.message); return; }
      router.replace({
        pathname: '/(tabs)/nutrition/food/[id]',
        params: { id: data.id, meal_slot, date, context, week_start_date, plan_day, origin },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={[styles.root, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Custom Food</Text>
        <Text style={styles.subtitle}>All values are per 100g</Text>
      </View>

      {barcode && (
        <View style={styles.barcodeBanner}>
          <Text style={styles.barcodeText}>Barcode: {barcode}</Text>
        </View>
      )}

      <View style={styles.form}>
        {FIELDS.map(f => (
          <View key={f.key} style={styles.field}>
            <Text style={styles.label}>
              {f.label}{f.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[styles.input, errors[f.key] ? styles.inputError : null]}
              value={values[f.key] ?? ''}
              onChangeText={v => setValue(f.key, v)}
              keyboardType={f.decimal ? 'decimal-pad' : 'default'}
              autoCapitalize={f.key === 'name' || f.key === 'brand' ? 'words' : 'none'}
              placeholder={f.decimal ? '0' : ''}
              placeholderTextColor={colors.text.muted}
            />
            {errors[f.key] && <Text style={styles.errorText}>{errors[f.key]}</Text>}
          </View>
        ))}
      </View>

      <View style={styles.toggleRow}>
        <View style={styles.toggleLeft}>
          <Text style={styles.toggleLabel}>Share with Mayari community</Text>
          <Text style={styles.toggleSub}>Others can find this food after admin review</Text>
        </View>
        <Switch
          value={shareWithCommunity}
          onValueChange={setShareWithCommunity}
          trackColor={{ false: colors.border, true: colors.brand.primary }}
          thumbColor="#fff"
        />
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        <Text style={styles.saveBtnText}>
          {loading ? 'Saving...' : shareWithCommunity ? 'Submit for Review' : 'Save & Log Food'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'] },
  header: { paddingVertical: spacing.lg, gap: spacing.xs },
  back: { color: colors.brand.primary, fontSize: typography.base, marginBottom: spacing.sm },
  title: { color: colors.text.primary, fontSize: typography.xl, fontWeight: 'bold' },
  subtitle: { color: colors.text.muted, fontSize: typography.sm },
  barcodeBanner: {
    backgroundColor: colors.bg.secondary, borderRadius: 8, padding: spacing.sm,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  barcodeText: { color: colors.text.muted, fontSize: typography.xs, fontFamily: 'monospace' },
  form: { gap: spacing.md },
  field: { gap: spacing.xs },
  label: { color: colors.text.secondary, fontSize: typography.sm },
  required: { color: colors.error },
  input: {
    backgroundColor: colors.bg.secondary, borderRadius: 10, borderWidth: 1,
    borderColor: colors.border, color: colors.text.primary,
    fontSize: typography.base, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  inputError: { borderColor: colors.error },
  errorText: { color: colors.error, fontSize: typography.xs },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.xl, padding: spacing.md,
    backgroundColor: colors.bg.secondary, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
  },
  toggleLeft: { flex: 1, marginRight: spacing.md },
  toggleLabel: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  toggleSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  saveBtn: {
    marginTop: spacing.lg, backgroundColor: colors.brand.primary,
    borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
});
