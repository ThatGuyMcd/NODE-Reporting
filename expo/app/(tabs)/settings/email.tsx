import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  Switch,
} from 'react-native';
import {
  Mail,
  Server,
  Key,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info,
  Eye,
  EyeOff,
  Send,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import { EmailProvider } from '@/types';
import Colors from '@/constants/colors';

export default function EmailSettingsScreen() {
  const { emailSettings, updateEmailSettings } = useBusiness();
  
  const [provider, setProvider] = useState<EmailProvider>(emailSettings?.provider || 'smtp');
  const [smtpExpanded, setSmtpExpanded] = useState(provider === 'smtp');
  const [resendExpanded, setResendExpanded] = useState(provider === 'resend');
  
  const [smtpHost, setSmtpHost] = useState(emailSettings?.smtp?.host || '');
  const [smtpPort, setSmtpPort] = useState(emailSettings?.smtp?.port?.toString() || '587');
  const [smtpSecure, setSmtpSecure] = useState(emailSettings?.smtp?.secure ?? true);
  const [smtpUsername, setSmtpUsername] = useState(emailSettings?.smtp?.username || '');
  const [smtpPassword, setSmtpPassword] = useState(emailSettings?.smtp?.password || '');
  const [smtpFromEmail, setSmtpFromEmail] = useState(emailSettings?.smtp?.fromEmail || '');
  const [smtpFromName, setSmtpFromName] = useState(emailSettings?.smtp?.fromName || '');
  
  const [resendApiKey, setResendApiKey] = useState(emailSettings?.resend?.apiKey || '');
  const [resendFromEmail, setResendFromEmail] = useState(emailSettings?.resend?.fromEmail || '');
  const [resendFromName, setResendFromName] = useState(emailSettings?.resend?.fromName || '');
  
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showResendKey, setShowResendKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (emailSettings) {
      setProvider(emailSettings.provider);
      setSmtpExpanded(emailSettings.provider === 'smtp');
      setResendExpanded(emailSettings.provider === 'resend');
      
      if (emailSettings.smtp) {
        setSmtpHost(emailSettings.smtp.host);
        setSmtpPort(emailSettings.smtp.port.toString());
        setSmtpSecure(emailSettings.smtp.secure);
        setSmtpUsername(emailSettings.smtp.username);
        setSmtpPassword(emailSettings.smtp.password);
        setSmtpFromEmail(emailSettings.smtp.fromEmail);
        setSmtpFromName(emailSettings.smtp.fromName);
      }
      
      if (emailSettings.resend) {
        setResendApiKey(emailSettings.resend.apiKey);
        setResendFromEmail(emailSettings.resend.fromEmail);
        setResendFromName(emailSettings.resend.fromName);
      }
    }
  }, [emailSettings]);

  const isSmtpConfigured = !!(smtpHost && smtpUsername && smtpPassword && smtpFromEmail);
  const isResendConfigured = !!resendApiKey;

  const handleSave = () => {
    if (provider === 'smtp' && !isSmtpConfigured) {
      Alert.alert('Incomplete Settings', 'Please fill in SMTP host, username, password, and from email.');
      return;
    }
    if (provider === 'resend' && !isResendConfigured) {
      Alert.alert('Incomplete Settings', 'Please provide your Resend API key.');
      return;
    }

    setIsSaving(true);
    
    const isConfigured = provider === 'smtp' ? isSmtpConfigured : isResendConfigured;
    
    const settings = {
      provider,
      smtp: {
        host: smtpHost,
        port: parseInt(smtpPort, 10) || 587,
        secure: smtpSecure,
        username: smtpUsername,
        password: smtpPassword,
        fromEmail: smtpFromEmail,
        fromName: smtpFromName,
      },
      resend: {
        apiKey: resendApiKey,
        fromEmail: resendFromEmail,
        fromName: resendFromName,
      },
      isConfigured,
    };
    
    updateEmailSettings(settings);
    
    setTimeout(() => {
      setIsSaving(false);
      Alert.alert('Success', 'Email settings saved successfully');
    }, 500);
  };

  const selectProvider = (p: EmailProvider) => {
    setProvider(p);
    if (p === 'smtp') {
      setSmtpExpanded(true);
      setResendExpanded(false);
    } else {
      setResendExpanded(true);
      setSmtpExpanded(false);
    }
  };

  const openResendSignup = () => {
    Linking.openURL('https://resend.com/signup');
  };

  const openResendDocs = () => {
    Linking.openURL('https://resend.com/docs/introduction');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Mail size={24} color={Colors.primary} />
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Email Configuration</Text>
          <Text style={styles.headerSubtitle}>
            Choose how to send invoices and receipts. SMTP connects to your own mail server; Resend uses their API.
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Email Provider</Text>
      <View style={styles.providerSelector}>
        <TouchableOpacity
          style={[styles.providerOption, provider === 'smtp' && styles.providerOptionActive]}
          onPress={() => selectProvider('smtp')}
          activeOpacity={0.7}
        >
          <Server size={20} color={provider === 'smtp' ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.providerOptionText, provider === 'smtp' && styles.providerOptionTextActive]}>SMTP</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.providerOption, provider === 'resend' && styles.providerOptionActive]}
          onPress={() => selectProvider('resend')}
          activeOpacity={0.7}
        >
          <Key size={20} color={provider === 'resend' ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.providerOptionText, provider === 'resend' && styles.providerOptionTextActive]}>Resend</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.sectionHeader, provider === 'smtp' && styles.sectionHeaderActive]}
        onPress={() => setSmtpExpanded(!smtpExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.sectionIcon, { backgroundColor: provider === 'smtp' ? Colors.primary + '15' : Colors.textMuted + '15' }]}>
            <Server size={20} color={provider === 'smtp' ? Colors.primary : Colors.textMuted} />
          </View>
          <View>
            <Text style={styles.sectionHeaderTitle}>SMTP Settings</Text>
            <Text style={styles.sectionHeaderSubtitle}>
              {isSmtpConfigured ? 'Configured' : 'Not configured'}
              {provider === 'smtp' ? ' (Active)' : ''}
            </Text>
          </View>
        </View>
        <View style={styles.sectionHeaderRight}>
          {provider === 'smtp' && (
            isSmtpConfigured
              ? <CheckCircle size={18} color={Colors.success} style={{ marginRight: 8 }} />
              : <XCircle size={18} color={Colors.warning} style={{ marginRight: 8 }} />
          )}
          {smtpExpanded ? (
            <ChevronUp size={20} color={Colors.textSecondary} />
          ) : (
            <ChevronDown size={20} color={Colors.textSecondary} />
          )}
        </View>
      </TouchableOpacity>

      {smtpExpanded && (
        <View style={styles.expandedSection}>
          <View style={styles.infoCard}>
            <Info size={18} color={Colors.info} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>SMTP Configuration</Text>
              <Text style={styles.infoText}>
                Enter your SMTP server details. Common providers:{'\n'}
                {'\u2022'} Gmail: smtp.gmail.com, port 587{'\n'}
                {'\u2022'} Outlook: smtp.office365.com, port 587{'\n'}
                {'\u2022'} Custom: Use your mail server details
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>SMTP Host *</Text>
            <TextInput
              style={styles.input}
              value={smtpHost}
              onChangeText={setSmtpHost}
              placeholder="smtp.gmail.com"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Port</Text>
              <TextInput
                style={styles.input}
                value={smtpPort}
                onChangeText={setSmtpPort}
                placeholder="587"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>SSL/TLS</Text>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>{smtpSecure ? 'Enabled' : 'Disabled'}</Text>
                <Switch
                  value={smtpSecure}
                  onValueChange={setSmtpSecure}
                  trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
                  thumbColor={smtpSecure ? Colors.primary : Colors.textMuted}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username *</Text>
            <TextInput
              style={styles.input}
              value={smtpUsername}
              onChangeText={setSmtpUsername}
              placeholder="your@email.com"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={smtpPassword}
                onChangeText={setSmtpPassword}
                placeholder="App password or SMTP password"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showSmtpPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowSmtpPassword(!showSmtpPassword)}
              >
                {showSmtpPassword ? (
                  <EyeOff size={20} color={Colors.textSecondary} />
                ) : (
                  <Eye size={20} color={Colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.inputHint}>
              For Gmail, use an App Password (not your account password)
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>From Email *</Text>
            <TextInput
              style={styles.input}
              value={smtpFromEmail}
              onChangeText={setSmtpFromEmail}
              placeholder="invoices@yourdomain.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>From Name</Text>
            <TextInput
              style={styles.input}
              value={smtpFromName}
              onChangeText={setSmtpFromName}
              placeholder="Your Business Name"
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.inputHint}>
              Leave blank to use your business name from profile
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.sectionHeader, provider === 'resend' && styles.sectionHeaderActive]}
        onPress={() => setResendExpanded(!resendExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.sectionIcon, { backgroundColor: provider === 'resend' ? Colors.primary + '15' : Colors.textMuted + '15' }]}>
            <Key size={20} color={provider === 'resend' ? Colors.primary : Colors.textMuted} />
          </View>
          <View>
            <Text style={styles.sectionHeaderTitle}>Resend API</Text>
            <Text style={styles.sectionHeaderSubtitle}>
              {isResendConfigured ? 'Configured' : 'Not configured'}
              {provider === 'resend' ? ' (Active)' : ''}
            </Text>
          </View>
        </View>
        <View style={styles.sectionHeaderRight}>
          {provider === 'resend' && (
            isResendConfigured
              ? <CheckCircle size={18} color={Colors.success} style={{ marginRight: 8 }} />
              : <XCircle size={18} color={Colors.warning} style={{ marginRight: 8 }} />
          )}
          {resendExpanded ? (
            <ChevronUp size={20} color={Colors.textSecondary} />
          ) : (
            <ChevronDown size={20} color={Colors.textSecondary} />
          )}
        </View>
      </TouchableOpacity>

      {resendExpanded && (
        <View style={styles.expandedSection}>
          <View style={styles.infoCard}>
            <Info size={18} color={Colors.info} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Getting Started with Resend</Text>
              <Text style={styles.infoText}>
                1. Create a free account at resend.com{'\n'}
                2. Verify your email domain (or use their test domain){'\n'}
                3. Create an API key in the dashboard{'\n'}
                4. Paste your API key below
              </Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.linkButton} onPress={openResendSignup} activeOpacity={0.7}>
              <ExternalLink size={16} color={Colors.primary} />
              <Text style={styles.linkButtonText}>Create Account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkButton} onPress={openResendDocs} activeOpacity={0.7}>
              <ExternalLink size={16} color={Colors.primary} />
              <Text style={styles.linkButtonText}>View Docs</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>API Key *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={resendApiKey}
                onChangeText={setResendApiKey}
                placeholder="re_xxxxxxxx..."
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showResendKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowResendKey(!showResendKey)}
              >
                {showResendKey ? (
                  <EyeOff size={20} color={Colors.textSecondary} />
                ) : (
                  <Eye size={20} color={Colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>From Email</Text>
            <TextInput
              style={styles.input}
              value={resendFromEmail}
              onChangeText={setResendFromEmail}
              placeholder="invoices@yourdomain.com (or onboarding@resend.dev)"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.inputHint}>
              Leave blank to use your business email or onboarding@resend.dev for testing
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>From Name</Text>
            <TextInput
              style={styles.input}
              value={resendFromName}
              onChangeText={setResendFromName}
              placeholder="Your Business Name"
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.inputHint}>
              Leave blank to use your business name from profile
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={isSaving}
        activeOpacity={0.8}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Send size={20} color="#fff" />
            <Text style={styles.saveButtonText}>Save Email Settings</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Current Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Provider</Text>
          <Text style={styles.statusValue}>
            {emailSettings?.provider === 'smtp' ? 'SMTP' : 'Resend API'}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Configured</Text>
          <Text style={[
            styles.statusValue,
            { color: emailSettings?.isConfigured ? Colors.success : Colors.warning }
          ]}>
            {emailSettings?.isConfigured ? 'Yes' : 'No'}
          </Text>
        </View>
        {emailSettings?.provider === 'smtp' && emailSettings?.smtp?.host ? (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>SMTP Server</Text>
            <Text style={styles.statusValue}>{emailSettings.smtp.host}</Text>
          </View>
        ) : null}
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
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  providerSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  providerOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  providerOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  providerOptionText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  providerOptionTextActive: {
    color: Colors.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 2,
  },
  sectionHeaderActive: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  sectionHeaderSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  expandedSection: {
    backgroundColor: Colors.backgroundCard,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.info + '15',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.info,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  linkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '15',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 6,
  },
  inputRow: {
    flexDirection: 'row',
  },
  passwordContainer: {
    position: 'relative' as const,
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute' as const,
    right: 14,
    top: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
    gap: 10,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  statusCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 16,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
});
