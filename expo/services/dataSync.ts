import { getManifest, getFile, ManifestEntry } from './positronApi';
import { ArchivedTransaction, TransactionLineItem } from '@/types';
import { generateId } from '@/utils/helpers';

const ARCHIVE_FOLDER_PREFIX = 'archivedata/transaction_archive';

const CONCURRENCY = 8;

const yieldToUI = async (): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

export interface SyncProgress {
  phase: 'connecting' | 'downloading' | 'parsing' | 'complete' | 'error';
  current: number;
  total: number;
  message: string;
}

export type SyncProgressCallback = (progress: SyncProgress) => void;

function isTransactionArchiveFile(path: string | undefined): boolean {
  if (!path) return false;
  const normalized = path.replace(/\\/g, '/').toLowerCase();
  return (
    normalized.startsWith(ARCHIVE_FOLDER_PREFIX) &&
    normalized.endsWith('transactions.csv') &&
    !normalized.endsWith('.bak')
  );
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current);
        current = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        row.push(current);
        current = '';
        if (row.length > 1 || row.some((c) => c.trim())) {
          rows.push(row);
        }
        row = [];
        if (ch === '\r') i++;
      } else {
        current += ch;
      }
    }
  }

  if (current || row.length > 0) {
    row.push(current);
    if (row.length > 1 || row.some((c) => c.trim())) {
      rows.push(row);
    }
  }

  return rows;
}

function parseTransactionDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];

  const match1 = dateStr.match(/(\d{1,2}):(\d{2})\s*\/\s*(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (match1) {
    const [, , , day, month, year] = match1;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const match2 = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match2) {
    const [, day, month, year] = match2;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return dateStr;
}

function parseTimeDateAdded(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];

  const match = dateStr.match(/(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  if (match) {
    const [, , , , , day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return dateStr;
}

interface CSVColumnMap {
  transactionId: number;
  transactionType: number;
  group: number;
  department: number;
  pluFile: number;
  product: number;
  quantity: number;
  price: number;
  subtotal: number;
  vat: number;
  vatCode: number;
  vatPercentage: number;
  total: number;
  tenderUsed: number;
  amountPaid: number;
  change: number;
  addedBy: number;
  timeDateAdded: number;
  paidBy: number;
  date: number;
}

function buildColumnMap(headerRow: string[]): CSVColumnMap {
  const map: Record<string, number> = {};
  headerRow.forEach((col, i) => {
    map[col.trim().toLowerCase()] = i;
  });

  return {
    transactionId: map['transactionid'] ?? 0,
    transactionType: map['transactiontype'] ?? 1,
    group: map['group'] ?? 2,
    department: map['department'] ?? 3,
    pluFile: map['plufile'] ?? 4,
    product: map['product'] ?? 5,
    quantity: map['quantity'] ?? 6,
    price: map['price'] ?? 7,
    subtotal: map['subtotal'] ?? 8,
    vat: map['vat'] ?? 9,
    vatCode: map['vatcode'] ?? 10,
    vatPercentage: map['vatpercentage'] ?? 11,
    total: map['total'] ?? 12,
    tenderUsed: map['tenderused'] ?? 13,
    amountPaid: map['amountpaid'] ?? 14,
    change: map['change'] ?? 15,
    addedBy: map['addedby'] ?? 16,
    timeDateAdded: map['timedateadded'] ?? 17,
    paidBy: map['paidby'] ?? 18,
    date: map['date'] ?? 19,
  };
}

function parseTransactionsFromCSV(csvText: string, sourceFile: string): ArchivedTransaction[] {
  const rows = parseCSV(csvText);
  if (rows.length < 2) return [];

  const headerRow = rows[0];
  const cols = buildColumnMap(headerRow);
  const dataRows = rows.slice(1);

  const transactionGroups = new Map<string, typeof dataRows>();
  let currentTxId = '';

  for (const row of dataRows) {
    const txId = (row[cols.transactionId] || '').trim();
    if (txId) {
      currentTxId = txId;
    }
    if (!currentTxId) continue;

    const group = transactionGroups.get(currentTxId) || [];
    group.push(row);
    transactionGroups.set(currentTxId, group);
  }

  const transactions: ArchivedTransaction[] = [];

  for (const [txId, txRows] of transactionGroups) {
    const headerLine = txRows[0];
    if (!headerLine) continue;

    const total = parseFloat(headerLine[cols.total] || '0') || 0;
    const tenderUsed = (headerLine[cols.tenderUsed] || '').trim();
    const dateStr = (headerLine[cols.date] || '').trim();
    const timeDateAdded = (headerLine[cols.timeDateAdded] || '').trim();
    const addedBy = (headerLine[cols.addedBy] || '').trim();
    const transactionType = (headerLine[cols.transactionType] || 'Sale').trim();
    const paidBy = (headerLine[cols.paidBy] || '').trim();

    const amountPaid = parseFloat(headerLine[cols.amountPaid] || '0') || 0;
    const change = parseFloat(headerLine[cols.change] || '0') || 0;

    let totalVat = 0;
    const productNames: string[] = [];
    const groups = new Set<string>();
    const departments = new Set<string>();
    const lineItems: TransactionLineItem[] = [];

    for (const row of txRows) {
      const product = (row[cols.product] || '').trim();
      const vat = parseFloat(row[cols.vat] || '0') || 0;
      const group = (row[cols.group] || '').trim();
      const department = (row[cols.department] || '').trim();
      const quantity = parseFloat(row[cols.quantity] || '1') || 1;
      const price = parseFloat(row[cols.price] || '0') || 0;
      const subtotal = parseFloat(row[cols.subtotal] || '0') || 0;
      const vatPercentage = parseFloat(row[cols.vatPercentage] || '0') || 0;

      totalVat += vat;
      if (product && !product.startsWith('MSG -')) {
        productNames.push(product);
      }
      if (group) groups.add(group);
      if (department) departments.add(department);

      if (product) {
        lineItems.push({
          product,
          group,
          department,
          quantity,
          price,
          subtotal,
          vat,
          vatPercentage,
        });
      }
    }

    const uniqueProducts = [...new Set(productNames)];
    const description = uniqueProducts.length > 3
      ? `${uniqueProducts.slice(0, 3).join(', ')} +${uniqueProducts.length - 3} more`
      : uniqueProducts.join(', ') || `Transaction ${txId}`;

    const groupStr = [...groups].join(', ');
    const category = groupStr || 'Sales';

    const parsedDate = dateStr
      ? parseTransactionDate(dateStr)
      : parseTimeDateAdded(timeDateAdded);

    let vatRate: 0 | 5 | 20 = 0;
    if (totalVat > 0 && total > 0) {
      const effectiveRate = (totalVat / (total - totalVat)) * 100;
      if (effectiveRate > 15) vatRate = 20;
      else if (effectiveRate > 3) vatRate = 5;
    }

    const isSale = transactionType.toLowerCase() === 'sale' ||
                   transactionType.toLowerCase() === 'income';

    transactions.push({
      id: generateId(),
      transactionId: txId,
      type: isSale ? 'income' : 'expense',
      amount: Math.abs(total),
      vatRate,
      vatAmount: Math.round(totalVat * 100) / 100,
      description,
      category,
      date: parsedDate,
      tenderUsed,
      amountPaid,
      change,
      addedBy,
      paidBy,
      itemCount: txRows.length,
      items: uniqueProducts,
      lineItems,
      sourceFile,
      syncedAt: new Date().toISOString(),
      positronId: txId,
    });
  }

  return transactions;
}

export async function syncTransactionsFromPortal(
  siteId: string,
  onProgress?: SyncProgressCallback,
): Promise<ArchivedTransaction[]> {
  console.log('[DataSync] Starting sync for site:', siteId);

  onProgress?.({
    phase: 'connecting',
    current: 0,
    total: 0,
    message: 'Fetching file manifest...',
  });

  let manifest: ManifestEntry[];
  try {
    manifest = await getManifest(siteId);
    console.log('[DataSync] Total manifest entries:', manifest.length);
  } catch (err) {
    console.error('[DataSync] Failed to fetch manifest:', err);
    throw new Error('Failed to connect to NODEView Portal. Please check your connection.');
  }

  if (manifest.length > 0) {
    const sample = manifest[0];
    console.log('[DataSync] Sample manifest entry keys:', Object.keys(sample));
    console.log('[DataSync] Sample manifest entry:', JSON.stringify(sample));
    
    const archiveRelated = manifest.filter((entry) => {
      const p = (entry.path || (entry as any).Path || (entry as any).filePath || (entry as any).name || (entry as any).FileName || '');
      return p.toLowerCase().includes('archive') || p.toLowerCase().includes('transaction');
    });
    console.log('[DataSync] Archive/transaction related entries:', archiveRelated.length);
    if (archiveRelated.length > 0) {
      console.log('[DataSync] Sample archive entries:', archiveRelated.slice(0, 5).map(e => JSON.stringify(e)));
    }
  }

  const transactionFiles = manifest.filter((entry) => {
    const p = entry.path || (entry as any).Path || (entry as any).filePath || (entry as any).name || (entry as any).FileName || '';
    return isTransactionArchiveFile(p);
  });
  console.log('[DataSync] Transaction archive files found:', transactionFiles.length);

  if (transactionFiles.length === 0) {
    onProgress?.({
      phase: 'complete',
      current: 0,
      total: 0,
      message: 'No transaction archive files found on the server.',
    });
    return [];
  }

  onProgress?.({
    phase: 'downloading',
    current: 0,
    total: transactionFiles.length,
    message: `Downloading ${transactionFiles.length} transaction file(s)...`,
  });

  const downloadedFiles = new Map<string, string>();
  const queue = [...transactionFiles];
  let downloaded = 0;

  const worker = async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) break;

      try {
        console.log('[DataSync] Downloading:', next.path);
        const text = await getFile(siteId, next.path);
        downloadedFiles.set(next.path, text);
        downloaded++;

        onProgress?.({
          phase: 'downloading',
          current: downloaded,
          total: transactionFiles.length,
          message: `Downloaded ${downloaded} of ${transactionFiles.length} file(s)...`,
        });
        await yieldToUI();
      } catch (err) {
        console.error('[DataSync] Failed to download:', next.path, err);
      }
    }
  };

  const workers = Array.from({ length: Math.min(CONCURRENCY, transactionFiles.length) }, () => worker());
  await Promise.all(workers);

  console.log('[DataSync] Downloaded', downloadedFiles.size, 'files');

  onProgress?.({
    phase: 'parsing',
    current: 0,
    total: downloadedFiles.size,
    message: 'Parsing transaction data...',
  });

  const allTransactions: ArchivedTransaction[] = [];
  let parsed = 0;

  for (const [filePath, content] of downloadedFiles) {
    await yieldToUI();
    try {
      const txns = parseTransactionsFromCSV(content, filePath);
      console.log('[DataSync] Parsed', txns.length, 'transactions from', filePath);
      allTransactions.push(...txns);
    } catch (err) {
      console.error('[DataSync] Failed to parse:', filePath, err);
    }

    parsed++;
    onProgress?.({
      phase: 'parsing',
      current: parsed,
      total: downloadedFiles.size,
      message: `Parsed ${parsed} of ${downloadedFiles.size} file(s)...`,
    });
    await yieldToUI();
  }

  const seen = new Set<string>();
  const deduplicated = allTransactions.filter((t) => {
    const key = `${t.positronId}_${t.date}_${t.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  deduplicated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  console.log('[DataSync] Total unique transactions:', deduplicated.length);

  onProgress?.({
    phase: 'complete',
    current: deduplicated.length,
    total: deduplicated.length,
    message: `Synced ${deduplicated.length} transaction(s) successfully.`,
  });

  return deduplicated;
}
