'use client';

import React, { useState, useEffect } from 'react';
import { usePagination, PaginationBar } from '../ui/Pagination';
import {
  AlertTriangle,
  Calendar,
  Building,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  BarChart3,
  PieChart,
  RefreshCw,
  Filter,
  Download,
  Eye,
  Target,
  Wallet,
  Settings,
  Star,
  CheckCircle,
  AlertCircle,
  Info,
  Search,
  ArrowUp,
  ArrowDown,
  Minus,
  Plus,
  Clock,
  MapPin,
  Users,
  Banknote,
  Smartphone,
  Zap,
  X
} from 'lucide-react';
import { CashClose, calculateProfitMetrics } from '../../lib/firebase/purchasing-manager-service';
import { SimpleCashCloseService } from '../../lib/firebase/firestore-service-simple';
import { CashCloseService } from '../../lib/firebase/firestore-service';
import { authService } from '../../lib/firebase/auth';
import { EQUITY_BRAND } from '@/components/staff/brand';
import { ExportButtons } from '@/components/ui/ExportButtons';
import type { ExportColumn } from '@/lib/export/table-export';

interface CashTrackingInterfaceProps {
  className?: string;
}

interface Metrics {
  totalRevenue: number;
  totalProfit: number;
  totalNetworkMoney: number;
  dailyAverageRevenue: number;
  profitMargin: number;
  shortageTotal: number;
  excessTotal: number;
  recentTrends: {
    revenue: 'up' | 'down' | 'stable';
    profit: 'up' | 'down' | 'stable';
  };
}

const cashCloseExportColumns: ExportColumn<CashClose>[] = [
  {
    key: 'createdAt',
    header: 'Created Date',
    value: (row) => row.createdAt?.toLocaleDateString?.() || '',
  },
  {
    key: 'createdTime',
    header: 'Created Time',
    value: (row) => row.createdAt?.toLocaleTimeString?.() || '',
  },
  {
    key: 'businessDate',
    header: 'Business Date',
    value: (row) =>
      row.date && !isNaN(row.date.getTime())
        ? row.date.toLocaleDateString()
        : row.createdAt?.toLocaleDateString?.() || '',
  },
  {
    key: 'shift',
    header: 'Shift',
    value: (row) => row.shift || '',
  },
  {
    key: 'branchId',
    header: 'Branch',
    value: (row) => row.branchId || '',
  },
  {
    key: 'account',
    header: 'Account',
    value: (row) =>
      (row as CashClose & { accountDisplayName?: string }).accountDisplayName ||
      row.employeeName ||
      'Unknown',
  },
  {
    key: 'accountEmail',
    header: 'Account Email',
    value: (row) =>
      (row as CashClose & { accountEmail?: string }).accountEmail || row.employeeId || '',
  },
  {
    key: 'revenue',
    header: 'Revenue (UGX)',
    value: (row) => Number(row.closeCash) || 0,
  },
  {
    key: 'cashPresent',
    header: 'Cash Present (UGX)',
    value: (row) => Number(row.cashPresent) || 0,
  },
  {
    key: 'expected',
    header: 'Expected (UGX)',
    value: (row) => Number(row.expectedAmount) || 0,
  },
  {
    key: 'mtn',
    header: 'MTN (UGX)',
    value: (row) => Number(row.mtn) || 0,
  },
  {
    key: 'airtel',
    header: 'Airtel (UGX)',
    value: (row) => Number(row.airtel) || 0,
  },
  {
    key: 'stanbic',
    header: 'Stanbic (UGX)',
    value: (row) => Number(row.stanbicBank) || 0,
  },
  {
    key: 'equity',
    header: 'Equity Bank (UGX)',
    value: (row) => Number(row.equityBank) || 0,
  },
  {
    key: 'absa',
    header: 'Absa (UGX)',
    value: (row) => Number(row.absaBank) || 0,
  },
  {
    key: 'pesaPal',
    header: 'PesaPal (UGX)',
    value: (row) => Number(row.pesaPal) || 0,
  },
  {
    key: 'networkTotal',
    header: 'Network Total (UGX)',
    value: (row) =>
      (Number(row.airtel) || 0) +
      (Number(row.mtn) || 0) +
      (Number(row.stanbicBank) || 0) +
      (Number(row.equityBank) || 0) +
      (Number(row.absaBank) || 0) +
      (Number(row.pesaPal) || 0),
  },
  {
    key: 'variance',
    header: 'Variance (UGX)',
    value: (row) => {
      const shortage = Number(row.shortage) || 0;
      const excess = Number(row.excess) || 0;
      if (shortage > 0) return -shortage;
      if (excess > 0) return excess;
      return 0;
    },
  },
  {
    key: 'status',
    header: 'Status',
    value: (row) => {
      if ((Number(row.shortage) || 0) > 0) return 'Shortage';
      if ((Number(row.excess) || 0) > 0) return 'Excess';
      return 'Balanced';
    },
  },
];

export default function CashTrackingInterface({ className = '' }: CashTrackingInterfaceProps) {
  // Helper function to safely format numbers
  const safeNumber = (value: any): number => {
    const num = Number(value) || 0;
    return isNaN(num) ? 0 : num;
  };

  // State variables
  const [cashCloses, setCashCloses] = useState<CashClose[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [dailyAverageRevenue, setDailyAverageRevenue] = useState(0);
  const [networkMoneyTotal, setNetworkMoneyTotal] = useState(0);
  const [filteredData, setFilteredData] = useState<CashClose[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedShift, setSelectedShift] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortBy, setSortBy] = useState<'date' | 'revenue' | 'profit'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'profit' | 'network'>('revenue');
  const [showFilters, setShowFilters] = useState(false);
  const [dataSource, setDataSource] = useState<'real-time' | 'none'>('none');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');

  // ✅ NEW: User account lookup cache
  const [userAccountCache, setUserAccountCache] = useState<{[uid: string]: {email: string, displayName?: string}}>({});

  const {
    paginatedItems: pagedCashCloses,
    currentPage: ccPage, setCurrentPage: setCcPage,
    rowsPerPage: ccRowsPerPage, setRowsPerPage: setCcRowsPerPage,
    totalPages: ccTotalPages, startIndex: ccStart, endIndex: ccEnd,
    totalItems: ccTotal,
  } = usePagination(filteredData, 10);

  // ✅ NEW: Function to lookup user account information
  const lookupUserAccounts = async (cashCloses: any[]): Promise<{[uid: string]: {email: string, displayName?: string}}> => {
    const cache: {[uid: string]: {email: string, displayName?: string}} = {};
    
    try {
      const uniqueUserIds = [...new Set(cashCloses.map(close => 
        close.employeeId || close.createdBy || close.uid
      ))].filter(Boolean);
      
      console.log(`👤 Looking up ${uniqueUserIds.length} user accounts...`);
      
      // Query Firebase Auth users collection or employees collection
      await Promise.all(uniqueUserIds.map(async (userId) => {
        try {
          // Try to get user info from employees collection first
          const { firestoreServices } = await import('../../lib/firebase/firestore-service');
          const employee = await firestoreServices.employee.getById(userId);
          
          if (employee) {
            cache[userId] = {
              email: employee.email || `${employee.firstName}@company.com`,
              displayName: `${employee.firstName} ${employee.lastName}`.trim() || employee.firstName
            };
            console.log(`✅ Found employee account: ${cache[userId].displayName} (${cache[userId].email})`);
          } else {
            // Fallback to user ID if no employee record found
            cache[userId] = {
              email: `${userId}@unknown.com`,
              displayName: userId
            };
            console.log(`⚠️ Employee record not found for: ${userId}`);
          }
        } catch (error) {
          console.warn(`Failed to lookup user ${userId}:`, error);
          cache[userId] = {
            email: `${userId}@unknown.com`,
            displayName: userId || 'Unknown User'
          };
        }
      }));
      
      console.log(`✅ User account lookup complete: ${Object.keys(cache).length} accounts cached`);
      return cache;
      
    } catch (error) {
      console.error('Error looking up user accounts:', error);
      return cache;
    }
  };

  useEffect(() => {
    const loadCashCloseData = async () => {
      setLoading(true);
      setConnectionStatus('connecting');
      
      try {
        console.log('🔥 PM Interface: Loading cash closes using ACCOUNTANT METHOD...');
        console.log('📊 Using SimpleCashCloseService.getAllCashClosesSimple() - same as accountant');
        
        let cashClosesData: any[] = [];
        
        // ✅ EXACT SAME APPROACH AS ACCOUNTANT: Try simple service first
        try {
          const simpleCashCloseService = new SimpleCashCloseService();
          cashClosesData = await simpleCashCloseService.getAllCashClosesSimple();
          console.log('✅ PM Interface: Cash closes loaded with simple service:', cashClosesData?.length || 0);
        } catch (simpleError) {
          console.warn('⚠️ PM Interface: Simple service failed, trying regular service...', simpleError);
          
          // ✅ EXACT SAME FALLBACK AS ACCOUNTANT: Use CashCloseService
          const cashCloseService = new CashCloseService();
          const currentUser = authService.getCurrentUser();
          
          if (currentUser?.employee?.branchId) {
            // Get cash closes for the user's branch
            cashClosesData = await cashCloseService.getBranchCashCloses(currentUser.employee.branchId);
          } else {
            // Get all cash closes if no specific branch
            cashClosesData = await cashCloseService.getAll();
          }
          console.log('✅ PM Interface: Cash closes loaded with regular service:', cashClosesData?.length || 0);
        }
        
        // ✅ SAME SORTING AS ACCOUNTANT: Sort by createdAt descending (latest first)
        const sortedCashCloses = (cashClosesData || []).sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA; // Latest created first
        });
        
        // ✅ ENHANCED: Extract network data from shifts/tills like accountant does  
        const convertedCashCloses: CashClose[] = sortedCashCloses.map(close => {
          console.log(`🔍 Processing cash close ${close.id} for network data...`);
          
          // ✅ Extract network payments from shifts/tills structure (same as accountant)
          let extractedAirtel = 0;
          let extractedMtn = 0;
          let extractedStanbic = 0;
          let extractedEquity = 0;
          let extractedAbsa = 0;
          let extractedPesaPal = 0;
          let extractedCashPresent = 0;
          
          // Check if we have shifts data to extract from
          if (close.shifts && Array.isArray(close.shifts)) {
            console.log(`📊 Found ${close.shifts.length} shifts in cash close ${close.id}`);
            
            close.shifts.forEach((shift: any, shiftIndex: number) => {
              console.log(`🔄 Processing shift ${shiftIndex} (${shift.shift || 'unknown'}) in cash close ${close.id}`);
              
              if (shift.tills && Array.isArray(shift.tills)) {
                shift.tills.forEach((till: any, tillIndex: number) => {
                  // Extract cash present
                  extractedCashPresent += till.cashPresent || 0;
                  
                  // Extract network payments
                  if (till.networkPayments && Array.isArray(till.networkPayments)) {
                    console.log(`💳 Found ${till.networkPayments.length} network payments in till ${tillIndex}`);
                    
                    till.networkPayments.forEach((payment: any) => {
                      const amount = payment.amount || 0;
                      const provider = (payment.serviceProvider || payment.provider || '').toLowerCase();
                      
                      if (provider.includes('airtel')) {
                        extractedAirtel += amount;
                      } else if (provider.includes('mtn')) {
                        extractedMtn += amount;
                      } else if (provider.includes('stanbic')) {
                        extractedStanbic += amount;
                      } else if (provider.includes('equity')) {
                        extractedEquity += amount;
                      } else if (provider.includes('absa')) {
                        extractedAbsa += amount;
                      } else if (provider.includes('pesapal')) {
                        extractedPesaPal += amount;
                      }
                      
                      console.log(`💰 Network payment: ${provider} = UGX ${amount.toLocaleString()}`);
                    });
                  }
                });
              }
            });
          }
          
          // Use extracted values if available, otherwise fallback to direct fields
          const finalAirtel = extractedAirtel > 0 ? extractedAirtel : (close.airtel || 0);
          const finalMtn = extractedMtn > 0 ? extractedMtn : (close.mtn || 0);
          const finalStanbic = extractedStanbic > 0 ? extractedStanbic : (close.stanbicBank || 0);
          const finalEquity = extractedEquity > 0 ? extractedEquity : (close.equityBank || 0);
          const finalAbsa = extractedAbsa > 0 ? extractedAbsa : (close.absaBank || 0);
          const finalPesaPal = extractedPesaPal > 0 ? extractedPesaPal : (close.pesaPal || 0);
          const finalCashPresent = extractedCashPresent > 0 ? extractedCashPresent : (close.cashPresent || close.totalActualCash || close.actualAmount || 0);
          
          console.log(`💰 Network Data Summary for ${close.id}:`, {
            shift: close.shift || 'day',
            extractedFromShifts: {
              airtel: extractedAirtel,
              mtn: extractedMtn,
              stanbic: extractedStanbic,
              equity: extractedEquity,
              cashPresent: extractedCashPresent
            },
            directFields: {
              airtel: close.airtel || 0,
              mtn: close.mtn || 0,
              stanbic: close.stanbicBank || 0,
              equity: close.equityBank || 0,
              cashPresent: close.cashPresent || 0
            },
            finalValues: {
              airtel: finalAirtel,
              mtn: finalMtn,
              stanbic: finalStanbic,
              equity: finalEquity,
              cashPresent: finalCashPresent,
              totalNetwork: finalAirtel + finalMtn + finalStanbic + finalEquity + finalAbsa + finalPesaPal
            }
          });
          
          // ✅ CRITICAL FIX: Extract shift data same as ACCOUNTANT
          // Accountant checks record.shifts array for shift.shift values
          let actualShift = 'day'; // Default
          if (close.shifts && Array.isArray(close.shifts)) {
            // Check if there are any night shifts in the shifts array
            const hasNightShifts = close.shifts.some((shift: any) => shift.shift === 'night');
            const hasDayShifts = close.shifts.some((shift: any) => shift.shift === 'day');
            
            if (hasNightShifts && !hasDayShifts) {
              actualShift = 'night'; // Pure night shift record
            } else if (hasNightShifts && hasDayShifts) {
              actualShift = 'day'; // Mixed shifts - prioritize day for now
            } else {
              actualShift = 'day'; // Default or only day shifts
            }
            
            console.log(`🌙 Shift Analysis for ${close.id}:`, {
              shiftsArray: close.shifts.map((s: any) => s.shift),
              hasNightShifts,
              hasDayShifts,
              finalShift: actualShift
            });
          } else {
            // Fallback to top-level shift field if no shifts array
            actualShift = close.shift || 'day';
            console.log(`⚠️ No shifts array for ${close.id}, using top-level shift: ${actualShift}`);
          }

          return {
            id: close.id,
            employeeId: close.employeeId || close.createdBy || 'unknown',
            // ✅ ENHANCED: Better user account mapping from accountant data
            employeeName: close.employeeName || close.createdByName || close.createdBy || close.employeeId || 'Unknown User Account',
            branchId: close.branchId || 'unknown', 
            // ✅ FIXED: Use proper shift detection same as accountant
            shift: actualShift as 'day' | 'night',
            closeCash: close.totalRevenue || close.closeCash || 0,
            actualAmount: close.totalActualCash || close.actualAmount || 0,
            expectedAmount: close.totalExpectedCash || close.expectedAmount || 0,
            // ✅ ENHANCED: Use extracted cash present data
            cashPresent: finalCashPresent,
            // ✅ ENHANCED: Use extracted network payment data per shift
            airtel: finalAirtel,
            mtn: finalMtn,
            stanbicBank: finalStanbic,
            equityBank: finalEquity,
            absaBank: finalAbsa,
            pesaPal: finalPesaPal,
            shortage: close.totalShortage || close.shortage || 0,
            excess: close.totalExcess || close.excess || 0,
            profitMargin: close.profitAmount || (close.totalRevenue || 0) * 0.12,
            // ✅ FIXED: Safer date conversion to prevent "Invalid Date"
            date: (() => {
              try {
                const dateValue = close.date || close.cashCloseDate || close.createdAt;
                const parsedDate = new Date(dateValue);
                return !isNaN(parsedDate.getTime()) ? parsedDate : new Date(close.createdAt);
              } catch {
                return new Date(close.createdAt);
              }
            })(),
            time: close.time || new Date(close.createdAt).toLocaleTimeString(),
            createdAt: new Date(close.createdAt),
            updatedAt: new Date(close.updatedAt || close.createdAt)
          };
        });
        
        console.log('✅ PM Interface: Using ACCOUNTANT DATA SOURCE - Network Data Per Shift:', {
          totalRecords: convertedCashCloses.length,
          dayShifts: convertedCashCloses.filter(c => c.shift === 'day').length,
          nightShifts: convertedCashCloses.filter(c => c.shift === 'night').length,
          latestRecord: convertedCashCloses.length > 0 ? {
            id: convertedCashCloses[0].id.substring(0, 8) + '...',
            createdAt: convertedCashCloses[0].createdAt.toLocaleString(),
            revenue: convertedCashCloses[0].closeCash,
            shift: convertedCashCloses[0].shift,
            employeeName: convertedCashCloses[0].employeeName,
            cashPresent: convertedCashCloses[0].cashPresent,
            networkBreakdown: {
              airtel: convertedCashCloses[0].airtel,
              mtn: convertedCashCloses[0].mtn,
              stanbic: convertedCashCloses[0].stanbicBank,
              equity: convertedCashCloses[0].equityBank,
              total: convertedCashCloses[0].airtel + convertedCashCloses[0].mtn + convertedCashCloses[0].stanbicBank + convertedCashCloses[0].equityBank
            }
          } : null,
          dataSource: 'SimpleCashCloseService + Shifts/Tills Extraction',
          sorting: 'createdAt DESC (latest first)',
          networkDataAnalysis: {
            recordsWithCashPresent: convertedCashCloses.filter(c => c.cashPresent > 0).length,
            recordsWithNetworkMoney: convertedCashCloses.filter(c => 
              c.airtel + c.mtn + c.stanbicBank + c.equityBank + c.absaBank + c.pesaPal > 0
            ).length,
            dayShiftNetworkTotal: convertedCashCloses.filter(c => c.shift === 'day').reduce((sum, c) => 
              sum + c.airtel + c.mtn + c.stanbicBank + c.equityBank + c.absaBank + c.pesaPal, 0),
            nightShiftNetworkTotal: convertedCashCloses.filter(c => c.shift === 'night').reduce((sum, c) => 
              sum + c.airtel + c.mtn + c.stanbicBank + c.equityBank + c.absaBank + c.pesaPal, 0)
          }
        });
        
        // ✅ NEW: Lookup user account information for actual usernames
        console.log('👤 Looking up user account information...');
        const userCache = await lookupUserAccounts(convertedCashCloses);
        setUserAccountCache(userCache);
        
        // ✅ ENHANCED: Add actual account info to cash closes
        const enhancedCashCloses = convertedCashCloses.map((close, index) => ({
          ...close,
          accountEmail: userCache[close.employeeId]?.email || 'No account found',
          accountDisplayName: userCache[close.employeeId]?.displayName || close.employeeName || 'Unknown User',
          hasAccountInfo: !!userCache[close.employeeId],
          // ✅ Store reference to original data for debugging
          originalData: sortedCashCloses[index]
        }));
        
        setCashCloses(enhancedCashCloses as CashClose[]);
          setDataSource('real-time');
          setConnectionStatus('connected');
          setLoading(false);
          
        if (enhancedCashCloses.length > 0) {
          calculateMetrics(enhancedCashCloses as CashClose[]);
          console.log('✅ PM Interface: Metrics calculated with user account data');
          console.log('👤 User Account Lookup Results:', {
            totalUsers: Object.keys(userCache).length,
            sampleUserAccounts: Object.entries(userCache).slice(0, 3).map(([uid, info]) => ({
              uid: uid.substring(0, 8) + '...',
              displayName: info.displayName,
              email: info.email
            }))
          });
          
          // ✅ ENHANCED SHIFT DATA ANALYSIS: Compare with Accountant method
          console.log('📊 ACCOUNTANT vs PM SHIFT COMPARISON:', {
            totalRecords: enhancedCashCloses.length,
            pmShiftBreakdown: {
              dayShifts: enhancedCashCloses.filter(c => c.shift === 'day').length,
              nightShifts: enhancedCashCloses.filter(c => c.shift === 'night').length,
              unknownShifts: enhancedCashCloses.filter(c => !c.shift || (c.shift !== 'day' && c.shift !== 'night')).length
            },
            uniqueShifts: [...new Set(enhancedCashCloses.map(c => c.shift))],
            detailedShiftAnalysis: enhancedCashCloses.slice(0, 5).map(close => {
              // Get the original close data to check shifts array
              const originalClose = (close as any).originalData;
              const shiftsArray = originalClose?.shifts || [];
              const accountantDayShifts = shiftsArray.filter((shift: any) => shift.shift === 'day').length;
              const accountantNightShifts = shiftsArray.filter((shift: any) => shift.shift === 'night').length;
              
              return {
                id: close.id.substring(0, 8) + '...',
                pmShift: close.shift,
                originalShiftsArray: shiftsArray.map((s: any) => s.shift || 'undefined'),
                originalTopLevelShift: originalClose?.shift || 'No top-level shift',
                hasShiftsArray: shiftsArray.length > 0,
                shiftsCount: shiftsArray.length,
                accountantWouldClassify: {
                  dayShifts: accountantDayShifts,
                  nightShifts: accountantNightShifts,
                  classification: accountantNightShifts > 0 ? 'NIGHT' : 'DAY',
                  discrepancy: (accountantNightShifts > 0 && close.shift === 'day') ? 'MISMATCH DETECTED' : 'MATCH'
                },
                createdAt: close.createdAt.toLocaleDateString(),
                revenue: close.closeCash
              };
            }),
            nightShiftAnalysis: {
              pmNightCount: enhancedCashCloses.filter(c => c.shift === 'night').length,
              nightRevenue: enhancedCashCloses.filter(c => c.shift === 'night').reduce((sum, c) => sum + c.closeCash, 0),
              nightNetworkMoney: enhancedCashCloses.filter(c => c.shift === 'night').reduce((sum, c) => 
                sum + c.airtel + c.mtn + c.stanbicBank + c.equityBank + c.absaBank + c.pesaPal, 0)
            },
            accountantMethodComparison: 'PM now uses same logic as accountant - checking shifts array for shift.shift values'
          });
          } else {
          console.log('📋 PM Interface: No cash close records found in cashCloses collection');
            setTotalRevenue(0);
            setTotalProfit(0);
            setDailyAverageRevenue(0);
            setNetworkMoneyTotal(0);
          }

      } catch (error) {
        console.error('❌ PM Interface: Error loading cash closes (accountant method):', error);
        setCashCloses([]);
        setLoading(false);
        setConnectionStatus('error');
        setDataSource('none');
      }
    };

    loadCashCloseData();
    
    // ✅ Optionally set up periodic refresh to match accountant behavior
    const refreshInterval = setInterval(() => {
      if (!loading) {
        console.log('🔄 PM Interface: Periodic refresh (matching accountant pattern)...');
        loadCashCloseData();
      }
    }, 30000); // Refresh every 30 seconds
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  // ✅ ENHANCED: Calculate metrics from cash closes with network data analysis  
  const calculateMetrics = (data: CashClose[]) => {
    if (!data || data.length === 0) {
      setTotalRevenue(0);
      setTotalProfit(0);
      setDailyAverageRevenue(0);
      setNetworkMoneyTotal(0);
      return;
    }

    // Calculate total revenue
    const revenue = data.reduce((sum, close) => sum + safeNumber(close.closeCash), 0);
    
    // ✅ ENHANCED: Calculate total network money with detailed breakdown
    const networkBreakdown = data.reduce((totals, close) => {
      return {
        airtel: totals.airtel + safeNumber(close.airtel),
        mtn: totals.mtn + safeNumber(close.mtn),
        stanbicBank: totals.stanbicBank + safeNumber(close.stanbicBank),
        equityBank: totals.equityBank + safeNumber(close.equityBank),
        absaBank: totals.absaBank + safeNumber(close.absaBank),
        pesaPal: totals.pesaPal + safeNumber(close.pesaPal)
      };
    }, { airtel: 0, mtn: 0, stanbicBank: 0, equityBank: 0, absaBank: 0, pesaPal: 0 });
    
    const networkMoney = Object.values(networkBreakdown).reduce((sum, amount) => sum + amount, 0);

    // Calculate profit using the imported function from purchasing manager service
    let estimatedProfit = 0;
    try {
      const profitMetrics = calculateProfitMetrics(data);
      estimatedProfit = profitMetrics?.estimatedProfit || 0;
    } catch (error) {
      console.warn('Error calculating profit metrics:', error);
      // Fallback calculation: 12% of revenue
      estimatedProfit = revenue * 0.12;
    }
    
    // Calculate daily average manually
    const dailyAverage = data.length > 0 ? revenue / data.length : 0;
    
    // ✅ ENHANCED: Log network data analysis
    console.log('📊 Network Money Calculation Summary:', {
      totalRecords: data.length,
      networkBreakdown,
      totalNetworkMoney: networkMoney,
      recordsWithNetworkData: data.filter(c => 
        c.airtel + c.mtn + c.stanbicBank + c.equityBank + c.absaBank + c.pesaPal > 0
      ).length,
      dayShiftNetwork: data.filter(c => c.shift === 'day').reduce((sum, c) => 
        sum + c.airtel + c.mtn + c.stanbicBank + c.equityBank + c.absaBank + c.pesaPal, 0),
      nightShiftNetwork: data.filter(c => c.shift === 'night').reduce((sum, c) => 
        sum + c.airtel + c.mtn + c.stanbicBank + c.equityBank + c.absaBank + c.pesaPal, 0)
    });
    
    setTotalRevenue(revenue || 0);
    setTotalProfit(estimatedProfit || 0);
    setDailyAverageRevenue(dailyAverage || 0);
    setNetworkMoneyTotal(networkMoney || 0);
  };

  // Filter and search logic
  useEffect(() => {
    let filtered = [...cashCloses];

    // ✅ ENHANCED: Search filter now includes account information
    if (searchTerm) {
      filtered = filtered.filter(close => 
        close.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (close as any).accountDisplayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (close as any).accountEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        close.branchId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        close.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        close.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Branch filter
    if (selectedBranch !== 'all') {
      filtered = filtered.filter(close => close.branchId === selectedBranch);
    }

    // Shift filter
    if (selectedShift !== 'all') {
      filtered = filtered.filter(close => close.shift === selectedShift);
    }

    // Date range filter
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(close => {
        const closeDate = new Date(close.date);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        return closeDate >= startDate && closeDate <= endDate;
      });
    }

    // Sort data
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'revenue':
          aValue = a.closeCash || 0;
          bValue = b.closeCash || 0;
          break;
        case 'profit':
          aValue = (a.closeCash || 0) * 0.12; // 12% profit margin
          bValue = (b.closeCash || 0) * 0.12;
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      if (sortDirection === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    setFilteredData(filtered);
  }, [cashCloses, searchTerm, selectedBranch, selectedShift, dateRange, sortBy, sortDirection]);

  // Get unique branches and shifts for filter options
  const uniqueBranches = [...new Set(cashCloses.map(close => close.branchId))].filter(Boolean);
  const uniqueShifts = [...new Set(cashCloses.map(close => close.shift))].filter(Boolean);

  if (loading) {
    return (
      <div className={`w-full min-w-0 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-8 ${className}`}>
        <div className="flex items-center justify-center gap-3">
          <div
            className="h-7 w-7 animate-spin rounded-full border-b-2 sm:h-8 sm:w-8"
            style={{ borderColor: EQUITY_BRAND.purple }}
          />
          <div className="text-sm font-medium text-gray-700 sm:text-lg">
            {connectionStatus === 'connecting' ? 'Loading…' : 'Loading cash close data…'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full min-w-0 overflow-hidden rounded-lg border bg-white shadow-sm ${className}`}
      style={{ borderColor: EQUITY_BRAND.purpleSoft }}
    >
      {/* Header */}
      <div
        className="border-b p-3 sm:p-4 lg:p-6"
        style={{
          borderColor: EQUITY_BRAND.purpleSoft,
          background: `linear-gradient(135deg, ${EQUITY_BRAND.purpleSoft} 0%, #ffffff 55%, ${EQUITY_BRAND.orangeSoft} 100%)`,
        }}
      >
        <div className="mb-3 flex min-w-0 items-start gap-2 sm:mb-4 sm:items-center sm:gap-3">
          <div
            className="shrink-0 rounded-lg p-1.5 sm:p-2"
            style={{ backgroundColor: EQUITY_BRAND.greenSoft }}
          >
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" style={{ color: EQUITY_BRAND.green }} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 lg:gap-3">
              <h2 className="text-base font-semibold sm:text-lg lg:text-xl" style={{ color: EQUITY_BRAND.purple }}>
                Cash Close Tracking
              </h2>
              <span className="text-[10px] font-normal text-gray-500 sm:text-xs lg:text-sm">
                Latest Created First
              </span>
              <div
                className="rounded-full px-2 py-0.5 text-[10px] font-medium sm:py-1 sm:text-xs"
                style={
                  connectionStatus === 'connected'
                    ? { backgroundColor: EQUITY_BRAND.greenSoft, color: EQUITY_BRAND.green }
                    : connectionStatus === 'connecting'
                      ? { backgroundColor: EQUITY_BRAND.orangeSoft, color: EQUITY_BRAND.orange }
                      : { backgroundColor: '#FEE2E2', color: '#DC2626' }
                }
              >
                {connectionStatus === 'connected'
                  ? 'Connected'
                  : connectionStatus === 'connecting'
                    ? 'Loading…'
                    : 'Error'}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats — 2 cols phone, 3 tablet, 5 desktop */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-5 lg:gap-3">
          <div className="min-w-0 rounded-lg p-2.5 sm:p-3" style={{ backgroundColor: EQUITY_BRAND.purpleSoft }}>
            <p className="text-[10px] font-medium leading-tight sm:text-xs" style={{ color: EQUITY_BRAND.purple }}>
              Total Revenue
            </p>
            <p
              className="mt-1 break-words text-xs font-bold leading-snug tabular-nums sm:text-sm lg:text-base"
              style={{ color: EQUITY_BRAND.purpleDark }}
            >
              UGX {(totalRevenue || 0).toLocaleString()}
            </p>
            <p className="mt-1 text-[10px] leading-tight sm:text-xs" style={{ color: EQUITY_BRAND.purple }}>
              {cashCloses.length} records
            </p>
          </div>

          <div className="min-w-0 rounded-lg p-2.5 sm:p-3" style={{ backgroundColor: EQUITY_BRAND.orangeSoft }}>
            <p className="text-[10px] font-medium leading-tight sm:text-xs" style={{ color: EQUITY_BRAND.orange }}>
              Day Shifts
            </p>
            <p className="mt-1 text-base font-bold leading-snug tabular-nums sm:text-lg" style={{ color: EQUITY_BRAND.orange }}>
              {cashCloses.filter((c) => c.shift === 'day').length}
            </p>
            <p
              className="mt-1 break-words text-[11px] font-medium leading-snug tabular-nums sm:text-xs"
              style={{ color: EQUITY_BRAND.orange }}
            >
              UGX{' '}
              {cashCloses
                .filter((c) => c.shift === 'day')
                .reduce((sum, c) => sum + c.closeCash, 0)
                .toLocaleString()}
            </p>
          </div>

          <div className="min-w-0 rounded-lg p-2.5 sm:p-3" style={{ backgroundColor: EQUITY_BRAND.purpleSoft }}>
            <p className="text-[10px] font-medium leading-tight sm:text-xs" style={{ color: EQUITY_BRAND.purple }}>
              Night Shifts
            </p>
            <p className="mt-1 text-base font-bold leading-snug tabular-nums sm:text-lg" style={{ color: EQUITY_BRAND.purpleDark }}>
              {cashCloses.filter((c) => c.shift === 'night').length}
            </p>
            <p
              className="mt-1 break-words text-[11px] font-medium leading-snug tabular-nums sm:text-xs"
              style={{ color: EQUITY_BRAND.purple }}
            >
              UGX{' '}
              {cashCloses
                .filter((c) => c.shift === 'night')
                .reduce((sum, c) => sum + c.closeCash, 0)
                .toLocaleString()}
            </p>
          </div>

          <div className="min-w-0 rounded-lg p-2.5 sm:p-3" style={{ backgroundColor: EQUITY_BRAND.greenSoft }}>
            <p className="text-[10px] font-medium leading-tight sm:text-xs" style={{ color: EQUITY_BRAND.green }}>
              Total Profit (12%)
            </p>
            <p
              className="mt-1 break-words text-xs font-bold leading-snug tabular-nums sm:text-sm lg:text-base"
              style={{ color: EQUITY_BRAND.green }}
            >
              UGX {(totalProfit || 0).toLocaleString()}
            </p>
            <p className="mt-1 text-[10px] leading-tight sm:text-xs" style={{ color: EQUITY_BRAND.green }}>
              Estimated profit
            </p>
          </div>

          <div className="col-span-2 min-w-0 rounded-lg p-2.5 sm:col-span-1 sm:p-3" style={{ backgroundColor: EQUITY_BRAND.orangeSoft }}>
            <p className="text-[10px] font-medium leading-tight sm:text-xs" style={{ color: EQUITY_BRAND.orange }}>
              Network Money
            </p>
            <p
              className="mt-1 break-words text-xs font-bold leading-snug tabular-nums sm:text-sm lg:text-base"
              style={{ color: EQUITY_BRAND.orange }}
            >
              UGX {(networkMoneyTotal || 0).toLocaleString()}
            </p>
            <p className="mt-1 text-[10px] leading-tight sm:text-xs" style={{ color: EQUITY_BRAND.orange }}>
              {
                cashCloses.filter(
                  (c) =>
                    c.airtel + c.mtn + c.stanbicBank + c.equityBank + c.absaBank + c.pesaPal > 0
                ).length
              }{' '}
              of {cashCloses.length} have network data
            </p>
          </div>
        </div>
      </div>

      {/* Shift Analysis Alert */}
      {cashCloses.length > 0 && cashCloses.filter((c) => c.shift === 'night').length === 0 && (
        <div className="border-b border-gray-200 p-3 sm:p-4 lg:p-6">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 sm:p-4">
            <div className="mb-2 flex items-center sm:mb-3">
              <AlertTriangle className="mr-2 h-4 w-4 shrink-0 text-yellow-600 sm:h-5 sm:w-5" />
              <h3 className="text-sm font-medium text-yellow-800 sm:text-lg">Night Shift Data Status</h3>
            </div>
            <div className="mb-2 text-xs text-yellow-700 sm:mb-3 sm:text-sm">
              <p>
                <strong>Current Status:</strong> All {cashCloses.length} records are <strong>DAY SHIFTS</strong>
              </p>
              <p>
                <strong>Night Shifts:</strong> 0 records found
              </p>
            </div>
            <div className="rounded bg-yellow-100 p-2 text-[11px] text-yellow-800 sm:p-3 sm:text-xs">
              <p>
                <strong>To see Night Shift data:</strong> create cash close records with shift = &quot;night&quot; in
                Accountant → Cash Close.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Network Data Analytics by Shift */}
      {cashCloses.length > 0 && (
        <div className="border-b border-gray-200 p-3 sm:p-4">
          <h3
            className="mb-2 text-sm font-semibold sm:text-base"
            style={{ color: EQUITY_BRAND.purple }}
          >
            Network Payment Analytics by Shift
          </h3>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
            {/* Day Shift Network Data */}
            <div
              className="rounded-md border p-2.5 sm:p-3"
              style={{ backgroundColor: EQUITY_BRAND.orangeSoft, borderColor: EQUITY_BRAND.orange }}
            >
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" style={{ color: EQUITY_BRAND.orange }} />
                <h4 className="text-xs font-medium sm:text-sm" style={{ color: EQUITY_BRAND.orange }}>
                  Day Shift Network
                </h4>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: '#fff', color: EQUITY_BRAND.orange }}
                >
                  {cashCloses.filter((c) => c.shift === 'day').length} records
                </span>
              </div>
              {(() => {
                const dayShifts = cashCloses.filter((c) => c.shift === 'day');
                const totalAirtel = dayShifts.reduce((sum, c) => sum + c.airtel, 0);
                const totalMtn = dayShifts.reduce((sum, c) => sum + c.mtn, 0);
                const totalStanbic = dayShifts.reduce((sum, c) => sum + c.stanbicBank, 0);
                const totalEquity = dayShifts.reduce((sum, c) => sum + c.equityBank, 0);
                const totalAbsa = dayShifts.reduce((sum, c) => sum + c.absaBank, 0);
                const totalPesaPal = dayShifts.reduce((sum, c) => sum + c.pesaPal, 0);
                const grandTotal =
                  totalAirtel + totalMtn + totalStanbic + totalEquity + totalAbsa + totalPesaPal;

                return (
                  <div className="space-y-0.5 text-[11px] sm:text-xs">
                    <div className="flex justify-between gap-2">
                      <span style={{ color: EQUITY_BRAND.orange }}>MTN</span>
                      <span className="font-medium text-gray-800">UGX {totalMtn.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span style={{ color: EQUITY_BRAND.orange }}>Airtel</span>
                      <span className="font-medium text-gray-800">UGX {totalAirtel.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span style={{ color: EQUITY_BRAND.orange }}>Stanbic</span>
                      <span className="font-medium text-gray-800">UGX {totalStanbic.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span style={{ color: EQUITY_BRAND.orange }}>Equity</span>
                      <span className="font-medium text-gray-800">UGX {totalEquity.toLocaleString()}</span>
                    </div>
                    {(totalAbsa > 0 || totalPesaPal > 0) && (
                      <>
                        <div className="flex justify-between gap-2">
                          <span style={{ color: EQUITY_BRAND.orange }}>Absa</span>
                          <span className="font-medium text-gray-800">UGX {totalAbsa.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span style={{ color: EQUITY_BRAND.orange }}>PesaPal</span>
                          <span className="font-medium text-gray-800">UGX {totalPesaPal.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                    <div
                      className="mt-1 flex justify-between gap-2 border-t pt-1 font-semibold"
                      style={{ borderColor: EQUITY_BRAND.orange }}
                    >
                      <span style={{ color: EQUITY_BRAND.orange }}>Total (Day)</span>
                      <span style={{ color: EQUITY_BRAND.orange }}>UGX {grandTotal.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Night Shift Network Data */}
            <div
              className="rounded-md border p-2.5 sm:p-3"
              style={{ backgroundColor: EQUITY_BRAND.purpleSoft, borderColor: EQUITY_BRAND.purple }}
            >
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" style={{ color: EQUITY_BRAND.purple }} />
                <h4 className="text-xs font-medium sm:text-sm" style={{ color: EQUITY_BRAND.purple }}>
                  Night Shift Network
                </h4>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ backgroundColor: '#fff', color: EQUITY_BRAND.purple }}
                >
                  {cashCloses.filter((c) => c.shift === 'night').length} records
                </span>
              </div>
              {(() => {
                const nightShifts = cashCloses.filter((c) => c.shift === 'night');

                if (nightShifts.length === 0) {
                  return (
                    <p className="py-2 text-center text-[11px] text-gray-500 sm:text-xs">
                      No night shift records
                    </p>
                  );
                }

                const totalAirtel = nightShifts.reduce((sum, c) => sum + c.airtel, 0);
                const totalMtn = nightShifts.reduce((sum, c) => sum + c.mtn, 0);
                const totalStanbic = nightShifts.reduce((sum, c) => sum + c.stanbicBank, 0);
                const totalEquity = nightShifts.reduce((sum, c) => sum + c.equityBank, 0);
                const totalAbsa = nightShifts.reduce((sum, c) => sum + c.absaBank, 0);
                const totalPesaPal = nightShifts.reduce((sum, c) => sum + c.pesaPal, 0);
                const grandTotal =
                  totalAirtel + totalMtn + totalStanbic + totalEquity + totalAbsa + totalPesaPal;

                return (
                  <div className="space-y-0.5 text-[11px] sm:text-xs">
                    <div className="flex justify-between gap-2">
                      <span style={{ color: EQUITY_BRAND.purple }}>MTN</span>
                      <span className="font-medium text-gray-800">UGX {totalMtn.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span style={{ color: EQUITY_BRAND.purple }}>Airtel</span>
                      <span className="font-medium text-gray-800">UGX {totalAirtel.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span style={{ color: EQUITY_BRAND.purple }}>Stanbic</span>
                      <span className="font-medium text-gray-800">UGX {totalStanbic.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span style={{ color: EQUITY_BRAND.purple }}>Equity</span>
                      <span className="font-medium text-gray-800">UGX {totalEquity.toLocaleString()}</span>
                    </div>
                    {(totalAbsa > 0 || totalPesaPal > 0) && (
                      <>
                        <div className="flex justify-between gap-2">
                          <span style={{ color: EQUITY_BRAND.purple }}>Absa</span>
                          <span className="font-medium text-gray-800">UGX {totalAbsa.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span style={{ color: EQUITY_BRAND.purple }}>PesaPal</span>
                          <span className="font-medium text-gray-800">UGX {totalPesaPal.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                    <div
                      className="mt-1 flex justify-between gap-2 border-t pt-1 font-semibold"
                      style={{ borderColor: EQUITY_BRAND.purple }}
                    >
                      <span style={{ color: EQUITY_BRAND.purple }}>Total (Night)</span>
                      <span style={{ color: EQUITY_BRAND.purple }}>UGX {grandTotal.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {filteredData.length > 0 &&
            filteredData.every(
              (c) =>
                c.airtel + c.mtn + c.stanbicBank + c.equityBank + c.absaBank + c.pesaPal === 0
            ) && (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-[11px] text-red-700 sm:text-xs">
                All network values are 0 — check shifts/tills extraction in the console.
              </div>
            )}
        </div>
      )}

      {/* Filters */}
      <div className="border-b border-gray-200 p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col gap-3">
          <div className="relative w-full min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              enterKeyHint="search"
              placeholder="Search account, employee, branch…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2"
              style={{ ['--tw-ring-color' as string]: EQUITY_BRAND.purple }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="min-w-0 rounded-lg border border-gray-300 px-2.5 py-2.5 text-sm sm:min-w-[8rem]"
            >
              <option value="all">All Branches</option>
              {uniqueBranches.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>

            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="min-w-0 rounded-lg border border-gray-300 px-2.5 py-2.5 text-sm sm:min-w-[8rem]"
            >
              <option value="all">All Shifts</option>
              <option value="day">Day Shift</option>
              <option value="night">Night Shift</option>
              {uniqueShifts
                .filter((shift) => !['day', 'night'].includes(shift))
                .map((shift) => (
                  <option key={shift} value={shift}>
                    {shift}
                  </option>
                ))}
            </select>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-200 sm:col-span-1 sm:px-4"
            >
              <Filter className="h-4 w-4" />
              <span>{showFilters ? 'Hide Filters' : 'More Filters'}</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-3 rounded-lg bg-gray-50 p-3 sm:mt-4 sm:p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 sm:text-sm">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'revenue' | 'profit')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                >
                  <option value="date">Date</option>
                  <option value="revenue">Revenue</option>
                  <option value="profit">Profit</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
              >
                {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                <span>{sortDirection === 'asc' ? 'Ascending' : 'Descending'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedBranch('all');
                  setSelectedShift('all');
                  setDateRange({ start: '', end: '' });
                  setSortBy('date');
                  setSortDirection('desc');
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cash Close History */}
      <div className="p-3 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h3 className="text-base font-semibold sm:text-lg" style={{ color: EQUITY_BRAND.purple }}>
              Cash Close History
              <span className="mt-0.5 block text-xs font-normal text-gray-500 sm:mt-0 sm:ml-2 sm:inline">
                Latest Created First
              </span>
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs sm:gap-2 sm:text-sm">
              <span
                className="rounded-md px-2 py-1"
                style={{ backgroundColor: EQUITY_BRAND.purpleSoft, color: EQUITY_BRAND.purple }}
              >
                {filteredData.length} records
              </span>
              <span
                className="rounded-md px-2 py-1"
                style={{ backgroundColor: EQUITY_BRAND.orangeSoft, color: EQUITY_BRAND.orange }}
              >
                Day: {filteredData.filter((c) => c.shift === 'day').length}
              </span>
              <span
                className="rounded-md px-2 py-1"
                style={{ backgroundColor: EQUITY_BRAND.purpleSoft, color: EQUITY_BRAND.purple }}
              >
                Night: {filteredData.filter((c) => c.shift === 'night').length}
              </span>
              <span className="rounded-md bg-gray-50 px-2 py-1 text-gray-500">
                Updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
            <ExportButtons
              rows={filteredData}
              columns={cashCloseExportColumns}
              filename="till-cash-closes"
              title="Till Cash Close History"
              subtitle={`${filteredData.length} records · Day ${filteredData.filter((c) => c.shift === 'day').length} · Night ${filteredData.filter((c) => c.shift === 'night').length}`}
              className="w-full sm:w-auto"
            />
            <span
              className="inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ backgroundColor: EQUITY_BRAND.greenSoft, color: EQUITY_BRAND.green }}
            >
              Accountant Method
            </span>
          </div>
        </div>

        {filteredData.length === 0 ? (
          <div className="px-2 py-12 text-center">
            <div className="mb-4 text-5xl text-gray-400 sm:text-6xl">📊</div>
            <h3 className="mb-2 text-base font-medium text-gray-600 sm:text-lg">No Cash Close Records Found</h3>
            <p className="text-sm text-gray-500">
              {connectionStatus === 'connected'
                ? 'No cash close records match your current filters.'
                : 'Unable to load cash close data using accountant method.'}
            </p>
            {connectionStatus === 'error' && (
              <button
                onClick={() => window.location.reload()}
                className="mt-4 rounded-lg px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: EQUITY_BRAND.purple }}
              >
                Retry with Accountant Method
              </button>
            )}
          </div>
        ) : (
          <div className="w-full min-w-0">
            <p className="mb-2 text-[11px] text-gray-500 md:hidden">Swipe sideways to see all columns →</p>
            <div
              className="overflow-x-auto overscroll-x-contain rounded-lg border [-webkit-overflow-scrolling:touch]"
              style={{ borderColor: EQUITY_BRAND.purpleSoft }}
            >
              <table className="w-full min-w-[560px] border-collapse text-left text-xs sm:min-w-[720px] sm:text-sm lg:min-w-[920px]">
                <thead>
                  <tr
                    className="border-b text-[10px] uppercase tracking-wide sm:text-xs"
                    style={{
                      backgroundColor: EQUITY_BRAND.purpleSoft,
                      borderColor: EQUITY_BRAND.purpleSoft,
                      color: EQUITY_BRAND.purple,
                    }}
                  >
                    <th className="sticky left-0 z-10 whitespace-nowrap px-2 py-2 font-medium sm:px-4 sm:py-2.5" style={{ backgroundColor: EQUITY_BRAND.purpleSoft }}>
                      Created
                    </th>
                    <th className="whitespace-nowrap px-2 py-2 font-medium sm:px-4 sm:py-2.5">Shift</th>
                    <th className="hidden whitespace-nowrap px-2 py-2 font-medium sm:table-cell sm:px-4 sm:py-2.5">Account</th>
                    <th className="whitespace-nowrap px-2 py-2 font-medium text-right sm:px-4 sm:py-2.5">Revenue</th>
                    <th className="hidden whitespace-nowrap px-2 py-2 font-medium text-right md:table-cell sm:px-4 sm:py-2.5">Cash / Exp</th>
                    <th className="hidden whitespace-nowrap px-2 py-2 font-medium text-right lg:table-cell sm:px-4 sm:py-2.5">Network</th>
                    <th className="whitespace-nowrap px-2 py-2 font-medium text-right sm:px-4 sm:py-2.5">Variance</th>
                    <th className="whitespace-nowrap px-2 py-2 font-medium sm:px-4 sm:py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pagedCashCloses.map((close) => {
                    const networkTotal =
                      safeNumber(close.airtel) +
                      safeNumber(close.mtn) +
                      safeNumber(close.stanbicBank) +
                      safeNumber(close.equityBank) +
                      safeNumber(close.absaBank) +
                      safeNumber(close.pesaPal);
                    const businessDate =
                      close.date && !isNaN(close.date.getTime())
                        ? close.date.toLocaleDateString()
                        : close.createdAt.toLocaleDateString();
                    const shortage = safeNumber(close.shortage);
                    const excess = safeNumber(close.excess);
                    const accountName =
                      (close as any).accountDisplayName || close.employeeName || 'Unknown User';
                    const accountEmail =
                      (close as any).accountEmail || close.employeeId || 'No account';

                    return (
                      <tr key={close.id} className="align-top hover:bg-gray-50/80">
                        <td
                          className="sticky left-0 z-[1] whitespace-nowrap bg-white px-2 py-2.5 sm:px-4 sm:py-3"
                        >
                          <div className="font-medium text-gray-900">
                            {close.createdAt.toLocaleDateString()}
                          </div>
                          <div className="text-[10px] text-gray-500 sm:text-xs">
                            {close.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2.5 sm:px-4 sm:py-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize"
                              style={
                                close.shift === 'day'
                                  ? { backgroundColor: EQUITY_BRAND.orangeSoft, color: EQUITY_BRAND.orange }
                                  : { backgroundColor: EQUITY_BRAND.purpleSoft, color: EQUITY_BRAND.purple }
                              }
                            >
                              {close.shift === 'day' ? 'Day' : 'Night'}
                            </span>
                          </div>
                          <div className="max-w-[5.5rem] truncate text-[10px] text-gray-500 sm:max-w-none sm:text-xs">
                            {close.branchId || '—'}
                          </div>
                          <div className="text-[10px] text-gray-400 sm:text-[11px]">Biz {businessDate}</div>
                        </td>
                        <td className="hidden max-w-[160px] px-2 py-2.5 sm:table-cell sm:px-4 sm:py-3">
                          <div className="truncate font-medium text-gray-900" title={accountName}>
                            {accountName}
                          </div>
                          <div className="truncate text-xs text-gray-500" title={accountEmail}>
                            {accountEmail}
                          </div>
                          {(close as any).hasAccountInfo ? (
                            <div className="mt-0.5 text-[11px]" style={{ color: EQUITY_BRAND.green }}>Verified</div>
                          ) : (
                            <div className="mt-0.5 text-[11px]" style={{ color: EQUITY_BRAND.orange }}>Unverified</div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-right sm:px-4 sm:py-3">
                          <div className="font-medium tabular-nums" style={{ color: EQUITY_BRAND.purpleDark }}>
                            {safeNumber(close.closeCash).toLocaleString()}
                          </div>
                        </td>
                        <td className="hidden whitespace-nowrap px-2 py-2.5 text-right md:table-cell sm:px-4 sm:py-3">
                          <div className="font-medium tabular-nums text-gray-900">
                            {safeNumber(close.cashPresent).toLocaleString()}
                          </div>
                          <div className="text-[10px] tabular-nums text-gray-500 sm:text-xs">
                            Exp {safeNumber(close.expectedAmount).toLocaleString()}
                          </div>
                        </td>
                        <td className="hidden min-w-[120px] px-2 py-2.5 text-right lg:table-cell sm:px-4 sm:py-3">
                          <div className="font-medium tabular-nums" style={{ color: EQUITY_BRAND.orange }}>
                            {networkTotal.toLocaleString()}
                          </div>
                          <div className="mt-1 space-y-0.5 text-[10px] text-gray-500 sm:text-[11px]">
                            <div>MTN {safeNumber(close.mtn).toLocaleString()}</div>
                            <div>Airtel {safeNumber(close.airtel).toLocaleString()}</div>
                            <div>Stanbic {safeNumber(close.stanbicBank).toLocaleString()}</div>
                            <div>Equity {safeNumber(close.equityBank).toLocaleString()}</div>
                            {(safeNumber(close.absaBank) > 0 || safeNumber(close.pesaPal) > 0) && (
                              <>
                                <div>Absa {safeNumber(close.absaBank).toLocaleString()}</div>
                                <div>PesaPal {safeNumber(close.pesaPal).toLocaleString()}</div>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2.5 text-right sm:px-4 sm:py-3">
                          {shortage > 0 ? (
                            <div className="font-medium tabular-nums text-red-600">
                              -{shortage.toLocaleString()}
                            </div>
                          ) : excess > 0 ? (
                            <div className="font-medium tabular-nums" style={{ color: EQUITY_BRAND.green }}>
                              +{excess.toLocaleString()}
                            </div>
                          ) : (
                            <div className="font-medium text-gray-600">—</div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2.5 sm:px-4 sm:py-3">
                          {shortage > 0 ? (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800 sm:text-xs">
                              Shortage
                            </span>
                          ) : excess > 0 ? (
                            <span
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-xs"
                              style={{ backgroundColor: EQUITY_BRAND.orangeSoft, color: EQUITY_BRAND.orange }}
                            >
                              Excess
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-xs"
                              style={{ backgroundColor: EQUITY_BRAND.greenSoft, color: EQUITY_BRAND.green }}
                            >
                              Balanced
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 overflow-x-auto">
              <PaginationBar
                currentPage={ccPage}
                totalPages={ccTotalPages}
                rowsPerPage={ccRowsPerPage}
                startIndex={ccStart}
                endIndex={ccEnd}
                totalItems={ccTotal}
                onPageChange={setCcPage}
                onRowsPerPageChange={setCcRowsPerPage}
              />
            </div>

            {filteredData.length > 0 && (
              <div
                className="mt-4 rounded-xl p-3 sm:mt-6 sm:p-4"
                style={{ backgroundColor: EQUITY_BRAND.purpleSoft }}
              >
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                  <div className="text-center">
                    <div className="font-medium text-gray-900">Total Records</div>
                    <div className="font-bold" style={{ color: EQUITY_BRAND.purple }}>{filteredData.length}</div>
                  </div>

                  <div className="text-center">
                    <div className="font-medium text-gray-900">Day Shifts</div>
                    <div className="font-bold" style={{ color: EQUITY_BRAND.orange }}>
                      {filteredData.filter((c) => c.shift === 'day').length}
                    </div>
                    <div className="truncate text-xs" style={{ color: EQUITY_BRAND.orange }}>
                      UGX{' '}
                      {filteredData
                        .filter((c) => c.shift === 'day')
                        .reduce((sum, c) => sum + c.closeCash, 0)
                        .toLocaleString()}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="font-medium text-gray-900">Night Shifts</div>
                    <div className="font-bold" style={{ color: EQUITY_BRAND.purple }}>
                      {filteredData.filter((c) => c.shift === 'night').length}
                    </div>
                    <div className="truncate text-xs" style={{ color: EQUITY_BRAND.purple }}>
                      UGX{' '}
                      {filteredData
                        .filter((c) => c.shift === 'night')
                        .reduce((sum, c) => sum + c.closeCash, 0)
                        .toLocaleString()}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="font-medium text-gray-900">With Cash</div>
                    <div className="font-bold" style={{ color: EQUITY_BRAND.green }}>
                      {filteredData.filter((c) => c.cashPresent > 0).length}
                    </div>
                    <div className="text-xs" style={{ color: EQUITY_BRAND.green }}>
                      {filteredData.length > 0
                        ? Math.round(
                            (filteredData.filter((c) => c.cashPresent > 0).length /
                              filteredData.length) *
                              100
                          )
                        : 0}
                      % have cash data
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="font-medium text-gray-900">Account Lookup</div>
                    <div className="font-bold" style={{ color: EQUITY_BRAND.purple }}>
                      {filteredData.filter((c) => (c as any).hasAccountInfo).length}
                    </div>
                    <div className="text-xs" style={{ color: EQUITY_BRAND.purple }}>
                      {filteredData.length > 0
                        ? Math.round(
                            (filteredData.filter((c) => (c as any).hasAccountInfo).length /
                              filteredData.length) *
                              100
                          )
                        : 0}
                      % verified
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="font-medium text-gray-900">Network Data</div>
                    <div className="font-bold" style={{ color: EQUITY_BRAND.orange }}>
                      {
                        filteredData.filter(
                          (c) =>
                            c.airtel +
                              c.mtn +
                              c.stanbicBank +
                              c.equityBank +
                              c.absaBank +
                              c.pesaPal >
                            0
                        ).length
                      }
                    </div>
                    <div className="text-xs" style={{ color: EQUITY_BRAND.orange }}>
                      {filteredData.length > 0
                        ? Math.round(
                            (filteredData.filter(
                              (c) =>
                                c.airtel +
                                  c.mtn +
                                  c.stanbicBank +
                                  c.equityBank +
                                  c.absaBank +
                                  c.pesaPal >
                                0
                            ).length /
                              filteredData.length) *
                              100
                          )
                        : 0}
                      % have network
                    </div>
                  </div>

                  <div className="col-span-2 text-center sm:col-span-1 xl:col-span-1">
                    <div className="font-medium text-gray-900">Data Source</div>
                    <div className="font-bold" style={{ color: EQUITY_BRAND.green }}>Accountant + Shifts</div>
                    <div className="text-xs" style={{ color: EQUITY_BRAND.purple }}>
                      {Object.keys(userAccountCache).length} accounts cached
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 
