import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Fingerprint, ScanFace, Settings } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useSecurity } from '@/contexts/SecurityContext';

interface SettingsLockScreenProps {
  onUnlock: () => void;
}

export default function SettingsLockScreen({ onUnlock }: SettingsLockScreenProps) {
  const insets = useSafeAreaInsets();
  const {
    securityMethod,
    biometricsAvailable,
    biometricType,
    verifyPin,
    verifyBiometrics,
  } = useSecurity();
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [attempts, setAttempts] = useState<number>(0);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const canUseBiometric = biometricsAvailable && (securityMethod === 'biometric' || securityMethod === 'both');

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const triggerShake = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleDigitPress = useCallback((digit: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setError('');

    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        setTimeout(async () => {
          const success = await verifyPin(newPin);
          if (!success) {
            triggerShake();
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            if (newAttempts >= 5) {
              setError('Too many attempts. Please wait.');
              setTimeout(() => {
                setAttempts(0);
                setPin('');
                setError('');
              }, 30000);
            } else {
              setError(`Incorrect PIN. ${5 - newAttempts} attempts remaining.`);
              setTimeout(() => setPin(''), 300);
            }
          } else {
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            onUnlock();
          }
        }, 100);
      }
    }
  }, [pin, attempts, verifyPin, triggerShake, onUnlock]);

  const handleDelete = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const handleBiometricUnlock = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const success = await verifyBiometrics();
    if (success) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onUnlock();
    }
  }, [verifyBiometrics, onUnlock]);

  useEffect(() => {
    if (canUseBiometric) {
      const timer = setTimeout(() => {
        handleBiometricUnlock();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [canUseBiometric, handleBiometricUnlock]);

  const isLockedOut = attempts >= 5;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 30, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.topSection}>
        <Animated.View style={[styles.lockIcon, { transform: [{ scale: pulseAnim }] }]}>
          <Settings size={28} color={Colors.primary} />
        </Animated.View>
        <Text style={styles.title}>Settings Locked</Text>
        <Text style={styles.subtitle}>Authenticate to access settings</Text>

        <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < pin.length && styles.dotFilled,
              ]}
            />
          ))}
        </Animated.View>

        {error ? <Text style={styles.errorText}>{error}</Text> : <View style={styles.errorPlaceholder} />}
      </View>

      <View style={styles.bottomSection}>
        <View style={styles.keypad}>
          {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['bio', '0', 'del']].map((row, ri) => (
            <View key={ri} style={styles.keypadRow}>
              {row.map((key, ki) => {
                if (key === 'bio') {
                  if (canUseBiometric) {
                    return (
                      <TouchableOpacity
                        key={ki}
                        style={styles.keypadButton}
                        onPress={handleBiometricUnlock}
                        disabled={isLockedOut}
                        testID="settings-biometric-unlock"
                      >
                        {biometricType === 'Face ID' ? (
                          <ScanFace size={26} color={Colors.primary} />
                        ) : (
                          <Fingerprint size={26} color={Colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  }
                  return <View key={ki} style={styles.keypadButton} />;
                }
                if (key === 'del') {
                  return (
                    <TouchableOpacity
                      key={ki}
                      style={styles.keypadButton}
                      onPress={handleDelete}
                      disabled={isLockedOut}
                      testID="settings-pin-delete"
                    >
                      <Text style={styles.keypadDeleteText}>Delete</Text>
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    key={ki}
                    style={[styles.keypadButton, isLockedOut && styles.keypadButtonDisabled]}
                    onPress={() => handleDigitPress(key)}
                    activeOpacity={0.6}
                    disabled={isLockedOut}
                    testID={`settings-pin-key-${key}`}
                  >
                    <Text style={[styles.keypadText, isLockedOut && styles.keypadTextDisabled]}>{key}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {canUseBiometric && (
          <TouchableOpacity
            style={styles.biometricHint}
            onPress={handleBiometricUnlock}
            disabled={isLockedOut}
          >
            <Text style={styles.biometricHintText}>Tap to use {biometricType}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between' as const,
  },
  topSection: {
    alignItems: 'center' as const,
    paddingHorizontal: 28,
    paddingTop: 20,
  },
  lockIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 32,
  },
  dotsRow: {
    flexDirection: 'row' as const,
    gap: 18,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
    marginTop: 16,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
  errorPlaceholder: {
    height: 36,
  },
  bottomSection: {
    paddingBottom: 10,
  },
  keypad: {
    alignItems: 'center' as const,
  },
  keypadRow: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 20,
    marginBottom: 8,
  },
  keypadButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.backgroundCard,
  },
  keypadButtonDisabled: {
    opacity: 0.3,
  },
  keypadText: {
    fontSize: 28,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  keypadTextDisabled: {
    color: Colors.textMuted,
  },
  keypadDeleteText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  biometricHint: {
    alignItems: 'center' as const,
    paddingTop: 16,
  },
  biometricHintText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
});
