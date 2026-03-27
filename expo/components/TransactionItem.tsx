import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowUpRight, ArrowDownLeft, ChevronRight, ShoppingBag } from 'lucide-react-native';
import { Transaction } from '@/types';
import { formatCurrency, formatShortDate } from '@/utils/helpers';
import Colors from '@/constants/colors';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
}

export default function TransactionItem({ transaction, onPress }: TransactionItemProps) {
  const isIncome = transaction.type === 'income';
  const isSynced = !!transaction.positronId;
  const itemCount = transaction.itemCount || transaction.lineItems?.length || 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: isIncome ? Colors.income + '20' : Colors.expense + '20' },
        ]}
      >
        {isSynced ? (
          <ShoppingBag size={18} color={isIncome ? Colors.income : Colors.expense} />
        ) : isIncome ? (
          <ArrowDownLeft size={18} color={Colors.income} />
        ) : (
          <ArrowUpRight size={18} color={Colors.expense} />
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.transactionId} numberOfLines={1}>
          {isSynced ? transaction.positronId : transaction.description}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {formatShortDate(transaction.date)}
          {itemCount > 0 ? ` • ${itemCount} item${itemCount !== 1 ? 's' : ''}` : ''}
          {transaction.tenderUsed ? ` • ${transaction.tenderUsed.split(':')[0]?.trim()}` : ''}
        </Text>
      </View>
      <View style={styles.rightSection}>
        <Text style={[styles.amount, isIncome ? styles.incomeAmount : styles.expenseAmount]}>
          {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
        </Text>
        {onPress && <ChevronRight size={16} color={Colors.textMuted} style={styles.chevron} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  transactionId: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  incomeAmount: {
    color: Colors.income,
  },
  expenseAmount: {
    color: Colors.expense,
  },
  chevron: {
    marginLeft: 6,
  },
});
