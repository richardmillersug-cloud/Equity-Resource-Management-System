'use client';

import React, { useState, useEffect } from 'react';
import { AccountantQueries } from '@/lib/firebase/role-based-queries';
import { authService } from '@/lib/firebase/auth';
import { CashCloseService } from '@/lib/firebase/firestore-service';
import { SimpleCashCloseService } from '@/lib/firebase/firestore-service-simple';
// Auto-allocation service removed per user request
import { 
  Calculator, 
  DollarSign, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  RefreshCw,
  FileText,
  Calendar,
  User,
  Building,
  CreditCard,
  Smartphone,
  Receipt,
  Wallet,
  Users,
  PieChart,
  Activity,
  ShoppingCart,
  Target,
  Banknote,
  Sun,
  Moon,
  Download,
  PrinterIcon,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import ComprehensiveCashCloseForm from '@/components/accountant/ComprehensiveCashCloseForm';

interface CashCloseRecord {
  id: string;
  date: string;
  totalRevenue: number;
  taxAmount: number;
  profitAmount: number;
  specialFunds: number;
  purchasingManager: number;
  totalShortage: number;
  totalExcess: number;
  totalExpenses: number;
  totalNetworkPayments: number;
  totalTillExpenses: number;
  networkShiftDetails: any[];
  status: string;
  createdBy: string;
  shifts: any[];
  // New fields for timestamp tracking
  createdAt?: Date;
  updatedAt?: Date;
  entryDelay?: number; // Days between business date and entry date
  isLateEntry?: boolean; // Flag for entries made > 1 day after business date
  expenseBreakdown?: {
    general: number;
    ura: number;
    emergencies: number;
    dayToDay: number;
  };
  purchasingManagerBreakdown?: {
    allocated: number;
    pending: number;
    disbursed: number;
  };
}

export default function CashClosePage() {
  const [cashCloseRecords, setCashCloseRecords] = useState<CashCloseRecord[]>([]);
  // allocationsData removed — auto-allocation service was removed per user request
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCashCloseForm, setShowCashCloseForm] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [todaysRecord, setTodaysRecord] = useState<CashCloseRecord | null>(null);
  
  // Filter states
  const [filteredRecords, setFilteredRecords] = useState<CashCloseRecord[]>([]);
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [entryTimingFilter, setEntryTimingFilter] = useState<string>('all'); // New filter for entry timing
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [summaryMode, setSummaryMode] = useState<'displayed' | 'filtered'>('displayed');
  const [groupByDate, setGroupByDate] = useState<boolean>(false); // New state for date grouping
  
  // Sorting states — default to business date descending
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Summary statistics
  const [stats, setStats] = useState({
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    avgDailyRevenue: 0,
    totalShortage: 0,
    totalExcess: 0
  });

  // Get records for summary calculation
  const getSummaryRecords = () => {
    if (summaryMode === 'filtered') {
      return filteredRecords;
    }
    return rowsPerPage === -1 ? filteredRecords : filteredRecords.slice(0, rowsPerPage);
  };

  // Filter logic
  const applyFilters = () => {
    let filtered = [...cashCloseRecords];

    // Date filter - Custom date range takes priority
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      // Set to end of day for 'to' date
      to.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= from && recordDate <= to;
      });
    } else if (fromDate) {
      const from = new Date(fromDate);
      filtered = filtered.filter(record => new Date(record.date) >= from);
    } else if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(record => new Date(record.date) <= to);
    } else if (dateFilter !== 'all') {
      // Predefined date filters
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (dateFilter) {
        case 'today':
          filtered = filtered.filter(record => {
            const recordDate = new Date(record.date);
            const recordDateOnly = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
            return recordDateOnly.getTime() === today.getTime();
          });
          break;
        case 'yesterday':
          const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
          filtered = filtered.filter(record => {
            const recordDate = new Date(record.date);
            const recordDateOnly = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
            return recordDateOnly.getTime() === yesterday.getTime();
          });
          break;
        case 'last7days':
          const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(record => new Date(record.date) >= last7Days);
          break;
        case 'last30days':
          const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(record => new Date(record.date) >= last30Days);
          break;
      }
    }

    // Shift filter
    if (shiftFilter !== 'all') {
      filtered = filtered.filter(record => 
        record.shifts?.some(shift => shift.shift === shiftFilter)
      );
    }

    // Entry timing filter
    if (entryTimingFilter !== 'all') {
      switch (entryTimingFilter) {
        case 'same_day':
          filtered = filtered.filter(record => !record.isLateEntry);
          break;
        case 'late_entry':
          filtered = filtered.filter(record => record.isLateEntry);
          break;
        case 'very_late':
          filtered = filtered.filter(record => record.entryDelay && record.entryDelay > 7);
          break;
      }
    }

    setFilteredRecords(filtered);
  };

  // Export functionality
  const exportToCSV = () => {
    const summaryRecords = getSummaryRecords();
    const headers = [
      'Business Date', 'Entry Date', 'Entry Time', 'Created By',
      'Entry Delay (Days)', 'Late Entry',
      'Revenue (UGX)', 'Tax (UGX)', 'Gross Profit (UGX)',
      'Expenses (UGX)', 'Network Payments (UGX)', 'PM Fund (UGX)',
      'Tills', 'Day Shifts', 'Night Shifts',
      'Variance (UGX)', 'Status'
    ];

    const csvData = filteredRecords.map(record => [
      new Date(record.date + 'T00:00:00').toLocaleDateString(),
      record.createdAt?.toLocaleDateString() || 'Unknown',
      record.createdAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Unknown',
      record.createdBy || 'Unknown',
      record.entryDelay || 0,
      record.isLateEntry ? 'Yes' : 'No',
      record.totalRevenue,
      record.taxAmount,
      record.profitAmount,
      record.totalExpenses || 0,
      record.totalNetworkPayments || 0,
      record.purchasingManager || 0,
      record.shifts?.reduce((total: number, shift: any) => total + (shift.tills?.length || 0), 0) || 0,
      record.shifts?.filter((s: any) => s.shift === 'day').length || 0,
      record.shifts?.filter((s: any) => s.shift === 'night').length || 0,
      record.totalExcess > 0 ? record.totalExcess : record.totalShortage > 0 ? -record.totalShortage : 0,
      record.status
    ]);

    const summaryData = [
      'TOTALS', '', '', '',
      '', '',
      summaryRecords.reduce((sum, r) => sum + r.totalRevenue, 0),
      summaryRecords.reduce((sum, r) => sum + r.taxAmount, 0),
      summaryRecords.reduce((sum, r) => sum + r.profitAmount, 0),
      summaryRecords.reduce((sum, r) => sum + (r.totalExpenses || 0), 0),
      summaryRecords.reduce((sum, r) => sum + (r.totalNetworkPayments || 0), 0),
      summaryRecords.reduce((sum, r) => sum + (r.purchasingManager || 0), 0),
      summaryRecords.reduce((sum, r) => sum + (r.shifts?.reduce((t: number, s: any) => t + (s.tills?.length || 0), 0) || 0), 0),
      '', '',
      summaryRecords.reduce((sum, r) => sum + (r.totalExcess - r.totalShortage), 0),
      `${summaryRecords.length} records`
    ];

    const csvContent = [headers, ...csvData, [], summaryData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cash-close-records-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const summaryRecords = getSummaryRecords();
    const printWindow = window.open('', '_blank');
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cash Close Records — Equity Retail System</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; color: #1e293b; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            p { margin: 2px 0; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { background-color: #1e40af; color: white; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
            td { border-bottom: 1px solid #e2e8f0; padding: 7px 10px; }
            tr:nth-child(even) { background-color: #f8fafc; }
            tr.late { border-left: 3px solid #f59e0b; }
            .summary { margin: 16px 0; padding: 12px 16px; background: #eff6ff; border-radius: 6px; border: 1px solid #bfdbfe; }
            .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 10px; }
            .summary-item { text-align: center; }
            .summary-label { font-size: 10px; color: #64748b; text-transform: uppercase; }
            .summary-value { font-size: 15px; font-weight: bold; color: #1e40af; margin-top: 3px; }
            .badge { display: inline-block; padding: 2px 7px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
            .badge-completed { background: #dcfce7; color: #166534; }
            .badge-pending { background: #fef3c7; color: #92400e; }
            .badge-error { background: #fee2e2; color: #991b1b; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          <h1>Cash Close Records</h1>
          <p>Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Records: ${summaryRecords.length} of ${filteredRecords.length} filtered</p>

          <div class="summary">
            <strong>Summary Totals — ${summaryRecords.length} records</strong>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">Total Revenue</div>
                <div class="summary-value">UGX ${summaryRecords.reduce((sum, r) => sum + r.totalRevenue, 0).toLocaleString()}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Gross Profit</div>
                <div class="summary-value">UGX ${summaryRecords.reduce((sum, r) => sum + r.profitAmount, 0).toLocaleString()}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Total Expenses</div>
                <div class="summary-value">UGX ${summaryRecords.reduce((sum, r) => sum + (r.totalExpenses || 0), 0).toLocaleString()}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Network Payments</div>
                <div class="summary-value">UGX ${summaryRecords.reduce((sum, r) => sum + (r.totalNetworkPayments || 0), 0).toLocaleString()}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">PM Fund Total</div>
                <div class="summary-value">UGX ${summaryRecords.reduce((sum, r) => sum + (r.purchasingManager || 0), 0).toLocaleString()}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Net Variance</div>
                <div class="summary-value">UGX ${summaryRecords.reduce((sum, r) => sum + (r.totalExcess - r.totalShortage), 0).toLocaleString()}</div>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Business Date</th>
                <th>Created By</th>
                <th class="text-right">Revenue</th>
                <th class="text-right">Tax</th>
                <th class="text-right">Gross Profit</th>
                <th class="text-right">Expenses</th>
                <th class="text-right">Network</th>
                <th class="text-right">PM Fund</th>
                <th class="text-right">Variance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRecords.map(record => `
                <tr${record.isLateEntry ? ' class="late"' : ''}>
                  <td>${new Date(record.date + 'T00:00:00').toLocaleDateString('en-UG', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}${record.isLateEntry ? ' ⚠ Late' : ''}</td>
                  <td>${record.createdBy || 'Unknown'}</td>
                  <td class="text-right">UGX ${record.totalRevenue.toLocaleString()}</td>
                  <td class="text-right">UGX ${record.taxAmount.toLocaleString()}</td>
                  <td class="text-right">UGX ${record.profitAmount.toLocaleString()}</td>
                  <td class="text-right">UGX ${(record.totalExpenses || 0).toLocaleString()}</td>
                  <td class="text-right">UGX ${(record.totalNetworkPayments || 0).toLocaleString()}</td>
                  <td class="text-right">UGX ${(record.purchasingManager || 0).toLocaleString()}</td>
                  <td class="text-right">${record.totalExcess > 0 ? `+UGX ${record.totalExcess.toLocaleString()}` : record.totalShortage > 0 ? `-UGX ${record.totalShortage.toLocaleString()}` : 'Balanced'}</td>
                  <td><span class="badge badge-${record.status}">${record.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow?.document.write(htmlContent);
    printWindow?.document.close();
    printWindow?.print();
  };

  useEffect(() => {
    loadCashCloseData();
    loadCurrentUser();
  }, []);

  // Sorting function
  const sortRecords = (records: CashCloseRecord[], column: string, direction: 'asc' | 'desc') => {
    return [...records].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (column) {
        case 'createdAt':
          aValue = a.createdAt?.getTime() || 0;
          bValue = b.createdAt?.getTime() || 0;
          break;
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'totalRevenue':
          aValue = a.totalRevenue || 0;
          bValue = b.totalRevenue || 0;
          break;
        case 'taxAmount':
          aValue = a.taxAmount || 0;
          bValue = b.taxAmount || 0;
          break;
        case 'profitAmount':
          aValue = a.profitAmount || 0;
          bValue = b.profitAmount || 0;
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'createdBy':
          aValue = a.createdBy || '';
          bValue = b.createdBy || '';
          break;
        default:
          aValue = 0;
          bValue = 0;
      }
      
      if (direction === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  };

  // Handle column header click for sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to desc
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Apply filters when filter states or records change
  useEffect(() => {
    applyFilters();
  }, [cashCloseRecords, dateFilter, fromDate, toDate, shiftFilter, entryTimingFilter]);

  // Apply sorting when sort states change
  useEffect(() => {
    const sorted = sortRecords(filteredRecords, sortColumn, sortDirection);
    if (JSON.stringify(sorted) !== JSON.stringify(filteredRecords)) {
      setFilteredRecords(sorted);
    }
  }, [sortColumn, sortDirection]);

  // Initialize filtered records when cash close records load
  useEffect(() => {
    const initialRecords = sortRecords(cashCloseRecords, sortColumn, sortDirection);
    setFilteredRecords(initialRecords);
  }, [cashCloseRecords]);

  useEffect(() => {
    calculateStats(cashCloseRecords);
  }, [cashCloseRecords]);

  // Sortable Header Component
  const SortableHeader = ({ column, children, className = "" }: { 
    column: string; 
    children: React.ReactNode; 
    className?: string;
  }) => (
    <th 
      className={`cursor-pointer hover:bg-gray-100 transition-colors ${className}`}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center justify-between">
        <span>{children}</span>
        <div className="flex flex-col ml-1">
          <ChevronUp 
            className={`h-3 w-3 ${sortColumn === column && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} 
          />
          <ChevronDown 
            className={`h-3 w-3 -mt-1 ${sortColumn === column && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} 
          />
        </div>
      </div>
    </th>
  );

  const loadCurrentUser = () => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
  };

  const loadCashCloseData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Reset stats to prevent stale data
      setStats({
        todayRevenue: 0,
        weekRevenue: 0,
        monthRevenue: 0,
        avgDailyRevenue: 0,
        totalShortage: 0,
        totalExcess: 0
      });
      setTodaysRecord(null);

      // Load cash closes directly from cashCloses collection
      let cashCloses: any[] = [];
      
      // Try simple service first to avoid index issues
      try {
        const simpleCashCloseService = new SimpleCashCloseService();
        cashCloses = await simpleCashCloseService.getAllCashClosesSimple();
        console.log('✅ Cash closes loaded with simple service:', cashCloses?.length || 0);
      } catch (simpleError) {
        console.warn('⚠️ Simple service failed, trying regular service...', simpleError);
        
        // Fallback to regular service
        const cashCloseService = new CashCloseService();
        const currentUser = authService.getCurrentUser();
        
        if (currentUser?.employee?.branchId) {
          cashCloses = await cashCloseService.getBranchCashCloses(currentUser.employee.branchId);
        } else {
          cashCloses = await cashCloseService.getAll();
        }
        console.log('✅ Cash closes loaded with regular service:', cashCloses?.length || 0);
      }

      // ─── Robust date parser ────────────────────────────────────────────────
      // Handles: JS Date | Firestore Timestamp (.toDate()) |
      //          plain { seconds, nanoseconds } map | ISO/date strings
      const parseToDate = (v: any): Date | null => {
        if (!v) return null;
        if (v instanceof Date)               return isNaN(v.getTime()) ? null : v;
        if (typeof v?.toDate === 'function') { const d = v.toDate(); return isNaN(d.getTime()) ? null : d; }
        if (typeof v?.seconds === 'number')  { const d = new Date(v.seconds * 1000); return isNaN(d.getTime()) ? null : d; }
        if (typeof v === 'string' && v.trim()) { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
        return null;
      };

      const parseDateStr = (v: any): string => {
        const d = parseToDate(v);
        return d ? d.toISOString().split('T')[0] : '';
      };
      // ──────────────────────────────────────────────────────────────────────
      
      // Transform cash closes to match expected format with comprehensive financial data
      const cashCloseRecords = cashCloses.map(cashClose => {
        // ── Resolve business date — try every possible field name ──
        const businessDateObj =
          parseToDate(cashClose.cashCloseDate) ||
          parseToDate(cashClose.businessDate) ||
          parseToDate(cashClose.date) ||
          parseToDate(cashClose.createdAt); // last resort: use entry date

        const businessDateStr = businessDateObj
          ? businessDateObj.toISOString().split('T')[0]
          : '';

        // ── Resolve entry date ──
        const entryDateObj = parseToDate(cashClose.createdAt) || new Date();

        // Calculate delay in days between business date and entry date
        const entryDelay = businessDateObj
          ? Math.floor((entryDateObj.getTime() - businessDateObj.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        const isLateEntry = entryDelay > 1;

        // Calculate expense breakdown from shifts data
        const expenseBreakdown = { general: 0, ura: 0, emergencies: 0, dayToDay: 0 };

        // PM allocation amount comes directly from the record field
        const purchasingManagerBreakdown = {
          allocated: cashClose.purchasingManager || 0,
          pending: 0,
          disbursed: cashClose.purchasingManager || 0
        };

        // Calculate network shift details
        const networkShiftDetails = (cashClose.shifts || []).map((shift: any) => ({
          shift: shift.shift,
          mobilePayments: shift.tills?.reduce((sum: number, till: any) => {
            const mobilePayments = till.networkPayments?.filter((p: any) => p.paymentMethod === 'mobile') || [];
            return sum + mobilePayments.reduce((tSum: number, payment: any) => tSum + (payment.amount || 0), 0);
          }, 0) || 0,
          cardPayments: shift.tills?.reduce((sum: number, till: any) => {
            const cardPayments = till.networkPayments?.filter((p: any) => p.paymentMethod === 'visa_machine') || [];
            return sum + cardPayments.reduce((tSum: number, payment: any) => tSum + (payment.amount || 0), 0);
          }, 0) || 0
        }));
        
        // Calculate expense breakdown from till expenses
        if (cashClose.shifts) {
          cashClose.shifts.forEach((shift: any) => {
            if (shift.tills) {
              shift.tills.forEach((till: any) => {
                if (till.expenseDetails) {
                  till.expenseDetails.forEach((expense: any) => {
                    switch (expense.expenseType) {
                      case 'GENERAL':     expenseBreakdown.general    += expense.amount || 0; break;
                      case 'URA':         expenseBreakdown.ura         += expense.amount || 0; break;
                      case 'EMERGENCIES': expenseBreakdown.emergencies += expense.amount || 0; break;
                      case 'DAY_TO_DAY':  expenseBreakdown.dayToDay    += expense.amount || 0; break;
                    }
                  });
                }
              });
            }
          });
        }
        
        return {
          id: cashClose.id,
          date: businessDateStr,
          totalRevenue: cashClose.totalRevenue || 0,
          taxAmount: cashClose.taxAmount || 0,
          profitAmount: cashClose.profitAmount || 0,
          specialFunds: cashClose.specialFunds || 0,
          purchasingManager: cashClose.purchasingManager || 0,
          totalShortage: cashClose.totalShortage || 0,
          totalExcess: cashClose.totalExcess || 0,
          totalExpenses: cashClose.totalExpenses || 0,
          totalNetworkPayments: cashClose.totalNetworkPayments || 0,
          totalTillExpenses: (cashClose.shifts || []).reduce((sum: number, shift: any) => {
            return sum + (shift.tills || []).reduce((tillSum: number, till: any) => tillSum + (till.expenses || 0), 0);
          }, 0),
          status: cashClose.status || 'completed',
          createdBy: cashClose.createdBy || 'Unknown',
          shifts: cashClose.shifts || [],
          createdAt: new Date(entryDateObj.getTime()),
          updatedAt: parseToDate(cashClose.updatedAt) || new Date(entryDateObj.getTime()),
          entryDelay,
          isLateEntry,
          expenseBreakdown,
          purchasingManagerBreakdown,
          networkShiftDetails
        };
      })
        .sort((a, b) => {
          // Records with valid dates sort by date desc; undated records go to end
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return b.date.localeCompare(a.date);
        });

      console.log('🔍 Setting cash close records. Sample dates:', cashCloseRecords.length > 0 ? {
        id: cashCloseRecords[0].id,
        date: cashCloseRecords[0].date,
        createdAt: cashCloseRecords[0].createdAt,
        entryDelay: cashCloseRecords[0].entryDelay
      } : 'No records');
      
      setCashCloseRecords(cashCloseRecords);

      // Allocation data loading removed — auto-allocation service was removed per user request
      // PM allocation amounts are read directly from each record's purchasingManager field

      // Check if there's a record for today
      const today = new Date().toISOString().split('T')[0];
      const todayRecord = cashCloseRecords.find(record => record.date === today);
      setTodaysRecord(todayRecord || null);
      
      console.log('🗓️ Today check:', {
        today,
        todayRecord: todayRecord ? 'Found' : 'Not found',
        totalRecords: cashCloseRecords.length,
        recordDates: cashCloseRecords.map(r => r.date).slice(0, 5) // First 5 dates for debugging
      });

      // Calculate statistics
      calculateStats(cashCloseRecords);

    } catch (err: any) {
      console.error('Error loading cash close data:', err);
      setError(err.message || 'Failed to load cash close data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (records: CashCloseRecord[]) => {
    const today = new Date().toISOString().split('T')[0];

    // Build date strings for boundaries
    const now = new Date();
    const weekAgo  = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).toISOString().split('T')[0];
    const monthAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29).toISOString().split('T')[0];

    // Only use records that have a valid resolved date (not empty string)
    const datedRecords = records.filter(r => r.date && r.date.length === 10);

    const todayRecords = datedRecords.filter(r => r.date === today);
    const todayRevenue = todayRecords.reduce((sum, r) => sum + r.totalRevenue, 0);

    const weekRecords = datedRecords.filter(r => r.date >= weekAgo && r.date <= today);
    const weekRevenue = weekRecords.reduce((sum, r) => sum + r.totalRevenue, 0);

    const monthRecords = datedRecords.filter(r => r.date >= monthAgo && r.date <= today);
    const monthRevenue = monthRecords.reduce((sum, r) => sum + r.totalRevenue, 0);

    // Average across unique business days in the month window
    const uniqueDays = new Set(monthRecords.map(r => r.date)).size;
    const avgDailyRevenue = uniqueDays > 0 ? monthRevenue / uniqueDays : 0;

    const totalShortage = datedRecords.reduce((sum, r) => sum + r.totalShortage, 0);
    const totalExcess   = datedRecords.reduce((sum, r) => sum + r.totalExcess,   0);

    console.log('📊 Stats calculated:', {
      today, weekAgo, monthAgo,
      dated: datedRecords.length,
      todayRecords: todayRecords.length, todayRevenue,
      weekRecords: weekRecords.length,  weekRevenue,
      monthRecords: monthRecords.length, monthRevenue,
      uniqueDays, avgDailyRevenue
    });

    setStats({
      todayRevenue,
      weekRevenue,
      monthRevenue,
      avgDailyRevenue,
      totalShortage,
      totalExcess
    });
  };

  const handleCashCloseSubmit = async () => {
    await loadCashCloseData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-base font-semibold text-gray-700">Loading Cash Close Data</p>
          <p className="text-sm text-gray-400">Fetching records from the database…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 sm:p-8 shadow-xl">
        <div className="absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-indigo-300/20 blur-2xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-blue-100">Accountant Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Cash Close Management</h1>
            <p className="text-blue-100 mt-1.5 text-sm">
              {todaysRecord
                ? "Today's cash close is complete — financial data is current"
                : "No cash close for today — metrics will reflect 0 until one is created"}
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <div className={`flex items-center gap-1.5 border rounded-lg px-3 py-1.5 ${todaysRecord ? 'bg-white/15 border-white/25' : 'bg-amber-400/20 border-amber-300/40'}`}>
                <div className={`w-2 h-2 rounded-full ${todaysRecord ? 'bg-emerald-300' : 'bg-amber-300'}`} />
                <span className={`text-xs font-medium ${todaysRecord ? 'text-white' : 'text-amber-100'}`}>
                  {todaysRecord ? `Today complete · ${new Date().toLocaleDateString()}` : `Pending · ${new Date().toLocaleDateString()}`}
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-200" />
                <span className="text-xs text-blue-100">{cashCloseRecords.length} total records</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 self-start sm:self-auto">
            <button
              onClick={() => { setLoading(true); loadCashCloseData(); }}
              disabled={loading}
              className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/25 rounded-xl px-4 py-2.5 text-white text-sm font-medium transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowCashCloseForm(true)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all shadow-sm ${
                todaysRecord
                  ? 'bg-white text-blue-700 hover:bg-blue-50'
                  : 'bg-amber-400 hover:bg-amber-300 text-amber-900'
              }`}
            >
              <Plus className="w-4 h-4" />
              {todaysRecord ? 'New Cash Close' : "Create Today's"}
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-5 py-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-800">Error loading data</p>
            <p className="text-sm text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Current Day Status Banner */}
      {!todaysRecord && (
        <div className="flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-900 text-sm">No Cash Close for Today</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} — financial metrics will show 0 until today's close is recorded.
            </p>
          </div>
          <button
            onClick={() => setShowCashCloseForm(true)}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            Create Now
          </button>
        </div>
      )}

      {/* Late Entry Alert Banner */}
      {cashCloseRecords.some(record => record.isLateEntry) && (
        <div className="flex items-center gap-4 rounded-xl border border-orange-200 bg-orange-50 px-5 py-4">
          <div className="w-10 h-10 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-orange-900 text-sm">Late Data Entries Detected</p>
            <p className="text-xs text-orange-700 mt-0.5">
              {cashCloseRecords.filter(r => r.isLateEntry).length} of {cashCloseRecords.length} entries were recorded after the business date. This may indicate operational delays.
            </p>
          </div>
          <button
            onClick={() => { setEntryTimingFilter('late_entry'); setDateFilter('all'); setFromDate(''); setToDate(''); setShiftFilter('all'); }}
            className="shrink-0 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            View Late Entries
          </button>
        </div>
      )}



      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Today's Revenue",
            value: formatCurrency(stats.todayRevenue),
            sub: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            note: !todaysRecord ? 'Create a cash close to record revenue' : null,
            icon: <DollarSign className="w-5 h-5" />,
            iconBg: todaysRecord ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-amber-50 text-amber-600 border-amber-200',
            valueColor: todaysRecord ? 'text-slate-800' : 'text-amber-600',
            border: todaysRecord ? 'border-gray-200' : 'border-amber-200',
          },
          {
            label: 'Week Revenue',
            value: formatCurrency(stats.weekRevenue),
            sub: 'Last 7 days',
            note: null,
            icon: <TrendingUp className="w-5 h-5" />,
            iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
            valueColor: 'text-slate-800',
            border: 'border-gray-200',
          },
          {
            label: 'Month Revenue',
            value: formatCurrency(stats.monthRevenue),
            sub: 'Last 30 days',
            note: null,
            icon: <Calculator className="w-5 h-5" />,
            iconBg: 'bg-violet-50 text-violet-600 border-violet-200',
            valueColor: 'text-slate-800',
            border: 'border-gray-200',
          },
          {
            label: 'Daily Average',
            value: formatCurrency(stats.avgDailyRevenue),
            sub: '30-day avg',
            note: null,
            icon: <Target className="w-5 h-5" />,
            iconBg: 'bg-orange-50 text-orange-600 border-orange-200',
            valueColor: 'text-slate-800',
            border: 'border-gray-200',
          },
        ].map((card, i) => (
          <div key={i} className={`bg-white rounded-2xl border ${card.border} p-5 shadow-sm`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${card.iconBg}`}>
                {card.icon}
              </div>
              <span className="text-xs font-medium text-slate-400">{card.sub}</span>
            </div>
            <p className="text-xs font-medium text-slate-500 mb-1">{card.label}</p>
            <p className={`text-xl font-bold ${card.valueColor} leading-tight`}>{card.value}</p>
            {card.note && <p className="text-xs text-amber-600 mt-1.5">{card.note}</p>}
          </div>
        ))}
      </div>

      {/* Financial Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Network Shift Details */}
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 to-indigo-700 px-6 py-5">
            <div className="absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }} />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight">Network Payments</h3>
                  <p className="text-xs text-blue-200 mt-0.5">Electronic payments across all shifts</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Payment type KPIs */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: 'Mobile Money',
                  sub: 'MTN · Airtel',
                  icon: <Smartphone className="w-4 h-4 text-blue-500" />,
                  value: formatCurrency(cashCloseRecords.reduce((sum, r) =>
                    sum + (r.networkShiftDetails?.reduce((s: number, sh: any) => s + (sh.mobilePayments || 0), 0) || 0), 0)),
                  bg: 'bg-blue-50', border: 'border-blue-200', color: 'text-blue-700',
                },
                {
                  label: 'Card Payments',
                  sub: 'Visa · Mastercard',
                  icon: <CreditCard className="w-4 h-4 text-emerald-500" />,
                  value: formatCurrency(cashCloseRecords.reduce((sum, r) =>
                    sum + (r.networkShiftDetails?.reduce((s: number, sh: any) => s + (sh.cardPayments || 0), 0) || 0), 0)),
                  bg: 'bg-emerald-50', border: 'border-emerald-200', color: 'text-emerald-700',
                },
                {
                  label: 'Total Network',
                  sub: 'All electronic',
                  icon: <PieChart className="w-4 h-4 text-violet-500" />,
                  value: formatCurrency(cashCloseRecords.reduce((sum, r) => sum + (r.totalNetworkPayments || 0), 0)),
                  bg: 'bg-violet-50', border: 'border-violet-200', color: 'text-violet-700',
                },
              ].map((kpi, i) => (
                <div key={i} className={`rounded-xl ${kpi.bg} border ${kpi.border} p-3`}>
                  <div className="flex items-center gap-1.5 mb-2">{kpi.icon}<span className="text-xs font-medium text-gray-600">{kpi.label}</span></div>
                  <p className={`text-sm font-bold ${kpi.color}`}>{kpi.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
                </div>
              ))}
            </div>

            {/* Shift breakdown table */}
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-slate-50 border-b border-gray-100 px-4 py-2.5 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Shift Breakdown</span>
              </div>
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Shift', 'Tills', 'Cash', 'Network'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { label: 'Day', dot: 'bg-amber-400', shift: 'day' },
                    { label: 'Night', dot: 'bg-indigo-500', shift: 'night' },
                  ].map(row => (
                    <tr key={row.shift} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${row.dot}`} />
                          {row.label}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {cashCloseRecords.reduce((sum, r) =>
                          sum + (r.shifts?.filter((s: any) => s.shift === row.shift)?.reduce((ts: number, s: any) => ts + (s.tills?.length || 0), 0) || 0), 0)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">
                        {formatCurrency(cashCloseRecords.reduce((sum, r) =>
                          sum + (r.shifts?.filter((s: any) => s.shift === row.shift)?.reduce((ss: number, s: any) => ss + (s.shiftTotalCash || 0), 0) || 0), 0))}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {formatCurrency(cashCloseRecords.reduce((sum, r) =>
                          sum + (r.shifts?.filter((s: any) => s.shift === row.shift)?.reduce((ss: number, s: any) => ss + (s.shiftTotalNetwork || 0), 0) || 0), 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Today's PM Funds */}
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className={`relative overflow-hidden px-6 py-5 ${todaysRecord ? 'bg-gradient-to-r from-emerald-700 to-teal-700' : 'bg-gradient-to-r from-amber-600 to-orange-600'}`}>
            <div className="absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }} />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight">PM Fund Tracking</h3>
                  <p className={`text-xs mt-0.5 ${todaysRecord ? 'text-emerald-200' : 'text-amber-100'}`}>
                    {todaysRecord ? "Today's purchasing manager allocation" : "No cash close today — data unavailable"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCashCloseForm(true)}
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl px-3 py-2 text-white text-xs font-medium transition-colors"
              >
                {todaysRecord ? <Wallet className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {todaysRecord ? 'Allocate' : 'Create'}
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="space-y-3">
              {/* PM Fund from today's cash close */}
              <div className={`rounded-xl border p-4 flex items-center gap-4 ${todaysRecord ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 border-dashed opacity-60'}`}>
                <div className={`shrink-0 ${todaysRecord ? 'text-emerald-500' : 'text-slate-400'}`}><Target className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-600">PM Fund Amount</p>
                  <p className="text-xs text-slate-400">Computed from today's revenue</p>
                </div>
                <p className={`text-base font-bold shrink-0 ${todaysRecord ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {todaysRecord ? formatCurrency(todaysRecord.purchasingManager || 0) : formatCurrency(0)}
                </p>
              </div>
              {/* Special funds */}
              <div className={`rounded-xl border p-4 flex items-center gap-4 ${todaysRecord ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200 border-dashed opacity-60'}`}>
                <div className={`shrink-0 ${todaysRecord ? 'text-amber-500' : 'text-slate-400'}`}><Wallet className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-600">Special Funds</p>
                  <p className="text-xs text-slate-400">Retained for special operations</p>
                </div>
                <p className={`text-base font-bold shrink-0 ${todaysRecord ? 'text-amber-700' : 'text-slate-400'}`}>
                  {todaysRecord ? formatCurrency(todaysRecord.specialFunds || 0) : formatCurrency(0)}
                </p>
              </div>
              {/* Total expenses */}
              <div className={`rounded-xl border p-4 flex items-center gap-4 ${todaysRecord ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200 border-dashed opacity-60'}`}>
                <div className={`shrink-0 ${todaysRecord ? 'text-blue-500' : 'text-slate-400'}`}><Receipt className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-600">Total Expenses</p>
                  <p className="text-xs text-slate-400">Operational costs recorded today</p>
                </div>
                <p className={`text-base font-bold shrink-0 ${todaysRecord ? 'text-blue-700' : 'text-slate-400'}`}>
                  {todaysRecord ? formatCurrency(todaysRecord.totalExpenses || 0) : formatCurrency(0)}
                </p>
              </div>
            </div>

            {/* Recent allocation history */}
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-slate-50 border-b border-gray-100 px-4 py-2.5 flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Recent Records</span>
              </div>
              <div className="divide-y divide-gray-50">
                {cashCloseRecords.slice(0, 3).map((record) => (
                  <div key={record.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatCurrency(record.specialFunds)} expense fund</p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">{formatCurrency(record.purchasingManager)}</span>
                  </div>
                ))}
                {cashCloseRecords.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-slate-400">No records yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Cash Close History */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">

        {/* Section header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-5">
          <div className="absolute inset-0 opacity-[0.08]"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }} />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white tracking-tight">Cash Close History</h3>
                <p className="text-xs text-blue-100 mt-0.5">All entries ordered by date · {cashCloseRecords.length} total records</p>
              </div>
            </div>
            <span className="text-xs font-semibold bg-white/20 border border-white/30 text-white rounded-full px-3 py-1.5">
              {rowsPerPage === -1 ? filteredRecords.length : Math.min(rowsPerPage, filteredRecords.length)} of {filteredRecords.length} shown
            </span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-4 border-b border-gray-100 bg-blue-50/30">
          <div className="flex flex-wrap items-end gap-3">
            {/* Date range */}
            <div className="flex items-end gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
                <input type="date" value={fromDate}
                  onChange={(e) => { setFromDate(e.target.value); setDateFilter('custom'); }}
                  className="w-32 px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
                <input type="date" value={toDate}
                  onChange={(e) => { setToDate(e.target.value); setDateFilter('custom'); }}
                  className="w-32 px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Preset</label>
              <select value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); if (e.target.value !== 'custom') { setFromDate(''); setToDate(''); } }}
                className="w-36 px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7days">Last 7 Days</option>
                <option value="last30days">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Shift</label>
              <select value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}
                className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="all">All Shifts</option>
                <option value="day">Day</option>
                <option value="night">Night</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Entry Timing</label>
              <select value={entryTimingFilter} onChange={(e) => setEntryTimingFilter(e.target.value)}
                className="w-36 px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="all">All Entries</option>
                <option value="same_day">Same Day</option>
                <option value="late_entry">Late Entry</option>
                <option value="very_late">Very Late (+7d)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Display</label>
              <label className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white cursor-pointer hover:bg-slate-50 text-sm">
                <input type="checkbox" checked={groupByDate} onChange={(e) => setGroupByDate(e.target.checked)}
                  className="text-slate-600 focus:ring-slate-400"
                />
                <span className="text-xs text-slate-600">Group by date</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Show</label>
              <select value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                {[5, 10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                <option value={-1}>All</option>
              </select>
            </div>

            <div className="flex gap-2 ml-auto">
              <button onClick={exportToCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button onClick={exportToPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <PrinterIcon className="w-3.5 h-3.5" /> PDF
              </button>
            </div>
          </div>
        </div>
        
        {filteredRecords.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
              <Calculator className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-semibold text-slate-600">No records found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or create a new cash close.</p>
          </div>
        ) : groupByDate ? (
          // Grouped Display by Business Date
          <div className="space-y-6">
            {(() => {
              // Group records by business date
              const groupedRecords = (rowsPerPage === -1 ? filteredRecords : filteredRecords.slice(0, rowsPerPage))
                .reduce((groups: { [date: string]: CashCloseRecord[] }, record) => {
                  const date = record.date;
                  if (!groups[date]) {
                    groups[date] = [];
                  }
                  groups[date].push(record);
                  return groups;
                }, {});

              return Object.keys(groupedRecords)
                .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
                .map(date => {
                  const records = groupedRecords[date];
                  const totalRevenue = records.reduce((sum, r) => sum + r.totalRevenue, 0);
                  const hasLateEntries = records.some(r => r.isLateEntry);
                  
                  return (
                    <div key={date} className={`rounded-xl border overflow-hidden ${hasLateEntries ? 'border-orange-200' : 'border-gray-200'}`}>
                      <div className={`flex items-center justify-between px-5 py-3.5 border-b ${hasLateEntries ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-gray-100'}`}>
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-slate-500" />
                          <h3 className="text-sm font-semibold text-slate-800">
                            {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </h3>
                          {hasLateEntries && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200 rounded-md">
                              <AlertCircle className="h-3 w-3" /> Late Entries
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-400">{records.length} entries</div>
                          <div className="text-sm font-bold text-slate-800">{formatCurrency(totalRevenue)}</div>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Entry Info</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tax</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gross Profit</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tills</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {records.map((record) => (
                              <tr key={record.id} className={`hover:bg-gray-50 ${record.isLateEntry ? 'bg-yellow-50' : ''}`}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-xs text-gray-500">
                                    <div className="flex items-center mb-1">
                                      <Clock className="h-3 w-3 mr-1" />
                                      <span>{record.createdAt?.toLocaleDateString()} at {record.createdAt?.toLocaleTimeString()}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <User className="h-3 w-3 mr-1" />
                                      <span>{record.createdBy}</span>
                                    </div>
                                    {record.isLateEntry && (
                                      <div className="flex items-center mt-1 text-yellow-600">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        <span>{record.entryDelay} days late</span>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {formatCurrency(record.totalRevenue)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(record.taxAmount)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(record.profitAmount)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  <div className="flex items-center">
                                    <Building className="h-4 w-4 text-gray-400 mr-1" />
                                    {record.shifts?.reduce((total, shift) => total + (shift.tills?.length || 0), 0) || 0} tills
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                                    {getStatusIcon(record.status)}
                                    <span className="ml-1 capitalize">{record.status}</span>
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                });
            })()}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-slate-50">
                <tr>
                  <SortableHeader column="date" className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Business Date
                  </SortableHeader>
                  <SortableHeader column="createdBy" className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Entry Info
                  </SortableHeader>
                  <SortableHeader column="totalRevenue" className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Revenue
                  </SortableHeader>
                  <SortableHeader column="taxAmount" className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Tax (12%)
                  </SortableHeader>
                  <SortableHeader column="profitAmount" className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Gross Profit
                  </SortableHeader>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Expenses</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Network</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">PM Fund</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Variance</th>
                  <SortableHeader column="status" className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </SortableHeader>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {(rowsPerPage === -1 ? filteredRecords : filteredRecords.slice(0, rowsPerPage)).map((record) => (
                  <tr key={record.id} className={`hover:bg-slate-50 transition-colors ${record.isLateEntry ? 'border-l-4 border-amber-400' : ''}`}>
                    {/* Business Date — the actual date the cash close is for */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                        <div>
                          <div className="text-sm font-semibold text-slate-800">
                            {new Date(record.date + 'T00:00:00').toLocaleDateString('en-UG', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {record.shifts?.filter((s: any) => s.shift === 'day').length > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-xs text-amber-600"><Sun className="h-3 w-3" />Day</span>
                            )}
                            {record.shifts?.filter((s: any) => s.shift === 'night').length > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-xs text-indigo-500"><Moon className="h-3 w-3" />Night</span>
                            )}
                            <span className="text-xs text-slate-400">
                              · {record.shifts?.reduce((total: number, shift: any) => total + (shift.tills?.length || 0), 0) || 0} tills
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Entry Info — when and by whom it was entered, plus late flag */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="text-xs text-slate-600">
                        <div className="flex items-center gap-1 mb-0.5">
                          <User className="h-3 w-3 text-slate-400" />
                          <span className="font-medium">{record.createdBy || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400">
                          <Clock className="h-3 w-3" />
                          <span>{record.createdAt?.toLocaleDateString()} {record.createdAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {record.isLateEntry && (
                          <div className="flex items-center gap-1 mt-1 text-amber-600">
                            <AlertCircle className="h-3 w-3" />
                            <span>{record.entryDelay}d late entry</span>
                          </div>
                        )}
                      </div>
                    </td>
                    {/* Revenue */}
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-slate-800">{formatCurrency(record.totalRevenue)}</span>
                    </td>
                    {/* Tax */}
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <span className="text-sm text-slate-600">{formatCurrency(record.taxAmount)}</span>
                    </td>
                    {/* Gross Profit */}
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-medium text-emerald-700">{formatCurrency(record.profitAmount)}</span>
                    </td>
                    {/* Expenses */}
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <span className="text-sm text-rose-600">{formatCurrency(record.totalExpenses || 0)}</span>
                    </td>
                    {/* Network payments — UGX amount from totalNetworkPayments */}
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <span className="text-sm text-blue-600">{formatCurrency(record.totalNetworkPayments || 0)}</span>
                    </td>
                    {/* PM Fund — amount set aside for purchasing manager */}
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      {record.purchasingManager > 0 ? (
                        <span className="text-sm font-medium text-indigo-700">{formatCurrency(record.purchasingManager)}</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    {/* Variance */}
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      {record.totalShortage > 0 ? (
                        <span className="text-sm font-medium text-red-600">−{formatCurrency(record.totalShortage)}</span>
                      ) : record.totalExcess > 0 ? (
                        <span className="text-sm font-medium text-green-600">+{formatCurrency(record.totalExcess)}</span>
                      ) : (
                        <span className="text-xs text-slate-400">Balanced</span>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                        {getStatusIcon(record.status)}
                        <span className="capitalize">{record.status}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination footer */}
        {filteredRecords.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-slate-50">
            <span className="text-xs text-slate-500">
              {rowsPerPage === -1
                ? `All ${filteredRecords.length} records shown`
                : `${Math.min(rowsPerPage, filteredRecords.length)} of ${filteredRecords.length} records`}
            </span>
            {filteredRecords.length > rowsPerPage && rowsPerPage !== -1 && (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1">
                {filteredRecords.length - rowsPerPage} more — increase "Show" to view all
              </span>
            )}
          </div>
        )}
      </div>

      {/* Cash Close Form */}
      <ComprehensiveCashCloseForm
        isOpen={showCashCloseForm}
        onClose={() => setShowCashCloseForm(false)}
        onSubmit={handleCashCloseSubmit}
      />

      </div>
    </div>
  );
}