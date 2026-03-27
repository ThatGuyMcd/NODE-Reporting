import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Lock, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useSecurity } from '@/contexts/SecurityContext';

type Step = 'current_pin' | 'new_pin' | 'confirm_pin' | 'success';

export default function SecuritySettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { changePin } = useSecurity();
  const [step, setStep] = useState<Step>('current_pin');
  const [currentPin, setCurrentPin] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

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

  const transitionTo = useCallback((nextStep: Step) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
      setError('');
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  }, [fadeAnim]);

  const handleDigitPress = useCallback((digit: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setError('');

    if (step === 'current_pin') {
      if (currentPin.length < 4) {
        const updated = currentPin + digit;
        setCurrentPin(updated);
        if (updated.length === 4) {
          setTimeout(() => transitionTo('new_pin'), 200);
        }
      }
    } else if (step === 'new_pin') {
      if (newPin.length < 4) {
        const updated = newPin + digit;
        setNewPin(updated);
        if (updated.length === 4) {
          setTimeout(() => transitionTo('confirm_pin'), 200);
        }
      }
    } else if (step === 'confirm_pin') {
      if (confirmPin.length < 4) {
        const updated = confirmPin + digit;
        setConfirmPin(updated);
        if (updated.length === 4) {
          if (updated === newPin) {
            handleChangePin(currentPin, newPin);
          } else {
            triggerShake();
            setError('PINs do not match. Try again.');
            setTimeout(() => setConfirmPin(''), 300);
          }
        }
      }
    }
  }, [step, currentPin, newPin, confirmPin, transitionTo, triggerShake]);

  const handleChangePin = useCallback(async (current: string, pin: string) => {
    const success = await changePin(current, pin);
    if (success) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      transitionTo('success');
    } else {
      triggerShake();
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      transitionTo('current_pin');
      setTimeout(() => {
        setError('Current PIN is incorrect.');
      }, 200);
    }
  }, [changePin, transitionTo, triggerShake]);

  const handleDelete = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (step === 'current_pin') {
      setCurrentPin((prev) => prev.slice(0, -1));
    } else if (step === 'new_pin') {
      setNewPin((prev) => prev.slice(0, -1));
    } else if (step === 'confirm_pin') {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
  }, [step]);

  const getPinForStep = (): string => {
    switch (step) {
      case 'current_pin': return currentPin;
      case 'new_pin': return newPin;
      case 'confirm_pin': return confirmPin;
      default: return '';
    }
  };

  const getTitle = (): string => {
    switch (step) {
      case 'current_pin': return 'Enter Current PIN';
      case 'new_pin': return 'Enter New PIN';
      case 'confirm_pin': return 'Confirm New PIN';
      case 'success': return 'PIN Changed';
      default: return '';
    }
  };

  const getSubtitle = (): string => {
    switch (step) {
      case 'current_pin': return 'Verify your identity first';
      case 'new_pin': return 'Choose a new 4-digit PIN';
      case 'confirm_pin': return 'Re-enter your new PIN to confirm';
      case 'success': return 'Your PIN has been updated successfully';
      default: return '';
    }
  };

  const currentPinDisplay = getPinForStep();

  const renderDots = () => (
    <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < currentPinDisplay.length && styles.dotFilled,
          ]}
        />
      ))}
    </Animated.View>
  );

  const renderKeypad = () => (
    <View style={styles.keypad}>
      {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', 'del']].map((row, ri) => (
        <View key={ri} style={styles.keypadRow}>
          {row.map((key, ki) => {
            if (key === '') return <View key={ki} style={styles.keypadButton} />;
            if (key === 'del') {
              return (
                <TouchableOpacity
                  key={ki}
                  style={styles.keypadButton}
                  onPress={handleDelete}
                  testID="pin-delete"
                >
                  <Text style={styles.keypadDeleteText}>Delete</Text>
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                key={ki}
                style={styles.keypadButton}
                onPress={() => handleDigitPress(key)}
                activeOpacity={0.6}
                testID={`pin-key-${key}`}
              >
                <Text style={styles.keypadText}>{key}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );

  if (step === 'success') {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
        <Stack.Screen options={{ title: 'Change PIN' }} />
        <View style={styles.successContent}>
          <View style={styles.successCircle}>
            <CheckCircle size={48} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>PIN Changed</Text>
          <Text style={styles.successSubtitle}>
            Your PIN has been updated successfully.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
          testID="done-button"
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
      <Stack.Screen options={{ title: 'Change PIN' }} />
      <Animated.View style={[styles.pinContent, { opacity: fadeAnim }]}>
        <View style={styles.lockIconSmall}>
          <Lock size={32} color={Colors.primary} />
        </View>
        <Text style={styles.pinTitle}>{getTitle()}</Text>
        <Text style={styles.pinSubtitle}>{getSubtitle()}</Text>

        <View style={styles.stepIndicator}>
          {['current_pin', 'new_pin', 'confirm_pin'].map((s, i) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                (step === s || 
                  (step === 'new_pin' && i === 0) ||
                  (step === 'confirm_pin' && i <= 1)
                ) && styles.stepDotActive,
              ]}
            />
          ))}
        </View>

        {renderDots()}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </Animated.View>
      {renderKeypad()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
  },
  pinContent: {
    alignItems: 'center' as const,
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  lockIconSmall: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 20,
  },
  pinTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  pinSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center' as const,
  },
  stepIndicator: {
    flexDirection: 'row' as const,
    gap: 8,
    marginBottom: 28,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
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
  },
  keypad: {
    paddingHorizontal: 40,
    paddingBottom: 10,
  },
  keypadRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 12,
  },
  keypadButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.backgroundCard,
  },
  keypadText: {
    fontSize: 28,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  keypadDeleteText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  successContent: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 28,
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    marginHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center' as const,
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
