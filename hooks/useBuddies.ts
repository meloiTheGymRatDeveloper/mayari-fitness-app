import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { NearbyUser, BuddyRequest, BuddyConnection, PrimaryGoal } from '../types/database';

export interface RequestWithUser extends BuddyRequest {
  user: { id: string; display_name: string; avatar_url: string | null; primary_goal: string };
}

export interface ConnectionWithUser extends BuddyConnection {
  other_user: { id: string; display_name: string; avatar_url: string | null; primary_goal: string };
}

export function useFindNearbyUsers(
  coords: { lat: number; lng: number } | null,
  radiusM: number,
  goalFilter: PrimaryGoal | null
) {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery<NearbyUser[]>({
    queryKey: ['nearby_users', userId, coords?.lat, coords?.lng, radiusM, goalFilter],
    queryFn: async () => {
      if (!userId || !coords) return [];
      const { data, error } = await supabase.rpc('find_nearby_users', {
        my_lat: coords.lat,
        my_lng: coords.lng,
        radius_m: radiusM,
        my_user_id: userId,
        goal_filter: goalFilter,
      });
      if (error) throw error;
      return (data ?? []) as NearbyUser[];
    },
    enabled: !!userId && !!coords,
    staleTime: 60_000,
  });
}

export function useBuddyRequests() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery<{ incoming: RequestWithUser[]; outgoing: RequestWithUser[] }>({
    queryKey: ['buddy_requests', userId],
    queryFn: async () => {
      if (!userId) return { incoming: [], outgoing: [] };
      const [incomingRes, outgoingRes] = await Promise.all([
        supabase
          .from('buddy_requests')
          .select('*, user:sender_id(id, display_name, avatar_url, primary_goal)')
          .eq('receiver_id', userId)
          .eq('status', 'pending'),
        supabase
          .from('buddy_requests')
          .select('*, user:receiver_id(id, display_name, avatar_url, primary_goal)')
          .eq('sender_id', userId)
          .eq('status', 'pending'),
      ]);
      if (incomingRes.error) throw incomingRes.error;
      if (outgoingRes.error) throw outgoingRes.error;
      return {
        incoming: (incomingRes.data ?? []) as RequestWithUser[],
        outgoing: (outgoingRes.data ?? []) as RequestWithUser[],
      };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useBuddyConnections() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery<ConnectionWithUser[]>({
    queryKey: ['buddy_connections', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data: connections, error } = await supabase
        .from('buddy_connections')
        .select('*')
        .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);
      if (error) throw error;

      const connectionIds = (connections ?? []).map(c =>
        c.user_a_id === userId ? c.user_b_id : c.user_a_id
      );
      if (connectionIds.length === 0) return [];

      const { data: buddyUsers } = await supabase
        .from('users')
        .select('id, display_name, avatar_url, primary_goal')
        .in('id', connectionIds);

      const userMap: Record<string, { id: string; display_name: string; avatar_url: string | null; primary_goal: string }> = {};
      (buddyUsers ?? []).forEach(u => { userMap[u.id] = u; });

      return (connections ?? []).map(c => ({
        ...c,
        other_user: userMap[c.user_a_id === userId ? c.user_b_id : c.user_a_id] ?? {
          id: '', display_name: 'Unknown', avatar_url: null, primary_goal: 'build_muscle',
        },
      })) as ConnectionWithUser[];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useSendBuddyRequest() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (receiverId: string) => {
      if (!userId) throw new Error('Not authenticated');
      const { error } = await supabase.from('buddy_requests').insert({
        sender_id: userId,
        receiver_id: receiverId,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['buddy_requests', userId] }),
  });
}

export function useAcceptRequest() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, senderId }: { requestId: string; senderId: string }) => {
      const { error: connError } = await supabase.from('buddy_connections').insert({
        user_a_id: userId,
        user_b_id: senderId,
      });
      if (connError && !connError.message.includes('duplicate')) throw connError;
      const { error: reqError } = await supabase
        .from('buddy_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);
      if (reqError) throw reqError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buddy_requests', userId] });
      queryClient.invalidateQueries({ queryKey: ['buddy_connections', userId] });
    },
  });
}

export function useDeclineRequest() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('buddy_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['buddy_requests', userId] }),
  });
}
