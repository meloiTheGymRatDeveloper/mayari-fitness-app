import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../constants/theme';
import TabBarPlusButton from '../../components/ui/TabBarPlusButton';
import LogModal from '../../components/ui/LogModal';

export default function TabsLayout() {
  const router = useRouter();
  const { session, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    if (!session) router.replace('/(auth)');
  }, [session, isLoading]);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.bg.tabBar,
            borderTopColor: colors.border,
            height: 72,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: colors.brand.primary,
          tabBarInactiveTintColor: colors.text.muted,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="workout"
          options={{
            title: 'Workout',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'barbell' : 'barbell-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="log"
          options={{
            title: '',
            tabBarButton: (props) => <TabBarPlusButton {...props} />,
          }}
        />
        <Tabs.Screen
          name="coach"
          options={{
            title: 'Mayari',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'moon' : 'moon-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'More',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'grid' : 'grid-outline'} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen name="nutrition" options={{ href: null }} />
      </Tabs>
      <LogModal />
    </>
  );
}
