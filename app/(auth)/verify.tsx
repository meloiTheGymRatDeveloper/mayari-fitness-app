import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, typography, spacing } from '../../constants/theme';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function VerifyScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleVerify() {
    if (!token.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: token.trim(),
        type: 'signup',
      });
      if (error) {
        Alert.alert('Verification failed', error.message);
        return;
      }
      router.replace('/(auth)/onboarding/1');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) Alert.alert('Failed to resend', error.message);
      else Alert.alert('Sent!', 'Check your email for the new code.');
    } finally {
      setResending(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📧</Text>
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.body}>
        We sent a verification code to{'\n'}
        <Text style={styles.email}>{email}</Text>
      </Text>

      <Input
        label="Verification Code"
        value={token}
        onChangeText={setToken}
        keyboardType="number-pad"
        placeholder="········"
        style={styles.codeInput}
      />

      <Button label="Verify Email" onPress={handleVerify} loading={loading} style={styles.btn} />

      <Button
        label={resending ? 'Sending...' : "Didn't get a code? Resend"}
        variant="ghost"
        onPress={handleResend}
        disabled={resending}
      />

      <Button
        label="← Back to Sign Up"
        variant="ghost"
        onPress={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text.primary,
    fontSize: typography['2xl'],
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  body: {
    color: colors.text.secondary,
    fontSize: typography.base,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  email: {
    color: colors.brand.secondary,
    fontWeight: '600',
  },
  codeInput: {
    textAlign: 'center',
    fontSize: typography['2xl'],
    letterSpacing: 8,
    fontWeight: 'bold',
  },
  btn: { marginBottom: spacing.sm },
});
