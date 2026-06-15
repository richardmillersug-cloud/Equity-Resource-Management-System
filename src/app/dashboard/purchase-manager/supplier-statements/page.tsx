'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Search,
  Building2,
  RefreshCw,
  Printer,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Play,
  X,
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../../../lib/firebase/config';
import { enhancedSupplierService, EnhancedSupplier } from '../../../../lib/firebase/enhanced-supplier';

interface StatementLine {
  date: Date;
  reference: string;
  description: string;
  type: 'invoice' | 'payment' | 'return';
  debit: number;
  credit: number;
  balance: number;
  paymentMethod?: string;
  paymentDetails?: string;
  paymentReference?: string;
  invoiceRef?: string;
}

interface StatementSummary {
  openingBalance: number;
  totalInvoiced: number;
  totalPaid: number;
  closingBalance: number;
  invoiceCount: number;
  paymentCount: number;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(amount);

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-UG', { year: 'numeric', month: 'short', day: 'numeric' });

interface PaymentMethodObject {
  type?: string;
  details?: {
    chequeNumber?: string;
    chequeDate?: unknown;
    bankAccount?: string;
    bankName?: string;
    mobileNumber?: string;
    referenceNumber?: string;
    transactionId?: string;
  };
  status?: string;
}

const parsePaymentMethod = (raw: unknown): { label: string; details: string } => {
  if (!raw) return { label: '', details: '' };

  if (typeof raw === 'string') return { label: raw, details: '' };

  const pm = raw as PaymentMethodObject;
  const type = pm.type ?? '';
  const d = pm.details ?? {};

  const labelMap: Record<string, string> = {
    cash: 'Cash',
    cheque: 'Cheque',
    bank_deposit: 'Bank Deposit',
    mobile_money: 'Mobile Money',
    momo: 'MTN MoMo',
    airtel_pay: 'Airtel Pay',
  };
  const label = labelMap[type] ?? type;

  const extras: string[] = [];
  if (d.chequeNumber) extras.push(`#${d.chequeNumber}`);
  if (d.bankName) extras.push(d.bankName);
  if (d.bankAccount) extras.push(`Acct: ${d.bankAccount}`);
  if (d.mobileNumber) extras.push(d.mobileNumber);
  if (d.transactionId) extras.push(`TxID: ${d.transactionId}`);
  if (d.referenceNumber) extras.push(`Ref: ${d.referenceNumber}`);
  if (pm.status && pm.status !== 'cleared' && pm.status !== 'completed') extras.push(`(${pm.status})`);

  return { label, details: extras.join(' · ') };
};

export default function SupplierStatementsPage() {
  const [suppliers, setSuppliers] = useState<EnhancedSupplier[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);

  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<EnhancedSupplier | null>(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [dateFrom, setDateFrom] = useState(firstOfMonth.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split('T')[0]);

  const [statementLines, setStatementLines] = useState<StatementLine[]>([]);
  const [summary, setSummary] = useState<StatementSummary | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const all = await enhancedSupplierService.getAll();
        setSuppliers(all.filter(s => s.status === 'Active' || s.status === 'Inactive'));
      } catch (err) {
        console.error('Error loading suppliers:', err);
      } finally {
        setSuppliersLoading(false);
      }
    };
    loadSuppliers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSupplierDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuppliers = suppliers.filter(s =>
    s.supplierName.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.tinNumber?.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const handleSelectSupplier = (supplier: EnhancedSupplier) => {
    setSelectedSupplierId(supplier.id);
    setSelectedSupplier(supplier);
    setSupplierSearch(supplier.supplierName);
    setShowSupplierDropdown(false);
    setHasRun(false);
    setStatementLines([]);
    setSummary(null);
  };

  const runStatement = async () => {
    if (!selectedSupplierId) {
      setError('Please select a supplier first.');
      return;
    }
    if (!dateFrom || !dateTo) {
      setError('Please select a valid date range.');
      return;
    }

    setRunning(true);
    setError(null);
    setHasRun(false);

    try {
      const fromDate = new Date(dateFrom + 'T00:00:00');
      const toDate = new Date(dateTo + 'T23:59:59');

      // ── 1. Fetch all invoices for this supplier ─────────────────────────
      let invoiceSnap;
      try {
        const q = query(
          collection(db, 'invoices'),
          where('supplierId', '==', selectedSupplierId),
          orderBy('createdAt', 'asc')
        );
        invoiceSnap = await getDocs(q);
      } catch {
        const q = query(collection(db, 'invoices'), where('supplierId', '==', selectedSupplierId));
        invoiceSnap = await getDocs(q);
      }

      const allInvoices = invoiceSnap.docs.map(doc => {
        const d = doc.data();
        const date: Date = d.date?.toDate?.() ?? d.createdAt?.toDate?.() ?? new Date();
        return { id: doc.id, ...d, date };
      });

      // invoices within the period
      const periodInvoices = allInvoices.filter(inv => {
        const d = inv.date as Date;
        return d >= fromDate && d <= toDate;
      });

      // opening balance = sum of remaining amounts on invoices BEFORE the period
      const beforeInvoices = allInvoices.filter(inv => (inv.date as Date) < fromDate);
      const openingBalance = beforeInvoices.reduce((sum, inv) => {
        const amount = Number(inv.amount ?? inv.amountInDigits ?? 0);
        const paid = Number(inv.paidAmount ?? 0);
        return sum + Math.max(0, amount - paid);
      }, 0);

      // ── 2. Fetch payments linked to these invoices ──────────────────────
      const allInvoiceIds = allInvoices.map(inv => inv.id);
      let paymentLines: StatementLine[] = [];

      if (allInvoiceIds.length > 0) {
        // Firestore `in` queries are limited to 30 items; chunk if needed
        const chunks: string[][] = [];
        for (let i = 0; i < allInvoiceIds.length; i += 30) {
          chunks.push(allInvoiceIds.slice(i, i + 30));
        }

        const paymentDocs: { id: string; [key: string]: unknown }[] = [];
        for (const chunk of chunks) {
          try {
            const pq = query(
              collection(db, 'invoicePayments'),
              where('invoiceId', 'in', chunk),
              orderBy('paymentDate', 'asc')
            );
            const pSnap = await getDocs(pq);
            pSnap.docs.forEach(doc => paymentDocs.push({ id: doc.id, ...doc.data() }));
          } catch {
            const pq = query(collection(db, 'invoicePayments'), where('invoiceId', 'in', chunk));
            const pSnap = await getDocs(pq);
            pSnap.docs.forEach(doc => paymentDocs.push({ id: doc.id, ...doc.data() }));
          }
        }

        paymentLines = paymentDocs
          .map(p => {
            const pDate: Date = (p.paymentDate as Timestamp)?.toDate?.() ?? new Date(p.paymentDate as string);
            const { label: pmLabel, details: pmDetails } = parsePaymentMethod(p.paymentMethod);
            const payRef = (p.paymentReference as string) ?? (p.id as string).slice(0, 8).toUpperCase();
            const invNum = (p.invoiceNumber as string) ?? `INV-${(p.invoiceId as string).slice(0, 8)}`;
            return {
              id: p.id,
              date: pDate,
              amount: Number(p.amount ?? 0),
              invoiceId: p.invoiceId as string,
              invoiceNumber: invNum,
              reference: payRef,
              paymentMethod: pmLabel,
              paymentDetails: pmDetails,
              paymentReference: payRef,
              invoiceRef: invNum,
            };
          })
          .filter(p => p.date >= fromDate && p.date <= toDate);
      }

      // ── 3. Build combined ledger lines ──────────────────────────────────
      const lines: Omit<StatementLine, 'balance'>[] = [];

      for (const inv of periodInvoices) {
        const invoiceNumber = (inv.invoiceNumber ?? inv.fdn ?? `INV-${inv.id.slice(0, 8)}`) as string;
        lines.push({
          date: inv.date as Date,
          reference: invoiceNumber,
          description: `Invoice – ${inv.supplierName ?? selectedSupplier?.supplierName ?? ''}`,
          type: 'invoice',
          debit: Number(inv.amount ?? inv.amountInDigits ?? 0),
          credit: 0,
        });
      }

      for (const pmt of paymentLines) {
        lines.push({
          date: pmt.date,
          reference: pmt.reference,
          description: `Payment for ${pmt.invoiceRef ?? pmt.invoiceNumber}`,
          type: 'payment',
          debit: 0,
          credit: pmt.amount,
          paymentMethod: pmt.paymentMethod,
          paymentDetails: pmt.paymentDetails,
          paymentReference: pmt.paymentReference,
          invoiceRef: pmt.invoiceRef ?? pmt.invoiceNumber,
        });
      }

      // Sort by date ascending, invoices before payments on the same day
      lines.sort((a, b) => {
        const diff = a.date.getTime() - b.date.getTime();
        if (diff !== 0) return diff;
        return a.type === 'invoice' ? -1 : 1;
      });

      // Apply running balance
      let balance = openingBalance;
      const finalLines: StatementLine[] = lines.map(l => {
        balance += l.debit - l.credit;
        return { ...l, balance };
      });

      const totalInvoiced = finalLines.filter(l => l.type === 'invoice').reduce((s, l) => s + l.debit, 0);
      const totalPaid = finalLines.filter(l => l.type === 'payment').reduce((s, l) => s + l.credit, 0);

      setSummary({
        openingBalance,
        totalInvoiced,
        totalPaid,
        closingBalance: openingBalance + totalInvoiced - totalPaid,
        invoiceCount: periodInvoices.length,
        paymentCount: paymentLines.length,
      });

      setStatementLines(finalLines);
      setHasRun(true);
    } catch (err) {
      console.error('Error running statement:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate statement. Please try again.');
    } finally {
      setRunning(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4 sm:p-6">
      <style>{`
        .print-only { display: none; }
        @media print {
          body * { visibility: hidden; }
          #statement-print-area, #statement-print-area * { visibility: visible; }
          #statement-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          @page { size: A4 landscape; margin: 10mm 12mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

          /* ── Table layout ─────────────────────────────────────────────────── */
          /* Landscape A4: 297mm - 24mm margins = 273mm ≈ 1032px usable width  */
          /* Usable height: 210mm - 20mm margins ≈ 190mm → targets 10 rows     */
          #statement-print-area table {
            font-size: 9px !important;
            width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
          }
          #statement-print-area table th,
          #statement-print-area table td {
            padding: 3px 5px !important;
            font-size: 9px !important;
            line-height: 1.3 !important;
            overflow: hidden !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
            text-overflow: ellipsis !important;
          }
          #statement-print-area table th {
            font-size: 7.5px !important;
            font-weight: 600 !important;
            padding: 3px 5px !important;
          }
          /* Allow description to wrap up to 2 lines — it's the flex column */
          #statement-print-area table td:nth-child(3) {
            white-space: normal !important;
            overflow: hidden !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
          }
          /* Allow reference column to wrap so long refs are fully visible */
          #statement-print-area table td:nth-child(2) {
            white-space: normal !important;
            overflow: visible !important;
            word-break: break-all !important;
            overflow-wrap: break-word !important;
            font-size: 9px !important;
            font-weight: 600 !important;
          }
          /* Hide secondary sub-lines inside payment-method cells only */
          #statement-print-area table td:nth-child(4) > div > div {
            display: none !important;
          }
          /* Force all child text to inherit the 9px size */
          #statement-print-area table td span,
          #statement-print-area table td div {
            font-size: 9px !important;
            line-height: 1.3 !important;
          }

          /* ── Column widths (landscape: fixed 540px, ~492px for Description) ── */
          #statement-print-area table th:nth-child(1),
          #statement-print-area table td:nth-child(1) { width: 70px;  } /* Date */
          #statement-print-area table th:nth-child(2),
          #statement-print-area table td:nth-child(2) { width: 120px; } /* Reference */
          #statement-print-area table th:nth-child(3),
          #statement-print-area table td:nth-child(3) { width: auto;  } /* Description – flex */
          #statement-print-area table th:nth-child(4),
          #statement-print-area table td:nth-child(4) { width: 80px;  } /* Payment Method */
          #statement-print-area table th:nth-child(5),
          #statement-print-area table td:nth-child(5) { width: 100px; } /* Debit */
          #statement-print-area table th:nth-child(6),
          #statement-print-area table td:nth-child(6) { width: 100px; } /* Credit */
          #statement-print-area table th:nth-child(7),
          #statement-print-area table td:nth-child(7) { width: 100px; } /* Balance */

          /* Flatten payment-method badge to plain text */
          #statement-print-area .payment-badge {
            display: inline !important;
            background: none !important;
            border: none !important;
            padding: 0 !important;
            border-radius: 0 !important;
            font-weight: 600;
            color: #15803d !important;
          }

          #statement-print-area .rounded-xl { border-radius: 0 !important; }
          #statement-print-area .shadow-sm  { box-shadow: none !important; }
          #statement-print-area .overflow-x-auto { overflow: visible !important; }
        }
      `}</style>

      <div className="w-full">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-2">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Supplier Statements</h1>
              <p className="text-gray-600 text-sm sm:text-base">Generate a full account statement for any supplier</p>
            </div>
          </div>
        </div>

        {/* ── Run Controls ────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6 no-print">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Statement Parameters</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Supplier picker */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-medium text-gray-600 mb-1">Supplier</label>
              <div
                className="flex items-center border border-gray-300 rounded-lg px-3 py-2 cursor-pointer focus-within:ring-2 focus-within:ring-purple-500 bg-white"
                onClick={() => setShowSupplierDropdown(true)}
              >
                <Building2 className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                <input
                  type="text"
                  placeholder={suppliersLoading ? 'Loading suppliers…' : 'Search supplier…'}
                  value={supplierSearch}
                  onChange={e => {
                    setSupplierSearch(e.target.value);
                    setShowSupplierDropdown(true);
                    if (!e.target.value) {
                      setSelectedSupplierId('');
                      setSelectedSupplier(null);
                    }
                  }}
                  className="flex-1 outline-none text-sm bg-transparent"
                  disabled={suppliersLoading}
                />
                {supplierSearch && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setSupplierSearch('');
                      setSelectedSupplierId('');
                      setSelectedSupplier(null);
                      setHasRun(false);
                    }}
                    className="ml-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <ChevronDown className="w-4 h-4 text-gray-400 ml-1" />
              </div>

              {showSupplierDropdown && filteredSuppliers.length > 0 && (
                <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredSuppliers.slice(0, 50).map(sup => (
                    <button
                      key={sup.id}
                      className="w-full text-left px-4 py-2.5 hover:bg-purple-50 border-b border-gray-100 last:border-0 transition-colors"
                      onClick={() => handleSelectSupplier(sup)}
                    >
                      <p className="text-sm font-medium text-gray-900">{sup.supplierName}</p>
                      {sup.tinNumber && <p className="text-xs text-gray-500">TIN: {sup.tinNumber}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
              <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-purple-500">
                <Calendar className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="flex-1 outline-none text-sm bg-transparent"
                />
              </div>
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
              <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-purple-500">
                <Calendar className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="flex-1 outline-none text-sm bg-transparent"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-3 flex items-center space-x-2 text-red-600 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Opening balance is calculated from all invoices before the selected start date.
            </p>
            <button
              onClick={runStatement}
              disabled={running || !selectedSupplierId}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm"
            >
              {running ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>{running ? 'Generating…' : 'Run Statement'}</span>
            </button>
          </div>
        </div>

        {/* ── Statement Output ─────────────────────────────────── */}
        {hasRun && summary && (
          <div id="statement-print-area" ref={printRef}>

            {/* ══ PRINT-ONLY: Company Header ══════════════════════════════════════ */}
            <div className="print-only" style={{ borderBottom: '2px solid #1f2937', paddingBottom: '5px', marginBottom: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img
                  src="/equity-logo.png"
                  alt="Equity Logo"
                  style={{ width: '36px', height: '36px', objectFit: 'contain', border: '1px solid #d1d5db', flexShrink: 0 }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
                <div>
                  <div style={{ fontWeight: '800', fontSize: '10px', color: '#111827' }}>UNISON TECHNOLOGIES AND INNOVATION LTD</div>
                  <div style={{ fontSize: '9px', fontWeight: '700', color: '#374151' }}>EQUITY SHOPPERS SUPERMARKET &nbsp;·&nbsp; Kyengera, Kampala–Masaka Road, Uganda</div>
                  <div style={{ fontSize: '8px', color: '#2563eb' }}>unisontechnologiesaninnovation@gmail.com · equityshoppers@gmail.com</div>
                </div>
              </div>
            </div>

            {/* ══ PRINT-ONLY: Document Title + Supplier Info + Period ══════════════ */}
            <div className="print-only" style={{ marginBottom: '6px' }}>
              <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', fontWeight: '800', border: '1.5px solid #374151', padding: '2px 16px', letterSpacing: '0.08em' }}>
                  SUPPLIER ACCOUNT STATEMENT
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', border: '1px solid #d1d5db', fontSize: '9px' }}>
                {/* Left: supplier details */}
                <div style={{ padding: '4px 8px', borderRight: '1px solid #d1d5db' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 20px', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '7px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Supplier</div>
                      <div style={{ fontWeight: '800', fontSize: '10px', color: '#111827' }}>{selectedSupplier?.supplierName}</div>
                    </div>
                    {selectedSupplier?.tinNumber && (
                      <div>
                        <div style={{ fontSize: '7px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>TIN</div>
                        <div style={{ fontWeight: '600', fontSize: '9px', color: '#374151' }}>{selectedSupplier.tinNumber}</div>
                      </div>
                    )}
                    {selectedSupplier?.phoneNumbers && selectedSupplier.phoneNumbers.length > 0 && (
                      <div>
                        <div style={{ fontSize: '7px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contact</div>
                        <div style={{ fontWeight: '600', fontSize: '9px', color: '#374151' }}>{selectedSupplier.phoneNumbers.join(' / ')}</div>
                      </div>
                    )}
                    {selectedSupplier?.emailAddress && (
                      <div>
                        <div style={{ fontSize: '7px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</div>
                        <div style={{ fontSize: '9px', color: '#2563eb' }}>{selectedSupplier.emailAddress}</div>
                      </div>
                    )}
                    {selectedSupplier?.address && (
                      <div>
                        <div style={{ fontSize: '7px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Location</div>
                        <div style={{ fontSize: '9px', color: '#374151' }}>{selectedSupplier.address}</div>
                      </div>
                    )}
                  </div>
                </div>
                {/* Right: period */}
                <div style={{ padding: '4px 10px', minWidth: '130px' }}>
                  <div style={{ fontSize: '7px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Statement Period</div>
                  <div style={{ fontWeight: '700', fontSize: '9px', color: '#111827', marginTop: '1px', whiteSpace: 'nowrap' }}>
                    {formatDate(new Date(dateFrom))} — {formatDate(new Date(dateTo))}
                  </div>
                  <div style={{ marginTop: '3px' }}>
                    <div style={{ fontSize: '7px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Printed</div>
                    <div style={{ fontSize: '8px', color: '#6b7280', marginTop: '1px' }}>{formatDate(new Date())}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ══ SCREEN-ONLY: Info header with print button ════════════════════════ */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4 no-print">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Account Statement</h2>
                  <div className="space-y-0.5 text-sm text-gray-600">
                    <p>
                      <span className="font-medium text-gray-800">{selectedSupplier?.supplierName}</span>
                    </p>
                    {selectedSupplier?.tinNumber && <p>TIN: {selectedSupplier.tinNumber}</p>}
                    {selectedSupplier?.address && <p>{selectedSupplier.address}</p>}
                    {selectedSupplier?.emailAddress && <p>{selectedSupplier.emailAddress}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Statement Period</p>
                  <p className="font-semibold text-gray-800">{formatDate(new Date(dateFrom))} — {formatDate(new Date(dateTo))}</p>
                  <p className="text-xs text-gray-400 mt-1">Generated {formatDate(new Date())}</p>
                  <button
                    onClick={handlePrint}
                    className="mt-3 flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm transition-colors ml-auto"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ══ SCREEN-ONLY: Summary Cards ════════════════════════════════════════ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 no-print">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">Opening Balance</p>
                <p className={`text-lg font-bold ${summary.openingBalance > 0 ? 'text-orange-600' : 'text-gray-800'}`}>
                  {formatCurrency(summary.openingBalance)}
                </p>
                <p className="text-xs text-gray-400">Before {formatDate(new Date(dateFrom))}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">Total Invoiced</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(summary.totalInvoiced)}</p>
                <p className="text-xs text-gray-400">{summary.invoiceCount} invoice{summary.invoiceCount !== 1 ? 's' : ''}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">Total Payments</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(summary.totalPaid)}</p>
                <p className="text-xs text-gray-400">{summary.paymentCount} payment{summary.paymentCount !== 1 ? 's' : ''}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">Closing Balance</p>
                <p className={`text-lg font-bold ${summary.closingBalance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {formatCurrency(summary.closingBalance)}
                </p>
                <div className="flex items-center space-x-1 mt-1">
                  {summary.closingBalance > 0 ? (
                    <><AlertTriangle className="w-3 h-3 text-red-500" /><span className="text-xs text-red-500">Amount owed</span></>
                  ) : (
                    <><CheckCircle className="w-3 h-3 text-green-500" /><span className="text-xs text-green-500">Settled</span></>
                  )}
                </div>
              </div>
            </div>

            {/* ══ Ledger Table (screen + print) ════════════════════════════════════ */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {statementLines.length === 0 ? (
                <div className="text-center py-16">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3 no-print" />
                  <p className="text-gray-500 font-medium">No transactions in this period</p>
                  <p className="text-gray-400 text-sm mt-1">Try a wider date range or a different supplier.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Reference</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Description</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Payment Method</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Debit (Invoiced)</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Credit (Paid)</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {/* Opening balance row */}
                      {summary.openingBalance > 0 && (
                        <tr className="bg-orange-50">
                          <td className="py-3 px-4 text-sm text-gray-500">—</td>
                          <td className="py-3 px-4 text-sm text-gray-500">—</td>
                          <td className="py-3 px-4 text-sm font-medium text-orange-700">Opening Balance (brought forward)</td>
                          <td className="py-3 px-4 text-sm text-gray-400">—</td>
                          <td className="py-3 px-4 text-right text-sm text-gray-400">—</td>
                          <td className="py-3 px-4 text-right text-sm text-gray-400">—</td>
                          <td className="py-3 px-4 text-right text-sm font-semibold text-orange-700">
                            {formatCurrency(summary.openingBalance)}
                          </td>
                        </tr>
                      )}

                      {statementLines.map((line, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-gray-50 transition-colors ${line.type === 'invoice' ? '' : 'bg-green-50/40'}`}
                        >
                          <td className="py-3 px-4 text-sm text-gray-700">{formatDate(line.date)}</td>
                          <td className="py-3 px-4 text-sm font-mono text-gray-800">
                            {line.type === 'payment' && line.paymentReference ? (
                              <div>
                                <span className="text-green-700">{line.paymentReference}</span>
                                {line.invoiceRef && (
                                  <div className="text-xs text-gray-400 font-sans">for {line.invoiceRef}</div>
                                )}
                              </div>
                            ) : (
                              line.reference
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700">{line.description}</td>
                          <td className="py-3 px-4 text-sm">
                            {line.type === 'payment' ? (
                              line.paymentMethod ? (
                                <div>
                                  <span className="payment-badge inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {line.paymentMethod}
                                  </span>
                                  {line.paymentDetails && (
                                    <div className="text-xs text-gray-500 mt-0.5">{line.paymentDetails}</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs italic">—</span>
                              )
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-sm">
                            {line.debit > 0 ? (
                              <span className="text-red-600 font-medium">{formatCurrency(line.debit)}</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-sm">
                            {line.credit > 0 ? (
                              <span className="text-green-600 font-medium">{formatCurrency(line.credit)}</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-sm font-semibold">
                            <span className={line.balance > 0 ? 'text-red-700' : 'text-green-700'}>
                              {formatCurrency(line.balance)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    {/* Closing row */}
                    <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                      <tr>
                        <td colSpan={4} className="py-3 px-4 text-sm font-bold text-gray-800">Closing Balance</td>
                        <td className="py-3 px-4 text-right text-sm font-bold text-red-700">
                          {formatCurrency(summary.totalInvoiced)}
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-bold text-green-700">
                          {formatCurrency(summary.totalPaid)}
                        </td>
                        <td className={`py-3 px-4 text-right text-base font-extrabold ${summary.closingBalance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                          {formatCurrency(summary.closingBalance)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* ══ PRINT-ONLY: Account Summary Narrative ═══════════════════════════ */}
            <div className="print-only" style={{ marginTop: '8px', border: '1px solid #d1d5db', padding: '6px 10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: '6px 14px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '7px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Opening Balance</div>
                  <div style={{ fontWeight: '700', fontSize: '10px', color: '#92400e' }}>{formatCurrency(summary.openingBalance)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '7px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Invoiced</div>
                  <div style={{ fontWeight: '700', fontSize: '10px', color: '#b91c1c' }}>{formatCurrency(summary.totalInvoiced)}</div>
                  <div style={{ fontSize: '7px', color: '#9ca3af' }}>{summary.invoiceCount} invoice{summary.invoiceCount !== 1 ? 's' : ''}</div>
                </div>
                <div>
                  <div style={{ fontSize: '7px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Paid</div>
                  <div style={{ fontWeight: '700', fontSize: '10px', color: '#15803d' }}>{formatCurrency(summary.totalPaid)}</div>
                  <div style={{ fontSize: '7px', color: '#9ca3af' }}>{summary.paymentCount} payment{summary.paymentCount !== 1 ? 's' : ''}</div>
                </div>
                <div>
                  <div style={{ fontSize: '7px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Closing Balance</div>
                  <div style={{ fontWeight: '800', fontSize: '11px', color: summary.closingBalance > 0 ? '#b91c1c' : '#15803d' }}>
                    {formatCurrency(summary.closingBalance)}
                  </div>
                  <div style={{ fontSize: '7px', fontWeight: '700', color: summary.closingBalance > 0 ? '#dc2626' : '#16a34a' }}>
                    {summary.closingBalance > 0 ? 'Outstanding' : 'Settled'}
                  </div>
                </div>
                <div style={{ fontSize: '7px', color: '#9ca3af', borderLeft: '1px solid #e5e7eb', paddingLeft: '10px', lineHeight: '1.4' }}>
                  Generated from Equity Shoppers ERP.<br />Verify against source documents.
                </div>
              </div>
            </div>

            {/* SCREEN-ONLY: Footer note */}
            <p className="text-xs text-gray-400 text-center mt-4 no-print">
              This statement is generated from live data. Please verify with original documents.
            </p>
          </div>
        )}

        {/* Empty prompt */}
        {!hasRun && !running && (
          <div className="text-center py-20 text-gray-400">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium text-gray-500">No statement generated yet</p>
            <p className="text-sm mt-1">Select a supplier and date range above, then click <strong>Run Statement</strong>.</p>
          </div>
        )}
      </div>
    </div>
  );
}
