import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';

export default function AuthLayout() {
  const router = useRouter();
  const { session, profile, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    if (session && profile?.username) {
      router.replace('/(tabs)');
    }
  }, [session, profile, isLoading]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
