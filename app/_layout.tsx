import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
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

SplashScreen.preventAutoHideAsync();

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id).then(async () => {
          setLoading(false);
          SplashScreen.hideAsync();
          const token = await registerForPushNotifications();
          if (token) {
            useAuthStore.getState().updatePushToken(token);
          }
        }).catch(() => { setLoading(false); SplashScreen.hideAsync(); });
      } else {
        setLoading(false);
        SplashScreen.hideAsync();
      }
    }).catch(() => { setLoading(false); SplashScreen.hideAsync(); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the reset link in their email — navigate to reset screen
        // without setting session so auth layout doesn't redirect them away
        router.replace({ pathname: '/(auth)/reset-password', params: { mode: 'link' } });
        setLoading(false);
        return;
      }
      setSession(session);
      if (session) {
        await fetchProfile(session.user.id);
      } else {
        useAuthStore.getState().clear();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
