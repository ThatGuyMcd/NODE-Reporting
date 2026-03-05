import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { CheckCircle, Send, Trash2, Mail, RefreshCw, Pause, Play, XCircle, CreditCard, ExternalLink, RotateCw, Receipt } from 'lucide-react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import { trpc } from '@/lib/trpc';
import { formatCurrency, formatDate, generateInvoiceText, getVatRateLabel } from '@/utils/helpers';
import Colors from '@/constants/colors';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { invoices, updateInvoice, deleteInvoice, addTransaction, profile, goCardless, startInvoicePayment, completeInvoicePayment, resendInvoiceEmail, isSendingEmail, sendReceipt, isSendingReceipt, emailSettings } = useBusiness();

  const invoice = invoices.find((i) => i.id === id);

  const createFlowMutation = trpc.gocardless.createInvoicePaymentFlow.useMutation({
    onError: (error) => {
      console.error('GoCardless create flow failed:', error.message);
      Alert.alert('Payment setup failed', error.message);
    },
  });

  const completeFlowMutation = trpc.gocardless.completeBillingRequestFlow.useMutation({
    onError: (error) => {
      console.error('GoCardless complete flow failed:', error.message);
      Alert.alert('Payment status check failed', error.message);
    },
  });

  if (!invoice) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Invoice not found</Text>
      </View>
    );
  }

  const handleMarkAsSent = () => {
    updateInvoice(invoice.id, { status: 'sent' });
  };

  const openGoCardlessCheckout = async (authorisationUrl: string) => {
    try {
      console.log('Opening GoCardless checkout:', authorisationUrl);
      const result = await WebBrowser.openBrowserAsync(authorisationUrl, {
        enableBarCollapsing: true,
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
      console.log('GoCardless checkout closed:', result);
      return result;
    } catch (e) {
      console.error('Failed to open browser:', e);
      Alert.alert('Unable to open browser', 'Please try again.');
      return null;
    }
  };

  const handleGoCardlessPay = async () => {
    if (!goCardless.isConnected || !goCardless.accessToken) {
      Alert.alert('GoCardless not connected', 'Go to Settings → GoCardless Payments to connect first.');
      return;
    }

    if (invoice.status === 'paid') {
      Alert.alert('Already paid', 'This invoice is already marked as paid.');
      return;
    }

    const amountPence = Math.round(invoice.total * 100);
    if (!Number.isFinite(amountPence) || amountPence <= 0) {
      Alert.alert('Invalid amount', 'This invoice total looks invalid.');
      return;
    }

    const [givenNameRaw, ...familyParts] = invoice.clientName.trim().split(' ');
    const givenName = givenNameRaw || 'Customer';
    const familyName = familyParts.join(' ') || 'Customer';

    const redirectUri = 'https://example.com/gocardless/success';
    const exitUri = 'https://example.com/gocardless/exit';

    console.log('Creating GoCardless billing request flow', {
      invoiceId: invoice.id,
      amountPence,
      environment: goCardless.environment,
    });

    const res = await createFlowMutation.mutateAsync({
      accessToken: goCardless.accessToken,
      environment: goCardless.environment,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amountPence,
      currency: 'GBP',
      description: `Invoice ${invoice.invoiceNumber} - ${profile.businessName || 'Business'}`,
      customer: {
        email: invoice.clientEmail,
        givenName,
        familyName,
      },
      redirectUri,
      exitUri,
    });

    startInvoicePayment(invoice.id, 'gocardless', res.flowId);

    await openGoCardlessCheckout(res.authorisationUrl);

    Alert.alert(
      'Checkout opened',
      'After your customer completes checkout, tap “Refresh payment status” to pull the latest status.',
    );
  };

  const handleRefreshGoCardlessStatus = async () => {
    if (!goCardless.isConnected || !goCardless.accessToken) {
      Alert.alert('GoCardless not connected', 'Go to Settings → GoCardless Payments to connect first.');
      return;
    }

    if (!invoice.paymentId) {
      Alert.alert('No payment in progress', 'Start a GoCardless payment flow for this invoice first.');
      return;
    }

    console.log('Completing GoCardless flow / refreshing status', {
      flowId: invoice.paymentId,
      invoiceId: invoice.id,
    });

    const result = await completeFlowMutation.mutateAsync({
      accessToken: goCardless.accessToken,
      environment: goCardless.environment,
      billingRequestFlowId: invoice.paymentId,
    });

    const paymentStatus = result.payment?.status ?? result.billingRequestStatus;
    const isPaid = paymentStatus === 'paid' || paymentStatus === 'confirmed';

    console.log('GoCardless status result:', result);

    if (result.payment?.id) {
      completeInvoicePayment(invoice.id, 'gocardless', result.payment.id, isPaid);
    }

    Alert.alert('Payment status', `Current status: ${paymentStatus}`);
  };

  const handleMarkAsPaid = () => {
    Alert.alert(
      'Mark as Paid',
      'This will also record the payment as income. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            updateInvoice(invoice.id, { status: 'paid', paidAt: new Date().toISOString() });
            addTransaction({
              type: 'income',
              amount: invoice.total,
              vatRate: invoice.vatRate,
              vatAmount: invoice.vatAmount,
              description: `Invoice ${invoice.invoiceNumber} - ${invoice.clientName}`,
              category: 'Services',
              date: new Date().toISOString().split('T')[0],
              clientName: invoice.clientName,
              invoiceId: invoice.id,
              items: invoice.items,
            });

            if (invoice.clientEmail && invoice.clientEmail.trim()) {
              setTimeout(() => {
                Alert.alert(
                  'Send Receipt?',
                  `Would you like to send a payment receipt to ${invoice.clientEmail}?`,
                  [
                    { text: 'Not Now', style: 'cancel' },
                    {
                      text: 'Send Receipt',
                      onPress: () => sendReceipt(invoice.id),
                    },
                  ]
                );
              }, 500);
            }
          },
        },
      ]
    );
  };

  const handleSendReceipt = () => {
    if (!invoice.clientEmail || !invoice.clientEmail.trim()) {
      Alert.alert('No Email', 'This client does not have an email address on file.');
      return;
    }
    sendReceipt(invoice.id);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Invoice',
      'Are you sure you want to delete this invoice?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteInvoice(invoice.id);
            router.back();
          },
        },
      ]
    );
  };


  const getRecurringStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return Colors.success;
      case 'paused':
        return Colors.warning;
      case 'cancelled':
        return Colors.danger;
      default:
        return Colors.textMuted;
    }
  };

  const handlePauseRecurring = () => {
    Alert.alert(
      'Pause Recurring Invoice',
      'This will pause future automatic invoices. You can resume at any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pause',
          onPress: () => {
            updateInvoice(invoice.id, { recurringStatus: 'paused' });
          },
        },
      ]
    );
  };

  const handleResumeRecurring = () => {
    updateInvoice(invoice.id, { recurringStatus: 'active' });
  };

  const handleCancelRecurring = () => {
    Alert.alert(
      'Cancel Recurring Invoice',
      'This will permanently stop all future automatic invoices. This action cannot be undone.',
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'Cancel Recurring',
          style: 'destructive',
          onPress: () => {
            updateInvoice(invoice.id, { 
              recurringStatus: 'cancelled',
              nextRecurringDate: undefined,
            });
          },
        },
      ]
    );
  };

  const handleEmail = async () => {
    if (!invoice.clientEmail) {
      Alert.alert('No Email', 'This client does not have an email address on file.');
      return;
    }

    const invoiceText = generateInvoiceText(invoice, {
      businessName: profile.businessName || 'My Business',
      address: profile.address || '',
      email: profile.email || '',
      phone: profile.phone || '',
      vatNumber: profile.vatNumber,
      bankAccountName: profile.bankAccountName,
      bankName: profile.bankName,
      bankSortCode: profile.bankSortCode,
      bankAccountNumber: profile.bankAccountNumber,
    });

    const subject = encodeURIComponent(`Invoice ${invoice.invoiceNumber} from ${profile.businessName || 'My Business'}`);
    const body = encodeURIComponent(invoiceText);
    const mailtoUrl = `mailto:${invoice.clientEmail}?subject=${subject}&body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert('Error', 'Unable to open email client');
      }
    } catch (error) {
      console.log('Error opening email:', error);
      Alert.alert('Error', 'Unable to open email client');
    }
  };

  const statusColors = {
    draft: Colors.textMuted,
    sent: Colors.warning,
    paid: Colors.success,
    overdue: Colors.danger,
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColors[invoice.status] + '20' },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColors[invoice.status] }]}>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </Text>
          </View>
        </View>
        <Text style={styles.total}>{formatCurrency(invoice.total)}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Client</Text>
        <View style={styles.card}>
          <Text style={styles.clientName}>{invoice.clientName}</Text>
          {invoice.clientEmail && (
            <Text style={styles.clientDetail}>{invoice.clientEmail}</Text>
          )}
          {invoice.clientAddress && (
            <Text style={styles.clientDetail}>{invoice.clientAddress}</Text>
          )}
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dates</Text>
        <View style={styles.card}>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Issue Date</Text>
            <Text style={styles.dateValue}>{formatDate(invoice.issueDate)}</Text>
          </View>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Due Date</Text>
            <Text style={styles.dateValue}>{formatDate(invoice.dueDate)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        <View style={styles.card}>
          {invoice.items.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.itemRow,
                index < invoice.items.length - 1 && styles.itemRowBorder,
              ]}
            >
              <View style={styles.itemInfo}>
                <Text style={styles.itemDescription}>{item.description}</Text>
                <Text style={styles.itemQuantity}>
                  {item.quantity} × {formatCurrency(item.unitPrice)} • VAT {item.vatRate ?? 0}%
                </Text>
              </View>
              <Text style={styles.itemTotal}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Net (ex. VAT)</Text>
          <Text style={styles.summaryValue}>{formatCurrency(invoice.subtotal)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>VAT ({getVatRateLabel(invoice.items)})</Text>
          <Text style={styles.summaryValue}>{formatCurrency(invoice.vatAmount)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryTotal]}>
          <Text style={styles.summaryTotalLabel}>Total (inc. VAT)</Text>
          <Text style={styles.summaryTotalValue}>{formatCurrency(invoice.total)}</Text>
        </View>
      </View>
      {(profile.bankAccountName || profile.bankName || profile.bankSortCode || profile.bankAccountNumber) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bank Transfer Details</Text>
          <View style={styles.card} testID="bankTransferCard">
            {profile.bankAccountName && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Account Name</Text>
                <Text style={styles.detailValue}>{profile.bankAccountName}</Text>
              </View>
            )}
            {profile.bankName && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Bank</Text>
                <Text style={styles.detailValue}>{profile.bankName}</Text>
              </View>
            )}
            {profile.bankSortCode && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Sort Code</Text>
                <Text style={styles.detailValue}>{profile.bankSortCode}</Text>
              </View>
            )}
            {profile.bankAccountNumber && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Account Number</Text>
                <Text style={styles.detailValue}>{profile.bankAccountNumber}</Text>
              </View>
            )}
          </View>
        </View>
      )}
      {invoice.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.card}>
            <Text style={styles.notes}>{invoice.notes}</Text>
          </View>
        </View>
      )}
      {invoice.isRecurring && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recurring Details</Text>
          <View style={styles.card}>
            <View style={styles.recurringHeader}>
              <View style={styles.recurringRow}>
                <RefreshCw size={16} color={Colors.primary} />
                <Text style={styles.recurringText}>
                  Repeats {invoice.recurringFrequency}
                </Text>
              </View>
              <View
                style={[
                  styles.recurringStatusBadge,
                  { backgroundColor: getRecurringStatusColor(invoice.recurringStatus || 'active') + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.recurringStatusText,
                    { color: getRecurringStatusColor(invoice.recurringStatus || 'active') },
                  ]}
                >
                  {(invoice.recurringStatus || 'active').charAt(0).toUpperCase() +
                    (invoice.recurringStatus || 'active').slice(1)}
                </Text>
              </View>
            </View>
            {invoice.recurringStatus !== 'cancelled' && invoice.nextRecurringDate && (
              <Text style={styles.recurringDetail}>
                Next invoice: {formatDate(invoice.nextRecurringDate)}
              </Text>
            )}
            {invoice.recurringEndDate && (
              <Text style={styles.recurringDetail}>
                Ends: {formatDate(invoice.recurringEndDate)}
              </Text>
            )}
            {invoice.recurringStatus === 'cancelled' && (
              <Text style={styles.recurringCancelled}>
                This recurring invoice has been cancelled
              </Text>
            )}
            {invoice.recurringStatus === 'paused' && (
              <Text style={styles.recurringPaused}>
                Recurring invoices are paused
              </Text>
            )}
          </View>
          {invoice.recurringStatus !== 'cancelled' && (
            <View style={styles.recurringActions}>
              {invoice.recurringStatus !== 'paused' ? (
                <TouchableOpacity
                  style={styles.recurringActionButton}
                  onPress={handlePauseRecurring}
                >
                  <Pause size={16} color={Colors.warning} />
                  <Text style={[styles.recurringActionText, { color: Colors.warning }]}>
                    Pause Recurring
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.recurringActionButton}
                  onPress={handleResumeRecurring}
                >
                  <Play size={16} color={Colors.success} />
                  <Text style={[styles.recurringActionText, { color: Colors.success }]}>
                    Resume Recurring
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.recurringActionButton}
                onPress={handleCancelRecurring}
              >
                <XCircle size={16} color={Colors.danger} />
                <Text style={[styles.recurringActionText, { color: Colors.danger }]}>
                  Cancel Recurring
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      {goCardless.isConnected && invoice.status !== 'paid' && (
        <View style={styles.paymentCard} testID="gocardlessPaymentCard">
          <View style={styles.paymentHeader}>
            <View style={styles.paymentIconWrap}>
              <CreditCard size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentTitle}>Get paid with GoCardless</Text>
              <Text style={styles.paymentSubtitle}>Generate a secure hosted checkout link for this invoice.</Text>
            </View>
          </View>
          <View style={styles.paymentActions}>
            <TouchableOpacity
              style={[styles.paymentButton, styles.paymentButtonPrimary]}
              onPress={handleGoCardlessPay}
              activeOpacity={0.85}
              disabled={createFlowMutation.isPending}
              testID="gocardlessPayBtn"
            >
              <ExternalLink size={16} color={Colors.white} />
              <Text style={styles.paymentButtonText}>
                {createFlowMutation.isPending ? 'Creating link…' : 'Open checkout'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paymentButton, styles.paymentButtonSecondary]}
              onPress={handleRefreshGoCardlessStatus}
              activeOpacity={0.85}
              disabled={completeFlowMutation.isPending}
              testID="gocardlessRefreshBtn"
            >
              <RotateCw size={16} color={Colors.primary} />
              <Text style={[styles.paymentButtonText, { color: Colors.primary }]}>
                {completeFlowMutation.isPending ? 'Refreshing…' : 'Refresh status'}
              </Text>
            </TouchableOpacity>
          </View>
          {invoice.paymentStatus ? (
            <Text style={styles.paymentHint} testID="gocardlessPaymentHint">
              Status: <Text style={styles.paymentHintStrong}>{invoice.paymentStatus}</Text>
            </Text>
          ) : null}
        </View>
      )}
      {!emailSettings.isConfigured && (
        <View style={styles.shareActions}>
          <TouchableOpacity style={styles.emailButton} onPress={handleEmail} testID="emailClientBtn">
            <Mail size={18} color={Colors.white} />
            <Text style={styles.emailButtonText}>Email to Client</Text>
          </TouchableOpacity>
        </View>
      )}
      {invoice.clientEmail && invoice.status !== 'paid' && (
        <TouchableOpacity
          style={[styles.resendButton, isSendingEmail && styles.resendButtonDisabled]}
          onPress={() => resendInvoiceEmail(invoice.id)}
          disabled={isSendingEmail}
          activeOpacity={0.8}
          testID="resendEmailBtn"
        >
          <Send size={16} color={Colors.primary} />
          <Text style={styles.resendButtonText}>
            {isSendingEmail ? 'Sending...' : 'Resend Invoice Email'}
          </Text>
        </TouchableOpacity>
      )}
      {invoice.status === 'paid' && invoice.clientEmail && (
        <TouchableOpacity
          style={[styles.receiptButton, isSendingReceipt && styles.resendButtonDisabled]}
          onPress={handleSendReceipt}
          disabled={isSendingReceipt}
          activeOpacity={0.8}
          testID="sendReceiptBtn"
        >
          <Receipt size={16} color={Colors.success} />
          <Text style={styles.receiptButtonText}>
            {isSendingReceipt ? 'Sending...' : 'Send Receipt via Email'}
          </Text>
        </TouchableOpacity>
      )}
      <View style={styles.actions}>
        {invoice.status === 'draft' && (
          <TouchableOpacity style={styles.actionButton} onPress={handleMarkAsSent}>
            <Send size={18} color={Colors.white} />
            <Text style={styles.actionButtonText}>Mark as Sent</Text>
          </TouchableOpacity>
        )}
        {(invoice.status === 'sent' || invoice.status === 'overdue') && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSuccess]}
            onPress={handleMarkAsPaid}
          >
            <CheckCircle size={18} color={Colors.white} />
            <Text style={styles.actionButtonText}>Mark as Paid</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonDanger]}
          onPress={handleDelete}
        >
          <Trash2 size={18} color={Colors.white} />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
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
    padding: 20,
    paddingBottom: 40,
  },
  errorText: {
    color: Colors.text,
    textAlign: 'center',
    marginTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  invoiceNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  total: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 16,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  clientDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  dateLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemInfo: {
    flex: 1,
  },
  itemDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  summaryCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  paymentCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  paymentIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  paymentSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  paymentButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  paymentButtonSecondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
  },
  paymentButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.white,
  },
  paymentHint: {
    marginTop: 10,
    fontSize: 12,
    color: Colors.textMuted,
  },
  paymentHintStrong: {
    color: Colors.text,
    fontWeight: '800',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 8,
    paddingTop: 12,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  notes: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    gap: 10,
  },
  actionButtonSuccess: {
    backgroundColor: Colors.success,
  },
  actionButtonDanger: {
    backgroundColor: Colors.danger,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  shareActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  emailButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    gap: 8,
  },
  emailButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary + '12',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    gap: 8,
    marginBottom: 20,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.success + '12',
    borderWidth: 1,
    borderColor: Colors.success + '30',
    gap: 8,
    marginBottom: 20,
  },
  receiptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
  },
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recurringText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  recurringDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
    marginLeft: 24,
  },
  recurringHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recurringStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recurringStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recurringCancelled: {
    fontSize: 14,
    color: Colors.danger,
    marginTop: 8,
    fontStyle: 'italic' as const,
  },
  recurringPaused: {
    fontSize: 14,
    color: Colors.warning,
    marginTop: 8,
    fontStyle: 'italic' as const,
  },
  recurringActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  recurringActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  recurringActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
