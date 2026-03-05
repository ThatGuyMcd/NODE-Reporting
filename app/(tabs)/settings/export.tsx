import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
} from 'react-native';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  CheckCircle,
} from 'lucide-react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import {
  formatCurrency,
  formatDate,
  exportToCSV,
  getTaxYearRange,
  getQuarterRange,
} from '@/utils/helpers';
import Colors from '@/constants/colors';

type ExportPeriod = 'tax_year' | 'q1' | 'q2' | 'q3' | 'q4' | 'all';

export default function ExportScreen() {
  const { transactions, receipts, invoices, vatSummary } = useBusiness();
  const [selectedPeriod, setSelectedPeriod] = useState<ExportPeriod>('tax_year');
  const [exporting, setExporting] = useState(false);

  const taxYear = getTaxYearRange();

  const periods: { label: string; value: ExportPeriod; dates?: string }[] = [
    {
      label: 'Current Tax Year',
      value: 'tax_year',
      dates: `${formatDate(taxYear.start.toISOString())} - ${formatDate(taxYear.end.toISOString())}`,
    },
    { label: 'Q1 (Apr-Jun)', value: 'q1' },
    { label: 'Q2 (Jul-Sep)', value: 'q2' },
    { label: 'Q3 (Oct-Dec)', value: 'q3' },
    { label: 'Q4 (Jan-Mar)', value: 'q4' },
    { label: 'All Time', value: 'all' },
  ];

  const filterByPeriod = <T extends { date: string }>(items: T[]): T[] => {
    if (selectedPeriod === 'all') return items;

    let start: Date;
    let end: Date;

    if (selectedPeriod === 'tax_year') {
      start = taxYear.start;
      end = taxYear.end;
    } else {
      const quarter = parseInt(selectedPeriod.replace('q', '')) as 1 | 2 | 3 | 4;
      const range = getQuarterRange(quarter);
      start = range.start;
      end = range.end;
    }

    return items.filter((item) => {
      const date = new Date(item.date);
      return date >= start && date <= end;
    });
  };

  const handleExport = async () => {
    setExporting(true);

    try {
      const filteredTransactions = filterByPeriod(transactions);
      const filteredReceipts = filterByPeriod(receipts);
      const filteredInvoices = filterByPeriod(
        invoices.map((i) => ({ ...i, date: i.issueDate }))
      );

      const csvContent = exportToCSV(
        filteredTransactions,
        filteredReceipts,
        filteredInvoices
      );

      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `business_export_${selectedPeriod}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Alert.alert('Success', 'Your data has been downloaded');
      } else {
        await Share.share({
          message: csvContent,
          title: `Business Export - ${selectedPeriod}`,
        });
      }
    } catch (error) {
      console.log('Export error:', error);
      Alert.alert('Error', 'Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const filteredTransactions = filterByPeriod(transactions);
  const filteredReceipts = filterByPeriod(receipts);

  const periodIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const periodIncomeNet = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount - t.vatAmount), 0);

  const periodExpenses =
    filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0) +
    filteredReceipts.reduce((sum, r) => sum + r.amount, 0);

  const periodExpensesNet =
    filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + (t.amount - t.vatAmount), 0) +
    filteredReceipts.reduce((sum, r) => sum + (r.amount - r.vatAmount), 0);

  const periodVATOutput = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.vatAmount, 0);

  const periodVATInput =
    filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.vatAmount, 0) +
    filteredReceipts.reduce((sum, r) => sum + r.vatAmount, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Period</Text>
        <View style={styles.periodGrid}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period.value}
              style={[
                styles.periodCard,
                selectedPeriod === period.value && styles.periodCardActive,
              ]}
              onPress={() => setSelectedPeriod(period.value)}
            >
              {selectedPeriod === period.value && (
                <CheckCircle
                  size={18}
                  color={Colors.white}
                  style={styles.periodCheck}
                />
              )}
              <Text
                style={[
                  styles.periodLabel,
                  selectedPeriod === period.value && styles.periodLabelActive,
                ]}
              >
                {period.label}
              </Text>
              {period.dates && (
                <Text
                  style={[
                    styles.periodDates,
                    selectedPeriod === period.value && styles.periodDatesActive,
                  ]}
                >
                  {period.dates}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Period Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Income (inc. VAT)</Text>
          <Text style={styles.summaryValue}>{formatCurrency(periodIncome)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Expenses (inc. VAT)</Text>
          <Text style={styles.summaryValue}>{formatCurrency(periodExpenses)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Net Profit (ex. VAT)</Text>
          <Text style={[styles.summaryValue, styles.profitValue]}>
            {formatCurrency(periodIncomeNet - periodExpensesNet)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Output VAT</Text>
          <Text style={styles.summaryValue}>{formatCurrency(periodVATOutput)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Input VAT</Text>
          <Text style={[styles.summaryValue, styles.inputVAT]}>
            -{formatCurrency(periodVATInput)}
          </Text>
        </View>
        <View style={[styles.summaryRow, styles.vatTotalRow]}>
          <Text style={styles.vatTotalLabel}>VAT Due</Text>
          <Text
            style={[
              styles.vatTotalValue,
              periodVATOutput - periodVATInput < 0 && styles.vatRefund,
            ]}
          >
            {periodVATOutput - periodVATInput < 0 ? 'Refund ' : ''}
            {formatCurrency(Math.abs(periodVATOutput - periodVATInput))}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export Options</Text>
        <View style={styles.exportCard}>
          <View style={styles.exportOption}>
            <View style={styles.exportIcon}>
              <FileSpreadsheet size={24} color={Colors.success} />
            </View>
            <View style={styles.exportInfo}>
              <Text style={styles.exportTitle}>CSV Export</Text>
              <Text style={styles.exportDescription}>
                Compatible with Excel, Google Sheets, and accounting software.
                Suitable for VAT returns and Self Assessment.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
            onPress={handleExport}
            disabled={exporting}
          >
            <Download size={20} color={Colors.white} />
            <Text style={styles.exportButtonText}>
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoCard}>
        <FileText size={18} color={Colors.textMuted} />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>For HMRC Submissions</Text>
          <Text style={styles.infoText}>
            Export includes all transactions with dates, descriptions, categories, 
            net amounts, VAT rates, and VAT amounts - everything needed for your 
            VAT return or Self Assessment tax return.
          </Text>
        </View>
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
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  periodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  periodCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    width: '48%',
    position: 'relative',
  },
  periodCardActive: {
    backgroundColor: Colors.primary,
  },
  periodCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  periodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  periodLabelActive: {
    color: Colors.white,
  },
  periodDates: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  periodDatesActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  summaryCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
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
  profitValue: {
    color: Colors.success,
  },
  inputVAT: {
    color: Colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  vatTotalRow: {
    paddingTop: 12,
  },
  vatTotalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  vatTotalValue: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.warning,
  },
  vatRefund: {
    color: Colors.success,
  },
  exportCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
  },
  exportOption: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  exportIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  exportInfo: {
    flex: 1,
  },
  exportTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  exportDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 10,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
