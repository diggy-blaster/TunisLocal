// apps/mobile/hooks/usePushNotifications.js
// Sets up Expo push notifications, registers token with backend,
// and handles foreground notification display.

import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://tunislocal.tn';

// How foreground notifications appear
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission not granted.');
    return null;
  }

  // Android: create notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:       'TunisLocal',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#185FA5',
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

export function usePushNotifications(session) {
  const [expoPushToken, setExpoPushToken] = useState(null);
  const notificationListener  = useRef(null);
  const responseListener      = useRef(null);
  const router                = useRouter();

  useEffect(() => {
    if (!session?.user) return;

    registerForPushNotificationsAsync().then(async (token) => {
      if (!token) return;
      setExpoPushToken(token);

      // Register with backend
      await fetch(`${API_BASE}/api/push-tokens`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, platform: Platform.OS }),
      });
    });

    // Handle notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Foreground notification:', notification);
        // Could show an in-app banner here
      }
    );

    // Handle tap on notification → deep link into app
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;

        if (data?.booking_id) {
          router.push(`/bookings/${data.booking_id}`);
        } else if (data?.prompt_review && data?.booking_id) {
          router.push(`/reviews/new?booking_id=${data.booking_id}`);
        }
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [session?.user?.id]);

  // Deregister token on logout
  async function deregisterToken() {
    if (!expoPushToken) return;

    await fetch(`${API_BASE}/api/push-tokens`, {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token: expoPushToken }),
    });
  }

  return { expoPushToken, deregisterToken };
}
