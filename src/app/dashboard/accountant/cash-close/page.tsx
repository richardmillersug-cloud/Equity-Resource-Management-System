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
  Eye,
  Edit,
  Trash2,
  ShoppingCart,
  TrendingDown,
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
  const [allocationsData, setAllocationsData] = useState<{[cashCloseId: string]: AllocationResult[]}>({});
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
  
  // Sorting states
  const [sortColumn, setSortColumn] = useState<string>('createdAt');
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
    const headers = ['Date', 'Entry Date', 'Entry Time', 'Created By', 'Entry Delay (Days)', 'Late Entry', 'Revenue', 'Tax', 'Gross Profit', 'Tills', 'Shifts', 'PM Allocations', 'Allocation Status', 'Network', 'Variance', 'Cash Close Status'];
    const csvData = filteredRecords.map(record => {
      const allocations = allocationsData[record.id] || [];
      const totalPM = allocations.reduce((sum, allocation) => sum + allocation.purchasingManagerAmount, 0);
      const allocatedCount = allocations.filter(a => a.distributionStatus.purchasingManager === 'allocated').length;
      const totalShifts = allocations.length;
      
      let allocationStatus = 'No Allocations';
      if (totalShifts > 0) {
        if (allocatedCount === totalShifts) {
          allocationStatus = 'All Allocated';
        } else if (allocatedCount > 0) {
          allocationStatus = `Partial (${allocatedCount}/${totalShifts})`;
        } else {
          allocationStatus = 'Not Allocated';
        }
      }

      return [
        new Date(record.date).toLocaleDateString(),
        record.createdAt?.toLocaleDateString() || 'Unknown',
        record.createdAt?.toLocaleTimeString() || 'Unknown',
        record.createdBy || 'Unknown',
        record.entryDelay || 0,
        record.isLateEntry ? 'Yes' : 'No',
        record.totalRevenue,
        record.taxAmount,
        record.profitAmount,
        record.shifts?.reduce((total, shift) => total + (shift.tills?.length || 0), 0) || 0,
        `${record.shifts?.filter(shift => shift.shift === 'day')?.length || 0} day, ${record.shifts?.filter(shift => shift.shift === 'night')?.length || 0} night`,
        totalPM,
        allocationStatus,
        record.totalNetworkPayments,
        record.totalExcess > 0 ? `+${record.totalExcess}` : record.totalShortage > 0 ? `-${record.totalShortage}` : 'Balanced',
        record.status
      ];
    });

    // Add summary totals
    const totalPMAllocations = summaryRecords.reduce((sum, record) => {
      const allocations = allocationsData[record.id] || [];
      return sum + allocations.reduce((allocSum, allocation) => allocSum + allocation.purchasingManagerAmount, 0);
    }, 0);

    const summaryData = [
      '', // Empty date for totals row
      'TOTALS',
      summaryRecords.reduce((sum, record) => sum + record.totalRevenue, 0),
      summaryRecords.reduce((sum, record) => sum + record.taxAmount, 0),
      summaryRecords.reduce((sum, record) => sum + record.profitAmount, 0),
      summaryRecords.reduce((sum, record) => sum + (record.shifts?.reduce((total, shift) => total + (shift.tills?.length || 0), 0) || 0), 0),
      `${summaryRecords.length} records`,
      totalPMAllocations,
      `${summaryRecords.filter(r => (allocationsData[r.id] || []).every(a => a.distributionStatus.purchasingManager === 'allocated')).length} fully allocated`,
      summaryRecords.reduce((sum, record) => sum + record.totalNetworkPayments, 0),
      summaryRecords.reduce((sum, record) => sum + (record.totalExcess - record.totalShortage), 0),
      summaryMode === 'displayed' ? 'Displayed Totals' : 'All Filtered Totals'
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
    // Create a simple HTML table for printing/PDF
    const printWindow = window.open('', '_blank');
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cash Close Records</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .header { text-align: center; margin-bottom: 20px; }
            .summary { margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px; }
            .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 10px; }
            .summary-item { text-align: center; }
            .summary-value { font-size: 18px; font-weight: bold; margin-top: 5px; }
            .totals-row { background-color: #e3f2fd; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Cash Close Records</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
            <p>Total Records: ${filteredRecords.length} | Summary Mode: ${summaryMode === 'displayed' ? 'Displayed Rows' : 'All Filtered'}</p>
          </div>
          
          <div class="summary">
            <h3>Summary Totals (${summaryRecords.length} records)</h3>
            <div class="summary-grid">
              <div class="summary-item">
                <div>Total Revenue</div>
                <div class="summary-value">UGX ${summaryRecords.reduce((sum, record) => sum + record.totalRevenue, 0).toLocaleString()}</div>
              </div>
              <div class="summary-item">
                <div>Total Tax</div>
                <div class="summary-value">UGX ${summaryRecords.reduce((sum, record) => sum + record.taxAmount, 0).toLocaleString()}</div>
              </div>
              <div class="summary-item">
                <div>Total Gross Profit</div>
                <div class="summary-value">UGX ${summaryRecords.reduce((sum, record) => sum + record.profitAmount, 0).toLocaleString()}</div>
              </div>
              <div class="summary-item">
                <div>Total Network</div>
                <div class="summary-value">UGX ${summaryRecords.reduce((sum, record) => sum + record.totalNetworkPayments, 0).toLocaleString()}</div>
              </div>
              <div class="summary-item">
                <div>Net Variance</div>
                <div class="summary-value">UGX ${summaryRecords.reduce((sum, record) => sum + (record.totalExcess - record.totalShortage), 0).toLocaleString()}</div>
              </div>
              <div class="summary-item">
                <div>Total Tills</div>
                <div class="summary-value">${summaryRecords.reduce((sum, record) => sum + (record.shifts?.reduce((total, shift) => total + (shift.tills?.length || 0), 0) || 0), 0)} tills</div>
              </div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Revenue</th>
                <th>Tax</th>
                <th>Gross Profit</th>
                <th>Tills</th>
                <th>Shifts</th>
                <th>PM Allocations</th>
                <th>Allocation Status</th>
                <th>Network</th>
                <th>Variance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRecords.map(record => {
                const allocations = allocationsData[record.id] || [];
                const totalPM = allocations.reduce((sum, allocation) => sum + allocation.purchasingManagerAmount, 0);
                const allocatedCount = allocations.filter(a => a.distributionStatus.purchasingManager === 'allocated').length;
                const totalShifts = allocations.length;
                
                let allocationStatus = 'No Allocations';
                if (totalShifts > 0) {
                  if (allocatedCount === totalShifts) {
                    allocationStatus = 'All Allocated';
                  } else if (allocatedCount > 0) {
                    allocationStatus = `Partial (${allocatedCount}/${totalShifts})`;
                  } else {
                    allocationStatus = 'Not Allocated';
                  }
                }

                return `
                <tr>
                  <td>${new Date(record.date).toLocaleDateString()}</td>
                  <td>UGX ${record.totalRevenue.toLocaleString()}</td>
                  <td>UGX ${record.taxAmount.toLocaleString()}</td>
                  <td>UGX ${record.profitAmount.toLocaleString()}</td>
                  <td>${record.shifts?.reduce((total, shift) => total + (shift.tills?.length || 0), 0) || 0} tills</td>
                  <td>${record.shifts?.filter(shift => shift.shift === 'day')?.length || 0} day, ${record.shifts?.filter(shift => shift.shift === 'night')?.length || 0} night</td>
                  <td>UGX ${totalPM.toLocaleString()}</td>
                  <td>${allocationStatus}</td>
                  <td>UGX ${record.totalNetworkPayments.toLocaleString()}</td>
                  <td>${record.totalExcess > 0 ? `+UGX ${record.totalExcess.toLocaleString()}` : record.totalShortage > 0 ? `-UGX ${record.totalShortage.toLocaleString()}` : 'Balanced'}</td>
                  <td>${record.status}</td>
                </tr>
                `;
              }).join('')}
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
          // Get cash closes for the user's branch
          cashCloses = await cashCloseService.getBranchCashCloses(currentUser.employee.branchId);
        } else {
          // Get all cash closes if no specific branch
          cashCloses = await cashCloseService.getAll();
        }
        console.log('✅ Cash closes loaded with regular service:', cashCloses?.length || 0);
      }
      
      // Transform cash closes to match expected format with comprehensive financial data
      const cashCloseRecords = cashCloses.map(cashClose => {
        // Calculate expense breakdown from shifts data
        const expenseBreakdown = {
          general: 0,
          ura: 0,
          emergencies: 0,
          dayToDay: 0
        };
        
        // Calculate purchasing manager breakdown
        const purchasingManagerBreakdown = {
          allocated: cashClose.purchasingManager || 0,
          pending: (cashClose.purchasingManager || 0) * 0.3, // 30% typically pending
          disbursed: (cashClose.purchasingManager || 0) * 0.7  // 70% typically disbursed
        };

        // Calculate entry timing metrics - handle both Date objects and Firestore timestamps
        const businessDate = cashClose.cashCloseDate instanceof Date ? 
          new Date(cashClose.cashCloseDate.getTime()) : 
          (cashClose.cashCloseDate?.toDate?.() ? 
            new Date(cashClose.cashCloseDate.toDate().getTime()) : new Date());
        const entryDate = cashClose.createdAt instanceof Date ? 
          new Date(cashClose.createdAt.getTime()) : 
          (cashClose.createdAt?.toDate?.() ? 
            new Date(cashClose.createdAt.toDate().getTime()) : new Date());
        
        // Calculate delay in days between business date and entry date
        const entryDelay = Math.floor((entryDate.getTime() - businessDate.getTime()) / (1000 * 60 * 60 * 24));
        const isLateEntry = entryDelay > 1; // Flag entries made more than 1 day after business date
        
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
                      case 'GENERAL':
                        expenseBreakdown.general += expense.amount || 0;
                        break;
                      case 'URA':
                        expenseBreakdown.ura += expense.amount || 0;
                        break;
                      case 'EMERGENCIES':
                        expenseBreakdown.emergencies += expense.amount || 0;
                        break;
                      case 'DAY_TO_DAY':
                        expenseBreakdown.dayToDay += expense.amount || 0;
                        break;
                    }
                  });
                }
              });
            }
          });
        }
        
        return {
          id: cashClose.id,
          date: cashClose.cashCloseDate instanceof Date ? 
                cashClose.cashCloseDate.toISOString().split('T')[0] : 
                (cashClose.cashCloseDate?.toDate?.() ? 
                  new Date(cashClose.cashCloseDate.toDate().getTime()).toISOString().split('T')[0] : 
                  new Date().toISOString().split('T')[0]),
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
          // Add timing information - create new Date objects to prevent mutation
          createdAt: new Date(entryDate.getTime()),
          updatedAt: cashClose.updatedAt?.toDate?.() ? 
            new Date(cashClose.updatedAt.toDate().getTime()) : 
            new Date(entryDate.getTime()),
          entryDelay,
          isLateEntry,
          expenseBreakdown,
          purchasingManagerBreakdown,
          networkShiftDetails
        };
      })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      console.log('🔍 Setting cash close records. Sample dates:', cashCloseRecords.length > 0 ? {
        id: cashCloseRecords[0].id,
        date: cashCloseRecords[0].date,
        createdAt: cashCloseRecords[0].createdAt,
        entryDelay: cashCloseRecords[0].entryDelay
      } : 'No records');
      
      setCashCloseRecords(cashCloseRecords);

      // Load allocation data for all cash closes
      console.log('🔄 Loading allocation data for', cashCloseRecords.length, 'cash closes...');
      const allocationsMap: {[cashCloseId: string]: AllocationResult[]} = {};
      
      await Promise.all(cashCloseRecords.map(async (record) => {
        try {
          const allocations = await autoAllocationService.getAllAllocationsByCashCloseId(record.id);
          if (allocations.length > 0) {
            allocationsMap[record.id] = allocations;
            console.log(`📊 Found ${allocations.length} allocations for cash close ${record.id.substring(0, 8)}...`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to load allocations for cash close ${record.id}:`, error);
        }
      }));
      
      setAllocationsData(allocationsMap);
      console.log('✅ Allocation data loaded for', Object.keys(allocationsMap).length, 'cash closes');

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
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Filter today's records specifically
    const todayRecords = records.filter(r => r.date === today);
    const todayRevenue = todayRecords.reduce((sum, r) => sum + r.totalRevenue, 0);

    // Filter week records
    const weekRecords = records.filter(r => r.date >= weekAgo && r.date <= today);
    const weekRevenue = weekRecords.reduce((sum, r) => sum + r.totalRevenue, 0);

    // Filter month records
    const monthRecords = records.filter(r => r.date >= monthAgo && r.date <= today);
    const monthRevenue = monthRecords.reduce((sum, r) => sum + r.totalRevenue, 0);

    const avgDailyRevenue = monthRecords.length > 0 ? monthRevenue / monthRecords.length : 0;

    const totalShortage = records.reduce((sum, r) => sum + r.totalShortage, 0);
    const totalExcess = records.reduce((sum, r) => sum + r.totalExcess, 0);

    console.log('📊 Stats calculated:', {
      today,
      todayRecords: todayRecords.length,
      todayRevenue,
      weekRecords: weekRecords.length,
      weekRevenue,
      monthRecords: monthRecords.length,
      monthRevenue,
      avgDailyRevenue
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cash close data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            Cash Close Management
            {todaysRecord ? (
              <span className="text-lg bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                ✓ Today: {new Date().toLocaleDateString()}
              </span>
            ) : (
              <span className="text-lg bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium">
                ⚠ Pending: {new Date().toLocaleDateString()}
              </span>
            )}
          </h1>
          <p className="text-gray-600 mt-1">
            {todaysRecord 
              ? 'All financial data below reflects today\'s completed cash close' 
              : 'All financial metrics show 0 until today\'s cash close is created'
            }
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              setLoading(true);
              loadCashCloseData();
            }}
            disabled={loading}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
          <button
            onClick={() => setShowCashCloseForm(true)}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              todaysRecord
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-yellow-500 text-white hover:bg-yellow-600'
            }`}
          >
            <Plus className="h-4 w-4 mr-2" />
            {todaysRecord ? 'New Cash Close' : 'Create Today\'s Cash Close'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}



            {/* Current Day Status Banner */}
      {!todaysRecord && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800">No Cash Close for Today</h3>
              <p className="text-sm text-yellow-700">
                {new Date().toLocaleDateString()} - All financial metrics below show 0 until today's cash close is completed.
              </p>
            </div>
            <button
              onClick={() => setShowCashCloseForm(true)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Create Today's Cash Close
            </button>
          </div>
        </div>
      )}

      {/* Late Entry Alert Banner */}
      {cashCloseRecords.some(record => record.isLateEntry) && (
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-800">Late Data Entries Detected</h3>
              <p className="text-sm text-orange-700">
                {cashCloseRecords.filter(record => record.isLateEntry).length} out of {cashCloseRecords.length} entries were made after the business date. 
                This may indicate data entry delays or operational issues.
              </p>
            </div>
            <button
              onClick={() => {
                setEntryTimingFilter('late_entry');
                setDateFilter('all');
                setFromDate('');
                setToDate('');
                setShiftFilter('all');
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              View Late Entries
            </button>
          </div>
        </div>
      )}



      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`bg-white rounded-lg border p-6 ${todaysRecord ? 'border-gray-200' : 'border-yellow-200 bg-yellow-50'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${todaysRecord ? 'bg-blue-100' : 'bg-yellow-100'}`}>
              {todaysRecord ? (
              <DollarSign className="h-6 w-6 text-blue-600" />
              ) : (
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              )}
            </div>
            <div className="text-xs font-medium text-gray-500">
              {new Date().toLocaleDateString()}
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Today's Revenue</p>
            <p className={`text-2xl font-bold ${todaysRecord ? 'text-gray-900' : 'text-yellow-600'}`}>
              {formatCurrency(stats.todayRevenue)}
            </p>
            {!todaysRecord && (
              <p className="text-xs text-yellow-600 mt-1">Create cash close to record revenue</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-xs font-medium text-gray-500">
              Last 7 days
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Week Revenue</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.weekRevenue)}</p>
            {!todaysRecord && stats.weekRevenue === stats.todayRevenue && (
              <p className="text-xs text-orange-500 mt-1">Includes today's missing data</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <Calculator className="h-6 w-6 text-purple-600" />
            </div>
            <div className="text-xs font-medium text-gray-500">
              Last 30 days
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Month Revenue</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.monthRevenue)}</p>
            {!todaysRecord && stats.monthRevenue === stats.todayRevenue && (
              <p className="text-xs text-orange-500 mt-1">Includes today's missing data</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <Target className="h-6 w-6 text-orange-600" />
            </div>
            <div className="text-xs font-medium text-gray-500">
              30-day avg
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Daily Average</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.avgDailyRevenue)}</p>
            {!todaysRecord && (
              <p className="text-xs text-orange-500 mt-1">Average may be affected by missing data</p>
            )}
          </div>
        </div>
      </div>

      {/* Comprehensive Financial Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Network Shift Details Section */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Smartphone className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Network Shift Details</h3>
              </div>
              <div className="flex space-x-2">
                <button className="flex items-center px-3 py-1 text-sm bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100">
                  <Activity className="h-4 w-4 mr-1" />
                  Day Shift
                </button>
                <button className="flex items-center px-3 py-1 text-sm bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100">
                  <Activity className="h-4 w-4 mr-1" />
                  Night Shift
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-1">Track network payments across shifts and payment methods</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">Mobile Money</span>
                  <Smartphone className="h-4 w-4 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(cashCloseRecords.reduce((sum, r) => {
                    return sum + (r.networkShiftDetails?.reduce((shiftSum: number, shift: any) => 
                      shiftSum + (shift.mobilePayments || 0), 0) || 0);
                  }, 0))}
                </p>
                <p className="text-xs text-blue-700 mt-1">MTN, Airtel, M-Sente</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-900">Card Payments</span>
                  <CreditCard className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(cashCloseRecords.reduce((sum, r) => {
                    return sum + (r.networkShiftDetails?.reduce((shiftSum: number, shift: any) => 
                      shiftSum + (shift.cardPayments || 0), 0) || 0);
                  }, 0))}
                </p>
                <p className="text-xs text-green-700 mt-1">Visa, Mastercard</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-900">Total Network</span>
                  <PieChart className="h-4 w-4 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(cashCloseRecords.reduce((sum, r) => sum + (r.totalNetworkPayments || 0), 0))}
                </p>
                <p className="text-xs text-purple-700 mt-1">All electronic payments</p>
              </div>
            </div>
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Shift Performance Breakdown
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Till Count</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cash</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Network</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                          Day Shift
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {cashCloseRecords.reduce((sum, r) => 
                          sum + (r.shifts?.filter((s: any) => s.shift === 'day')?.reduce((tillSum: number, shift: any) => 
                            tillSum + (shift.tills?.length || 0), 0) || 0), 0)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(cashCloseRecords.reduce((sum, r) => 
                          sum + (r.shifts?.filter((s: any) => s.shift === 'day')?.reduce((shiftSum: number, shift: any) => 
                            shiftSum + (shift.shiftTotalCash || 0), 0) || 0), 0))}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(cashCloseRecords.reduce((sum, r) => 
                          sum + (r.shifts?.filter((s: any) => s.shift === 'day')?.reduce((shiftSum: number, shift: any) => 
                            shiftSum + (shift.shiftTotalNetwork || 0), 0) || 0), 0))}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <span className="text-green-600">+{formatCurrency(0)}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                          Night Shift
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {cashCloseRecords.reduce((sum, r) => 
                          sum + (r.shifts?.filter((s: any) => s.shift === 'night')?.reduce((tillSum: number, shift: any) => 
                            tillSum + (shift.tills?.length || 0), 0) || 0), 0)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(cashCloseRecords.reduce((sum, r) => 
                          sum + (r.shifts?.filter((s: any) => s.shift === 'night')?.reduce((shiftSum: number, shift: any) => 
                            shiftSum + (shift.shiftTotalCash || 0), 0) || 0), 0))}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(cashCloseRecords.reduce((sum, r) => 
                          sum + (r.shifts?.filter((s: any) => s.shift === 'night')?.reduce((shiftSum: number, shift: any) => 
                            shiftSum + (shift.shiftTotalNetwork || 0), 0) || 0), 0))}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <span className="text-green-600">+{formatCurrency(0)}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Purchasing Manager Fund Tracking */}
        <div className={`bg-white rounded-lg border overflow-hidden ${todaysRecord ? 'border-gray-200' : 'border-yellow-200'}`}>
          <div className={`px-6 py-4 border-b ${todaysRecord ? 'border-gray-200 bg-white' : 'border-yellow-200 bg-yellow-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {todaysRecord ? (
                  <ShoppingCart className="h-5 w-5 text-gray-400 mr-2" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
                )}
                <h3 className="text-lg font-medium text-gray-900">Today's Purchasing Manager Funds</h3>
                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
              <button 
                onClick={() => setShowCashCloseForm(true)}
                className={`flex items-center px-3 py-1 text-sm rounded-md ${
                  todaysRecord 
                    ? 'bg-green-50 text-green-600 hover:bg-green-100' 
                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                }`}
              >
                {todaysRecord ? (
                  <>
                    <Wallet className="h-4 w-4 mr-1" />
                    Allocate Funds
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Create Cash Close
                  </>
                )}
              </button>
            </div>
            <p className={`text-sm mt-1 ${todaysRecord ? 'text-gray-600' : 'text-yellow-700'}`}>
              {todaysRecord 
                ? 'Today\'s purchasing manager fund allocations and disbursements' 
                : 'No fund allocation data available - create today\'s cash close first'
              }
            </p>
          </div>
          
          <div className="p-6">
            {/* Today's Fund Status Cards */}
            {todaysRecord ? (
              <div className="grid grid-cols-1 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-900">Total Allocated</span>
                    <Target className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(todaysRecord.purchasingManagerBreakdown?.allocated || todaysRecord.purchasingManager || 0)}
                  </p>
                  <p className="text-xs text-green-700 mt-1">User-configured percentage of remaining funds</p>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-yellow-900">Pending Disbursement</span>
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(todaysRecord.purchasingManagerBreakdown?.pending || 0)}
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">Awaiting purchase manager approval</p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">Disbursed</span>
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(todaysRecord.purchasingManagerBreakdown?.disbursed || 0)}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">Successfully transferred to purchasing</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 opacity-60 border-2 border-dashed border-yellow-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Total Allocated</span>
                    <Target className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="text-2xl font-bold text-gray-500">{formatCurrency(0)}</p>
                  <p className="text-xs text-gray-500 mt-1">User-configured percentage of remaining funds</p>
                  <p className="text-xs text-yellow-600 mt-1">No allocation data today</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 opacity-60 border-2 border-dashed border-yellow-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Pending Disbursement</span>
                    <Clock className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="text-2xl font-bold text-gray-500">{formatCurrency(0)}</p>
                  <p className="text-xs text-gray-500 mt-1">Awaiting purchase manager approval</p>
                  <p className="text-xs text-yellow-600 mt-1">No pending data today</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 opacity-60 border-2 border-dashed border-yellow-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Disbursed</span>
                    <CheckCircle className="h-4 w-4 text-gray-400" />
                  </div>
                  <p className="text-2xl font-bold text-gray-500">{formatCurrency(0)}</p>
                  <p className="text-xs text-gray-500 mt-1">Successfully transferred to purchasing</p>
                  <p className="text-xs text-yellow-600 mt-1">No disbursements today</p>
                </div>
              </div>
            )}

            {/* Allocation History */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <Activity className="h-4 w-4 mr-2" />
                Recent Allocations
              </h4>
              <div className="space-y-2">
                {cashCloseRecords.slice(0, 3).map((record, index) => (
                  <div key={record.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <span className="text-sm text-gray-900">{record.date}</span>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(record.specialFunds)} daily expense fund allocated
                      </p>
                    </div>
                    <span className="text-sm font-medium text-green-600">
                      {formatCurrency(record.purchasingManager)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Recent Cash Close Records */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Cash Close History</h3>
          <p className="text-sm text-gray-600 mt-1">All cash close entries ordered by date</p>
        </div>
        
        {/* Data Filters */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-gray-900">Filter Records</h4>
            <span className="text-sm text-gray-500">
              Showing {rowsPerPage === -1 ? filteredRecords.length : Math.min(rowsPerPage, filteredRecords.length)} of {filteredRecords.length} filtered records ({cashCloseRecords.length} total)
            </span>
          </div>
          
          <div className="flex flex-wrap items-end gap-4">
            {/* Date Range Inputs */}
            <div className="flex items-end gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  <Calendar className="inline h-3 w-3 mr-1" />
                  From
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setDateFilter('custom');
                  }}
                  className="w-32 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setDateFilter('custom');
                  }}
                  className="w-32 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Quick Presets</label>
              <select 
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  if (e.target.value !== 'custom') {
                    setFromDate('');
                    setToDate('');
                  }
                }}
                className="w-36 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7days">Last 7 Days</option>
                <option value="last30days">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Shift Filter */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                <Sun className="inline h-3 w-3 mr-1" />
                Shift
              </label>
              <select 
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className="w-28 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All</option>
                <option value="day">Day</option>
                <option value="night">Night</option>
              </select>
            </div>

            {/* Entry Timing Filter */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                <Clock className="inline h-3 w-3 mr-1" />
                Entry Timing
              </label>
              <select 
                value={entryTimingFilter}
                onChange={(e) => setEntryTimingFilter(e.target.value)}
                className="w-32 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Entries</option>
                <option value="same_day">Same Day</option>
                <option value="late_entry">Late Entry</option>
                <option value="very_late">Very Late (+7 days)</option>
              </select>
            </div>

            {/* Date Grouping Toggle */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                <Calendar className="inline h-3 w-3 mr-1" />
                Display
              </label>
              <label className="flex items-center px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={groupByDate}
                  onChange={(e) => setGroupByDate(e.target.checked)}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs">Group by Date</span>
              </label>
            </div>

            {/* Rows Per Page */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                <Eye className="inline h-3 w-3 mr-1" />
                Show
              </label>
              <select 
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={-1}>All</option>
              </select>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                title="Export to CSV"
              >
                <Download className="h-3 w-3 mr-1" />
                CSV
              </button>
              <button
                onClick={exportToPDF}
                className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                title="Export to PDF"
              >
                <PrinterIcon className="h-3 w-3 mr-1" />
                PDF
              </button>
            </div>
          </div>

        </div>
        
        {filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <Calculator className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No cash close records found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first cash close.</p>
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
                    <div key={date} className={`border rounded-lg overflow-hidden ${hasLateEntries ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
                      <div className={`px-6 py-4 border-b ${hasLateEntries ? 'bg-orange-100 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-gray-600" />
                            <h3 className="text-lg font-semibold text-gray-900">
                              {new Date(date).toLocaleDateString('en-US', { 
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </h3>
                            {hasLateEntries && (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-200 text-orange-800 rounded-full">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Has Late Entries
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">{records.length} entries</div>
                            <div className="text-lg font-semibold text-gray-900">{formatCurrency(totalRevenue)}</div>
                          </div>
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
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader column="createdAt" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time Created
                  </SortableHeader>
                  <SortableHeader column="createdBy" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entry Info
                  </SortableHeader>
                  <SortableHeader column="totalRevenue" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </SortableHeader>
                  <SortableHeader column="taxAmount" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tax
                  </SortableHeader>
                  <SortableHeader column="profitAmount" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gross Profit
                  </SortableHeader>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tills</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shifts</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PM Allocations</th>
                  <SortableHeader column="status" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </SortableHeader>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Network</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                                 {(rowsPerPage === -1 ? filteredRecords : filteredRecords.slice(0, rowsPerPage)).map((record) => (
                  <tr key={record.id} className={`hover:bg-gray-50 ${record.isLateEntry ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm text-gray-900 font-medium">{record.createdAt?.toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500 mt-1">{record.createdAt?.toLocaleTimeString()}</div>
                          {record.isLateEntry && (
                            <div className="flex items-center mt-1">
                              <AlertCircle className="h-3 w-3 text-yellow-500 mr-1" />
                              <span className="text-xs text-yellow-600">Late Entry</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-500">
                        <div className="flex items-center mb-1">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>Entered: {record.createdAt?.toLocaleDateString()} at {record.createdAt?.toLocaleTimeString()}</span>
                        </div>
                        <div className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          <span>By: {record.createdBy}</span>
                        </div>
                        {record.isLateEntry && (
                          <div className="flex items-center mt-1 text-yellow-600">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            <span>{record.entryDelay} days after business date</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(record.totalRevenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(record.taxAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(record.profitAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Building className="h-4 w-4 text-gray-400 mr-1" />
                        {record.shifts?.reduce((total, shift) => total + (shift.tills?.length || 0), 0) || 0} tills
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        {(() => {
                          // Debug: Log the shifts data structure
                          console.log('Record shifts:', record.shifts);
                          
                          const dayShifts = record.shifts?.filter(shift => shift.shift === 'day')?.length || 0;
                          const nightShifts = record.shifts?.filter(shift => shift.shift === 'night')?.length || 0;
                          const totalShifts = record.shifts?.length || 0;
                          
                          return (
                            <>
                              {dayShifts > 0 && (
                                <div className="flex items-center">
                                  <Sun className="h-3 w-3 text-yellow-500 mr-1" />
                                  <span className="text-xs">{dayShifts}</span>
                                </div>
                              )}
                              {nightShifts > 0 && (
                                <div className="flex items-center">
                                  <Moon className="h-3 w-3 text-blue-500 mr-1" />
                                  <span className="text-xs">{nightShifts}</span>
                                </div>
                              )}
                              {totalShifts === 0 && (
                                <span className="text-gray-400 text-xs">No shifts</span>
                              )}
                              {totalShifts > 0 && dayShifts === 0 && nightShifts === 0 && (
                                <span className="text-orange-500 text-xs">{totalShifts} shift(s)</span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(() => {
                        const allocations = allocationsData[record.id] || [];
                        if (allocations.length === 0) {
                          return (
                            <div className="flex items-center text-gray-400">
                              <Calculator className="h-4 w-4 mr-1" />
                              <span className="text-xs">No allocations</span>
                            </div>
                          );
                        }
                        
                        const totalPM = allocations.reduce((sum, allocation) => sum + allocation.purchasingManagerAmount, 0);
                        const dayPM = allocations.filter(a => a.shiftType === 'day').reduce((sum, allocation) => sum + allocation.purchasingManagerAmount, 0);
                        const nightPM = allocations.filter(a => a.shiftType === 'night').reduce((sum, allocation) => sum + allocation.purchasingManagerAmount, 0);
                        
                        return (
                          <div className="space-y-1">
                            <div className="font-medium text-green-600">
                              {formatCurrency(totalPM)}
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              {dayPM > 0 && (
                                <div className="flex items-center">
                                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mr-1"></div>
                                  <span>{formatCurrency(dayPM)}</span>
                                </div>
                              )}
                              {nightPM > 0 && (
                                <div className="flex items-center">
                                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-1"></div>
                                  <span>{formatCurrency(nightPM)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(() => {
                        const allocations = allocationsData[record.id] || [];
                        if (allocations.length === 0) {
                          return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              No Allocations
                            </span>
                          );
                        }
                        
                        const pendingCount = allocations.filter(a => a.distributionStatus.purchasingManager === 'pending').length;
                        const allocatedCount = allocations.filter(a => a.distributionStatus.purchasingManager === 'allocated').length;
                        const totalShifts = allocations.length;
                        
                        if (allocatedCount === totalShifts) {
                          return (
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                All Allocated
                              </span>
                            </div>
                          );
                        } else if (allocatedCount > 0) {
                          return (
                            <div className="space-y-1">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <Clock className="w-3 h-3 mr-1" />
                                Partial ({allocatedCount}/{totalShifts})
                              </span>
                              <div className="text-xs text-gray-500">
                                {pendingCount} pending
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Not Allocated
                            </span>
                          );
                        }
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-1">
                        {record.shifts?.some(shift => 
                          shift.tills?.some((till: any) => 
                            till.networkPayments?.some((p: any) => p.paymentMethod === 'mobile')
                          )
                        ) && <Smartphone className="h-3 w-3 text-blue-500" />}
                        {record.shifts?.some(shift => 
                          shift.tills?.some((till: any) => 
                            till.networkPayments?.some((p: any) => p.paymentMethod === 'visa_machine')
                          )
                        ) && <CreditCard className="h-3 w-3 text-green-500" />}
                        <span>
                          {record.shifts?.reduce((total, shift) => 
                            total + shift.tills?.reduce((tillTotal: number, till: any) => 
                              tillTotal + (till.networkPayments?.length || 0), 0) || 0, 0) || 0
                          }
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {record.totalShortage > 0 && (
                        <span className="text-red-600">-{formatCurrency(record.totalShortage)}</span>
                      )}
                      {record.totalExcess > 0 && (
                        <span className="text-green-600">+{formatCurrency(record.totalExcess)}</span>
                      )}
                      {record.totalShortage === 0 && record.totalExcess === 0 && (
                        <span className="text-gray-500">Balanced</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
        )}
        
        {/* Pagination Info */}
        {filteredRecords.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>
                {rowsPerPage === -1 ? (
                  `Showing all ${filteredRecords.length} records`
                ) : (
                  `Showing ${Math.min(rowsPerPage, filteredRecords.length)} of ${filteredRecords.length} records`
                )}
              </span>
              {filteredRecords.length > rowsPerPage && rowsPerPage !== -1 && (
                <span className="text-amber-600">
                  {filteredRecords.length - rowsPerPage} more records available - increase rows per page to see all
                </span>
              )}
            </div>
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