import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { colors, typography, spacing, fonts } from '../../../constants/theme';
import type { MealSlot } from '../../../types/database';

interface ParsedFood {
  name: string;
  quantity_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calories_low?: number;
  calories_high?: number;
  confidence?: 'low' | 'medium' | 'high';
  db_grounded?: boolean;
  // Internal per-100g base values (recalculation reference)
  _cal_per100?: number;
  _prot_per100?: number;
  _carbs_per100?: number;
  _fat_per100?: number;
}

const FIELDS: Array<{ key: keyof ParsedFood; label: string }> = [
  { key: 'quantity_g', label: 'grams' },
  { key: 'calories', label: 'kcal' },
  { key: 'protein_g', label: 'prot' },
  { key: 'carbs_g', label: 'carbs' },
  { key: 'fat_g', label: 'fat' },
];

function confidenceColor(c: 'low' | 'medium' | 'high') {
  if (c === 'high') return colors.success;
  if (c === 'medium') return colors.warning;
  return colors.error;
}

function ItemBadge({ food }: { food: ParsedFood }) {
  if (food.db_grounded) {
    return <Text style={[styles.badge, { color: colors.success }]}>✓ PH database</Text>;
  }
  if (!food.confidence) return null;
  const color = confidenceColor(food.confidence);
  const range =
    food.calories_low != null && food.calories_high != null
      ? ` · est. ${food.calories_low}–${food.calories_high} kcal`
      : '';
  return <Text style={[styles.badge, { color }]}>{food.confidence} confidence{range}</Text>;
}

export default function VoiceConfirmScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { meal_slot, date, parsed } = useLocalSearchParams<{ meal_slot: MealSlot; date: string; parsed: string }>();
  const [foods, setFoods] = useState<ParsedFood[]>(() => {
    try {
      const parsed_foods = JSON.parse(parsed ?? '[]') as ParsedFood[];
      // Derive per-100g base values from initial quantities
      return parsed_foods.map((item) => {
        const qty = item.quantity_g || 100;
        return {
          ...item,
          _cal_per100: (item.calories / qty) * 100,
          _prot_per100: (item.protein_g / qty) * 100,
          _carbs_per100: (item.carbs_g / qty) * 100,
          _fat_per100: (item.fat_g / qty) * 100,
        };
      });
    } catch {
      return [];
    }
  });
  const [saving, setSaving] = useState(false);

  function updateField(index: number, field: keyof ParsedFood, value: string) {
    setFoods((prev) =>
      prev.map((f, i) => {
        if (i !== index) return f;

        // If updating quantity_g, recalculate all macros from per-100g base
        if (field === 'quantity_g') {
          const g = Math.max(0, Number(value) || 0);
          const cal_per100 = f._cal_per100 ?? (f.calories / (f.quantity_g || 100)) * 100;
          const prot_per100 = f._prot_per100 ?? (f.protein_g / (f.quantity_g || 100)) * 100;
          const carbs_per100 = f._carbs_per100 ?? (f.carbs_g / (f.quantity_g || 100)) * 100;
          const fat_per100 = f._fat_per100 ?? (f.fat_g / (f.quantity_g || 100)) * 100;

          return {
            ...f,
            quantity_g: g,
            calories: Math.round(cal_per100 / 100 * g),
            protein_g: Math.round(prot_per100 / 100 * g * 10) / 10,
            carbs_g: Math.round(carbs_per100 / 100 * g * 10) / 10,
            fat_g: Math.round(fat_per100 / 100 * g * 10) / 10,
          };
        }

        // For other fields, just update normally
        return { ...f, [field]: field === 'name' ? value : Number(value) || 0 };
      })
    );
  }

  function removeFood(index: number) {
    setFoods((prev) => prev.filter((_, i) => i !== index));
  }

  async function confirm() {
    if (!userId || !foods.length) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      for (const food of foods) {
        const per100 = food.quantity_g > 0 ? 100 / food.quantity_g : 1;
        const { data: item, error: itemErr } = await supabase
          .from('food_items')
          .insert({
            name: food.name,
            calories_per_100g: food.calories * per100,
            protein_per_100g: food.protein_g * per100,
            carbs_per_100g: food.carbs_g * per100,
            fat_per_100g: food.fat_g * per100,
            source: 'custom',
            source_id: null,
          })
          .select('id')
          .single();
        if (itemErr) throw itemErr;
        const { error: logErr } = await supabase.from('food_logs').insert({
          user_id: userId, food_item_id: item.id,
          meal_slot, quantity_g: food.quantity_g || 100, logged_at: now, ai_estimated: true,
        });
        if (logErr) throw logErr;
      }
      queryClient.invalidateQueries({ queryKey: ['food_logs', userId, date] });
      router.replace('/(tabs)');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Confirm Food</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Edit anything that looks wrong:</Text>
        {foods.map((food, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.cardHeader}>
              <TextInput
                style={[styles.nameInput, styles.nameInputFlex]}
                value={food.name}
                onChangeText={(v) => updateField(i, 'name', v)}
                placeholderTextColor={colors.text.muted}
              />
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => removeFood(i)}
                accessibilityLabel={`Remove ${food.name}`}
                hitSlop={8}
              >
                <Text style={styles.deleteBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ItemBadge food={food} />
            {food.confidence === 'low' && (
              <Text style={styles.lowConfHint}>Not in your photo? Tap ✕ to remove.</Text>
            )}
            <View style={styles.fieldRow}>
              {FIELDS.map(({ key, label }) => (
                <View key={key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={String(Math.round(food[key] as number))}
                    onChangeText={(v) => updateField(i, key, v)}
                    keyboardType="numeric"
                    placeholderTextColor={colors.text.muted}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
        {foods.length === 0 && (
          <Text style={styles.empty}>No foods were parsed. Go back and try again.</Text>
        )}
        {foods.length > 0 && (
          <TouchableOpacity style={[styles.confirmBtn, saving && styles.disabled]} onPress={confirm} disabled={saving}>
            <Text style={styles.confirmText}>{saving ? 'Saving...' : `Log ${foods.length} food${foods.length !== 1 ? 's' : ''}`}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
  content: { padding: spacing.lg, gap: spacing.md },
  subtitle: { color: colors.text.secondary, fontSize: typography.sm },
  card: { backgroundColor: colors.bg.secondary, borderRadius: 12, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  nameInput: {
    color: colors.text.primary, fontSize: typography.base, fontFamily: fonts.semibold,
    borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.xs, marginBottom: spacing.sm,
  },
  nameInputFlex: {
    flex: 1,
    marginBottom: 0,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontFamily: fonts.bold,
    lineHeight: 14,
  },
  badge: { fontSize: 11, fontFamily: fonts.semibold, marginBottom: spacing.sm },
  lowConfHint: {
    color: colors.text.muted,
    fontSize: 11,
    fontFamily: fonts.regular,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  fieldRow: { flexDirection: 'row', gap: spacing.xs },
  field: { flex: 1, alignItems: 'center' },
  fieldLabel: { color: colors.text.muted, fontSize: 10, marginBottom: 2 },
  fieldInput: {
    color: colors.text.primary, fontSize: typography.sm,
    backgroundColor: colors.bg.elevated, borderRadius: 6,
    paddingHorizontal: 4, paddingVertical: 4, width: '100%', textAlign: 'center',
  },
  confirmBtn: {
    backgroundColor: colors.brand.primary, borderRadius: 12,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  disabled: { opacity: 0.5 },
  confirmText: { color: colors.white, fontSize: typography.base, fontFamily: fonts.bold },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: spacing.xl },
});
