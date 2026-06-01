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
      {/* Landing */}
      <Stack.Screen name="index" options={{ headerShown: false }} />

      {/* Gym screens (relocated) */}
      <Stack.Screen name="gym/index" options={{ headerShown: false }} />
      <Stack.Screen name="gym/active" options={{ title: 'Active Workout', gestureEnabled: false, headerLeft: () => null }} />
      <Stack.Screen name="gym/summary" options={{ title: 'Workout Complete', gestureEnabled: false, headerLeft: () => null }} />
      <Stack.Screen name="gym/history" options={{ title: 'History' }} />
      <Stack.Screen name="gym/session/[id]" options={{ title: 'Session' }} />
      <Stack.Screen name="gym/records" options={{ title: 'Personal Records' }} />
      <Stack.Screen name="gym/exercise/index" options={{ title: 'Exercise Library' }} />
      <Stack.Screen name="gym/exercise/[id]" options={{ title: 'Exercise' }} />
      <Stack.Screen name="gym/[planId]/index" options={{ title: 'Plan' }} />
      <Stack.Screen name="gym/[planId]/[dayIdx]" options={{ title: 'Session' }} />

      {/* Home workout screens */}
      <Stack.Screen name="home/index" options={{ headerShown: false }} />
      <Stack.Screen name="home/active" options={{ title: 'Home Workout', gestureEnabled: false, headerLeft: () => null }} />
      <Stack.Screen name="home/summary" options={{ title: 'Workout Complete', gestureEnabled: false, headerLeft: () => null }} />

      {/* Running screens */}
      <Stack.Screen name="running/index" options={{ headerShown: false }} />
      <Stack.Screen name="running/active" options={{ title: 'Active Run', gestureEnabled: false, headerLeft: () => null }} />
      <Stack.Screen name="running/summary" options={{ title: 'Run Complete', gestureEnabled: false, headerLeft: () => null }} />
      <Stack.Screen name="running/history" options={{ title: 'Run History' }} />

      {/* Cycling screens */}
      <Stack.Screen name="cycling/index" options={{ headerShown: false }} />
      <Stack.Screen name="cycling/active" options={{ title: 'Active Ride', gestureEnabled: false, headerLeft: () => null }} />
      <Stack.Screen name="cycling/summary" options={{ title: 'Ride Complete', gestureEnabled: false, headerLeft: () => null }} />
      <Stack.Screen name="cycling/history" options={{ title: 'Ride History' }} />
    </Stack>
  );
}
