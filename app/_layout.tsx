import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BusinessProvider } from '@/contexts/BusinessContext';
import { PositronAuthProvider } from '@/contexts/PositronAuthContext';
import { SecurityProvider, useSecurity } from '@/contexts/SecurityContext';
import { trpc, trpcClient } from '@/lib/trpc';
import PinSetupScreen from '@/components/PinSetupScreen';
import LockScreen from '@/components/LockScreen';
import Colors from '@/constants/colors';

SplashScreen.preventAutoHideAsync();

const createQueryClient = () => new QueryClient();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Back',
        headerStyle: {
          backgroundColor: Colors.background,
        },
        headerTintColor: Colors.text,
        contentStyle: {
          backgroundColor: Colors.background,
        },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

function SecurityGate() {
  const { isSetup, isLocked, isLoading } = useSecurity();

  if (isLoading) {
    return (
      <View style={secStyles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!isSetup) {
    return <PinSetupScreen />;
  }

  if (isLocked) {
    return <LockScreen />;
  }

  return (
    <BusinessProvider>
      <PositronAuthProvider>
        <RootLayoutNav />
      </PositronAuthProvider>
    </BusinessProvider>
  );
}

const secStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function RootLayout() {
  const [queryClient] = useState(() => createQueryClient());

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SecurityProvider>
            <SecurityGate />
          </SecurityProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
