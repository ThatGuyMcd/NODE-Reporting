import React, { useCallback, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Calendar as CalendarIcon, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { formatDate } from '@/utils/helpers';

type DatePickerInputProps = {
  label: string;
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  testID?: string;
  minDate?: string;
  maxDate?: string;
};

const DatePickerInput = React.memo(function DatePickerInput({
  label,
  value,
  onChange,
  placeholder = 'DD/MM/YYYY',
  testID,
  minDate,
  maxDate,
}: DatePickerInputProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const displayValue = useMemo(() => {
    if (!value) return placeholder;
    const formatted = formatDate(value);
    return formatted || placeholder;
  }, [value, placeholder]);

  const open = useCallback(() => {
    console.log('DatePickerInput open', { label, value });
    setIsOpen(true);
  }, [label, value]);

  const close = useCallback(() => {
    console.log('DatePickerInput close', { label, value });
    setIsOpen(false);
  }, [label, value]);

  const handleSelect = useCallback(
    (dateString: string) => {
      console.log('DatePickerInput select', { label, dateString });
      onChange(dateString);
      setIsOpen(false);
    },
    [label, onChange]
  );

  return (
    <View style={styles.inputGroup} testID={testID}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={open}
        activeOpacity={0.8}
        testID={testID ? `${testID}-button` : undefined}
      >
        <Text style={[styles.inputText, !value && styles.placeholderText]}>{displayValue}</Text>
        <CalendarIcon size={18} color={Colors.textMuted} />
      </TouchableOpacity>

      <Modal
        animationType={Platform.OS === 'web' ? 'none' : 'slide'}
        transparent
        visible={isOpen}
        onRequestClose={close}
      >
        <View style={styles.modalBackdrop} testID={testID ? `${testID}-modal` : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity onPress={close} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            {isOpen && (
              <Calendar
                current={value || undefined}
                markedDates={value ? { [value]: { selected: true, selectedColor: Colors.primary } } : undefined}
                onDayPress={(day) => handleSelect(day.dateString)}
                minDate={minDate}
                maxDate={maxDate}
                testID={testID ? `${testID}-calendar` : undefined}
                theme={{
                  backgroundColor: Colors.backgroundCard,
                  calendarBackground: Colors.backgroundCard,
                  textSectionTitleColor: Colors.textMuted,
                  selectedDayBackgroundColor: Colors.primary,
                  selectedDayTextColor: Colors.white,
                  todayTextColor: Colors.primary,
                  dayTextColor: Colors.text,
                  monthTextColor: Colors.text,
                  textDisabledColor: Colors.textMuted,
                  arrowColor: Colors.primary,
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  inputText: {
    fontSize: 15,
    color: Colors.text,
  },
  placeholderText: {
    color: Colors.textMuted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
});

export default DatePickerInput;
