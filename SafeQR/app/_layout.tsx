import { Stack } from 'expo-router';
import React from 'react';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="pages/details" options={{ headerShown: false }} />
        <Stack.Screen name="not-found" options={{ title: 'Page Not Found' }} />
        <Stack.Screen name="pages/sandbox" options={{ headerShown: false }} />
        <Stack.Screen name="pages/PrivacyPolicy" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
