import createContextHook from '@nkzw/create-context-hook';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const SECURE_KEYS = {
  PIN: 'app_security_pin',
  METHOD: 'app_security_method',
  IS_SETUP: 'app_security_is_setup',
  LAST_ACTIVE: 'app_security_last_active',
};

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

type SecurityMethod = 'pin' | 'biometric' | 'both';

interface SecurityState {
  isSetup: boolean;
  isLocked: boolean;
  isLoading: boolean;
  securityMethod: SecurityMethod | null;
  biometricsAvailable: boolean;
  biometricType: string | null;
  setupSecurity: (pin: string, method: SecurityMethod) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlockWithBiometrics: () => Promise<boolean>;
  recordActivity: () => void;
  resetSecurity: () => Promise<void>;
  changePin: (currentPin: string, newPin: string) => Promise<boolean>;
  verifyPin: (pin: string) => Promise<boolean>;
  verifyBiometrics: () => Promise<boolean>;
  lockApp: () => void;
}

export const [SecurityProvider, useSecurity] = createContextHook((): SecurityState => {
  const queryClient = useQueryClient();
  const [isSetup, setIsSetup] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [securityMethod, setSecurityMethod] = useState<SecurityMethod | null>(null);
  const [biometricsAvailable, setBiometricsAvailable] = useState<boolean>(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const lastActiveRef = useRef<number>(Date.now());
  const appStateRef = useRef<string>(AppState.currentState);

  const securityQuery = useQuery({
    queryKey: ['security_setup'],
    queryFn: async () => {
      console.log('[Security] Loading security settings...');
      const [setupFlag, method, lastActive] = await Promise.all([
        SecureStore.getItemAsync(SECURE_KEYS.IS_SETUP),
        SecureStore.getItemAsync(SECURE_KEYS.METHOD),
        SecureStore.getItemAsync(SECURE_KEYS.LAST_ACTIVE),
      ]);

      console.log('[Security] Setup flag:', setupFlag, 'Method:', method);

      return {
        isSetup: setupFlag === 'true',
        method: method as SecurityMethod | null,
        lastActive: lastActive ? parseInt(lastActive, 10) : null,
      };
    },
  });

  useEffect(() => {
    const checkBiometrics = async () => {
      if (Platform.OS === 'web') {
        setBiometricsAvailable(false);
        setBiometricType(null);
        return;
      }
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        const available = compatible && enrolled;
        setBiometricsAvailable(available);

        if (available) {
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType('Face ID');
          } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setBiometricType('Fingerprint');
          } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
            setBiometricType('Iris');
          }
        }
        console.log('[Security] Biometrics available:', available);
      } catch (e) {
        console.log('[Security] Biometrics check error:', e);
        setBiometricsAvailable(false);
      }
    };
    checkBiometrics();
  }, []);

  useEffect(() => {
    if (securityQuery.data) {
      const { isSetup: setup, method, lastActive } = securityQuery.data;
      setIsSetup(setup);
      setSecurityMethod(method);

      if (!setup) {
        setIsLocked(false);
        return;
      }

      if (lastActive) {
        const elapsed = Date.now() - lastActive;
        if (elapsed < INACTIVITY_TIMEOUT_MS) {
          setIsLocked(false);
          lastActiveRef.current = lastActive;
          console.log('[Security] Within timeout, unlocking');
          return;
        }
      }

      setIsLocked(true);
      console.log('[Security] Timeout exceeded or no last active, locking');
    }
  }, [securityQuery.data]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      console.log('[Security] App state changed:', appStateRef.current, '->', nextAppState);

      if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        const now = Date.now();
        lastActiveRef.current = now;
        await SecureStore.setItemAsync(SECURE_KEYS.LAST_ACTIVE, now.toString());
        console.log('[Security] Saved last active time:', now);
      }

      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        if (!isSetup) {
          appStateRef.current = nextAppState;
          return;
        }

        const elapsed = Date.now() - lastActiveRef.current;
        console.log('[Security] Time away:', elapsed, 'ms, timeout:', INACTIVITY_TIMEOUT_MS);

        if (elapsed >= INACTIVITY_TIMEOUT_MS) {
          console.log('[Security] Inactivity timeout, locking app');
          setIsLocked(true);
        }
      }

      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [isSetup]);

  const setupMutation = useMutation({
    mutationFn: async ({ pin, method }: { pin: string; method: SecurityMethod }) => {
      console.log('[Security] Setting up security with method:', method);
      await SecureStore.setItemAsync(SECURE_KEYS.PIN, pin);
      await SecureStore.setItemAsync(SECURE_KEYS.METHOD, method);
      await SecureStore.setItemAsync(SECURE_KEYS.IS_SETUP, 'true');
      await SecureStore.setItemAsync(SECURE_KEYS.LAST_ACTIVE, Date.now().toString());
      return { pin, method };
    },
    onSuccess: ({ method }) => {
      setIsSetup(true);
      setSecurityMethod(method);
      setIsLocked(false);
      lastActiveRef.current = Date.now();
      queryClient.invalidateQueries({ queryKey: ['security_setup'] });
      console.log('[Security] Setup complete');
    },
  });

  const { mutateAsync: setupMutateAsync } = setupMutation;
  const setupSecurity = useCallback(async (pin: string, method: SecurityMethod) => {
    await setupMutateAsync({ pin, method });
  }, [setupMutateAsync]);

  const unlockWithPin = useCallback(async (pin: string): Promise<boolean> => {
    const storedPin = await SecureStore.getItemAsync(SECURE_KEYS.PIN);
    if (pin === storedPin) {
      setIsLocked(false);
      lastActiveRef.current = Date.now();
      await SecureStore.setItemAsync(SECURE_KEYS.LAST_ACTIVE, Date.now().toString());
      console.log('[Security] PIN unlock successful');
      return true;
    }
    console.log('[Security] PIN unlock failed');
    return false;
  }, []);

  const unlockWithBiometrics = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to unlock',
        cancelLabel: 'Use PIN',
        disableDeviceFallback: true,
      });

      if (result.success) {
        setIsLocked(false);
        lastActiveRef.current = Date.now();
        await SecureStore.setItemAsync(SECURE_KEYS.LAST_ACTIVE, Date.now().toString());
        console.log('[Security] Biometric unlock successful');
        return true;
      }
      console.log('[Security] Biometric unlock failed:', result.error);
      return false;
    } catch (e) {
      console.log('[Security] Biometric error:', e);
      return false;
    }
  }, []);

  const recordActivity = useCallback(() => {
    lastActiveRef.current = Date.now();
  }, []);

  const resetMutation = useMutation({
    mutationFn: async () => {
      await SecureStore.deleteItemAsync(SECURE_KEYS.PIN);
      await SecureStore.deleteItemAsync(SECURE_KEYS.METHOD);
      await SecureStore.deleteItemAsync(SECURE_KEYS.IS_SETUP);
      await SecureStore.deleteItemAsync(SECURE_KEYS.LAST_ACTIVE);
    },
    onSuccess: () => {
      setIsSetup(false);
      setIsLocked(false);
      setSecurityMethod(null);
      queryClient.invalidateQueries({ queryKey: ['security_setup'] });
      console.log('[Security] Security reset complete');
    },
  });

  const { mutateAsync: resetMutateAsync } = resetMutation;
  const resetSecurity = useCallback(async () => {
    await resetMutateAsync();
  }, [resetMutateAsync]);

  const changePinMutation = useMutation({
    mutationFn: async ({ currentPin, newPin }: { currentPin: string; newPin: string }) => {
      const storedPin = await SecureStore.getItemAsync(SECURE_KEYS.PIN);
      if (currentPin !== storedPin) {
        throw new Error('INCORRECT_PIN');
      }
      await SecureStore.setItemAsync(SECURE_KEYS.PIN, newPin);
      console.log('[Security] PIN changed successfully');
      return true;
    },
  });

  const { mutateAsync: changePinMutateAsync } = changePinMutation;
  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    const storedPin = await SecureStore.getItemAsync(SECURE_KEYS.PIN);
    console.log('[Security] Verify PIN (no unlock)');
    return pin === storedPin;
  }, []);

  const verifyBiometrics = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access settings',
        cancelLabel: 'Use PIN',
        disableDeviceFallback: true,
      });
      console.log('[Security] Verify biometrics (no unlock):', result.success);
      return result.success;
    } catch (e) {
      console.log('[Security] Verify biometrics error:', e);
      return false;
    }
  }, []);

  const lockApp = useCallback(() => {
    if (isSetup) {
      setIsLocked(true);
      console.log('[Security] App manually locked');
    }
  }, [isSetup]);

  const changePin = useCallback(async (currentPin: string, newPin: string): Promise<boolean> => {
    try {
      await changePinMutateAsync({ currentPin, newPin });
      return true;
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown error');
      console.log('[Security] Change PIN failed:', error.message);
      return false;
    }
  }, [changePinMutateAsync]);

  return {
    isSetup,
    isLocked,
    isLoading: securityQuery.isLoading,
    securityMethod,
    biometricsAvailable,
    biometricType,
    setupSecurity,
    unlockWithPin,
    unlockWithBiometrics,
    recordActivity,
    resetSecurity,
    changePin,
    verifyPin,
    verifyBiometrics,
    lockApp,
  };
});
