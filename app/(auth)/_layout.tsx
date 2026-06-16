import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';

export default function AuthLayout() {
  const router = useRouter();
  const { session, profile, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    if (!session) return;
    if (profile?.username) {
      router.replace('/(tabs)');
    } else if (profile && !profile.username) {
      // Signed in but onboarding incomplete — resume instead of stranding on auth screens.
      router.replace('/(auth)/onboarding/1');
    }
  }, [session, profile, isLoading]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
