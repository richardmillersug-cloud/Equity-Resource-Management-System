'use client';

import React, { useState, useEffect } from 'react';
import { AccountantQueries } from '@/lib/firebase/role-based-queries';
import { authService } from '@/lib/firebase/auth';
import { CashCloseService } from '@/lib/firebase/firestore-service';
import { SimpleCashCloseService } from '@/lib/firebase/firestore-service-simple';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Calculator,
  PieChart,
  Receipt,
  Wallet,
  RefreshCw,
  Clock,
  Plus,
  ExternalLink,
  Calendar,
  Building,
  Smartphone,
  Grid3X3,
  List,
  LayoutGrid,
  Target,
  BookOpen
} from 'lucide-react';
import { useRouter } from 'next/navigation';
// REMOVED: No more placeholder/fake data - using real database data only
// Allocation-related imports removed per user request
import ComprehensiveCashCloseForm from '@/components/accountant/ComprehensiveCashCloseForm';

// ✅ Safe date conversion utility
const safeToDate = (dateValue: any): Date => {
  if (!dateValue) return new Date();
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'string') return new Date(dateValue);
  if (dateValue.toDate && typeof dateValue.toDate === 'function') return dateValue.toDate();
  if (dateValue.seconds) return new Date(dateValue.seconds * 1000);
  return new Date();
};

export default function AccountantDashboard() {
  const router = useRouter();
  const [cashAllocations, setCashAllocations] = useState<any[]>([]);
  const [specialFunds, setSpecialFunds] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [showAllocationApproval, setShowAllocationApproval] = useState(false);
  const [selectedCashCloseId, setSelectedCashCloseId] = useState<string>('');
  const [showComprehensiveCashClose, setShowComprehensiveCashClose] = useState(false);
  // ✅ NEW: Simple Cash Allocation State  
  const [showSimpleAllocation, setShowSimpleAllocation] = useState(false);
  const [selectedCashCloseForAllocation, setSelectedCashCloseForAllocation] = useState<any>(null);
  const [allocatingCashCloseId, setAllocatingCashCloseId] = useState<string>(''); // Track which allocation is in progress
  const [dashboardData, setDashboardData] = useState({
    cashCloses: [] as any[],
    expenses: [] as any[],
    specialFunds: [] as any[],
    summary: {
      totalRevenue: 0,
      totalTaxAmount: 0,
      totalProfitAmount: 0,
      totalSpecialFunds: 0,
      totalExpenses: 0,
      pendingApprovals: 0,
      overdueExpenses: 0,
      recentTransactions: 0
    }
  });
  // Dashboard allocations removed per user request
  // ✅ UPDATED: Track simple allocation status for each cash close (including accepted)
  const [simpleAllocationStatus, setSimpleAllocationStatus] = useState<{[cashCloseId: string]: {
    status: 'none' | 'allocated' | 'accepted' | 'money_received';
    allocationId?: string;
    acceptedBy?: string;
    totalAmount?: number;
  }}>({});
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [currentPage, setCurrentPage] = useState(1);
  const [dataStats, setDataStats] = useState({ total: 0, loaded: 0, processing: false });
  
  // Dynamic pagination based on collection size and performance
  const getOptimalRecordsPerPage = (totalRecords: number) => {
    if (totalRecords <= 50) return totalRecords; // Show all if small dataset
    if (totalRecords <= 200) return 25; // Moderate pagination for medium datasets
    if (totalRecords <= 1000) return 50; // Larger pages for big datasets
    return 100; // Maximum efficiency for very large collections
  };

  const recordsPerPage = getOptimalRecordsPerPage(dashboardData.cashCloses.length);

  // Helper function to get paginated data with performance optimization
  const getPaginatedCashCloses = () => {
    const totalRecords = dashboardData.cashCloses.length;
    
    // If small dataset, show all records
    if (totalRecords <= 50) {
      return dashboardData.cashCloses;
    }
    
    // Otherwise, use pagination
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    return dashboardData.cashCloses.slice(startIndex, endIndex);
  };

  const totalPages = dashboardData.cashCloses.length <= 50 ? 1 : Math.ceil(dashboardData.cashCloses.length / recordsPerPage);

  const loadAccountantData = async () => {
    setLoading(true);
    setError(null);
    setDebugInfo('Loading accountant data...');
    
    try {
      console.log('📊 Loading accountant dashboard data...');
      
      // Initialize dynamic data tracking
      setDataStats({ total: 0, loaded: 0, processing: true });
      
      let cashClosesData: any[] = [];
      let expensesData: any[] = [];
      let specialFundsData: any[] = [];

      try {
        console.log('📊 Loading cash closes...');
        
        // Try simple service first to avoid index issues
        try {
          const simpleCashCloseService = new SimpleCashCloseService();
          cashClosesData = await simpleCashCloseService.getAllCashClosesSimple();
          const totalRecords = cashClosesData?.length || 0;
          console.log('✅ Cash closes loaded with simple service:', totalRecords);
          console.log('🔢 Collection size detected:', totalRecords, 'records');
          
          // Update data statistics
          setDataStats({ total: totalRecords, loaded: totalRecords, processing: false });
        } catch (simpleError) {
          console.warn('⚠️ Simple service failed, trying regular service...', simpleError);
          
          // Fallback to regular service
          const cashCloseService = new CashCloseService();
          const currentUser = authService.getCurrentUser();
          
          if (currentUser?.employee?.branchId) {
            // Get cash closes for the user's branch
            cashClosesData = await cashCloseService.getBranchCashCloses(currentUser.employee.branchId);
          } else {
            // Get all cash closes if no specific branch
            cashClosesData = await cashCloseService.getAll();
          }
          const totalRecords = cashClosesData?.length || 0;
          console.log('✅ Cash closes loaded with regular service:', totalRecords);
          console.log('🔢 Collection size detected:', totalRecords, 'records');
          
          // Update data statistics
          setDataStats({ total: totalRecords, loaded: totalRecords, processing: false });
        }
      } catch (err) {
        console.warn('⚠️ Failed to load cash closes:', err);
        cashClosesData = [];
        console.log('📋 No cash close data available');
      }

      try {
        console.log('💰 Loading expenses...');
        expensesData = await AccountantQueries.getExpenseManagement();
        console.log('✅ Expenses loaded:', expensesData?.length || 0);
      } catch (err) {
        console.warn('⚠️ Failed to load expenses:', err);
        expensesData = [];
        console.log('📋 No expenses data available - will show empty state');
      }

      try {
        console.log('🏦 Loading special funds...');
        specialFundsData = await AccountantQueries.getSpecialFundsTracker();
        console.log('✅ Special funds loaded:', specialFundsData?.length || 0);
      } catch (err) {
        console.warn('⚠️ Failed to load special funds:', err);
        specialFundsData = [];
        console.log('📋 No special funds data available - will show empty state');
      }

      // Transform cash closes to match expected format (same as cash-close page)
      const transformedCashCloses = cashClosesData.map(cashClose => {
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
          purchasingManagerBreakdown
        };
      })
        .sort((a, b) => {
          // Sort by creation date (createdAt) for latest created first
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA; // Latest created first
        });

      // Calculate summary data from transformed data
      const totalRevenue = transformedCashCloses.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);
      const totalTaxAmount = transformedCashCloses.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
      const totalProfitAmount = transformedCashCloses.reduce((sum, item) => sum + (item.profitAmount || 0), 0);
      const totalSpecialFunds = transformedCashCloses.reduce((sum, item) => sum + (item.specialFunds || 0), 0);
      const totalPurchasingManagerFunds = transformedCashCloses.reduce((sum, item) => sum + (item.purchasingManager || 0), 0);
      const totalNetworkPayments = transformedCashCloses.reduce((sum, item) => sum + (item.totalNetworkPayments || 0), 0);
      const totalShortage = transformedCashCloses.reduce((sum, item) => sum + (item.totalShortage || 0), 0);
      const totalExcess = transformedCashCloses.reduce((sum, item) => sum + (item.totalExcess || 0), 0);
      
      // Store all data in component state
      setCashAllocations(transformedCashCloses);
      setExpenses(expensesData);
      setSpecialFunds(specialFundsData);
      
      setDashboardData({
        cashCloses: transformedCashCloses,
        expenses: expensesData,
        specialFunds: specialFundsData,
        summary: {
          totalRevenue,
          totalTaxAmount,
          totalProfitAmount,
          totalSpecialFunds,
          totalExpenses: expensesData.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0),
          pendingApprovals: expensesData.filter((exp: any) => exp.status === 'pending').length,
          overdueExpenses: expensesData.filter((exp: any) => exp.status === 'overdue').length,
          recentTransactions: transformedCashCloses.filter((item: any) => {
            const itemDate = new Date(item.createdAt?.seconds ? item.createdAt.seconds * 1000 : Date.now());
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return itemDate >= sevenDaysAgo;
          }).length
        }
      });

      // Load allocation data for dashboard cash closes  
      console.log('🔄 Loading allocation data for dashboard...');
      const dashboardAllocationsMap: {[cashCloseId: string]: AllocationResult[]} = {};
      
      await Promise.all(transformedCashCloses.map(async (close: any) => {
        try {
          const allocations = await autoAllocationService.getAllAllocationsByCashCloseId(close.id);
          if (allocations.length > 0) {
            dashboardAllocationsMap[close.id] = allocations;
            console.log(`📊 Found ${allocations.length} allocations for dashboard cash close ${close.id.substring(0, 8)}...`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to load allocations for dashboard cash close ${close.id}:`, error);
        }
      }));
      
      // Dashboard allocations loading removed per user request

      // Set last refreshed time
      setLastRefreshed(new Date());

      // ✅ FIXED: Load simple allocation status from cash_allocations collection
      console.log('📊 Loading allocation status from cash_allocations collection...');
      const simpleAllocationStatusMap: {[cashCloseId: string]: any} = {};
      
      // First, set all to 'none'
      transformedCashCloses.forEach((close: any) => {
        simpleAllocationStatusMap[close.id] = {
          status: 'none',
          allocationId: undefined,
          acceptedBy: undefined,
          totalAmount: 0
        };
      });

      try {
        // Query cash_allocations collection to get real status
        const allocationsSnapshot = await getDocs(collection(db, 'cash_allocations'));
        
        console.log(`📊 Found ${allocationsSnapshot.docs.length} allocation records in database`);
        
        allocationsSnapshot.docs.forEach((doc) => {
          const allocation = doc.data() as any; // Type assertion for Firebase data
          const cashCloseId = allocation.cashCloseId || allocation.sourceId;
          
          // ✅ UPDATED: Map cash_allocations status to our simple status (including accepted)
          let simpleStatus = 'none';
          if (allocation.status === 'allocated') {
            simpleStatus = 'allocated';
          } else if (allocation.status === 'accepted') {
            simpleStatus = 'accepted';
          } else if (allocation.status === 'money_received') {
            simpleStatus = 'money_received';
          }
          
          if (cashCloseId && simpleStatus !== 'none') {
            simpleAllocationStatusMap[cashCloseId] = {
              status: simpleStatus,
              allocationId: doc.id,
              acceptedBy: allocation.pmNotes || undefined,
              totalAmount: allocation.amount || 0
            };
            
            console.log(`📊 Found allocation for cash close ${cashCloseId.substring(0, 8)}...: ${simpleStatus}`);
          }
        });
        
      } catch (allocError) {
        console.warn('⚠️ Could not load cash_allocations data:', allocError);
        // Keep the 'none' statuses if we can't load allocation data
      }
      
      setSimpleAllocationStatus(simpleAllocationStatusMap);
      console.log('✅ Allocation status loaded from cash_allocations collection for', Object.keys(simpleAllocationStatusMap).length, 'cash closes');

      const collectionSize = transformedCashCloses.length;
      const optimalPageSize = getOptimalRecordsPerPage(collectionSize);
      
      console.log('📊 Dynamic Collection Analysis:', {
        totalRecordsInCollection: collectionSize,
        collectionSize: collectionSize <= 50 ? 'Small' : collectionSize <= 200 ? 'Medium' : collectionSize <= 1000 ? 'Large' : 'Very Large',
        paginationStrategy: collectionSize <= 50 ? 'Show All' : 'Paginated',
        optimalRecordsPerPage: optimalPageSize,
        estimatedPages: Math.ceil(collectionSize / optimalPageSize),
        totalRevenue,
        totalTaxAmount,
        totalProfitAmount,
        totalSpecialFunds,
        totalPurchasingManagerFunds,
        totalNetworkPayments,
        totalShortage,
        totalExcess
      });

      // Debug: Log sample of cash close data (first 10 for large collections) - sorted by creation date
      const sampleSize = Math.min(10, collectionSize);
      console.log(`💾 Sample Cash Closes from Firebase (showing ${sampleSize} of ${collectionSize}) - Latest Created First:`, 
        transformedCashCloses.slice(0, sampleSize).map(close => ({
          id: close.id.substring(0, 8) + '...',
          businessDate: close.date,
          createdAt: close.createdAt ? new Date(close.createdAt).toLocaleString() : 'Unknown',
          revenue: close.totalRevenue,
          status: close.status
        }))
      );
      
      if (collectionSize > 10) {
        console.log(`📈 Collection contains ${collectionSize - 10} more records beyond the sample shown`);
      }
      
      // Verify sorting is working correctly
      if (collectionSize >= 2) {
        const first = transformedCashCloses[0];
        const second = transformedCashCloses[1];
        const firstDate = first.createdAt ? new Date(first.createdAt).getTime() : 0;
        const secondDate = second.createdAt ? new Date(second.createdAt).getTime() : 0;
        
        // Enhanced verification with date formatting
        const firstDateStr = first.createdAt ? new Date(first.createdAt).toLocaleDateString() : 'Unknown';
        const secondDateStr = second.createdAt ? new Date(second.createdAt).toLocaleDateString() : 'Unknown';
        
        console.log('📅 Sorting Verification (Latest First):', {
          sortingBy: 'createdAt (Latest First)',
          expectedLatest: '01-Sep-25 or similar recent date',
          actualLatest: {
            id: first.id.substring(0, 8) + '...',
            createdAt: first.createdAt ? new Date(first.createdAt).toLocaleString() : 'Unknown',
            dateOnly: firstDateStr,
            timestamp: firstDate
          },
          secondRecord: {
            id: second.id.substring(0, 8) + '...',
            createdAt: second.createdAt ? new Date(second.createdAt).toLocaleString() : 'Unknown', 
            dateOnly: secondDateStr,
            timestamp: secondDate
          },
          sortingCorrect: firstDate >= secondDate ? '✅ Correct Order' : '❌ Incorrect Order',
          isLatestOnTop: firstDateStr.includes('Sep') || firstDateStr.includes('9/') ? '✅ Sep-25 record at top' : '⚠️ Check if Sep-25 is latest'
        });
      }
      
      // Special check for 01-Sep-25 record
      const sepRecord = transformedCashCloses.find(close => {
        if (!close.createdAt) return false;
        const date = new Date(close.createdAt);
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-based, so September = 8
        const day = date.getDate();
        return year === 2025 && month === 8 && day === 1; // September 1, 2025
      });
      
      if (sepRecord) {
        const sepIndex = transformedCashCloses.indexOf(sepRecord);
        console.log('🎯 01-Sep-25 Record Found:', {
          position: `Index ${sepIndex} (${sepIndex === 0 ? 'FIRST - Correct ✅' : 'NOT FIRST - Check sorting ⚠️'})`,
          id: sepRecord.id.substring(0, 8) + '...',
          createdAt: new Date(sepRecord.createdAt).toLocaleString(),
          isAtTop: sepIndex === 0
        });
      } else {
        console.log('🔍 01-Sep-25 Record Search:', 'No record found with exact date 01-Sep-25');
      }

    } catch (err: any) {
      console.error('❌ Error loading dashboard data:', err);
      
      // NO MORE PLACEHOLDER DATA - Show real error state instead
      console.log('📋 Database connection failed - showing error state with real data only');
      
      // Set empty data arrays - no fake data
      setCashAllocations([]);
      setExpenses([]);
      setSpecialFunds([]);
      
      setDashboardData({
        cashCloses: [],
        expenses: [],
        specialFunds: [],
        summary: {
          totalRevenue: 0,
          totalTaxAmount: 0,
          totalProfitAmount: 0,
          totalSpecialFunds: 0,
          totalExpenses: 0,
          pendingApprovals: 0,
          overdueExpenses: 0,
          recentTransactions: 0
        }
      });

      setError(`Database connection failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccountantData();
  }, []);

  // ✅ Manual refresh handler
  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    await loadAccountantData();
  };

  // Handler for cash allocation form submission
  const handleCashAllocationSubmit = async () => {
    try {
      // Reload dashboard data after successful creation
      await loadAccountantData();
      console.log('✅ Cash allocation created successfully');
    } catch (error) {
      console.error('❌ Error after cash allocation creation:', error);
      // The form will handle its own error display
    }
  };

  // ✅ NEW: Handler for simple cash allocation completion
  const handleSimpleAllocationComplete = async (allocationData: any) => {
    try {
      console.log('✅ Simple allocation completed:', allocationData);
      
      // ✅ IMMEDIATELY update the allocation status to reflect the change
      if (selectedCashCloseForAllocation?.id) {
        setSimpleAllocationStatus(prev => ({
          ...prev,
          [selectedCashCloseForAllocation.id]: {
            status: 'allocated',
            allocationId: allocationData.allocationId || 'pending',
            acceptedBy: undefined,
            totalAmount: allocationData.totalAllocation || 0
          }
        }));
        
        console.log('✅ Updated allocation status immediately for cash close:', selectedCashCloseForAllocation.id);
      }
      
      // Hide the allocation component and clear loading state
      setShowSimpleAllocation(false);
      setSelectedCashCloseForAllocation(null);
      setAllocatingCashCloseId(''); // Clear loading state
      
      // Show success message
      alert(`✅ Successfully sent UGX ${allocationData.totalAllocation.toLocaleString()} to PM!`);
      
      // Reload dashboard data in background to sync with database
      setTimeout(async () => {
        try {
          await loadAccountantData();
          console.log('✅ Background data refresh completed');
        } catch (error) {
          console.error('⚠️ Background data refresh failed:', error);
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error completing simple allocation:', error);
      // Clear loading state even on error
      setAllocatingCashCloseId('');
      setShowSimpleAllocation(false);
      setSelectedCashCloseForAllocation(null);
      // If there's an error, show it but don't update the status
      alert(`❌ Error completing allocation: ${error}`);
    }
  };

  // ✅ SMART: Handle allocation button click - detects old vs new system
  const handleAllocateFunds = (cashClose: any) => {
    console.log('💰 Starting allocation for:', cashClose.id);
    
    const allocations = dashboardAllocations[cashClose.id] || [];
    const hasExistingAllocations = allocations.length > 0;
    
    if (hasExistingAllocations) {
      // ✅ Use OLD ALLOCATION SYSTEM for existing allocations
      console.log('🔄 Using Old Allocation Management for existing allocations');
      setSelectedCashCloseId(cashClose.id);
      setShowAllocationApproval(true);
      setShowSimpleAllocation(false);
    } else {
      // ✅ Use NEW SIMPLE ALLOCATION SYSTEM for new allocations
      console.log('🆕 Using Simple Allocation System for new allocation');
      setAllocatingCashCloseId(cashClose.id); // Set loading state
      setSelectedCashCloseForAllocation(cashClose);
      setShowSimpleAllocation(true);
      setShowAllocationApproval(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BALANCED': return 'text-green-600 bg-green-100';
      case 'UNBALANCED': return 'text-red-600 bg-red-100';
      case 'CORRECT': return 'text-green-600 bg-green-100';
      case 'INCORRECT': return 'text-red-600 bg-red-100';
      case 'FULLY_PAID': return 'text-green-600 bg-green-100';
      case 'PARTIALLY_PAID': return 'text-yellow-600 bg-yellow-100';
      case 'UNPAID': return 'text-red-600 bg-red-100';
      case 'OVERPAID': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'BALANCED':
      case 'CORRECT':
      case 'FULLY_PAID':
        return <CheckCircle className="h-4 w-4" />;
      case 'UNBALANCED':
      case 'INCORRECT':
      case 'UNPAID':
        return <XCircle className="h-4 w-4" />;
      case 'PARTIALLY_PAID':
      case 'OVERPAID':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-100 shadow-2xl p-12">
            <div className="text-center">
              {/* Professional Loading Animation */}
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full animate-pulse opacity-20"></div>
                <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full h-16 w-16 mx-auto flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                </div>
              </div>
              
              {/* Dynamic Collection Loading Header */}
              <div className="mb-6">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-3">
                  Dynamic Collection Analysis
                </h2>
                <p className="text-lg text-gray-600 mb-2">Advanced Financial Data Processing</p>
                <p className="text-sm font-medium text-blue-600">
                  {debugInfo || 'Initializing intelligent collection scanner...'}
                </p>
              </div>
              
              {/* Professional Progress Indicator */}
              {dataStats.processing && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 shadow-inner">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-blue-900 font-semibold">Real-time Collection Processing</span>
                    </div>
                    <div className="text-sm font-bold text-blue-700">
                      {dataStats.total > 0 
                        ? `${dataStats.loaded}/${dataStats.total} Records` 
                        : 'Scanning Archive...'
                      }
                    </div>
                  </div>
                  
                  {/* Animated Progress Bar */}
                  <div className="relative">
                    <div className="w-full bg-blue-100 rounded-full h-3 shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all duration-500 ease-out relative overflow-hidden" 
                        style={{ 
                          width: dataStats.total > 0 ? `${(dataStats.loaded / dataStats.total) * 100}%` : '25%' 
                        }}
                      >
                        <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                      </div>
                    </div>
                    <div className="text-xs text-blue-600 font-medium mt-2 text-center">
                      {dataStats.total > 0 
                        ? `Processing ${dataStats.total} records with intelligent optimization`
                        : 'Configuring adaptive pagination based on collection size'
                      }
                    </div>
                  </div>
                </div>
              )}
              
              {/* Professional Status Messages */}
              <div className="mt-8 flex items-center justify-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <span>Secure Connection</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                  <span>Real-time Analysis</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></div>
                  <span>Smart Processing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">Error Loading Dashboard</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <div className="mt-2 text-xs text-red-600">
                  <p><strong>Debug Info:</strong> {debugInfo}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={loadAccountantData}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Loading Data
            </button>
            <button
              onClick={() => {
                // Only show allocation management if we have real cash close data
                if (dashboardData.cashCloses.length > 0) {
                  setSelectedCashCloseId(dashboardData.cashCloses[0].id);
                  setShowAllocationApproval(true);
                } else {
                  setError('No cash close data available. Please create a cash close first.');
                }
              }}
              className="flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              disabled={dashboardData.cashCloses.length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              {dashboardData.cashCloses.length > 0 ? 'Review Allocations' : 'No Real Data Available'}
            </button>
            <button
              onClick={() => router.push('/dashboard/accountant/cash-close')}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Cash Close
            </button>
          </div>

          {/* Show empty dashboard with sample data for testing */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Accountant Dashboard (Demo Mode)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Allocated</p>
                  <p className="text-2xl font-bold text-gray-900">$0</p>
                  <p className="text-xs text-gray-400 mt-1">No data available</p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Receipt className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Expenses</p>
                  <p className="text-2xl font-bold text-gray-900">$0</p>
                  <p className="text-xs text-gray-400 mt-1">No data available</p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Paid Amount</p>
                  <p className="text-2xl font-bold text-gray-900">$0</p>
                  <p className="text-xs text-gray-400 mt-1">No data available</p>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Pending Payments</p>
                  <p className="text-2xl font-bold text-gray-900">$0</p>
                  <p className="text-xs text-gray-400 mt-1">No data available</p>
                </div>
              </div>
            </div>
          </div>

          {/* Allocation Management - also available in error state */}
          <AllocationManagement
            isOpen={showAllocationApproval}
            onClose={() => setShowAllocationApproval(false)}
            onUpdate={loadAccountantData}
            cashCloseId={selectedCashCloseId}
            dashboardCashCloses={dashboardData.cashCloses}
          />
          
          <ComprehensiveCashCloseForm
            isOpen={showComprehensiveCashClose}
            onClose={() => setShowComprehensiveCashClose(false)}
            onSubmit={handleCashAllocationSubmit}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Professional Header Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex-1">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Calculator className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Dynamic Collection Management
                  </h1>
                  <p className="text-gray-600 text-lg mt-1">Advanced Financial Analytics & Real-time Allocation Control</p>
                  {lastRefreshed && (
                    <div className="flex items-center mt-2 space-x-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        Last synchronized: {lastRefreshed.toLocaleTimeString()}
                      </div>
                      <div className="h-1 w-1 bg-gray-400 rounded-full"></div>
                      <span className="text-sm text-blue-600 font-medium">Live Collection Access</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Collection Status Indicator */}
              <div className="hidden sm:flex items-center px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                  <span className="text-sm font-semibold text-green-700">
                    {dashboardData.cashCloses.length} Collection Records
                  </span>
                </div>
              </div>
              
              {/* Dynamic Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
              >
                <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                <span className="font-semibold">
                  {loading ? 'Synchronizing...' : 'Sync Collection'}
                </span>
              </button>
              
              {/* Smart Allocation Button */}
              <button
                onClick={() => {
                  if (dashboardData.cashCloses.length > 0) {
                    setSelectedCashCloseId(dashboardData.cashCloses[0].id);
                    setShowAllocationApproval(true);
                  } else {
                    alert('No collection data available. Please sync to load records first.');
                  }
                }}
                disabled={dashboardData.cashCloses.length === 0}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
              >
                <Target className="h-5 w-5 mr-2" />
                <span className="font-semibold">Smart Allocation</span>
              </button>
              
              {/* Professional Navigation Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => router.push('/dashboard/accountant/cash-close')}
                  className="inline-flex items-center px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  <span className="font-medium">Cash Close</span>
                  <ExternalLink className="h-3 w-3 ml-2 opacity-60" />
                </button>
                
                <button
                  onClick={() => router.push('/dashboard/accountant/profits')}
                  className="inline-flex items-center px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
                >
                  <PieChart className="h-4 w-4 mr-2" />
                  <span className="font-medium">Analytics</span>
                  <ExternalLink className="h-3 w-3 ml-2 opacity-60" />
                </button>
                
                <button
                  onClick={() => router.push('/dashboard/accountant/alternative')}
                  className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 text-purple-700 rounded-lg hover:from-purple-100 hover:to-violet-100 hover:border-purple-300 transition-all duration-200 shadow-sm"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  <span className="font-medium">Workflow Guide</span>
                  <ExternalLink className="h-3 w-3 ml-2 opacity-60" />
                </button>
                
                <button
                  onClick={() => setShowComprehensiveCashClose(true)}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:from-violet-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  <span className="font-semibold">New Record</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Analytics Dashboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Dynamic Collection Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-white to-green-50 rounded-2xl border border-green-100 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <DollarSign className="h-7 w-7 text-white" />
              </div>
              <div className="text-right">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-green-700 mb-2">Collection Revenue</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-green-800 bg-clip-text text-transparent">
                UGX {dashboardData.summary.totalRevenue?.toLocaleString() || '0'}
              </p>
              <div className="flex items-center mt-3">
                <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-600">
                  {dashboardData.cashCloses?.length || 0} Records Active
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl border border-blue-100 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Receipt className="h-7 w-7 text-white" />
              </div>
              <div className="text-right">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-700 mb-2">Expense Analytics</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                UGX {dashboardData.summary.totalExpenses?.toLocaleString() || '0'}
              </p>
              <div className="flex items-center mt-3">
                <Clock className="h-4 w-4 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-600">
                  {dashboardData.summary.pendingApprovals || 0} Pending Review
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl border border-purple-100 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-purple-500 to-violet-600 flex items-center justify-center shadow-lg">
                <Wallet className="h-7 w-7 text-white" />
              </div>
              <div className="text-right">
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-purple-700 mb-2">Profit Intelligence</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-purple-800 bg-clip-text text-transparent">
                UGX {dashboardData.summary.totalProfitAmount?.toLocaleString() || '0'}
              </p>
              <div className="flex items-center mt-3">
                <TrendingUp className="h-4 w-4 text-purple-600 mr-2" />
                <span className="text-sm font-medium text-purple-600">
                  Smart Profit Allocation
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-orange-50 rounded-2xl border border-orange-100 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
                <Building className="h-7 w-7 text-white" />
              </div>
              <div className="text-right">
                <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-orange-700 mb-2">Reserve Management</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-orange-800 bg-clip-text text-transparent">
                UGX {dashboardData.summary.totalSpecialFunds?.toLocaleString() || '0'}
              </p>
              <div className="flex items-center mt-3">
                <Wallet className="h-4 w-4 text-orange-600 mr-2" />
                <span className="text-sm font-medium text-orange-600">
                  Dynamic Reserves
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Recent Cash Closes */}
      {dashboardData.cashCloses && dashboardData.cashCloses.length > 0 ? (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                Active Recent Cash Closes
                <span className="ml-3 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
                  Latest Created First
                </span>
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage fund allocations to purchasing managers • Sorted by creation date 
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                  {dashboardData.cashCloses.length} total records
                </span>
                <span className={`ml-2 px-2 py-1 text-xs rounded-full font-medium ${
                  dashboardData.cashCloses.length <= 50 
                    ? 'bg-green-100 text-green-800' 
                    : dashboardData.cashCloses.length <= 200 
                    ? 'bg-yellow-100 text-yellow-800'
                    : dashboardData.cashCloses.length <= 1000
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {dashboardData.cashCloses.length <= 50 ? 'Small Collection' 
                    : dashboardData.cashCloses.length <= 200 ? 'Medium Collection'
                    : dashboardData.cashCloses.length <= 1000 ? 'Large Collection'
                    : 'Very Large Collection'}
                </span>
                {totalPages > 1 && (
                  <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
                    Page {currentPage} of {totalPages} • {recordsPerPage} per page
                  </span>
                )}
                {dashboardData.cashCloses.length <= 50 && (
                  <span className="ml-2 px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full font-medium">
                    Showing All
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => {
                    setViewMode('cards');
                    setCurrentPage(1); // Reset to first page when changing view
                  }}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'cards'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4 mr-1" />
                  Cards
                </button>
                <button
                  onClick={() => {
                    setViewMode('list');
                    setCurrentPage(1); // Reset to first page when changing view
                  }}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <List className="h-4 w-4 mr-1" />
                  List
                </button>
              </div>
              
              <button
                onClick={() => router.push('/dashboard/accountant/cash-close')}
                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View All
              </button>
            </div>
          </div>
          
          {/* Cards View */}
          {viewMode === 'cards' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getPaginatedCashCloses().map((close, index) => {
                const allocations = dashboardAllocations[close.id] || [];
                // ✅ FIXED: Check cash close allocation status first (primary source of truth)
                const cashCloseStatus = close.allocationStatus;
                const allocatedCount = allocations.filter(a => 
                  a.distributionStatus.purchasingManager === 'allocated' || a.status === 'submitted'
                ).length;
                const isFullyAllocated = cashCloseStatus === 'fully_allocated' || 
                  (cashCloseStatus === 'partially_allocated' && allocatedCount > 0) ||
                  (allocations.length > 0 && allocatedCount === allocations.length);
                const totalShifts = allocations.length;
                const totalPMAmount = allocations.reduce((sum, allocation) => sum + allocation.purchasingManagerAmount, 0);
                
                // ✅ NEW: Get simple allocation status for this cash close
                const simpleStatus = simpleAllocationStatus[close.id]?.status || 'none';
                const acceptedBy = simpleAllocationStatus[close.id]?.acceptedBy;
                
                // ✅ UPDATED: Determine card status and styling based on simple allocation status
                const isCurrentlyAllocating = allocatingCashCloseId === close.id;
                let statusColor, statusText, statusIcon, isAllocated;
                
                if (isCurrentlyAllocating) {
                  statusColor = 'bg-purple-50 border-purple-200';
                  statusText = '⏳ Processing Allocation...';
                  statusIcon = <Clock className="w-4 h-4 text-purple-600 animate-spin" />;
                  isAllocated = true; // Disable button during allocation
                } else if (simpleStatus === 'money_received') {
                  statusColor = 'bg-green-50 border-green-200';
                  statusText = `✅ Money Received by PM${acceptedBy ? ` (${acceptedBy})` : ''}`;
                  statusIcon = <CheckCircle className="w-4 h-4 text-green-600" />;
                  isAllocated = true;
                } else if (simpleStatus === 'allocated') {
                  statusColor = 'bg-blue-50 border-blue-200';
                  statusText = '📤 Sent to PM - Awaiting Acceptance';
                  statusIcon = <Clock className="w-4 h-4 text-blue-600" />;
                  isAllocated = true;
                } else if (simpleStatus === 'accepted') {
                  statusColor = 'bg-green-50 border-green-200';
                  statusText = '✅ Accepted by PM';
                  statusIcon = <CheckCircle className="w-4 h-4 text-green-600" />;
                  isAllocated = true;
                } else if (allocations.length === 0) {
                  statusColor = 'bg-yellow-50 border-yellow-200';
                  statusText = '💰 Ready for Simple Allocation';
                  statusIcon = <DollarSign className="w-4 h-4 text-yellow-600" />;
                  isAllocated = false;
                } else if (isFullyAllocated) {
                  statusColor = 'bg-green-50 border-green-200';
                  statusText = '✅ Fully Allocated';
                  statusIcon = <CheckCircle className="w-4 h-4 text-green-600" />;
                  isAllocated = true;
                } else if (allocations.length > 0) {
                  // Has old allocations that need to be submitted
                  statusColor = 'bg-orange-50 border-orange-200';
                  statusText = '⏳ Submit Existing Allocations';
                  statusIcon = <Clock className="w-4 h-4 text-orange-600" />;
                  isAllocated = false;
                } else {
                  // No allocations - ready for new simple allocation
                  statusColor = 'bg-blue-50 border-blue-200';
                  statusText = '💰 Create New Allocation';
                  statusIcon = <DollarSign className="w-4 h-4 text-blue-600" />;
                  isAllocated = false;
                }

                return (
                  <div key={index} className={`bg-white rounded-lg border-2 ${statusColor} p-6 hover:shadow-lg transition-all duration-200`}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-900 font-medium">
                            {close.createdAt?.toLocaleDateString?.() || new Date(close.createdAt?.seconds * 1000).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {close.createdAt?.toLocaleTimeString?.() || new Date(close.createdAt?.seconds * 1000).toLocaleTimeString()}
                          </div>
                        </div>
                        {index === 0 && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                            Latest
                          </span>
                        )}
                        {(() => {
                          const closeDate = new Date(close.createdAt?.seconds * 1000);
                          const year = closeDate.getFullYear();
                          const month = closeDate.getMonth();
                          const day = closeDate.getDate();
                          if (year === 2025 && month === 8 && day === 1) {
                            return (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                01-Sep-25
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div className="flex items-center space-x-1">
                        {statusIcon}
                        <span className="text-xs font-medium text-gray-600">{statusText}</span>
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Revenue</span>
                        <span className="text-sm font-semibold text-gray-900">
                          UGX {close.totalRevenue?.toLocaleString() || '0'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Gross Profit (12%)</span>
                        <span className="text-sm font-semibold text-purple-600">
                          UGX {close.profitAmount?.toLocaleString() || '0'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Daily Expense Fund</span>
                        <span className="text-sm font-semibold text-orange-600">
                          UGX {close.specialFunds?.toLocaleString() || '0'}
                        </span>
                      </div>
                      
                      <hr className="border-gray-200" />
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">PM Allocation</span>
                        <span className="text-lg font-bold text-green-600">
                          {allocations.length === 0 ? (
                            <span className="text-gray-400 text-sm">Not calculated</span>
                          ) : (
                            `UGX ${totalPMAmount.toLocaleString()}`
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Allocation Progress */}
                    {allocations.length > 0 && (
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Allocation Progress</span>
                          <span>{allocatedCount}/{totalShifts} shifts</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isFullyAllocated ? 'bg-green-500' : 
                              allocatedCount > 0 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${totalShifts > 0 ? (allocatedCount / totalShifts) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* ✅ UPDATED: Action Button with Status-Based Behavior */}
                    <button
                      onClick={() => handleAllocateFunds(close)}
                      disabled={isAllocated}
                      className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                        isCurrentlyAllocating
                          ? 'bg-purple-100 text-purple-700 cursor-not-allowed'
                          : simpleStatus === 'money_received'
                            ? 'bg-green-100 text-green-700 cursor-not-allowed'
                            : simpleStatus === 'allocated'
                              ? 'bg-blue-100 text-blue-700 cursor-not-allowed'
                              : isFullyAllocated
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        {isCurrentlyAllocating ? (
                          <>
                            <Clock className="w-4 h-4 animate-spin" />
                            <span>⏳ Processing...</span>
                          </>
                        ) : simpleStatus === 'money_received' ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>✅ Money Received</span>
                          </>
                        ) : simpleStatus === 'allocated' ? (
                          <>
                            <Clock className="w-4 h-4" />
                            <span>📤 Sent to PM</span>
                          </>
                        ) : simpleStatus === 'accepted' ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>✅ PM Accepted</span>
                          </>
                        ) : isFullyAllocated ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>✅ Allocation Complete</span>
                          </>
                        ) : allocations.length > 0 ? (
                          <>
                            <Target className="w-4 h-4" />
                            <span>📋 Submit Allocations</span>
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-4 h-4" />
                            <span>💰 Create Allocation</span>
                          </>
                        )}
                      </div>
                    </button>
                  </div>
                );
                })}
              </div>
              
              {/* Dynamic Pagination for Cards View */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, dashboardData.cashCloses.length)} of {dashboardData.cashCloses.length} records
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {recordsPerPage} per page (optimized)
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-2 py-1 border border-gray-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      First
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-700 px-3 py-1 bg-white border border-gray-300 rounded">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 border border-gray-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
              
              {/* Collection Status for Cards View */}
              {dashboardData.cashCloses.length <= 50 && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm text-green-800 font-medium">
                      All {dashboardData.cashCloses.length} records displayed • No pagination needed
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Profit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Expense</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PM Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getPaginatedCashCloses().map((close, index) => {
                      const allocations = dashboardAllocations[close.id] || [];
                      // ✅ FIXED: Check cash close allocation status first (primary source of truth)
                      const cashCloseStatus = close.allocationStatus;
                      const allocatedCount = allocations.filter(a => 
                        a.distributionStatus.purchasingManager === 'allocated' || a.status === 'submitted'
                      ).length;
                      const isFullyAllocated = cashCloseStatus === 'fully_allocated' || 
                        (cashCloseStatus === 'partially_allocated' && allocatedCount > 0) ||
                        (allocations.length > 0 && allocatedCount === allocations.length);
                      const totalShifts = allocations.length;
                      const totalPMAmount = allocations.reduce((sum, allocation) => sum + allocation.purchasingManagerAmount, 0);
                      
                      // ✅ NEW: Get simple allocation status for this cash close
                      const simpleStatus = simpleAllocationStatus[close.id]?.status || 'none';
                      const acceptedBy = simpleAllocationStatus[close.id]?.acceptedBy;
                      const isSimpleAllocated = simpleStatus === 'allocated' || simpleStatus === 'money_received';

                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 text-gray-400 mr-2" />
                              <div>
                                <div className="text-sm text-gray-900 font-medium">
                                  {close.createdAt?.toLocaleDateString?.() || new Date(close.createdAt?.seconds * 1000).toLocaleDateString()}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {close.createdAt?.toLocaleTimeString?.() || new Date(close.createdAt?.seconds * 1000).toLocaleTimeString()}
                                </div>
                              </div>
                              {index === 0 && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                                  Latest
                                </span>
                              )}
                              {(() => {
                                const closeDate = new Date(close.createdAt?.seconds * 1000);
                                const year = closeDate.getFullYear();
                                const month = closeDate.getMonth();
                                const day = closeDate.getDate();
                                if (year === 2025 && month === 8 && day === 1) {
                                  return (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                      01-Sep-25
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            UGX {close.totalRevenue?.toLocaleString() || '0'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 font-medium">
                            UGX {close.profitAmount?.toLocaleString() || '0'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                            UGX {close.specialFunds?.toLocaleString() || '0'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {allocations.length === 0 ? (
                              <div className="flex items-center text-gray-400">
                                <Calculator className="h-4 w-4 mr-1" />
                                <span className="text-xs">Not calculated</span>
                              </div>
                            ) : (
                              <div className="font-medium text-green-600">
                                UGX {totalPMAmount.toLocaleString()}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {allocations.length > 0 ? (
                              <div className="flex items-center">
                                <div className="w-12 bg-gray-200 rounded-full h-2 mr-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      isFullyAllocated ? 'bg-green-500' : 
                                      allocatedCount > 0 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${totalShifts > 0 ? (allocatedCount / totalShifts) * 100 : 0}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-600">{allocatedCount}/{totalShifts}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {/* ✅ UPDATED: Status Display Based on Simple Allocation Status */}
                            {(() => {
                              if (simpleStatus === 'money_received') {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    ✅ Money Received
                                  </span>
                                );
                              } else if (simpleStatus === 'allocated') {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    <Clock className="w-3 h-3 mr-1" />
                                    📤 Allocated
                                  </span>
                                );
                              } else if (allocations.length === 0) {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    <DollarSign className="w-3 h-3 mr-1" />
                                    💰 Ready
                                  </span>
                                );
                              } else if (isFullyAllocated) {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Complete
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Pending
                                  </span>
                                );
                              }
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {/* ✅ UPDATED: Action Button with Status-Based Behavior */}
                            <button
                              onClick={() => handleAllocateFunds(close)}
                              disabled={isSimpleAllocated || isFullyAllocated}
                              className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                simpleStatus === 'money_received'
                                  ? 'bg-green-100 text-green-700 cursor-not-allowed'
                                  : simpleStatus === 'allocated'
                                    ? 'bg-blue-100 text-blue-700 cursor-not-allowed'
                                    : isFullyAllocated
                                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                      : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                            >
                              {simpleStatus === 'money_received' ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  ✅ Money Received
                                </>
                              ) : simpleStatus === 'allocated' ? (
                                <>
                                  <Clock className="w-3 h-3 mr-1" />
                                  📤 Awaiting PM
                                </>
                              ) : simpleStatus === 'accepted' ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  ✅ PM Accepted
                                </>
                              ) : isFullyAllocated ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  ✅ Complete
                                </>
                              ) : allocations.length > 0 ? (
                                <>
                                  <Target className="w-3 h-3 mr-1" />
                                  📋 Submit
                                </>
                              ) : (
                                <>
                                  <DollarSign className="w-3 h-3 mr-1" />
                                  💰 Create
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Dynamic Pagination for List View */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, dashboardData.cashCloses.length)} of {dashboardData.cashCloses.length} records
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {recordsPerPage} per page (optimized)
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-2 py-1 border border-gray-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 bg-white"
                    >
                      First
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 bg-white"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-700 px-3 py-1 bg-white border border-gray-300 rounded">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 bg-white"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 border border-gray-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 bg-white"
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
              
              {/* Collection Status for List View */}
              {dashboardData.cashCloses.length <= 50 && (
                <div className="px-6 py-3 border-t border-gray-200 bg-green-50">
                  <div className="flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm text-green-800 font-medium">
                      All {dashboardData.cashCloses.length} records displayed in table • No pagination needed
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calculator className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Cash Closes Found</h3>
            <p className="text-sm text-gray-600 mb-4">
              No cash close records are available in the database yet.
            </p>
            <button
              onClick={() => router.push('/dashboard/accountant/cash-close')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Cash Close
            </button>
          </div>
        </div>
      )}

      {/* Daily Expense Fund Tracker */}
      {dashboardData.specialFunds && dashboardData.specialFunds.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Daily Expense Fund Tracker</h3>
            <p className="text-sm text-gray-600 mt-1">Current status of daily expense fund allocations</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboardData.specialFunds.slice(0, 6).map((fund, index) => (
                <div key={index} className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg border border-orange-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-orange-900">{fund.category || 'Special Fund'}</h4>
                    <Wallet className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-orange-700">Target Amount:</span>
                      <span className="text-sm font-medium text-orange-900">
                        ${fund.targetAmount?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-orange-700">Current Balance:</span>
                      <span className="text-sm font-medium text-gray-900">
                        ${fund.savingsBalance?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-sm text-gray-600">Last Updated:</span>
                      <span className="text-sm text-gray-500">
                        {new Date(fund.lastUpdated?.seconds * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW: Simple Cash Allocation (replaces old allocation system) */}
      {showSimpleAllocation && selectedCashCloseForAllocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">
                  💰 Simple Cash Allocation - {new Date(selectedCashCloseForAllocation.date).toLocaleDateString()}
                </h2>
                <button
                  onClick={() => {
                    setShowSimpleAllocation(false);
                    setSelectedCashCloseForAllocation(null);
                    setAllocatingCashCloseId(''); // Clear loading state when modal is closed
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <SimpleCashAllocation
                cashCloseData={selectedCashCloseForAllocation}
                onAllocationComplete={handleSimpleAllocationComplete}
                branchId="main-branch" // Replace with actual branch ID
                accountantName="Current Accountant" // Replace with actual accountant name
              />
            </div>
          </div>
        </div>
      )}

      {/* Old Allocation Management (keeping for transition period) */}
      <AllocationManagement
        isOpen={showAllocationApproval}
        onClose={() => setShowAllocationApproval(false)}
        onUpdate={loadAccountantData}
        cashCloseId={selectedCashCloseId}
        dashboardCashCloses={dashboardData.cashCloses}
      />
      
      <ComprehensiveCashCloseForm
        isOpen={showComprehensiveCashClose}
        onClose={() => setShowComprehensiveCashClose(false)}
        onSubmit={handleCashAllocationSubmit}
      />
    </div>
  );
}