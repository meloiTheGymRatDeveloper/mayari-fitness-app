import { Stack } from 'expo-router';
import { colors } from '../../../constants/theme';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg.primary },
        headerTintColor: colors.text.primary,
        headerShadowVisible: false,
        headerBackTitle: '',
        headerTitleStyle: { color: colors.text.primary, fontWeight: '700' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="goals" options={{ headerShown: false }} />
      <Stack.Screen name="measurements" options={{ title: 'Measurements', headerBackTitle: 'Back' }} />
      <Stack.Screen name="progress" options={{ title: 'Progress & Analytics', headerBackTitle: 'Back' }} />
      <Stack.Screen name="referral" options={{ title: 'Referrals', headerBackTitle: 'Back' }} />
      <Stack.Screen name="subscription" options={{ title: 'Subscription', headerBackTitle: 'Back' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings', headerBackTitle: 'Back' }} />
      <Stack.Screen name="streaks" options={{ title: 'Streaks', headerBackTitle: 'Back' }} />
      <Stack.Screen name="buddies/find" options={{ title: 'Find Gym Buddies', headerBackTitle: 'Back' }} />
      <Stack.Screen name="buddies/list" options={{ title: 'My Buddies', headerBackTitle: 'Back' }} />
      <Stack.Screen name="buddies/chat/[id]" options={{ title: 'Chat', headerBackTitle: 'Back' }} />
    </Stack>
  );
}
