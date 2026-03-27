import { Stack } from 'expo-router';
import Colors from '@/constants/colors';
import HeaderRight from '@/components/HeaderRight';

export default function TransactionsLayout() {
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
          title: 'Transactions',
          headerRight: () => <HeaderRight />,
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          title: 'Add Transaction',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Transaction',
        }}
      />
    </Stack>
  );
}
