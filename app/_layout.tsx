import 'react-native-gesture-handler';
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from '@/providers/QueryProvider';
import { RadioProvider } from '@/context/RadioContext';
import { FavoritosProvider } from '@/context/FavoritosContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <FavoritosProvider>
        <RadioProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="horarios/index" />
            <Stack.Screen name="horarios/[id]" />
            <Stack.Screen name="mas/index" />
            <Stack.Screen name="mas/clima" />
          </Stack>
        </RadioProvider>
        </FavoritosProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
