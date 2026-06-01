import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { openAuthSessionAsync } from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { StravaConnection } from '../types/database';

const STRAVA_CLIENT_ID = ''; // Fill in from Strava API application settings

export function useStravaConnection() {
  const userId = useAuthStore(s => s.session?.user.id);
  return useQuery({
    queryKey: ['strava_connection', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('strava_connections')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
      return (data ?? null) as StravaConnection | null;
    },
    enabled: !!userId,
  });
}

export function useConnectStrava() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);
  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const redirectUri = 'mayari://strava/callback';
      const stravaUrl =
        `https://www.strava.com/oauth/authorize` +
        `?client_id=${STRAVA_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&approval_prompt=auto` +
        `&scope=activity:read_all`;
      const result = await openAuthSessionAsync(stravaUrl, redirectUri);
      if (result.type !== 'success') throw new Error('Strava auth cancelled');
      // Deep link callback.tsx handles the actual token exchange
      return result;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['strava_connection', userId] });
    },
  });
}

export function useDisconnectStrava() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);
  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('strava_connections')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strava_connection', userId] });
    },
  });
}

export function useSyncFromStrava() {
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);
  return useMutation({
    mutationFn: async (workoutType: 'running' | 'cycling') => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const { data, error } = await supabase.functions.invoke('strava-sync', {
        body: { workout_type: workoutType },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      return data as { session_id: string; cardio_metrics_id: string; advanced_week: boolean };
    },
    onSuccess: (_, workoutType) => {
      queryClient.invalidateQueries({ queryKey: ['cardio_sessions', workoutType, userId] });
      queryClient.invalidateQueries({ queryKey: ['cardio_enrollment', workoutType, userId] });
      queryClient.invalidateQueries({ queryKey: ['workout_sessions', 'recent', userId] });
    },
  });
}
