/**
 * Analytics Data Loader - Utility for testing database connectivity and data availability
 * This utility helps verify that the Analytics Dashboard can connect to real database data
 */

import { CashCloseService } from './firestore-service';
import { SimpleCashCloseService } from './firestore-service-simple';
import { autoAllocationService } from './auto-allocation-service';
import { authService } from './auth';

export interface DatabaseStatus {
  connected: boolean;
  collections: {
    cashCloses: {
      available: boolean;
      count: number;
      sampleData?: any;
      error?: string;
    };
    allocationResults: {
      available: boolean;
      count: number;
      sampleData?: any;
      error?: string;
    };
  };
  user: {
    authenticated: boolean;
    uid?: string;
    role?: string;
    branch?: string;
  };
  indexStatus: {
    cashClosesIndex: boolean;
    allocationIndex: boolean;
  };
}

export class AnalyticsDataLoader {
  /**
   * Comprehensive database connectivity and data availability check
   */
  static async verifyDatabaseConnection(): Promise<DatabaseStatus> {
    console.log('🔍 Starting database verification for Analytics Dashboard...');
    
    const status: DatabaseStatus = {
      connected: false,
      collections: {
        cashCloses: { available: false, count: 0 },
        allocationResults: { available: false, count: 0 }
      },
      user: { authenticated: false },
      indexStatus: {
        cashClosesIndex: false,
        allocationIndex: false
      }
    };

    try {
      // Check user authentication
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        status.user = {
          authenticated: true,
          uid: currentUser.uid,
          role: currentUser.role,
          branch: currentUser.branch?.name || 'Default'
        };
        console.log('✅ User authenticated:', {
          uid: currentUser.uid,
          role: currentUser.role,
          branch: currentUser.branch?.name
        });
      } else {
        status.user = { authenticated: false };
        console.log('❌ User not authenticated');
        return status;
      }

      // Test Cash Closes Collection
      try {
        console.log('🔄 Testing cash closes collection...');
        
        // Try SimpleCashCloseService first
        let cashCloses: any[] = [];
        let dataSource = '';
        
        try {
          const simpleCashCloseService = new SimpleCashCloseService();
          cashCloses = await simpleCashCloseService.getAllCashClosesSimple();
          dataSource = 'SimpleCashCloseService';
          status.indexStatus.cashClosesIndex = true;
        } catch (simpleError) {
          console.log('⚠️ SimpleCashCloseService failed, trying regular service...');
          
          try {
            const cashCloseService = new CashCloseService();
            cashCloses = await cashCloseService.getAll([]);
            dataSource = 'CashCloseService';
            status.indexStatus.cashClosesIndex = false;
          } catch (regularError) {
            throw new Error(`Both services failed: ${regularError}`);
          }
        }

        status.collections.cashCloses = {
          available: true,
          count: cashCloses.length,
          sampleData: cashCloses.length > 0 ? {
            id: cashCloses[0].id,
            date: cashCloses[0].date || 'No date',
            totalRevenue: cashCloses[0].totalRevenue || 0,
            profitAmount: cashCloses[0].profitAmount || 0,
            source: dataSource
          } : null
        };

        console.log(`✅ Cash closes loaded: ${cashCloses.length} records via ${dataSource}`);

      } catch (cashCloseError: any) {
        status.collections.cashCloses = {
          available: false,
          count: 0,
          error: cashCloseError.message
        };
        console.log('❌ Cash closes collection failed:', cashCloseError.message);
      }

      // Test Allocation Results Collection
      if (status.collections.cashCloses.available && status.collections.cashCloses.count > 0) {
        try {
          console.log('🔄 Testing allocation results collection...');
          
          // Get first cash close ID for testing
          const simpleCashCloseService = new SimpleCashCloseService();
          const testCashCloses = await simpleCashCloseService.getAllCashClosesSimple();
          
          let totalAllocations = 0;
          let sampleAllocation = null;
          
          if (testCashCloses.length > 0) {
            for (const cashClose of testCashCloses.slice(0, 3)) { // Test first 3
              try {
                const allocations = await autoAllocationService.getAllAllocationsByCashCloseId(cashClose.id);
                totalAllocations += allocations.length;
                if (allocations.length > 0 && !sampleAllocation) {
                  sampleAllocation = {
                    id: allocations[0].id,
                    cashCloseId: allocations[0].cashCloseId,
                    purchasingManagerAmount: allocations[0].purchasingManagerAmount,
                    status: allocations[0].distributionStatus?.purchasingManager || 'unknown'
                  };
                }
              } catch (allocError) {
                console.warn(`⚠️ Failed to load allocations for ${cashClose.id}:`, allocError);
              }
            }
          }

          status.collections.allocationResults = {
            available: true,
            count: totalAllocations,
            sampleData: sampleAllocation
          };
          
          status.indexStatus.allocationIndex = true;
          console.log(`✅ Allocation results loaded: ${totalAllocations} records`);

        } catch (allocationError: any) {
          status.collections.allocationResults = {
            available: false,
            count: 0,
            error: allocationError.message
          };
          console.log('❌ Allocation results collection failed:', allocationError.message);
        }
      }

      // Overall connection status
      status.connected = status.user.authenticated && 
                        (status.collections.cashCloses.available || status.collections.allocationResults.available);

      console.log('📊 Database verification complete:', {
        connected: status.connected,
        cashCloses: status.collections.cashCloses.count,
        allocations: status.collections.allocationResults.count
      });

      return status;

    } catch (error: any) {
      console.error('❌ Database verification failed:', error);
      return {
        ...status,
        connected: false
      };
    }
  }

  /**
   * Quick data summary for Analytics Dashboard
   */
  static async getDataSummary(timeRange: 'week' | 'month' | 'quarter' | 'year' = 'month') {
    console.log(`📈 Getting data summary for ${timeRange}...`);
    
    try {
      // Load cash closes
      const simpleCashCloseService = new SimpleCashCloseService();
      const allCashCloses = await simpleCashCloseService.getAllCashClosesSimple();
      
      // Filter by time range
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const filteredCashCloses = allCashCloses.filter(item => {
        const itemDate = new Date(item.createdAt?.seconds ? item.createdAt.seconds * 1000 : item.date);
        return itemDate >= startDate;
      });

      // Calculate summary metrics
      const totalRevenue = filteredCashCloses.reduce((sum, close) => sum + (close.totalRevenue || 0), 0);
      const totalProfit = filteredCashCloses.reduce((sum, close) => sum + (close.profitAmount || 0), 0);
      const totalTax = filteredCashCloses.reduce((sum, close) => sum + (close.taxAmount || 0), 0);

      const summary = {
        timeRange,
        recordCount: filteredCashCloses.length,
        totalRevenue,
        totalProfit,
        totalTax,
        avgDailyRevenue: filteredCashCloses.length > 0 ? totalRevenue / filteredCashCloses.length : 0,
        profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        dataQuality: {
          hasRevenue: filteredCashCloses.filter(c => c.totalRevenue > 0).length,
          hasProfit: filteredCashCloses.filter(c => c.profitAmount > 0).length,
          hasDate: filteredCashCloses.filter(c => c.date || c.createdAt).length
        }
      };

      console.log(`✅ Data summary for ${timeRange}:`, summary);
      return summary;

    } catch (error: any) {
      console.error('❌ Failed to get data summary:', error);
      throw error;
    }
  }

  /**
   * Test database indexes and performance
   */
  static async testDatabasePerformance() {
    console.log('⚡ Testing database performance...');
    
    const performanceResults = {
      cashClosesQuery: { duration: 0, success: false },
      allocationsQuery: { duration: 0, success: false },
      indexStatus: { cashCloses: false, allocations: false }
    };

    try {
      // Test cash closes query performance
      const cashCloseStart = performance.now();
      try {
        const simpleCashCloseService = new SimpleCashCloseService();
        const cashCloses = await simpleCashCloseService.getAllCashClosesSimple();
        performanceResults.cashClosesQuery = {
          duration: performance.now() - cashCloseStart,
          success: true
        };
        performanceResults.indexStatus.cashCloses = true;
        console.log(`✅ Cash closes query: ${performanceResults.cashClosesQuery.duration.toFixed(2)}ms`);
      } catch (error) {
        performanceResults.cashClosesQuery = {
          duration: performance.now() - cashCloseStart,
          success: false
        };
        console.log(`❌ Cash closes query failed: ${performanceResults.cashClosesQuery.duration.toFixed(2)}ms`);
      }

      // Test allocations query performance
      const allocationStart = performance.now();
      try {
        // Test with a sample allocation query
        await autoAllocationService.getAllocationByCashCloseId('test-id');
        performanceResults.allocationsQuery = {
          duration: performance.now() - allocationStart,
          success: true
        };
        performanceResults.indexStatus.allocations = true;
        console.log(`✅ Allocations query: ${performanceResults.allocationsQuery.duration.toFixed(2)}ms`);
      } catch (error) {
        performanceResults.allocationsQuery = {
          duration: performance.now() - allocationStart,
          success: false
        };
        console.log(`⚠️ Allocations query: ${performanceResults.allocationsQuery.duration.toFixed(2)}ms`);
      }

      return performanceResults;

    } catch (error: any) {
      console.error('❌ Performance test failed:', error);
      return performanceResults;
    }
  }
}

// Export singleton instance
export const analyticsDataLoader = new AnalyticsDataLoader();












