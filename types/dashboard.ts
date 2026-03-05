export type DateRangeType =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_30_days'
  | 'this_quarter'
  | 'this_tax_year'
  | 'all_time'
  | 'custom';

export interface DateRange {
  type: DateRangeType;
  startDate: string;
  endDate: string;
}

export interface WidgetConfig {
  id: string;
  visible: boolean;
}

export interface DashboardConfig {
  widgets: WidgetConfig[];
  dateRange: DateRangeType;
  customStartDate?: string;
  customEndDate?: string;
}

export const WIDGET_DEFINITIONS: { id: string; title: string; description: string; nodeViewOnly: boolean }[] = [
  { id: 'financial_overview', title: 'Financial Overview', description: 'Income, expenses, profit & VAT', nodeViewOnly: false },
  { id: 'transaction_stats', title: 'Transaction Stats', description: 'Count, average value & items sold', nodeViewOnly: false },
  { id: 'payment_methods', title: 'Payment Methods', description: 'Revenue by payment type', nodeViewOnly: true },
  { id: 'top_products', title: 'Top Products', description: 'Best selling products by revenue', nodeViewOnly: true },
  { id: 'sales_by_category', title: 'Sales by Category', description: 'Revenue grouped by category', nodeViewOnly: false },
  { id: 'staff_performance', title: 'Staff Performance', description: 'Sales by staff member', nodeViewOnly: true },
  { id: 'daily_sales', title: 'Daily Sales', description: 'Sales trend for selected period', nodeViewOnly: false },
  { id: 'vat_breakdown', title: 'VAT Breakdown', description: 'Detailed VAT analysis', nodeViewOnly: false },
  { id: 'profit_margin', title: 'Profit & Margin', description: 'Profit margin and breakdown', nodeViewOnly: false },
  { id: 'invoices_quotes', title: 'Invoices & Quotes', description: 'Outstanding invoices and quotes', nodeViewOnly: false },
  { id: 'monthly_comparison', title: 'Monthly Comparison', description: 'This month vs last month', nodeViewOnly: false },
  { id: 'recent_activity', title: 'Recent Activity', description: 'Latest transactions', nodeViewOnly: false },
];

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  widgets: WIDGET_DEFINITIONS.map((w) => ({ id: w.id, visible: true })),
  dateRange: 'this_month',
};

export const DATE_RANGE_OPTIONS: { value: DateRangeType; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_tax_year', label: 'Tax Year' },
  { value: 'all_time', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
];

export function getDateRangeFromType(type: DateRangeType, customStart?: string, customEnd?: string): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(today.getTime() + 86400000 - 1);

  switch (type) {
    case 'today':
      return { start: today, end: endOfToday };

    case 'this_week': {
      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + mondayOffset);
      return { start: monday, end: endOfToday };
    }

    case 'this_month':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: endOfToday,
      };

    case 'last_30_days': {
      const thirtyAgo = new Date(today);
      thirtyAgo.setDate(today.getDate() - 30);
      return { start: thirtyAgo, end: endOfToday };
    }

    case 'this_quarter': {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      return {
        start: new Date(now.getFullYear(), quarterMonth, 1),
        end: endOfToday,
      };
    }

    case 'this_tax_year': {
      const currentYear = now.getFullYear();
      const aprilSixth = new Date(currentYear, 3, 6);
      if (now >= aprilSixth) {
        return { start: aprilSixth, end: endOfToday };
      }
      return { start: new Date(currentYear - 1, 3, 6), end: endOfToday };
    }

    case 'custom': {
      const s = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1);
      const e = customEnd ? new Date(customEnd + 'T23:59:59') : endOfToday;
      return { start: s, end: e };
    }

    case 'all_time':
    default:
      return { start: new Date(2000, 0, 1), end: endOfToday };
  }
}
