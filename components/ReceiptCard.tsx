import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Receipt as ReceiptIcon } from 'lucide-react-native';
import { Receipt } from '@/types';
import { formatCurrency, formatDate } from '@/utils/helpers';
import Colors from '@/constants/colors';

interface ReceiptCardProps {
  receipt: Receipt;
  onPress?: () => void;
}

export default function ReceiptCard({ receipt, onPress }: ReceiptCardProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {receipt.imageUri ? (
        <Image source={{ uri: receipt.imageUri }} style={styles.image} />
      ) : (
        <View style={styles.placeholderImage}>
          <ReceiptIcon size={24} color={Colors.textMuted} />
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.vendor} numberOfLines={1}>
          {receipt.vendor}
        </Text>
        <Text style={styles.category}>{receipt.category}</Text>
        <Text style={styles.date}>{formatDate(receipt.date)}</Text>
      </View>
      <View style={styles.amountContainer}>
        <Text style={styles.amount}>{formatCurrency(receipt.amount)}</Text>
        {receipt.vatAmount > 0 && (
          <Text style={styles.vat}>VAT: {formatCurrency(receipt.vatAmount)}</Text>
        )}
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
    padding: 12,
    marginBottom: 10,
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholderImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  vendor: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  category: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  date: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.expense,
  },
  vat: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
