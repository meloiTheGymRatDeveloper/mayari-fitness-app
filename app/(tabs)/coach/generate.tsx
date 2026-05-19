// app/(tabs)/coach/generate.tsx
import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { colors, typography, spacing } from '../../../constants/theme';
import { useSendMessage } from '../../../hooks/useCoach';

const PLAN_PROMPT =
  'Generate my personalized workout plan based on my profile and goals. Output as JSON only.';

export default function GenerateScreen() {
  const router = useRouter();
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const hasStarted = useRef(false);
  const sendMessage = useSendMessage('plan_generation');

  const spinInterp = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 3000, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.2, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    sendMessage.mutateAsync(PLAN_PROMPT).then(result => {
      router.replace(({
        pathname: '/(tabs)/coach/plan',
        params: { plan: result.response },
      }) as unknown as Href);
    }).catch(() => {
      // error handled via sendMessage.isError
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (sendMessage.isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Oops, something went wrong. Try again.</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            hasStarted.current = false;
            sendMessage.reset();
            sendMessage.mutateAsync(PLAN_PROMPT).then(result => {
              router.replace(({
                pathname: '/(tabs)/coach/plan',
                params: { plan: result.response },
              }) as unknown as Href);
            }).catch(() => {});
          }}
        >
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <Animated.Text
        style={[styles.moon, { transform: [{ rotate: spinInterp }, { scale: pulse }] }]}
      >
        🌙
      </Animated.Text>
      <Text style={styles.title}>Generating your personalized plan...</Text>
      <Text style={styles.sub}>Analyzing your profile and recent activity</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  moon: { fontSize: 72, marginBottom: spacing.xl },
  title: {
    color: colors.text.primary,
    fontSize: typography.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  sub: { color: colors.text.muted, fontSize: typography.sm, textAlign: 'center' },
  errorText: {
    color: colors.error,
    fontSize: typography.base,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  retryText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
  backLink: { marginTop: spacing.sm },
  backLinkText: { color: colors.text.muted, fontSize: typography.sm },
});
