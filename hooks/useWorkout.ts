import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { fallbackExercises } from '../constants/exercises';
import type { WorkoutPlan, WorkoutSession, WorkoutSet, Exercise, PersonalRecord } from '../types/database';

export function useActivePlan() {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['workout_plan', 'active', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] ?? null) as WorkoutPlan | null;
    },
    enabled: !!userId,
  });
}

export function useAllPlans() {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['workout_plans', 'all', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as WorkoutPlan[];
    },
    enabled: !!userId,
  });
}

export function useRecentSessions(limit = 3) {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['workout_sessions', 'recent', userId, limit],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', userId)
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as WorkoutSession[];
    },
    enabled: !!userId,
  });
}

export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exercises').select('*').order('name');
      if (error) throw error;
      const rows = (data ?? []) as Exercise[];
      return rows.length > 0 ? rows : fallbackExercises;
    },
    staleTime: 1000 * 60 * 60,
  });
}

export function useExerciseById(id: string) {
  return useQuery({
    queryKey: ['exercises', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('exercises').select('*').eq('id', id).single();
      if (error) return fallbackExercises.find(e => e.id === id) ?? null;
      return data as Exercise;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 60,
  });
}

export function useWorkoutSessionCount() {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['workout_sessions', 'count', userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from('workout_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('ended_at', 'is', null);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
  });
}

export function usePersonalRecords() {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['personal_records', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('personal_records')
        .select('*')
        .eq('user_id', userId)
        .order('exercise_name');
      if (error) throw error;
      return (data ?? []) as PersonalRecord[];
    },
    enabled: !!userId,
  });
}

export function useSessionHistory() {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['workout_sessions', 'history', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', userId)
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkoutSession[];
    },
    enabled: !!userId,
  });
}

export function useSessionDetail(id: string) {
  return useQuery({
    queryKey: ['workout_sessions', id],
    queryFn: async () => {
      const [sessionRes, setsRes] = await Promise.all([
        supabase.from('workout_sessions').select('*').eq('id', id).single(),
        supabase
          .from('workout_sets')
          .select('*')
          .eq('session_id', id)
          .order('completed_at', { ascending: true }),
      ]);
      if (sessionRes.error) throw sessionRes.error;
      if (setsRes.error) throw setsRes.error;
      return {
        session: sessionRes.data as WorkoutSession,
        sets: (setsRes.data ?? []) as WorkoutSet[],
      };
    },
    enabled: !!id,
  });
}

export function useTodayCaloriesBurned(date: string) {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['calories_burned', userId, date],
    enabled: !!userId,
    queryFn: async () => {
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;
      const { data } = await supabase
        .from('workout_sessions')
        .select('calories_burned')
        .eq('user_id', userId!)
        .gte('started_at', startOfDay)
        .lte('started_at', endOfDay)
        .not('calories_burned', 'is', null);
      return (data ?? []).reduce((sum, s) => sum + (s.calories_burned ?? 0), 0);
    },
  });
}
