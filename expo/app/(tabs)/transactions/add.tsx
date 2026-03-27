import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/contexts/BusinessContext';
import {
  TransactionType,
  VATRate,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  VAT_RATES,
  InvoiceItem,
} from '@/types';
import { calculateVAT, generateId, getVatRateLabel, getVatRateValue } from '@/utils/helpers';
import DatePickerInput from '@/components/DatePickerInput';
import Colors from '@/constants/colors';

export default function AddTransactionScreen() {
  const router = useRouter();
  const { addTransaction } = useBusiness();

  const [type, setType] = useState<TransactionType>('income');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [defaultVatRate, setDefaultVatRate] = useState<VATRate>(20);
  const [clientName, setClientName] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: generateId(), description: '', quantity: 1, unitPrice: 0, total: 0, vatRate: 20 },
  ]);
  const [priceTexts, setPriceTexts] = useState<Record<string, string>>({});

  const priceKeyboardType = Platform.OS === 'android' ? 'numbers-and-punctuation' : 'decimal-pad';

  const parseCurrencyInput = useCallback((text: string) => {
    const normalized = text.replace(',', '.').replace(/[^0-9.]/g, '');
    const parts = normalized.split('.');
    const safe = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : parts[0];
    const value = parseFloat(safe);
    return Number.isNaN(value) ? 0 : value;
  }, []);

  const handlePriceChange = useCallback((itemId: string, text: string) => {
    const normalized = text.replace(',', '.').replace(/[^0-9.]/g, '');
    const parts = normalized.split('.');
    const safe = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : normalized;
    const limited = safe.includes('.') ? safe.slice(0, safe.indexOf('.') + 3) : safe;
    setPriceTexts((prev) => ({ ...prev, [itemId]: limited }));
    const numValue = parseFloat(limited);
    updateItem(itemId, 'unitPrice', Number.isNaN(numValue) ? 0 : numValue);
  }, []);

  const handlePriceBlur = useCallback((itemId: string) => {
    setPriceTexts((prev) => {
      const raw = prev[itemId];
      if (raw === undefined || raw === '') return prev;
      const num = parseFloat(raw);
      return { ...prev, [itemId]: Number.isNaN(num) ? '0.00' : num.toFixed(2) };
    });
  }, []);

  const getPriceText = useCallback((item: InvoiceItem) => {
    if (priceTexts[item.id] !== undefined) return priceTexts[item.id];
    return item.unitPrice === 0 ? '' : item.unitPrice.toFixed(2);
  }, [priceTexts]);

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = updated.quantity * updated.unitPrice;
        }
        if (field === 'vatRate' && typeof value === 'number') {
          updated.vatRate = value as VATRate;
        }
        return updated;
      })
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: generateId(), description: '', quantity: 1, unitPrice: 0, total: 0, vatRate: defaultVatRate },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) {
      Alert.alert('Error', 'Transaction must have at least one item');
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const grossTotal = items.reduce((sum, item) => sum + item.total, 0);
  const vatAmount = items.reduce((sum, item) => sum + calculateVAT(item.total, item.vatRate ?? 0), 0);
  const netTotal = grossTotal - vatAmount;

  const handleSave = () => {
    if (items.some((item) => !item.description.trim())) {
      Alert.alert('Error', 'Please fill in all item descriptions');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    if (!category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (grossTotal <= 0) {
      Alert.alert('Error', 'Transaction total must be greater than zero');
      return;
    }

    addTransaction({
      type,
      amount: grossTotal,
      vatRate: getVatRateValue(items),
      vatAmount,
      description: description.trim(),
      category,
      date,
      clientName: clientName.trim() || undefined,
      items,
    });

    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeButton, type === 'income' && styles.typeButtonIncomeActive]}
            onPress={() => {
              setType('income');
              setCategory('');
            }}
          >
            <Text
              style={[
                styles.typeButtonText,
                type === 'income' && styles.typeButtonTextActive,
              ]}
            >
              Income
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, type === 'expense' && styles.typeButtonExpenseActive]}
            onPress={() => {
              setType('expense');
              setCategory('');
            }}
          >
            <Text
              style={[
                styles.typeButtonText,
                type === 'expense' && styles.typeButtonTextActive,
              ]}
            >
              Expense
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section} testID="transaction-items-section">
          <Text style={styles.sectionTitle}>Transaction Items</Text>
          {items.map((item, index) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNumber}>Item {index + 1}</Text>
                <TouchableOpacity
                  onPress={() => removeItem(item.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Description"
                placeholderTextColor={Colors.textMuted}
                value={item.description}
                onChangeText={(text) => updateItem(item.id, 'description', text)}
              />
              <View style={styles.itemRow}>
                <View style={styles.itemField}>
                  <Text style={styles.itemLabel}>Qty</Text>
                  <TextInput
                    style={styles.itemInput}
                    keyboardType="number-pad"
                    value={item.quantity.toString()}
                    onChangeText={(text) => updateItem(item.id, 'quantity', parseInt(text) || 0)}
                  />
                </View>
                <View style={styles.itemField}>
                  <Text style={styles.itemLabel}>Unit Price (£ inc. VAT)</Text>
                  <TextInput
                    style={styles.itemInput}
                    keyboardType={priceKeyboardType}
                    inputMode="decimal"
                    value={getPriceText(item)}
                    onChangeText={(text) => handlePriceChange(item.id, text)}
                    onBlur={() => handlePriceBlur(item.id)}
                    onFocus={() => {
                      setPriceTexts((prev) => ({
                        ...prev,
                        [item.id]: prev[item.id] !== undefined ? prev[item.id] : (item.unitPrice === 0 ? '' : item.unitPrice.toString()),
                      }));
                    }}
                  />
                </View>
                <View style={styles.itemField}>
                  <Text style={styles.itemLabel}>Total</Text>
                  <Text style={styles.itemTotal}>£{item.total.toFixed(2)}</Text>
                </View>
              </View>
              <View style={styles.vatRateRow}>
                <Text style={styles.itemLabel}>VAT Rate</Text>
                <View style={styles.vatSelectorInline}>
                  {VAT_RATES.map((rate) => (
                    <TouchableOpacity
                      key={rate.value}
                      style={[styles.vatChip, (item.vatRate ?? 0) === rate.value && styles.vatChipActive]}
                      onPress={() => updateItem(item.id, 'vatRate', rate.value)}
                    >
                      <Text
                        style={[
                          styles.vatChipText,
                          (item.vatRate ?? 0) === rate.value && styles.vatChipTextActive,
                        ]}
                      >
                        {rate.value}%
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addItemButton} onPress={addItem}>
            <Text style={styles.addItemText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            placeholder="What was this for?"
            placeholderTextColor={Colors.textMuted}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {type === 'income' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Client Name (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Client or customer name"
              placeholderTextColor={Colors.textMuted}
              value={clientName}
              onChangeText={setClientName}
            />
          </View>
        )}

        <DatePickerInput
          label="Date"
          value={date}
          onChange={setDate}
          testID="transaction-date"
        />

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    category === cat && styles.categoryChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {grossTotal > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Net (ex. VAT)</Text>
              <Text style={styles.summaryValue}>£{netTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>VAT ({getVatRateLabel(items)})</Text>
              <Text style={styles.summaryValue}>£{vatAmount.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Gross Total (inc. VAT)</Text>
              <Text style={styles.summaryTotalValue}>£{grossTotal.toFixed(2)}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Transaction</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.backgroundCard,
    alignItems: 'center',
  },
  typeButtonIncomeActive: {
    backgroundColor: Colors.income,
  },
  typeButtonExpenseActive: {
    backgroundColor: Colors.expense,
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  typeButtonTextActive: {
    color: Colors.white,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
  },
  itemCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  removeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.expense,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  itemField: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  itemInput: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    paddingVertical: 10,
  },
  vatRateRow: {
    marginTop: 12,
  },
  vatSelectorInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  vatChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.surface,
  },
  vatChipActive: {
    backgroundColor: Colors.primary,
  },
  vatChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  vatChipTextActive: {
    color: Colors.white,
  },
  addItemButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
  },
  addItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.backgroundCard,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: Colors.white,
  },
  vatSelector: {
    gap: 8,
  },
  vatButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.backgroundCard,
  },
  vatButtonActive: {
    backgroundColor: Colors.primary,
  },
  vatButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  vatButtonTextActive: {
    color: Colors.white,
  },
  summaryCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
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
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  summaryTotalValue: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.primary,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.backgroundCard,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  saveButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});
