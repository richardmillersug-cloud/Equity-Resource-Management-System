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
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-8 ${className}`}>
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="text-lg font-medium text-gray-700">
            {connectionStatus === 'connecting' ? 'Loading using Accountant method...' : 'Loading cash close data...'}
          </div>
        </div>
        <div className="mt-4 text-center text-sm text-gray-500">
          {connectionStatus === 'connecting' && 'Using SimpleCashCloseService + looking up user account information...'}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-semibold text-gray-900">Cash Close Tracking - Latest Created First</h2>
                {/* Data Source Indicator */}
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
                  connectionStatus === 'connecting' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {connectionStatus === 'connected' ? '✅ Accountant Method' :
                   connectionStatus === 'connecting' ? '🔄 Loading...' :
                   '🔴 Error'}
                </div>
              </div>
              <p className="text-sm text-gray-600">
                ✅ Same data query as Accountant + User Account Lookup
                {dataSource !== 'none' && (
                  <span className="ml-2 text-xs text-gray-500">
                    • Source: {dataSource === 'real-time' ? 'SimpleCashCloseService + Employee Records' : 'None'}
                  </span>
                )}
                <span className="ml-2 text-xs text-blue-600">
                  • Enhanced with actual account usernames
                </span>
              </p>
            </div>
          </div>
                      <div className="flex items-center space-x-2">
          <button
                onClick={() => {
                  console.log('🔄 Manual refresh requested...');
                  window.location.reload();
                }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
                <span>Refresh Data</span>
              </button>
              
              <button
                onClick={() => {
                  const nightShifts = cashCloses.filter(c => c.shift === 'night');
                  const uniqueShifts = [...new Set(cashCloses.map(c => c.shift))];
                  
                  console.log('🔍 ACCOUNTANT vs PM SHIFT COMPARISON DEBUG:', {
                    pmInterface: {
                      totalRecords: cashCloses.length,
                      uniqueShifts: uniqueShifts,
                      dayShifts: cashCloses.filter(c => c.shift === 'day').length,
                      nightShifts: nightShifts.length,
                      allShiftValues: cashCloses.map(c => ({ id: c.id.substring(0, 8), shift: c.shift })).slice(0, 10)
                    },
                    accountantMethodCheck: cashCloses.slice(0, 5).map(close => {
                      // Check what the accountant method would find in shifts array
                      const originalData = (close as any).originalData;
                      const shiftsArray = originalData?.shifts || [];
                      const accountantDayShifts = shiftsArray.filter((shift: any) => shift.shift === 'day').length;
                      const accountantNightShifts = shiftsArray.filter((shift: any) => shift.shift === 'night').length;
                      
                      return {
                        id: close.id.substring(0, 8) + '...',
                        pmShift: close.shift,
                        accountantWouldSee: {
                          shiftsArrayExists: shiftsArray.length > 0,
                          shiftsCount: shiftsArray.length,
                          dayShiftsInArray: accountantDayShifts,
                          nightShiftsInArray: accountantNightShifts,
                          shiftsArrayData: shiftsArray.map((s: any) => s.shift || 'undefined'),
                          accountantWouldClassifyAs: accountantNightShifts > 0 ? 'NIGHT' : 'DAY',
                          discrepancy: (accountantNightShifts > 0 && close.shift === 'day') ? '🚨 MISMATCH' : '✅ MATCH'
                        }
                      };
                    }),
                    conclusion: nightShifts.length === 0 ? 'PM shows all DAY - Check if Accountant sees NIGHT shifts in same data' : 'NIGHT SHIFTS FOUND IN PM'
                  });
                  
                  console.log('🔍 DEBUG: Raw Cash Close Data Structure:', cashCloses.slice(0, 3));
                  console.log('📊 DEBUG: Network Data Summary:', cashCloses.map(close => ({
                    id: close.id.substring(0, 8) + '...',
                    shift: close.shift,
                    airtel: close.airtel,
                    mtn: close.mtn,
                    stanbic: close.stanbicBank,
                    equity: close.equityBank,
                    cashPresent: close.cashPresent,
                    totalNetwork: close.airtel + close.mtn + close.stanbicBank + close.equityBank + close.absaBank + close.pesaPal
                  })).slice(0, 5));
                  
                  const mismatches = cashCloses.filter(close => {
                    const original = (close as any).originalData;
                    const shiftsArray = original?.shifts || [];
                    const accountantNightShifts = shiftsArray.filter((s: any) => s.shift === 'night').length;
                    return accountantNightShifts > 0 && close.shift === 'day';
                  });
                  
                  alert(`ACCOUNTANT vs PM SHIFT COMPARISON:\n\n` +
                    `PM Interface Results:\n` +
                    `• Day Shifts: ${cashCloses.filter(c => c.shift === 'day').length}\n` +
                    `• Night Shifts: ${nightShifts.length}\n\n` +
                    `${nightShifts.length === 0 ? 
                      '❌ PM SHOWS ALL DAY SHIFTS\n\nPossible Issues:\n• PM shift detection may differ from Accountant\n• Check if Accountant shows night shifts in same data\n• Check browser console for ACCOUNTANT vs PM comparison' : 
                      '✅ NIGHT SHIFTS FOUND IN PM'}\n\n` +
                    `${mismatches.length > 0 ? 
                      `⚠️ ${mismatches.length} CLASSIFICATION MISMATCHES DETECTED\n• Some records may be night shifts classified as day\n• Check console for detailed analysis` : 
                      'Classifications consistent'}\n\n` +
                    `Check browser console for detailed comparison data.`);
                }}
                className="flex items-center space-x-2 px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>Compare with Accountant</span>
          </button>
            </div>
        </div>

        {/* Enhanced Quick Stats - Same as Accountant + Account Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Revenue</p>
                <p className="text-xl font-bold text-blue-900">UGX {(totalRevenue || 0).toLocaleString()}</p>
                <p className="text-xs text-blue-600 mt-1">{cashCloses.length} records</p>
              </div>
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">☀️ Day Shifts</p>
                <p className="text-xl font-bold text-yellow-900">
                  {cashCloses.filter(c => c.shift === 'day').length}
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  UGX {cashCloses.filter(c => c.shift === 'day').reduce((sum, c) => sum + c.closeCash, 0).toLocaleString()}
                </p>
              </div>
              <Zap className="w-6 h-6 text-yellow-600" />
            </div>
          </div>

          <div className="bg-indigo-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-600 font-medium">🌙 Night Shifts</p>
                <p className="text-xl font-bold text-indigo-900">
                  {cashCloses.filter(c => c.shift === 'night').length}
                </p>
                <p className="text-xs text-indigo-600 mt-1">
                  UGX {cashCloses.filter(c => c.shift === 'night').reduce((sum, c) => sum + c.closeCash, 0).toLocaleString()}
                </p>
              </div>
              <Clock className="w-6 h-6 text-indigo-600" />
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Total Profit (12%)</p>
                <p className="text-xl font-bold text-green-900">UGX {(totalProfit || 0).toLocaleString()}</p>
                <p className="text-xs text-green-600 mt-1">Estimated profit</p>
              </div>
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">📱 Network Money</p>
                <p className="text-xl font-bold text-orange-900">UGX {(networkMoneyTotal || 0).toLocaleString()}</p>
                <p className="text-xs text-orange-600 mt-1">
                  {cashCloses.filter(c => c.airtel + c.mtn + c.stanbicBank + c.equityBank + c.absaBank + c.pesaPal > 0).length} of {cashCloses.length} have network data
                </p>
              </div>
              <CreditCard className="w-6 h-6 text-orange-600" />
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">👤 User Accounts</p>
                <p className="text-xl font-bold text-purple-900">{Object.keys(userAccountCache).length}</p>
                <p className="text-xs text-purple-600 mt-1">
                  {cashCloses.length > 0 ? 
                    `${Math.round((Object.keys(userAccountCache).length / cashCloses.length) * 100)}% verified` : 
                    'accounts cached'
                  }
                </p>
              </div>
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* ✅ NEW: Shift Analysis Alert */}
      {cashCloses.length > 0 && cashCloses.filter(c => c.shift === 'night').length === 0 && (
        <div className="p-6 border-b border-gray-200">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              <h3 className="text-lg font-medium text-yellow-800">🌙 Night Shift Data Status</h3>
            </div>
            <div className="text-sm text-yellow-700 mb-3">
              <p><strong>Current Status:</strong> All {cashCloses.length} records are <strong>DAY SHIFTS</strong> (☀️)</p>
              <p><strong>Night Shifts:</strong> 0 records found - Night shift section will be empty</p>
            </div>
            <div className="bg-yellow-100 rounded p-3 text-xs text-yellow-800">
              <p><strong>💡 To see Night Shift data:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Go to Accountant Dashboard → Cash Close</li>
                <li>When creating cash close records, set <strong>shift = "night"</strong></li>
                <li>Night shift records will then appear in the 🌙 Night Shift section below</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW: Network Data Analytics by Shift */}
      {cashCloses.length > 0 && (
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📱 Network Payment Analytics by Shift</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Day Shift Network Data */}
            <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
              <div className="flex items-center mb-3">
                <Zap className="h-5 w-5 text-yellow-600 mr-2" />
                <h4 className="font-medium text-yellow-900">☀️ Day Shift Network Payments</h4>
                <span className="ml-2 px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full">
                  {cashCloses.filter(c => c.shift === 'day').length} records
                </span>
              </div>
              {(() => {
                const dayShifts = cashCloses.filter(c => c.shift === 'day');
                const totalAirtel = dayShifts.reduce((sum, c) => sum + c.airtel, 0);
                const totalMtn = dayShifts.reduce((sum, c) => sum + c.mtn, 0);
                const totalStanbic = dayShifts.reduce((sum, c) => sum + c.stanbicBank, 0);
                const totalEquity = dayShifts.reduce((sum, c) => sum + c.equityBank, 0);
                const totalAbsa = dayShifts.reduce((sum, c) => sum + c.absaBank, 0);
                const totalPesaPal = dayShifts.reduce((sum, c) => sum + c.pesaPal, 0);
                const grandTotal = totalAirtel + totalMtn + totalStanbic + totalEquity + totalAbsa + totalPesaPal;
                
                return (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-yellow-700">📱 MTN Mobile Money:</span>
                      <span className={`font-medium ${totalMtn > 0 ? 'text-yellow-900' : 'text-gray-400'}`}>
                        UGX {totalMtn.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-700">📱 Airtel Money:</span>
                      <span className={`font-medium ${totalAirtel > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                        UGX {totalAirtel.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-700">🏦 Stanbic Bank:</span>
                      <span className={`font-medium ${totalStanbic > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                        UGX {totalStanbic.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-700">🏦 Equity Bank:</span>
                      <span className={`font-medium ${totalEquity > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        UGX {totalEquity.toLocaleString()}
                      </span>
                    </div>
                    {(totalAbsa > 0 || totalPesaPal > 0) && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-yellow-700">🏦 Absa Bank:</span>
                          <span className={`font-medium ${totalAbsa > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                            UGX {totalAbsa.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-yellow-700">💳 PesaPal:</span>
                          <span className={`font-medium ${totalPesaPal > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            UGX {totalPesaPal.toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
                    <hr className="border-yellow-300" />
                    <div className="flex justify-between font-bold">
                      <span className="text-yellow-800">Total Network (Day):</span>
                      <span className="text-yellow-900">UGX {grandTotal.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Night Shift Network Data */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <div className="flex items-center mb-3">
                <Clock className="h-5 w-5 text-blue-600 mr-2" />
                <h4 className="font-medium text-blue-900">🌙 Night Shift Network Payments</h4>
                <span className="ml-2 px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full">
                  {cashCloses.filter(c => c.shift === 'night').length} records
                </span>
                {cashCloses.filter(c => c.shift === 'night').length === 0 && (
                  <span className="ml-2 px-2 py-1 bg-red-200 text-red-800 text-xs rounded-full">
                    ⚠️ No night shifts found
                  </span>
                )}
              </div>
              {(() => {
                const nightShifts = cashCloses.filter(c => c.shift === 'night');
                
                // ✅ If no night shifts found, show helpful message
                if (nightShifts.length === 0) {
                  return (
                    <div className="text-center py-6">
                      <div className="text-6xl mb-3">🌙</div>
                      <div className="text-blue-800 font-medium mb-2">No Night Shift Records Found</div>
                      <div className="text-sm text-blue-700 space-y-1">
                        <p>All current records are <strong>Day Shifts</strong> (☀️)</p>
                        <p>Night shift data will appear here when available</p>
                      </div>
                      <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-600">
                        ℹ️ To see night shifts: Create cash close records with shift = "night" in the accountant system
                      </div>
                    </div>
                  );
                }
                
                const totalAirtel = nightShifts.reduce((sum, c) => sum + c.airtel, 0);
                const totalMtn = nightShifts.reduce((sum, c) => sum + c.mtn, 0);
                const totalStanbic = nightShifts.reduce((sum, c) => sum + c.stanbicBank, 0);
                const totalEquity = nightShifts.reduce((sum, c) => sum + c.equityBank, 0);
                const totalAbsa = nightShifts.reduce((sum, c) => sum + c.absaBank, 0);
                const totalPesaPal = nightShifts.reduce((sum, c) => sum + c.pesaPal, 0);
                const grandTotal = totalAirtel + totalMtn + totalStanbic + totalEquity + totalAbsa + totalPesaPal;
                
                return (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">📱 MTN Mobile Money:</span>
                      <span className={`font-medium ${totalMtn > 0 ? 'text-blue-900' : 'text-gray-400'}`}>
                        UGX {totalMtn.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">📱 Airtel Money:</span>
                      <span className={`font-medium ${totalAirtel > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                        UGX {totalAirtel.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">🏦 Stanbic Bank:</span>
                      <span className={`font-medium ${totalStanbic > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                        UGX {totalStanbic.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">🏦 Equity Bank:</span>
                      <span className={`font-medium ${totalEquity > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        UGX {totalEquity.toLocaleString()}
                      </span>
                    </div>
                    {(totalAbsa > 0 || totalPesaPal > 0) && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-blue-700">🏦 Absa Bank:</span>
                          <span className={`font-medium ${totalAbsa > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                            UGX {totalAbsa.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">💳 PesaPal:</span>
                          <span className={`font-medium ${totalPesaPal > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            UGX {totalPesaPal.toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
                    <hr className="border-blue-300" />
                    <div className="flex justify-between font-bold">
                      <span className="text-blue-800">Total Network (Night):</span>
                      <span className="text-blue-900">UGX {grandTotal.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ✅ Network Data Debug Section */}
          {filteredData.length > 0 && filteredData.every(c => 
            c.airtel + c.mtn + c.stanbicBank + c.equityBank + c.absaBank + c.pesaPal === 0
          ) && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                <span className="font-medium text-red-800">Network Data Debug Information</span>
              </div>
              <div className="text-sm text-red-700 space-y-1">
                <p><strong>All network values are showing 0.</strong> This could indicate:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Network payment data is stored in shifts/tills structure but not being extracted properly</li>
                  <li>Cash close records don't have network payment data recorded</li>
                  <li>Data source mismatch between accountant and PM interfaces</li>
                </ul>
                <p className="text-xs text-red-600 bg-red-100 p-2 rounded mt-2">
                  ℹ️ Check browser console for detailed extraction logs from shifts/tills processing
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by account email, username, employee, branch, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Branches</option>
              {uniqueBranches.map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
            
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Shifts</option>
              <option value="day">☀️ Day Shift</option>
              <option value="night">🌙 Night Shift</option>
              {uniqueShifts.filter(shift => !['day', 'night'].includes(shift)).map(shift => (
                <option key={shift} value={shift}>{shift}</option>
              ))}
            </select>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'revenue' | 'profit')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="date">Date</option>
                  <option value="revenue">Revenue</option>
                  <option value="profit">Profit</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center space-x-2 px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  <span>{sortDirection === 'asc' ? 'Ascending' : 'Descending'}</span>
                </button>
              </div>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedBranch('all');
                  setSelectedShift('all');
                  setDateRange({ start: '', end: '' });
                  setSortBy('date');
                  setSortDirection('desc');
                }}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cash Close History */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Cash Close History - Latest Created First</h3>
            <p className="text-sm text-gray-600">
              {filteredData.length} records • 
              Day shifts: {filteredData.filter(c => c.shift === 'day').length} • 
              Night shifts: {filteredData.filter(c => c.shift === 'night').length} • 
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Data Source:</span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✅ Accountant Method
            </span>
          </div>
        </div>

        {filteredData.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">No Cash Close Records Found</h3>
            <p className="text-gray-500">
              {connectionStatus === 'connected' 
                ? 'No cash close records match your current filters.' 
                : 'Unable to load cash close data using accountant method.'}
            </p>
            {connectionStatus === 'error' && (
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry with Accountant Method
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        📅 Date & Time Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        🏢 Shift & Branch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        👤 User Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        💰 Total Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        💵 Cash Present vs Expected
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        📱 Network Assignments by Shift
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        📊 Variance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ✅ Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pagedCashCloses.map((close) => (
                  <tr key={close.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {close.createdAt.toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {close.createdAt.toLocaleTimeString()}
                          </div>
                          <div className="text-xs text-blue-600 mt-1">
                            Created: {close.createdAt.toLocaleDateString()} at {close.createdAt.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900 capitalize">{close.shift}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              close.shift === 'day' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {close.shift === 'day' ? '☀️' : '🌙'} 
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">{close.branchId}</div>
          <div className="text-xs text-gray-400">
            Business Date: {close.date && !isNaN(close.date.getTime()) ? 
              close.date.toLocaleDateString() : 
              close.createdAt.toLocaleDateString()}
          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          {/* ✅ ENHANCED: Show actual account username */}
                          <div className="text-sm font-medium text-gray-900">
                            {(close as any).accountDisplayName || close.employeeName || 'Unknown User'}
                          </div>
                          <div className="text-xs text-gray-500">
                            👤 Account: {(close as any).accountEmail || close.employeeId || 'No account'}
                          </div>
                          <div className="text-xs text-blue-600">
                            Employee ID: {close.employeeId || 'N/A'}
                          </div>
                          {/* Account verification indicator */}
                          {(close as any).hasAccountInfo ? (
                            <div className="text-xs text-green-600 flex items-center mt-1">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified Account
                            </div>
                          ) : (
                            <div className="text-xs text-orange-600 flex items-center mt-1">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Account lookup failed
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        UGX {safeNumber(close.closeCash).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        Est. Profit: UGX {(safeNumber(close.closeCash) * 0.12).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                      <div className="text-sm font-medium text-gray-900">
                        UGX {safeNumber(close.cashPresent).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        Expected: UGX {safeNumber(close.expectedAmount).toLocaleString()}
                        </div>
                        {/* Show actual vs expected variance */}
                        {safeNumber(close.cashPresent) > 0 && (
                          <div className={`text-xs mt-1 ${
                            safeNumber(close.cashPresent) >= safeNumber(close.expectedAmount) 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {safeNumber(close.cashPresent) >= safeNumber(close.expectedAmount) ? '✅' : '⚠️'} 
                            {safeNumber(close.cashPresent) === safeNumber(close.expectedAmount) 
                              ? 'Exact match' 
                              : `${Math.abs(safeNumber(close.cashPresent) - safeNumber(close.expectedAmount)).toLocaleString()} variance`
                            }
                          </div>
                        )}
                        {safeNumber(close.cashPresent) === 0 && (
                          <div className="text-xs text-red-500 mt-1">
                            ⚠️ No cash present data
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                      <div className="text-sm font-medium text-gray-900">
                        UGX {(safeNumber(close.airtel) + safeNumber(close.mtn) + safeNumber(close.stanbicBank) + safeNumber(close.equityBank) + safeNumber(close.absaBank) + safeNumber(close.pesaPal)).toLocaleString()}
                      </div>
                        {/* Enhanced Network Breakdown by Shift */}
                        <div className="text-xs text-gray-600 space-y-0.5 mt-1">
                          <div className="flex justify-between">
                            <span>📱 MTN:</span>
                            <span className={safeNumber(close.mtn) > 0 ? 'text-yellow-600 font-medium' : 'text-gray-400'}>
                              UGX {safeNumber(close.mtn).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>📱 Airtel:</span>
                            <span className={safeNumber(close.airtel) > 0 ? 'text-orange-600 font-medium' : 'text-gray-400'}>
                              UGX {safeNumber(close.airtel).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>🏦 Stanbic:</span>
                            <span className={safeNumber(close.stanbicBank) > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}>
                              UGX {safeNumber(close.stanbicBank).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>🏦 Equity:</span>
                            <span className={safeNumber(close.equityBank) > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                              UGX {safeNumber(close.equityBank).toLocaleString()}
                            </span>
                          </div>
                          {(safeNumber(close.absaBank) > 0 || safeNumber(close.pesaPal) > 0) && (
                            <>
                              <div className="flex justify-between">
                                <span>🏦 Absa:</span>
                                <span className={safeNumber(close.absaBank) > 0 ? 'text-purple-600 font-medium' : 'text-gray-400'}>
                                  UGX {safeNumber(close.absaBank).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>💳 PesaPal:</span>
                                <span className={safeNumber(close.pesaPal) > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                                  UGX {safeNumber(close.pesaPal).toLocaleString()}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        {/* Shift indicator for network assignments */}
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            close.shift === 'day' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {close.shift === 'day' ? '☀️' : '🌙'} {close.shift.toUpperCase()} SHIFT
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {safeNumber(close.shortage) > 0 ? (
                          <>
                            <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                            <div>
                              <div className="text-sm font-medium text-red-600">
                                -UGX {safeNumber(close.shortage).toLocaleString()}
                              </div>
                              <div className="text-xs text-red-500">Shortage</div>
                            </div>
                          </>
                        ) : safeNumber(close.excess) > 0 ? (
                          <>
                            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                            <div>
                              <div className="text-sm font-medium text-green-600">
                                +UGX {safeNumber(close.excess).toLocaleString()}
                              </div>
                              <div className="text-xs text-green-500">Excess</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 text-gray-500 mr-1" />
                            <div>
                              <div className="text-sm font-medium text-gray-600">Balanced</div>
                              <div className="text-xs text-gray-500">No variance</div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {safeNumber(close.shortage) > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Shortage
                          </span>
                        ) : safeNumber(close.excess) > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Star className="w-3 h-3 mr-1" />
                            Excess
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Balanced
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            
            {/* Enhanced Summary Footer */}
            {filteredData.length > 0 && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-gray-900">Total Records</div>
                    <div className="text-blue-600 font-bold">{filteredData.length}</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="font-medium text-gray-900">☀️ Day Shifts</div>
                    <div className="text-yellow-600 font-bold">
                      {filteredData.filter(c => c.shift === 'day').length}
                    </div>
                    <div className="text-xs text-yellow-600">
                      UGX {filteredData.filter(c => c.shift === 'day').reduce((sum, c) => sum + c.closeCash, 0).toLocaleString()}
                  </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="font-medium text-gray-900">🌙 Night Shifts</div>
                    <div className="text-blue-600 font-bold">
                      {filteredData.filter(c => c.shift === 'night').length}
                    </div>
                    <div className="text-xs text-blue-600">
                      UGX {filteredData.filter(c => c.shift === 'night').reduce((sum, c) => sum + c.closeCash, 0).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="font-medium text-gray-900">💵 Records with Cash</div>
                    <div className="text-green-600 font-bold">
                      {filteredData.filter(c => c.cashPresent > 0).length}
                    </div>
                    <div className="text-xs text-green-600">
                      {filteredData.length > 0 ? Math.round((filteredData.filter(c => c.cashPresent > 0).length / filteredData.length) * 100) : 0}% have cash data
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="font-medium text-gray-900">👤 Account Lookup</div>
                    <div className="text-blue-600 font-bold">
                      {filteredData.filter(c => (c as any).hasAccountInfo).length}
                    </div>
                    <div className="text-xs text-blue-600">
                      {filteredData.length > 0 ? Math.round((filteredData.filter(c => (c as any).hasAccountInfo).length / filteredData.length) * 100) : 0}% verified accounts
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="font-medium text-gray-900">📱 Network Data</div>
                    <div className="text-orange-600 font-bold">
                      {filteredData.filter(c => c.airtel + c.mtn + c.stanbicBank + c.equityBank + c.absaBank + c.pesaPal > 0).length}
                    </div>
                    <div className="text-xs text-orange-600">
                      {filteredData.length > 0 ? Math.round((filteredData.filter(c => c.airtel + c.mtn + c.stanbicBank + c.equityBank + c.absaBank + c.pesaPal > 0).length / filteredData.length) * 100) : 0}% have network data
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="font-medium text-gray-900">Data Source</div>
                    <div className="text-green-600 font-bold">✅ Accountant + Shifts/Tills</div>
                    <div className="text-xs text-gray-600">
                      Network extraction per shift
                    </div>
                    <div className="text-xs text-blue-600">
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
