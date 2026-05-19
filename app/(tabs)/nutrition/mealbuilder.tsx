import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Modal, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../stores/authStore';
import { useFoodLogs } from '../../../hooks/useNutrition';
import {
  useSuggestMeal, useBuildMeals,
  useAddAIMealToDiary, useAddAIMealToPlan,
} from '../../../hooks/useAIMealBuilder';
import { getWeekStart, WEEK_DAYS } from '../../../hooks/useMealPlan';
import { colors, typography, spacing } from '../../../constants/theme';
import type { AISuggestedMeal, MealSlot, WeekDay } from '../../../types/database';

type Tab = 'suggest' | 'ingredients';

const SLOTS: MealSlot[] = ['almusal', 'tanghalian', 'merienda', 'hapunan'];
const SLOT_LABELS: Record<MealSlot, string> = {
  almusal: 'Almusal', tanghalian: 'Tanghalian', merienda: 'Merienda', hapunan: 'Hapunan',
};
const DAY_SHORT: Record<WeekDay, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function MacroPill({ label }: { label: string }) {
  return (
    <View style={styles.macroPill}>
      <Text style={styles.macroPillText}>{label}</Text>
    </View>
  );
}

function MealResultCard({
  meal,
  onAddToDiary,
  onSaveToPlan,
  addingToDiary,
  savingToPlan,
}: {
  meal: AISuggestedMeal;
  onAddToDiary: () => void;
  onSaveToPlan?: () => void;
  addingToDiary: boolean;
  savingToPlan?: boolean;
}) {
  return (
    <View style={styles.resultCard}>
      <Text style={styles.resultMealName}>{meal.meal_name}</Text>
      <Text style={styles.resultDescription}>{meal.description}</Text>

      <View style={styles.ingredientsList}>
        {meal.ingredients.map((ing, i) => (
          <Text key={i} style={styles.ingredientRow}>
            {'• '}{ing.name} — {ing.quantity_g}{ing.unit !== 'g' ? ` ${ing.unit}` : 'g'}
          </Text>
        ))}
      </View>

      <View style={styles.macroPillRow}>
        <MacroPill label={`${Math.round(meal.macros.calories)}kcal`} />
        <MacroPill label={`${Math.round(meal.macros.protein_g)}g protein`} />
        <MacroPill label={`${Math.round(meal.macros.net_carbs_g)}g net carbs`} />
        <MacroPill label={`${Math.round(meal.macros.fat_g)}g fat`} />
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.cardBtn, addingToDiary && styles.cardBtnOff]}
          onPress={onAddToDiary}
          disabled={addingToDiary}
        >
          <Text style={styles.cardBtnText}>
            {addingToDiary ? 'Adding...' : '➕ Add to Diary'}
          </Text>
        </TouchableOpacity>
        {onSaveToPlan && (
          <TouchableOpacity
            style={[styles.cardBtn, styles.cardBtnSecondary, savingToPlan && styles.cardBtnOff]}
            onPress={onSaveToPlan}
            disabled={savingToPlan}
          >
            <Text style={styles.cardBtnText}>
              {savingToPlan ? 'Saving...' : '📅 Save to Plan'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function SaveToPlanModal({
  meal,
  visible,
  onClose,
}: {
  meal: AISuggestedMeal | null;
  visible: boolean;
  onClose: () => void;
}) {
  const [selectedDay, setSelectedDay] = useState<WeekDay>('monday');
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>('almusal');
  const addToPlan = useAddAIMealToPlan();
  const weekStart = getWeekStart(todayStr());

  function handleSave() {
    if (!meal) return;
    addToPlan.mutate(
      { meal, weekStartDate: weekStart, planDay: selectedDay, mealSlot: selectedSlot },
      {
        onSuccess: () => {
          Alert.alert('Saved!', `"${meal.meal_name}" added to ${SLOT_LABELS[selectedSlot]} on ${DAY_SHORT[selectedDay]}.`);
          onClose();
        },
        onError: (e) => Alert.alert('Error', e.message),
      }
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Save to Meal Plan</Text>
          <Text style={styles.modalLabel}>Day</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              {WEEK_DAYS.map(day => (
                <TouchableOpacity
                  key={day}
                  style={[styles.selectorChip, selectedDay === day && styles.selectorChipActive]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text style={[styles.selectorChipText, selectedDay === day && styles.selectorChipTextActive]}>
                    {DAY_SHORT[day]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.modalLabel}>Meal Slot</Text>
          <View style={styles.slotChipsRow}>
            {SLOTS.map(slot => (
              <TouchableOpacity
                key={slot}
                style={[styles.selectorChip, selectedSlot === slot && styles.selectorChipActive]}
                onPress={() => setSelectedSlot(slot)}
              >
                <Text style={[styles.selectorChipText, selectedSlot === slot && styles.selectorChipTextActive]}>
                  {SLOT_LABELS[slot]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSave, addToPlan.isPending && styles.cardBtnOff]}
              onPress={handleSave}
              disabled={addToPlan.isPending}
            >
              <Text style={styles.modalSaveText}>{addToPlan.isPending ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SuggestTab() {
  const profile = useAuthStore(s => s.profile);
  const today = todayStr();
  const { data: foodLogs = [] } = useFoodLogs(today);
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>('almusal');
  const [preferences, setPreferences] = useState('');
  const [result, setResult] = useState<AISuggestedMeal | null>(null);
  const suggestMeal = useSuggestMeal();
  const addToDiary = useAddAIMealToDiary();

  const calGoal = profile?.calorie_goal ?? 2000;
  const pGoal = profile?.protein_goal_g ?? 150;
  const cGoal = profile?.carbs_goal_g ?? 200;
  const fGoal = profile?.fat_goal_g ?? 65;

  const totalCal = foodLogs.reduce((s, l) => s + ((l.food_item?.calories_per_100g ?? 0) * l.quantity_g / 100), 0);
  const totalProtein = foodLogs.reduce((s, l) => s + ((l.food_item?.protein_per_100g ?? 0) * l.quantity_g / 100), 0);
  const totalCarbs = foodLogs.reduce((s, l) => s + ((l.food_item?.carbs_per_100g ?? 0) * l.quantity_g / 100), 0);
  const totalFat = foodLogs.reduce((s, l) => s + ((l.food_item?.fat_per_100g ?? 0) * l.quantity_g / 100), 0);

  const remainingCal = Math.max(0, calGoal - Math.round(totalCal));
  const remainingProtein = Math.max(0, pGoal - Math.round(totalProtein));
  const remainingCarbs = Math.max(0, cGoal - Math.round(totalCarbs));
  const remainingFat = Math.max(0, fGoal - Math.round(totalFat));

  function handleSuggest() {
    suggestMeal.mutate(
      {
        meal_slot: SLOT_LABELS[selectedSlot],
        remaining_calories: remainingCal,
        remaining_protein_g: remainingProtein,
        remaining_carbs_g: remainingCarbs,
        remaining_fat_g: remainingFat,
        preferences: preferences.trim() || undefined,
      },
      {
        onSuccess: (meal) => setResult(meal),
        onError: (e) => Alert.alert('Error', e.message),
      }
    );
  }

  function handleAddToDiary() {
    if (!result) return;
    addToDiary.mutate(
      { meal: result, slot: selectedSlot, date: today },
      {
        onSuccess: () => Alert.alert('Added!', `"${result.meal_name}" logged to ${SLOT_LABELS[selectedSlot]}.`),
        onError: (e) => Alert.alert('Error', e.message),
      }
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <View style={styles.remainingBar}>
        <Text style={styles.remainingTitle}>Remaining Today</Text>
        <Text style={styles.remainingMacros}>
          {remainingCal} kcal · {remainingProtein}g protein · {remainingCarbs}g carbs · {remainingFat}g fat
        </Text>
      </View>

      <Text style={styles.sectionLabel}>Which meal?</Text>
      <View style={styles.slotChipsRow}>
        {SLOTS.map(slot => (
          <TouchableOpacity
            key={slot}
            style={[styles.selectorChip, selectedSlot === slot && styles.selectorChipActive]}
            onPress={() => setSelectedSlot(slot)}
          >
            <Text style={[styles.selectorChipText, selectedSlot === slot && styles.selectorChipTextActive]}>
              {SLOT_LABELS[slot]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.textInput}
        value={preferences}
        onChangeText={setPreferences}
        placeholder="Any preferences? (budget lang, walang pork, quick to cook...)"
        placeholderTextColor={colors.text.muted}
        multiline
      />

      <TouchableOpacity
        style={[styles.generateBtn, suggestMeal.isPending && styles.cardBtnOff]}
        onPress={handleSuggest}
        disabled={suggestMeal.isPending}
      >
        <Text style={styles.generateBtnText}>
          {suggestMeal.isPending ? '' : 'Suggest a Meal 🌙'}
        </Text>
        {suggestMeal.isPending && <ActivityIndicator color="#fff" />}
      </TouchableOpacity>

      {suggestMeal.isPending && (
        <Text style={styles.loadingText}>
          Naghahanap ng perpektong pagkain para sayo... 🌙
        </Text>
      )}

      {result && !suggestMeal.isPending && (
        <MealResultCard
          meal={result}
          onAddToDiary={handleAddToDiary}
          addingToDiary={addToDiary.isPending}
        />
      )}

      {result && !suggestMeal.isPending && (
        <TouchableOpacity style={styles.tryAnotherBtn} onPress={handleSuggest}>
          <Text style={styles.tryAnotherText}>🔄 Try Another</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function IngredientsTab() {
  const profile = useAuthStore(s => s.profile);
  const [ingredientsText, setIngredientsText] = useState('');
  const [results, setResults] = useState<AISuggestedMeal[]>([]);
  const [saveToPlanMeal, setSaveToPlanMeal] = useState<AISuggestedMeal | null>(null);
  const buildMeals = useBuildMeals();
  const addToDiary = useAddAIMealToDiary();
  const today = todayStr();

  const calGoal = profile?.calorie_goal ?? 2000;
  const pGoal = profile?.protein_goal_g ?? 150;

  function handleBuild() {
    const ingredientsList = ingredientsText
      .split(/[,\n]/)
      .map(s => s.trim())
      .filter(Boolean);

    if (ingredientsList.length === 0) {
      Alert.alert('', 'Ano meron ka? Enter your ingredients first.');
      return;
    }

    buildMeals.mutate(
      { ingredients: ingredientsList, calorie_goal: calGoal, protein_goal_g: pGoal },
      {
        onSuccess: (data) => setResults(data.meals),
        onError: (e) => Alert.alert('Error', e.message),
      }
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <TextInput
        style={[styles.textInput, styles.textAreaInput]}
        value={ingredientsText}
        onChangeText={setIngredientsText}
        placeholder="Ano meron ka? (e.g. itlog, kanin, kangkong, toyo, bawang...)"
        placeholderTextColor={colors.text.muted}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.generateBtn, buildMeals.isPending && styles.cardBtnOff]}
        onPress={handleBuild}
        disabled={buildMeals.isPending}
      >
        <Text style={styles.generateBtnText}>
          {buildMeals.isPending ? '' : 'Find Meals I Can Make 🍳'}
        </Text>
        {buildMeals.isPending && <ActivityIndicator color="#fff" />}
      </TouchableOpacity>

      {buildMeals.isPending && (
        <Text style={styles.loadingText}>
          Iniisip ng pinakamainam na lutuin... 🍳
        </Text>
      )}

      {results.length > 0 && !buildMeals.isPending && results.map((meal, i) => (
        <MealResultCard
          key={i}
          meal={meal}
          onAddToDiary={() =>
            addToDiary.mutate(
              { meal, slot: 'almusal', date: today },
              {
                onSuccess: () => Alert.alert('Added!', `"${meal.meal_name}" logged to today's diary.`),
                onError: (e) => Alert.alert('Error', e.message),
              }
            )
          }
          addingToDiary={addToDiary.isPending}
          onSaveToPlan={() => setSaveToPlanMeal(meal)}
          savingToPlan={false}
        />
      ))}

      <SaveToPlanModal
        meal={saveToPlanMeal}
        visible={saveToPlanMeal !== null}
        onClose={() => setSaveToPlanMeal(null)}
      />
    </ScrollView>
  );
}

export default function MealBuilderScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('suggest');

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🤖 Meal Builder</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBarBtn, activeTab === 'suggest' && styles.tabBarBtnActive]}
          onPress={() => setActiveTab('suggest')}
        >
          <Text style={[styles.tabBarBtnText, activeTab === 'suggest' && styles.tabBarBtnTextActive]}>
            SUGGEST
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBarBtn, activeTab === 'ingredients' && styles.tabBarBtnActive]}
          onPress={() => setActiveTab('ingredients')}
        >
          <Text style={[styles.tabBarBtnText, activeTab === 'ingredients' && styles.tabBarBtnTextActive]}>
            USE INGREDIENTS
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'suggest' ? <SuggestTab /> : <IngredientsTab />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backBtnText: { color: colors.brand.primary, fontSize: typography['2xl'], fontWeight: '700' },
  headerTitle: { color: colors.brand.secondary, fontSize: typography.xl, fontWeight: '700' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tabBarBtn: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  tabBarBtnActive: { borderBottomWidth: 2, borderBottomColor: colors.brand.primary },
  tabBarBtnText: { color: colors.text.muted, fontSize: typography.sm, fontWeight: '700', letterSpacing: 0.5 },
  tabBarBtnTextActive: { color: colors.brand.primary },
  tabContent: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  remainingBar: {
    backgroundColor: colors.bg.secondary, borderRadius: 12, padding: spacing.md,
    marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  remainingTitle: { color: colors.text.secondary, fontSize: typography.xs, fontWeight: '700', marginBottom: 4 },
  remainingMacros: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  sectionLabel: { color: colors.text.secondary, fontSize: typography.sm, fontWeight: '700', marginBottom: spacing.sm },
  slotChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  selectorChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border,
  },
  selectorChipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  selectorChipText: { color: colors.text.secondary, fontSize: typography.sm, fontWeight: '600' },
  selectorChipTextActive: { color: '#fff' },
  textInput: {
    backgroundColor: colors.bg.secondary, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    color: colors.text.primary, fontSize: typography.sm, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, marginBottom: spacing.md,
  },
  textAreaInput: { height: 100, textAlignVertical: 'top' },
  generateBtn: {
    backgroundColor: colors.brand.primary, borderRadius: 14, paddingVertical: spacing.md,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm, flexDirection: 'row', gap: 8,
  },
  generateBtnText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
  loadingText: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center', marginBottom: spacing.md },
  resultCard: {
    backgroundColor: colors.bg.secondary, borderRadius: 16, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, marginTop: spacing.md,
  },
  resultMealName: { color: colors.text.primary, fontSize: typography.xl, fontWeight: '700', marginBottom: 4 },
  resultDescription: { color: colors.text.muted, fontSize: typography.sm, marginBottom: spacing.md },
  ingredientsList: { marginBottom: spacing.md },
  ingredientRow: { color: colors.text.secondary, fontSize: typography.sm, marginBottom: 4 },
  macroPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  macroPill: {
    backgroundColor: colors.bg.elevated, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  macroPillText: { color: colors.brand.secondary, fontSize: typography.xs, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: spacing.sm },
  cardBtn: {
    flex: 1, backgroundColor: colors.brand.primary, borderRadius: 10,
    paddingVertical: spacing.sm, alignItems: 'center',
  },
  cardBtnSecondary: { backgroundColor: colors.bg.elevated, borderWidth: 1, borderColor: colors.border },
  cardBtnOff: { opacity: 0.5 },
  cardBtnText: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
  tryAnotherBtn: {
    marginTop: spacing.sm, paddingVertical: spacing.sm, alignItems: 'center',
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
  },
  tryAnotherText: { color: colors.text.secondary, fontSize: typography.sm, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.bg.elevated, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing.lg, gap: spacing.md,
  },
  modalTitle: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  modalLabel: { color: colors.text.secondary, fontSize: typography.sm, fontWeight: '700' },
  modalButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  modalCancel: {
    flex: 1, borderRadius: 10, paddingVertical: spacing.sm, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  modalCancelText: { color: colors.text.secondary, fontSize: typography.base },
  modalSave: {
    flex: 1, backgroundColor: colors.brand.primary, borderRadius: 10,
    paddingVertical: spacing.sm, alignItems: 'center',
  },
  modalSaveText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
});
