import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Pressable, TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { colors, typography, spacing } from '../../../constants/theme';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const TOTAL_STEPS = 7;

// ---------- Step sub-components ----------

function StepDisplayName({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View>
      <Text style={styles.stepEmoji}>👋</Text>
      <Text style={styles.stepTitle}>What should we call you?</Text>
      <Text style={styles.stepBody}>This is the name Coach Mayari will use.</Text>
      <Input
        label="Display Name"
        value={value}
        onChangeText={onChange}
        placeholder="e.g. Juan dela Cruz"
        autoFocus
      />
    </View>
  );
}

function StepBirthdate({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [day, setDay] = useState(value ? value.split('-')[2] : '');
  const [month, setMonth] = useState(value ? value.split('-')[1] : '');
  const [year, setYear] = useState(value ? value.split('-')[0] : '');
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  function update(d: string, m: string, y: string) {
    if (d && m && y && d.length <= 2 && m.length <= 2 && y.length === 4) {
      onChange(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    }
  }

  return (
    <View>
      <Text style={styles.stepEmoji}>🎂</Text>
      <Text style={styles.stepTitle}>When were you born?</Text>
      <Text style={styles.stepBody}>We use this to personalize your fitness plan. You must be 18+.</Text>
      <View style={styles.row}>
        <Input
          label="Day"
          value={day}
          onChangeText={(v) => {
            setDay(v);
            update(v, month, year);
            if (v.length === 2) monthRef.current?.focus();
          }}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="DD"
          style={styles.flex1}
        />
        <Input
          ref={monthRef}
          label="Month"
          value={month}
          onChangeText={(v) => {
            setMonth(v);
            update(day, v, year);
            if (v.length === 2) yearRef.current?.focus();
          }}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="MM"
          style={styles.flex1}
        />
        <Input
          ref={yearRef}
          label="Year"
          value={year}
          onChangeText={(v) => { setYear(v); update(day, month, v); }}
          keyboardType="number-pad"
          maxLength={4}
          placeholder="YYYY"
          style={[styles.flex1, { flex: 1.5 }]}
        />
      </View>
    </View>
  );
}

function StepBodyStats({
  weight, height,
  onWeightChange, onHeightChange,
}: {
  weight: string; height: string;
  onWeightChange: (v: string) => void;
  onHeightChange: (v: string) => void;
}) {
  return (
    <View>
      <Text style={styles.stepEmoji}>⚖️</Text>
      <Text style={styles.stepTitle}>Body Stats</Text>
      <Text style={styles.stepBody}>Used to calculate your calorie targets and workout intensity.</Text>
      <Input
        label="Current Weight (kg)"
        value={weight}
        onChangeText={onWeightChange}
        keyboardType="decimal-pad"
        placeholder="e.g. 70"
      />
      <Input
        label="Height (cm)"
        value={height}
        onChangeText={onHeightChange}
        keyboardType="decimal-pad"
        placeholder="e.g. 170"
      />
    </View>
  );
}

type GoalOption = { key: string; emoji: string; label: string; sub: string };
const GOALS: GoalOption[] = [
  { key: 'build_muscle', emoji: '💪', label: 'Build Muscle', sub: 'Gain strength and size' },
  { key: 'lose_fat', emoji: '🔥', label: 'Lose Fat', sub: 'Cut weight, keep muscle' },
  { key: 'maintain', emoji: '⚖️', label: 'Maintain', sub: 'Stay at current weight' },
  { key: 'improve_fitness', emoji: '🏃', label: 'Improve Fitness', sub: 'Endurance and health' },
];

function StepGoal({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View>
      <Text style={styles.stepEmoji}>🎯</Text>
      <Text style={styles.stepTitle}>What's your primary goal?</Text>
      <Text style={styles.stepBody}>This determines your workout plan and calorie targets.</Text>
      <View style={styles.optionGrid}>
        {GOALS.map((g) => (
          <Pressable
            key={g.key}
            onPress={() => onChange(g.key)}
            style={[styles.optionCard, value === g.key && styles.optionCardSelected]}
          >
            <Text style={styles.optionEmoji}>{g.emoji}</Text>
            <Text style={[styles.optionLabel, value === g.key && styles.optionLabelSelected]}>{g.label}</Text>
            <Text style={styles.optionSub}>{g.sub}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

type ExpOption = { key: string; emoji: string; label: string; sub: string };
const EXPERIENCE: ExpOption[] = [
  { key: 'beginner', emoji: '🌱', label: 'Beginner', sub: 'Less than 1 year' },
  { key: 'intermediate', emoji: '💪', label: 'Intermediate', sub: '1–3 years' },
  { key: 'advanced', emoji: '🏆', label: 'Advanced', sub: '3+ years' },
];

function StepExperience({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View>
      <Text style={styles.stepEmoji}>🧠</Text>
      <Text style={styles.stepTitle}>Your experience level?</Text>
      <Text style={styles.stepBody}>We adjust sets, reps, and complexity based on your level.</Text>
      <View style={styles.optionList}>
        {EXPERIENCE.map((e) => (
          <Pressable
            key={e.key}
            onPress={() => onChange(e.key)}
            style={[styles.listCard, value === e.key && styles.listCardSelected]}
          >
            <Text style={styles.listEmoji}>{e.emoji}</Text>
            <View style={styles.flex1}>
              <Text style={[styles.listLabel, value === e.key && styles.optionLabelSelected]}>{e.label}</Text>
              <Text style={styles.optionSub}>{e.sub}</Text>
            </View>
            {value === e.key && <Text style={styles.checkmark}>✓</Text>}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function StepWorkoutDays({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  function toggle(dayIndex: number) {
    onChange(
      value.includes(dayIndex)
        ? value.filter((d) => d !== dayIndex)
        : [...value, dayIndex].sort()
    );
  }

  return (
    <View>
      <Text style={styles.stepEmoji}>📅</Text>
      <Text style={styles.stepTitle}>Which days can you work out?</Text>
      <Text style={styles.stepBody}>Pick at least 2 days. Your plan will be built around these.</Text>
      <View style={styles.daysGrid}>
        {DAYS.map((day, index) => {
          const selected = value.includes(index + 1);
          return (
            <Pressable
              key={day}
              onPress={() => toggle(index + 1)}
              style={[styles.dayChip, selected && styles.dayChipSelected]}
            >
              <Text style={[styles.dayLabel, selected && styles.dayLabelSelected]}>{day}</Text>
            </Pressable>
          );
        })}
      </View>
      {value.length > 0 && (
        <Text style={styles.dayCount}>{value.length} day{value.length !== 1 ? 's' : ''} selected</Text>
      )}
    </View>
  );
}

type EquipOption = { key: string; emoji: string; label: string; sub: string };
const EQUIPMENT: EquipOption[] = [
  { key: 'full_gym', emoji: '🏋️', label: 'Full Gym', sub: 'All machines & free weights' },
  { key: 'dumbbells', emoji: '🏷️', label: 'Dumbbells', sub: 'Dumbbells only' },
  { key: 'barbell', emoji: '🔩', label: 'Barbell', sub: 'Barbell & plates' },
  { key: 'bodyweight', emoji: '🙆', label: 'Bodyweight Only', sub: 'No equipment needed' },
];

function StepEquipment({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View>
      <Text style={styles.stepEmoji}>🏋️</Text>
      <Text style={styles.stepTitle}>What equipment do you have?</Text>
      <Text style={styles.stepBody}>Coach Mayari will only suggest exercises you can actually do.</Text>
      <View style={styles.optionGrid}>
        {EQUIPMENT.map((eq) => (
          <Pressable
            key={eq.key}
            onPress={() => onChange(eq.key)}
            style={[styles.optionCard, value === eq.key && styles.optionCardSelected]}
          >
            <Text style={styles.optionEmoji}>{eq.emoji}</Text>
            <Text style={[styles.optionLabel, value === eq.key && styles.optionLabelSelected]}>{eq.label}</Text>
            <Text style={styles.optionSub}>{eq.sub}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ---------- Main component ----------

export default function OnboardingStep() {
  const router = useRouter();
  const { step } = useLocalSearchParams<{ step: string }>();
  const [currentStep, setCurrentStep] = useState(parseInt(step ?? '1', 10));
  const { session, fetchProfile } = useAuthStore();

  const [displayName, setDisplayName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [goal, setGoal] = useState('');
  const [experience, setExperience] = useState('');
  const [workoutDays, setWorkoutDays] = useState<number[]>([]);
  const [equipment, setEquipment] = useState('');
  const [saving, setSaving] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  useEffect(() => { setStepError(null); }, [currentStep]);

  function validateStep(): string | null {
    switch (currentStep) {
      case 1: return displayName.trim() ? null : 'Please enter your display name';
      case 2: {
        if (!birthdate) return 'Please enter your birthdate';
        const age = (Date.now() - new Date(birthdate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        if (age < 18) return 'Kailangan mo munang maging 18 taong gulang para gamitin ang Mayari 🙏';
        return null;
      }
      case 3: {
        if (!weight.trim() || isNaN(parseFloat(weight))) return 'Please enter your weight';
        if (!height.trim() || isNaN(parseFloat(height))) return 'Please enter your height';
        return null;
      }
      case 4: return goal ? null : 'Please select a goal';
      case 5: return experience ? null : 'Please select your experience level';
      case 6: return workoutDays.length >= 2 ? null : 'Please select at least 2 workout days';
      case 7: return equipment ? null : 'Please select your equipment';
      default: return null;
    }
  }

  async function saveProfile(equipmentOverride?: string) {
    const userId = session?.user?.id;
    if (!userId) return;
    setSaving(true);
    try {
      const username =
        displayName.trim().toLowerCase().replace(/\s+/g, '_') +
        '_' +
        Math.floor(Math.random() * 1000);
      const { error } = await supabase.from('users').upsert(
        {
          id: userId,
          display_name: displayName.trim(),
          username,
          birthdate,
          body_weight_kg: parseFloat(weight),
          height_cm: parseFloat(height),
          primary_goal: goal,
          experience_level: experience,
          workout_days: workoutDays,
          equipment_type: equipmentOverride ?? equipment,
          session_duration_min: 60,
        },
        { onConflict: 'id' }
      );
      if (error) { setStepError(error.message); return; }
      await fetchProfile(userId);
      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  }

  async function handleNext() {
    setStepError(null);
    const err = validateStep();
    if (err) { setStepError(err); return; }

    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
      return;
    }

    await saveProfile();
  }

  function handleBack() {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  }

  async function handleSkip() {
    if (currentStep !== TOTAL_STEPS || saving) return;
    setStepError(null);
    await saveProfile('bodyweight');
  }

  function renderStep() {
    switch (currentStep) {
      case 1: return <StepDisplayName value={displayName} onChange={setDisplayName} />;
      case 2: return <StepBirthdate value={birthdate} onChange={setBirthdate} />;
      case 3: return <StepBodyStats weight={weight} height={height} onWeightChange={setWeight} onHeightChange={setHeight} />;
      case 4: return <StepGoal value={goal} onChange={setGoal} />;
      case 5: return <StepExperience value={experience} onChange={setExperience} />;
      case 6: return <StepWorkoutDays value={workoutDays} onChange={setWorkoutDays} />;
      case 7: return <StepEquipment value={equipment} onChange={setEquipment} />;
      default: return null;
    }
  }

  const progress = (currentStep / TOTAL_STEPS) * 100;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Progress */}
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>Step {currentStep} of {TOTAL_STEPS}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* Step content */}
      <View style={styles.stepContent}>{renderStep()}</View>

      {stepError !== null && (
        <Text style={styles.stepError}>{stepError}</Text>
      )}

      {/* Navigation */}
      <View style={styles.nav}>
        {currentStep > 1 && (
          <Button
            label="← Back"
            variant="outline"
            onPress={handleBack}
            style={styles.backBtn}
          />
        )}
        {currentStep === TOTAL_STEPS && (
          <Button
            label="Skip →"
            variant="outline"
            onPress={handleSkip}
            loading={saving}
            style={styles.skipBtn}
          />
        )}
        <Button
          label={currentStep === TOTAL_STEPS ? 'Get Started! 💪' : 'Next →'}
          onPress={handleNext}
          loading={saving}
          style={currentStep === 1 ? styles.fullWidth : styles.nextBtn}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
  progressHeader: {
    marginBottom: spacing.xl,
  },
  progressLabel: {
    color: colors.text.muted,
    fontSize: typography.sm,
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.bg.elevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brand.primary,
    borderRadius: 2,
  },
  stepContent: { flex: 1, marginBottom: spacing.xl },
  stepEmoji: { fontSize: 56, textAlign: 'center', marginBottom: spacing.md },
  stepTitle: {
    color: colors.text.primary,
    fontSize: typography['2xl'],
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  stepBody: {
    color: colors.text.secondary,
    fontSize: typography.sm,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex1: { flex: 1 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  optionCardSelected: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.bg.elevated,
  },
  optionEmoji: { fontSize: 28, marginBottom: spacing.xs },
  optionLabel: {
    color: colors.text.secondary,
    fontSize: typography.sm,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  optionLabelSelected: { color: colors.brand.primary },
  optionSub: {
    color: colors.text.muted,
    fontSize: typography.xs,
    textAlign: 'center',
  },
  optionList: { gap: spacing.sm },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing.md,
  },
  listCardSelected: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.bg.elevated,
  },
  listEmoji: { fontSize: 28 },
  listLabel: {
    color: colors.text.secondary,
    fontSize: typography.base,
    fontWeight: '600',
  },
  checkmark: { color: colors.brand.primary, fontSize: typography.lg, fontWeight: 'bold' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  dayChip: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipSelected: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  dayLabel: {
    color: colors.text.secondary,
    fontSize: typography.xs,
    fontWeight: '600',
  },
  dayLabelSelected: { color: colors.text.primary },
  dayCount: {
    color: colors.text.muted,
    fontSize: typography.sm,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  nav: { flexDirection: 'row', gap: spacing.sm, marginTop: 'auto' },
  backBtn: { flex: 1 },
  nextBtn: { flex: 2 },
  fullWidth: { flex: 1 },
  stepError: {
    color: colors.error,
    fontSize: typography.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  skipBtn: { flex: 1 },
});
