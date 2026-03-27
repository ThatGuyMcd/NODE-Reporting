import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';

import {
  Transaction,
  Invoice,
  Receipt,
  BusinessProfile,
  VATSummary,
  EmailSettings,
  Product,
  AuditLog,
  AuditLogChange,
  AuditLogAction,
  Quote,
  GoCardlessConnection,
  ArchivedTransaction,
} from '@/types';
import { generateId, calculateVATSummary } from '@/utils/helpers';
import { trpcClient } from '@/lib/trpc';

const STORAGE_KEYS = {
  TRANSACTIONS: 'business_transactions',
  INVOICES: 'business_invoices',
  RECEIPTS: 'business_receipts',
  PROFILE: 'business_profile',
  EMAIL_SETTINGS: 'email_settings',
  PRODUCTS: 'business_products',
  AUDIT_LOGS: 'audit_logs',
  QUOTES: 'business_quotes',
  GOCARDLESS: 'gocardless_connection',
};

const defaultProfile: BusinessProfile = {
  businessName: '',
  ownerName: '',
  email: '',
  phone: '',
  address: '',
  vatNumber: '',
  utrNumber: '',
  bankAccountName: '',
  bankName: '',
  bankSortCode: '',
  bankAccountNumber: '',
};

const defaultEmailSettings: EmailSettings = {
  provider: 'resend',
  smtp: {
    host: '',
    port: 587,
    secure: true,
    username: '',
    password: '',
    fromEmail: '',
    fromName: '',
  },
  resend: {
    apiKey: '',
    fromEmail: '',
    fromName: '',
  },
  isConfigured: false,
};

export const [BusinessProvider, useBusiness] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [profile, setProfile] = useState<BusinessProfile>(defaultProfile);
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(defaultEmailSettings);
  const [products, setProducts] = useState<Product[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [goCardless, setGoCardless] = useState<GoCardlessConnection>({
    isConnected: false,
    environment: 'sandbox',
    accessToken: '',
  });

  const transactionsQuery = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const invoicesQuery = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.INVOICES);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const receiptsQuery = useQuery({
    queryKey: ['receipts'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.RECEIPTS);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
      return stored ? JSON.parse(stored) : defaultProfile;
    },
  });

  const emailSettingsQuery = useQuery({
    queryKey: ['emailSettings'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.EMAIL_SETTINGS);
      return stored ? JSON.parse(stored) : defaultEmailSettings;
    },
  });

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const auditLogsQuery = useQuery({
    queryKey: ['auditLogs'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const quotesQuery = useQuery({
    queryKey: ['quotes'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.QUOTES);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const goCardlessQuery = useQuery({
    queryKey: ['gocardless'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.GOCARDLESS);
      if (!stored) {
        const defaults: GoCardlessConnection = {
          isConnected: false,
          environment: 'sandbox',
          accessToken: '',
        };
        return defaults;
      }
      return JSON.parse(stored);
    },
  });

  useEffect(() => {
    if (transactionsQuery.data) setTransactions(transactionsQuery.data);
  }, [transactionsQuery.data]);

  useEffect(() => {
    if (invoicesQuery.data) setInvoices(invoicesQuery.data);
  }, [invoicesQuery.data]);

  useEffect(() => {
    if (receiptsQuery.data) setReceipts(receiptsQuery.data);
  }, [receiptsQuery.data]);

  useEffect(() => {
    if (profileQuery.data) setProfile(profileQuery.data);
  }, [profileQuery.data]);

  useEffect(() => {
    if (emailSettingsQuery.data) setEmailSettings(emailSettingsQuery.data);
  }, [emailSettingsQuery.data]);

  useEffect(() => {
    if (productsQuery.data) setProducts(productsQuery.data);
  }, [productsQuery.data]);

  useEffect(() => {
    if (auditLogsQuery.data) setAuditLogs(auditLogsQuery.data);
  }, [auditLogsQuery.data]);

  useEffect(() => {
    if (quotesQuery.data) setQuotes(quotesQuery.data);
  }, [quotesQuery.data]);

  useEffect(() => {
    if (goCardlessQuery.data) setGoCardless(goCardlessQuery.data);
  }, [goCardlessQuery.data]);

  const saveTransactionsMutation = useMutation({
    mutationFn: async (data: Transaction[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const saveInvoicesMutation = useMutation({
    mutationFn: async (data: Invoice[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(data));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const saveReceiptsMutation = useMutation({
    mutationFn: async (data: Receipt[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.RECEIPTS, JSON.stringify(data));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (data: BusinessProfile) => {
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(data));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  const saveEmailSettingsMutation = useMutation({
    mutationFn: async (data: EmailSettings) => {
      await AsyncStorage.setItem(STORAGE_KEYS.EMAIL_SETTINGS, JSON.stringify(data));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailSettings'] });
    },
  });

  const saveProductsMutation = useMutation({
    mutationFn: async (data: Product[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const saveAuditLogsMutation = useMutation({
    mutationFn: async (data: AuditLog[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(data));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });

  const saveQuotesMutation = useMutation({
    mutationFn: async (data: Quote[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(data));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });

  const saveGoCardlessMutation = useMutation({
    mutationFn: async (data: GoCardlessConnection) => {
      await AsyncStorage.setItem(STORAGE_KEYS.GOCARDLESS, JSON.stringify(data));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gocardless'] });
    },
  });

  const { mutate: mutateTransactions } = saveTransactionsMutation;
  const { mutate: mutateInvoices } = saveInvoicesMutation;
  const { mutate: mutateReceipts } = saveReceiptsMutation;
  const { mutate: mutateProfile } = saveProfileMutation;
  const { mutate: mutateEmailSettings } = saveEmailSettingsMutation;
  const { mutate: mutateProducts } = saveProductsMutation;
  const { mutate: mutateAuditLogs } = saveAuditLogsMutation;
  const { mutate: mutateQuotes } = saveQuotesMutation;
  const { mutate: mutateGoCardless } = saveGoCardlessMutation;

  const addAuditLog = useCallback((log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    const newLog: AuditLog = {
      ...log,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => {
      const updated = [newLog, ...prev];
      mutateAuditLogs(updated);
      return updated;
    });
    return newLog;
  }, [mutateAuditLogs]);

  const addTransaction = useCallback((transaction: Omit<Transaction, 'id'>) => {
    const newTransaction = { ...transaction, id: generateId() };
    setTransactions((prev) => {
      const updated = [...prev, newTransaction];
      mutateTransactions(updated);
      return updated;
    });
    
    addAuditLog({
      action: 'transaction_created',
      entityType: 'transaction',
      entityId: newTransaction.id,
      entityName: newTransaction.description,
      changes: [
        { field: 'type', oldValue: undefined, newValue: newTransaction.type },
        { field: 'amount', oldValue: undefined, newValue: newTransaction.amount },
        { field: 'category', oldValue: undefined, newValue: newTransaction.category },
        { field: 'date', oldValue: undefined, newValue: newTransaction.date },
      ],
    });
    
    return newTransaction;
  }, [mutateTransactions, addAuditLog]);

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    const existingTransaction = transactions.find((t) => t.id === id);
    if (!existingTransaction) return;
    
    const changes: AuditLogChange[] = [];
    const fieldsToTrack: (keyof Transaction)[] = ['type', 'amount', 'vatRate', 'description', 'category', 'date', 'clientName'];
    
    fieldsToTrack.forEach((field) => {
      if (updates[field] !== undefined && updates[field] !== existingTransaction[field]) {
        changes.push({
          field,
          oldValue: existingTransaction[field] as string | number | undefined,
          newValue: updates[field] as string | number | undefined,
        });
      }
    });
    
    setTransactions((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
      mutateTransactions(updated);
      return updated;
    });
    
    if (changes.length > 0) {
      addAuditLog({
        action: 'transaction_edited',
        entityType: 'transaction',
        entityId: id,
        entityName: updates.description || existingTransaction.description,
        changes,
      });
    }
  }, [mutateTransactions, transactions, addAuditLog]);

  const deleteTransaction = useCallback((id: string) => {
    const existingTransaction = transactions.find((t) => t.id === id);
    
    setTransactions((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      mutateTransactions(updated);
      return updated;
    });
    
    if (existingTransaction) {
      addAuditLog({
        action: 'transaction_deleted',
        entityType: 'transaction',
        entityId: id,
        entityName: existingTransaction.description,
        changes: [
          { field: 'amount', oldValue: existingTransaction.amount, newValue: undefined },
          { field: 'type', oldValue: existingTransaction.type, newValue: undefined },
        ],
      });
    }
  }, [mutateTransactions, transactions, addAuditLog]);

  const sendInvoiceEmail = useMutation({
    mutationFn: async (variables: Record<string, unknown>) => {
      const settings = variables.emailSettings as EmailSettings;
      console.log('[sendInvoiceEmail] Provider:', settings?.provider);

      if (settings.provider === 'smtp') {
        if (!settings.smtp?.host || !settings.smtp?.username || !settings.smtp?.password) {
          throw new Error('SMTP settings are incomplete. Please configure host, username, and password in Settings > Email.');
        }
      } else {
        if (!settings.resend?.apiKey) {
          throw new Error('Resend API key is required. Please configure it in Settings > Email.');
        }
      }

      console.log('[sendInvoiceEmail] Sending via tRPC backend, provider:', settings.provider);
      const result = await trpcClient.invoice.sendInvoice.mutate({
        invoiceNumber: variables.invoiceNumber as string,
        clientName: variables.clientName as string,
        clientEmail: variables.clientEmail as string,
        items: (variables.items as { id: string; description: string; quantity: number; unitPrice: number; total: number }[]).map(item => ({
          id: item.id || generateId(),
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
        subtotal: variables.subtotal as number,
        vatAmount: variables.vatAmount as number,
        total: variables.total as number,
        vatRate: variables.vatRate as number,
        issueDate: variables.issueDate as string,
        dueDate: variables.dueDate as string,
        notes: variables.notes as string | undefined,
        businessName: variables.businessName as string,
        businessEmail: variables.businessEmail as string,
        businessAddress: variables.businessAddress as string,
        businessPhone: variables.businessPhone as string | undefined,
        vatNumber: variables.vatNumber as string | undefined,
        emailSettings: {
          provider: settings.provider,
          smtp: settings.smtp,
          resend: settings.resend,
          isConfigured: settings.isConfigured,
        },
      });
      console.log('[sendInvoiceEmail] Success via tRPC, emailId:', result.emailId);
      return { success: true, emailId: result.emailId, message: result.message };
    },
    onSuccess: (data, variables) => {
      console.log('Invoice email sent successfully:', data.message);
      const invoiceNumber = variables.invoiceNumber as string;
      const clientEmail = variables.clientEmail as string;
      const invoice = invoices.find((inv) => inv.invoiceNumber === invoiceNumber);
      setInvoices((prev) => {
        const updated = prev.map((inv) =>
          inv.invoiceNumber === invoiceNumber
            ? { ...inv, status: 'sent' as const }
            : inv
        );
        mutateInvoices(updated);
        return updated;
      });
      
      if (invoice) {
        addAuditLog({
          action: 'invoice_sent',
          entityType: 'invoice',
          entityId: invoice.id,
          entityName: `Invoice #${invoiceNumber}`,
          changes: [
            { field: 'status', oldValue: invoice.status, newValue: 'sent' },
            { field: 'recipient', oldValue: undefined, newValue: clientEmail },
          ],
        });
      }
    },
    onError: (error: Error, variables) => {
      console.error('Failed to send invoice email:', error.message);
      Alert.alert(
        'Email Failed',
        error.message,
        [
          {
            text: 'Try Again',
            onPress: () => {
              console.log('User retrying failed email for invoice:', variables.invoiceNumber);
              sendInvoiceEmail.mutate(variables);
            },
          },
          {
            text: 'Dismiss',
            style: 'cancel',
          },
        ],
      );
    },
  });
  const { mutate: mutateSendInvoiceEmail, isPending: isSendingEmail } = sendInvoiceEmail;

  const updateEmailSettings = useCallback((settings: EmailSettings) => {
    const changes: AuditLogChange[] = [];
    
    if (settings.provider !== emailSettings.provider) {
      changes.push({ field: 'provider', oldValue: emailSettings.provider, newValue: settings.provider });
    }
    if (settings.isConfigured !== emailSettings.isConfigured) {
      changes.push({ field: 'isConfigured', oldValue: emailSettings.isConfigured, newValue: settings.isConfigured });
    }
    
    setEmailSettings(settings);
    mutateEmailSettings(settings);
    
    if (changes.length > 0) {
      addAuditLog({
        action: 'email_settings_updated',
        entityType: 'email_settings',
        entityId: 'email_settings',
        entityName: `Email Settings (${settings.provider})`,
        changes,
      });
    }
  }, [mutateEmailSettings, emailSettings, addAuditLog]);

  const addOrUpdateProducts = useCallback((items: { description: string; unitPrice: number }[]) => {
    setProducts((prev) => {
      const updated = [...prev];
      const now = new Date().toISOString();
      
      items.forEach((item) => {
        if (!item.description.trim() || item.unitPrice <= 0) return;
        
        const existingIndex = updated.findIndex(
          (p) => p.description.toLowerCase() === item.description.toLowerCase()
        );
        
        if (existingIndex >= 0) {
          updated[existingIndex] = {
            ...updated[existingIndex],
            unitPrice: item.unitPrice,
            lastUsed: now,
          };
        } else {
          updated.push({
            id: generateId(),
            description: item.description.trim(),
            unitPrice: item.unitPrice,
            lastUsed: now,
          });
        }
      });
      
      mutateProducts(updated);
      return updated;
    });
  }, [mutateProducts]);

  const searchProducts = useCallback((query: string): Product[] => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return products
      .filter((p) => p.description.toLowerCase().includes(lowerQuery))
      .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
      .slice(0, 5);
  }, [products]);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    const existingProduct = products.find((p) => p.id === id);
    if (!existingProduct) return;
    
    const changes: AuditLogChange[] = [];
    const fieldsToTrack: (keyof Product)[] = ['description', 'unitPrice'];
    
    fieldsToTrack.forEach((field) => {
      if (updates[field] !== undefined && updates[field] !== existingProduct[field]) {
        changes.push({
          field,
          oldValue: existingProduct[field] as string | number | undefined,
          newValue: updates[field] as string | number | undefined,
        });
      }
    });
    
    setProducts((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
      mutateProducts(updated);
      return updated;
    });
    
    if (changes.length > 0) {
      addAuditLog({
        action: 'product_edited',
        entityType: 'product',
        entityId: id,
        entityName: updates.description || existingProduct.description,
        changes,
      });
    }
  }, [mutateProducts, products, addAuditLog]);

  const deleteProduct = useCallback((id: string) => {
    const existingProduct = products.find((p) => p.id === id);
    
    setProducts((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      mutateProducts(updated);
      return updated;
    });
    
    if (existingProduct) {
      addAuditLog({
        action: 'product_deleted',
        entityType: 'product',
        entityId: id,
        entityName: existingProduct.description,
        changes: [
          { field: 'unitPrice', oldValue: existingProduct.unitPrice, newValue: undefined },
        ],
      });
    }
  }, [mutateProducts, products, addAuditLog]);

  const addInvoice = useCallback((invoice: Omit<Invoice, 'id'>) => {
    const newInvoice = { ...invoice, id: generateId() };
    setInvoices((prev) => {
      const updated = [...prev, newInvoice];
      mutateInvoices(updated);
      return updated;
    });

    addOrUpdateProducts(
      invoice.items.map((item) => ({
        description: item.description,
        unitPrice: item.unitPrice,
      }))
    );
    
    addAuditLog({
      action: 'invoice_created',
      entityType: 'invoice',
      entityId: newInvoice.id,
      entityName: `Invoice #${newInvoice.invoiceNumber}`,
      changes: [
        { field: 'client', oldValue: undefined, newValue: newInvoice.clientName },
        { field: 'total', oldValue: undefined, newValue: newInvoice.total },
        { field: 'status', oldValue: undefined, newValue: newInvoice.status },
        { field: 'isRecurring', oldValue: undefined, newValue: newInvoice.isRecurring || false },
      ],
    });

    if (invoice.clientEmail && invoice.clientEmail.trim() && emailSettings.isConfigured) {
      console.log('Auto-sending invoice to:', invoice.clientEmail);
      const emailPayload = {
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail,
        items: invoice.items,
        subtotal: invoice.subtotal,
        vatAmount: invoice.vatAmount,
        total: invoice.total,
        vatRate: invoice.vatRate,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        notes: invoice.notes,
        businessName: profile.businessName || 'Your Business',
        businessEmail: profile.email || '',
        businessAddress: profile.address || '',
        businessPhone: profile.phone,
        vatNumber: profile.vatNumber,
        emailSettings: emailSettings,
      };
      mutateSendInvoiceEmail(emailPayload);
    }

    return newInvoice;
  }, [mutateInvoices, mutateSendInvoiceEmail, profile, emailSettings, addOrUpdateProducts, addAuditLog]);

  const updateInvoice = useCallback((id: string, updates: Partial<Invoice>) => {
    const existingInvoice = invoices.find((i) => i.id === id);
    if (!existingInvoice) return;
    
    const changes: AuditLogChange[] = [];
    const fieldsToTrack: (keyof Invoice)[] = ['clientName', 'clientEmail', 'total', 'status', 'dueDate', 'recurringStatus', 'paymentProvider', 'paymentStatus', 'paymentId', 'paidAt'];
    
    fieldsToTrack.forEach((field) => {
      if (updates[field] !== undefined && updates[field] !== existingInvoice[field]) {
        changes.push({
          field,
          oldValue: existingInvoice[field] as string | number | undefined,
          newValue: updates[field] as string | number | undefined,
        });
      }
    });
    
    let action: AuditLogAction = 'invoice_edited';
    if (updates.recurringStatus === 'paused' && existingInvoice.recurringStatus !== 'paused') {
      action = 'invoice_paused';
    } else if (updates.recurringStatus === 'cancelled' && existingInvoice.recurringStatus !== 'cancelled') {
      action = 'invoice_cancelled';
    } else if (updates.recurringStatus === 'active' && existingInvoice.recurringStatus !== 'active') {
      action = 'invoice_resumed';
    } else if (updates.status === 'paid' && existingInvoice.status !== 'paid') {
      action = 'invoice_marked_paid';
    }
    
    setInvoices((prev) => {
      const updated = prev.map((i) => (i.id === id ? { ...i, ...updates } : i));
      mutateInvoices(updated);
      return updated;
    });
    
    if (changes.length > 0) {
      addAuditLog({
        action,
        entityType: 'invoice',
        entityId: id,
        entityName: `Invoice #${existingInvoice.invoiceNumber}`,
        changes,
      });
    }
  }, [mutateInvoices, invoices, addAuditLog]);

  const startInvoicePayment = useCallback((invoiceId: string, provider: 'gocardless', paymentId?: string) => {
    const existingInvoice = invoices.find((i) => i.id === invoiceId);
    if (!existingInvoice) return;

    const updates: Partial<Invoice> = {
      paymentProvider: provider,
      paymentStatus: 'pending',
      paymentId: paymentId ?? existingInvoice.paymentId,
    };

    setInvoices((prev) => {
      const updated = prev.map((i) => (i.id === invoiceId ? { ...i, ...updates } : i));
      mutateInvoices(updated);
      return updated;
    });

    addAuditLog({
      action: 'invoice_payment_started',
      entityType: 'invoice',
      entityId: invoiceId,
      entityName: `Invoice #${existingInvoice.invoiceNumber}`,
      changes: [
        { field: 'paymentProvider', oldValue: existingInvoice.paymentProvider, newValue: provider },
        { field: 'paymentStatus', oldValue: existingInvoice.paymentStatus, newValue: 'pending' },
        { field: 'paymentId', oldValue: existingInvoice.paymentId, newValue: paymentId },
      ],
    });
  }, [addAuditLog, invoices, mutateInvoices]);

  const completeInvoicePayment = useCallback((invoiceId: string, provider: 'gocardless', paymentId: string, isSuccess: boolean) => {
    const existingInvoice = invoices.find((i) => i.id === invoiceId);
    if (!existingInvoice) return;

    if (isSuccess) {
      const paidAt = new Date().toISOString();
      updateInvoice(invoiceId, {
        status: 'paid',
        paymentProvider: provider,
        paymentStatus: 'paid',
        paymentId,
        paidAt,
      });

      addTransaction({
        type: 'income',
        amount: existingInvoice.total,
        vatRate: existingInvoice.vatRate,
        vatAmount: existingInvoice.vatAmount,
        description: `Invoice ${existingInvoice.invoiceNumber} - ${existingInvoice.clientName} (GoCardless)`,
        category: 'Services',
        date: new Date().toISOString().split('T')[0],
        clientName: existingInvoice.clientName,
        invoiceId: existingInvoice.id,
        items: existingInvoice.items,
      });

      addAuditLog({
        action: 'invoice_payment_completed',
        entityType: 'invoice',
        entityId: invoiceId,
        entityName: `Invoice #${existingInvoice.invoiceNumber}`,
        changes: [
          { field: 'paymentStatus', oldValue: existingInvoice.paymentStatus, newValue: 'paid' },
          { field: 'paymentId', oldValue: existingInvoice.paymentId, newValue: paymentId },
        ],
      });
    } else {
      updateInvoice(invoiceId, {
        paymentProvider: provider,
        paymentStatus: 'failed',
        paymentId,
      });

      addAuditLog({
        action: 'invoice_payment_failed',
        entityType: 'invoice',
        entityId: invoiceId,
        entityName: `Invoice #${existingInvoice.invoiceNumber}`,
        changes: [
          { field: 'paymentStatus', oldValue: existingInvoice.paymentStatus, newValue: 'failed' },
          { field: 'paymentId', oldValue: existingInvoice.paymentId, newValue: paymentId },
        ],
      });
    }
  }, [addAuditLog, addTransaction, invoices, updateInvoice]);

  const deleteInvoice = useCallback((id: string) => {
    const existingInvoice = invoices.find((i) => i.id === id);
    
    setInvoices((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      mutateInvoices(updated);
      return updated;
    });
    
    if (existingInvoice) {
      addAuditLog({
        action: 'invoice_deleted',
        entityType: 'invoice',
        entityId: id,
        entityName: `Invoice #${existingInvoice.invoiceNumber}`,
        changes: [
          { field: 'client', oldValue: existingInvoice.clientName, newValue: undefined },
          { field: 'total', oldValue: existingInvoice.total, newValue: undefined },
        ],
      });
    }
  }, [mutateInvoices, invoices, addAuditLog]);

  const addReceipt = useCallback((receipt: Omit<Receipt, 'id'>) => {
    const newReceipt = { ...receipt, id: generateId() };
    setReceipts((prev) => {
      const updated = [...prev, newReceipt];
      mutateReceipts(updated);
      return updated;
    });
    
    addAuditLog({
      action: 'receipt_created',
      entityType: 'receipt',
      entityId: newReceipt.id,
      entityName: newReceipt.vendor,
      changes: [
        { field: 'vendor', oldValue: undefined, newValue: newReceipt.vendor },
        { field: 'amount', oldValue: undefined, newValue: newReceipt.amount },
        { field: 'category', oldValue: undefined, newValue: newReceipt.category },
        { field: 'date', oldValue: undefined, newValue: newReceipt.date },
      ],
    });
    
    return newReceipt;
  }, [mutateReceipts, addAuditLog]);

  const updateReceipt = useCallback((id: string, updates: Partial<Receipt>) => {
    const existingReceipt = receipts.find((r) => r.id === id);
    if (!existingReceipt) return;
    
    const changes: AuditLogChange[] = [];
    const fieldsToTrack: (keyof Receipt)[] = ['vendor', 'amount', 'vatRate', 'category', 'date', 'description'];
    
    fieldsToTrack.forEach((field) => {
      if (updates[field] !== undefined && updates[field] !== existingReceipt[field]) {
        changes.push({
          field,
          oldValue: existingReceipt[field] as string | number | undefined,
          newValue: updates[field] as string | number | undefined,
        });
      }
    });
    
    setReceipts((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, ...updates } : r));
      mutateReceipts(updated);
      return updated;
    });
    
    if (changes.length > 0) {
      addAuditLog({
        action: 'receipt_edited',
        entityType: 'receipt',
        entityId: id,
        entityName: updates.vendor || existingReceipt.vendor,
        changes,
      });
    }
  }, [mutateReceipts, receipts, addAuditLog]);

  

  const addQuote = useCallback((quote: Omit<Quote, 'id'>) => {
    const newQuote = { ...quote, id: generateId() };
    setQuotes((prev) => {
      const updated = [...prev, newQuote];
      mutateQuotes(updated);
      return updated;
    });

    addOrUpdateProducts(
      quote.items.map((item) => ({
        description: item.description,
        unitPrice: item.unitPrice,
      }))
    );
    
    addAuditLog({
      action: 'quote_created',
      entityType: 'quote',
      entityId: newQuote.id,
      entityName: `Quote #${newQuote.quoteNumber}`,
      changes: [
        { field: 'client', oldValue: undefined, newValue: newQuote.clientName },
        { field: 'total', oldValue: undefined, newValue: newQuote.total },
        { field: 'status', oldValue: undefined, newValue: newQuote.status },
      ],
    });

    return newQuote;
  }, [mutateQuotes, addOrUpdateProducts, addAuditLog]);

  const updateQuote = useCallback((id: string, updates: Partial<Quote>) => {
    const existingQuote = quotes.find((q) => q.id === id);
    if (!existingQuote) return;
    
    const changes: AuditLogChange[] = [];
    const fieldsToTrack: (keyof Quote)[] = ['clientName', 'clientEmail', 'total', 'status', 'validUntil'];
    
    fieldsToTrack.forEach((field) => {
      if (updates[field] !== undefined && updates[field] !== existingQuote[field]) {
        changes.push({
          field,
          oldValue: existingQuote[field] as string | number | undefined,
          newValue: updates[field] as string | number | undefined,
        });
      }
    });
    
    let action: AuditLogAction = 'quote_edited';
    if (updates.status === 'sent' && existingQuote.status !== 'sent') {
      action = 'quote_sent';
    } else if (updates.status === 'accepted' && existingQuote.status !== 'accepted') {
      action = 'quote_accepted';
    } else if (updates.status === 'declined' && existingQuote.status !== 'declined') {
      action = 'quote_declined';
    }
    
    setQuotes((prev) => {
      const updated = prev.map((q) => (q.id === id ? { ...q, ...updates } : q));
      mutateQuotes(updated);
      return updated;
    });
    
    if (changes.length > 0) {
      addAuditLog({
        action,
        entityType: 'quote',
        entityId: id,
        entityName: `Quote #${existingQuote.quoteNumber}`,
        changes,
      });
    }
  }, [mutateQuotes, quotes, addAuditLog]);

  const deleteQuote = useCallback((id: string) => {
    const existingQuote = quotes.find((q) => q.id === id);
    
    setQuotes((prev) => {
      const updated = prev.filter((q) => q.id !== id);
      mutateQuotes(updated);
      return updated;
    });
    
    if (existingQuote) {
      addAuditLog({
        action: 'quote_deleted',
        entityType: 'quote',
        entityId: id,
        entityName: `Quote #${existingQuote.quoteNumber}`,
        changes: [
          { field: 'client', oldValue: existingQuote.clientName, newValue: undefined },
          { field: 'total', oldValue: existingQuote.total, newValue: undefined },
        ],
      });
    }
  }, [mutateQuotes, quotes, addAuditLog]);

  const convertQuoteToInvoice = useCallback((quoteId: string) => {
    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote) return null;

    const invoiceNumber = `INV-${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const newInvoice = addInvoice({
      invoiceNumber,
      clientName: quote.clientName,
      clientEmail: quote.clientEmail,
      clientAddress: quote.clientAddress,
      items: quote.items,
      subtotal: quote.subtotal,
      vatAmount: quote.vatAmount,
      total: quote.total,
      vatRate: quote.vatRate,
      status: 'draft',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      notes: quote.notes,
    });

    updateQuote(quoteId, { 
      status: 'accepted',
      convertedToInvoiceId: newInvoice.id 
    });

    addAuditLog({
      action: 'quote_converted',
      entityType: 'quote',
      entityId: quoteId,
      entityName: `Quote #${quote.quoteNumber}`,
      changes: [
        { field: 'convertedToInvoice', oldValue: undefined, newValue: newInvoice.invoiceNumber },
      ],
    });

    return newInvoice;
  }, [quotes, addInvoice, updateQuote, addAuditLog]);

  const updateProfile = useCallback((updates: Partial<BusinessProfile>) => {
    const changes: AuditLogChange[] = [];
    const fieldsToTrack: (keyof BusinessProfile)[] = ['businessName', 'ownerName', 'email', 'phone', 'address', 'vatNumber', 'utrNumber', 'bankAccountName', 'bankName', 'bankSortCode', 'bankAccountNumber'];
    
    fieldsToTrack.forEach((field) => {
      if (updates[field] !== undefined && updates[field] !== profile[field]) {
        changes.push({
          field,
          oldValue: profile[field] as string | undefined,
          newValue: updates[field] as string | undefined,
        });
      }
    });
    
    setProfile((prev) => {
      const updated = { ...prev, ...updates };
      mutateProfile(updated);
      return updated;
    });
    
    if (changes.length > 0) {
      addAuditLog({
        action: 'profile_updated',
        entityType: 'profile',
        entityId: 'business_profile',
        entityName: updates.businessName || profile.businessName || 'Business Profile',
        changes,
      });
    }
  }, [mutateProfile, profile, addAuditLog]);

  const vatSummary: VATSummary = useMemo(
    () => calculateVATSummary(transactions, receipts),
    [transactions, receipts]
  );

  const isLoading =
    transactionsQuery.isLoading ||
    invoicesQuery.isLoading ||
    receiptsQuery.isLoading ||
    profileQuery.isLoading ||
    emailSettingsQuery.isLoading ||
    productsQuery.isLoading ||
    auditLogsQuery.isLoading ||
    quotesQuery.isLoading ||
    goCardlessQuery.isLoading;

  const importSyncedTransactions = useCallback((archivedTransactions: ArchivedTransaction[]) => {
    console.log('[BusinessContext] Importing', archivedTransactions.length, 'synced transactions');

    const converted: Transaction[] = archivedTransactions.map((at) => ({
      id: at.id,
      type: at.type,
      amount: at.amount,
      vatRate: at.vatRate,
      vatAmount: at.vatAmount,
      description: at.description,
      category: at.category,
      date: at.date,
      positronId: at.positronId,
      tenderUsed: at.tenderUsed,
      amountPaid: at.amountPaid,
      change: at.change,
      addedBy: at.addedBy,
      paidBy: at.paidBy,
      itemCount: at.itemCount,
      itemNames: at.items,
      lineItems: at.lineItems,
      sourceFile: at.sourceFile,
      syncedAt: at.syncedAt,
    }));

    setTransactions((prev) => {
      const manualTransactions = prev.filter((t) => !t.positronId);
      const merged = [...manualTransactions, ...converted];
      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      console.log('[BusinessContext] Merged transactions:', merged.length, '(manual:', manualTransactions.length, ', synced:', converted.length, ')');
      mutateTransactions(merged);
      return merged;
    });
  }, [mutateTransactions]);

  const connectGoCardless = useCallback((connection: Omit<GoCardlessConnection, 'connectedAt'>) => {
    const updated: GoCardlessConnection = {
      ...connection,
      isConnected: true,
      connectedAt: new Date().toISOString(),
    };

    console.log('GoCardless connected:', {
      environment: updated.environment,
      hasAccessToken: !!updated.accessToken,
    });

    setGoCardless(updated);
    mutateGoCardless(updated);

    addAuditLog({
      action: 'gocardless_connected',
      entityType: 'gocardless',
      entityId: 'gocardless',
      entityName: `GoCardless (${updated.environment})`,
      changes: [
        { field: 'environment', oldValue: goCardless.environment, newValue: updated.environment },
        { field: 'isConnected', oldValue: goCardless.isConnected, newValue: true },
      ],
    });
  }, [addAuditLog, goCardless.environment, goCardless.isConnected, mutateGoCardless]);

  const disconnectGoCardless = useCallback(() => {
    const updated: GoCardlessConnection = {
      isConnected: false,
      environment: goCardless.environment,
      accessToken: '',
      connectedAt: undefined,
    };

    console.log('GoCardless disconnected');

    setGoCardless(updated);
    mutateGoCardless(updated);

    addAuditLog({
      action: 'gocardless_disconnected',
      entityType: 'gocardless',
      entityId: 'gocardless',
      entityName: `GoCardless`,
      changes: [
        { field: 'isConnected', oldValue: goCardless.isConnected, newValue: false },
      ],
    });
  }, [addAuditLog, goCardless.environment, goCardless.isConnected, mutateGoCardless]);

  const sendReceiptEmail = useMutation({
    mutationFn: async (variables: Record<string, unknown>) => {
      const settings = variables.emailSettings as EmailSettings;
      console.log('[sendReceiptEmail] Provider:', settings?.provider);

      if (settings.provider === 'smtp') {
        if (!settings.smtp?.host || !settings.smtp?.username || !settings.smtp?.password) {
          throw new Error('SMTP settings are incomplete. Please configure host, username, and password in Settings > Email.');
        }
      } else {
        if (!settings.resend?.apiKey) {
          throw new Error('Resend API key is required. Please configure it in Settings > Email.');
        }
      }

      console.log('[sendReceiptEmail] Sending via tRPC backend, provider:', settings.provider);
      const result = await trpcClient.invoice.sendReceipt.mutate({
        invoiceNumber: variables.invoiceNumber as string,
        clientName: variables.clientName as string,
        clientEmail: variables.clientEmail as string,
        items: (variables.items as { id: string; description: string; quantity: number; unitPrice: number; total: number }[]).map(item => ({
          id: item.id || generateId(),
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
        subtotal: variables.subtotal as number,
        vatAmount: variables.vatAmount as number,
        total: variables.total as number,
        vatRate: variables.vatRate as number,
        issueDate: variables.issueDate as string,
        dueDate: variables.dueDate as string,
        paidDate: variables.paidDate as string,
        paymentMethod: variables.paymentMethod as string | undefined,
        notes: variables.notes as string | undefined,
        businessName: variables.businessName as string,
        businessEmail: variables.businessEmail as string,
        businessAddress: variables.businessAddress as string,
        businessPhone: variables.businessPhone as string | undefined,
        vatNumber: variables.vatNumber as string | undefined,
        emailSettings: {
          provider: settings.provider,
          smtp: settings.smtp,
          resend: settings.resend,
          isConfigured: settings.isConfigured,
        },
      });
      console.log('[sendReceiptEmail] Success via tRPC, emailId:', result.emailId);
      return { success: true, emailId: result.emailId, message: result.message };
    },
    onSuccess: (data, variables) => {
      console.log('Receipt email sent successfully:', data.message);
      const clientEmail = variables.clientEmail as string;
      const invoiceNumber = variables.invoiceNumber as string;
      Alert.alert('Receipt Sent', `Payment receipt sent to ${clientEmail}`);
      
      const invoice = invoices.find((inv) => inv.invoiceNumber === invoiceNumber);
      if (invoice) {
        addAuditLog({
          action: 'receipt_email_sent',
          entityType: 'invoice',
          entityId: invoice.id,
          entityName: `Receipt for Invoice #${invoiceNumber}`,
          changes: [
            { field: 'recipient', oldValue: undefined, newValue: clientEmail },
          ],
        });
      }
    },
    onError: (error: Error, variables) => {
      console.error('Failed to send receipt email:', error.message);
      Alert.alert(
        'Receipt Email Failed',
        error.message,
        [
          {
            text: 'Try Again',
            onPress: () => {
              sendReceiptEmail.mutate(variables);
            },
          },
          {
            text: 'Dismiss',
            style: 'cancel',
          },
        ],
      );
    },
  });
  const { mutate: mutateSendReceiptEmail, isPending: isSendingReceipt } = sendReceiptEmail;

  const sendReceipt = useCallback((invoiceId: string) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) {
      Alert.alert('Error', 'Invoice not found.');
      return;
    }
    if (!inv.clientEmail || !inv.clientEmail.trim()) {
      Alert.alert('No Email', 'This client does not have an email address on file.');
      return;
    }
    if (!emailSettings.isConfigured) {
      Alert.alert('Email Not Configured', 'Please configure email settings in Settings > Email first.');
      return;
    }

    console.log('Sending receipt email for invoice:', inv.invoiceNumber);
    mutateSendReceiptEmail({
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.clientName,
      clientEmail: inv.clientEmail,
      items: inv.items,
      subtotal: inv.subtotal,
      vatAmount: inv.vatAmount,
      total: inv.total,
      vatRate: inv.vatRate,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      paidDate: inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
      paymentMethod: inv.paymentProvider === 'gocardless' ? 'GoCardless' : undefined,
      notes: inv.notes,
      businessName: profile.businessName || 'Your Business',
      businessEmail: profile.email || '',
      businessAddress: profile.address || '',
      businessPhone: profile.phone,
      vatNumber: profile.vatNumber,
      emailSettings: emailSettings,
    });
  }, [invoices, emailSettings, profile, mutateSendReceiptEmail]);

  const sendTransactionEmailMutation = useMutation({
    mutationFn: async (variables: {
      transactionId: string;
      recipientEmail: string;
      description: string;
      type: 'income' | 'expense';
      amount: number;
      vatAmount: number;
      vatRate: number;
      date: string;
      category: string;
      clientName?: string;
      addedBy?: string;
      paidBy?: string;
      tenderUsed?: string;
      lineItems?: { product: string; department?: string; quantity: number; price: number; subtotal: number }[];
    }) => {
      const settings = emailSettings;
      console.log('[sendTransactionEmail] Provider:', settings?.provider);

      if (settings.provider === 'smtp') {
        if (!settings.smtp?.host || !settings.smtp?.username || !settings.smtp?.password) {
          throw new Error('SMTP settings are incomplete. Please configure host, username, and password in Settings > Email.');
        }
      } else {
        if (!settings.resend?.apiKey && !process.env.RESEND_API_KEY) {
          throw new Error('Resend API key is required. Please configure it in Settings > Email.');
        }
      }

      console.log('[sendTransactionEmail] Sending via tRPC backend, provider:', settings.provider);
      const result = await trpcClient.transaction.sendTransaction.mutate({
        transactionId: variables.transactionId,
        recipientEmail: variables.recipientEmail,
        description: variables.description,
        type: variables.type,
        amount: variables.amount,
        vatAmount: variables.vatAmount,
        vatRate: variables.vatRate,
        date: variables.date,
        category: variables.category,
        clientName: variables.clientName,
        addedBy: variables.addedBy,
        paidBy: variables.paidBy,
        tenderUsed: variables.tenderUsed,
        lineItems: variables.lineItems,
        businessName: profile.businessName || 'Your Business',
        businessEmail: profile.email || '',
        businessAddress: profile.address || '',
        businessPhone: profile.phone,
        vatNumber: profile.vatNumber,
        emailSettings: {
          provider: settings.provider,
          smtp: settings.smtp,
          resend: settings.resend,
          isConfigured: settings.isConfigured,
        },
      });
      console.log('[sendTransactionEmail] Success via tRPC, emailId:', result.emailId);
      return { success: true, emailId: result.emailId, message: result.message };
    },
    onSuccess: (data, variables) => {
      console.log('Transaction email sent successfully:', data.message);
      Alert.alert('Email Sent', `Transaction sent to ${variables.recipientEmail}`);
    },
    onError: (error: Error, variables) => {
      console.error('Failed to send transaction email:', error.message);
      Alert.alert(
        'Email Failed',
        error.message,
        [
          {
            text: 'Try Again',
            onPress: () => {
              sendTransactionEmailMutation.mutate(variables);
            },
          },
          {
            text: 'Dismiss',
            style: 'cancel',
          },
        ],
      );
    },
  });
  const { mutate: mutateSendTransactionEmail, isPending: isSendingTransactionEmail } = sendTransactionEmailMutation;

  const sendTransactionEmail = useCallback((transactionId: string, recipientEmail: string) => {
    const tx = transactions.find((t) => t.id === transactionId);
    if (!tx) {
      Alert.alert('Error', 'Transaction not found.');
      return;
    }
    if (!emailSettings.isConfigured) {
      Alert.alert('Email Not Configured', 'Please configure email settings in Settings > Email first.');
      return;
    }

    console.log('Sending transaction email for:', tx.positronId || tx.id);
    mutateSendTransactionEmail({
      transactionId: tx.positronId || tx.id,
      recipientEmail,
      description: tx.description,
      type: tx.type,
      amount: tx.amount,
      vatAmount: tx.vatAmount,
      vatRate: tx.vatRate,
      date: tx.date,
      category: tx.category,
      clientName: tx.clientName,
      addedBy: tx.addedBy,
      paidBy: tx.paidBy,
      tenderUsed: tx.tenderUsed,
      lineItems: tx.lineItems?.map(li => ({
        product: li.product,
        department: li.department,
        quantity: li.quantity,
        price: li.price,
        subtotal: li.subtotal,
      })),
    });
  }, [transactions, emailSettings, mutateSendTransactionEmail]);

  const resendInvoiceEmail = useCallback((invoiceId: string) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) {
      Alert.alert('Error', 'Invoice not found.');
      return;
    }
    if (!inv.clientEmail || !inv.clientEmail.trim()) {
      Alert.alert('No Email', 'This client does not have an email address on file.');
      return;
    }
    if (!emailSettings.isConfigured) {
      Alert.alert('Email Not Configured', 'Please configure email settings in Settings > Email first.');
      return;
    }

    console.log('Manually resending invoice email for:', inv.invoiceNumber);
    mutateSendInvoiceEmail({
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.clientName,
      clientEmail: inv.clientEmail,
      items: inv.items,
      subtotal: inv.subtotal,
      vatAmount: inv.vatAmount,
      total: inv.total,
      vatRate: inv.vatRate,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      notes: inv.notes,
      businessName: profile.businessName || 'Your Business',
      businessEmail: profile.email || '',
      businessAddress: profile.address || '',
      businessPhone: profile.phone,
      vatNumber: profile.vatNumber,
      emailSettings: emailSettings,
    });
  }, [invoices, emailSettings, profile, mutateSendInvoiceEmail]);

  return {
    transactions,
    invoices,
    receipts,
    profile,
    emailSettings,
    vatSummary,
    isLoading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    addReceipt,
    updateReceipt,
    auditLogs,
    updateProfile,
    updateEmailSettings,
    products,
    searchProducts,
    addOrUpdateProducts,
    updateProduct,
    deleteProduct,
    quotes,
    addQuote,
    updateQuote,
    deleteQuote,
    convertQuoteToInvoice,
    goCardless,
    connectGoCardless,
    disconnectGoCardless,
    startInvoicePayment,
    completeInvoicePayment,
    importSyncedTransactions,
    resendInvoiceEmail,
    isSendingEmail,
    sendReceipt,
    isSendingReceipt,
    sendTransactionEmail,
    isSendingTransactionEmail,
  };
});
