import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { colors, typography, spacing, fonts } from '../../constants/theme';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    const trimmed = email.trim();
    if (!trimmed) { Alert.alert('', 'Please enter your email'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: Linking.createURL('reset-password'),
      });
      if (error) { Alert.alert('Error', error.message); return; }
      router.push({ pathname: '/(auth)/reset-password', params: { email: trimmed } });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🔑</Text>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.body}>
        Enter your email and we'll send a 6-digit code to reset your password.
      </Text>

      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="juan@example.com"
        autoFocus
      />

      <Button label="Send Reset Code" onPress={handleSend} loading={loading} style={styles.btn} />
      <Button label="← Back to Login" variant="ghost" onPress={() => router.back()} />
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
    fontFamily: fonts.extrabold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  body: {
    color: colors.text.secondary,
    fontSize: typography.sm,
    fontFamily: fonts.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  btn: { marginBottom: spacing.sm },
});
