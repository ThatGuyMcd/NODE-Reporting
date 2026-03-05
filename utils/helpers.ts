import { Transaction, Invoice, Receipt, VATSummary, Quote, VATRate, InvoiceItem } from '@/types';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function calculateVAT(grossAmount: number, vatRate: number): number {
  return grossAmount * vatRate / (100 + vatRate);
}

export function getVatRateLabel(items: InvoiceItem[]): string {
  const rates = items.map((item) => item.vatRate ?? 0);
  const unique = Array.from(new Set(rates));
  if (unique.length === 1) {
    return `${unique[0]}%`;
  }
  return 'Mixed';
}

export function getVatRateValue(items: InvoiceItem[]): VATRate {
  const rates = items.map((item) => item.vatRate ?? 0);
  const unique = Array.from(new Set(rates));
  if (unique.length !== 1) {
    return 0;
  }
  return (unique[0] ?? 0) as VATRate;
}

export function calculateNetFromGross(grossAmount: number, vatRate: number): number {
  return grossAmount / (1 + vatRate / 100);
}

export function calculateVATSummary(
  transactions: Transaction[],
  receipts: Receipt[]
): VATSummary {
  const incomeTransactions = transactions.filter((t) => t.type === 'income');
  const expenseTransactions = transactions.filter((t) => t.type === 'expense');

  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const incomeExVAT = incomeTransactions.reduce((sum, t) => sum + (t.amount - t.vatAmount), 0);
  const outputVAT = incomeTransactions.reduce((sum, t) => sum + t.vatAmount, 0);

  const expenseVAT = expenseTransactions.reduce((sum, t) => sum + t.vatAmount, 0);
  const receiptVAT = receipts.reduce((sum, r) => sum + r.vatAmount, 0);
  const inputVAT = expenseVAT + receiptVAT;

  const totalExpenses =
    expenseTransactions.reduce((sum, t) => sum + (t.amount - t.vatAmount), 0) +
    receipts.reduce((sum, r) => sum + (r.amount - r.vatAmount), 0);

  return {
    outputVAT,
    inputVAT,
    netVAT: outputVAT - inputVAT,
    totalIncome,
    totalExpenses,
    profit: incomeExVAT - totalExpenses,
  };
}

export function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `INV-${year}${month}-${random}`;
}

export function generateQuoteNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `QTE-${year}${month}-${random}`;
}

export function getTaxYearRange(): { start: Date; end: Date } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const aprilSixth = new Date(currentYear, 3, 6);

  if (now >= aprilSixth) {
    return {
      start: new Date(currentYear, 3, 6),
      end: new Date(currentYear + 1, 3, 5),
    };
  } else {
    return {
      start: new Date(currentYear - 1, 3, 6),
      end: new Date(currentYear, 3, 5),
    };
  }
}

export function getQuarterRange(quarter: 1 | 2 | 3 | 4): { start: Date; end: Date } {
  const taxYear = getTaxYearRange();
  const startYear = taxYear.start.getFullYear();

  switch (quarter) {
    case 1:
      return {
        start: new Date(startYear, 3, 6),
        end: new Date(startYear, 6, 5),
      };
    case 2:
      return {
        start: new Date(startYear, 6, 6),
        end: new Date(startYear, 9, 5),
      };
    case 3:
      return {
        start: new Date(startYear, 9, 6),
        end: new Date(startYear + 1, 0, 5),
      };
    case 4:
      return {
        start: new Date(startYear + 1, 0, 6),
        end: new Date(startYear + 1, 3, 5),
      };
  }
}

export function calculateNextRecurringDate(
  currentDate: string,
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
): string {
  const date = new Date(currentDate);
  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date.toISOString().split('T')[0];
}

export function generateInvoiceText(
  invoice: Invoice,
  businessProfile: {
    businessName: string;
    address: string;
    email: string;
    phone: string;
    vatNumber?: string;
    bankAccountName?: string;
    bankName?: string;
    bankSortCode?: string;
    bankAccountNumber?: string;
  }
): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(50));
  lines.push(businessProfile.businessName.toUpperCase());
  lines.push(businessProfile.address);
  lines.push(`Email: ${businessProfile.email}`);
  if (businessProfile.phone) lines.push(`Phone: ${businessProfile.phone}`);
  if (businessProfile.vatNumber) lines.push(`VAT Number: ${businessProfile.vatNumber}`);
  if (businessProfile.bankAccountName || businessProfile.bankName || businessProfile.bankSortCode || businessProfile.bankAccountNumber) {
    lines.push('');
    lines.push('BANK TRANSFER DETAILS:');
    if (businessProfile.bankAccountName) lines.push(`Account Name: ${businessProfile.bankAccountName}`);
    if (businessProfile.bankName) lines.push(`Bank: ${businessProfile.bankName}`);
    if (businessProfile.bankSortCode) lines.push(`Sort Code: ${businessProfile.bankSortCode}`);
    if (businessProfile.bankAccountNumber) lines.push(`Account Number: ${businessProfile.bankAccountNumber}`);
  }
  lines.push('='.repeat(50));
  lines.push('');
  lines.push(`INVOICE: ${invoice.invoiceNumber}`);
  lines.push(`Date: ${formatDate(invoice.issueDate)}`);
  lines.push(`Due Date: ${formatDate(invoice.dueDate)}`);
  lines.push('');
  lines.push('BILL TO:');
  lines.push(invoice.clientName);
  if (invoice.clientEmail) lines.push(invoice.clientEmail);
  if (invoice.clientAddress) lines.push(invoice.clientAddress);
  lines.push('');
  lines.push('-'.repeat(50));
  lines.push('ITEMS');
  lines.push('-'.repeat(50));
  
  invoice.items.forEach((item) => {
    lines.push(`${item.description}`);
    lines.push(`  ${item.quantity} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.total)} • VAT ${item.vatRate ?? 0}%`);
  });
  
  lines.push('-'.repeat(50));
  lines.push(`Net (ex. VAT): ${formatCurrency(invoice.subtotal)}`);
  lines.push(`VAT (${getVatRateLabel(invoice.items)}): ${formatCurrency(invoice.vatAmount)}`);
  lines.push(`TOTAL (inc. VAT): ${formatCurrency(invoice.total)}`);
  lines.push('-'.repeat(50));
  
  if (invoice.notes) {
    lines.push('');
    lines.push('NOTES:');
    lines.push(invoice.notes);
  }
  
  lines.push('');
  lines.push('Thank you for your business!');
  
  return lines.join('\n');
}

export function generateQuoteText(
  quote: Quote,
  businessProfile: { businessName: string; address: string; email: string; phone: string; vatNumber?: string }
): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(50));
  lines.push(businessProfile.businessName.toUpperCase());
  lines.push(businessProfile.address);
  lines.push(`Email: ${businessProfile.email}`);
  if (businessProfile.phone) lines.push(`Phone: ${businessProfile.phone}`);
  if (businessProfile.vatNumber) lines.push(`VAT Number: ${businessProfile.vatNumber}`);
  lines.push('='.repeat(50));
  lines.push('');
  lines.push(`QUOTE: ${quote.quoteNumber}`);
  lines.push(`Date: ${formatDate(quote.issueDate)}`);
  lines.push(`Valid Until: ${formatDate(quote.validUntil)}`);
  lines.push('');
  lines.push('PREPARED FOR:');
  lines.push(quote.clientName);
  if (quote.clientEmail) lines.push(quote.clientEmail);
  if (quote.clientAddress) lines.push(quote.clientAddress);
  lines.push('');
  lines.push('-'.repeat(50));
  lines.push('ITEMS');
  lines.push('-'.repeat(50));
  
  quote.items.forEach((item) => {
    lines.push(`${item.description}`);
    lines.push(`  ${item.quantity} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.total)} • VAT ${item.vatRate ?? 0}%`);
  });
  
  lines.push('-'.repeat(50));
  lines.push(`Net (ex. VAT): ${formatCurrency(quote.subtotal)}`);
  lines.push(`VAT (${getVatRateLabel(quote.items)}): ${formatCurrency(quote.vatAmount)}`);
  lines.push(`TOTAL (inc. VAT): ${formatCurrency(quote.total)}`);
  lines.push('-'.repeat(50));
  
  if (quote.notes) {
    lines.push('');
    lines.push('NOTES:');
    lines.push(quote.notes);
  }
  
  lines.push('');
  lines.push('This quote is valid until ' + formatDate(quote.validUntil) + '.');
  lines.push('Thank you for considering our services!');
  
  return lines.join('\n');
}

export function exportToCSV(
  transactions: Transaction[],
  receipts: Receipt[],
  invoices: Invoice[]
): string {
  const headers = [
    'Date',
    'Type',
    'Description',
    'Category',
    'Gross Amount',
    'VAT Rate',
    'VAT Amount',
    'Net Amount',
  ];

  const rows: string[][] = [];

  transactions.forEach((t) => {
    rows.push([
      t.date,
      t.type,
      t.description,
      t.category,
      t.amount.toFixed(2),
      `${t.vatRate}%`,
      t.vatAmount.toFixed(2),
      (t.amount - t.vatAmount).toFixed(2),
    ]);
  });

  receipts.forEach((r) => {
    rows.push([
      r.date,
      'expense',
      r.description || r.vendor,
      r.category,
      r.amount.toFixed(2),
      `${r.vatRate}%`,
      r.vatAmount.toFixed(2),
      (r.amount - r.vatAmount).toFixed(2),
    ]);
  });

  invoices.forEach((inv) => {
    rows.push([
      inv.issueDate,
      'invoice',
      `Invoice ${inv.invoiceNumber} - ${inv.clientName}`,
      'Services',
      inv.total.toFixed(2),
      `${inv.vatRate}%`,
      inv.vatAmount.toFixed(2),
      inv.subtotal.toFixed(2),
    ]);
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}
