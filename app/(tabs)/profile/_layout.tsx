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
      <Stack.Screen name="measurements" options={{ title: 'Measurements' }} />
      <Stack.Screen name="progress" options={{ title: 'Progress & Analytics' }} />
      <Stack.Screen name="buddies/find" options={{ title: 'Find Gym Buddies' }} />
      <Stack.Screen name="buddies/list" options={{ title: 'My Buddies' }} />
      <Stack.Screen name="buddies/chat/[id]" options={{ title: 'Chat' }} />
    </Stack>
  );
}
