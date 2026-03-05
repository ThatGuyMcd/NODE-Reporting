import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Image,
} from 'react-native';
import { Shield, Fingerprint, ScanFace, ChevronRight, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useSecurity } from '@/contexts/SecurityContext';

type Step = 'welcome' | 'enter_pin' | 'confirm_pin';

export default function PinSetupScreen() {
  const insets = useSafeAreaInsets();
  const { biometricsAvailable, biometricType, setupSecurity } = useSecurity();
  const [step, setStep] = useState<Step>('welcome');
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [useBiometric, setUseBiometric] = useState<boolean>(false);
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

    if (step === 'enter_pin') {
      if (pin.length < 4) {
        const newPin = pin + digit;
        setPin(newPin);
        if (newPin.length === 4) {
          setTimeout(() => transitionTo('confirm_pin'), 200);
        }
      }
    } else if (step === 'confirm_pin') {
      if (confirmPin.length < 4) {
        const newConfirm = confirmPin + digit;
        setConfirmPin(newConfirm);
        if (newConfirm.length === 4) {
          if (newConfirm === pin) {
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            const method = useBiometric ? 'both' : 'pin';
            setupSecurity(pin, method);
          } else {
            triggerShake();
            setError('PINs do not match. Try again.');
            setTimeout(() => {
              setConfirmPin('');
            }, 300);
          }
        }
      }
    }
  }, [step, pin, confirmPin, useBiometric, setupSecurity, transitionTo, triggerShake]);

  const handleDelete = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (step === 'enter_pin') {
      setPin((prev) => prev.slice(0, -1));
    } else if (step === 'confirm_pin') {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
  }, [step]);

  const currentPin = step === 'enter_pin' ? pin : confirmPin;

  const renderDots = () => (
    <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < currentPin.length && styles.dotFilled,
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

  if (step === 'welcome') {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.welcomeContent}>
          <Image
            source={{ uri: 'https://r2-pub.rork.com/attachments/om86sit3789f114ve4wcn' }}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.iconCircle}>
            <Shield size={40} color={Colors.primary} />
          </View>
          <Text style={styles.welcomeTitle}>Secure Your Data</Text>
          <Text style={styles.welcomeSubtitle}>
            Set up a PIN{biometricsAvailable ? ` or use ${biometricType}` : ''} to protect your business information.
          </Text>

          {biometricsAvailable && (
            <TouchableOpacity
              style={[styles.optionCard, useBiometric && styles.optionCardActive]}
              onPress={() => setUseBiometric(!useBiometric)}
              activeOpacity={0.7}
              testID="biometric-toggle"
            >
              <View style={[styles.optionIconWrap, useBiometric && styles.optionIconWrapActive]}>
                {biometricType === 'Face ID' ? (
                  <ScanFace size={24} color={useBiometric ? Colors.white : Colors.primary} />
                ) : (
                  <Fingerprint size={24} color={useBiometric ? Colors.white : Colors.primary} />
                )}
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Enable {biometricType}</Text>
                <Text style={styles.optionDesc}>Quick unlock with {biometricType?.toLowerCase()}</Text>
              </View>
              <View style={[styles.checkbox, useBiometric && styles.checkboxActive]}>
                {useBiometric && <View style={styles.checkboxInner} />}
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.optionCard, styles.optionCardMuted]}
            activeOpacity={1}
          >
            <View style={styles.optionIconWrap}>
              <Lock size={24} color={Colors.primary} />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>4-Digit PIN</Text>
              <Text style={styles.optionDesc}>Always required as a backup</Text>
            </View>
            <View style={[styles.checkbox, styles.checkboxActive]}>
              <View style={styles.checkboxInner} />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => transitionTo('enter_pin')}
          activeOpacity={0.8}
          testID="continue-setup"
        >
          <Text style={styles.continueText}>Set Up PIN</Text>
          <ChevronRight size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
      <Animated.View style={[styles.pinContent, { opacity: fadeAnim }]}>
        <View style={styles.lockIconSmall}>
          <Lock size={32} color={Colors.primary} />
        </View>
        <Text style={styles.pinTitle}>
          {step === 'enter_pin' ? 'Create Your PIN' : 'Confirm Your PIN'}
        </Text>
        <Text style={styles.pinSubtitle}>
          {step === 'enter_pin'
            ? 'Enter a 4-digit PIN'
            : 'Re-enter your PIN to confirm'}
        </Text>
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
  welcomeContent: {
    paddingHorizontal: 28,
    alignItems: 'center' as const,
  },
  logoImage: {
    width: 140,
    height: 50,
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 10,
    textAlign: 'center' as const,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 36,
    paddingHorizontal: 10,
  },
  optionCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    width: '100%',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  optionCardActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(249, 115, 22, 0.06)',
  },
  optionCardMuted: {
    opacity: 0.7,
  },
  optionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 14,
  },
  optionIconWrapActive: {
    backgroundColor: Colors.primary,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  checkboxActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  checkboxInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  continueButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: Colors.primary,
    marginHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  continueText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  pinContent: {
    alignItems: 'center' as const,
    paddingHorizontal: 28,
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
});
