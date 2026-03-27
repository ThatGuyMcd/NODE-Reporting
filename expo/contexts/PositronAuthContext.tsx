import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef } from 'react';
import { PositronUser, PositronAuthState, ArchivedTransaction } from '@/types';
import { linkAccount } from '@/services/positronApi';
import { syncTransactionsFromPortal, SyncProgress } from '@/services/dataSync';
import { useBusiness } from '@/contexts/BusinessContext';

const STORAGE_KEYS = {
  AUTH: 'positron_auth',
  SYNCED_TRANSACTIONS: 'positron_synced_transactions',
  LAST_SYNC: 'positron_last_sync',
};

const AUTO_SYNC_INTERVAL_MS = 12 * 60 * 60 * 1000;

export const [PositronAuthProvider, usePositronAuth] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { importSyncedTransactions } = useBusiness();
  const [authState, setAuthState] = useState<PositronAuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
  });
  const [syncedTransactions, setSyncedTransactions] = useState<ArchivedTransaction[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const syncProgressRef = useRef<SyncProgress | null>(null);
  const isSyncingRef = useRef(false);
  const autoSyncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const authQuery = useQuery({
    queryKey: ['positron_auth'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.AUTH);
      return stored ? JSON.parse(stored) : { isAuthenticated: false, user: null, token: null };
    },
  });

  const syncedTransactionsQuery = useQuery({
    queryKey: ['positron_synced_transactions'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SYNCED_TRANSACTIONS);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const lastSyncQuery = useQuery({
    queryKey: ['positron_last_sync'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return stored || null;
    },
  });

  useEffect(() => {
    if (authQuery.data) {
      setAuthState(authQuery.data);
    }
  }, [authQuery.data]);

  useEffect(() => {
    if (syncedTransactionsQuery.data) {
      setSyncedTransactions(syncedTransactionsQuery.data);
      console.log('[PositronAuth] Loaded', syncedTransactionsQuery.data.length, 'synced transactions from storage');
    }
  }, [syncedTransactionsQuery.data]);

  useEffect(() => {
    if (lastSyncQuery.data !== undefined) {
      setLastSyncTime(lastSyncQuery.data);
    }
  }, [lastSyncQuery.data]);

  const saveAuthMutation = useMutation({
    mutationFn: async (data: PositronAuthState) => {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(data));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positron_auth'] });
    },
  });

  const saveSyncedTransactionsMutation = useMutation({
    mutationFn: async (data: ArchivedTransaction[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.SYNCED_TRANSACTIONS, JSON.stringify(data));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positron_synced_transactions'] });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      console.log('[PositronAuth] Attempting login...');

      const result = await linkAccount(email, password);

      console.log('[PositronAuth] Login successful, siteId:', result.siteId);

      const user: PositronUser = {
        id: result.siteId,
        email,
        name: result.siteName || email.split('@')[0],
        siteId: result.siteId,
        siteName: result.siteName,
      };

      return {
        user,
        token: result.token,
        licenses: result.licenses,
      };
    },
    onSuccess: (data) => {
      const newAuthState: PositronAuthState = {
        isAuthenticated: true,
        user: data.user,
        token: data.token,
      };
      setAuthState(newAuthState);
      saveAuthMutation.mutate(newAuthState);
      console.log('[PositronAuth] Auth state saved, licenses:', data.licenses?.length || 0);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log('[PositronAuth] Logging out...');
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH);
      await AsyncStorage.removeItem(STORAGE_KEYS.SYNCED_TRANSACTIONS);
      await AsyncStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
      return true;
    },
    onSuccess: () => {
      setAuthState({ isAuthenticated: false, user: null, token: null });
      setSyncedTransactions([]);
      setLastSyncTime(null);
      syncProgressRef.current = null;
      setSyncProgress(null);
      queryClient.invalidateQueries({ queryKey: ['positron_auth'] });
      queryClient.invalidateQueries({ queryKey: ['positron_synced_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['positron_last_sync'] });
    },
  });

  const syncTransactionsMutation = useMutation({
    mutationFn: async () => {
      if (!authState.user) {
        throw new Error('Not authenticated');
      }

      if (isSyncingRef.current) {
        throw new Error('Sync already in progress');
      }

      isSyncingRef.current = true;
      console.log('[PositronAuth] Starting transaction sync for site:', authState.user.siteId);

      const initialProgress: SyncProgress = {
        phase: 'connecting',
        current: 0,
        total: 0,
        message: 'Connecting...',
      };
      syncProgressRef.current = initialProgress;
      setSyncProgress(initialProgress);

      try {
        const transactions = await syncTransactionsFromPortal(
          authState.user.siteId,
          (progress) => {
            syncProgressRef.current = progress;
          },
        );

        return transactions;
      } finally {
        isSyncingRef.current = false;
      }
    },
    onSuccess: (data) => {
      setSyncedTransactions(data);
      const now = new Date().toISOString();
      setLastSyncTime(now);
      saveSyncedTransactionsMutation.mutate(data);
      AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, now);
      console.log('[PositronAuth] Sync complete, transactions:', data.length);
      importSyncedTransactions(data);
      console.log('[PositronAuth] Imported synced transactions into business context');
      const completeProgress: SyncProgress = {
        phase: 'complete',
        current: data.length,
        total: data.length,
        message: `Synced ${data.length} transaction(s) successfully.`,
      };
      syncProgressRef.current = completeProgress;
      setSyncProgress(completeProgress);
    },
    onError: (error) => {
      console.error('[PositronAuth] Sync failed:', error);
      const errorProgress: SyncProgress = {
        phase: 'error',
        current: 0,
        total: 0,
        message: error instanceof Error ? error.message : 'Sync failed',
      };
      syncProgressRef.current = errorProgress;
      setSyncProgress(errorProgress);
    },
  });

  const { mutateAsync: loginAsync } = loginMutation;
  const { mutateAsync: logoutAsync } = logoutMutation;
  const { mutateAsync: syncAsync } = syncTransactionsMutation;

  const login = useCallback(
    (email: string, password: string) => {
      return loginAsync({ email, password });
    },
    [loginAsync]
  );

  const logout = useCallback(() => {
    return logoutAsync();
  }, [logoutAsync]);

  const syncTransactions = useCallback(() => {
    return syncAsync();
  }, [syncAsync]);

  const hasTriggeredUnlockSyncRef = useRef(false);

  useEffect(() => {
    if (!authState.isAuthenticated || !authState.user) {
      if (autoSyncTimerRef.current) {
        clearInterval(autoSyncTimerRef.current);
        autoSyncTimerRef.current = null;
        console.log('[PositronAuth] Auto-sync timer cleared (not authenticated)');
      }
      hasTriggeredUnlockSyncRef.current = false;
      return;
    }

    if (!hasTriggeredUnlockSyncRef.current && !isSyncingRef.current) {
      hasTriggeredUnlockSyncRef.current = true;
      console.log('[PositronAuth] Unlock sync: triggering sync on app unlock...');
      syncTransactionsMutation.mutate();
    }

    if (autoSyncTimerRef.current) {
      clearInterval(autoSyncTimerRef.current);
    }

    autoSyncTimerRef.current = setInterval(() => {
      if (isSyncingRef.current) {
        console.log('[PositronAuth] Auto-sync: skipping, sync already in progress');
        return;
      }
      console.log('[PositronAuth] Auto-sync: triggering scheduled sync...');
      syncTransactionsMutation.mutate();
    }, AUTO_SYNC_INTERVAL_MS);

    console.log('[PositronAuth] Auto-sync timer set for every 12 hours');

    return () => {
      if (autoSyncTimerRef.current) {
        clearInterval(autoSyncTimerRef.current);
        autoSyncTimerRef.current = null;
      }
    };
  }, [authState.isAuthenticated, authState.user]);

  const isLoading = authQuery.isLoading || syncedTransactionsQuery.isLoading;

  return {
    ...authState,
    syncedTransactions,
    lastSyncTime,
    syncProgress,
    syncProgressRef,
    isLoading,
    isLoggingIn: loginMutation.isPending,
    isSyncing: syncTransactionsMutation.isPending,
    loginError: loginMutation.error?.message || null,
    syncError: syncTransactionsMutation.error?.message || null,
    login,
    logout,
    syncTransactions,
  };
});
