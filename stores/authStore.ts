import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types/database';

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  fetchProfile: (userId: string) => Promise<void>;
  updateNetCarbsDisplay: (value: boolean) => Promise<void>;
  updatePushToken: (token: string) => Promise<void>;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  isLoading: true,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  fetchProfile: async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    set({ profile: data ?? null });
  },
  updateNetCarbsDisplay: async (value: boolean) => {
    const state = get();
    if (!state.session?.user.id) return;
    await supabase.from('users').update({ net_carbs_display: value }).eq('id', state.session.user.id);
    const { data } = await supabase.from('users').select('*').eq('id', state.session.user.id).single();
    set({ profile: data ?? null });
  },
  updatePushToken: async (token: string) => {
    const state = get();
    if (!state.session?.user.id) return;
    const { error } = await supabase
      .from('users')
      .update({ push_token: token })
      .eq('id', state.session.user.id);
    if (!error && state.profile) {
      set({ profile: { ...state.profile, push_token: token } });
    }
  },
  clear: () => set({ session: null, profile: null }),
}));
