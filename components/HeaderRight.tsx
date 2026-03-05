import { useRouter } from 'expo-router';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Settings, Lock } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useSecurity } from '@/contexts/SecurityContext';

export default function HeaderRight() {
  const router = useRouter();
  const { isSetup, lockApp } = useSecurity();
  return (
    <View style={styles.headerRight}>
      {isSetup && (
        <TouchableOpacity onPress={lockApp} style={styles.headerButton} testID="lock-button">
          <Lock size={22} color={Colors.text} />
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={() => router.push('/settings')} style={styles.headerButton} testID="settings-button">
        <Settings size={24} color={Colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginRight: 8,
  },
  headerButton: {
    padding: 4,
  },
});
