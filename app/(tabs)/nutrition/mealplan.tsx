import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, TextInput, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../../../stores/authStore';
import {
  useMealPlan, useMealPlanTemplates,
  useRemoveFoodFromPlan, useSaveTemplate, useLoadTemplate,
  useApplyDayToDiary, useApplyWeekToDiary,
  getWeekStart, addDaysToDateStr, weekDayToDateStr, WEEK_DAYS,
} from '../../../hooks/useMealPlan';
import { colors, typography, spacing } from '../../../constants/theme';
import type { WeekDay, MealSlot, MealPlanDayData, MealPlanData, PlannedMealItem } from '../../../types/database';
import { useGenerateWeeklyPlan, useSuggestMeal, useAddAIMealToPlan } from '../../../hooks/useAIMealBuilder';
import type { AISuggestedMeal } from '../../../types/database';

const SLOT_LABELS: Record<MealSlot, string> = {
  almusal: 'Almusal', tanghalian: 'Tanghalian', merienda: 'Merienda', hapunan: 'Hapunan',
};
const GENERIC_LABELS: Record<MealSlot, string> = {
  almusal: 'Breakfast', tanghalian: 'Lunch', merienda: 'Snack', hapunan: 'Dinner',
};
const DAY_SHORT: Record<WeekDay, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatWeekRange(weekStart: string): string {
  const end = addDaysToDateStr(weekStart, 6);
  const s = new Date(weekStart + 'T12:00:00Z');
  const e = new Date(end + 'T12:00:00Z');
  return `${s.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`;
}

function getTodayWeekDay(): WeekDay {
  const day = new Date().getUTCDay();
  return WEEK_DAYS[day === 0 ? 6 : day - 1];
}

function sumSlot(items: PlannedMealItem[]) {
  return items.reduce((acc, i) => ({
    cal: acc.cal + i.calories,
    p: acc.p + i.protein_g,
    c: acc.c + i.carbs_g,
    f: acc.f + i.fat_g,
  }), { cal: 0, p: 0, c: 0, f: 0 });
}

function sumDay(dayData: MealPlanDayData | undefined) {
  if (!dayData) return { cal: 0, p: 0, c: 0, f: 0 };
  return (['almusal', 'tanghalian', 'merienda', 'hapunan'] as MealSlot[]).reduce((acc, s) => {
    const t = sumSlot(dayData[s] ?? []);
    return { cal: acc.cal + t.cal, p: acc.p + t.p, c: acc.c + t.c, f: acc.f + t.f };
  }, { cal: 0, p: 0, c: 0, f: 0 });
}

export default function MealPlanScreen() {
  const router = useRouter();
  const profile = useAuthStore(s => s.profile);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(todayStr()));
  const [selectedDay, setSelectedDay] = useState<WeekDay>(getTodayWeekDay);
  const [templatesExpanded, setTemplatesExpanded] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const { data: plan, isLoading, refetch } = useMealPlan(weekStart);
  const { data: templates = [] } = useMealPlanTemplates();
  const removeFood = useRemoveFoodFromPlan();
  const saveTemplate = useSaveTemplate();
  const loadTemplate = useLoadTemplate();
  const applyDay = useApplyDayToDiary();
  const applyWeek = useApplyWeekToDiary();

  const generateWeeklyPlan = useGenerateWeeklyPlan();
  const suggestMeal = useSuggestMeal();
  const addAIMealToPlan = useAddAIMealToPlan();

  const [showAIGenerateModal, setShowAIGenerateModal] = useState(false);
  const [aiAvoid, setAIAvoid] = useState('');
  const [aiPreferences, setAIPreferences] = useState('');
  const [showAIOverlay, setShowAIOverlay] = useState(false);

  const [aiSuggestSlot, setAISlot] = useState<MealSlot | null>(null);
  const [aiSuggestResult, setAISuggestResult] = useState<AISuggestedMeal | null>(null);
  const [showAISuggestModal, setShowAISuggestModal] = useState(false);

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const planData: MealPlanData = plan?.plan_data ?? {};
  const dayData: MealPlanDayData = planData[selectedDay] ?? { almusal: [], tanghalian: [], merienda: [], hapunan: [] };
  const dayTotals = sumDay(dayData);
  const calGoal = profile?.calorie_goal ?? 2000;
  const pGoal = profile?.protein_goal_g ?? 150;
  const cGoal = profile?.carbs_goal_g ?? 200;
  const fGoal = profile?.fat_goal_g ?? 65;
  const mealStyle = profile?.meal_time_style ?? 'filipino';
  const slotLabels = mealStyle === 'filipino' ? SLOT_LABELS : GENERIC_LABELS;

  function goToSearch(slot: MealSlot) {
    router.push({
      pathname: '/(tabs)/nutrition/search',
      params: {
        context: 'plan',
        week_start_date: weekStart,
        plan_day: selectedDay,
        meal_slot: slot,
        date: weekDayToDateStr(weekStart, selectedDay),
      },
    });
  }

  function handleDeleteFood(slot: MealSlot, index: number) {
    Alert.alert('Remove food?', 'Remove this item from your meal plan?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => removeFood.mutate({
          weekStartDate: weekStart,
          planDay: selectedDay,
          mealSlot: slot,
          itemIndex: index,
          currentPlanData: planData,
        }),
      },
    ]);
  }

  function handleApplyDay() {
    const dateStr = weekDayToDateStr(weekStart, selectedDay);
    applyDay.mutate({ dayData, dateStr }, {
      onSuccess: () => Alert.alert('Done!', `${DAY_SHORT[selectedDay]}'s meals added to your diary.`),
      onError: (e) => Alert.alert('Error', e.message),
    });
  }

  function handleApplyWeek() {
    Alert.alert(
      'Apply Full Week',
      'This will pre-fill 7 days of your diary. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply', onPress: () => {
            applyWeek.mutate({ planData, weekStartDate: weekStart }, {
              onSuccess: () => Alert.alert('Done!', 'Full week added to your diary.'),
              onError: (e) => Alert.alert('Error', e.message),
            });
          },
        },
      ],
    );
  }

  function handleSaveTemplate() {
    const name = templateName.trim();
    if (!name) { Alert.alert('', 'Enter a template name'); return; }
    saveTemplate.mutate({ name, planData }, {
      onSuccess: () => {
        setShowSaveModal(false);
        setTemplateName('');
        Alert.alert('Saved!', `Template "${name}" saved.`);
      },
      onError: (e) => Alert.alert('Error', e.message),
    });
  }

  function handleLoadTemplate(tmpl: { plan_data: MealPlanData; name: string }) {
    const hasData = WEEK_DAYS.some(d => {
      const dd = planData[d];
      return dd && (['almusal', 'tanghalian', 'merienda', 'hapunan'] as MealSlot[]).some(s => (dd[s] ?? []).length > 0);
    });
    const doLoad = () => loadTemplate.mutate(
      { weekStartDate: weekStart, templatePlanData: tmpl.plan_data },
      { onError: (e) => Alert.alert('Error', e.message) },
    );
    if (hasData) {
      Alert.alert(
        'Replace current plan?',
        `Replace this week's plan with "${tmpl.name}"?`,
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Replace', style: 'destructive', onPress: doLoad }],
      );
    } else {
      doLoad();
    }
  }

  function goGenerateGrocery() {
    if (plan?.id) {
      router.push({ pathname: '/(tabs)/nutrition/grocery', params: { meal_plan_id: plan.id } });
    } else {
      router.push('/(tabs)/nutrition/grocery');
    }
  }

  function handleAIGenerate() {
    setShowAIGenerateModal(false);
    setShowAIOverlay(true);
    generateWeeklyPlan.mutate(
      {
        weekStartDate: weekStart,
        calorie_goal: calGoal,
        protein_goal_g: pGoal,
        avoid: aiAvoid.trim() || undefined,
        preferences: aiPreferences.trim() || undefined,
      },
      {
        onSuccess: () => {
          setShowAIOverlay(false);
          refetch();
          Alert.alert('Done!', 'Your AI meal plan is ready. Feel free to edit any meals.');
        },
        onError: (e) => {
          setShowAIOverlay(false);
          Alert.alert('Generation failed', e.message || 'Try again.');
        },
      }
    );
  }

  function handleAISuggestForSlot(slot: MealSlot) {
    setAISlot(slot);
    setAISuggestResult(null);
    setShowAISuggestModal(true);
    suggestMeal.mutate(
      {
        meal_slot: slot,
        remaining_calories: Math.max(0, calGoal - Math.round(dayTotals.cal)),
        remaining_protein_g: Math.max(0, pGoal - Math.round(dayTotals.p)),
        remaining_carbs_g: Math.max(0, cGoal - Math.round(dayTotals.c)),
        remaining_fat_g: Math.max(0, fGoal - Math.round(dayTotals.f)),
      },
      {
        onSuccess: (meal) => setAISuggestResult(meal),
        onError: (e) => {
          setShowAISuggestModal(false);
          Alert.alert('Error', e.message);
        },
      }
    );
  }

  function handleUseAIMeal() {
    if (!aiSuggestResult || !aiSuggestSlot) return;
    addAIMealToPlan.mutate(
      {
        meal: aiSuggestResult,
        weekStartDate: weekStart,
        planDay: selectedDay,
        mealSlot: aiSuggestSlot,
      },
      {
        onSuccess: () => {
          setShowAISuggestModal(false);
          setAISuggestResult(null);
          setAISlot(null);
          refetch();
        },
        onError: (e) => Alert.alert('Error', e.message),
      }
    );
  }

  const today = todayStr();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setWeekStart(w => addDaysToDateStr(w, -7))} style={styles.arrow}>
            <Text style={styles.arrowText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.screenTitle}>Meal Plan</Text>
            <Text style={styles.weekRange}>{formatWeekRange(weekStart)}</Text>
          </View>
          <TouchableOpacity onPress={() => setWeekStart(w => addDaysToDateStr(w, 7))} style={styles.arrow}>
            <Text style={styles.arrowText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabsScroll} contentContainerStyle={styles.dayTabsContent}>
          {WEEK_DAYS.map((day, i) => {
            const dayDate = addDaysToDateStr(weekStart, i);
            const isActive = day === selectedDay;
            const isToday = dayDate === today;
            return (
              <TouchableOpacity key={day} style={[styles.dayTab, isActive && styles.dayTabActive]} onPress={() => setSelectedDay(day)}>
                <Text style={[styles.dayTabText, isActive && styles.dayTabTextActive]}>{DAY_SHORT[day]}</Text>
                {isToday && <View style={[styles.todayDot, isActive && styles.todayDotActive]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Daily macro bar */}
        <View style={styles.macroBar}>
          {dayTotals.cal === 0 ? (
            <Text style={styles.noMealsText}>No meals planned yet for this day.</Text>
          ) : (
            <>
              <View style={styles.macroBarRow}>
                <Text style={styles.macroBarCal}>{Math.round(dayTotals.cal)} kcal</Text>
                <Text style={styles.macroBarGoal}>/ {calGoal} kcal goal</Text>
              </View>
              <View style={styles.calBar}>
                <View style={[styles.calBarFill, { width: `${Math.min(100, (dayTotals.cal / calGoal) * 100)}%` as `${number}%`, backgroundColor: dayTotals.cal > calGoal ? colors.error : colors.brand.primary }]} />
              </View>
              <View style={styles.macroChips}>
                <Text style={styles.macroChip}>P {Math.round(dayTotals.p)}g / {pGoal}g</Text>
                <Text style={styles.macroChip}>C {Math.round(dayTotals.c)}g / {cGoal}g</Text>
                <Text style={styles.macroChip}>F {Math.round(dayTotals.f)}g / {fGoal}g</Text>
              </View>
            </>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 32 }} />
        ) : (
          <>
            {/* Meal slot sections */}
            {(['almusal', 'tanghalian', 'merienda', 'hapunan'] as MealSlot[]).map(slot => {
              const items = dayData[slot] ?? [];
              const slotTotal = sumSlot(items);
              return (
                <View key={slot} style={styles.slotSection}>
                  <View style={styles.slotHeader}>
                    <Text style={styles.slotName}>{slotLabels[slot]}</Text>
                    <View style={styles.slotHeaderRight}>
                      {items.length > 0 && (
                        <Text style={styles.slotCal}>{Math.round(slotTotal.cal)} kcal</Text>
                      )}
                      <TouchableOpacity
                        style={styles.aiSuggestBtn}
                        onPress={() => handleAISuggestForSlot(slot)}
                        disabled={suggestMeal.isPending}
                      >
                        <Text style={styles.aiSuggestBtnText}>💡 AI Suggest</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {items.map((item, idx) => (
                    <PlanFoodRow
                      key={`${item.food_item_id}-${idx}`}
                      item={item}
                      onDelete={() => handleDeleteFood(slot, idx)}
                    />
                  ))}
                  <TouchableOpacity style={styles.addFoodBtn} onPress={() => goToSearch(slot)}>
                    <Text style={styles.addFoodBtnText}>+ Add Food</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            {/* Grocery button */}
            <TouchableOpacity style={styles.groceryBtn} onPress={goGenerateGrocery}>
              <Text style={styles.groceryBtnText}>🛒 Generate Grocery List</Text>
            </TouchableOpacity>

            {/* Templates */}
            <TouchableOpacity style={styles.templateHeader} onPress={() => setTemplatesExpanded(e => !e)}>
              <Text style={styles.templateHeaderText}>My Templates</Text>
              <Text style={styles.templateChevron}>{templatesExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {templatesExpanded && (
              <View style={styles.templateBody}>
                <TouchableOpacity style={styles.saveTemplateBtn} onPress={() => setShowSaveModal(true)}>
                  <Text style={styles.saveTemplateBtnText}>💾 Save as Template</Text>
                </TouchableOpacity>
                {templates.length === 0 ? (
                  <Text style={styles.noTemplatesText}>No saved templates yet.</Text>
                ) : (
                  templates.map(tmpl => (
                    <View key={tmpl.id} style={styles.templateRow}>
                      <View style={styles.templateRowLeft}>
                        <Text style={styles.templateName}>{tmpl.name}</Text>
                        <Text style={styles.templateDate}>{new Date(tmpl.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                      </View>
                      <TouchableOpacity style={styles.loadBtn} onPress={() => handleLoadTemplate(tmpl)}>
                        <Text style={styles.loadBtnText}>Load</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom action bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.bottomBtn, applyDay.isPending && styles.bottomBtnOff]}
          onPress={handleApplyDay}
          disabled={applyDay.isPending}
        >
          <Text style={styles.bottomBtnText}>📋 Apply to Diary</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bottomBtn, styles.bottomBtnSecondary, applyWeek.isPending && styles.bottomBtnOff]}
          onPress={handleApplyWeek}
          disabled={applyWeek.isPending}
        >
          <Text style={styles.bottomBtnText}>📅 Apply Full Week</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bottomBtn, styles.bottomBtnAI]}
          onPress={() => setShowAIGenerateModal(true)}
        >
          <Text style={styles.bottomBtnText}>🤖 AI</Text>
        </TouchableOpacity>
      </View>

      {/* Save template modal */}
      <Modal visible={showSaveModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Save as Template</Text>
            <TextInput
              style={styles.modalInput}
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="Template name..."
              placeholderTextColor={colors.text.muted}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowSaveModal(false); setTemplateName(''); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSaveTemplate} disabled={saveTemplate.isPending}>
                <Text style={styles.modalSaveText}>{saveTemplate.isPending ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI Generate Week bottom-sheet modal */}
      <Modal visible={showAIGenerateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Generate AI Meal Plan</Text>
            <TextInput
              style={styles.modalInput}
              value={aiAvoid}
              onChangeText={setAIAvoid}
              placeholder="Anything to avoid? (pork, shellfish...)"
              placeholderTextColor={colors.text.muted}
            />
            <TextInput
              style={styles.modalInput}
              value={aiPreferences}
              onChangeText={setAIPreferences}
              placeholder="Any preferences? (budget meals, quick to prepare...)"
              placeholderTextColor={colors.text.muted}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAIGenerateModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleAIGenerate}>
                <Text style={styles.modalSaveText}>Generate Full Week 🌙</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full-screen loading overlay */}
      <Modal visible={showAIOverlay} transparent animationType="fade">
        <View style={styles.overlayFull}>
          <Text style={styles.overlayMoon}>🌙</Text>
          <ActivityIndicator color={colors.brand.primary} size="large" style={{ marginTop: spacing.md }} />
          <Text style={styles.overlayTitle}>Ginagawa ang iyong meal plan... 🌙</Text>
          <Text style={styles.overlaySub}>This may take up to 30 seconds.</Text>
        </View>
      </Modal>

      {/* AI Suggest slot modal */}
      <Modal visible={showAISuggestModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              💡 AI Suggestion for {aiSuggestSlot ? slotLabels[aiSuggestSlot] : ''}
            </Text>
            {suggestMeal.isPending && (
              <>
                <ActivityIndicator color={colors.brand.primary} style={{ marginVertical: spacing.lg }} />
                <Text style={styles.aiLoadingText}>Naghahanap ng perpektong pagkain... 🌙</Text>
              </>
            )}
            {aiSuggestResult && !suggestMeal.isPending && (
              <>
                <Text style={styles.aiResultName}>{aiSuggestResult.meal_name}</Text>
                <Text style={styles.aiResultDesc}>{aiSuggestResult.description}</Text>
                <Text style={styles.aiResultMacros}>
                  {Math.round(aiSuggestResult.macros.calories)} kcal · {Math.round(aiSuggestResult.macros.protein_g)}g P · {Math.round(aiSuggestResult.macros.carbs_g)}g C · {Math.round(aiSuggestResult.macros.fat_g)}g F
                </Text>
              </>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => {
                setShowAISuggestModal(false);
                setAISuggestResult(null);
                setAISlot(null);
              }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              {aiSuggestResult && (
                <TouchableOpacity
                  style={[styles.modalSave, addAIMealToPlan.isPending && { opacity: 0.5 }]}
                  onPress={handleUseAIMeal}
                  disabled={addAIMealToPlan.isPending}
                >
                  <Text style={styles.modalSaveText}>
                    {addAIMealToPlan.isPending ? 'Adding...' : 'Use This Meal'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

function PlanFoodRow({ item, onDelete }: { item: PlannedMealItem; onDelete: () => void }) {
  const renderRightActions = (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const opacity = dragX.interpolate({ inputRange: [-80, 0], outputRange: [1, 0], extrapolate: 'clamp' });
    return (
      <Animated.View style={[styles.deleteAction, { opacity }]}>
        <TouchableOpacity style={styles.deleteActionBtn} onPress={onDelete}>
          <Text style={styles.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <View style={styles.foodRow}>
        <Text style={styles.foodRowName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.foodRowQty}>{item.quantity_g}g</Text>
        <Text style={styles.foodRowCal}>{item.calories} kcal</Text>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { padding: spacing.lg, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  headerCenter: { alignItems: 'center', flex: 1 },
  screenTitle: { color: colors.text.primary, fontSize: typography.xl, fontWeight: '700' },
  weekRange: { color: colors.text.muted, fontSize: typography.sm, marginTop: 2 },
  arrow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  arrowText: { color: colors.brand.primary, fontSize: typography['2xl'], fontWeight: '700' },
  dayTabsScroll: { marginBottom: spacing.md },
  dayTabsContent: { gap: spacing.xs, paddingRight: spacing.md },
  dayTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.bg.secondary, borderWidth: 1, borderColor: colors.border, alignItems: 'center', minWidth: 52 },
  dayTabActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  dayTabText: { color: colors.text.secondary, fontSize: typography.sm, fontWeight: '600' },
  dayTabTextActive: { color: '#fff' },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.brand.secondary, marginTop: 3 },
  todayDotActive: { backgroundColor: '#fff' },
  macroBar: { backgroundColor: colors.bg.secondary, borderRadius: 12, padding: spacing.md, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  noMealsText: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center' },
  macroBarRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginBottom: spacing.xs },
  macroBarCal: { color: colors.text.primary, fontSize: typography.xl, fontWeight: '700' },
  macroBarGoal: { color: colors.text.muted, fontSize: typography.sm },
  calBar: { height: 6, backgroundColor: colors.bg.elevated, borderRadius: 3, marginBottom: spacing.sm, overflow: 'hidden' },
  calBarFill: { height: '100%', borderRadius: 3 },
  macroChips: { flexDirection: 'row', gap: spacing.sm },
  macroChip: { color: colors.text.secondary, fontSize: typography.xs },
  slotSection: { marginBottom: spacing.lg },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  slotName: { color: colors.text.primary, fontSize: typography.base, fontWeight: '700' },
  slotCal: { color: colors.text.muted, fontSize: typography.sm },
  foodRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.secondary, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: 4, gap: spacing.sm },
  foodRowName: { flex: 1, color: colors.text.primary, fontSize: typography.sm },
  foodRowQty: { color: colors.text.muted, fontSize: typography.xs, minWidth: 36, textAlign: 'right' },
  foodRowCal: { color: colors.brand.secondary, fontSize: typography.xs, minWidth: 52, textAlign: 'right' },
  deleteAction: { justifyContent: 'center', marginBottom: 4 },
  deleteActionBtn: { backgroundColor: colors.error, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, height: '100%', justifyContent: 'center' },
  deleteActionText: { color: '#fff', fontWeight: '700', fontSize: typography.sm },
  addFoodBtn: { paddingVertical: spacing.sm, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  addFoodBtnText: { color: colors.brand.primary, fontSize: typography.sm, fontWeight: '600' },
  groceryBtn: { backgroundColor: colors.bg.secondary, borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  groceryBtnText: { color: colors.text.primary, fontSize: typography.base, fontWeight: '600' },
  templateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  templateHeaderText: { color: colors.text.secondary, fontSize: typography.base, fontWeight: '700' },
  templateChevron: { color: colors.text.muted },
  templateBody: { gap: spacing.sm },
  saveTemplateBtn: { backgroundColor: colors.bg.elevated, borderRadius: 10, paddingVertical: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  saveTemplateBtnText: { color: colors.brand.primary, fontSize: typography.sm, fontWeight: '600' },
  noTemplatesText: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center', paddingVertical: spacing.sm },
  templateRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.secondary, borderRadius: 10, padding: spacing.md, justifyContent: 'space-between' },
  templateRowLeft: { flex: 1 },
  templateName: { color: colors.text.primary, fontSize: typography.sm, fontWeight: '600' },
  templateDate: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  loadBtn: { backgroundColor: colors.brand.primary, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: 6 },
  loadBtnText: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: spacing.md, gap: spacing.sm, backgroundColor: colors.bg.primary, borderTopWidth: 1, borderTopColor: colors.border },
  bottomBtn: { flex: 1, backgroundColor: colors.brand.primary, borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center' },
  bottomBtnSecondary: { backgroundColor: colors.bg.elevated, borderWidth: 1, borderColor: colors.border },
  bottomBtnOff: { opacity: 0.5 },
  bottomBtnText: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  modalCard: { backgroundColor: colors.bg.elevated, borderRadius: 16, padding: spacing.lg, width: '100%', gap: spacing.md },
  modalTitle: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700' },
  modalInput: { backgroundColor: colors.bg.secondary, borderRadius: 10, borderWidth: 1, borderColor: colors.border, color: colors.text.primary, fontSize: typography.base, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  modalButtons: { flexDirection: 'row', gap: spacing.sm },
  modalCancel: { flex: 1, borderRadius: 10, paddingVertical: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  modalCancelText: { color: colors.text.secondary, fontSize: typography.base },
  modalSave: { flex: 1, backgroundColor: colors.brand.primary, borderRadius: 10, paddingVertical: spacing.sm, alignItems: 'center' },
  modalSaveText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
  slotHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  aiSuggestBtn: {
    backgroundColor: colors.bg.elevated, borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 4, borderWidth: 1, borderColor: colors.brand.primary,
  },
  aiSuggestBtnText: { color: colors.brand.primary, fontSize: typography.xs, fontWeight: '700' },
  bottomBtnAI: { flex: 0, width: 60, backgroundColor: '#1E1E4E', borderWidth: 1, borderColor: colors.brand.primary },
  overlayFull: {
    flex: 1, backgroundColor: '#000000CC', justifyContent: 'center',
    alignItems: 'center', padding: spacing.xl,
  },
  overlayMoon: { fontSize: 64 },
  overlayTitle: { color: colors.text.primary, fontSize: typography.xl, fontWeight: '700', textAlign: 'center', marginTop: spacing.md },
  overlaySub: { color: colors.text.muted, fontSize: typography.sm, marginTop: spacing.sm, textAlign: 'center' },
  aiLoadingText: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center' },
  aiResultName: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700', marginBottom: 4 },
  aiResultDesc: { color: colors.text.muted, fontSize: typography.sm, marginBottom: spacing.sm },
  aiResultMacros: { color: colors.brand.secondary, fontSize: typography.sm, fontWeight: '600', marginBottom: spacing.sm },
});
