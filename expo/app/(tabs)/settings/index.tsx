import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Building2,
  Download,
  FileSpreadsheet,
  Receipt,
  Calculator,
  ChevronRight,
  Info,
  Cloud,
  CheckCircle,
  Mail,
  Package,
  FileText,
  CreditCard,
  Shield,
  Lock,
  KeyRound,
} from 'lucide-react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import { usePositronAuth } from '@/contexts/PositronAuthContext';
import { useSecurity } from '@/contexts/SecurityContext';
import { formatCurrency, getTaxYearRange, formatDate } from '@/utils/helpers';
import Colors from '@/constants/colors';

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, vatSummary, transactions, receipts, invoices, emailSettings, products, auditLogs, goCardless } = useBusiness();
  const { isAuthenticated, user } = usePositronAuth();
  const { securityMethod, biometricType, resetSecurity } = useSecurity();

  const taxYear = getTaxYearRange();

  const MenuItem = ({
    icon: Icon,
    title,
    subtitle,
    onPress,
    iconColor = Colors.primary,
  }: {
    icon: typeof Building2;
    title: string;
    subtitle?: string;
    onPress: () => void;
    iconColor?: string;
  }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: iconColor + '15' }]}>
        <Icon size={20} color={iconColor} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      <ChevronRight size={20} color={Colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.taxYearCard}>
        <View style={styles.taxYearHeader}>
          <Calculator size={20} color={Colors.primary} />
          <Text style={styles.taxYearTitle}>Tax Year Summary</Text>
        </View>
        <Text style={styles.taxYearDates}>
          {formatDate(taxYear.start.toISOString())} - {formatDate(taxYear.end.toISOString())}
        </Text>
        <View style={styles.taxYearStats}>
          <View style={styles.taxYearStat}>
            <Text style={styles.taxYearStatValue}>
              {formatCurrency(vatSummary.totalIncome)}
            </Text>
            <Text style={styles.taxYearStatLabel}>Income</Text>
          </View>
          <View style={styles.taxYearStat}>
            <Text style={styles.taxYearStatValue}>
              {formatCurrency(vatSummary.totalExpenses)}
            </Text>
            <Text style={styles.taxYearStatLabel}>Expenses</Text>
          </View>
          <View style={styles.taxYearStat}>
            <Text style={[styles.taxYearStatValue, vatSummary.profit >= 0 ? styles.profitPositive : styles.profitNegative]}>
              {formatCurrency(vatSummary.profit)}
            </Text>
            <Text style={styles.taxYearStatLabel}>Profit</Text>
          </View>
        </View>
      </View>

      <View style={styles.vatCard}>
        <Text style={styles.vatTitle}>VAT Summary</Text>
        <View style={styles.vatRow}>
          <Text style={styles.vatLabel}>Output VAT (collected)</Text>
          <Text style={styles.vatValue}>{formatCurrency(vatSummary.outputVAT)}</Text>
        </View>
        <View style={styles.vatRow}>
          <Text style={styles.vatLabel}>Input VAT (reclaimable)</Text>
          <Text style={[styles.vatValue, styles.vatInput]}>
            -{formatCurrency(vatSummary.inputVAT)}
          </Text>
        </View>
        <View style={[styles.vatRow, styles.vatTotalRow]}>
          <Text style={styles.vatTotalLabel}>VAT Due to HMRC</Text>
          <Text
            style={[
              styles.vatTotalValue,
              vatSummary.netVAT < 0 && styles.vatRefund,
            ]}
          >
            {vatSummary.netVAT < 0 ? 'Refund ' : ''}
            {formatCurrency(Math.abs(vatSummary.netVAT))}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings/account')} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: (isAuthenticated ? Colors.success : Colors.primary) + '15' }]}>
              <Cloud size={20} color={isAuthenticated ? Colors.success : Colors.primary} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>NODEView Portal</Text>
              <Text style={styles.menuSubtitle}>
                {isAuthenticated ? `Connected as ${user?.name}` : 'Sign in to sync transactions'}
              </Text>
            </View>
            {isAuthenticated ? (
              <CheckCircle size={20} color={Colors.success} />
            ) : (
              <ChevronRight size={20} color={Colors.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon={Building2}
            title="Business Profile"
            subtitle={profile.businessName || 'Set up your business details'}
            onPress={() => router.push('/settings/profile')}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={Mail}
            title="Email Settings"
            subtitle={emailSettings?.isConfigured ? `Using ${emailSettings.provider === 'smtp' ? 'SMTP' : 'Resend'}` : 'Configure automatic invoice emails'}
            onPress={() => router.push('/settings/email')}
            iconColor={emailSettings?.isConfigured ? Colors.success : Colors.warning}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={CreditCard}
            title="GoCardless Payments"
            subtitle={goCardless.isConnected ? `Connected (${goCardless.environment})` : 'Connect to take cardless payments'}
            onPress={() => router.push('/settings/gocardless')}
            iconColor={goCardless.isConnected ? Colors.success : Colors.warning}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={Package}
            title="Product Database"
            subtitle={`${products.length} saved ${products.length === 1 ? 'product' : 'products'}`}
            onPress={() => router.push('/settings/products')}
            iconColor={Colors.info}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export & Reports</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon={Download}
            title="Export Data"
            subtitle="CSV for VAT returns & Self Assessment"
            onPress={() => router.push('/settings/export')}
            iconColor={Colors.success}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon={FileText}
            title="Activity Logs"
            subtitle={`${auditLogs.length} logged ${auditLogs.length === 1 ? 'activity' : 'activities'}`}
            onPress={() => router.push('/settings/logs')}
            iconColor={Colors.info}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Summary</Text>
        <View style={styles.dataCard}>
          <View style={styles.dataRow}>
            <Receipt size={16} color={Colors.textSecondary} />
            <Text style={styles.dataLabel}>Transactions</Text>
            <Text style={styles.dataValue}>{transactions.length}</Text>
          </View>
          <View style={styles.dataRow}>
            <FileSpreadsheet size={16} color={Colors.textSecondary} />
            <Text style={styles.dataLabel}>Invoices</Text>
            <Text style={styles.dataValue}>{invoices.length}</Text>
          </View>
          <View style={styles.dataRow}>
            <Receipt size={16} color={Colors.textSecondary} />
            <Text style={styles.dataLabel}>Receipts</Text>
            <Text style={styles.dataValue}>{receipts.length}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.menuCard}>
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: Colors.success + '15' }]}>
              <Shield size={20} color={Colors.success} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>App Lock</Text>
              <Text style={styles.menuSubtitle}>
                {securityMethod === 'both'
                  ? `PIN + ${biometricType} enabled`
                  : securityMethod === 'biometric'
                  ? `${biometricType} enabled`
                  : 'PIN enabled'}
              </Text>
            </View>
            <Lock size={18} color={Colors.success} />
          </View>
          <View style={styles.menuDivider} />
          <MenuItem
            icon={KeyRound}
            title="Change PIN"
            subtitle="Update your 4-digit PIN"
            onPress={() => router.push('/settings/security')}
            iconColor={Colors.primary}
          />
          <View style={styles.menuDivider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Alert.alert(
                'Reset Security',
                'This will remove your PIN and biometric lock. You will need to set up security again.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: () => resetSecurity(),
                  },
                ]
              );
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: Colors.danger + '15' }]}>
              <Shield size={20} color={Colors.danger} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Reset Security</Text>
              <Text style={styles.menuSubtitle}>Remove PIN and biometric lock</Text>
            </View>
            <ChevronRight size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Info size={18} color={Colors.textMuted} />
        <Text style={styles.infoText}>
          UK Tax Year runs 6 April to 5 April. Submit your Self Assessment by 31 January.
          VAT returns are typically quarterly.
        </Text>
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
  taxYearCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  taxYearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  taxYearTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  taxYearDates: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  taxYearStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  taxYearStat: {
    alignItems: 'center',
  },
  taxYearStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  profitPositive: {
    color: Colors.success,
  },
  profitNegative: {
    color: Colors.danger,
  },
  taxYearStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  vatCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  vatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  vatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  vatLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  vatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  vatInput: {
    color: Colors.success,
  },
  vatTotalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 10,
    paddingTop: 14,
  },
  vatTotalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  vatTotalValue: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.warning,
  },
  vatRefund: {
    color: Colors.success,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuContent: {
    flex: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 70,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  menuSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  dataCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  dataLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  dataValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
