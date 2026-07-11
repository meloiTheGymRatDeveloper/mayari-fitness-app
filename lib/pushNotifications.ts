// lib/pushNotifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

async function getToken(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

/** Registers ONLY if permission was already granted. Never prompts. */
export async function registerPushIfGranted(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return null;
  return getToken();
}

/** Prompts for permission (OS dialog), then registers. Call from onboarding. */
export async function requestAndRegisterPush(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;
  return getToken();
}
