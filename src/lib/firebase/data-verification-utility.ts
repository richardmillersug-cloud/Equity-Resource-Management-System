/**
 * Data Verification Utility
 * This utility checks what real data is currently available across all accountant pages
 * and helps ensure consistency between different pages.
 */

import { SimpleCashCloseService } from './firestore-service-simple';
import { CashCloseService } from './firestore-service';
import { AccountantQueries } from './role-based-queries';
// Auto-allocation service removed per user request
import { authService } from './auth';
import { SimpleExpensesService } from './expenses-service-simple';
import { SimpleSpecialFundsService } from './special-funds-service-simple';

export interface DataAvailabilityReport {
  timestamp: string;
  user: {
    authenticated: boolean;
    uid?: string;
    role?: string;
    branch?: string;
  };
  collections: {
    cashCloses: {
      available: boolean;
      count: number;
      sampleRecords: any[];
      totalRevenue: number;
      totalProfit: number;
      dateRange: { earliest?: string; latest?: string };
      error?: string;
    };
    allocations: {
      available: boolean;
      count: number;
      sampleRecords: any[];
      totalPMAllocated: number;
      allocationStats: { pending: number; allocated: number; transferred: number };
      error?: string;
    };
    expenses: {
      available: boolean;
      count: number;
      sampleRecords: any[];
      totalExpenses: number;
      totalPaid: number;
      totalRemaining: number;
      categories: string[];
      error?: string;
    };
    specialFunds: {
      available: boolean;
      count: number;
      sampleRecords: any[];
      totalBalance: number;
      error?: string;
    };
  };
  summary: {
    totalDataSources: number;
    availableDataSources: number;
    readyForAnalytics: boolean;
    recommendations: string[];
  };
}

export class DataVerificationUtility {
  
  /**
   * Generate a comprehensive report of available data across all collections
   */
  static async generateDataAvailabilityReport(): Promise<DataAvailabilityReport> {
    console.log('🔍 Generating Data Availability Report...');
    
    const report: DataAvailabilityReport = {
      timestamp: new Date().toISOString(),
      user: { authenticated: false },
      collections: {
        cashCloses: { 
          available: false, 
          count: 0, 
          sampleRecords: [], 
          totalRevenue: 0, 
          totalProfit: 0, 
          dateRange: {} 
        },
        allocations: { 
          available: false, 
          count: 0, 
          sampleRecords: [], 
          totalPMAllocated: 0,
          allocationStats: { pending: 0, allocated: 0, transferred: 0 }
        },
        expenses: { 
          available: false, 
          count: 0, 
          sampleRecords: [], 
          totalExpenses: 0, 
          totalPaid: 0, 
          totalRemaining: 0, 
          categories: [] 
        },
        specialFunds: { 
          available: false, 
          count: 0, 
          sampleRecords: [], 
          totalBalance: 0 
        }
      },
      summary: {
        totalDataSources: 4,
        availableDataSources: 0,
        readyForAnalytics: false,
        recommendations: []
      }
    };

    try {
      // Check user authentication
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        report.user = {
          authenticated: true,
          uid: currentUser.uid,
          role: currentUser.role,
          branch: currentUser.branch?.name || 'Default'
        };
        console.log('✅ User authenticated:', report.user);
        
        // Check if user has appropriate role for analytics
        const analyticsRoles = ['Admin', 'Manager', 'Accountant', 'Managing Director'];
        if (!analyticsRoles.includes(currentUser.role)) {
          report.summary.recommendations.push(`⚠️ Your role (${currentUser.role}) may not have access to analytics features`);
        }
      } else {
        console.log('❌ User not authenticated');
        report.summary.recommendations.push('🚨 Please log in to access analytics features');
        return report;
      }

      // 1. Check Cash Closes Collection
      try {
        console.log('🔍 Checking cashCloses collection...');
        const simpleCashCloseService = new SimpleCashCloseService();
        const cashCloses = await simpleCashCloseService.getAllCashClosesSimple();
        
        if (cashCloses.length > 0) {
          const totalRevenue = cashCloses.reduce((sum, close) => sum + (close.totalRevenue || 0), 0);
          const totalProfit = cashCloses.reduce((sum, close) => sum + (close.profitAmount || 0), 0);
          
          const dates = cashCloses
            .map(close => close.createdAt || close.cashCloseDate || close.date)
            .filter(date => date)
            .map(date => new Date(date))
            .sort((a, b) => a.getTime() - b.getTime());

          report.collections.cashCloses = {
            available: true,
            count: cashCloses.length,
            sampleRecords: cashCloses.slice(0, 3).map(close => ({
              id: close.id,
              date: close.createdAt?.toLocaleDateString() || 'No date',
              totalRevenue: close.totalRevenue || 0,
              profitAmount: close.profitAmount || 0,
              specialFunds: close.specialFunds || 0,
              shifts: close.shifts?.length || 0
            })),
            totalRevenue,
            totalProfit,
            dateRange: {
              earliest: dates.length > 0 ? dates[0].toLocaleDateString() : undefined,
              latest: dates.length > 0 ? dates[dates.length - 1].toLocaleDateString() : undefined
            }
          };
          
          report.summary.availableDataSources++;
          console.log(`✅ Cash closes: ${cashCloses.length} records, Revenue: ${totalRevenue.toLocaleString()}`);
        } else {
          report.collections.cashCloses.error = 'No cash close records found';
          console.log('⚠️ No cash close records found');
        }
      } catch (error: any) {
        report.collections.cashCloses.error = error.message;
        console.log('❌ Cash closes error:', error.message);
      }

      // 2. Check Allocations
      if (report.collections.cashCloses.available) {
        try {
          console.log('🔍 Checking allocation results...');
          const allAllocations: any[] = [];
          const cashCloses = await new SimpleCashCloseService().getAllCashClosesSimple();
          
          for (const cashClose of cashCloses.slice(0, 10)) { // Check first 10
            try {
              const allocations = await autoAllocationService.getAllAllocationsByCashCloseId(cashClose.id);
              allAllocations.push(...allocations);
            } catch (allocError) {
              // Skip allocation errors for individual cash closes
              console.warn(`⚠️ No allocations for ${cashClose.id.substring(0, 8)}...`);
            }
          }

          if (allAllocations.length > 0) {
            const totalPMAllocated = allAllocations.reduce((sum, a) => sum + (a.purchasingManagerAmount || 0), 0);
            const allocationStats = {
              pending: allAllocations.filter(a => a.distributionStatus?.purchasingManager === 'pending').length,
              allocated: allAllocations.filter(a => a.distributionStatus?.purchasingManager === 'allocated').length,
              transferred: allAllocations.filter(a => a.distributionStatus?.purchasingManager === 'transferred').length
            };

            report.collections.allocations = {
              available: true,
              count: allAllocations.length,
              sampleRecords: allAllocations.slice(0, 3).map(allocation => ({
                id: allocation.id,
                cashCloseId: allocation.cashCloseId.substring(0, 8) + '...',
                shiftType: allocation.shiftType,
                purchasingManagerAmount: allocation.purchasingManagerAmount,
                status: allocation.distributionStatus?.purchasingManager || 'unknown'
              })),
              totalPMAllocated,
              allocationStats
            };
            
            report.summary.availableDataSources++;
            console.log(`✅ Allocations: ${allAllocations.length} records, PM Total: ${totalPMAllocated.toLocaleString()}`);
          } else {
            report.collections.allocations.error = 'No allocation records found';
            console.log('⚠️ No allocation records found');
          }
        } catch (error: any) {
          report.collections.allocations.error = error.message;
          console.log('❌ Allocations error:', error.message);
        }
      }

      // 3. Check Expenses with fallback to simple service
      try {
        console.log('🔍 Checking expenses data...');
        let expenses: any[] = [];
        let expensesDataSource = '';
        
        try {
          expenses = await AccountantQueries.getExpenseManagement();
          expensesDataSource = 'AccountantQueries';
          console.log(`✅ Expenses loaded via AccountantQueries: ${expenses.length} records`);
        } catch (complexError: any) {
          console.warn('⚠️ AccountantQueries failed, trying simple service...', complexError);
          
          if (complexError.message.includes('index') || complexError.message.includes('requires an index')) {
            try {
              const simpleExpensesService = new SimpleExpensesService();
              expenses = await simpleExpensesService.getAllExpensesSimple();
              expensesDataSource = 'SimpleExpensesService';
              console.log(`✅ Expenses loaded via SimpleExpensesService: ${expenses.length} records`);
            } catch (simpleError: any) {
              throw new Error(`Both services failed: ${simpleError.message}`);
            }
          } else {
            throw complexError;
          }
        }
        
        if (expenses.length > 0) {
          const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
          const totalPaid = expenses.reduce((sum, exp) => sum + (exp.paidAmount || 0), 0);
          const totalRemaining = totalExpenses - totalPaid;
          const categories = [...new Set(expenses.map(exp => exp.category).filter(cat => cat))];

          report.collections.expenses = {
            available: true,
            count: expenses.length,
            sampleRecords: expenses.slice(0, 3).map(expense => ({
              id: expense.id,
              description: expense.description || 'No description',
              amount: expense.amount || 0,
              category: expense.category || 'Uncategorized',
              status: expense.status || 'unknown'
            })),
            totalExpenses,
            totalPaid,
            totalRemaining,
            categories
          };
          
          report.summary.availableDataSources++;
          console.log(`✅ Expenses: ${expenses.length} records, Total: ${totalExpenses.toLocaleString()} (via ${expensesDataSource})`);
        } else {
          report.collections.expenses.error = 'No expense records found';
          console.log('⚠️ No expense records found');
        }
      } catch (error: any) {
        if (error.message.includes('index') || error.message.includes('requires an index')) {
          report.collections.expenses.error = `Firestore index required: ${error.message}`;
        } else {
          report.collections.expenses.error = error.message;
        }
        console.log('❌ Expenses error:', error.message);
      }

      // 4. Check Special Funds with fallback to simple service
      try {
        console.log('🔍 Checking special funds data...');
        let specialFunds: any[] = [];
        let specialFundsDataSource = '';
        
        try {
          specialFunds = await AccountantQueries.getSpecialFundsTracker();
          specialFundsDataSource = 'AccountantQueries';
          console.log(`✅ Special funds loaded via AccountantQueries: ${specialFunds.length} records`);
        } catch (complexError: any) {
          console.warn('⚠️ AccountantQueries failed for special funds, trying simple service...', complexError);
          
          if (complexError.message.includes('index') || complexError.message.includes('requires an index')) {
            try {
              const simpleSpecialFundsService = new SimpleSpecialFundsService();
              specialFunds = await simpleSpecialFundsService.getAllSpecialFundsSimple();
              specialFundsDataSource = 'SimpleSpecialFundsService';
              console.log(`✅ Special funds loaded via SimpleSpecialFundsService: ${specialFunds.length} records`);
            } catch (simpleError: any) {
              throw new Error(`Both services failed: ${simpleError.message}`);
            }
          } else {
            throw complexError;
          }
        }
        
        if (specialFunds.length > 0) {
          const totalBalance = specialFunds.reduce((sum, fund) => sum + (fund.specialFundsBalance || 0), 0);

          report.collections.specialFunds = {
            available: true,
            count: specialFunds.length,
            sampleRecords: specialFunds.slice(0, 3).map(fund => ({
              id: fund.id,
              allocated: fund.specialFundsAllocated || 0,
              acknowledged: fund.specialFundsAcknowledged || 0,
              balance: fund.specialFundsBalance || 0,
              lastUpdated: fund.lastUpdated?.toDate?.()?.toLocaleDateString() || fund.lastUpdated?.toLocaleDateString?.() || 'No date'
            })),
            totalBalance
          };
          
          report.summary.availableDataSources++;
          console.log(`✅ Special funds: ${specialFunds.length} records, Balance: ${totalBalance.toLocaleString()} (via ${specialFundsDataSource})`);
        } else {
          report.collections.specialFunds.error = 'No special funds records found';
          console.log('⚠️ No special funds records found');
        }
      } catch (error: any) {
        if (error.message.includes('index') || error.message.includes('requires an index')) {
          report.collections.specialFunds.error = `Firestore index required: ${error.message}`;
        } else {
          report.collections.specialFunds.error = error.message;
        }
        console.log('❌ Special funds error:', error.message);
      }

      // Generate recommendations
      report.summary.readyForAnalytics = report.summary.availableDataSources >= 1; // At least cash closes needed

      if (report.collections.cashCloses.available) {
        report.summary.recommendations.push('✅ Cash close data available - Analytics can show revenue and profit trends');
      } else {
        report.summary.recommendations.push('⚠️ Create cash close entries to enable analytics');
      }

      if (report.collections.allocations.available) {
        report.summary.recommendations.push('✅ Allocation data available - Can show purchasing manager fund tracking');
      } else if (report.collections.cashCloses.available) {
        report.summary.recommendations.push('💡 Create allocation entries to track purchasing manager funds');
      }

      if (report.collections.expenses.available) {
        report.summary.recommendations.push('✅ Expense data available - Can show expense analysis');
      } else if (report.collections.expenses.error && report.collections.expenses.error.includes('index')) {
        report.summary.recommendations.push('⚠️ Expense data requires Firestore index - click the link in the error to create it');
        report.summary.recommendations.push('📋 Alternatively, data will load using simplified queries (may be slower)');
      } else {
        report.summary.recommendations.push('💡 Add expense records to show expense breakdowns');
      }

      // Special handling for special funds
      if (report.collections.specialFunds.available) {
        // No specific recommendation needed for successful special funds
      } else if (report.collections.specialFunds.error && report.collections.specialFunds.error.includes('index')) {
        report.summary.recommendations.push('⚠️ Special funds data requires Firestore index - click the link in the error to create it');
        report.summary.recommendations.push('📋 Alternatively, special funds will load using simplified queries');
      }

      if (report.summary.availableDataSources === 0) {
        report.summary.recommendations.push('🚨 No data available - Please create cash close entries to begin');
      }

      console.log('📊 Data Availability Report completed:', {
        availableDataSources: report.summary.availableDataSources,
        totalDataSources: report.summary.totalDataSources,
        readyForAnalytics: report.summary.readyForAnalytics
      });

      return report;

    } catch (error: any) {
      console.error('❌ Error generating data availability report:', error);
      report.summary.recommendations.push(`🚨 Error checking data: ${error.message}`);
      return report;
    }
  }

  /**
   * Quick check to see if analytics dashboard should show data or empty state
   */
  static async isAnalyticsReady(): Promise<{ ready: boolean; reason: string }> {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        return { ready: false, reason: 'User not authenticated' };
      }

      const simpleCashCloseService = new SimpleCashCloseService();
      const cashCloses = await simpleCashCloseService.getAllCashClosesSimple();
      
      if (cashCloses.length === 0) {
        return { ready: false, reason: 'No cash close records found - please create cash close entries' };
      }

      const hasRevenue = cashCloses.some(close => close.totalRevenue > 0);
      if (!hasRevenue) {
        return { ready: false, reason: 'Cash close records exist but no revenue data found' };
      }

      return { ready: true, reason: `${cashCloses.length} cash close records available` };

    } catch (error: any) {
      return { ready: false, reason: `Database connection error: ${error.message}` };
    }
  }

  /**
   * Generate console report for debugging
   */
  static async logDataSummary(): Promise<void> {
    const report = await this.generateDataAvailabilityReport();
    
    console.log('\n📊 === DATA AVAILABILITY REPORT ===');
    console.log(`🕒 Generated: ${report.timestamp}`);
    console.log(`👤 User: ${report.user.role} (${report.user.uid})`);
    console.log(`📍 Branch: ${report.user.branch}`);
    console.log('\n📋 DATA SOURCES:');
    
    Object.entries(report.collections).forEach(([key, data]) => {
      const status = data.available ? '✅' : '❌';
      const count = data.count;
      const error = data.error ? ` (${data.error})` : '';
      console.log(`  ${status} ${key}: ${count} records${error}`);
    });
    
    console.log('\n💡 RECOMMENDATIONS:');
    report.summary.recommendations.forEach(rec => console.log(`  ${rec}`));
    console.log(`\n🎯 Analytics Ready: ${report.summary.readyForAnalytics ? '✅ YES' : '❌ NO'}`);
    console.log('=================================\n');
  }
}

// Export singleton instance
export const dataVerificationUtility = new DataVerificationUtility();
