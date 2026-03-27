import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Receipt, User, CreditCard, Calendar, Clock, Mail, X, Send } from 'lucide-react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import { formatCurrency, formatDate } from '@/utils/helpers';
import Colors from '@/constants/colors';
import { TransactionLineItem } from '@/types';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transactions, sendTransactionEmail, isSendingTransactionEmail, emailSettings } = useBusiness();
  const [emailModalVisible, setEmailModalVisible] = useState<boolean>(false);
  const [recipientEmail, setRecipientEmail] = useState<string>('');

  const transaction = useMemo(
    () => transactions.find((t) => t.id === id),
    [transactions, id]
  );

  React.useEffect(() => {
    if (transaction) {
      console.log('[TxDetail] Transaction ID:', transaction.id);
      console.log('[TxDetail] positronId:', transaction.positronId);
      console.log('[TxDetail] lineItems count:', transaction.lineItems?.length ?? 'undefined');
      console.log('[TxDetail] itemNames count:', transaction.itemNames?.length ?? 'undefined');
      console.log('[TxDetail] itemCount:', transaction.itemCount);
      if (transaction.lineItems && transaction.lineItems.length > 0) {
        console.log('[TxDetail] First lineItem:', JSON.stringify(transaction.lineItems[0]));
      }
      if (transaction.itemNames && transaction.itemNames.length > 0) {
        console.log('[TxDetail] First itemName:', transaction.itemNames[0]);
      }
    }
  }, [transaction]);

  const handleOpenEmailModal = useCallback(() => {
    setRecipientEmail('');
    setEmailModalVisible(true);
  }, []);

  const handleSendEmail = useCallback(() => {
    if (!transaction) return;
    const trimmed = recipientEmail.trim();
    if (!trimmed) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return;
    }

    console.log('[TxDetail] Sending transaction email to:', trimmed);
    sendTransactionEmail(transaction.id, trimmed);
    setEmailModalVisible(false);
  }, [transaction, recipientEmail, sendTransactionEmail]);

  if (!transaction) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Transaction' }} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Transaction not found</Text>
        </View>
      </View>
    );
  }

  const isIncome = transaction.type === 'income';
  const lineItems = transaction.lineItems || [];
  const tenderParts = parseTenderBreakdown(transaction.tenderUsed || '', transaction.amount);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: transaction.positronId || 'Transaction',
        }}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <View style={[styles.receiptIcon, { backgroundColor: isIncome ? Colors.income + '20' : Colors.expense + '20' }]}>
              <Receipt size={28} color={isIncome ? Colors.income : Colors.expense} />
            </View>
            <Text style={styles.receiptTitle}>
              {transaction.positronId || transaction.description}
            </Text>
            <Text style={[styles.receiptTotal, isIncome ? styles.incomeText : styles.expenseText]}>
              {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
            </Text>
            {transaction.vatAmount > 0 && (
              <Text style={styles.receiptVat}>
                VAT: {formatCurrency(transaction.vatAmount)} ({transaction.vatRate}%)
              </Text>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.infoSection}>
            <InfoRow icon={<Calendar size={16} color={Colors.textSecondary} />} label="Date" value={formatDate(transaction.date)} />
            {transaction.addedBy && (
              <InfoRow icon={<User size={16} color={Colors.textSecondary} />} label="Added By" value={transaction.addedBy} />
            )}
            {transaction.paidBy && (
              <InfoRow icon={<User size={16} color={Colors.textSecondary} />} label="Paid By" value={transaction.paidBy} />
            )}

          </View>

          {lineItems.length > 0 ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Items ({lineItems.length})</Text>
              <View style={styles.itemsHeader}>
                <Text style={[styles.itemHeaderText, styles.itemHeaderProduct]}>Product</Text>
                <Text style={[styles.itemHeaderText, styles.itemHeaderQty]}>Qty</Text>
                <Text style={[styles.itemHeaderText, styles.itemHeaderPrice]}>Price</Text>
                <Text style={[styles.itemHeaderText, styles.itemHeaderSubtotal]}>Subtotal</Text>
              </View>
              {lineItems.map((item, index) => (
                <LineItemRow key={`${item.product}-${index}`} item={item} index={index} />
              ))}
            </>
          ) : (transaction.itemNames && transaction.itemNames.length > 0) ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Items ({transaction.itemNames.length})</Text>
              {transaction.itemNames.map((name, index) => (
                <View key={`${name}-${index}`} style={[styles.lineItem, index % 2 === 0 && styles.lineItemAlt]}>
                  <View style={styles.lineItemProduct}>
                    <Text style={styles.lineItemName} numberOfLines={2}>{name}</Text>
                  </View>
                </View>
              ))}
            </>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.totalsSection}>
            <TotalRow label="Subtotal" value={formatCurrency(transaction.amount - transaction.vatAmount)} />
            <TotalRow label="VAT" value={formatCurrency(transaction.vatAmount)} />
            <View style={styles.totalDivider} />
            <TotalRow label="Total" value={formatCurrency(transaction.amount)} bold />
          </View>

          {tenderParts.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Payment</Text>
              {tenderParts.map((tender, index) => (
                <View key={index} style={styles.tenderRow}>
                  <View style={styles.tenderLeft}>
                    <CreditCard size={14} color={Colors.textSecondary} />
                    <Text style={styles.tenderMethod}>{tender.method}</Text>
                  </View>
                  <Text style={styles.tenderAmount}>{formatCurrency(tender.amount)}</Text>
                </View>
              ))}
              {(transaction.amountPaid ?? 0) > 0 && (
                <View style={styles.tenderRow}>
                  <Text style={styles.tenderLabel}>Amount Paid</Text>
                  <Text style={styles.tenderAmount}>{formatCurrency(transaction.amountPaid ?? 0)}</Text>
                </View>
              )}
              {(transaction.change ?? 0) > 0 && (
                <View style={styles.tenderRow}>
                  <Text style={styles.tenderLabel}>Change</Text>
                  <Text style={styles.tenderAmount}>{formatCurrency(transaction.change ?? 0)}</Text>
                </View>
              )}
            </>
          )}

          {transaction.syncedAt && (
            <>
              <View style={styles.divider} />
              <View style={styles.syncInfo}>
                <Clock size={12} color={Colors.textMuted} />
                <Text style={styles.syncText}>
                  Synced {formatDate(transaction.syncedAt)}
                </Text>
              </View>
            </>
          )}
        </View>

        {emailSettings.isConfigured && (
          <TouchableOpacity
            style={[styles.emailButton, isSendingTransactionEmail && styles.emailButtonDisabled]}
            onPress={handleOpenEmailModal}
            disabled={isSendingTransactionEmail}
            activeOpacity={0.8}
            testID="sendTransactionEmailBtn"
          >
            {isSendingTransactionEmail ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Mail size={18} color={Colors.white} />
            )}
            <Text style={styles.emailButtonText}>
              {isSendingTransactionEmail ? 'Sending...' : 'Send via Email'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal
        visible={emailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setEmailModalVisible(false)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Transaction</Text>
              <TouchableOpacity
                onPress={() => setEmailModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Enter the recipient&apos;s email address. A PDF of this transaction will be attached.
            </Text>

            <View style={styles.inputWrapper}>
              <Mail size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.emailInput}
                placeholder="name@example.com"
                placeholderTextColor={Colors.textMuted}
                value={recipientEmail}
                onChangeText={setRecipientEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                testID="recipientEmailInput"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEmailModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!recipientEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim())) && styles.sendButtonDisabled,
                ]}
                onPress={handleSendEmail}
                disabled={!recipientEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim())}
              >
                <Send size={16} color={Colors.white} />
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        {icon}
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function LineItemRow({ item, index }: { item: TransactionLineItem; index: number }) {
  const isMsg = item.product.startsWith('MSG -');
  return (
    <View style={[styles.lineItem, index % 2 === 0 && styles.lineItemAlt]}>
      <View style={styles.lineItemProduct}>
        <Text style={[styles.lineItemName, isMsg && styles.lineItemMsg]} numberOfLines={2}>
          {item.product}
        </Text>
        {item.department ? (
          <Text style={styles.lineItemDept} numberOfLines={1}>{item.department}</Text>
        ) : null}
      </View>
      <Text style={styles.lineItemQty}>{item.quantity}</Text>
      <Text style={styles.lineItemPrice}>{formatCurrency(item.price)}</Text>
      <Text style={styles.lineItemSubtotal}>{formatCurrency(item.subtotal)}</Text>
    </View>
  );
}

function TotalRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, bold && styles.totalBold]}>{label}</Text>
      <Text style={[styles.totalValue, bold && styles.totalBold]}>{value}</Text>
    </View>
  );
}

interface TenderPart {
  method: string;
  amount: number;
}

function parseTenderBreakdown(tenderStr: string, transactionTotal: number): TenderPart[] {
  if (!tenderStr) return [];

  const multiMatch = tenderStr.match(/^MULTI:\s*(.+)$/i);
  if (multiMatch) {
    const parts = multiMatch[1].split('|').map((p) => p.trim());
    return parts
      .map((part) => {
        const match = part.match(/^(.+?)\s+([\d.]+)$/);
        if (match) {
          return { method: match[1].trim(), amount: parseFloat(match[2]) };
        }
        return null;
      })
      .filter((p): p is TenderPart => p !== null);
  }

  return [{ method: tenderStr, amount: transactionTotal }];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  receiptCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    overflow: 'hidden',
  },
  receiptHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  receiptIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  receiptTotal: {
    fontSize: 28,
    fontWeight: '800' as const,
    marginBottom: 4,
  },
  incomeText: {
    color: Colors.income,
  },
  expenseText: {
    color: Colors.expense,
  },
  receiptVat: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  infoSection: {
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
    flexShrink: 1,
    textAlign: 'right' as const,
    maxWidth: '55%' as unknown as number,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  itemsHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemHeaderText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
  },
  itemHeaderProduct: {
    flex: 1,
  },
  itemHeaderQty: {
    width: 36,
    textAlign: 'center' as const,
  },
  itemHeaderPrice: {
    width: 60,
    textAlign: 'right' as const,
  },
  itemHeaderSubtotal: {
    width: 65,
    textAlign: 'right' as const,
  },
  lineItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  lineItemAlt: {
    backgroundColor: Colors.background + '40',
  },
  lineItemProduct: {
    flex: 1,
    paddingRight: 8,
  },
  lineItemName: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  lineItemMsg: {
    fontStyle: 'italic' as const,
    color: Colors.textMuted,
  },
  lineItemDept: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  lineItemQty: {
    width: 36,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
  },
  lineItemPrice: {
    width: 60,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'right' as const,
  },
  lineItemSubtotal: {
    width: 65,
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'right' as const,
  },
  totalsSection: {
    padding: 16,
    gap: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  totalValue: {
    fontSize: 14,
    color: Colors.text,
  },
  totalBold: {
    fontWeight: '700' as const,
    fontSize: 16,
    color: Colors.text,
  },
  totalDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  tenderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  tenderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tenderMethod: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  tenderLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  tenderAmount: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  syncInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 16,
  },
  syncText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    gap: 10,
    marginTop: 16,
  },
  emailButtonDisabled: {
    opacity: 0.55,
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: {
    width: '88%',
    maxWidth: 400,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  modalDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 20,
  },
  emailInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
