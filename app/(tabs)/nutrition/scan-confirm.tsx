import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { colors, typography, spacing } from '../../../constants/theme';
import type { MealSlot } from '../../../types/database';

type Confidence = 'low' | 'medium' | 'high';
const CONFIDENCE_COLOR: Record<Confidence, string> = {
  high: colors.success, medium: colors.warning, low: colors.error,
};

export default function ScanConfirmScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { meal_slot, date, result: resultStr } = useLocalSearchParams<{
    meal_slot: MealSlot; date: string; result: string;
  }>();

  const raw = (() => { try { return JSON.parse(resultStr ?? '{}'); } catch { return {}; } })();
  const [name, setName] = useState<string>(raw.food_name ?? raw.description ?? 'Scanned meal');
  const [calories, setCalories] = useState(String(raw.calories ?? 0));
  const [protein, setProtein] = useState(String(raw.protein_g ?? 0));
  const [carbs, setCarbs] = useState(String(raw.carbs_g ?? 0));
  const [fat, setFat] = useState(String(raw.fat_g ?? 0));
  const [saving, setSaving] = useState(false);
  const confidence: Confidence = raw.confidence ?? 'low';

  async function confirm() {
    if (!userId) return;
    setSaving(true);
    try {
      const calNum = Number(calories);
      const { data: item, error: itemErr } = await supabase
        .from('food_items')
        .insert({
          name, source: 'custom',
          calories_per_100g: calNum,
          protein_per_100g: Number(protein),
          carbs_per_100g: Number(carbs),
          fat_per_100g: Number(fat),
        })
        .select('id')
        .single();
      if (itemErr) throw itemErr;
      const { error: logErr } = await supabase.from('food_logs').insert({
        user_id: userId, food_item_id: item.id,
        meal_slot, quantity_g: 100, logged_at: new Date().toISOString(), ai_estimated: true,
      });
      if (logErr) throw logErr;
      queryClient.invalidateQueries({ queryKey: ['food_logs', userId, date] });
      router.replace('/(tabs)');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save.');
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
        <Text style={styles.title}>Meal Scan Result</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.confidenceBadge}>
          <View style={[styles.dot, { backgroundColor: CONFIDENCE_COLOR[confidence] }]} />
          <Text style={styles.confidenceText}>{confidence} confidence — edit if incorrect</Text>
        </View>
        <Text style={styles.label}>Food name</Text>
        <TextInput style={styles.nameInput} value={name} onChangeText={setName} placeholderTextColor={colors.text.muted} />
        <View style={styles.row}>
          {[
            { label: 'Calories (kcal)', value: calories, set: setCalories },
            { label: 'Protein (g)', value: protein, set: setProtein },
            { label: 'Carbs (g)', value: carbs, set: setCarbs },
            { label: 'Fat (g)', value: fat, set: setFat },
          ].map(({ label: l, value, set }) => (
            <View key={l} style={styles.field}>
              <Text style={styles.fieldLabel}>{l}</Text>
              <TextInput
                style={styles.fieldInput}
                value={value}
                onChangeText={set}
                keyboardType="numeric"
                placeholderTextColor={colors.text.muted}
              />
            </View>
          ))}
        </View>
        <TouchableOpacity style={[styles.confirmBtn, saving && styles.disabled]} onPress={confirm} disabled={saving}>
          <Text style={styles.confirmText}>{saving ? 'Saving...' : 'Log This Meal'}</Text>
        </TouchableOpacity>
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
  title: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  content: { padding: spacing.lg, gap: spacing.md },
  confidenceBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  confidenceText: { color: colors.text.secondary, fontSize: typography.sm },
  label: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  nameInput: {
    backgroundColor: colors.bg.secondary, borderRadius: 10,
    padding: spacing.md, color: colors.text.primary, fontSize: typography.base,
    borderWidth: 1, borderColor: colors.border,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  field: { width: '47%' },
  fieldLabel: { color: colors.text.muted, fontSize: typography.xs, marginBottom: 4 },
  fieldInput: {
    backgroundColor: colors.bg.secondary, borderRadius: 10,
    padding: spacing.sm, color: colors.text.primary, fontSize: typography.base,
    borderWidth: 1, borderColor: colors.border,
  },
  confirmBtn: {
    backgroundColor: colors.brand.primary, borderRadius: 12,
    paddingVertical: spacing.md, alignItems: 'center',
  },
  disabled: { opacity: 0.5 },
  confirmText: { color: colors.white, fontSize: typography.base, fontWeight: '700' },
});
