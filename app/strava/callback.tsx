import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../constants/theme';

const STRAVA_QUERY_KEY_PREFIX = 'strava_connection';

export default function StravaCallbackScreen() {
  const { code, error } = useLocalSearchParams<{ code?: string; error?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore(s => s.session?.user.id);
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    async function handleCallback() {
      if (error) {
        router.replace('/(tabs)/workout/running' as never);
        return;
      }

      const authCode = code ?? '';
      if (!authCode || !userId) {
        router.replace('/(tabs)/workout/running' as never);
        return;
      }

      try {
        await supabase.functions.invoke('strava-auth', {
          body: { code: authCode, userId },
        });
        queryClient.invalidateQueries({ queryKey: [STRAVA_QUERY_KEY_PREFIX, userId] });
      } catch (err) {
        console.error('Strava auth error:', err);
      } finally {
        router.replace('/(tabs)/workout/running' as never);
      }
    }

    handleCallback();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.brand.primary} />
      <Text style={styles.label}>Connecting Strava…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  label: {
    color: colors.text.secondary,
    fontSize: 14,
  },
});
