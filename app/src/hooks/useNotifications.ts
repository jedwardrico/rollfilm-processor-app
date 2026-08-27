import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('dev-timer', {
      name: 'Dev Timer',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 400, 200, 400],
      sound: 'default',
    });
  }

  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return status === 'granted';
}

export interface ScheduledStep {
  name: string;
  offsetSeconds: number; // seconds from "now" when this step ends
}

// Schedule a notification for each step completion.
// Returns the list of notification IDs so they can be cancelled on pause.
export async function scheduleStepNotifications(
  steps: ScheduledStep[],
  baseOffsetSeconds: number = 0 // seconds already elapsed in the current step
): Promise<string[]> {
  const ids: string[] = [];
  let elapsed = baseOffsetSeconds;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const seconds = step.offsetSeconds - elapsed;
    if (seconds <= 0) {
      elapsed -= step.offsetSeconds;
      continue;
    }

    const isLast = i === steps.length - 1;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: isLast ? '🎞️ Development complete!' : `✅ ${step.name} done`,
        body: isLast
          ? 'Time to fix and wash your film.'
          : `Next: ${steps[i + 1]?.name ?? 'done'}`,
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
      },
    });
    ids.push(id);
    elapsed = 0; // subsequent steps are relative to step completion, not now
  }

  return ids;
}

export async function cancelStepNotifications(ids: string[]) {
  await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id)));
}

// Hook that listens for notification taps (no-op here, extend as needed)
export function useNotificationListener(onTap?: (notification: Notifications.Notification) => void) {
  const listenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!onTap) return;
    listenerRef.current = Notifications.addNotificationResponseReceivedListener(resp => {
      onTap(resp.notification);
    });
    return () => listenerRef.current?.remove();
  }, [onTap]);
}
