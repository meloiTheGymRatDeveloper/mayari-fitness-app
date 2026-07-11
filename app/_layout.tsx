import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { AppState } from 'react-native';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { queryClient } from '../lib/queryClient';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { registerPushIfGranted } from '../lib/pushNotifications';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const { setSession, setLoading, fetchProfile } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    let startupDone = false;
    const finishStartup = () => {
      if (startupDone) return;
      startupDone = true;
      clearTimeout(splashTimeout);
      setLoading(false);
      SplashScreen.hideAsync();
    };

    // Safety net: never strand the user on the splash screen. If session
    // restore hangs (dead sockets or pending token refresh after iOS killed
    // the backgrounded app), proceed — index.tsx re-routes reactively once
    // the session eventually lands in the store.
    const splashTimeout = setTimeout(finishStartup, 10_000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id).then(async () => {
          finishStartup();
          const token = await registerPushIfGranted();
          if (token) {
            useAuthStore.getState().updatePushToken(token);
          }
        }).catch(finishStartup);
      } else {
        finishStartup();
      }
    }).catch(finishStartup);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the reset link in their email — navigate to reset screen
        // without setting session so auth layout doesn't redirect them away
        router.replace({ pathname: '/(auth)/reset-password', params: { mode: 'link' } });
        setLoading(false);
        return;
      }
      setSession(session);
      // This callback runs while supabase-js holds its internal auth lock.
      // Calling back into the client here (fetchProfile) deadlocks the token
      // refresh that fires on cold start with an expired session — the cause
      // of the app freezing on the splash screen after a background kill.
      // Defer to the next tick so the lock is released first.
      setTimeout(() => {
        if (session) {
          fetchProfile(session.user.id).finally(() => setLoading(false));
        } else {
          useAuthStore.getState().clear();
          setLoading(false);
        }
      }, 0);
    });

    // Supabase's token auto-refresh timers freeze while the app is
    // backgrounded; restart them on foreground so the session is refreshed
    // proactively instead of stalling the next request after resume.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      clearTimeout(splashTimeout);
      subscription.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </QueryClientProvider>
  );
}
