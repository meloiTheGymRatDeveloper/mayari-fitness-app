import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { colors, typography, spacing } from '../../../constants/theme';
import type { UserProfile } from '../../../types/database';
import { computeAllTargets } from '../../../lib/calories';

function calcDefaultGoals(profile: UserProfile) {
  if (!profile.body_weight_kg || !profile.height_cm || !profile.birthdate) {
    return { calories: 2000, protein: 120, fat: 55, carbs: 230 };
  }
  const targets = computeAllTargets({
    body_weight_kg: profile.body_weight_kg,
    height_cm: profile.height_cm,
    birthdate: profile.birthdate,
    gender: profile.gender ?? 'prefer_not_to_say',
    body_fat_pct: profile.body_fat_pct,
    activity_level: profile.activity_level ?? 'lightly_active',
    primary_goal: profile.primary_goal ?? 'maintain',
  });
  return {
    calories: targets.calorie_target,
    protein: targets.protein_g,
    fat: targets.fat_g,
    carbs: targets.carbs_g,
  };
}

export default function MacroGoalsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, fetchProfile, session } = useAuthStore();
  const [useCustom, setUseCustom] = useState(false);
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [saving, setSaving] = useState(false);

  const defaults = profile ? calcDefaultGoals(profile) : null;

  useEffect(() => {
    if (!profile) return;
    if (profile.calorie_goal) {
      setUseCustom(true);
      setCalories(String(profile.calorie_goal));
      setProtein(String(profile.protein_goal_g ?? ''));
      setCarbs(String(profile.carbs_goal_g ?? ''));
      setFat(String(profile.fat_goal_g ?? ''));
    } else if (defaults) {
      setCalories(String(defaults.calories));
      setProtein(String(defaults.protein));
      setCarbs(String(defaults.carbs));
      setFat(String(defaults.fat));
    }
  }, [profile]);

  async function handleSave() {
    if (!session?.user.id) return;
    setSaving(true);
    try {
      const update = useCustom
        ? {
            calorie_goal: parseInt(calories) || null,
            protein_goal_g: parseFloat(protein) || null,
            carbs_goal_g: parseFloat(carbs) || null,
            fat_goal_g: parseFloat(fat) || null,
          }
        : { calorie_goal: null, protein_goal_g: null, carbs_goal_g: null, fat_goal_g: null };

      const { error } = await supabase.from('users').update(update).eq('id', session.user.id);
      if (error) throw error;
      await fetchProfile(session.user.id);
      router.back();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save goals');
    } finally {
      setSaving(false);
    }
  }

  const active = useCustom
    ? { calories, protein, carbs, fat }
    : defaults
    ? {
        calories: String(defaults.calories),
        protein: String(defaults.protein),
        carbs: String(defaults.carbs),
        fat: String(defaults.fat),
      }
    : null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>Macro Goals</Text>
      <Text style={styles.sub}>Set daily calorie and macro targets.</Text>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, !useCustom && styles.toggleActive]}
          onPress={() => setUseCustom(false)}
        >
          <Text style={[styles.toggleText, !useCustom && styles.toggleTextActive]}>Suggested</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, useCustom && styles.toggleActive]}
          onPress={() => setUseCustom(true)}
        >
          <Text style={[styles.toggleText, useCustom && styles.toggleTextActive]}>Custom</Text>
        </TouchableOpacity>
      </View>

      {active && (
        <View style={styles.goalsCard}>
          {[
            { label: 'Calories (kcal)', key: 'calories', value: active.calories, setter: setCalories },
            { label: 'Protein (g)', key: 'protein', value: active.protein, setter: setProtein },
            { label: 'Carbs (g)', key: 'carbs', value: active.carbs, setter: setCarbs },
            { label: 'Fat (g)', key: 'fat', value: active.fat, setter: setFat },
          ].map(({ label, key, value, setter }) => (
            <View key={key} style={styles.goalRow}>
              <Text style={styles.goalLabel}>{label}</Text>
              {useCustom ? (
                <TextInput
                  style={styles.goalInput}
                  value={value}
                  onChangeText={setter}
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.goalValue}>{value}</Text>
              )}
            </View>
          ))}
          {profile?.net_carbs_display !== false && (
            <View style={[styles.goalRow, styles.goalRowLast]}>
              <Text style={styles.goalLabel}>Net Carbs (g/day)</Text>
              <Text style={styles.goalValueMuted}>Auto (Carbs − Fiber)</Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnOff]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Goals'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  back: { marginBottom: spacing.lg },
  backText: { color: colors.brand.primary, fontSize: typography.base },
  heading: { color: colors.text.primary, fontSize: typography['2xl'], fontWeight: '700', marginBottom: spacing.xs },
  sub: { color: colors.text.secondary, fontSize: typography.sm, marginBottom: spacing.lg },
  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  toggleText: { color: colors.text.secondary, fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
  goalsCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  goalLabel: { color: colors.text.secondary, fontSize: typography.base },
  goalValue: { color: colors.text.primary, fontSize: typography.base, fontWeight: '600' },
  goalInput: {
    color: colors.text.primary,
    fontSize: typography.base,
    fontWeight: '600',
    backgroundColor: colors.bg.elevated,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    minWidth: 80,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveBtn: { backgroundColor: colors.brand.primary, borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center' },
  saveBtnOff: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
  goalRowLast: { borderBottomWidth: 0 },
  goalValueMuted: { color: colors.text.muted, fontSize: typography.sm, fontStyle: 'italic' },
});
