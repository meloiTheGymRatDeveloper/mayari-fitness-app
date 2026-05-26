import { Stack } from 'expo-router';
import { colors } from '../../../constants/theme';

export default function CoachLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg.primary },
        headerTintColor: colors.text.primary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg.primary },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="browse" options={{ headerShown: false }} />
      <Stack.Screen name="plan" options={{ title: 'Plan Preview' }} />
      <Stack.Screen name="plan-day" options={{ title: '' }} />
    </Stack>
  );
}
