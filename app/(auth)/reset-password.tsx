import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, typography, spacing } from '../../constants/theme';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email, mode } = useLocalSearchParams<{ email?: string; mode?: string }>();
  const isLinkMode = mode === 'link';
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!isLinkMode && !token.trim()) { Alert.alert('', 'Enter the 6-digit code from your email'); return; }
    if (password.length < 8) { Alert.alert('', 'Password must be at least 8 characters'); return; }
    if (password !== confirm) { Alert.alert('', 'Passwords do not match'); return; }

    setLoading(true);
    try {
      if (!isLinkMode) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: email ?? '',
          token: token.trim(),
          type: 'recovery',
        });
        if (verifyError) { Alert.alert('Invalid code', verifyError.message); return; }
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) { Alert.alert('Update failed', updateError.message); return; }

      Alert.alert('Password updated!', 'You can now log in with your new password.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Sent!', 'Check your email for a new code.');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🔐</Text>
      <Text style={styles.title}>New Password</Text>
      {!isLinkMode && (
        <Text style={styles.body}>
          Enter the code sent to{'\n'}
          <Text style={styles.emailText}>{email}</Text>
        </Text>
      )}

      {!isLinkMode && (
        <Input
          label="Reset Code"
          value={token}
          onChangeText={setToken}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
          style={styles.codeInput}
        />
      )}
      <Input
        label="New Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="At least 8 characters"
      />
      <Input
        label="Confirm Password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        placeholder="Repeat your new password"
      />

      <Button label="Reset Password" onPress={handleReset} loading={loading} style={styles.btn} />
      {!isLinkMode && <Button label="Resend Code" variant="ghost" onPress={handleResend} />}
      <Button label="← Back" variant="ghost" onPress={() => router.back()} />
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
  emoji: { fontSize: 64, textAlign: 'center', marginBottom: spacing.lg },
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
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  emailText: { color: colors.brand.secondary, fontWeight: '600' },
  codeInput: {
    textAlign: 'center',
    fontSize: typography['2xl'],
    letterSpacing: 8,
    fontWeight: 'bold',
  },
  btn: { marginBottom: spacing.sm },
});
