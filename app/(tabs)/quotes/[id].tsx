import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle, Send, Trash2, Mail, Share2, FileText, XCircle } from 'lucide-react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import { formatCurrency, formatDate, generateQuoteText, getVatRateLabel } from '@/utils/helpers';
import { trpc } from '@/lib/trpc';
import Colors from '@/constants/colors';

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { quotes, updateQuote, deleteQuote, convertQuoteToInvoice, profile, emailSettings } = useBusiness();
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const sendQuoteMutation = trpc.quote.sendQuote.useMutation({
    onSuccess: (data) => {
      setIsSendingEmail(false);
      Alert.alert('Success', data.message);
      updateQuote(id!, { status: 'sent' });
    },
    onError: (error) => {
      setIsSendingEmail(false);
      console.log('Error sending quote:', error);
      Alert.alert('Error', error.message || 'Failed to send quote');
    },
  });

  const quote = quotes.find((q) => q.id === id);

  if (!quote) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Quote not found</Text>
      </View>
    );
  }

  const handleMarkAsSent = () => {
    updateQuote(quote.id, { status: 'sent' });
  };

  const handleAccept = () => {
    Alert.alert(
      'Accept Quote',
      'Do you want to convert this quote to an invoice?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept Only',
          onPress: () => {
            updateQuote(quote.id, { status: 'accepted' });
          },
        },
        {
          text: 'Convert to Invoice',
          onPress: () => {
            const invoice = convertQuoteToInvoice(quote.id);
            if (invoice) {
              Alert.alert('Success', `Invoice ${invoice.invoiceNumber} created!`);
            }
          },
        },
      ]
    );
  };

  const handleDecline = () => {
    Alert.alert(
      'Decline Quote',
      'Are you sure you want to mark this quote as declined?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => {
            updateQuote(quote.id, { status: 'declined' });
          },
        },
      ]
    );
  };

  const handleConvertToInvoice = () => {
    Alert.alert(
      'Convert to Invoice',
      'This will create a new invoice based on this quote.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Convert',
          onPress: () => {
            const invoice = convertQuoteToInvoice(quote.id);
            if (invoice) {
              Alert.alert('Success', `Invoice ${invoice.invoiceNumber} created!`);
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Quote',
      'Are you sure you want to delete this quote?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteQuote(quote.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    try {
      const quoteText = generateQuoteText(quote, {
        businessName: profile.businessName || 'My Business',
        address: profile.address || '',
        email: profile.email || '',
        phone: profile.phone || '',
        vatNumber: profile.vatNumber,
      });

      await Share.share({
        message: quoteText,
        title: `Quote ${quote.quoteNumber}`,
      });
    } catch (error) {
      console.log('Error sharing quote:', error);
    }
  };

  const handleEmail = async () => {
    if (!quote.clientEmail) {
      Alert.alert('No Email', 'This client does not have an email address on file.');
      return;
    }

    if (emailSettings?.isConfigured) {
      Alert.alert(
        'Send Quote',
        'How would you like to send this quote?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Use Email App',
            onPress: openEmailClient,
          },
          {
            text: 'Send Directly',
            onPress: sendQuoteDirectly,
          },
        ]
      );
    } else {
      openEmailClient();
    }
  };

  const openEmailClient = async () => {
    if (!quote.clientEmail) return;

    const quoteText = generateQuoteText(quote, {
      businessName: profile.businessName || 'My Business',
      address: profile.address || '',
      email: profile.email || '',
      phone: profile.phone || '',
      vatNumber: profile.vatNumber,
    });

    const subject = encodeURIComponent(`Quote ${quote.quoteNumber} from ${profile.businessName || 'My Business'}`);
    const body = encodeURIComponent(quoteText);
    const mailtoUrl = `mailto:${quote.clientEmail}?subject=${subject}&body=${body}`;

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

  const sendQuoteDirectly = () => {
    if (!quote.clientEmail || !emailSettings) return;

    setIsSendingEmail(true);
    sendQuoteMutation.mutate({
      quoteNumber: quote.quoteNumber,
      clientName: quote.clientName,
      clientEmail: quote.clientEmail,
      items: quote.items,
      subtotal: quote.subtotal,
      vatAmount: quote.vatAmount,
      total: quote.total,
      vatRate: quote.vatRate,
      issueDate: formatDate(quote.issueDate),
      validUntil: formatDate(quote.validUntil),
      notes: quote.notes,
      businessName: profile.businessName || 'My Business',
      businessEmail: profile.email || '',
      businessAddress: profile.address || '',
      businessPhone: profile.phone,
      vatNumber: profile.vatNumber,
      emailSettings: emailSettings,
    });
  };

  const statusColors = {
    draft: Colors.textMuted,
    sent: Colors.warning,
    accepted: Colors.success,
    declined: Colors.danger,
    expired: Colors.textMuted,
  };

  const isExpired = new Date(quote.validUntil) < new Date() && quote.status !== 'accepted' && quote.status !== 'declined';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.quoteNumber}>{quote.quoteNumber}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: (isExpired ? Colors.textMuted : statusColors[quote.status]) + '20' },
            ]}
          >
            <Text style={[styles.statusText, { color: isExpired ? Colors.textMuted : statusColors[quote.status] }]}>
              {isExpired ? 'Expired' : quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
            </Text>
          </View>
        </View>
        <Text style={styles.total}>{formatCurrency(quote.total)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Client</Text>
        <View style={styles.card}>
          <Text style={styles.clientName}>{quote.clientName}</Text>
          {quote.clientEmail && (
            <Text style={styles.clientDetail}>{quote.clientEmail}</Text>
          )}
          {quote.clientAddress && (
            <Text style={styles.clientDetail}>{quote.clientAddress}</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dates</Text>
        <View style={styles.card}>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Issue Date</Text>
            <Text style={styles.dateValue}>{formatDate(quote.issueDate)}</Text>
          </View>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Valid Until</Text>
            <Text style={[styles.dateValue, isExpired && styles.expiredDate]}>
              {formatDate(quote.validUntil)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        <View style={styles.card}>
          {quote.items.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.itemRow,
                index < quote.items.length - 1 && styles.itemRowBorder,
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
          <Text style={styles.summaryValue}>{formatCurrency(quote.subtotal)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>VAT ({getVatRateLabel(quote.items)})</Text>
          <Text style={styles.summaryValue}>{formatCurrency(quote.vatAmount)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryTotal]}>
          <Text style={styles.summaryTotalLabel}>Total (inc. VAT)</Text>
          <Text style={styles.summaryTotalValue}>{formatCurrency(quote.total)}</Text>
        </View>
      </View>

      {quote.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.card}>
            <Text style={styles.notes}>{quote.notes}</Text>
          </View>
        </View>
      )}

      {quote.convertedToInvoiceId && (
        <View style={styles.convertedBanner}>
          <FileText size={18} color={Colors.success} />
          <Text style={styles.convertedText}>This quote has been converted to an invoice</Text>
        </View>
      )}

      <View style={styles.shareActions}>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Share2 size={18} color={Colors.primary} />
          <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.emailButton, isSendingEmail && styles.emailButtonDisabled]} 
          onPress={handleEmail}
          disabled={isSendingEmail}
        >
          {isSendingEmail ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Mail size={18} color={Colors.white} />
          )}
          <Text style={styles.emailButtonText}>
            {isSendingEmail ? 'Sending...' : 'Email to Client'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        {quote.status === 'draft' && (
          <TouchableOpacity style={styles.actionButton} onPress={handleMarkAsSent}>
            <Send size={18} color={Colors.white} />
            <Text style={styles.actionButtonText}>Mark as Sent</Text>
          </TouchableOpacity>
        )}
        {(quote.status === 'sent' || quote.status === 'draft') && !quote.convertedToInvoiceId && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSuccess]}
              onPress={handleAccept}
            >
              <CheckCircle size={18} color={Colors.white} />
              <Text style={styles.actionButtonText}>Accept Quote</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonWarning]}
              onPress={handleDecline}
            >
              <XCircle size={18} color={Colors.white} />
              <Text style={styles.actionButtonText}>Decline Quote</Text>
            </TouchableOpacity>
          </>
        )}
        {quote.status === 'accepted' && !quote.convertedToInvoiceId && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={handleConvertToInvoice}
          >
            <FileText size={18} color={Colors.white} />
            <Text style={styles.actionButtonText}>Convert to Invoice</Text>
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
  quoteNumber: {
    fontSize: 24,
    fontWeight: '700' as const,
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
    fontWeight: '600' as const,
  },
  total: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
    color: Colors.text,
  },
  expiredDate: {
    color: Colors.danger,
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
    fontWeight: '500' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  summaryCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
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
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
    color: Colors.text,
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  notes: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  convertedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '15',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  convertedText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.success,
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
  actionButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  actionButtonSuccess: {
    backgroundColor: Colors.success,
  },
  actionButtonWarning: {
    backgroundColor: Colors.warning,
  },
  actionButtonDanger: {
    backgroundColor: Colors.danger,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
    color: Colors.white,
  },
  emailButtonDisabled: {
    opacity: 0.7,
  },
});
