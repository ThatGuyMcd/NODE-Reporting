import React, { useState, useCallback } from 'react';
import { Stack, useFocusEffect } from 'expo-router';
import Colors from '@/constants/colors';
import { useSecurity } from '@/contexts/SecurityContext';
import SettingsLockScreen from '@/components/SettingsLockScreen';

export default function SettingsLayout() {
  const { isSetup } = useSecurity();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useFocusEffect(
    useCallback(() => {
      setIsAuthenticated(false);
    }, [])
  );

  const handleUnlock = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  if (isSetup && !isAuthenticated) {
    return <SettingsLockScreen onUnlock={handleUnlock} />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.background,
        },
        headerTintColor: Colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        contentStyle: {
          backgroundColor: Colors.background,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Settings',
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: 'Business Profile',
        }}
      />
      <Stack.Screen
        name="export"
        options={{
          title: 'Export Data',
        }}
      />
      <Stack.Screen
        name="account"
        options={{
          title: 'NODEView Portal',
        }}
      />
      <Stack.Screen
        name="email"
        options={{
          title: 'Email Settings',
        }}
      />
      <Stack.Screen
        name="products"
        options={{
          title: 'Product Database',
        }}
      />
      <Stack.Screen
        name="gocardless"
        options={{
          title: 'GoCardless Payments',
        }}
      />
      <Stack.Screen
        name="logs"
        options={{
          title: 'Activity Logs',
        }}
      />
      <Stack.Screen
        name="security"
        options={{
          title: 'Change PIN',
        }}
      />
    </Stack>
  );
}
