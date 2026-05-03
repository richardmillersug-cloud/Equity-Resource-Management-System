'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Banknote,
  RefreshCw,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Building2,
  FileText,
  X,
  TrendingUp,
  AlertCircle,
  Ban,
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../lib/firebase/config';

// ── Types ────────────────────────────────────────────────────────────────────

interface ChequeRecord {
  id: string;
  chequeNumber: string;
  amount: number;
  balance?: number;
  // schema drift: service writes "issueDate", seed writes "issuedDate"
  issueDate?: any;
  issuedDate?: any;
  dueDate?: any;
  status: 'issued' | 'pending' | 'cleared' | 'bounced' | 'cancelled';
  bankName?: string;
  payeeId?: string;
  payeeName?: string;
  payee?: string;           // fallback label
  invoiceId?: string;
  notes?: string;
  purpose?: string;         // seed-only field
  issuedBy?: string;
  clearedDate?: any;
  createdAt?: any;
  updatedAt?: any;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const toDate = (v: any): Date | null => {
  if (!v) return null;
  try {
    if (v?.toDate) return v.toDate();
    if (v instanceof Date) return v;
    return new Date(v);
  } catch {
    return null;
  }
};

const fmt = (v: any): string => {
  const d = toDate(v);
  return d ? d.toLocaleDateString() : 'N/A';
};

const fmtCurrency = (n?: number) =>
  n != null ? `UGX ${n.toLocaleString()}` : 'UGX 0';

/** Returns the resolved issue date handling both field names */
const getIssueDate = (c: ChequeRecord) => c.issueDate || c.issuedDate;

/** Returns the payee name handling both field names */
const getPayee = (c: ChequeRecord) => c.payeeName || c.payee || 'N/A';

const isOverdue = (c: ChequeRecord): boolean => {
  if (!['issued', 'pending'].includes(c.status)) return false;
  const due = toDate(c.dueDate);
  return due ? due < new Date() : false;
};

// Static Tailwind classes (JIT-safe)
const STATUS_CONFIG: Record<
  string,
  { label: string; badge: string; dot: string }
> = {
  issued:    { label: 'Issued',    badge: 'bg-blue-100 text-blue-800',    dot: 'bg-blue-500'   },
  pending:   { label: 'Pending',   badge: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
  cleared:   { label: 'Cleared',   badge: 'bg-green-100 text-green-800',  dot: 'bg-green-500'  },
  bounced:   { label: 'Bounced',   badge: 'bg-red-100 text-red-800',      dot: 'bg-red-500'    },
  cancelled: { label: 'Cancelled', badge: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400'   },
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ChequesPage() {
  const [cheques, setCheques] = useState<ChequeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const [selectedCheque, setSelectedCheque] = useState<ChequeRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const [actionModal, setActionModal] = useState<{
    type: 'clear' | 'bounce' | 'cancel';
    cheque: ChequeRecord;
  } | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const loadCheques = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'chequeTracker'));
      const data: ChequeRecord[] = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      } as ChequeRecord));

      // Sort: newest issue date first
      data.sort((a, b) => {
        const ta = toDate(getIssueDate(a))?.getTime() ?? 0;
        const tb = toDate(getIssueDate(b))?.getTime() ?? 0;
        return tb - ta;
      });

      setCheques(data);
    } catch (err: any) {
      console.error('Error loading cheques:', err);
      alert(`Failed to load cheques: ${err?.message ?? 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCheques();
  }, [loadCheques]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleUpdateStatus = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      const { type, cheque } = actionModal;
      const newStatus =
        type === 'clear' ? 'cleared' :
        type === 'bounce' ? 'bounced' : 'cancelled';

      const updateData: Record<string, any> = {
        status: newStatus,
        updatedAt: serverTimestamp(),
      };
      if (actionNotes.trim()) updateData.notes = actionNotes.trim();
      if (type === 'clear') updateData.clearedDate = serverTimestamp();

      await updateDoc(doc(db, 'chequeTracker', cheque.id), updateData);

      // Update local state immediately
      setCheques(prev =>
        prev.map(c =>
          c.id === cheque.id
            ? { ...c, status: newStatus as ChequeRecord['status'], notes: actionNotes.trim() || c.notes }
            : c
        )
      );

      setActionModal(null);
      setActionNotes('');
    } catch (err: any) {
      alert(`Action failed: ${err?.message ?? 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const stats = {
    total:     cheques.length,
    active:    cheques.filter(c => ['issued', 'pending'].includes(c.status)).length,
    overdue:   cheques.filter(isOverdue).length,
    cleared:   cheques.filter(c => c.status === 'cleared').length,
    bounced:   cheques.filter(c => c.status === 'bounced').length,
    totalValue: cheques
      .filter(c => ['issued', 'pending'].includes(c.status))
      .reduce((s, c) => s + (c.amount ?? 0), 0),
  };

  const filtered = cheques.filter(c => {
    const matchSearch =
      !search ||
      (c.chequeNumber ?? '').toLowerCase().includes(search.toLowerCase()) ||
      getPayee(c).toLowerCase().includes(search.toLowerCase()) ||
      (c.bankName ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.invoiceId ?? '').toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      statusFilter === 'all' ? true :
      statusFilter === 'active' ? ['issued', 'pending'].includes(c.status) :
      statusFilter === 'overdue' ? isOverdue(c) :
      c.status === statusFilter;

    return matchSearch && matchStatus;
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-lg text-gray-600">Loading cheques...</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 pb-12">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Banknote className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Cheque Tracker</h1>
              <p className="text-sm text-gray-500">Monitor and manage all issued cheques</p>
            </div>
          </div>
          <button
            onClick={loadCheques}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { label: 'Active',       value: stats.active,    icon: Clock,          color: 'text-blue-600',   bg: 'bg-blue-50'   },
            { label: 'Overdue',      value: stats.overdue,   icon: AlertTriangle,  color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Cleared',      value: stats.cleared,   icon: CheckCircle,    color: 'text-green-600',  bg: 'bg-green-50'  },
            { label: 'Active Value', value: fmtCurrency(stats.totalValue), icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl border border-gray-200 p-3 sm:p-4`}>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
                  <p className={`text-lg font-bold ${color} truncate`}>{value}</p>
                </div>
                <Icon className={`w-6 h-6 ${color} flex-shrink-0 ml-2`} />
              </div>
            </div>
          ))}
        </div>

        {/* Overdue alert */}
        {stats.overdue > 0 && (
          <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl p-4 text-orange-800">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              {stats.overdue} cheque{stats.overdue > 1 ? 's are' : ' is'} overdue. Review and take action.
            </p>
            <button
              onClick={() => setStatusFilter('overdue')}
              className="ml-auto text-xs font-semibold underline whitespace-nowrap"
            >
              View overdue
            </button>
          </div>
        )}

        {/* Search + Filter */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by cheque #, payee, bank, or invoice..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active (Issued + Pending)</option>
                <option value="overdue">Overdue</option>
                <option value="issued">Issued</option>
                <option value="pending">Pending</option>
                <option value="cleared">Cleared</option>
                <option value="bounced">Bounced</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Cheque Records</h3>
            <span className="text-sm text-gray-400">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cheque #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Bank</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Issue Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <Banknote className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No cheques found</p>
                      <p className="text-gray-400 text-sm mt-1">
                        {search || statusFilter !== 'all'
                          ? 'Try adjusting your search or filter.'
                          : 'Cheques issued through Payments will appear here.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(cheque => {
                    const overdue = isOverdue(cheque);
                    const cfg = STATUS_CONFIG[cheque.status] ?? STATUS_CONFIG.pending;
                    return (
                      <tr key={cheque.id} className={`hover:bg-gray-50 ${overdue ? 'bg-orange-50 hover:bg-orange-100' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {overdue && <AlertCircle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />}
                            <span className="text-sm font-mono font-medium text-gray-900">
                              {cheque.chequeNumber || '—'}
                            </span>
                          </div>
                          {cheque.invoiceId && (
                            <div className="text-xs text-gray-400 mt-0.5">INV: {cheque.invoiceId.slice(-8)}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{getPayee(cheque)}</div>
                          {cheque.purpose && <div className="text-xs text-gray-400 truncate max-w-[160px]">{cheque.purpose}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
                          {cheque.bankName || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-right text-gray-900">
                          {fmtCurrency(cheque.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                          {fmt(getIssueDate(cheque))}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={overdue ? 'font-semibold text-orange-700' : 'text-gray-600'}>
                            {fmt(cheque.dueDate)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full ${cfg.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setSelectedCheque(cheque); setShowDetail(true); }}
                              className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600 hover:text-indigo-800"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {['issued', 'pending'].includes(cheque.status) && (
                              <>
                                <button
                                  onClick={() => { setActionModal({ type: 'clear', cheque }); setActionNotes(''); }}
                                  className="p-1.5 rounded hover:bg-green-50 text-green-600 hover:text-green-800"
                                  title="Mark as Cleared"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => { setActionModal({ type: 'bounce', cheque }); setActionNotes(''); }}
                                  className="p-1.5 rounded hover:bg-red-50 text-red-600 hover:text-red-800"
                                  title="Mark as Bounced"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => { setActionModal({ type: 'cancel', cheque }); setActionNotes(''); }}
                                  className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                                  title="Cancel Cheque"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Detail Modal ─────────────────────────────────────────────────────── */}
      {showDetail && selectedCheque && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8">
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-bold font-mono text-gray-900">
                    #{selectedCheque.chequeNumber || '—'}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    (STATUS_CONFIG[selectedCheque.status] ?? STATUS_CONFIG.pending).badge
                  }`}>
                    {(STATUS_CONFIG[selectedCheque.status] ?? STATUS_CONFIG.pending).label}
                  </span>
                  {isOverdue(selectedCheque) && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                      Overdue
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{getPayee(selectedCheque)}</p>
              </div>
              <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Amount highlight */}
              <div className="bg-indigo-50 rounded-xl p-4 text-center">
                <p className="text-xs text-indigo-600 mb-1">Cheque Amount</p>
                <p className="text-3xl font-bold text-indigo-800">{fmtCurrency(selectedCheque.amount)}</p>
                {selectedCheque.balance != null && selectedCheque.balance !== selectedCheque.amount && (
                  <p className="text-xs text-indigo-600 mt-1">Balance: {fmtCurrency(selectedCheque.balance)}</p>
                )}
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Bank', value: selectedCheque.bankName },
                  { label: 'Payee', value: getPayee(selectedCheque) },
                  { label: 'Issue Date', value: fmt(getIssueDate(selectedCheque)) },
                  { label: 'Due Date', value: fmt(selectedCheque.dueDate) },
                  { label: 'Invoice Ref', value: selectedCheque.invoiceId || '—' },
                  { label: 'Issued By', value: selectedCheque.issuedBy || '—' },
                  { label: 'Cleared Date', value: selectedCheque.clearedDate ? fmt(selectedCheque.clearedDate) : '—' },
                  { label: 'Last Updated', value: fmt(selectedCheque.updatedAt) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                    <p className="font-medium text-gray-900 truncate">{value || '—'}</p>
                  </div>
                ))}
              </div>

              {(selectedCheque.purpose || selectedCheque.notes) && (
                <div className="space-y-2">
                  {selectedCheque.purpose && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Purpose</p>
                      <p className="text-sm text-gray-700 bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                        {selectedCheque.purpose}
                      </p>
                    </div>
                  )}
                  {selectedCheque.notes && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">Notes</p>
                      <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3">
                        {selectedCheque.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              {['issued', 'pending'].includes(selectedCheque.status) && (
                <>
                  <button
                    onClick={() => {
                      setShowDetail(false);
                      setActionModal({ type: 'clear', cheque: selectedCheque });
                      setActionNotes('');
                    }}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> Mark Cleared
                  </button>
                  <button
                    onClick={() => {
                      setShowDetail(false);
                      setActionModal({ type: 'bounce', cheque: selectedCheque });
                      setActionNotes('');
                    }}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" /> Mark Bounced
                  </button>
                </>
              )}
              <button
                onClick={() => setShowDetail(false)}
                className="px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Action Confirmation Modal ────────────────────────────────────────── */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-start justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {actionModal.type === 'clear' && <CheckCircle className="w-5 h-5 text-green-600" />}
                {actionModal.type === 'bounce' && <XCircle className="w-5 h-5 text-red-600" />}
                {actionModal.type === 'cancel' && <Ban className="w-5 h-5 text-gray-500" />}
                <h3 className="font-semibold text-gray-900">
                  {actionModal.type === 'clear'  && 'Mark as Cleared'}
                  {actionModal.type === 'bounce' && 'Mark as Bounced'}
                  {actionModal.type === 'cancel' && 'Cancel Cheque'}
                </h3>
              </div>
              <button onClick={() => setActionModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className={`rounded-lg p-3 text-sm ${
                actionModal.type === 'clear'  ? 'bg-green-50 text-green-800' :
                actionModal.type === 'bounce' ? 'bg-red-50 text-red-800' :
                'bg-gray-50 text-gray-700'
              }`}>
                <p className="font-medium">Cheque #{actionModal.cheque.chequeNumber}</p>
                <p>{getPayee(actionModal.cheque)} — {fmtCurrency(actionModal.cheque.amount)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {actionModal.type === 'bounce' ? 'Bounce Reason *' : 'Notes (optional)'}
                </label>
                <textarea
                  value={actionNotes}
                  onChange={e => setActionNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder={
                    actionModal.type === 'bounce' ? 'Reason for bouncing...' :
                    actionModal.type === 'cancel' ? 'Reason for cancellation...' :
                    'Optional notes...'
                  }
                  autoFocus
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
              <button
                onClick={() => setActionModal(null)}
                disabled={actionLoading}
                className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={actionLoading || (actionModal.type === 'bounce' && !actionNotes.trim())}
                className={`px-4 py-2 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 ${
                  actionModal.type === 'clear'  ? 'bg-green-600 hover:bg-green-700' :
                  actionModal.type === 'bounce' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {actionModal.type === 'clear'  && 'Confirm Cleared'}
                {actionModal.type === 'bounce' && 'Confirm Bounced'}
                {actionModal.type === 'cancel' && 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
