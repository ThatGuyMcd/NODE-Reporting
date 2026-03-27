import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { FileText, Edit3, Plus, ChevronRight, Trash2, Send, Pause, XCircle, Play, CheckCircle, User, Mail } from 'lucide-react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import { AuditLog } from '@/types';
import Colors from '@/constants/colors';
import { formatDateTime } from '@/utils/helpers';

const formatDate = (dateString: string): string => formatDateTime(dateString);

const getActionIcon = (action: string) => {
  switch (action) {
    case 'transaction_created':
    case 'invoice_created':
    case 'receipt_created':
    case 'product_created':
      return <Plus size={18} color={Colors.success} />;
    case 'transaction_edited':
    case 'invoice_edited':
    case 'receipt_edited':
    case 'product_edited':
      return <Edit3 size={18} color={Colors.warning} />;
    case 'transaction_deleted':
    case 'invoice_deleted':
    case 'product_deleted':
      return <Trash2 size={18} color={Colors.danger} />;
    case 'invoice_sent':
      return <Send size={18} color={Colors.primary} />;
    case 'invoice_paused':
      return <Pause size={18} color={Colors.warning} />;
    case 'invoice_cancelled':
      return <XCircle size={18} color={Colors.danger} />;
    case 'invoice_resumed':
      return <Play size={18} color={Colors.success} />;
    case 'invoice_marked_paid':
      return <CheckCircle size={18} color={Colors.success} />;
    case 'profile_updated':
      return <User size={18} color={Colors.primary} />;
    case 'email_settings_updated':
      return <Mail size={18} color={Colors.primary} />;
    default:
      return <FileText size={18} color={Colors.textSecondary} />;
  }
};

const getActionLabel = (action: string): string => {
  switch (action) {
    case 'transaction_created':
      return 'Transaction Created';
    case 'transaction_edited':
      return 'Transaction Edited';
    case 'transaction_deleted':
      return 'Transaction Deleted';
    case 'invoice_created':
      return 'Invoice Created';
    case 'invoice_edited':
      return 'Invoice Edited';
    case 'invoice_deleted':
      return 'Invoice Deleted';
    case 'invoice_sent':
      return 'Invoice Sent';
    case 'invoice_paused':
      return 'Recurring Paused';
    case 'invoice_cancelled':
      return 'Recurring Cancelled';
    case 'invoice_resumed':
      return 'Recurring Resumed';
    case 'invoice_marked_paid':
      return 'Marked Paid';
    case 'receipt_created':
      return 'Receipt Created';
    case 'receipt_edited':
      return 'Receipt Edited';
    case 'product_created':
      return 'Product Created';
    case 'product_edited':
      return 'Product Edited';
    case 'product_deleted':
      return 'Product Deleted';
    case 'profile_updated':
      return 'Profile Updated';
    case 'email_settings_updated':
      return 'Email Settings';
    default:
      return action;
  }
};

const getActionColor = (action: string): string => {
  switch (action) {
    case 'transaction_created':
    case 'invoice_created':
    case 'receipt_created':
    case 'product_created':
    case 'invoice_resumed':
    case 'invoice_marked_paid':
      return Colors.success;
    case 'transaction_edited':
    case 'invoice_edited':
    case 'receipt_edited':
    case 'product_edited':
    case 'invoice_paused':
      return Colors.warning;
    case 'transaction_deleted':
    case 'invoice_deleted':
    case 'product_deleted':
    case 'invoice_cancelled':
      return Colors.danger;
    case 'invoice_sent':
    case 'profile_updated':
    case 'email_settings_updated':
      return Colors.primary;
    default:
      return Colors.textSecondary;
  }
};

interface LogItemProps {
  log: AuditLog;
  expanded: boolean;
  onToggle: () => void;
}

function LogItem({ log, expanded, onToggle }: LogItemProps) {
  return (
    <TouchableOpacity
      style={styles.logCard}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.logHeader}>
        <View style={styles.logIconContainer}>
          {getActionIcon(log.action)}
        </View>
        <View style={styles.logInfo}>
          <View style={styles.logTitleRow}>
            <Text style={styles.logEntityName} numberOfLines={1}>
              {log.entityName}
            </Text>
            <View style={[styles.actionBadge, { backgroundColor: getActionColor(log.action) + '20' }]}>
              <Text style={[styles.actionBadgeText, { color: getActionColor(log.action) }]}>
                {getActionLabel(log.action)}
              </Text>
            </View>
          </View>
          <Text style={styles.logTimestamp}>{formatDate(log.timestamp)}</Text>
        </View>
        <View style={[styles.chevron, expanded && styles.chevronExpanded]}>
          <ChevronRight size={18} color={Colors.textMuted} />
        </View>
      </View>

      {expanded && log.changes.length > 0 && (
        <View style={styles.changesContainer}>
          <Text style={styles.changesTitle}>Changes:</Text>
          {log.changes.map((change, index) => (
            <View key={index} style={styles.changeRow}>
              <Text style={styles.changeField}>{change.field}</Text>
              <View style={styles.changeValues}>
                {change.oldValue !== undefined && (
                  <Text style={styles.oldValue} numberOfLines={1}>
                    {String(change.oldValue)}
                  </Text>
                )}
                {change.oldValue !== undefined && <Text style={styles.arrow}>→</Text>}
                <Text style={styles.newValue} numberOfLines={1}>
                  {String(change.newValue)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function LogsScreen() {
  const { auditLogs } = useBusiness();
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const sortedLogs = useMemo(() => {
    return [...auditLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [auditLogs]);

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{auditLogs.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {auditLogs.filter((l) => l.action.includes('_created')).length}
          </Text>
          <Text style={styles.summaryLabel}>Created</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {auditLogs.filter((l) => l.action.includes('_edited') || l.action.includes('_updated')).length}
          </Text>
          <Text style={styles.summaryLabel}>Edits</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {auditLogs.filter((l) => l.action.includes('_deleted')).length}
          </Text>
          <Text style={styles.summaryLabel}>Deleted</Text>
        </View>
      </View>

      <FlatList
        data={sortedLogs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LogItem
            log={item}
            expanded={expandedId === item.id}
            onToggle={() => toggleExpanded(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <FileText size={40} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyText}>No audit logs yet</Text>
            <Text style={styles.emptySubtext}>
              Activity logs will appear here as you use the app
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundCard,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  logCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  logIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logInfo: {
    flex: 1,
    marginLeft: 12,
  },
  logTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logEntityName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  actionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  logTimestamp: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  chevron: {
    marginLeft: 8,
  },
  chevronExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  changesContainer: {
    padding: 14,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 0,
  },
  changesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  changeField: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
    width: 80,
    textTransform: 'capitalize',
  },
  changeValues: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  oldValue: {
    fontSize: 13,
    color: Colors.danger,
    textDecorationLine: 'line-through',
    maxWidth: '40%',
  },
  arrow: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  newValue: {
    fontSize: 13,
    color: Colors.success,
    maxWidth: '40%',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
