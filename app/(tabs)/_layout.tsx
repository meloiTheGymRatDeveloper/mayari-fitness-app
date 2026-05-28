import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { House, Barbell, ForkKnife, User } from 'phosphor-react-native';
import { useAuthStore } from '../../stores/authStore';
import { colors, fonts } from '../../constants/theme';
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
            height: 64,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: colors.icon.active,
          tabBarInactiveTintColor: colors.icon.inactive,
          tabBarLabelStyle: {
            fontFamily: fonts.bold,
            fontSize: 9,
            letterSpacing: 0.3,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) =>
              focused
                ? <House size={24} color={color} weight="duotone" />
                : <House size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="workout"
          options={{
            title: 'Workout',
            tabBarIcon: ({ color, focused }) =>
              focused
                ? <Barbell size={24} color={color} weight="duotone" />
                : <Barbell size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="coach"
          options={{
            title: '',
            tabBarButton: (props) => <TabBarPlusButton {...props} />,
          }}
        />
        <Tabs.Screen
          name="nutrition"
          options={{
            title: 'Nutrition',
            tabBarIcon: ({ color, focused }) =>
              focused
                ? <ForkKnife size={24} color={color} weight="duotone" />
                : <ForkKnife size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) =>
              focused
                ? <User size={24} color={color} weight="duotone" />
                : <User size={24} color={color} />,
          }}
        />
        <Tabs.Screen name="log" options={{ href: null }} />
      </Tabs>
      <LogModal />
    </>
  );
}
