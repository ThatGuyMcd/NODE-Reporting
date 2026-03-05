import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { Calendar as CalendarIcon, ChevronDown, X } from 'lucide-react-native';
import { Calendar } from 'react-native-calendars';
import Colors from '@/constants/colors';
import { DateRangeType, DATE_RANGE_OPTIONS } from '@/types/dashboard';
import { formatDate } from '@/utils/helpers';

interface DateRangeFilterProps {
  selectedRange: DateRangeType;
  customStartDate?: string;
  customEndDate?: string;
  onRangeChange: (range: DateRangeType) => void;
  onCustomDatesChange: (start: string, end: string) => void;
}

export default React.memo(function DateRangeFilter({
  selectedRange,
  customStartDate,
  customEndDate,
  onRangeChange,
  onCustomDatesChange,
}: DateRangeFilterProps) {
  const [showPicker, setShowPicker] = React.useState<boolean>(false);
  const [showCustomModal, setShowCustomModal] = React.useState<boolean>(false);
  const [tempStart, setTempStart] = React.useState<string>(customStartDate || '');
  const [tempEnd, setTempEnd] = React.useState<string>(customEndDate || '');

  const [activeField, setActiveField] = React.useState<'start' | 'end' | null>(null);

  const selectedLabel = React.useMemo(() => {
    if (selectedRange === 'custom' && customStartDate && customEndDate) {
      return `${formatDate(customStartDate)} - ${formatDate(customEndDate)}`;
    }
    const option = DATE_RANGE_OPTIONS.find((o) => o.value === selectedRange);
    return option?.label || 'Select Range';
  }, [selectedRange, customStartDate, customEndDate]);

  const handleRangeSelect = React.useCallback(
    (range: DateRangeType) => {
      if (range === 'custom') {
        setTempStart(customStartDate || new Date().toISOString().split('T')[0]);
        setTempEnd(customEndDate || new Date().toISOString().split('T')[0]);
        setShowPicker(false);
        setShowCustomModal(true);
      } else {
        onRangeChange(range);
        setShowPicker(false);
      }
    },
    [onRangeChange, customStartDate, customEndDate]
  );

  const handleCustomApply = React.useCallback(() => {
    if (tempStart && tempEnd) {
      onCustomDatesChange(tempStart, tempEnd);
      setShowCustomModal(false);
      setActiveField(null);
    }
  }, [tempStart, tempEnd, onCustomDatesChange]);

  const handleCalendarDayPress = React.useCallback((day: { dateString: string }) => {
    if (activeField === 'start') {
      setTempStart(day.dateString);
      setActiveField('end');
    } else {
      setTempEnd(day.dateString);
      setActiveField(null);
    }
  }, [activeField]);

  const calendarMarkedDates = React.useMemo(() => {
    const marks: Record<string, { selected?: boolean; selectedColor?: string; startingDay?: boolean; endingDay?: boolean; color?: string; textColor?: string }> = {};
    if (tempStart) {
      marks[tempStart] = { selected: true, selectedColor: Colors.primary };
    }
    if (tempEnd) {
      marks[tempEnd] = { selected: true, selectedColor: Colors.primary };
    }
    return marks;
  }, [tempStart, tempEnd]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
        testID="date-range-selector"
      >
        <CalendarIcon size={14} color={Colors.primary} />
        <Text style={styles.selectorText} numberOfLines={1}>{selectedLabel}</Text>
        <ChevronDown size={14} color={Colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.dropdown}>
            <Text style={styles.dropdownTitle}>Date Range</Text>
            <ScrollView bounces={false}>
              {DATE_RANGE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownItem,
                    selectedRange === option.value && styles.dropdownItemActive,
                  ]}
                  onPress={() => handleRangeSelect(option.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedRange === option.value && styles.dropdownItemTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {selectedRange === option.value && (
                    <View style={styles.activeDot} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showCustomModal}
        transparent
        animationType={Platform.OS === 'web' ? 'none' : 'slide'}
        onRequestClose={() => { setShowCustomModal(false); setActiveField(null); }}
      >
        <View style={styles.backdrop}>
          <View style={styles.customModal}>
            <View style={styles.customHeader}>
              <Text style={styles.customTitle}>Custom Date Range</Text>
              <TouchableOpacity onPress={() => { setShowCustomModal(false); setActiveField(null); }}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.customBody}>
              <View style={styles.dateFieldRow}>
                <TouchableOpacity
                  style={[styles.dateChip, activeField === 'start' && styles.dateChipActive]}
                  onPress={() => setActiveField('start')}
                  activeOpacity={0.7}
                  testID="custom-start-date"
                >
                  <Text style={styles.dateChipLabel}>From</Text>
                  <Text style={[styles.dateChipValue, !tempStart && styles.dateChipPlaceholder]}>
                    {tempStart ? formatDate(tempStart) : 'DD/MM/YYYY'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dateChip, activeField === 'end' && styles.dateChipActive]}
                  onPress={() => setActiveField('end')}
                  activeOpacity={0.7}
                  testID="custom-end-date"
                >
                  <Text style={styles.dateChipLabel}>To</Text>
                  <Text style={[styles.dateChipValue, !tempEnd && styles.dateChipPlaceholder]}>
                    {tempEnd ? formatDate(tempEnd) : 'DD/MM/YYYY'}
                  </Text>
                </TouchableOpacity>
              </View>
              {showCustomModal && (
                <Calendar
                  current={activeField === 'end' && tempEnd ? tempEnd : tempStart || undefined}
                  markedDates={calendarMarkedDates}
                  onDayPress={handleCalendarDayPress}
                  testID="custom-range-calendar"
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
              <TouchableOpacity
                style={[styles.applyButton, (!tempStart || !tempEnd) && styles.applyButtonDisabled]}
                onPress={handleCustomApply}
                activeOpacity={0.7}
                disabled={!tempStart || !tempEnd}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  selectorText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    width: 260,
    maxHeight: 400,
    overflow: 'hidden',
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    padding: 16,
    paddingBottom: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownItemActive: {
    backgroundColor: Colors.primary + '15',
  },
  dropdownItemText: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  dropdownItemTextActive: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  customModal: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 20,
    width: 320,
    overflow: 'hidden',
  },
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  customTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  customBody: {
    padding: 16,
    gap: 16,
  },
  dateFieldRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 8,
  },
  dateChip: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  dateChipActive: {
    borderColor: Colors.primary,
  },
  dateChipLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  dateChipValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  dateChipPlaceholder: {
    color: Colors.textMuted,
  },
  applyButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center' as const,
    marginTop: 4,
  },
  applyButtonDisabled: {
    opacity: 0.5,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.white,
  },
});
