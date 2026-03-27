import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { CreditCard, ShieldCheck, KeyRound, Copy, CheckCircle2, Link2Off } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useBusiness } from '@/contexts/BusinessContext';

export default function GoCardlessSettingsScreen() {
  const { goCardless, connectGoCardless, disconnectGoCardless } = useBusiness();
  const [environment, setEnvironment] = useState<'sandbox' | 'live'>(goCardless.environment);
  const [accessToken, setAccessToken] = useState<string>(goCardless.accessToken);

  const maskedToken = useMemo(() => {
    if (!goCardless.accessToken) return '';
    const t = goCardless.accessToken;
    if (t.length <= 10) return '••••••••••';
    return `${t.slice(0, 4)}••••••••${t.slice(-4)}`;
  }, [goCardless.accessToken]);

  const handleCopy = async () => {
    const value = goCardless.accessToken;
    if (!value) return;

    try {
      const clipboard = await import('expo-clipboard');
      await clipboard.setStringAsync(value);
      Alert.alert('Copied', 'GoCardless access token copied to clipboard.');
    } catch (e) {
      console.log('Clipboard unavailable:', e);
      Alert.alert('Copy not available', 'Clipboard is not available in this build.');
    }
  };

  const handleConnect = () => {
    if (!accessToken.trim()) {
      Alert.alert('Missing token', 'Please paste your GoCardless access token.');
      return;
    }

    Alert.alert(
      'Connect GoCardless',
      'This stores your access token on this device so invoices can create GoCardless payment links. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Connect',
          onPress: () => {
            connectGoCardless({
              isConnected: true,
              environment,
              accessToken: accessToken.trim(),
            });
          },
        },
      ],
    );
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect GoCardless',
      'This will remove the access token from this device. Existing invoices will no longer be able to create payment links until reconnected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => disconnectGoCardless(),
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} testID="gocardlessSettingsScroll">
      <Stack.Screen
        options={{
          title: 'GoCardless Payments',
        }}
      />

      <View style={styles.heroCard} testID="gocardlessHeroCard">
        <View style={styles.heroTop}>
          <View style={styles.heroIconWrap}>
            <CreditCard size={20} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Get paid by Direct Debit</Text>
            <Text style={styles.heroSubtitle}>
              Connect GoCardless to generate secure payment links for invoices and automatically track payments.
            </Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.statusPill, { backgroundColor: (goCardless.isConnected ? Colors.success : Colors.warning) + '18' }]}>
            <Text style={[styles.statusText, { color: goCardless.isConnected ? Colors.success : Colors.warning }]}>
              {goCardless.isConnected ? 'Connected' : 'Not connected'}
            </Text>
          </View>
          <Text style={styles.statusMeta}>
            Env: <Text style={styles.statusMetaStrong}>{goCardless.environment}</Text>
          </Text>
        </View>

        {goCardless.connectedAt ? (
          <Text style={styles.connectedAt} testID="gocardlessConnectedAt">
            Connected {new Date(goCardless.connectedAt).toLocaleString()}
          </Text>
        ) : null}
      </View>

      <View style={styles.card} testID="gocardlessSetupCard">
        <View style={styles.cardHeader}>
          <ShieldCheck size={18} color={Colors.textSecondary} />
          <Text style={styles.cardTitle}>Connection</Text>
        </View>

        <Text style={styles.label}>Environment</Text>
        <View style={styles.toggleRow} testID="gocardlessEnvToggle">
          <TouchableOpacity
            style={[styles.toggleBtn, environment === 'sandbox' && styles.toggleBtnActive]}
            onPress={() => setEnvironment('sandbox')}
            activeOpacity={0.8}
            testID="gocardlessEnvSandbox"
          >
            <Text style={[styles.toggleText, environment === 'sandbox' && styles.toggleTextActive]}>Sandbox</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, environment === 'live' && styles.toggleBtnActive]}
            onPress={() => setEnvironment('live')}
            activeOpacity={0.8}
            testID="gocardlessEnvLive"
          >
            <Text style={[styles.toggleText, environment === 'live' && styles.toggleTextActive]}>Live</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Access token</Text>
        <View style={styles.tokenInputWrap}>
          <KeyRound size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.tokenInput}
            placeholder="Paste GoCardless access token"
            placeholderTextColor={Colors.textMuted}
            value={accessToken}
            onChangeText={setAccessToken}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={Platform.OS !== 'web'}
            testID="gocardlessAccessTokenInput"
          />
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.primaryButton, goCardless.isConnected && { backgroundColor: Colors.textMuted }]}
            onPress={handleConnect}
            activeOpacity={0.85}
            disabled={goCardless.isConnected}
            testID="gocardlessConnectBtn"
          >
            <CheckCircle2 size={18} color={Colors.white} />
            <Text style={styles.primaryButtonText}>Connect</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, !goCardless.isConnected && { opacity: 0.5 }]}
            onPress={handleDisconnect}
            activeOpacity={0.85}
            disabled={!goCardless.isConnected}
            testID="gocardlessDisconnectBtn"
          >
            <Link2Off size={18} color={Colors.danger} />
            <Text style={[styles.secondaryButtonText, { color: Colors.danger }]}>Disconnect</Text>
          </TouchableOpacity>
        </View>

        {goCardless.isConnected ? (
          <View style={styles.connectedTokenRow} testID="gocardlessMaskedTokenRow">
            <Text style={styles.connectedTokenLabel}>Saved token:</Text>
            <Text style={styles.connectedTokenValue}>{maskedToken}</Text>
            <TouchableOpacity onPress={handleCopy} style={styles.copyBtn} testID="gocardlessCopyTokenBtn">
              <Copy size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.helpText}>
          Tip: Use a restricted token from your GoCardless dashboard. You can start in Sandbox to test end-to-end.
        </Text>
      </View>

      <View style={styles.card} testID="gocardlessHowItWorksCard">
        <View style={styles.cardHeader}>
          <CreditCard size={18} color={Colors.textSecondary} />
          <Text style={styles.cardTitle}>How it works</Text>
        </View>

        <View style={styles.step}>
          <Text style={styles.stepNum}>1</Text>
          <Text style={styles.stepText}>Open an invoice and tap “Get paid with GoCardless”.</Text>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepNum}>2</Text>
          <Text style={styles.stepText}>A GoCardless hosted checkout collects bank details securely.</Text>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepNum}>3</Text>
          <Text style={styles.stepText}>When payment completes, the invoice is marked paid and an income transaction is created.</Text>
        </View>
      </View>
    </ScrollView>
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
  heroCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  heroIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  statusRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusMeta: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  statusMetaStrong: {
    color: Colors.text,
    fontWeight: '700',
  },
  connectedAt: {
    marginTop: 10,
    fontSize: 12,
    color: Colors.textMuted,
  },
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    marginTop: 10,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: Colors.white,
  },
  tokenInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tokenInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.white,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  connectedTokenRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.backgroundLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  connectedTokenLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  connectedTokenValue: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
    fontWeight: '700',
  },
  copyBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpText: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textMuted,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 8,
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: Colors.primary + '12',
    color: Colors.primary,
    fontWeight: '900',
    fontSize: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
