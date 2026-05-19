import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { Streak } from '../types/database';

export function useStreaks() {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['streaks', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as Streak | null;
    },
    enabled: !!userId,
  });
}

// Returns Sets of ISO date strings (YYYY-MM-DD) for last 30 days:
// workoutDays = days user completed a workout session
// nutritionDays = days user logged 3+ distinct meal slots
export function useStreakCalendar() {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['streak_calendar', userId, new Date().toISOString().substring(0, 10)],
    queryFn: async () => {
      if (!userId) return { workoutDays: new Set<string>(), nutritionDays: new Set<string>() };

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .substring(0, 10);

      const [workoutRes, foodRes] = await Promise.all([
        supabase
          .from('workout_sessions')
          .select('started_at')
          .eq('user_id', userId)
          .not('ended_at', 'is', null)
          .gte('started_at', thirtyDaysAgo),
        supabase
          .from('food_logs')
          .select('logged_at, meal_slot')
          .eq('user_id', userId)
          .gte('logged_at', thirtyDaysAgo),
      ]);

      if (workoutRes.error) throw workoutRes.error;
      if (foodRes.error) throw foodRes.error;

      const workoutDays = new Set<string>(
        (workoutRes.data ?? []).map(s => s.started_at.substring(0, 10))
      );

      const mealsByDate: Record<string, Set<string>> = {};
      for (const log of (foodRes.data ?? [])) {
        const day = log.logged_at.substring(0, 10);
        if (!mealsByDate[day]) mealsByDate[day] = new Set();
        mealsByDate[day].add(log.meal_slot);
      }
      const nutritionDays = new Set<string>(
        Object.entries(mealsByDate)
          .filter(([, slots]) => slots.size >= 3)
          .map(([day]) => day)
      );

      return { workoutDays, nutritionDays };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}
