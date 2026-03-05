import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
  TouchableOpacity,
  useWindowDimensions,
  ImageSourcePropType,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TrendingUp,
  TrendingDown,
  PoundSterling,
  Percent,
  FileText,
  Receipt,
  Users,
  CreditCard,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  LayoutGrid,
  Package,
  Layers,
} from 'lucide-react-native';
import { useBusiness } from '@/contexts/BusinessContext';
import { usePositronAuth } from '@/contexts/PositronAuthContext';
import { formatCurrency } from '@/utils/helpers';
import StatCard from '@/components/StatCard';
import AnimatedValue from '@/components/AnimatedValue';
import PieChart from '@/components/dashboard/PieChart';
import TransactionItem from '@/components/TransactionItem';
import DateRangeFilter from '@/components/dashboard/DateRangeFilter';
import WidgetCustomizer from '@/components/dashboard/WidgetCustomizer';
import Colors from '@/constants/colors';
import {
  DashboardConfig,
  DEFAULT_DASHBOARD_CONFIG,
  WidgetConfig,
  DateRangeType,
  getDateRangeFromType,
  WIDGET_DEFINITIONS,
} from '@/types/dashboard';
import { Transaction } from '@/types';

const LOGO_SOURCE: ImageSourcePropType = { uri: 'https://r2-pub.rork.com/attachments/om86sit3789f114ve4wcn' };

const MemoizedLogo = React.memo(function MemoizedLogo() {
  return (
    <Image
      source={LOGO_SOURCE}
      style={styles.logoImage}
      resizeMode="contain"
      fadeDuration={0}
    />
  );
});

const SyncBadge = React.memo(function SyncBadge({ syncProgressRef, isSyncing }: { syncProgressRef: React.MutableRefObject<import('@/services/dataSync').SyncProgress | null>; isSyncing: boolean }) {
  const [displayText, setDisplayText] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isSyncing) {
      setDisplayText(null);
      return;
    }
    const interval = setInterval(() => {
      const progress = syncProgressRef.current;
      if (!progress || progress.phase === 'complete' || progress.phase === 'error') {
        setDisplayText(null);
        return;
      }
      if (progress.total > 0) {
        const pct = Math.min(100, Math.max(0, Math.round((progress.current / progress.total) * 100)));
        setDisplayText(`${pct}%`);
      } else {
        setDisplayText('Syncing...');
      }
    }, 250);
    return () => clearInterval(interval);
  }, [isSyncing, syncProgressRef]);

  if (!displayText) return null;

  return (
    <View style={styles.syncBadge} testID="dashboard-sync-progress">
      <Text style={styles.syncBadgeText}>{displayText}</Text>
    </View>
  );
});

const DASHBOARD_CONFIG_KEY = 'dashboard_config_v1';

const BREAKPOINT_MEDIUM = 600;
const BREAKPOINT_LARGE = 960;

const FULL_WIDTH_WIDGETS = new Set([
  'financial_overview',
  'daily_sales',
  'recent_activity',
  'monthly_comparison',
]);

type LayoutMode = 'compact' | 'medium' | 'large';

function useLayoutMode(): { mode: LayoutMode; columns: number; width: number } {
  const { width } = useWindowDimensions();
  return React.useMemo(() => {
    if (width >= BREAKPOINT_LARGE) return { mode: 'large' as const, columns: 3, width };
    if (width >= BREAKPOINT_MEDIUM) return { mode: 'medium' as const, columns: 2, width };
    return { mode: 'compact' as const, columns: 1, width };
  }, [width]);
}

interface BarDataPoint {
  label: string;
  value: number;
}

function useFilteredTransactions(
  transactions: Transaction[],
  dateRangeType: DateRangeType,
  customStart?: string,
  customEnd?: string
) {
  return React.useMemo(() => {
    const { start, end } = getDateRangeFromType(dateRangeType, customStart, customEnd);
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });
  }, [transactions, dateRangeType, customStart, customEnd]);
}

export default function DashboardScreen() {
  const {
    transactions,
    invoices,
    receipts,
    quotes,
    isLoading,
    addOrUpdateProducts,
  } = useBusiness();
  const positronAuth = usePositronAuth();
  const isAuthenticated = positronAuth.isAuthenticated;
  const user = positronAuth.user;
  const syncTransactions = positronAuth.syncTransactions;
  const isSyncing = positronAuth.isSyncing;

  const [refreshing, setRefreshing] = React.useState<boolean>(false);
  const [showCustomizer, setShowCustomizer] = React.useState<boolean>(false);
  const showCustomizerRef = React.useRef<boolean>(false);
  const [config, setConfig] = React.useState<DashboardConfig>(DEFAULT_DASHBOARD_CONFIG);
  const [configLoaded, setConfigLoaded] = React.useState<boolean>(false);

  React.useEffect(() => {
    AsyncStorage.getItem(DASHBOARD_CONFIG_KEY).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as DashboardConfig;
          const existingIds = new Set(parsed.widgets.map((w) => w.id));
          const missingWidgets = WIDGET_DEFINITIONS
            .filter((d) => !existingIds.has(d.id))
            .map((d) => ({ id: d.id, visible: true }));
          if (missingWidgets.length > 0) {
            parsed.widgets = [...parsed.widgets, ...missingWidgets];
          }
          setConfig(parsed);
        } catch (e) {
          console.log('[Dashboard] Failed to parse config:', e);
        }
      }
      setConfigLoaded(true);
    });
  }, []);

  const saveConfig = React.useCallback((newConfig: DashboardConfig) => {
    setConfig(newConfig);
    AsyncStorage.setItem(DASHBOARD_CONFIG_KEY, JSON.stringify(newConfig));
  }, []);

  const handleDateRangeChange = React.useCallback(
    (range: DateRangeType) => {
      saveConfig({ ...config, dateRange: range });
    },
    [config, saveConfig]
  );

  const handleCustomDatesChange = React.useCallback(
    (start: string, end: string) => {
      saveConfig({ ...config, dateRange: 'custom' as DateRangeType, customStartDate: start, customEndDate: end });
    },
    [config, saveConfig]
  );

  const handleWidgetsSave = React.useCallback(
    (widgets: WidgetConfig[]) => {
      saveConfig({ ...config, widgets });
    },
    [config, saveConfig]
  );

  const filtered = useFilteredTransactions(
    transactions,
    config.dateRange,
    config.customStartDate,
    config.customEndDate
  );


  const onRefresh = React.useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    setTimeout(() => {
      (async () => {
        try {
          if (isAuthenticated && user) {
            console.log('[Dashboard] Pull-to-refresh: syncing transactions and products');
            const synced = await syncTransactions();
            const productMap = new Map<string, number>();
            (synced || []).forEach((transaction) => {
              transaction.lineItems.forEach((item) => {
                const name = item.product?.trim();
                if (!name) return;
                if (name.startsWith('MSG -')) return;
                const price = Number.isFinite(item.price) ? item.price : 0;
                if (price <= 0) return;
                const key = name.toLowerCase();
                if (!productMap.has(key)) {
                  productMap.set(key, price);
                }
              });
            });
            const productItems = Array.from(productMap.entries()).map(([description, unitPrice]) => ({
              description,
              unitPrice,
            }));
            if (productItems.length > 0) {
              console.log('[Dashboard] Product sync: adding/updating', productItems.length, 'products');
              addOrUpdateProducts(productItems);
            }
          }
        } catch (error) {
          console.error('[Dashboard] Refresh sync failed:', error);
          Alert.alert('Sync Failed', 'Unable to refresh from NODEView. Please try again.');
        } finally {
          setRefreshing(false);
        }
      })();
    }, 0);
  }, [refreshing, isAuthenticated, user, syncTransactions, addOrUpdateProducts]);

  const incomeTransactions = React.useMemo(() => filtered.filter((t) => t.type === 'income'), [filtered]);
  const expenseTransactions = React.useMemo(() => filtered.filter((t) => t.type === 'expense'), [filtered]);

  const totalIncome = React.useMemo(
    () => incomeTransactions.reduce((s, t) => s + t.amount, 0),
    [incomeTransactions]
  );
  const totalExpenses = React.useMemo(
    () => expenseTransactions.reduce((s, t) => s + t.amount, 0),
    [expenseTransactions]
  );
  const netIncomeExVat = React.useMemo(
    () => incomeTransactions.reduce((s, t) => s + (t.amount - t.vatAmount), 0),
    [incomeTransactions]
  );
  const totalExpensesNet = React.useMemo(
    () => expenseTransactions.reduce((s, t) => s + (t.amount - t.vatAmount), 0),
    [expenseTransactions]
  );
  const outputVAT = React.useMemo(
    () => incomeTransactions.reduce((s, t) => s + t.vatAmount, 0),
    [incomeTransactions]
  );
  const inputVAT = React.useMemo(
    () => expenseTransactions.reduce((s, t) => s + t.vatAmount, 0),
    [expenseTransactions]
  );
  const profit = React.useMemo(() => netIncomeExVat - totalExpensesNet, [netIncomeExVat, totalExpensesNet]);
  const netVAT = React.useMemo(() => outputVAT - inputVAT, [outputVAT, inputVAT]);

  const avgTransactionValue = React.useMemo(() => {
    if (incomeTransactions.length === 0) return 0;
    return totalIncome / incomeTransactions.length;
  }, [incomeTransactions, totalIncome]);

  const totalItemsSold = React.useMemo(() => {
    return incomeTransactions.reduce((s, t) => {
      if (t.lineItems && t.lineItems.length > 0) {
        return s + t.lineItems.reduce((ls, li) => ls + (li.quantity || 1), 0);
      }
      return s + (t.itemCount || 1);
    }, 0);
  }, [incomeTransactions]);

  const paymentMethods = React.useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    const displayNames = new Map<string, string>();
    const normalizeMethodName = (name: string): string => {
      const lower = name.toLowerCase().trim();
      if (lower === 'customer acc' || lower === 'customer account') {
        return 'customer account';
      }
      return lower;
    };
    const addToMap = (rawName: string, amount: number) => {
      const key = normalizeMethodName(rawName);
      const existing = map.get(key) || { total: 0, count: 0 };
      existing.total += amount;
      existing.count += 1;
      map.set(key, existing);
      if (!displayNames.has(key)) {
        displayNames.set(key, key === 'customer account' ? 'Customer Account' : rawName.trim());
      }
    };
    incomeTransactions.forEach((t) => {
      const method = (t.tenderUsed || t.paidBy || 'Other').trim();
      if (!method) return;
      if (method.startsWith('MULTI:') || method.startsWith('MULTI :')) {
        const afterMulti = method.replace(/^MULTI\s*:\s*/, '');
        const parts = afterMulti.split('|').map((p) => p.trim()).filter(Boolean);
        parts.forEach((part) => {
          const match = part.match(/^(.+?)\s+([\d.]+)$/);
          if (match) {
            const tenderName = match[1].trim();
            const tenderAmount = parseFloat(match[2]);
            if (tenderName && !isNaN(tenderAmount)) {
              addToMap(tenderName, tenderAmount);
            }
          } else {
            addToMap(part, t.amount);
          }
        });
      } else {
        addToMap(method, t.amount);
      }
    });
    return Array.from(map.entries())
      .map(([key, data]) => ({ name: displayNames.get(key) || key, value: data.total, count: data.count }))
      .sort((a, b) => b.value - a.value);
  }, [incomeTransactions]);

  const topProducts = React.useMemo(() => {
    const map = new Map<string, { revenue: number; qty: number }>();
    incomeTransactions.forEach((t) => {
      if (!t.lineItems) return;
      t.lineItems.forEach((li) => {
        const name = li.product?.trim();
        if (!name || name.startsWith('MSG -')) return;
        const existing = map.get(name) || { revenue: 0, qty: 0 };
        existing.revenue += li.subtotal || li.price * li.quantity;
        existing.qty += li.quantity || 1;
        map.set(name, existing);
      });
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, value: data.revenue, count: data.qty }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [incomeTransactions]);

  const salesByCategory = React.useMemo(() => {
    const map = new Map<string, number>();
    const displayNames = new Map<string, string>();
    const addToMap = (cat: string, amount: number) => {
      const key = cat.toLowerCase();
      map.set(key, (map.get(key) || 0) + amount);
      if (!displayNames.has(key)) {
        displayNames.set(key, cat);
      }
    };
    incomeTransactions.forEach((t) => {
      const rawCat = t.category || 'Uncategorised';
      const categories = rawCat.split(',').map((c) => c.trim()).filter(Boolean);
      if (categories.length === 0) {
        categories.push('Uncategorised');
      }
      if (t.lineItems && t.lineItems.length > 0 && categories.length > 1) {
        const catTotals = new Map<string, number>();
        t.lineItems.forEach((li) => {
          const group = (li.group || li.department || '').trim();
          const matchedCat = categories.find((c) => c.toLowerCase() === group.toLowerCase()) || group || categories[0];
          catTotals.set(matchedCat, (catTotals.get(matchedCat) || 0) + (li.subtotal || li.price * li.quantity) + (li.vat || 0));
        });
        catTotals.forEach((total, cat) => {
          addToMap(cat, total);
        });
      } else {
        const perCatAmount = t.amount / categories.length;
        categories.forEach((cat) => {
          addToMap(cat, perCatAmount);
        });
      }
    });
    return Array.from(map.entries())
      .map(([key, value]) => ({ name: displayNames.get(key) || key, value, count: 0 }))
      .sort((a, b) => b.value - a.value);
  }, [incomeTransactions]);

  const staffPerformance = React.useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    incomeTransactions.forEach((t) => {
      const staff = (t.addedBy || '').trim();
      if (!staff) return;
      const existing = map.get(staff) || { total: 0, count: 0 };
      existing.total += t.amount;
      existing.count += 1;
      map.set(staff, existing);
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, value: data.total, count: data.count }))
      .sort((a, b) => b.value - a.value);
  }, [incomeTransactions]);

  const dailySales = React.useMemo(() => {
    const map = new Map<string, number>();
    incomeTransactions.forEach((t) => {
      const day = t.date;
      map.set(day, (map.get(day) || 0) + t.amount);
    });
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(-14);
  }, [incomeTransactions]);

  const profitMargin = React.useMemo(() => {
    if (totalIncome <= 0) return 0;
    return (profit / totalIncome) * 100;
  }, [profit, totalIncome]);

  const monthlyComparison = React.useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(thisMonthStart.getTime() - 1);

    let thisMonthIncome = 0;
    let lastMonthIncome = 0;
    let thisMonthTxCount = 0;
    let lastMonthTxCount = 0;

    transactions.forEach((t) => {
      if (t.type !== 'income') return;
      const d = new Date(t.date);
      if (d >= thisMonthStart) {
        thisMonthIncome += t.amount;
        thisMonthTxCount++;
      } else if (d >= lastMonthStart && d <= lastMonthEnd) {
        lastMonthIncome += t.amount;
        lastMonthTxCount++;
      }
    });

    const change = lastMonthIncome > 0 ? ((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100 : 0;

    return {
      thisMonth: thisMonthIncome,
      lastMonth: lastMonthIncome,
      change,
      thisMonthTxCount,
      lastMonthTxCount,
    };
  }, [transactions]);

  const unpaidInvoices = React.useMemo(
    () => invoices.filter((i) => i.status === 'sent' || i.status === 'overdue'),
    [invoices]
  );
  const unpaidTotal = React.useMemo(
    () => unpaidInvoices.reduce((sum, i) => sum + i.total, 0),
    [unpaidInvoices]
  );
  const activeQuotes = React.useMemo(
    () => quotes.filter((q) => q.status === 'sent' || q.status === 'draft'),
    [quotes]
  );
  const activeQuotesTotal = React.useMemo(
    () => activeQuotes.reduce((sum, q) => sum + q.total, 0),
    [activeQuotes]
  );

  const recentTransactions = React.useMemo(
    () =>
      [...filtered]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [filtered]
  );

  const layout = useLayoutMode();

  const isWidgetVisible = React.useCallback(
    (id: string) => {
      const w = config.widgets.find((widget) => widget.id === id);
      if (!w) return true;
      const def = WIDGET_DEFINITIONS.find((d) => d.id === id);
      if (def?.nodeViewOnly && !isAuthenticated) return false;
      return w.visible;
    },
    [config.widgets, isAuthenticated]
  );

  const hasWidgetData = React.useCallback(
    (id: string): boolean => {
      switch (id) {
        case 'payment_methods':
          return paymentMethods.length > 0;
        case 'top_products':
          return topProducts.length > 0;
        case 'sales_by_category':
          return salesByCategory.length > 0;
        case 'staff_performance':
          return staffPerformance.length > 0;
        case 'daily_sales':
          return dailySales.length > 0;
        default:
          return true;
      }
    },
    [paymentMethods.length, topProducts.length, salesByCategory.length, staffPerformance.length, dailySales.length]
  );

  const shouldShowWidget = React.useCallback(
    (id: string): boolean => isWidgetVisible(id) && hasWidgetData(id),
    [isWidgetVisible, hasWidgetData]
  );

  const orderedWidgetIds = React.useMemo(
    () => config.widgets.map((w) => w.id),
    [config.widgets]
  );

  const gridRows = React.useMemo(() => {
    if (layout.mode === 'compact') return null;
    const visibleIds = orderedWidgetIds.filter((id) => shouldShowWidget(id));
    const rows: { widgets: string[]; fullWidth: boolean }[] = [];
    let currentRow: string[] = [];
    const cols = layout.columns;

    visibleIds.forEach((id) => {
      const isFullWidth = FULL_WIDTH_WIDGETS.has(id);
      if (isFullWidth) {
        if (currentRow.length > 0) {
          rows.push({ widgets: currentRow, fullWidth: false });
          currentRow = [];
        }
        rows.push({ widgets: [id], fullWidth: true });
      } else {
        currentRow.push(id);
        if (currentRow.length >= cols) {
          rows.push({ widgets: currentRow, fullWidth: false });
          currentRow = [];
        }
      }
    });
    if (currentRow.length > 0) {
      rows.push({ widgets: currentRow, fullWidth: false });
    }
    return rows;
  }, [layout.mode, layout.columns, orderedWidgetIds, shouldShowWidget]);

  if (isLoading || !configLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const renderWidget = (widgetId: string) => {
    if (!isWidgetVisible(widgetId)) return null;

    switch (widgetId) {
      case 'financial_overview':
        return (
          <View key={widgetId} style={styles.section}>
            <Text style={styles.sectionTitle}>Financial Overview</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="Income"
                valueNumber={totalIncome}
                valueFormatter={formatCurrency}
                icon={TrendingUp}
                iconColor={Colors.income}
                trend="up"
                testID="dashboard-income"
              />
              <StatCard
                title="Expenses"
                valueNumber={totalExpenses}
                valueFormatter={formatCurrency}
                icon={TrendingDown}
                iconColor={Colors.expense}
                trend="down"
                testID="dashboard-expenses"
              />
            </View>
            <View style={styles.statsGrid}>
              <StatCard
                title="Net Profit"
                valueNumber={profit}
                valueFormatter={formatCurrency}
                icon={PoundSterling}
                iconColor={profit >= 0 ? Colors.income : Colors.expense}
                trend={profit >= 0 ? 'up' : 'down'}
                testID="dashboard-net-profit"
              />
              <StatCard
                title="VAT Due"
                valueNumber={netVAT}
                valueFormatter={formatCurrency}
                subtitle={`Output: ${formatCurrency(outputVAT)}`}
                icon={Percent}
                iconColor={Colors.warning}
                testID="dashboard-vat-due"
              />
            </View>
          </View>
        );

      case 'transaction_stats':
        return (
          <View key={widgetId} style={styles.section}>
            <Text style={styles.sectionTitle}>Transaction Stats</Text>
            <View style={styles.statsRow}>
              <View style={styles.miniStat}>
                <View style={[styles.miniStatIcon, { backgroundColor: Colors.info + '20' }]}>
                  <BarChart3 size={16} color={Colors.info} />
                </View>
                <AnimatedValue value={incomeTransactions.length} formatter={(v) => Math.round(v).toString()} style={styles.miniStatValue} />
                <Text style={styles.miniStatLabel}>Sales</Text>
              </View>
              <View style={styles.miniStatDivider} />
              <View style={styles.miniStat}>
                <View style={[styles.miniStatIcon, { backgroundColor: Colors.primary + '20' }]}>
                  <PoundSterling size={16} color={Colors.primary} />
                </View>
                <AnimatedValue value={avgTransactionValue} formatter={formatCurrency} style={styles.miniStatValue} />
                <Text style={styles.miniStatLabel}>Avg Value</Text>
              </View>
              <View style={styles.miniStatDivider} />
              <View style={styles.miniStat}>
                <View style={[styles.miniStatIcon, { backgroundColor: Colors.success + '20' }]}>
                  <Package size={16} color={Colors.success} />
                </View>
                <AnimatedValue value={totalItemsSold} formatter={(v) => v % 1 === 0 ? Math.round(v).toString() : v.toFixed(3)} style={styles.miniStatValue} />
                <Text style={styles.miniStatLabel}>Items Sold</Text>
              </View>
            </View>
          </View>
        );

      case 'payment_methods':
        if (paymentMethods.length === 0) return null;
        return (
          <View key={widgetId} style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            <View style={styles.card}>
              <PieChart
                data={paymentMethods.map((m, i) => ({ label: m.name, value: m.value, color: getMethodColor(i) }))}
                formatValue={formatCurrency}
              />
              <View style={styles.pieListDivider} />
              {paymentMethods.map((method, index) => (
                <View key={method.name} style={[styles.rankRow, index < paymentMethods.length - 1 && styles.rankRowBorder]}>
                  <View style={[styles.rankBadge, { backgroundColor: getMethodColor(index) + '20' }]}>
                    <CreditCard size={14} color={getMethodColor(index)} />
                  </View>
                  <View style={styles.rankInfo}>
                    <Text style={styles.rankName}>{method.name}</Text>
                    <Text style={styles.rankMeta}>{method.count} transactions</Text>
                  </View>
                  <AnimatedValue value={method.value} formatter={formatCurrency} style={styles.rankValue} />
                </View>
              ))}
            </View>
          </View>
        );

      case 'top_products':
        if (topProducts.length === 0) return null;
        return (
          <View key={widgetId} style={styles.section}>
            <Text style={styles.sectionTitle}>Top Products</Text>
            <View style={styles.card}>
              {topProducts.slice(0, 8).map((product, index) => {
                const maxVal = topProducts[0]?.value || 1;
                const barWidth = Math.max(8, (product.value / maxVal) * 100);
                return (
                  <View key={product.name} style={[styles.productRow, index < Math.min(topProducts.length, 8) - 1 && styles.rankRowBorder]}>
                    <View style={styles.productLeft}>
                      <Text style={styles.productRank}>#{index + 1}</Text>
                      <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                        <View style={styles.productBarBg}>
                          <View style={[styles.productBar, { width: `${barWidth}%` }]} />
                        </View>
                      </View>
                    </View>
                    <View style={styles.productRight}>
                      <AnimatedValue value={product.value} formatter={formatCurrency} style={styles.productValue} />
                      <AnimatedValue value={product.count} formatter={(v) => `${Math.round(v)} sold`} style={styles.productQty} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        );

      case 'sales_by_category':
        if (salesByCategory.length === 0) return null;
        return (
          <View key={widgetId} style={styles.section}>
            <Text style={styles.sectionTitle}>Sales by Category</Text>
            <View style={styles.card}>
              <PieChart
                data={salesByCategory.slice(0, 6).map((c, i) => ({ label: c.name, value: c.value, color: getCategoryColor(i) }))}
                formatValue={formatCurrency}
              />
              <View style={styles.pieListDivider} />
              {salesByCategory.slice(0, 6).map((cat, index) => {
                const catTotal = salesByCategory.reduce((s, c) => s + c.value, 0);
                const pct = catTotal > 0 ? ((cat.value / catTotal) * 100).toFixed(1) : '0';
                return (
                  <View key={cat.name} style={[styles.rankRow, index < Math.min(salesByCategory.length, 6) - 1 && styles.rankRowBorder]}>
                    <View style={[styles.rankBadge, { backgroundColor: getCategoryColor(index) + '20' }]}>
                      <Layers size={14} color={getCategoryColor(index)} />
                    </View>
                    <View style={styles.rankInfo}>
                      <Text style={styles.rankName}>{cat.name}</Text>
                      <Text style={styles.rankMeta}>{pct}% of sales</Text>
                    </View>
                    <AnimatedValue value={cat.value} formatter={formatCurrency} style={styles.rankValue} />
                  </View>
                );
              })}
            </View>
          </View>
        );

      case 'staff_performance':
        if (staffPerformance.length === 0) return null;
        return (
          <View key={widgetId} style={styles.section}>
            <Text style={styles.sectionTitle}>Staff Performance</Text>
            <View style={styles.card}>
              {staffPerformance.slice(0, 6).map((staff, index) => (
                <View key={staff.name} style={[styles.rankRow, index < Math.min(staffPerformance.length, 6) - 1 && styles.rankRowBorder]}>
                  <View style={[styles.rankBadge, { backgroundColor: Colors.info + '20' }]}>
                    <Users size={14} color={Colors.info} />
                  </View>
                  <View style={styles.rankInfo}>
                    <Text style={styles.rankName}>{staff.name}</Text>
                    <Text style={styles.rankMeta}>{staff.count} sales</Text>
                  </View>
                  <AnimatedValue value={staff.value} formatter={formatCurrency} style={styles.rankValue} />
                </View>
              ))}
            </View>
          </View>
        );

      case 'daily_sales':
        if (dailySales.length === 0) return null;
        return (
          <View key={widgetId} style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Sales</Text>
            <View style={styles.card}>
              <View style={styles.chartContainer}>
                {renderBarChart(dailySales)}
              </View>
            </View>
          </View>
        );

      case 'vat_breakdown':
        return (
          <View key={widgetId} style={styles.section}>
            <Text style={styles.sectionTitle}>VAT Breakdown</Text>
            <View style={styles.card}>
              <View style={styles.vatRow}>
                <View style={styles.vatLabel}>
                  <View style={[styles.vatDot, { backgroundColor: Colors.income }]} />
                  <Text style={styles.vatText}>Output VAT (Sales)</Text>
                </View>
                <AnimatedValue value={outputVAT} formatter={formatCurrency} style={[styles.vatValue, { color: Colors.income }]} />
              </View>
              <View style={[styles.vatRow, styles.vatRowBorder]}>
                <View style={styles.vatLabel}>
                  <View style={[styles.vatDot, { backgroundColor: Colors.expense }]} />
                  <Text style={styles.vatText}>Input VAT (Purchases)</Text>
                </View>
                <AnimatedValue value={inputVAT} formatter={formatCurrency} style={[styles.vatValue, { color: Colors.expense }]} />
              </View>
              <View style={styles.vatTotal}>
                <Text style={styles.vatTotalLabel}>Net VAT Payable</Text>
                <AnimatedValue value={Math.abs(netVAT)} formatter={(v) => `${formatCurrency(v)}${netVAT < 0 ? ' (refund)' : ''}`} style={[styles.vatTotalValue, { color: netVAT >= 0 ? Colors.warning : Colors.income }]} />
              </View>
            </View>
          </View>
        );

      case 'profit_margin':
        return (
          <View key={widgetId} style={styles.section}>
            <Text style={styles.sectionTitle}>Profit & Margin</Text>
            <View style={styles.card}>
              <View style={styles.marginHeader}>
                <View>
                  <Text style={styles.marginLabel}>Profit Margin</Text>
                  <AnimatedValue value={profitMargin} formatter={(v) => `${v.toFixed(1)}%`} style={[styles.marginValue, { color: profitMargin >= 0 ? Colors.income : Colors.expense }]} />
                </View>
                <View style={[styles.marginIndicator, { backgroundColor: profit >= 0 ? Colors.income + '20' : Colors.expense + '20' }]}>
                  {profit >= 0 ? (
                    <ArrowUpRight size={20} color={Colors.income} />
                  ) : (
                    <ArrowDownRight size={20} color={Colors.expense} />
                  )}
                </View>
              </View>
              {totalIncome > 0 && (
                <>
                  <PieChart
                    data={[
                      { label: 'Net Profit', value: Math.max(0, profit), color: Colors.income },
                      { label: 'VAT', value: Math.max(0, outputVAT), color: Colors.primary },
                      { label: 'Expenses', value: Math.max(0, totalExpensesNet), color: Colors.expense },
                    ].filter((d) => d.value > 0)}
                    showLegend={true}
                    size={120}
                    innerRadius={0.6}
                    formatValue={(v) => formatCurrency(v)}
                  />
                  <View style={styles.pieListDivider} />
                </>
              )}
              <View style={styles.marginDetails}>
                <View style={styles.marginDetail}>
                  <Text style={styles.marginDetailLabel}>Revenue (inc. VAT)</Text>
                  <AnimatedValue value={totalIncome} formatter={formatCurrency} style={styles.marginDetailValue} />
                </View>
                <View style={styles.marginDetail}>
                  <Text style={styles.marginDetailLabel}>VAT</Text>
                  <AnimatedValue value={outputVAT} formatter={formatCurrency} style={[styles.marginDetailValue, { color: Colors.primary }]} />
                </View>
                <View style={styles.marginDetail}>
                  <Text style={styles.marginDetailLabel}>Expenses</Text>
                  <AnimatedValue value={totalExpensesNet} formatter={formatCurrency} style={[styles.marginDetailValue, { color: Colors.expense }]} />
                </View>
                <View style={styles.marginDetail}>
                  <Text style={styles.marginDetailLabel}>Net Profit</Text>
                  <AnimatedValue value={profit} formatter={formatCurrency} style={[styles.marginDetailValue, { color: profit >= 0 ? Colors.income : Colors.expense }]} />
                </View>
              </View>
            </View>
          </View>
        );

      case 'invoices_quotes':
        return (
          <View key={widgetId} style={styles.section}>
            <Text style={styles.sectionTitle}>Invoices & Quotes</Text>
            <View style={styles.card}>
              <View style={styles.iqRow}>
                <View style={[styles.iqIcon, { backgroundColor: Colors.primary + '15' }]}>
                  <FileText size={18} color={Colors.primary} />
                </View>
                <View style={styles.iqInfo}>
                  <AnimatedValue value={unpaidInvoices.length} formatter={(v) => Math.round(v).toString()} style={styles.iqValue} />
                  <Text style={styles.iqLabel}>Unpaid Invoices</Text>
                </View>
                <AnimatedValue value={unpaidTotal} formatter={formatCurrency} style={styles.iqAmount} />
              </View>
              <View style={styles.iqDivider} />
              <View style={styles.iqRow}>
                <View style={[styles.iqIcon, { backgroundColor: Colors.info + '15' }]}>
                  <FileText size={18} color={Colors.info} />
                </View>
                <View style={styles.iqInfo}>
                  <AnimatedValue value={activeQuotes.length} formatter={(v) => Math.round(v).toString()} style={styles.iqValue} />
                  <Text style={styles.iqLabel}>Active Quotes</Text>
                </View>
                <AnimatedValue value={activeQuotesTotal} formatter={formatCurrency} style={[styles.iqAmount, { color: Colors.info }]} />
              </View>
              <View style={styles.iqDivider} />
              <View style={styles.iqRow}>
                <View style={[styles.iqIcon, { backgroundColor: Colors.primaryLight + '15' }]}>
                  <Receipt size={18} color={Colors.primaryLight} />
                </View>
                <View style={styles.iqInfo}>
                  <AnimatedValue value={receipts.length} formatter={(v) => Math.round(v).toString()} style={styles.iqValue} />
                  <Text style={styles.iqLabel}>Receipts Stored</Text>
                </View>
              </View>
            </View>
          </View>
        );

      case 'monthly_comparison':
        return (
          <View key={widgetId} style={styles.section}>
            <Text style={styles.sectionTitle}>Monthly Comparison</Text>
            <View style={styles.card}>
              <View style={styles.compRow}>
                <View style={styles.compPeriod}>
                  <Text style={styles.compPeriodLabel}>This Month</Text>
                  <AnimatedValue value={monthlyComparison.thisMonth} formatter={formatCurrency} style={styles.compPeriodValue} />
                  <AnimatedValue value={monthlyComparison.thisMonthTxCount} formatter={(v) => `${Math.round(v)} transactions`} style={styles.compPeriodMeta} />
                </View>
                <View style={styles.compVs}>
                  <Text style={styles.compVsText}>vs</Text>
                </View>
                <View style={styles.compPeriod}>
                  <Text style={styles.compPeriodLabel}>Last Month</Text>
                  <AnimatedValue value={monthlyComparison.lastMonth} formatter={formatCurrency} style={styles.compPeriodValue} />
                  <AnimatedValue value={monthlyComparison.lastMonthTxCount} formatter={(v) => `${Math.round(v)} transactions`} style={styles.compPeriodMeta} />
                </View>
              </View>
              {monthlyComparison.lastMonth > 0 && (
                <View
                  style={[
                    styles.compChange,
                    {
                      backgroundColor: monthlyComparison.change >= 0 ? Colors.income + '15' : Colors.expense + '15',
                    },
                  ]}
                >
                  {monthlyComparison.change >= 0 ? (
                    <ArrowUpRight size={16} color={Colors.income} />
                  ) : (
                    <ArrowDownRight size={16} color={Colors.expense} />
                  )}
                  <Text
                    style={[
                      styles.compChangeText,
                      { color: monthlyComparison.change >= 0 ? Colors.income : Colors.expense },
                    ]}
                  >
                    {Math.abs(monthlyComparison.change).toFixed(1)}% {monthlyComparison.change >= 0 ? 'increase' : 'decrease'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );

      case 'recent_activity':
        return (
          <View key={widgetId} style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {recentTransactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No transactions in this period</Text>
                <Text style={styles.emptySubtext}>
                  Adjust the date range or add transactions
                </Text>
              </View>
            ) : (
              recentTransactions.map((transaction) => (
                <TransactionItem key={transaction.id} transaction={transaction} />
              ))
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
          testID="dashboard-refresh"
        />
      }
      showsVerticalScrollIndicator={false}
      testID="dashboard-scroll"
    >
      <View style={styles.logoRow}>
        <MemoizedLogo />
        {refreshing && <SyncBadge syncProgressRef={positronAuth.syncProgressRef} isSyncing={isSyncing} />}
      </View>

      <View style={styles.toolbar}>
        <DateRangeFilter
          selectedRange={config.dateRange}
          customStartDate={config.customStartDate}
          customEndDate={config.customEndDate}
          onRangeChange={handleDateRangeChange}
          onCustomDatesChange={handleCustomDatesChange}
        />
        <TouchableOpacity
          style={styles.customizeBtn}
          onPress={() => {
            showCustomizerRef.current = true;
            setShowCustomizer(true);
          }}
          activeOpacity={0.7}
          testID="dashboard-customize-btn"
        >
          <LayoutGrid size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.periodInfo}>
        <Text style={styles.periodText}>
          {filtered.length} transaction{filtered.length !== 1 ? 's' : ''} in period
        </Text>
      </View>

      {layout.mode === 'compact' ? (
        orderedWidgetIds.filter((id) => shouldShowWidget(id)).map((id) => renderWidget(id))
      ) : (
        <View style={styles.responsiveGrid}>
          {(gridRows || []).map((row, rowIndex) => (
            <View
              key={`row-${rowIndex}`}
              style={[
                styles.gridRow,
                row.fullWidth && styles.gridRowFull,
              ]}
            >
              {row.widgets.map((id) => (
                <View
                  key={id}
                  style={[
                    row.fullWidth
                      ? styles.gridItemFull
                      : { flex: 1, minWidth: 0 },
                  ]}
                >
                  {renderWidget(id)}
                </View>
              ))}
              {!row.fullWidth && row.widgets.length < layout.columns &&
                Array.from({ length: layout.columns - row.widgets.length }).map((_, i) => (
                  <View key={`spacer-${i}`} style={{ flex: 1, minWidth: 0 }} />
                ))
              }
            </View>
          ))}
        </View>
      )}

      <WidgetCustomizer
        visible={showCustomizer}
        widgets={config.widgets}
        isNodeViewConnected={isAuthenticated}
        onClose={() => {
          showCustomizerRef.current = false;
          setShowCustomizer(false);
        }}
        onSave={handleWidgetsSave}
      />
    </ScrollView>
  );
}

function getMethodColor(index: number): string {
  const colors = [Colors.primary, Colors.info, Colors.success, Colors.warning, Colors.primaryLight, Colors.infoLight];
  return colors[index % colors.length];
}

function getCategoryColor(index: number): string {
  const colors = [Colors.primary, Colors.info, Colors.success, Colors.warning, Colors.expense, Colors.primaryLight];
  return colors[index % colors.length];
}

function renderBarChart(data: BarDataPoint[]) {
  if (data.length === 0) return null;
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.bars}>
        {data.map((point, index) => {
          const heightPct = Math.max(4, (point.value / maxVal) * 100);
          const dayLabel = point.label.slice(8, 10);
          return (
            <View key={`${point.label}-${index}`} style={chartStyles.barCol}>
              <View style={chartStyles.barWrapper}>
                <View
                  style={[
                    chartStyles.bar,
                    {
                      height: `${heightPct}%`,
                      backgroundColor: index === data.length - 1 ? Colors.primary : Colors.primary + '70',
                    },
                  ]}
                />
              </View>
              <Text style={chartStyles.barLabel}>{dayLabel}</Text>
            </View>
          );
        })}
      </View>
      <View style={chartStyles.legend}>
        <Text style={chartStyles.legendText}>
          Peak: {formatCurrency(maxVal)}
        </Text>
        <Text style={chartStyles.legendText}>
          Avg: {formatCurrency(data.reduce((s, d) => s + d.value, 0) / data.length)}
        </Text>
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: {
    gap: 8,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 3,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '80%',
    borderRadius: 3,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 4,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border + '40',
  },
  legendText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    maxWidth: 1200,
    alignSelf: 'center' as const,
    width: '100%' as const,
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  logoImage: {
    width: 130,
    height: 45,
  },
  syncBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primary + '15',
    borderRadius: 999,
  },
  syncBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  customizeBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodInfo: {
    marginBottom: 16,
  },
  periodText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  miniStat: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  miniStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniStatValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center' as const,
  },
  miniStatLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
  },
  miniStatDivider: {
    width: 1,
    height: 50,
    backgroundColor: Colors.border,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rankRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '40',
  },
  rankBadge: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  rankMeta: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  rankValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  productLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  productRank: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    width: 24,
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  productBarBg: {
    height: 4,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  productBar: {
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  productRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  productValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  productQty: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  chartContainer: {
    paddingVertical: 4,
  },
  vatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  vatRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border + '40',
  },
  vatLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vatDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  vatText: {
    fontSize: 14,
    color: Colors.text,
  },
  vatValue: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  vatTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  vatTotalLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  vatTotalValue: {
    fontSize: 17,
    fontWeight: '800' as const,
  },
  marginHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  marginLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  marginValue: {
    fontSize: 28,
    fontWeight: '800' as const,
  },
  marginIndicator: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieListDivider: {
    height: 1,
    backgroundColor: Colors.border + '40',
    marginVertical: 12,
  },
  marginBarContainer: {
    marginBottom: 16,
  },
  marginBarBg: {
    height: 8,
    backgroundColor: Colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  marginBarFill: {
    height: 8,
    borderRadius: 4,
  },
  marginDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  marginDetail: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  marginDetailLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  marginDetailValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  iqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  iqIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iqInfo: {
    flex: 1,
  },
  iqValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  iqLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  iqAmount: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.warning,
  },
  iqDivider: {
    height: 1,
    backgroundColor: Colors.border + '40',
    marginVertical: 10,
  },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  compPeriod: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  compPeriodLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  compPeriodValue: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  compPeriodMeta: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  compVs: {
    paddingHorizontal: 12,
  },
  compVsText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600' as const,
  },
  compChange: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 6,
  },
  compChangeText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  emptyState: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
  },
  responsiveGrid: {
    gap: 0,
  },
  gridRow: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  gridRowFull: {
    flexDirection: 'row' as const,
  },
  gridItemFull: {
    flex: 1,
  },
});
