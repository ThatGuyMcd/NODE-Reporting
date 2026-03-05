import { Stack } from 'expo-router';
import Colors from '@/constants/colors';
import HeaderRight from '@/components/HeaderRight';

export default function ReceiptsLayout() {
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
          title: 'Receipts',
          headerRight: () => <HeaderRight />,
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          title: 'Add Receipt',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Edit Receipt',
        }}
      />
    </Stack>
  );
}
