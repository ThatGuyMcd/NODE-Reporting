import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
} from 'react-native';
import {
  User,
  Mail,
  Lock,
  LogOut,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Building2,
  Clock,
  Download,
  FileText,
  Database,
} from 'lucide-react-native';
import { usePositronAuth } from '@/contexts/PositronAuthContext';
import { formatDate } from '@/utils/helpers';
import Colors from '@/constants/colors';

function SyncProgressBar({ progress, total }: { progress: number; total: number }) {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const pct = total > 0 ? (progress / total) * 100 : 0;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: pct,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [pct, animatedWidth]);

  return (
    <View style={progressStyles.track}>
      <Animated.View
        style={[
          progressStyles.fill,
          {
            width: animatedWidth.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 8,
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
});

export default function AccountScreen() {
  const {
    isAuthenticated,
    user,
    syncedTransactions,
    lastSyncTime,
    syncProgress,
    isLoggingIn,
    isSyncing,
    loginError,
    syncError,
    login,
    logout,
    syncTransactions,
  } = usePositronAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSyncing) {
      const spin = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        })
      );
      spin.start();
      return () => spin.stop();
    } else {
      spinAnim.setValue(0);
    }
  }, [isSyncing, spinAnim]);

  const spinInterpolation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }

    try {
      await login(email, password);
      setEmail('');
      setPassword('');
      Alert.alert('Success', 'Successfully connected to NODEView Portal');
    } catch (error) {
      console.log('Login error:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out from NODEView Portal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  const handleSync = async () => {
    try {
      const result = await syncTransactions();
      Alert.alert('Sync Complete', `Synced ${result?.length || 0} archived transactions from your till.`);
    } catch (error) {
      console.log('Sync error:', error);
    }
  };

  const getPhaseIcon = () => {
    if (!syncProgress) return null;
    switch (syncProgress.phase) {
      case 'connecting':
        return <Database size={16} color={Colors.primary} />;
      case 'downloading':
        return <Download size={16} color={Colors.info} />;
      case 'parsing':
        return <FileText size={16} color={Colors.warning} />;
      case 'complete':
        return <CheckCircle size={16} color={Colors.success} />;
      case 'error':
        return <AlertCircle size={16} color={Colors.danger} />;
      default:
        return null;
    }
  };

  const getPhaseColor = () => {
    if (!syncProgress) return Colors.primary;
    switch (syncProgress.phase) {
      case 'connecting': return Colors.primary;
      case 'downloading': return Colors.info;
      case 'parsing': return Colors.warning;
      case 'complete': return Colors.success;
      case 'error': return Colors.danger;
      default: return Colors.primary;
    }
  };

  if (isAuthenticated && user) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <User size={32} color={Colors.primary} />
            </View>
            <View style={styles.statusBadge}>
              <CheckCircle size={16} color={Colors.success} />
            </View>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={styles.siteInfo}>
            <Building2 size={14} color={Colors.textSecondary} />
            <Text style={styles.siteName}>{user.siteName}</Text>
          </View>
        </View>

        <View style={styles.syncCard}>
          <View style={styles.syncHeader}>
            <Animated.View style={isSyncing ? { transform: [{ rotate: spinInterpolation }] } : undefined}>
              <RefreshCw size={20} color={Colors.primary} />
            </Animated.View>
            <Text style={styles.syncTitle}>Transaction Sync</Text>
          </View>

          <View style={styles.syncStatsRow}>
            <View style={styles.syncStatBox}>
              <Text style={styles.syncStatValue}>{syncedTransactions.length}</Text>
              <Text style={styles.syncStatLabel}>Transactions</Text>
            </View>
            <View style={styles.syncStatDivider} />
            <View style={styles.syncStatBox}>
              {lastSyncTime ? (
                <>
                  <Clock size={16} color={Colors.textMuted} style={{ marginBottom: 4 }} />
                  <Text style={styles.syncStatLabel}>{formatDate(lastSyncTime)}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.syncStatValueSmall}>Never</Text>
                  <Text style={styles.syncStatLabel}>Last Synced</Text>
                </>
              )}
            </View>
          </View>

          {isSyncing && syncProgress && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                {getPhaseIcon()}
                <Text style={[styles.progressPhase, { color: getPhaseColor() }]}>
                  {syncProgress.phase === 'connecting' && 'Connecting...'}
                  {syncProgress.phase === 'downloading' && 'Downloading Files'}
                  {syncProgress.phase === 'parsing' && 'Parsing Data'}
                  {syncProgress.phase === 'complete' && 'Complete'}
                  {syncProgress.phase === 'error' && 'Error'}
                </Text>
              </View>
              <Text style={styles.progressMessage}>{syncProgress.message}</Text>
              {syncProgress.total > 0 && (
                <SyncProgressBar
                  progress={syncProgress.current}
                  total={syncProgress.total}
                />
              )}
              {syncProgress.total > 0 && (
                <Text style={styles.progressCount}>
                  {syncProgress.current} / {syncProgress.total}
                </Text>
              )}
            </View>
          )}

          {!isSyncing && syncProgress?.phase === 'complete' && syncProgress.current > 0 && (
            <View style={[styles.successBanner]}>
              <CheckCircle size={16} color={Colors.success} />
              <Text style={styles.successText}>{syncProgress.message}</Text>
            </View>
          )}

          {syncError && !isSyncing && (
            <View style={styles.errorBanner}>
              <AlertCircle size={16} color={Colors.danger} />
              <Text style={styles.errorText}>{syncError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.syncButton, isSyncing && styles.buttonDisabled]}
            onPress={handleSync}
            disabled={isSyncing}
            activeOpacity={0.8}
          >
            {isSyncing ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <>
                <RefreshCw size={18} color={Colors.white} />
                <Text style={styles.syncButtonText}>Sync Now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How Sync Works</Text>
          <View style={styles.infoStep}>
            <View style={styles.infoStepNum}>
              <Text style={styles.infoStepNumText}>1</Text>
            </View>
            <Text style={styles.infoStepText}>
              Connects to your NODEView Portal and fetches the file manifest.
            </Text>
          </View>
          <View style={styles.infoStep}>
            <View style={styles.infoStepNum}>
              <Text style={styles.infoStepNumText}>2</Text>
            </View>
            <Text style={styles.infoStepText}>
              Downloads all transaction archive CSV files from your till system.
            </Text>
          </View>
          <View style={styles.infoStep}>
            <View style={styles.infoStepNum}>
              <Text style={styles.infoStepNumText}>3</Text>
            </View>
            <Text style={styles.infoStepText}>
              Parses and deduplicates transactions, then stores them locally.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LogOut size={18} color={Colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.loginContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: 'https://r2-pub.rork.com/attachments/om86sit3789f114ve4wcn' }}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.logoTitle}>NODEView Portal</Text>
          <Text style={styles.logoSubtitle}>
            Sign in to sync your archived transactions
          </Text>
        </View>

        <View style={styles.formCard}>
          {loginError && (
            <View style={styles.errorBanner}>
              <AlertCircle size={16} color={Colors.danger} />
              <Text style={styles.errorText}>{loginError}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <View style={styles.inputContainer}>
              <Mail size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoggingIn}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputContainer}>
              <Lock size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isLoggingIn}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoggingIn && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoggingIn}
            activeOpacity={0.8}
          >
            {isLoggingIn ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.helpCard}>
          <Text style={styles.helpText}>
            Use the same credentials you use to sign into{' '}
            <Text style={styles.helpLink}>app.positron-portal.com</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loginContent: {
    padding: 16,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoImage: {
    width: 160,
    height: 60,
    marginBottom: 16,
  },
  logoTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  logoSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
  },
  formCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    fontSize: 15,
    color: Colors.text,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 8,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.danger + '15',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: Colors.danger,
  },
  successBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.success + '15',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    color: Colors.success,
    fontWeight: '600' as const,
  },
  helpCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 16,
  },
  helpText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  helpLink: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  profileCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative' as const,
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  statusBadge: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 2,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  siteInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: Colors.backgroundLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  siteName: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  syncCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  syncHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    marginBottom: 16,
  },
  syncTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  syncStatsRow: {
    flexDirection: 'row' as const,
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  syncStatBox: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  syncStatDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 12,
  },
  syncStatValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginBottom: 4,
  },
  syncStatValueSmall: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  syncStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  progressContainer: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 6,
  },
  progressPhase: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  progressMessage: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  progressCount: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'right' as const,
    marginTop: 4,
  },
  syncButton: {
    flexDirection: 'row' as const,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  syncButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  infoCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 14,
  },
  infoStep: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 12,
  },
  infoStepNum: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  infoStepNumText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: Colors.primary,
  },
  infoStepText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  logoutButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    backgroundColor: Colors.danger + '15',
    borderRadius: 12,
    paddingVertical: 14,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.danger,
  },
});
