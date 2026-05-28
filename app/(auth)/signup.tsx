import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, typography, spacing, fonts } from '../../constants/theme';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';


export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters';
    return e;
  }

  async function handleSignup() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: referralCode.trim() ? { referred_by_code: referralCode.trim().toUpperCase() } : {},
        },
      });
      if (error) { Alert.alert('Sign up failed', error.message); return; }

      // Supabase returns an empty identities array when the email is already registered.
      if (!data.user?.identities?.length) {
        Alert.alert('Account already exists', 'An account with this email already exists. Try logging in instead.');
        return;
      }

      // The public.users row is created automatically by the handle_new_user DB trigger.
      if (!data.session) {
        // Email confirmation is ON — send user to OTP verify screen.
        router.push({ pathname: '/(auth)/verify', params: { email: email.trim() } });
      } else {
        // Email confirmation is OFF — go straight to onboarding.
        router.replace('/(auth)/onboarding/1');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>🌙 Create Account</Text>
      <Text style={styles.subtitle}>Join the Mayari community</Text>

      <View style={styles.form}>
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          placeholder="juan@example.com"
          error={errors.email}
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.password}
        />
        <Input
          label="Referral Code (optional)"
          value={referralCode}
          onChangeText={setReferralCode}
          autoCapitalize="characters"
          placeholder="e.g. ABCD1234"
        />

        <Button label="Create Account" onPress={handleSignup} loading={loading} style={styles.btn} />

        <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.loginLink}>Already have an account? <Text style={styles.loginLinkBold}>Log in</Text></Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.primary },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['2xl'],
  },
  title: {
    color: colors.brand.secondary,
    fontSize: typography['3xl'],
    fontFamily: fonts.extrabold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: typography.base,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  form: { gap: 0 },
  btn: { marginTop: spacing.sm },
  loginLink: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.lg,
    fontSize: typography.sm,
    fontFamily: fonts.regular,
  },
  loginLinkBold: {
    color: colors.brand.primary,
    fontFamily: fonts.semibold,
  },
});
