import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { requestNotificationPermissions } from '../src/hooks/useNotifications';

export default function RootLayout() {
  useEffect(() => {
    requestNotificationPermissions().catch(console.error);
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="rolls/new" options={{ presentation: 'modal', headerShown: true, title: 'Log New Roll' }} />
        <Stack.Screen name="rolls/[id]" options={{ headerShown: true, title: 'Roll Details' }} />
        <Stack.Screen name="timer/[id]" options={{ headerShown: true, title: 'Dev Timer' }} />
        <Stack.Screen name="chemicals/new" options={{ presentation: 'modal', headerShown: true, title: 'Add Chemical' }} />
        <Stack.Screen name="procedures/new" options={{ presentation: 'modal', headerShown: true, title: 'New Procedure' }} />
        <Stack.Screen name="procedures/[id]" options={{ headerShown: true, title: 'Procedure' }} />
        <Stack.Screen name="(tabs)/stats" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
