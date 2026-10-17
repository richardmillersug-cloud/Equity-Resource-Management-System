'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { BarChart3, ChevronDown, ChevronRight, Receipt, RefreshCw, Search, Trophy } from 'lucide-react';
import { db } from '@/lib/firebase/config';
import { usePagination, PaginationBar, type UsePaginationReturn } from '@/components/ui/Pagination';
import { ExportButtons } from '@/components/ui/ExportButtons';
import {
  formatShiftDateKey,
  resolveOperatingShift,
  type OperatingShift,
} from '@/lib/utils/shop-operating-shifts';

const COLLECTION = 'equitysales';

type SaleView = 'tickets' | 'ranking';

type SaleLine = {
  id: string;
  product: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type SaleTicket = {
  id: string;
  number: string;
  date: Date | null;
  branch: string;
  soldBy: string;
  payment: string;
  operatingShift: OperatingShift;
  lines: SaleLine[];
  quantity: number;
  total: number;
};

type RankedProduct = {
  product: string;
  units: number;
  tickets: number;
  total: number;
  share: number;
  unitShare: number;
};

function isTimestamp(value: unknown): value is { toDate: () => Date } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  );
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (isTimestamp(value)) {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const seconds = Number((value as { seconds: number }).seconds);
    if (Number.isFinite(seconds)) return new Date(seconds * 1000);
  }
  if (typeof value === 'number' && value > 1_000_000_000) {
    return new Date(value < 10_000_000_000 ? value * 1000 : value);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findValue(source: Record<string, unknown>, keys: string[]): unknown {
  const byKey = new Map<string, unknown>();
  for (const [key, value] of Object.entries(source)) {
    if (value == null || value === '') continue;
    const normalized = normalizeKey(key);
    if (!byKey.has(normalized)) byKey.set(normalized, value);
  }
  for (const key of keys) {
    const value = byKey.get(normalizeKey(key));
    if (value != null && value !== '') return value;
  }
  return undefined;
}

function firstText(source: Record<string, unknown>, keys: string[]): string {
  const value = findValue(source, keys);
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function firstNumber(source: Record<string, unknown>, keys: string[]): number | null {
  const value = findValue(source, keys);
  if (value == null || value === '') return null;
  return toNumber(value);
}

function firstDate(source: Record<string, unknown>, keys: string[]): Date | null {
  return toDate(findValue(source, keys));
}

const DATE_KEYS = [
  'saleDate',
  'date',
  'transactionDate',
  'closedDate',
  'dateTime',
  'soldAt',
  'createdAt',
];
const PRODUCT_KEYS = [
  'productDescription',
  'productName',
  'itemName',
  'description',
  'name',
  'product',
  'item',
];
const QTY_KEYS = [
  'unitsSold',
  'quantity',
  'qty',
  'units',
  'unities',
  'soldQty',
  'soldUnits',
  'itemQty',
  'pieces',
  'pcs',
  'count',
  'times',
];
const PRICE_KEYS = ['netUnit', 'unitPrice', 'sellingPrice', 'unitCost', 'rate', 'price'];
const TOTAL_KEYS = [
  'totalAmount',
  'saleAmount',
  'lineTotal',
  'salesIncTax',
  'salesInclTax',
  'salesInclusive',
  'netAmount',
  'lineAmount',
  'amount',
  'total',
];
const BRANCH_KEYS = ['branch', 'shop', 'store', 'location', 'branchName'];
const SELLER_KEYS = ['cashierName', 'cashier', 'soldBy', 'userName', 'till', 'tillNumber', 'terminal'];
const PAYMENT_KEYS = ['paymentMethod', 'payMode', 'paymentType', 'tender'];
const TICKET_KEYS = [
  'ticketNumber',
  'ticketNo',
  'ticket',
  'receiptNumber',
  'receiptNo',
  'billNo',
  'invoiceNo',
  'saleNumber',
  'transNo',
  'reference',
];

function asRecords(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> => typeof item === 'object' && item !== null
  );
}

function amountsNear(a: number, b: number): boolean {
  if (a <= 0 || b <= 0) return false;
  const diff = Math.abs(a - b);
  return diff <= 1 || diff / Math.max(a, b) < 0.02;
}

/**
 * Item total is the money on that line. Receipt units are the sum of line qty.
 * POS sometimes stores netUnit as a real unit price, and sometimes as the line total.
 */
function resolveLineMoney(
  quantity: number,
  advertisedUnit: number,
  recordedTotal: number
): { unitPrice: number; total: number } {
  const qty = quantity > 0 ? quantity : 1;

  if (recordedTotal > 0 && advertisedUnit > 0) {
    if (amountsNear(advertisedUnit * qty, recordedTotal)) {
      return { unitPrice: advertisedUnit, total: recordedTotal };
    }
    if (qty > 1 && amountsNear(advertisedUnit, recordedTotal)) {
      return { unitPrice: recordedTotal / qty, total: recordedTotal };
    }
    return { unitPrice: recordedTotal / qty, total: recordedTotal };
  }

  if (recordedTotal > 0) {
    return { unitPrice: recordedTotal / qty, total: recordedTotal };
  }

  if (advertisedUnit > 0) {
    if (qty > 1) {
      return { unitPrice: advertisedUnit, total: advertisedUnit * qty };
    }
    return { unitPrice: advertisedUnit, total: advertisedUnit };
  }

  return { unitPrice: 0, total: 0 };
}

function lineFrom(id: string, source: Record<string, unknown>, parent: Record<string, unknown>): SaleLine {
  const useParent = source === parent;
  const rawQuantity = firstNumber(source, QTY_KEYS) ?? (useParent ? firstNumber(parent, QTY_KEYS) : null);
  const quantity = rawQuantity != null && rawQuantity > 0 ? rawQuantity : 1;
  const advertisedUnit =
    firstNumber(source, PRICE_KEYS) ?? (useParent ? firstNumber(parent, PRICE_KEYS) : null) ?? 0;
  const recordedTotal =
    firstNumber(source, TOTAL_KEYS) ?? (useParent ? firstNumber(parent, TOTAL_KEYS) : null) ?? 0;
  const { unitPrice, total } = resolveLineMoney(quantity, advertisedUnit, recordedTotal);

  return {
    id,
    product:
      firstText(source, PRODUCT_KEYS) ||
      firstText(parent, PRODUCT_KEYS) ||
      firstText(source, ['productRef', 'sku', 'barcode']) ||
      'Sale',
    quantity,
    unitPrice,
    total,
  };
}

function toTicket(id: string, data: Record<string, unknown>): SaleTicket {
  const nested = [
    ...asRecords(data.items),
    ...asRecords(data.lines),
    ...asRecords(data.products),
    ...asRecords(data.sales),
  ];
  const lines =
    nested.length > 0
      ? nested.map((item, index) => lineFrom(`${id}-${index}`, item, data))
      : [lineFrom(id, data, data)];
  const number = firstText(data, TICKET_KEYS) || id.slice(0, 8).toUpperCase();
  const date = firstDate(data, DATE_KEYS);

  return {
    id,
    number,
    date,
    branch: firstText(data, BRANCH_KEYS) || '—',
    soldBy: firstText(data, SELLER_KEYS) || '—',
    payment: firstText(data, PAYMENT_KEYS) || '—',
    operatingShift: resolveOperatingShift(date),
    lines,
    quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    total: lines.reduce((sum, line) => sum + line.total, 0),
  };
}

function mergeTickets(tickets: SaleTicket[]): SaleTicket[] {
  const groups = new Map<string, SaleTicket>();

  tickets.forEach((ticket) => {
    const sharedNumber = ticket.number !== ticket.id.slice(0, 8).toUpperCase();
    const key = sharedNumber
      ? `${ticket.number}|${ticket.operatingShift.shiftDateKey}|${ticket.branch}`
      : ticket.id;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { ...ticket, lines: [...ticket.lines] });
      return;
    }
    existing.lines.push(...ticket.lines);
    existing.quantity += ticket.quantity;
    existing.total += ticket.total;
    if (!existing.date && ticket.date) existing.date = ticket.date;
    if (existing.branch === '—' && ticket.branch !== '—') existing.branch = ticket.branch;
    if (existing.soldBy === '—' && ticket.soldBy !== '—') existing.soldBy = ticket.soldBy;
    if (existing.payment === '—' && ticket.payment !== '—') existing.payment = ticket.payment;
  });

  return [...groups.values()].sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    maximumFractionDigits: 0,
  }).format(Math.round(amount || 0));
}

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleDateString('en-UG', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' });
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function productSummary(ticket: SaleTicket): string {
  const names = [...new Set(ticket.lines.map((line) => line.product))];
  if (names.length === 0) return '—';
  if (names.length === 1) return names[0];
  return `${names[0]} +${names.length - 1} more`;
}

export default function PurchaseManagerSalesPage() {
  const [tickets, setTickets] = useState<SaleTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('all');
  const [period, setPeriod] = useState('all');
  const [day, setDay] = useState('all');
  const [shift, setShift] = useState('all');
  const [view, setView] = useState<SaleView>('tickets');
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);

  const loadSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = await getDocs(collection(db, COLLECTION));
      const next = snapshot.docs.map((docSnap) =>
        toTicket(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      setTickets(mergeTickets(next));
    } catch (err) {
      console.error('Failed to load equitysales:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sales');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const branches = useMemo(() => {
    const names = new Set(tickets.map((ticket) => ticket.branch).filter((name) => name && name !== '—'));
    return [...names].sort();
  }, [tickets]);

  const periods = useMemo(() => {
    const values = new Map<string, string>();
    tickets.forEach((ticket) => {
      const shiftDate = ticket.operatingShift.shiftDate;
      if (!shiftDate) return;
      const key = `${shiftDate.getFullYear()}-${String(shiftDate.getMonth() + 1).padStart(2, '0')}`;
      values.set(key, `${MONTH_NAMES[shiftDate.getMonth()]} ${shiftDate.getFullYear()}`);
    });
    return [...values.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([value, label]) => ({ value, label }));
  }, [tickets]);

  const days = useMemo(() => {
    const values = new Set<number>();
    tickets.forEach((ticket) => {
      const shiftDate = ticket.operatingShift.shiftDate;
      if (!shiftDate) return;
      if (period !== 'all') {
        const key = `${shiftDate.getFullYear()}-${String(shiftDate.getMonth() + 1).padStart(2, '0')}`;
        if (key !== period) return;
      }
      values.add(shiftDate.getDate());
    });
    return [...values].sort((a, b) => a - b);
  }, [tickets, period]);

  const datedTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (branch !== 'all' && ticket.branch !== branch) return false;
      if (period === 'all' && day === 'all') return true;
      const shiftDate = ticket.operatingShift.shiftDate;
      if (!shiftDate) return false;
      if (period !== 'all') {
        const key = `${shiftDate.getFullYear()}-${String(shiftDate.getMonth() + 1).padStart(2, '0')}`;
        if (key !== period) return false;
      }
      if (day !== 'all' && shiftDate.getDate() !== Number(day)) return false;
      return true;
    });
  }, [tickets, branch, period, day]);

  const shifts = useMemo(
    () =>
      [
        { value: 'shop1', label: 'Shop1 · 9:00 PM – 9:00 AM' },
        { value: 'server', label: 'Server · 9:00 AM – 9:00 PM' },
      ].filter((item) => datedTickets.some((ticket) => ticket.operatingShift.id === item.value)),
    [datedTickets]
  );

  const filteredTickets = useMemo(() => {
    const term = search.trim().toLowerCase();
    return datedTickets.filter((ticket) => {
      if (shift !== 'all' && ticket.operatingShift.id !== shift) return false;
      if (!term) return true;
      const haystack = [
        ticket.number,
        ticket.branch,
        ticket.soldBy,
        ticket.operatingShift.label,
        ticket.payment,
        formatDate(ticket.date),
        ...ticket.lines.map((line) => line.product),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [datedTickets, search, shift]);

  const summary = useMemo(() => {
    const total = filteredTickets.reduce((sum, ticket) => sum + ticket.total, 0);
    const units = filteredTickets.reduce((sum, ticket) => sum + ticket.quantity, 0);
    const products = new Set(
      filteredTickets.flatMap((ticket) => ticket.lines.map((line) => line.product.toLowerCase()))
    ).size;
    return { total, units, products, tickets: filteredTickets.length };
  }, [filteredTickets]);

  const rankedProducts = useMemo(() => {
    const map = new Map<string, RankedProduct & { ticketIds: Set<string> }>();
    filteredTickets.forEach((ticket) => {
      ticket.lines.forEach((line) => {
        const key = line.product.toLowerCase();
        const current = map.get(key) || {
          product: line.product,
          units: 0,
          tickets: 0,
          total: 0,
          share: 0,
          unitShare: 0,
          ticketIds: new Set<string>(),
        };
        current.units += line.quantity > 0 ? line.quantity : 1;
        current.total += line.total;
        current.ticketIds.add(ticket.id);
        map.set(key, current);
      });
    });
    const salesTotal = summary.total || 0;
    const unitsTotal = [...map.values()].reduce((sum, row) => sum + row.units, 0);
    return [...map.values()].map((row) => ({
      product: row.product,
      units: row.units,
      tickets: row.ticketIds.size,
      total: row.total,
      share: salesTotal > 0 ? (row.total / salesTotal) * 100 : 0,
      unitShare: unitsTotal > 0 ? (row.units / unitsTotal) * 100 : 0,
    }));
  }, [filteredTickets, summary.total]);

  const salesRanking = useMemo(
    () => [...rankedProducts].sort((a, b) => b.units - a.units || b.total - a.total),
    [rankedProducts]
  );

  const unitsRanking = useMemo(
    () => [...rankedProducts].sort((a, b) => b.total - a.total || b.units - a.units),
    [rankedProducts]
  );

  const ticketColumns = useMemo(() => {
    const has = (pick: (ticket: SaleTicket) => boolean) => filteredTickets.some(pick);
    return {
      qty: has((ticket) => ticket.quantity > 0),
      branch: has((ticket) => ticket.branch !== '—'),
      soldBy: has((ticket) => ticket.soldBy !== '—'),
      payment: has((ticket) => ticket.payment !== '—'),
    };
  }, [filteredTickets]);

  const ticketPage = usePagination(filteredTickets, 25);
  const salesPage = usePagination(salesRanking, 25);
  const unitsPage = usePagination(unitsRanking, 25);

  const exportData = useMemo(() => {
    if (view === 'ranking') {
      const salesRank = new Map(salesRanking.map((row, index) => [row.product, index + 1]));
      return unitsRanking.map((row, index) => ({
        'Rank by money': index + 1,
        'Rank by units': salesRank.get(row.product) ?? '',
        Product: row.product,
        Sales: formatMoney(row.total),
        Units: row.units,
        'Money share': `${row.share.toFixed(1)}%`,
      }));
    }
    return filteredTickets.map((ticket) => ({
      Ticket: ticket.number,
      Date: formatDate(ticket.date),
      Time: formatTime(ticket.date) || '—',
      'Shift date': formatShiftDateKey(ticket.operatingShift.shiftDateKey),
      Shift: ticket.operatingShift.label,
      Products: ticket.lines.map((line) => line.product).join(', '),
      Quantity: ticket.quantity || '—',
      Total: formatMoney(ticket.total),
      Branch: ticket.branch,
      Cashier: ticket.soldBy,
      Payment: ticket.payment,
    }));
  }, [view, unitsRanking, salesRanking, filteredTickets]);

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F3EAF7]">
            <BarChart3 className="h-5 w-5 text-[#6A2B81]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Sales</h1>
            <p className="text-sm text-gray-500">Tickets and how products rank against each other</p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadSales}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Sales value" value={formatMoney(summary.total)} accent="#45B04A" />
        <SummaryCard label="Tickets" value={summary.tickets.toLocaleString()} accent="#6A2B81" />
        <SummaryCard label="Units sold" value={summary.units.toLocaleString()} accent="#F49121" />
        <SummaryCard label="Products" value={summary.products.toLocaleString()} />
      </div>

      <div className="inline-flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-1.5">
        <button
          type="button"
          onClick={() => setView('tickets')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            view === 'tickets' ? 'bg-[#6A2B81] text-white shadow-sm' : 'text-gray-600 hover:bg-[#F3EAF7]'
          }`}
        >
          <Receipt className="h-4 w-4" />
          Tickets
        </button>
        <button
          type="button"
          onClick={() => setView('ranking')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            view === 'ranking' ? 'bg-[#F49121] text-white shadow-sm' : 'text-gray-600 hover:bg-[#FFF4E8]'
          }`}
        >
          <Trophy className="h-4 w-4" />
          Products ranking
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={view === 'tickets' ? 'Search ticket, product, or shift...' : 'Search a product...'}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-transparent focus:ring-2 focus:ring-[#6A2B81]"
            />
          </div>
          {branches.length > 1 && (
            <select
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">All branches</option>
              {branches.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}
          <ExportButtons
            data={exportData}
            filename={view === 'ranking' ? 'product-ranking' : 'sales-tickets'}
            title={view === 'ranking' ? 'Products ranking' : 'Sales tickets'}
            subtitle={`${view === 'ranking' ? unitsRanking.length : filteredTickets.length} row(s)`}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <FilterSelect
            label="Month"
            value={period}
            onChange={(value) => {
              setPeriod(value);
              setDay('all');
            }}
          >
            <option value="all">All months</option>
            {periods.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Day" value={day} onChange={setDay}>
            <option value="all">All days</option>
            {days.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Shift" value={shift} onChange={setShift}>
            <option value="all">All shifts</option>
            {shifts.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </FilterSelect>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Shop1 is overnight (9:00 PM to 9:00 AM). Morning tickets before 9:00 AM stay on last night&apos;s
          Shop1 shift. Server starts when Shop1 closes at 9:00 AM.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-gray-600">
            <RefreshCw className="h-5 w-5 animate-spin text-[#6A2B81]" />
            Loading sales...
          </div>
        ) : error ? (
          <div className="px-4 py-12 text-center">
            <p className="text-red-600">{error}</p>
            <button
              type="button"
              onClick={loadSales}
              className="mt-4 rounded-lg bg-[#6A2B81] px-4 py-2 text-sm text-white"
            >
              Try again
            </button>
          </div>
        ) : view === 'tickets' ? (
          filteredTickets.length === 0 ? (
            <div className="px-4 py-16 text-center text-gray-500">
              {tickets.length === 0 ? 'No sales tickets yet.' : 'No tickets match this search.'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      {(
                        [
                          ['Ticket', 'left'],
                          ['Date', 'left'],
                          ['Products', 'left'],
                          ...(ticketColumns.qty ? [['Qty', 'right'] as const] : []),
                          ['Total', 'right'],
                          ...(ticketColumns.branch ? [['Branch', 'left'] as const] : []),
                          ...(ticketColumns.soldBy ? [['Cashier', 'left'] as const] : []),
                          ...(ticketColumns.payment ? [['Payment', 'left'] as const] : []),
                        ] as const
                      ).map(([heading, align]) => (
                        <th
                          key={heading}
                          className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500 ${
                            align === 'right' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ticketPage.paginatedItems.map((ticket, index) => {
                      const open = openTicketId === ticket.id;
                      const previous = index > 0 ? ticketPage.paginatedItems[index - 1] : null;
                      const shiftChanged =
                        !previous ||
                        previous.operatingShift.id !== ticket.operatingShift.id ||
                        previous.operatingShift.shiftDateKey !== ticket.operatingShift.shiftDateKey;
                      return (
                        <TicketRows
                          key={ticket.id}
                          ticket={ticket}
                          open={open}
                          columns={ticketColumns}
                          showShift={shiftChanged}
                          onToggle={() => setOpenTicketId(open ? null : ticket.id)}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-200 px-4 py-3">
                <PaginationBar
                  currentPage={ticketPage.currentPage}
                  totalPages={ticketPage.totalPages}
                  rowsPerPage={ticketPage.rowsPerPage}
                  startIndex={ticketPage.startIndex}
                  endIndex={ticketPage.endIndex}
                  totalItems={ticketPage.totalItems}
                  onPageChange={ticketPage.setCurrentPage}
                  onRowsPerPageChange={ticketPage.setRowsPerPage}
                />
              </div>
            </>
          )
        ) : rankedProducts.length === 0 ? (
          <div className="px-4 py-16 text-center text-gray-500">
            {tickets.length === 0 ? 'No products to rank yet.' : 'No products match this search.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 divide-y divide-gray-200 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            <RankingPanel
              title="Rank by sales"
              hint="Highest units first"
              page={salesPage}
              metric="sales"
            />
            <RankingPanel
              title="Rank by total money"
              hint="Highest money per product first"
              page={unitsPage}
              metric="sales"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-600">
      <span className="font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
      >
        {children}
      </select>
    </label>
  );
}

function TicketRows({
  ticket,
  open,
  columns,
  showShift,
  onToggle,
}: {
  ticket: SaleTicket;
  open: boolean;
  columns: { qty: boolean; branch: boolean; soldBy: boolean; payment: boolean };
  showShift: boolean;
  onToggle: () => void;
}) {
  const colSpan =
    4 +
    (columns.qty ? 1 : 0) +
    (columns.branch ? 1 : 0) +
    (columns.soldBy ? 1 : 0) +
    (columns.payment ? 1 : 0);

  return (
    <>
      {showShift && (
        <tr className="bg-[#FFF4E8]">
          <td colSpan={colSpan} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#F49121]">
            {ticket.operatingShift.label} · {formatShiftDateKey(ticket.operatingShift.shiftDateKey)} ·{' '}
            {ticket.operatingShift.hoursLabel}
          </td>
        </tr>
      )}
      <tr className="cursor-pointer hover:bg-[#F3EAF7]/40" onClick={onToggle}>
        <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#6A2B81]">
          <span className="inline-flex items-center gap-1.5">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {ticket.number}
          </span>
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-gray-700">
          <div>{formatDate(ticket.date)}</div>
          {formatTime(ticket.date) && <div className="text-xs text-gray-400">{formatTime(ticket.date)}</div>}
        </td>
        <td className="max-w-[260px] truncate px-4 py-3 text-gray-800" title={productSummary(ticket)}>
          {productSummary(ticket)}
        </td>
        {columns.qty && (
          <td className="px-4 py-3 text-right tabular-nums text-gray-800">
            {ticket.quantity > 0 ? ticket.quantity.toLocaleString() : '—'}
          </td>
        )}
        <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">{formatMoney(ticket.total)}</td>
        {columns.branch && <td className="px-4 py-3 text-gray-700">{ticket.branch}</td>}
        {columns.soldBy && <td className="px-4 py-3 text-gray-700">{ticket.soldBy}</td>}
        {columns.payment && <td className="px-4 py-3 text-gray-700">{ticket.payment}</td>}
      </tr>
      {open && (
        <tr className="bg-[#F3EAF7]/30">
          <td colSpan={colSpan} className="px-4 py-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-1 text-left font-medium">Product</th>
                  <th className="py-1 text-right font-medium">Qty</th>
                  <th className="py-1 text-right font-medium">Unit price</th>
                  <th className="py-1 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {ticket.lines.map((line) => (
                  <tr key={line.id} className="border-t border-[#6A2B81]/10">
                    <td className="py-2 pr-3 text-gray-800">{line.product}</td>
                    <td className="py-2 text-right tabular-nums text-gray-700">
                      {line.quantity > 0 ? line.quantity.toLocaleString() : '—'}
                    </td>
                    <td className="py-2 text-right tabular-nums text-gray-700">
                      {line.unitPrice > 0 ? formatMoney(line.unitPrice) : '—'}
                    </td>
                    <td className="py-2 text-right font-medium tabular-nums text-gray-900">{formatMoney(line.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

function RankingPanel({
  title,
  hint,
  page,
  metric,
}: {
  title: string;
  hint: string;
  page: UsePaginationReturn<RankedProduct>;
  metric: 'sales' | 'units';
}) {
  return (
    <section className="min-w-0">
      <div className="border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500">{hint}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Rank</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Product</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                {metric === 'units' ? 'Units sold' : 'Sales'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {page.paginatedItems.map((row, index) => {
              const rank = page.startIndex + index + 1;
              const share = metric === 'units' ? row.unitShare : row.share;
              return (
                <tr key={row.product} className="hover:bg-[#FFF4E8]/60">
                  <td className="px-4 py-3">
                    <RankBadge rank={rank} />
                  </td>
                  <td className="max-w-[180px] px-4 py-3">
                    <p className="truncate font-medium text-gray-900" title={row.product}>
                      {row.product}
                    </p>
                    <p className="text-xs text-gray-500">
                      {metric === 'units' ? formatMoney(row.total) : `${row.units.toLocaleString()} units`}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className={`font-semibold tabular-nums ${metric === 'units' ? 'text-[#F49121]' : 'text-gray-900'}`}>
                      {metric === 'units' ? `${row.units.toLocaleString()} units` : formatMoney(row.total)}
                    </p>
                    <div className="mt-1 flex items-center justify-end gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${metric === 'units' ? 'bg-[#F49121]' : 'bg-[#45B04A]'}`}
                          style={{ width: `${Math.max(4, Math.min(100, share))}%` }}
                        />
                      </div>
                      <span className="w-10 text-xs tabular-nums text-gray-500">{share.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-gray-200 px-4 py-3">
        <PaginationBar
          currentPage={page.currentPage}
          totalPages={page.totalPages}
          rowsPerPage={page.rowsPerPage}
          startIndex={page.startIndex}
          endIndex={page.endIndex}
          totalItems={page.totalItems}
          onPageChange={page.setCurrentPage}
          onRowsPerPageChange={page.setRowsPerPage}
        />
      </div>
    </section>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const tone =
    rank === 1
      ? 'bg-[#F49121] text-white'
      : rank === 2
        ? 'bg-[#6A2B81] text-white'
        : rank === 3
          ? 'bg-[#45B04A] text-white'
          : 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-bold ${tone}`}>
      {rank}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold sm:text-2xl" style={{ color: accent || '#111827' }}>
        {value}
      </p>
    </div>
  );
}
