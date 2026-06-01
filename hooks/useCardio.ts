import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { CardioMetrics, CardioEnrollment, WorkoutSession } from '../types/database';

export function useCardioSessions(type: 'running' | 'cycling', limit = 10) {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['cardio_sessions', type, userId, limit],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*, cardio_metrics(*)')
        .eq('user_id', userId)
        .eq('workout_type', type)
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as (WorkoutSession & { cardio_metrics: CardioMetrics | null })[];
    },
    enabled: !!userId,
  });
}

export function useCardioEnrollment(type: 'running' | 'cycling') {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['cardio_enrollment', type, userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('cardio_plan_enrollments')
        .select('*')
        .eq('user_id', userId)
        .eq('workout_type', type)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] ?? null) as CardioEnrollment | null;
    },
    enabled: !!userId,
  });
}

export function useEnrollInPlan() {
  const userId = useAuthStore(s => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ planTemplateId, workoutType }: { planTemplateId: string; workoutType: 'running' | 'cycling' }) => {
      if (!userId) throw new Error('Not authenticated');
      // Deactivate any existing active enrollment for this type
      await supabase
        .from('cardio_plan_enrollments')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('workout_type', workoutType)
        .eq('is_active', true);
      // Create new enrollment
      const { data, error } = await supabase
        .from('cardio_plan_enrollments')
        .insert({ user_id: userId, plan_template_id: planTemplateId, workout_type: workoutType })
        .select()
        .single();
      if (error) throw error;
      return data as CardioEnrollment;
    },
    onSuccess: (_, { workoutType }) => {
      queryClient.invalidateQueries({ queryKey: ['cardio_enrollment', workoutType, userId] });
    },
  });
}

export function useAdvanceEnrollmentWeek() {
  const userId = useAuthStore(s => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ enrollmentId, newWeek, workoutType }: { enrollmentId: string; newWeek: number; workoutType: 'running' | 'cycling' }) => {
      const { error } = await supabase
        .from('cardio_plan_enrollments')
        .update({ current_week: newWeek })
        .eq('id', enrollmentId);
      if (error) throw error;
      return { newWeek, workoutType };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['cardio_enrollment', result.workoutType, userId] });
    },
  });
}
