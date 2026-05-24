import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Pressable, TextInput, Modal, Image, BackHandler, Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { computeAllTargets } from '../../../lib/calories';
import type { CalorieTargets } from '../../../lib/calories';
import { colors, typography, spacing } from '../../../constants/theme';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import type { Gender, ActivityLevel, PrimaryGoal, ExperienceLevel, EquipmentType } from '../../../types/database';

const TOTAL_STEPS = 8;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ErrorChip({ message }: { message: string }) {
  return (
    <View style={styles.errorChip}>
      <Text style={styles.errorChipText}>⚠ {message}</Text>
    </View>
  );
}

function UnitBadge({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.unitBadge} hitSlop={8}>
      <Text style={styles.unitBadgeText}>{label} ↕</Text>
    </Pressable>
  );
}

// ─── Body Fat Reference Modal ─────────────────────────────────────────────────

const BF_IMAGES = {
  male: require('../../../assets/BodyFatPercentageReference_Male.png'),
  female: require('../../../assets/BodyFatPercentageReference_Female.png'),
};

function BodyFatReferenceModal({
  visible,
  defaultGender,
  onClose,
}: {
  visible: boolean;
  defaultGender: Gender | '';
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'male' | 'female'>(
    defaultGender === 'female' ? 'female' : 'male',
  );
  const [loaded, setLoaded] = useState(false);

  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setTab(defaultGender === 'female' ? 'female' : 'male');
      setLoaded(false);
      fadeAnim.setValue(0);
    }
  }, [visible, defaultGender, fadeAnim]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    ).start();
  }, [shimmerAnim]);

  const shimmerBg = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#1A1A3E', '#2A2A5E'],
  });

  function handleImageLoad() {
    setLoaded(true);
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }

  const image = BF_IMAGES[tab];
  const IMAGE_WIDTH = '100%';
  const IMAGE_HEIGHT = 400;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalDragHandle} />
          <Text style={styles.modalTitle}>Body Fat Reference</Text>
          <Text style={styles.modalSub}>
            {tab === 'male' ? 'Male: 8% – 40%' : 'Female: 12% – 45%'}
          </Text>

          <View style={styles.modalToggleRow}>
            <Pressable
              onPress={() => setTab('male')}
              style={[styles.modalTab, tab === 'male' && styles.modalTabActive]}
            >
              <Text style={[styles.modalTabText, tab === 'male' && styles.modalTabTextActive]}>♂ Male</Text>
            </Pressable>
            <Pressable
              onPress={() => setTab('female')}
              style={[styles.modalTab, tab === 'female' && styles.modalTabActive]}
            >
              <Text style={[styles.modalTabText, tab === 'female' && styles.modalTabTextActive]}>♀ Female</Text>
            </Pressable>
          </View>

          <View style={styles.modalImageScroll}>
            <View style={{ position: 'relative', width: IMAGE_WIDTH, height: IMAGE_HEIGHT }}>
              {!loaded && (
                <Animated.View
                  style={{
                    width: '100%',
                    height: IMAGE_HEIGHT,
                    backgroundColor: shimmerBg,
                    borderRadius: 8,
                    position: 'absolute',
                  }}
                />
              )}
              <Animated.Image
                source={image}
                style={{ width: '100%', height: IMAGE_HEIGHT, opacity: fadeAnim }}
                onLoad={handleImageLoad}
                resizeMode="contain"
              />
            </View>
          </View>

          <Button label="Close" onPress={onClose} variant="outline" style={styles.modalCloseBtn} />
        </View>
      </View>
    </Modal>
  );
}

// ─── Step 1: Identity ─────────────────────────────────────────────────────────

const GENDER_OPTIONS: { key: Gender; emoji: string; label: string }[] = [
  { key: 'male', emoji: '♂️', label: 'Male' },
  { key: 'female', emoji: '♀️', label: 'Female' },
  { key: 'prefer_not_to_say', emoji: '🤐', label: 'Prefer not to say' },
];

function StepIdentity({
  name, gender,
  onNameChange, onGenderChange,
}: {
  name: string; gender: Gender | '';
  onNameChange: (v: string) => void; onGenderChange: (v: Gender) => void;
}) {
  return (
    <View>
      <Text style={styles.stepEmoji}>👋</Text>
      <Text style={styles.stepTitle}>Let's get to know you</Text>
      <Text style={styles.stepBody}>Your profile helps Coach Mayari personalize everything.</Text>
      <Input
        label="Display Name"
        value={name}
        onChangeText={onNameChange}
        placeholder="e.g. Juan dela Cruz"
        autoFocus
        maxLength={50}
      />
      <Text style={styles.fieldHelper}>This is what Coach Mayari will call you.</Text>
      <Text style={styles.fieldLabel}>GENDER</Text>
      <View style={styles.optionList}>
        {GENDER_OPTIONS.map((g) => (
          <Pressable
            key={g.key}
            onPress={() => onGenderChange(g.key)}
            style={[styles.listCard, gender === g.key && styles.listCardSelected]}
          >
            <Text style={styles.listEmoji}>{g.emoji}</Text>
            <View style={styles.flex1}>
              <Text style={[styles.listLabel, gender === g.key && styles.listLabelSelected]}>{g.label}</Text>
            </View>
            {gender === g.key && <Text style={styles.checkmark}>✓</Text>}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Step 2: Birthday ─────────────────────────────────────────────────────────

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
          label="Day" value={day}
          onChangeText={(v) => { setDay(v); update(v, month, year); if (v.length === 2) monthRef.current?.focus(); }}
          keyboardType="number-pad" maxLength={2} placeholder="DD" style={styles.flex1}
        />
        <Input
          ref={monthRef} label="Month" value={month}
          onChangeText={(v) => { setMonth(v); update(day, v, year); if (v.length === 2) yearRef.current?.focus(); }}
          keyboardType="number-pad" maxLength={2} placeholder="MM" style={styles.flex1}
        />
        <Input
          ref={yearRef} label="Year" value={year}
          onChangeText={(v) => { setYear(v); update(day, month, v); }}
          keyboardType="number-pad" maxLength={4} placeholder="YYYY" style={[styles.flex1, { flex: 1.5 }]}
        />
      </View>
      <Text style={styles.fieldHelper}>Format: DD / MM / YYYY — e.g. 15 / 06 / 1998</Text>
    </View>
  );
}

// ─── Step 3: Body Stats ───────────────────────────────────────────────────────

function StepBodyStats({
  weight, weightUnit, heightCm, heightFt, heightIn, heightUnit,
  onWeightChange, onWeightUnitToggle,
  onHeightCmChange, onHeightFtChange, onHeightInChange, onHeightUnitToggle,
  weightError, heightError,
}: {
  weight: string; weightUnit: 'kg' | 'lbs';
  heightCm: string; heightFt: string; heightIn: string; heightUnit: 'cm' | 'ft';
  onWeightChange: (v: string) => void; onWeightUnitToggle: () => void;
  onHeightCmChange: (v: string) => void; onHeightFtChange: (v: string) => void;
  onHeightInChange: (v: string) => void; onHeightUnitToggle: () => void;
  weightError: string | null; heightError: string | null;
}) {
  return (
    <View>
      <Text style={styles.stepEmoji}>⚖️</Text>
      <Text style={styles.stepTitle}>Body Stats</Text>
      <Text style={styles.stepBody}>Used to calculate your calorie targets and workout intensity.</Text>

      {/* Weight */}
      <Text style={styles.fieldLabel}>WEIGHT</Text>
      <View style={[styles.unitInputRow, weightError && styles.unitInputRowError]}>
        <TextInput
          style={styles.unitInput}
          value={weight}
          onChangeText={onWeightChange}
          keyboardType="decimal-pad"
          placeholder={weightUnit === 'kg' ? 'e.g. 70' : 'e.g. 154'}
          placeholderTextColor={colors.text.muted}
        />
        <UnitBadge label={weightUnit} onPress={onWeightUnitToggle} />
      </View>
      <Text style={styles.fieldHelper}>Tap {weightUnit} to switch to {weightUnit === 'kg' ? 'lbs' : 'kg'}</Text>
      {weightError && <ErrorChip message={weightError} />}

      {/* Height */}
      <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>HEIGHT</Text>
      {heightUnit === 'cm' ? (
        <View style={[styles.unitInputRow, heightError && styles.unitInputRowError]}>
          <TextInput
            style={styles.unitInput}
            value={heightCm}
            onChangeText={onHeightCmChange}
            keyboardType="decimal-pad"
            placeholder="e.g. 170"
            placeholderTextColor={colors.text.muted}
          />
          <UnitBadge label="cm" onPress={onHeightUnitToggle} />
        </View>
      ) : (
        <View style={styles.row}>
          <View style={[styles.unitInputRow, styles.flex1, heightError && styles.unitInputRowError]}>
            <TextInput
              style={styles.unitInput}
              value={heightFt}
              onChangeText={onHeightFtChange}
              keyboardType="number-pad"
              placeholder="5"
              placeholderTextColor={colors.text.muted}
            />
            <UnitBadge label="ft" onPress={onHeightUnitToggle} />
          </View>
          <View style={[styles.unitInputRow, styles.flex1, heightError && styles.unitInputRowError]}>
            <TextInput
              style={styles.unitInput}
              value={heightIn}
              onChangeText={onHeightInChange}
              keyboardType="number-pad"
              placeholder="10"
              placeholderTextColor={colors.text.muted}
            />
            <View style={styles.unitBadgeStatic}>
              <Text style={styles.unitBadgeText}>in</Text>
            </View>
          </View>
        </View>
      )}
      <Text style={styles.fieldHelper}>Tap {heightUnit} to switch to {heightUnit === 'cm' ? 'ft/in' : 'cm'}</Text>
      {heightError && <ErrorChip message={heightError} />}
    </View>
  );
}

// ─── Step 4: Body Fat % ───────────────────────────────────────────────────────

function StepBodyFat({
  value, gender, onChange, modalVisible, onOpenModal, onCloseModal,
}: {
  value: string; gender: Gender | '';
  onChange: (v: string) => void;
  modalVisible: boolean; onOpenModal: () => void; onCloseModal: () => void;
}) {
  return (
    <View>
      <Text style={styles.stepEmoji}>📊</Text>
      <Text style={styles.stepTitle}>Body Fat %</Text>
      <Text style={styles.stepBody}>
        Knowing your body fat lets us use a more accurate calorie formula. Skip if unsure — you can add it later.
      </Text>

      <Text style={styles.fieldLabel}>BODY FAT PERCENTAGE</Text>
      <View style={styles.unitInputRow}>
        <TextInput
          style={styles.unitInput}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder="e.g. 18"
          placeholderTextColor={colors.text.muted}
        />
        <View style={styles.unitBadgeStatic}>
          <Text style={styles.unitBadgeText}>%</Text>
        </View>
      </View>
      <Text style={styles.fieldHelper}>Enter a number between 3–60</Text>

      <TouchableOpacity onPress={onOpenModal} style={styles.bfReferenceCard} activeOpacity={0.7}>
        <Text style={styles.bfReferenceIcon}>🖼️</Text>
        <View style={styles.flex1}>
          <Text style={styles.bfReferenceTitle}>Don't know your body fat?</Text>
          <Text style={styles.bfReferenceSub}>Tap to see visual reference examples</Text>
        </View>
        <Text style={styles.bfReferenceArrow}>→</Text>
      </TouchableOpacity>

      <BodyFatReferenceModal
        visible={modalVisible}
        defaultGender={gender}
        onClose={onCloseModal}
      />
    </View>
  );
}

// ─── Step 5: Goal ─────────────────────────────────────────────────────────────

const GOALS: { key: PrimaryGoal; emoji: string; label: string; sub: string }[] = [
  { key: 'lose_fat', emoji: '🔥', label: 'Lose Fat', sub: '~500 kcal deficit · keep muscle' },
  { key: 'build_muscle', emoji: '💪', label: 'Build Muscle', sub: '~250 kcal surplus · lean bulk' },
  { key: 'maintain', emoji: '⚖️', label: 'Maintain', sub: 'Eat at TDEE · body recomp' },
  { key: 'improve_fitness', emoji: '🏃', label: 'Improve Fitness', sub: 'Endurance & overall health' },
];

function StepGoal({ value, onChange }: { value: PrimaryGoal | ''; onChange: (v: PrimaryGoal) => void }) {
  return (
    <View>
      <Text style={styles.stepEmoji}>🎯</Text>
      <Text style={styles.stepTitle}>What's your primary goal?</Text>
      <Text style={styles.stepBody}>This sets your calorie target — deficit, surplus, or maintenance.</Text>
      <View style={styles.optionList}>
        {GOALS.map((g) => (
          <Pressable
            key={g.key}
            onPress={() => onChange(g.key)}
            style={[styles.listCard, value === g.key && styles.listCardSelected]}
          >
            <Text style={styles.listEmoji}>{g.emoji}</Text>
            <View style={styles.flex1}>
              <Text style={[styles.listLabel, value === g.key && styles.listLabelSelected]}>{g.label}</Text>
              <Text style={styles.listSub}>{g.sub}</Text>
            </View>
            {value === g.key && <Text style={styles.checkmark}>✓</Text>}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Step 6: Activity Level ───────────────────────────────────────────────────

const ACTIVITY_LEVELS: { key: ActivityLevel; emoji: string; label: string; sub: string; pal: string }[] = [
  { key: 'sedentary', emoji: '🛋️', label: 'Sedentary', sub: 'Desk job · little or no exercise', pal: '×1.2' },
  { key: 'lightly_active', emoji: '🚶', label: 'Lightly Active', sub: 'Light exercise 1–3 days/week', pal: '×1.375' },
  { key: 'moderately_active', emoji: '🏋️', label: 'Moderately Active', sub: 'Moderate exercise 3–5 days/week', pal: '×1.55' },
  { key: 'very_active', emoji: '⚡', label: 'Very Active', sub: 'Hard exercise 6–7 days/week', pal: '×1.725' },
  { key: 'extremely_active', emoji: '🔥', label: 'Extremely Active', sub: 'Hard training + physical job', pal: '×1.9' },
];

function StepActivityLevel({
  value, onChange,
}: { value: ActivityLevel | ''; onChange: (v: ActivityLevel) => void }) {
  return (
    <View>
      <Text style={styles.stepEmoji}>🏃</Text>
      <Text style={styles.stepTitle}>How active are you?</Text>
      <Text style={styles.stepBody}>Outside of planned workouts — your daily lifestyle.</Text>
      <View style={styles.optionList}>
        {ACTIVITY_LEVELS.map((a) => (
          <Pressable
            key={a.key}
            onPress={() => onChange(a.key)}
            style={[styles.listCard, value === a.key && styles.listCardSelected]}
          >
            <Text style={styles.listEmoji}>{a.emoji}</Text>
            <View style={styles.flex1}>
              <Text style={[styles.listLabel, value === a.key && styles.listLabelSelected]}>{a.label}</Text>
              <Text style={styles.listSub}>{a.sub}</Text>
            </View>
            <Text style={[styles.palBadge, value === a.key && styles.palBadgeSelected]}>{a.pal}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Step 7: Training Setup ───────────────────────────────────────────────────

const EXPERIENCE: { key: ExperienceLevel; emoji: string; label: string; sub: string }[] = [
  { key: 'beginner', emoji: '🌱', label: 'Beginner', sub: 'Less than 1 year' },
  { key: 'intermediate', emoji: '💪', label: 'Intermediate', sub: '1–3 years' },
  { key: 'advanced', emoji: '🏆', label: 'Advanced', sub: '3+ years' },
];

const EQUIPMENT: { key: EquipmentType; emoji: string; label: string; sub: string }[] = [
  { key: 'full_gym', emoji: '🏋️', label: 'Full Gym', sub: 'All machines & free weights' },
  { key: 'dumbbells', emoji: '🏷️', label: 'Dumbbells', sub: 'Dumbbells only' },
  { key: 'barbell', emoji: '🔩', label: 'Barbell', sub: 'Barbell & plates' },
  { key: 'bodyweight', emoji: '🙆', label: 'Bodyweight Only', sub: 'No equipment needed' },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function StepTrainingSetup({
  experience, workoutDays, equipment,
  onExperienceChange, onWorkoutDaysChange, onEquipmentChange,
}: {
  experience: ExperienceLevel | ''; workoutDays: number[]; equipment: EquipmentType | '';
  onExperienceChange: (v: ExperienceLevel) => void;
  onWorkoutDaysChange: (v: number[]) => void;
  onEquipmentChange: (v: EquipmentType) => void;
}) {
  function toggleDay(idx: number) {
    onWorkoutDaysChange(
      workoutDays.includes(idx)
        ? workoutDays.filter((d) => d !== idx)
        : [...workoutDays, idx].sort(),
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.stepEmoji}>🏋️</Text>
      <Text style={styles.stepTitle}>Training Setup</Text>
      <Text style={styles.stepBody}>Last step before your results!</Text>

      <Text style={styles.fieldLabel}>EXPERIENCE LEVEL</Text>
      <View style={[styles.optionList, { marginBottom: spacing.lg }]}>
        {EXPERIENCE.map((e) => (
          <Pressable
            key={e.key}
            onPress={() => onExperienceChange(e.key)}
            style={[styles.listCard, experience === e.key && styles.listCardSelected]}
          >
            <Text style={styles.listEmoji}>{e.emoji}</Text>
            <View style={styles.flex1}>
              <Text style={[styles.listLabel, experience === e.key && styles.listLabelSelected]}>{e.label}</Text>
              <Text style={styles.listSub}>{e.sub}</Text>
            </View>
            {experience === e.key && <Text style={styles.checkmark}>✓</Text>}
          </Pressable>
        ))}
      </View>

      <Text style={styles.fieldLabel}>WORKOUT DAYS</Text>
      <View style={styles.daysGrid}>
        {DAYS.map((day, i) => {
          const selected = workoutDays.includes(i + 1);
          return (
            <Pressable
              key={day}
              onPress={() => toggleDay(i + 1)}
              style={[styles.dayChip, selected && styles.dayChipSelected]}
            >
              <Text style={[styles.dayLabel, selected && styles.dayLabelSelected]}>{day}</Text>
            </Pressable>
          );
        })}
      </View>
      {workoutDays.length > 0 && (
        <Text style={styles.dayCount}>{workoutDays.length} day{workoutDays.length !== 1 ? 's' : ''} selected</Text>
      )}

      <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>EQUIPMENT</Text>
      <View style={[styles.optionGrid, { marginBottom: spacing.xl }]}>
        {EQUIPMENT.map((eq) => (
          <Pressable
            key={eq.key}
            onPress={() => onEquipmentChange(eq.key)}
            style={[styles.optionCard, equipment === eq.key && styles.optionCardSelected]}
          >
            <Text style={styles.optionEmoji}>{eq.emoji}</Text>
            <Text style={[styles.optionLabel, equipment === eq.key && styles.optionLabelSelected]}>{eq.label}</Text>
            <Text style={styles.optionSub}>{eq.sub}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Step 8: Results ──────────────────────────────────────────────────────────

const GOAL_LABELS: Record<string, string> = {
  lose_fat: 'Lose Fat',
  build_muscle: 'Build Muscle',
  maintain: 'Maintain',
  improve_fitness: 'Improve Fitness',
};

const GOAL_ADJUSTMENTS: Record<string, string> = {
  lose_fat: '−500 deficit',
  build_muscle: '+250 surplus',
  maintain: 'at TDEE',
  improve_fitness: '−100 kcal',
};

const PAL_LABELS: Record<string, string> = {
  sedentary: '×1.2',
  lightly_active: '×1.375',
  moderately_active: '×1.55',
  very_active: '×1.725',
  extremely_active: '×1.9',
};

function StepResults({
  targets, displayName, goal, activityLevel, bodyWeightKg, saving, onConfirm,
}: {
  targets: CalorieTargets;
  displayName: string;
  goal: string;
  activityLevel: string;
  bodyWeightKg: number;
  saving: boolean;
  onConfirm: () => void;
}) {
  const proteinPerLb = (targets.protein_g / (bodyWeightKg * 2.20462)).toFixed(2);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.resultsHero}>
        <Text style={styles.resultsEmoji}>🌙</Text>
        <Text style={styles.resultsTaglish}>HANDA KA NA, {displayName.toUpperCase()}!</Text>
        <Text style={styles.resultsTitle}>Your plan is ready</Text>
        <Text style={styles.resultsSubtitle}>Based on your profile · adjustable anytime</Text>
      </View>

      {/* Main calorie card */}
      <View style={styles.calorieCard}>
        <Text style={styles.calorieCardLabel}>DAILY CALORIE TARGET</Text>
        <Text style={styles.calorieNumber}>{targets.calorie_target.toLocaleString()}</Text>
        <Text style={styles.calorieUnit}>kcal / day</Text>
        <View style={styles.calorieBreakdown}>
          <Text style={styles.calorieBreakdownText}>
            TDEE {targets.tdee.toLocaleString()} kcal · {GOAL_LABELS[goal]} · {GOAL_ADJUSTMENTS[goal]}
          </Text>
          <Text style={styles.calorieBreakdownText}>
            BMR: {targets.bmr.toLocaleString()} kcal · {PAL_LABELS[activityLevel] ?? ''} activity
          </Text>
        </View>
      </View>

      {/* Macros */}
      <View style={styles.macrosRow}>
        <View style={[styles.macroCard, { borderColor: colors.brand.primary }]}>
          <Text style={[styles.macroValue, { color: colors.brand.primary }]}>{targets.protein_g}g</Text>
          <Text style={styles.macroLabel}>Protein</Text>
          <Text style={styles.macroNote}>~{proteinPerLb}g/lb</Text>
        </View>
        <View style={[styles.macroCard, { borderColor: colors.brand.secondary }]}>
          <Text style={[styles.macroValue, { color: colors.brand.secondary }]}>{targets.carbs_g}g</Text>
          <Text style={styles.macroLabel}>Carbs</Text>
          <Text style={styles.macroNote}>~{Math.round(targets.carbs_g * 4 / targets.calorie_target * 100)}% cals</Text>
        </View>
        <View style={[styles.macroCard, { borderColor: colors.brand.accent }]}>
          <Text style={[styles.macroValue, { color: colors.brand.accent }]}>{targets.fat_g}g</Text>
          <Text style={styles.macroLabel}>Fat</Text>
          <Text style={styles.macroNote}>~25% cals</Text>
        </View>
      </View>

      {/* Adjust hint */}
      <View style={styles.adjustHint}>
        <Text style={styles.adjustHintIcon}>✏️</Text>
        <View style={styles.flex1}>
          <Text style={styles.adjustHintText}>You can always change these later.</Text>
          <Text style={styles.adjustHintSub}>Go to More → Calorie & Macro Goals to override your targets anytime — useful if you already know your exact caloric needs.</Text>
        </View>
      </View>

      {/* CTA */}
      <Pressable onPress={onConfirm} disabled={saving} style={{ marginTop: spacing.md }}>
        <LinearGradient
          colors={['#6366F1', '#A78BFA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientBtn}
        >
          <Text style={styles.gradientBtnLabel}>{saving ? 'Saving...' : "Let's Go! 💪"}</Text>
          <Text style={styles.gradientBtnSub}>Pumunta na sa iyong dashboard</Text>
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

export default function OnboardingStep() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const { session, fetchProfile } = useAuthStore();

  // Step 1
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  // Step 2
  const [birthdate, setBirthdate] = useState('');
  // Step 3
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  // Step 4
  const [bodyFat, setBodyFat] = useState('');
  const [bfModalVisible, setBfModalVisible] = useState(false);
  // Step 5
  const [goal, setGoal] = useState<PrimaryGoal | ''>('');
  // Step 6
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | ''>('');
  // Step 7
  const [experience, setExperience] = useState<ExperienceLevel | ''>('');
  const [workoutDays, setWorkoutDays] = useState<number[]>([]);
  const [equipment, setEquipment] = useState<EquipmentType | ''>('');
  // Step 8
  const [targets, setTargets] = useState<CalorieTargets | null>(null);

  const [saving, setSaving] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [weightError, setWeightError] = useState<string | null>(null);
  const [heightError, setHeightError] = useState<string | null>(null);

  // Disable hardware back on results screen
  useEffect(() => {
    if (currentStep !== 8) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [currentStep]);

  useEffect(() => { setStepError(null); setWeightError(null); setHeightError(null); }, [currentStep]);

  function getWeightKg(): number {
    const val = parseFloat(weight);
    return weightUnit === 'lbs' ? val / 2.20462 : val;
  }

  function getHeightCmValue(): number {
    if (heightUnit === 'cm') return parseFloat(heightCm);
    const ft = parseFloat(heightFt) || 0;
    const inches = parseFloat(heightIn) || 0;
    return (ft * 12 + inches) * 2.54;
  }

  function validateStep(): string | null {
    switch (currentStep) {
      case 1:
        if (!displayName.trim()) return 'Please enter your display name';
        if (displayName.trim().length > 50) return 'Name must be 50 characters or less';
        if (!gender) return 'Please select your gender';
        return null;
      case 2: {
        if (!birthdate) return 'Please enter your birthdate';
        const age = (Date.now() - new Date(birthdate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        if (age < 18) return 'Kailangan mo munang maging 18 taong gulang para gamitin ang Mayari 🙏';
        return null;
      }
      case 3: {
        let err: string | null = null;
        const w = parseFloat(weight);
        if (!weight.trim() || isNaN(w)) {
          setWeightError('Enter a valid number');
          err = 'Please fix the errors above';
        } else if (weightUnit === 'kg' && (w < 20 || w > 500)) {
          setWeightError('Weight must be between 20–500 kg');
          err = 'Please fix the errors above';
        } else if (weightUnit === 'lbs' && (w < 44 || w > 1100)) {
          setWeightError('Weight must be between 44–1100 lbs');
          err = 'Please fix the errors above';
        } else {
          setWeightError(null);
        }
        if (heightUnit === 'cm') {
          const h = parseFloat(heightCm);
          if (!heightCm.trim() || isNaN(h) || h < 100 || h > 250) {
            setHeightError('Height must be between 100–250 cm');
            err = 'Please fix the errors above';
          } else {
            setHeightError(null);
          }
        } else {
          const ft = parseFloat(heightFt) || 0;
          const inches = parseFloat(heightIn) || 0;
          if (ft < 3 || ft > 8 || inches < 0 || inches > 11) {
            setHeightError('Enter a valid height (3–8 ft, 0–11 in)');
            err = 'Please fix the errors above';
          } else {
            setHeightError(null);
          }
        }
        return err;
      }
      case 4: {
        if (!bodyFat) return null; // optional
        const bf = parseFloat(bodyFat);
        if (isNaN(bf) || bf < 3 || bf > 60) return 'Body fat must be between 3–60%';
        return null;
      }
      case 5: return goal ? null : 'Please select a goal';
      case 6: return activityLevel ? null : 'Please select your activity level';
      case 7: {
        if (!experience) return 'Please select your experience level';
        if (workoutDays.length < 2) return 'Please select at least 2 workout days';
        if (!equipment) return 'Please select your equipment';
        return null;
      }
      default: return null;
    }
  }

  async function saveProfile() {
    if (!targets || !session?.user?.id) return;
    setSaving(true);
    try {
      const weight_kg = getWeightKg();
      const height_cm = getHeightCmValue();
      const username =
        displayName.trim().toLowerCase().replace(/\s+/g, '_') +
        '_' +
        Math.floor(Math.random() * 1000);

      const { error } = await supabase.from('users').upsert(
        {
          id: session.user.id,
          display_name: displayName.trim(),
          username,
          gender,
          birthdate,
          body_weight_kg: weight_kg,
          height_cm,
          body_fat_pct: bodyFat ? parseFloat(bodyFat) : null,
          primary_goal: goal,
          activity_level: activityLevel,
          experience_level: experience,
          workout_days: workoutDays,
          equipment_type: equipment,
          session_duration_min: 60,
          calorie_goal: targets.calorie_target,
          protein_goal_g: targets.protein_g,
          carbs_goal_g: targets.carbs_g,
          fat_goal_g: targets.fat_g,
        },
        { onConflict: 'id' },
      );

      if (error) { setStepError(error.message); return; }
      await fetchProfile(session.user.id);
      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  }

  async function handleNext() {
    setStepError(null);
    const err = validateStep();
    if (err) { setStepError(err); return; }

    if (currentStep === 7) {
      const weight_kg = getWeightKg();
      const height_cm = getHeightCmValue();
      const computed = computeAllTargets({
        body_weight_kg: weight_kg,
        height_cm,
        birthdate,
        gender: gender as Gender,
        body_fat_pct: bodyFat ? parseFloat(bodyFat) : null,
        activity_level: activityLevel as string,
        primary_goal: goal as string,
      });
      setTargets(computed);
      setCurrentStep(8);
      return;
    }

    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
      return;
    }

    await saveProfile();
  }

  function handleBack() {
    if (currentStep > 1 && currentStep < 8) setCurrentStep(currentStep - 1);
  }

  function renderStep() {
    switch (currentStep) {
      case 1:
        return (
          <StepIdentity
            name={displayName} gender={gender}
            onNameChange={setDisplayName} onGenderChange={setGender}
          />
        );
      case 2:
        return <StepBirthdate value={birthdate} onChange={setBirthdate} />;
      case 3:
        return (
          <StepBodyStats
            weight={weight} weightUnit={weightUnit}
            heightCm={heightCm} heightFt={heightFt} heightIn={heightIn} heightUnit={heightUnit}
            onWeightChange={(v) => { setWeight(v); setWeightError(null); }}
            onWeightUnitToggle={() => setWeightUnit((u) => (u === 'kg' ? 'lbs' : 'kg'))}
            onHeightCmChange={(v) => { setHeightCm(v); setHeightError(null); }}
            onHeightFtChange={(v) => { setHeightFt(v); setHeightError(null); }}
            onHeightInChange={(v) => { setHeightIn(v); setHeightError(null); }}
            onHeightUnitToggle={() => setHeightUnit((u) => (u === 'cm' ? 'ft' : 'cm'))}
            weightError={weightError}
            heightError={heightError}
          />
        );
      case 4:
        return (
          <StepBodyFat
            value={bodyFat} gender={gender}
            onChange={setBodyFat}
            modalVisible={bfModalVisible}
            onOpenModal={() => setBfModalVisible(true)}
            onCloseModal={() => setBfModalVisible(false)}
          />
        );
      case 5:
        return <StepGoal value={goal} onChange={setGoal} />;
      case 6:
        return <StepActivityLevel value={activityLevel} onChange={setActivityLevel} />;
      case 7:
        return (
          <StepTrainingSetup
            experience={experience} workoutDays={workoutDays} equipment={equipment}
            onExperienceChange={setExperience}
            onWorkoutDaysChange={setWorkoutDays}
            onEquipmentChange={setEquipment}
          />
        );
      case 8:
        if (!targets) return null;
        return (
          <StepResults
            targets={targets}
            displayName={displayName}
            goal={goal as string}
            activityLevel={activityLevel as string}
            bodyWeightKg={getWeightKg()}
            saving={saving}
            onConfirm={handleNext}
          />
        );
      default:
        return null;
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

      {/* Optional badge on step 4 */}
      {currentStep === 4 && (
        <View style={styles.optionalBadge}>
          <Text style={styles.optionalBadgeText}>Optional</Text>
        </View>
      )}

      {/* Step content */}
      <View style={styles.stepContent}>{renderStep()}</View>

      {stepError && <Text style={styles.stepError}>{stepError}</Text>}

      {/* Navigation — hidden on step 8 (Results has its own CTA) */}
      {currentStep < 8 && (
        <View style={styles.nav}>
          {currentStep > 1 && (
            <Button label="Back" variant="outline" onPress={handleBack} style={styles.backBtn} />
          )}
          {currentStep === 4 && (
            <Button
              label="Skip"
              variant="outline"
              onPress={() => { setBodyFat(''); setCurrentStep(5); }}
              style={styles.skipBtn}
            />
          )}
          <Button
            label={currentStep === 7 ? 'See My Results 🎉' : 'Next'}
            onPress={handleNext}
            loading={saving}
            style={currentStep === 1 ? styles.fullWidth : styles.nextBtn}
          />
        </View>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing['2xl'] },

  progressHeader: { marginBottom: spacing.md },
  progressLabel: { color: colors.text.muted, fontSize: typography.sm, marginBottom: spacing.xs },
  progressBar: { height: 4, backgroundColor: colors.bg.elevated, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.brand.primary, borderRadius: 2 },

  optionalBadge: {
    alignSelf: 'flex-end',
    backgroundColor: colors.bg.elevated,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginBottom: spacing.xs,
  },
  optionalBadgeText: { color: colors.brand.primary, fontSize: typography.xs, fontWeight: '600' },

  stepContent: { flex: 1, marginBottom: spacing.xl },
  stepEmoji: { fontSize: 56, textAlign: 'center', marginBottom: spacing.md },
  stepTitle: { color: colors.text.primary, fontSize: typography['2xl'], fontWeight: 'bold', textAlign: 'center', marginBottom: spacing.xs },
  stepBody: { color: colors.text.secondary, fontSize: typography.sm, textAlign: 'center', marginBottom: spacing.lg, lineHeight: 20 },

  fieldLabel: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '600', marginBottom: spacing.xs, letterSpacing: 0.5 },
  fieldHelper: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4, marginBottom: spacing.sm },

  errorChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EF444415', borderWidth: 1, borderColor: colors.error,
    borderRadius: 8, padding: 8, marginTop: 4,
  },
  errorChipText: { color: colors.error, fontSize: typography.xs },

  unitInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg.secondary, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 10, paddingLeft: spacing.md, paddingRight: spacing.sm, height: 50,
  },
  unitInputRowError: { borderColor: colors.error },
  unitInput: { flex: 1, color: colors.text.primary, fontSize: typography.base },
  unitBadge: {
    backgroundColor: colors.bg.elevated, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.brand.primary,
  },
  unitBadgeStatic: {
    backgroundColor: colors.bg.elevated, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4,
  },
  unitBadgeText: { color: colors.brand.primary, fontSize: typography.xs, fontWeight: '700' },

  bfReferenceCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bg.secondary, borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: colors.brand.primary, borderRadius: 10, padding: spacing.md, marginTop: spacing.md,
  },
  bfReferenceIcon: { fontSize: 20 },
  bfReferenceTitle: { color: colors.brand.secondary, fontSize: typography.sm, fontWeight: '600' },
  bfReferenceSub: { color: colors.text.muted, fontSize: typography.xs },
  bfReferenceArrow: { color: colors.brand.primary, fontSize: typography.base },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bg.secondary, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.lg, height: '85%',
  },
  modalDragHandle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  modalTitle: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  modalSub: { color: colors.text.secondary, fontSize: typography.sm, textAlign: 'center', marginBottom: spacing.md },
  modalToggleRow: {
    flexDirection: 'row', backgroundColor: colors.bg.elevated, borderRadius: 20,
    padding: 3, gap: 3, alignSelf: 'center', marginBottom: spacing.md,
  },
  modalTab: { paddingHorizontal: spacing.lg, paddingVertical: 6, borderRadius: 16 },
  modalTabActive: { backgroundColor: colors.brand.primary },
  modalTabText: { color: colors.text.secondary, fontSize: typography.sm, fontWeight: '600' },
  modalTabTextActive: { color: colors.text.primary },
  modalImageScroll: { flex: 1, marginBottom: spacing.md },
  modalImage: { flex: 1, width: '100%' },
  modalCloseBtn: { marginTop: spacing.sm },

  // Lists & grids
  optionList: { gap: spacing.sm },
  listCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg.secondary, borderRadius: 12,
    padding: spacing.md, borderWidth: 1.5, borderColor: colors.border, gap: spacing.md,
  },
  listCardSelected: { borderColor: colors.brand.primary, backgroundColor: colors.bg.elevated },
  listEmoji: { fontSize: 24 },
  listLabel: { color: colors.text.secondary, fontSize: typography.base, fontWeight: '600' },
  listLabelSelected: { color: colors.brand.primary },
  listSub: { color: colors.text.muted, fontSize: typography.xs, marginTop: 2 },
  checkmark: { color: colors.brand.primary, fontSize: typography.lg, fontWeight: 'bold' },
  palBadge: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '600' },
  palBadgeSelected: { color: colors.brand.primary },

  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optionCard: {
    flex: 1, minWidth: '45%', backgroundColor: colors.bg.secondary, borderRadius: 12,
    padding: spacing.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center',
  },
  optionCardSelected: { borderColor: colors.brand.primary, backgroundColor: colors.bg.elevated },
  optionEmoji: { fontSize: 28, marginBottom: spacing.xs },
  optionLabel: { color: colors.text.secondary, fontSize: typography.sm, fontWeight: '600', textAlign: 'center', marginBottom: 2 },
  optionLabelSelected: { color: colors.brand.primary },
  optionSub: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },

  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', marginBottom: 4 },
  dayChip: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: colors.bg.secondary,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  dayChipSelected: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  dayLabel: { color: colors.text.secondary, fontSize: typography.xs, fontWeight: '600' },
  dayLabelSelected: { color: colors.text.primary },
  dayCount: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center', marginTop: spacing.sm },

  // Results
  resultsHero: { alignItems: 'center', marginBottom: spacing.lg },
  resultsEmoji: { fontSize: 52, marginBottom: spacing.sm },
  resultsTaglish: { color: colors.brand.secondary, fontSize: typography.sm, fontWeight: '600', marginBottom: 4, letterSpacing: 0.5 },
  resultsTitle: { color: colors.text.primary, fontSize: typography['2xl'], fontWeight: '800', marginBottom: 4 },
  resultsSubtitle: { color: colors.text.secondary, fontSize: typography.sm },

  calorieCard: {
    backgroundColor: colors.bg.secondary, borderRadius: 16, padding: spacing.lg,
    marginBottom: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  calorieCardLabel: { color: colors.text.muted, fontSize: typography.xs, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 },
  calorieNumber: { color: colors.brand.primary, fontSize: 48, fontWeight: '800', lineHeight: 56 },
  calorieUnit: { color: colors.text.secondary, fontSize: typography.sm, marginBottom: spacing.md },
  calorieBreakdown: { backgroundColor: colors.bg.primary, borderRadius: 10, padding: spacing.sm, width: '100%', gap: 4 },
  calorieBreakdownText: { color: colors.text.muted, fontSize: typography.xs, textAlign: 'center' },

  macrosRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  macroCard: {
    flex: 1, backgroundColor: colors.bg.secondary, borderRadius: 12,
    padding: spacing.sm, alignItems: 'center', borderWidth: 1.5,
  },
  macroValue: { fontSize: typography.xl, fontWeight: '800' },
  macroLabel: { color: colors.text.secondary, fontSize: typography.xs, fontWeight: '600', marginTop: 2 },
  macroNote: { color: colors.text.muted, fontSize: 10, marginTop: 2 },

  adjustHint: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bg.secondary, borderRadius: 10,
    padding: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  adjustHintIcon: { fontSize: 16 },
  adjustHintText: { color: colors.text.secondary, fontSize: typography.sm },
  adjustHintSub: { color: colors.text.muted, fontSize: typography.xs },

  gradientBtn: { borderRadius: 12, padding: spacing.md, alignItems: 'center', marginBottom: spacing.md },
  gradientBtnLabel: { color: colors.white, fontWeight: '800', fontSize: typography.lg },
  gradientBtnSub: { color: 'rgba(255,255,255,0.75)', fontSize: typography.xs, marginTop: 2 },

  // Nav
  nav: { flexDirection: 'row', gap: spacing.sm, marginTop: 'auto' },
  backBtn: { flex: 1 },
  nextBtn: { flex: 2 },
  skipBtn: { flex: 1 },
  fullWidth: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex1: { flex: 1 },
  stepError: { color: colors.error, fontSize: typography.sm, textAlign: 'center', marginBottom: spacing.md },
});
