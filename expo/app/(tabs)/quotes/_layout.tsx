import { Stack } from 'expo-router';
import Colors from '@/constants/colors';
import HeaderRight from '@/components/HeaderRight';

export default function QuotesLayout() {
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
          title: 'Quotes',
          headerRight: () => <HeaderRight />,
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: 'Create Quote',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Quote Details',
        }}
      />
    </Stack>
  );
}
