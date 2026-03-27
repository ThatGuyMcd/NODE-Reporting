import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FileText, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react-native';
import { Quote } from '@/types';
import { formatCurrency, formatDate } from '@/utils/helpers';
import Colors from '@/constants/colors';

interface QuoteCardProps {
  quote: Quote;
  onPress?: () => void;
}

const statusConfig = {
  draft: {
    icon: FileText,
    color: Colors.textMuted,
    label: 'Draft',
  },
  sent: {
    icon: Clock,
    color: Colors.warning,
    label: 'Sent',
  },
  accepted: {
    icon: CheckCircle,
    color: Colors.success,
    label: 'Accepted',
  },
  declined: {
    icon: XCircle,
    color: Colors.danger,
    label: 'Declined',
  },
  expired: {
    icon: AlertTriangle,
    color: Colors.textMuted,
    label: 'Expired',
  },
};

export default function QuoteCard({ quote, onPress }: QuoteCardProps) {
  const status = statusConfig[quote.status];
  const StatusIcon = status.icon;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.quoteInfo}>
          <Text style={styles.quoteNumber}>{quote.quoteNumber}</Text>
          <Text style={styles.clientName}>{quote.clientName}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
          <StatusIcon size={12} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        <View>
          <Text style={styles.dateLabel}>Valid Until</Text>
          <Text style={styles.date}>{formatDate(quote.validUntil)}</Text>
        </View>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.total}>{formatCurrency(quote.total)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  quoteInfo: {
    flex: 1,
  },
  quoteNumber: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  clientName: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  dateLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  date: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  totalContainer: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  total: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
});
