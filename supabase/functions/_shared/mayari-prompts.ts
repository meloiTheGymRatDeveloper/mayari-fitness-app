// supabase/functions/_shared/mayari-prompts.ts

export type TriggerEvent =
  | 'post_workout'
  | 'pr_broken'
  | 'streak_milestone'
  | 'first_food_log_today'
  | 'first_workout_week'
  | 'full_macro_day'
  | 'calorie_goal_hit'
  | 'calorie_deficit_aggressive'
  | 'fasting_completed'
  | 'weight_goal_hit'
  | 'abandoned_workout'
  | 'if_window_warning'
  | 'post_weekend_reset'
  | 'workout_silence_2day'
  | 'water_reminder'
  | 'rest_day_recommended'
  | 'rest_day_tomorrow'
  | 'subscription_lapse'
  | 'weekly_pattern'
  | 'plateau_detected'
  | 'food_variety_alert'
  | 'protein_low_rest_day'
  | 'late_workout_pattern';

export type TipCategory = 'achievement' | 'risk' | 'insight' | 'workout' | 'nutrition' | 'streak' | 'pr' | 'general';

export const TRIGGER_CATEGORY: Record<TriggerEvent, TipCategory> = {
  post_workout:               'workout',
  pr_broken:                  'pr',
  streak_milestone:           'streak',
  first_food_log_today:       'achievement',
  first_workout_week:         'achievement',
  full_macro_day:             'achievement',
  calorie_goal_hit:           'achievement',
  weight_goal_hit:            'achievement',
  fasting_completed:          'achievement',
  calorie_deficit_aggressive: 'risk',
  abandoned_workout:          'risk',
  if_window_warning:          'risk',
  workout_silence_2day:       'risk',
  water_reminder:             'risk',
  rest_day_recommended:       'risk',
  subscription_lapse:         'risk',
  post_weekend_reset:         'insight',
  rest_day_tomorrow:          'insight',
  weekly_pattern:             'insight',
  plateau_detected:           'insight',
  food_variety_alert:         'insight',
  protein_low_rest_day:       'insight',
  late_workout_pattern:       'insight',
};

// Hours before the same trigger_event can fire again for a user
export const DEDUP_HOURS: Record<TriggerEvent, number> = {
  post_workout:               4,
  pr_broken:                  2,
  streak_milestone:           24,
  first_food_log_today:       20,
  first_workout_week:         144,
  full_macro_day:             20,
  calorie_goal_hit:           20,
  weight_goal_hit:            168,
  fasting_completed:          12,
  calorie_deficit_aggressive: 12,
  abandoned_workout:          4,
  if_window_warning:          12,
  post_weekend_reset:         144,
  workout_silence_2day:       20,
  water_reminder:             10,
  rest_day_recommended:       20,
  rest_day_tomorrow:          20,
  subscription_lapse:         72,
  weekly_pattern:             144,
  plateau_detected:           144,
  food_variety_alert:         144,
  protein_low_rest_day:       48,
  late_workout_pattern:       144,
};

export function buildPrompt(trigger: TriggerEvent, ctx: Record<string, unknown>): string {
  const prefix = "You are Mayari, a caring Filipino fitness coach. Write in Taglish (mix of Tagalog and English). 1-2 sentences only. Be specific, warm, and human. Never say you are an AI.";

  const map: Record<TriggerEvent, string> = {
    post_workout:
      `${prefix} The user just finished a workout: ${ctx.exercises_count ?? '?'} exercises, ${ctx.total_volume_kg ?? '?'}kg total volume, ${ctx.duration_min ?? '?'} minutes. Give specific, warm feedback that mentions their numbers.`,

    pr_broken:
      `${prefix} The user just set a new personal record: ${ctx.exercise_name} at ${ctx.weight_kg}kg × ${ctx.reps} reps. Celebrate genuinely — make it feel earned, not generic.`,

    streak_milestone:
      `${prefix} The user just hit a ${ctx.streak_days}-day workout streak. Celebrate this milestone and say something meaningful about what ${ctx.streak_days} days of consistency represents.`,

    first_food_log_today:
      `${prefix} The user just logged their very first meal of the day. One short sentence setting a positive, energetic tone for the rest of the day's nutrition.`,

    first_workout_week:
      `${prefix} The user just logged their first workout of the week. One short sentence that acknowledges the momentum and makes them feel the week has begun well.`,

    full_macro_day:
      `${prefix} The user hit ALL their macro targets today: ${ctx.calories}kcal, ${ctx.protein_g}g protein, ${ctx.carbs_g}g carbs, ${ctx.fat_g}g fat. This is rare — celebrate it genuinely and make it feel like an achievement.`,

    calorie_goal_hit:
      `${prefix} The user is right on their calorie target today: ${ctx.calories}kcal of their ${ctx.goal}kcal goal. One affirming sentence.`,

    weight_goal_hit:
      `${prefix} The user just reached their target weight of ${ctx.target_kg}kg (logged ${ctx.current_kg}kg today). This is a big milestone — celebrate it with real emotion.`,

    fasting_completed:
      `${prefix} The user just completed their ${ctx.window_hours}-hour fasting window. Celebrate briefly, then remind them to break their fast with something nutritious.`,

    calorie_deficit_aggressive:
      `${prefix} The user has only eaten ${ctx.calories}kcal today against a ${ctx.goal}kcal target — that's more than 40% below goal. Be caring but firm: this is a health concern, not just a coaching moment. Suggest they eat something now.`,

    abandoned_workout:
      `${prefix} The user started a workout session ${ctx.hours_ago ?? 'a while'} ago but didn't finish it. Be warm and non-judgmental. Make coming back feel easy, not guilt-inducing.`,

    if_window_warning:
      `${prefix} The user's fasting window ends in 30 minutes — eating window opens at ${ctx.eating_start_time}. One brief, neutral reminder sentence.`,

    post_weekend_reset:
      `${prefix} It's Monday. The user's nutrition logging dropped off over the weekend (only ${ctx.logged_days} of 2 weekend days logged). One warm reset sentence — no guilt, just momentum forward.`,

    workout_silence_2day:
      `${prefix} The user hasn't logged a workout in 2 days. This is a gentle check-in, not nagging. Acknowledge life gets busy. Remind them even 15 minutes counts.`,

    water_reminder:
      `${prefix} It's ${ctx.current_time} and the user has only logged ${ctx.water_ml}ml of water today. One practical hydration nudge — not preachy.`,

    rest_day_recommended:
      `${prefix} The user has trained ${ctx.consecutive_days} days in a row. Recommend a rest day — frame it as wisdom, not weakness. Recovery is where gains happen.`,

    rest_day_tomorrow:
      `${prefix} Tomorrow is the user's scheduled rest day (${ctx.rest_day_name}). Proactively suggest: hit protein target today, sleep well tonight, let the muscles recover.`,

    subscription_lapse:
      `${prefix} The user's Mayari subscription expires in ${ctx.days_remaining} days. Frame this entirely around what they'll lose: their streak tracking, workout history, progress data. Make it about their progress — not the payment.`,

    weekly_pattern:
      `${prefix} Analysis shows the user consistently trains harder on ${ctx.best_day} than any other day — averaging ${ctx.best_day_volume_kg}kg volume vs ${ctx.avg_other_volume_kg}kg on other days. Tell them this is their power day and they should protect that slot.`,

    plateau_detected:
      `${prefix} The user's weight has stayed around ${ctx.weight_kg}kg for 3 weeks despite consistent logging. Acknowledge this is normal. Suggest one practical adjustment — slightly adjust calories or add a new workout stimulus.`,

    food_variety_alert:
      `${prefix} The user has logged "${ctx.top_food}" ${ctx.count} times in the past week. Suggest a Filipino food swap that hits similar macros (e.g. tilapia, tokwa, itlog, or lentils if they eat chicken/rice heavily).`,

    protein_low_rest_day:
      `${prefix} The user consistently hits their protein goal on workout days but only averages ${ctx.rest_day_protein_g}g on rest days (goal: ${ctx.protein_goal_g}g). Explain briefly why protein on rest days is critical for muscle repair.`,

    late_workout_pattern:
      `${prefix} The user has logged workouts after 10pm ${ctx.late_count} times this week. Be observational, not lecturing — just note that late-night training can affect sleep quality and recovery.`,
  };

  return map[trigger];
}
