import { Stack } from 'expo-router';
import { colors } from '../../../constants/theme';

export default function WorkoutLayout() {
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
      <Stack.Screen name="generate-confirm" options={{ title: 'Generate Plan', headerBackTitle: 'Back' }} />
      <Stack.Screen name="plan" options={{ title: 'Plan Preview', headerBackTitle: 'Back' }} />
      <Stack.Screen
        name="active"
        options={{ title: 'Active Workout', gestureEnabled: false, headerLeft: () => null }}
      />
      <Stack.Screen
        name="summary"
        options={{ title: 'Workout Complete', gestureEnabled: false, headerLeft: () => null }}
      />
      <Stack.Screen name="history" options={{ title: 'History' }} />
      <Stack.Screen name="session/[id]" options={{ title: 'Session' }} />
      <Stack.Screen name="records" options={{ title: 'Personal Records' }} />
      <Stack.Screen name="exercise/index" options={{ title: 'Exercise Library' }} />
      <Stack.Screen name="exercise/[id]" options={{ title: 'Exercise' }} />
      <Stack.Screen name="[planId]/index" options={{ title: 'Plan' }} />
      <Stack.Screen name="[planId]/[dayIdx]" options={{ title: 'Session' }} />
    </Stack>
  );
}
