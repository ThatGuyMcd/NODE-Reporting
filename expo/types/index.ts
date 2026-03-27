export type TransactionType = 'income' | 'expense';

export type VATRate = 0 | 5 | 20;

export interface TransactionLineItem {
  product: string;
  group: string;
  department: string;
  quantity: number;
  price: number;
  subtotal: number;
  vat: number;
  vatPercentage: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  vatRate: VATRate;
  vatAmount: number;
  description: string;
  category: string;
  date: string;
  clientName?: string;
  invoiceId?: string;
  items?: InvoiceItem[];
  positronId?: string;
  tenderUsed?: string;
  amountPaid?: number;
  change?: number;
  addedBy?: string;
  paidBy?: string;
  itemCount?: number;
  itemNames?: string[];
  lineItems?: TransactionLineItem[];
  sourceFile?: string;
  syncedAt?: string;
}

export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type RecurringStatus = 'active' | 'paused' | 'cancelled';

export type InvoicePaymentProvider = 'manual' | 'gocardless';

export type InvoicePaymentStatus = 'none' | 'pending' | 'paid' | 'failed';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  items: InvoiceItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  vatRate: VATRate;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  issueDate: string;
  dueDate: string;
  notes?: string;
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  recurringEndDate?: string;
  parentInvoiceId?: string;
  nextRecurringDate?: string;
  recurringStatus?: RecurringStatus;
  paymentProvider?: InvoicePaymentProvider;
  paymentStatus?: InvoicePaymentStatus;
  paymentId?: string;
  paidAt?: string;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  items: InvoiceItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  vatRate: VATRate;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  issueDate: string;
  validUntil: string;
  notes?: string;
  convertedToInvoiceId?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  vatRate?: VATRate;
}

export interface Receipt {
  id: string;
  imageUri: string;
  amount: number;
  vatAmount: number;
  vatRate: VATRate;
  vendor: string;
  category: string;
  date: string;
  description?: string;
  transactionId?: string;
}

export interface BusinessProfile {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  vatNumber?: string;
  utrNumber?: string;
  bankAccountName?: string;
  bankName?: string;
  bankSortCode?: string;
  bankAccountNumber?: string;
}

export interface VATSummary {
  outputVAT: number;
  inputVAT: number;
  netVAT: number;
  totalIncome: number;
  totalExpenses: number;
  profit: number;
}

export type IncomeCategory = 
  | 'Sales'
  | 'Services'
  | 'Consulting'
  | 'Commission'
  | 'Other Income';

export type ExpenseCategory =
  | 'Office Supplies'
  | 'Travel'
  | 'Equipment'
  | 'Software'
  | 'Marketing'
  | 'Professional Services'
  | 'Utilities'
  | 'Insurance'
  | 'Bank Charges'
  | 'Other Expenses';

export const INCOME_CATEGORIES: IncomeCategory[] = [
  'Sales',
  'Services',
  'Consulting',
  'Commission',
  'Other Income',
];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Office Supplies',
  'Travel',
  'Equipment',
  'Software',
  'Marketing',
  'Professional Services',
  'Utilities',
  'Insurance',
  'Bank Charges',
  'Other Expenses',
];

export const VAT_RATES: { label: string; value: VATRate }[] = [
  { label: 'Standard (20%)', value: 20 },
  { label: 'Reduced (5%)', value: 5 },
  { label: 'Zero Rated (0%)', value: 0 },
];

export const RECURRING_FREQUENCIES: { label: string; value: RecurringFrequency }[] = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Yearly', value: 'yearly' },
];

export interface PositronUser {
  id: string;
  email: string;
  name: string;
  siteId: string;
  siteName: string;
}

export interface PositronAuthState {
  isAuthenticated: boolean;
  user: PositronUser | null;
  token: string | null;
}

export interface ArchivedTransaction {
  id: string;
  transactionId: string;
  type: TransactionType;
  amount: number;
  vatRate: VATRate;
  vatAmount: number;
  description: string;
  category: string;
  date: string;
  tenderUsed: string;
  amountPaid: number;
  change: number;
  addedBy: string;
  paidBy: string;
  itemCount: number;
  items: string[];
  lineItems: TransactionLineItem[];
  sourceFile: string;
  syncedAt: string;
  positronId: string;
}

export type EmailProvider = 'smtp' | 'resend';

export interface SMTPSettings {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

export interface ResendSettings {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export interface EmailSettings {
  provider: EmailProvider;
  smtp: SMTPSettings;
  resend: ResendSettings;
  isConfigured: boolean;
}

export interface Product {
  id: string;
  description: string;
  unitPrice: number;
  lastUsed: string;
}

export type AuditLogAction = 
  | 'transaction_created'
  | 'transaction_edited'
  | 'transaction_deleted'
  | 'invoice_created'
  | 'invoice_edited'
  | 'invoice_deleted'
  | 'invoice_sent'
  | 'invoice_paused'
  | 'invoice_cancelled'
  | 'invoice_resumed'
  | 'invoice_marked_paid'
  | 'receipt_created'
  | 'receipt_edited'
  | 'product_created'
  | 'product_edited'
  | 'product_deleted'
  | 'profile_updated'
  | 'email_settings_updated'
  | 'quote_created'
  | 'quote_edited'
  | 'quote_deleted'
  | 'quote_sent'
  | 'quote_accepted'
  | 'quote_declined'
  | 'quote_converted'
  | 'gocardless_connected'
  | 'gocardless_disconnected'
  | 'invoice_payment_started'
  | 'invoice_payment_completed'
  | 'invoice_payment_failed'
  | 'receipt_email_sent';

export type AuditLogEntityType = 
  | 'transaction'
  | 'invoice'
  | 'receipt'
  | 'product'
  | 'profile'
  | 'email_settings'
  | 'quote'
  | 'gocardless';

export interface AuditLogChange {
  field: string;
  oldValue: string | number | boolean | undefined;
  newValue: string | number | boolean | undefined;
}

export interface AuditLog {
  id: string;
  action: AuditLogAction;
  entityType: AuditLogEntityType;
  entityId: string;
  entityName: string;
  changes: AuditLogChange[];
  timestamp: string;
}

export type GoCardlessEnvironment = 'sandbox' | 'live';

export interface GoCardlessConnection {
  isConnected: boolean;
  environment: GoCardlessEnvironment;
  accessToken: string;
  connectedAt?: string;
}
