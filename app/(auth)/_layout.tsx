import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';

export default function AuthLayout() {
  const router = useRouter();
  const { session, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    if (session) {
      router.replace('/(tabs)');
    }
  }, [session, isLoading]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
