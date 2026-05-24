export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type PrimaryGoal = 'build_muscle' | 'lose_fat' | 'maintain' | 'improve_fitness';
export type EquipmentType = 'full_gym' | 'dumbbells' | 'barbell' | 'bodyweight';
export type SubscriptionStatus = 'free' | 'beta' | 'active' | 'achiever';
export type LocationPrecision = 'exact' | 'approx' | 'hidden';
export type MealSlot = 'almusal' | 'tanghalian' | 'merienda' | 'hapunan';
export type MessageRole = 'user' | 'assistant';
export type MessageType = 'chat' | 'plan_generation' | 'photo_analysis';
export type BuddyRequestStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';
export type FastingStatus = 'active' | 'completed' | 'cancelled';
export type UnitsPref = 'metric' | 'imperial';
export type ReferralStatus = 'pending' | 'active' | 'expired';
export type Gender = 'male' | 'female' | 'prefer_not_to_say';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
export type TipType = 'nutrition' | 'workout' | 'streak' | 'pr' | 'general';

export interface PlannedExercise {
  exercise_id: string;
  exercise_name: string;
  muscle_group: 'push' | 'pull' | 'legs' | 'core';
  sets: number;
  reps_low: number;
  reps_high: number;
  rest_seconds: number;
}

export interface DayPlan {
  day_label: string;
  exercises: PlannedExercise[];
}

export interface PlanData {
  days: DayPlan[];
}

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  birthdate: string | null;
  experience_level: ExperienceLevel;
  primary_goal: PrimaryGoal;
  equipment_type: EquipmentType;
  workout_days: number[];
  session_duration_min: number;
  body_weight_kg: number | null;
  height_cm: number | null;
  gender: Gender | null;
  activity_level: ActivityLevel | null;
  body_fat_pct: number | null;
  target_weight_kg: number | null;
  language_pref: 'en' | 'fil';
  meal_time_style: 'filipino' | 'generic';
  subscription_status: SubscriptionStatus;
  subscription_expires_at: string | null;
  referral_code: string;
  referred_by: string | null;
  calorie_goal: number | null;
  protein_goal_g: number | null;
  carbs_goal_g: number | null;
  fat_goal_g: number | null;
  net_carbs_display: boolean;
  // Week 10 additions
  push_token: string | null;
  units_pref: UnitsPref;
  notif_workout_enabled: boolean;
  notif_workout_time: string;
  notif_weekly_summary: boolean;
  notif_streak_alert: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkoutPlan {
  id: string;
  user_id: string;
  split_type: string;
  days_per_week: number;
  plan_data: PlanData;
  is_active: boolean;
  generated_by: string;
  created_at: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  plan_id: string | null;
  started_at: string;
  ended_at: string | null;
  total_volume_kg: number;
  notes: string | null;
  xp_earned: number;
  calories_burned: number | null;
  created_at: string;
}

export interface WorkoutSet {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  is_warmup: boolean;
  completed_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscle_group: 'push' | 'pull' | 'legs' | 'core';
  muscles_primary: string[];
  muscles_secondary: string[];
  equipment: string[];
  category: string;
  description: string;
  form_gif_url: string | null;
  instructions: string[] | null;
  workoutx_target: string | null;
  workoutx_equipment: string | null;
  workoutx_difficulty: string | null;
  workoutx_body_part: string | null;
}

export interface PersonalRecord {
  id: string;
  user_id: string;
  exercise_id: string;
  exercise_name: string;
  weight_kg: number;
  reps: number;
  achieved_at: string;
  muscle_group: 'push' | 'pull' | 'legs' | 'core';
}

export interface FoodItem {
  id: string;
  name: string;
  name_fil: string | null;
  brand: string | null;
  is_ph_local: boolean;
  // Macros (per 100g)
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  // Macro sub-breakdown
  fiber_per_100g: number | null;
  sugar_per_100g: number | null;
  saturated_fat_per_100g: number | null;
  polyunsaturated_fat_per_100g: number | null;
  monounsaturated_fat_per_100g: number | null;
  // Micronutrients (per 100g)
  sodium_mg_per_100g: number | null;
  potassium_mg_per_100g: number | null;
  calcium_mg_per_100g: number | null;
  iron_mg_per_100g: number | null;
  magnesium_mg_per_100g: number | null;
  phosphorus_mg_per_100g: number | null;
  zinc_mg_per_100g: number | null;
  vitamin_a_mcg_per_100g: number | null;
  vitamin_c_mg_per_100g: number | null;
  vitamin_d_mcg_per_100g: number | null;
  vitamin_b12_mcg_per_100g: number | null;
  folate_mcg_per_100g: number | null;
  cholesterol_mg_per_100g: number | null;
  barcode: string | null;
  source: 'custom' | 'open_food_facts' | 'ph_seed' | 'usda' | 'community';
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoodLog {
  id: string;
  user_id: string;
  food_item_id: string;
  meal_slot: MealSlot;
  quantity_g: number;
  logged_at: string;
  photo_url: string | null;
  ai_estimated: boolean;
  created_at: string;
}

export interface FoodLogWithItem extends FoodLog {
  food_item: FoodItem;
}

export interface WaterLog {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_at: string;
}

export interface BodyMeasurement {
  id: string;
  user_id: string;
  measured_at: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arms_cm: number | null;
  legs_cm: number | null;
  notes: string | null;
}

export interface CoachMessage {
  id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  message_type: MessageType;
  created_at: string;
}

export interface CoachTip {
  id: string;
  user_id: string;
  content: string;
  tip_type: TipType;
  read_at: string | null;
  created_at: string;
}

export interface FastingLog {
  id: string;
  user_id: string;
  target_window_hours: number;
  fasting_start: string;
  eating_window_start: string | null;
  eating_window_end: string | null;
  fasting_end: string | null;
  status: FastingStatus;
  created_at: string;
}

export interface Streak {
  id: string;
  user_id: string;
  workout_current: number;
  workout_longest: number;
  nutrition_current: number;
  nutrition_longest: number;
  last_workout_date: string | null;
  last_nutrition_date: string | null;
}

export interface BuddyRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: BuddyRequestStatus;
  message: string | null;
  created_at: string;
}

export interface BuddyConnection {
  id: string;
  user_a_id: string;
  user_b_id: string;
  connected_at: string;
}

export interface BuddyMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface NearbyUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
  primary_goal: PrimaryGoal;
  experience_level: ExperienceLevel;
  workout_days: number[];
  location_precision: LocationPrecision;
  distance_m: number;
}

export interface BuddyRequestWithSender extends BuddyRequest {
  sender: Pick<UserProfile, 'id' | 'display_name' | 'avatar_url' | 'primary_goal'>;
}

export interface BuddyConnectionWithUser extends BuddyConnection {
  other_user: Pick<UserProfile, 'id' | 'display_name' | 'avatar_url' | 'primary_goal'>;
}

// ─── Meal Planning ────────────────────────────────────────────────────────────

export interface PlannedMealItem {
  food_item_id: string;
  name: string;
  quantity_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export type WeekDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type MealPlanDayData = Record<MealSlot, PlannedMealItem[]>;

export type MealPlanData = Partial<Record<WeekDay, MealPlanDayData>>;

export interface MealPlan {
  id: string;
  user_id: string;
  name: string;
  week_start_date: string;
  plan_data: MealPlanData;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Grocery Lists ────────────────────────────────────────────────────────────

export type GroceryCategory =
  | 'proteins'
  | 'carbs'
  | 'vegetables'
  | 'pantry'
  | 'dairy'
  | 'others';

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: 'g' | 'kg' | 'pcs';
  category: GroceryCategory;
  checked: boolean;
}

export interface GroceryList {
  id: string;
  user_id: string;
  meal_plan_id: string | null;
  name: string | null;
  items: GroceryItem[];
  created_at: string;
}

// ─── AI Meal Builder ──────────────────────────────────────────────────────────

export interface AIMealIngredient {
  name: string;
  quantity_g: number;
  unit: string;
}

export interface AIMacros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  net_carbs_g: number;
  fiber_g: number;
}

export interface AISuggestedMeal {
  meal_name: string;
  description: string;
  ingredients: AIMealIngredient[];
  macros: AIMacros;
}

export interface AIBuildResult {
  meals: AISuggestedMeal[];
}

export type AIWeeklySlot = AISuggestedMeal;

export type AIWeeklyDayData = Record<MealSlot, AIWeeklySlot>;

export type AIWeeklyPlanResult = {
  plan: Partial<Record<WeekDay, AIWeeklyDayData>>;
};

// ─── Food Submissions ─────────────────────────────────────────────────────────

export interface FoodSubmission {
  id: string;
  submitted_by: string | null;
  name: string;
  name_fil: string | null;
  brand: string | null;
  barcode: string | null;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  fiber_per_100g: number | null;
  sodium_mg_per_100g: number | null;
  is_ph_local: boolean;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  reject_reason: string | null;
  created_at: string;
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export interface Subscription {
  id: string;
  user_id: string;
  paymongo_customer_id: string | null;
  paymongo_subscription_id: string | null;
  tier: SubscriptionStatus;
  price_paid_cents: number | null;
  current_period_start: string | null;
  current_period_end: string | null;
  referral_discount_pct: number;
  consistency_discount_pct: number;
  created_at: string;
  updated_at: string;
}

// ─── Referrals (with joined display_name) ────────────────────────────────────

export interface ReferralWithUser {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  status: ReferralStatus;
  activated_at: string | null;
  created_at: string;
  referred_user: { display_name: string | null; username: string | null } | null;
}
