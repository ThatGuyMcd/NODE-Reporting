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
import { Plus, Trash2 } from 'lucide-react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import { VATRate, VAT_RATES, InvoiceItem, RecurringFrequency, RECURRING_FREQUENCIES } from '@/types';
import { generateInvoiceNumber, generateId, calculateVAT, calculateNextRecurringDate, getVatRateLabel, getVatRateValue } from '@/utils/helpers';
import DatePickerInput from '@/components/DatePickerInput';
import Colors from '@/constants/colors';

export default function CreateInvoiceScreen() {
  const router = useRouter();
  const { addInvoice, searchProducts } = useBusiness();

  const [clientName, setClientName] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [clientAddress, setClientAddress] = useState<string>('');
  const defaultVatRate: VATRate = 20;
  const [dueDate, setDueDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: generateId(), description: '', quantity: 1, unitPrice: 0, total: 0, vatRate: 20 },
  ]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>('monthly');
  const [recurringEndDate, setRecurringEndDate] = useState<string>('');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ id: string; description: string; unitPrice: number }[]>([]);
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

    if (field === 'description' && typeof value === 'string') {
      if (value.trim().length > 0) {
        const results = searchProducts(value);
        setSuggestions(results);
        setActiveItemId(id);
      } else {
        setSuggestions([]);
        setActiveItemId(null);
      }
    }
  };

  const selectSuggestion = useCallback((itemId: string, product: { description: string; unitPrice: number }) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const updated = {
          ...item,
          description: product.description,
          unitPrice: product.unitPrice,
          total: item.quantity * product.unitPrice,
        };
        return updated;
      })
    );
    setSuggestions([]);
    setActiveItemId(null);
  }, []);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: generateId(), description: '', quantity: 1, unitPrice: 0, total: 0, vatRate: defaultVatRate },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) {
      Alert.alert('Error', 'Invoice must have at least one item');
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const grossTotal = items.reduce((sum, item) => sum + item.total, 0);
  const vatAmount = items.reduce((sum, item) => sum + calculateVAT(item.total, item.vatRate ?? 0), 0);
  const subtotal = grossTotal - vatAmount;
  const total = grossTotal;

  const handleSave = () => {
    if (!clientName.trim()) {
      Alert.alert('Error', 'Please enter client name');
      return;
    }
    if (items.some((item) => !item.description.trim())) {
      Alert.alert('Error', 'Please fill in all item descriptions');
      return;
    }
    if (total <= 0) {
      Alert.alert('Error', 'Invoice total must be greater than zero');
      return;
    }

    addInvoice({
      invoiceNumber: generateInvoiceNumber(),
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      clientAddress: clientAddress.trim(),
      items,
      subtotal,
      vatAmount,
      total,
      vatRate: getVatRateValue(items),
      status: 'draft',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate,
      notes: notes.trim() || undefined,
      isRecurring,
      recurringFrequency: isRecurring ? recurringFrequency : undefined,
      recurringEndDate: isRecurring && recurringEndDate ? recurringEndDate : undefined,
      nextRecurringDate: isRecurring ? calculateNextRecurringDate(new Date().toISOString().split('T')[0], recurringFrequency) : undefined,
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Details</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Client Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Client or company name"
              placeholderTextColor={Colors.textMuted}
              value={clientName}
              onChangeText={setClientName}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="client@email.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={clientEmail}
              onChangeText={setClientEmail}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Client address"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              value={clientAddress}
              onChangeText={setClientAddress}
            />
          </View>
        </View>

        <View style={styles.section} testID="invoice-items-section">
          <Text style={styles.sectionTitle}>Invoice Items</Text>
          {items.map((item, index) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNumber}>Item {index + 1}</Text>
                <TouchableOpacity
                  onPress={() => removeItem(item.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Trash2 size={18} color={Colors.expense} />
                </TouchableOpacity>
              </View>
              <View>
                <TextInput
                  style={styles.input}
                  placeholder="Description"
                  placeholderTextColor={Colors.textMuted}
                  value={item.description}
                  onChangeText={(text) => updateItem(item.id, 'description', text)}
                  onBlur={() => {
                    setTimeout(() => {
                      if (activeItemId === item.id) {
                        setSuggestions([]);
                        setActiveItemId(null);
                      }
                    }, 200);
                  }}
                />
                {activeItemId === item.id && suggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    {suggestions.map((suggestion) => (
                      <TouchableOpacity
                        key={suggestion.id}
                        style={styles.suggestionItem}
                        onPressIn={() => selectSuggestion(item.id, suggestion)}
                      >
                        <Text style={styles.suggestionText}>{suggestion.description}</Text>
                        <Text style={styles.suggestionPrice}>£{suggestion.unitPrice.toFixed(2)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <View style={styles.itemRow}>
                <View style={styles.itemField}>
                  <Text style={styles.itemLabel}>Qty</Text>
                  <TextInput
                    style={styles.itemInput}
                    keyboardType="number-pad"
                    value={item.quantity.toString()}
                    onChangeText={(text) =>
                      updateItem(item.id, 'quantity', parseInt(text) || 0)
                    }
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
            <Plus size={18} color={Colors.primary} />
            <Text style={styles.addItemText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <DatePickerInput
            label="Due Date"
            value={dueDate}
            onChange={setDueDate}
            testID="invoice-due-date"
          />
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Payment terms, bank details, etc."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recurring Invoice</Text>
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setIsRecurring(!isRecurring)}
          >
            <Text style={styles.toggleLabel}>Make this a recurring invoice</Text>
            <View style={[styles.toggle, isRecurring && styles.toggleActive]}>
              <View style={[styles.toggleDot, isRecurring && styles.toggleDotActive]} />
            </View>
          </TouchableOpacity>
          {isRecurring && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Frequency</Text>
                <View style={styles.frequencySelector}>
                  {RECURRING_FREQUENCIES.map((freq) => (
                    <TouchableOpacity
                      key={freq.value}
                      style={[
                        styles.frequencyButton,
                        recurringFrequency === freq.value && styles.frequencyButtonActive,
                      ]}
                      onPress={() => setRecurringFrequency(freq.value)}
                    >
                      <Text
                        style={[
                          styles.frequencyButtonText,
                          recurringFrequency === freq.value && styles.frequencyButtonTextActive,
                        ]}
                      >
                        {freq.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <DatePickerInput
                label="End Date (Optional)"
                value={recurringEndDate}
                onChange={setRecurringEndDate}
                placeholder="DD/MM/YYYY (leave empty for ongoing)"
                testID="invoice-recurring-end-date"
              />
            </>
          )}
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Net (ex. VAT)</Text>
            <Text style={styles.summaryValue}>£{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>VAT ({getVatRateLabel(items)})</Text>
            <Text style={styles.summaryValue}>£{vatAmount.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.summaryTotalLabel}>Total (inc. VAT)</Text>
            <Text style={styles.summaryTotalValue}>£{total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Create Invoice</Text>
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
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
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
    fontSize: 15,
    color: Colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    gap: 8,
  },
  addItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.backgroundCard,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  toggleDotActive: {
    alignSelf: 'flex-end',
  },
  frequencySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.backgroundCard,
  },
  frequencyButtonActive: {
    backgroundColor: Colors.primary,
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  frequencyButtonTextActive: {
    color: Colors.white,
  },
  suggestionsContainer: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    zIndex: 20,
    elevation: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  suggestionPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 12,
  },
});
