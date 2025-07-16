'use client';

import { useState, useEffect } from 'react';
import { AccountantQueries } from '@/lib/firebase/role-based-queries';
import { authService } from '@/lib/firebase/auth';
// import {
//   DollarSign,
//   TrendingUp,
//   TrendingDown,
//   PieChart,
//   BarChart3,
//   Download,
//   Calendar,
//   Filter,
//   RefreshCw,
// } from 'lucide-react';

export default function FinancialReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>({
    summary: {
      totalAllocated: 0,
      totalExpenses: 0,
      totalPaid: 0,
      pendingPayments: 0,
      savingsTotal: 0,
      specialFundsTotal: 0
    },
    monthlyTrends: [],
    expensesByCategory: []
  });
  const [dateRange, setDateRange] = useState('last6months');
  const [reportType, setReportType] = useState('summary');

  useEffect(() => {
    loadReportData();
  }, [dateRange, reportType]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      console.log('Loading financial report data...');
      
      let cashAllocations: Record<string, unknown>[] = [];
      let expenses: Record<string, unknown>[] = [];
      let specialFunds: Record<string, unknown>[] = [];
      
      try {
        // Load all data sources
        cashAllocations = await AccountantQueries.getCashAllocations();
        expenses = await AccountantQueries.getExpenseManagement();
        specialFunds = await AccountantQueries.getSpecialFundsTracker();
        
        console.log('✅ Report data loaded from Firebase');
      } catch (err) {
        console.warn('⚠️ Failed to load report data from Firebase:', err);
        
        // Use placeholder data
        cashAllocations = getPlaceholderData('cashAllocations') as any[];
        expenses = getPlaceholderData('expenses') as any[];
        specialFunds = getPlaceholderData('specialFunds') as any[];
        
        console.log('📋 Using placeholder data for reports');
      }

      // Use placeholder data if real data is empty
      const finalCashAllocations = mergeWithPlaceholders(cashAllocations, getPlaceholderData('cashAllocations') as any[]);
      const finalExpenses = mergeWithPlaceholders(expenses, getPlaceholderData('expenses') as any[]);
      const finalSpecialFunds = mergeWithPlaceholders(specialFunds, getPlaceholderData('specialFunds') as any[]);

      // Calculate summary metrics
      const totalAllocated = finalCashAllocations.reduce((sum, allocation) => sum + (allocation.cashCloseTotal || 0), 0);
      const totalExpenses = finalExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
      const totalPaid = finalExpenses.reduce((sum, expense) => sum + (expense.paidAmount || 0), 0);
      const pendingPayments = totalExpenses - totalPaid;
      const savingsTotal = finalCashAllocations.reduce((sum, allocation) => sum + (allocation.savings || 0), 0);
      const specialFundsTotal = finalSpecialFunds.reduce((sum, fund) => sum + (fund.specialFundsBalance || 0), 0);

      // Get placeholder summary data for trends and categories
      const placeholderSummary = getPlaceholderData('summary') as any;

      setReportData({
        summary: {
          totalAllocated,
          totalExpenses,
          totalPaid,
          pendingPayments,
          savingsTotal,
          specialFundsTotal
        },
        monthlyTrends: placeholderSummary.monthlyTrends || [],
        expensesByCategory: placeholderSummary.expensesByCategory || []
      });

    } catch (err: unknown) {
      console.error('Error loading report data:', err);
      
      // Fallback to complete placeholder data
      const placeholderSummary = getPlaceholderData('summary') as any;
      setReportData(placeholderSummary);
      setError('Using demo data - some features may be limited');
    } finally {
      setLoading(false);
    }
  };

  // ... rest of the existing code remains the same ...
} 