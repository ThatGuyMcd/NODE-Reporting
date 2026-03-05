import { Stack } from 'expo-router';
import Colors from '@/constants/colors';
import HeaderRight from '@/components/HeaderRight';

export default function DashboardLayout() {
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
          title: 'Dashboard',
          headerLargeTitle: true,
          headerRight: () => <HeaderRight />,
        }}
      />
    </Stack>
  );
}
