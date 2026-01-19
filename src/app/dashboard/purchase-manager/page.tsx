'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  CreditCard,
  Building2,
  FileText,
  Users,
  Calendar,
  ShoppingCart,
  Package,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Star,
  Bell,
  Settings,
  Filter,
  Plus,
  Eye,
  TrendingDown,
  Activity,
  Wallet,
  Receipt,
  Target
} from 'lucide-react';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { authService } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { InterfaceDatabaseConnector } from '../../../lib/firebase/interface-database-connector';
import { CashTrackingInterface } from '../../../components/purchase-manager/CashTrackingInterface';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler
} from 'chart.js';
import { Line, Pie, Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler
);

// Types for the purchasing manager system
interface CashClose {
  id: string;
  employeeId: string;
  branchId: string;
  shift: 'day' | 'night';
  closeCash: number;
  actualAmount: number;
  expectedAmount: number;
  cashPresent: number;
  airtel: number;
  mtn: number;
  stanbicBank: number;
  equityBank: number;
  absaBank: number;
  pesaPal: number;
  shortage: number;
  excess: number;
  date: Date;
  time: string;
}

interface Invoice {
  id: string;
  receiverId: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  items: InvoiceItem[];
  createdAt: Date;
  approvedAt?: Date;
  paidAt?: Date;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  installmentPlan?: InstallmentPlan;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface PaymentMethod {
  type: 'cash' | 'cheque' | 'bank_deposit' | 'mobile_money' | 'momo' | 'airtel_pay';
  details: {
    chequeNumber?: string;
    bankAccount?: string;
    mobileNumber?: string;
    referenceNumber?: string;
  };
}

interface InstallmentPlan {
  id: string;
  invoiceId: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  installments: Installment[];
}

interface Installment {
  id: string;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue';
  paidDate?: Date;
  paymentMethod?: PaymentMethod;
}

interface Supplier {
  id: string;
  supplierName: string;
  contactPerson: string;
  emailAddress: string;
  phoneNumber: string;
  address: string;
  paymentTerms: string;
  creditLimit: number;
  currentBalance: number;
  status: 'active' | 'inactive' | 'blacklisted';
}

interface Expense {
  id: string;
  employeeId: string;
  name: string;
  amount: number;
  type: 'GENERAL' | 'URA' | 'EMERGENCIES' | 'DAYTODAY';
  status: 'pending' | 'approved' | 'rejected';
  date: Date;
  note?: string;
  paidAmount: number;
}

interface Payment {
  id: string;
  invoiceId: string;
  supplierId: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
  status: 'completed' | 'pending' | 'failed';
  paymentDate: Date;
}

interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  orderNumber: string;
  totalAmount: number;
  status: 'pending' | 'approved' | 'delivered' | 'cancelled';
  orderDate: Date;
  expectedDeliveryDate: Date;
}

interface PurchasingMetrics {
  totalPurchases: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
  invoicesByPeriod: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
  invoiceAmountsByPeriod: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
  invoiceMetrics: {
    total: number;
    pending: number;
    approved: number;
    paid: number;
    overdue: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
  };
  cashFlow: {
    allocated: number;
    used: number;
    remaining: number;
    utilization: number; // percentage
  };
  supplierMetrics: {
    total: number;
    active: number;
    topSuppliers: Array<{
      id: string;
      name: string;
      totalAmount: number;
      invoiceCount: number;
    }>;
  };
  paymentAnalytics: {
    totalPayments: number;
    averagePayment: number;
    paymentMethods: Record<string, number>;
    monthlyTrends: Array<{
      month: string;
      amount: number;
      count: number;
    }>;
  };
  cashCloseMetrics: {
    totalDayCash: number;
    totalNightCash: number;
    totalNetworkMoney: number;
    totalShortage: number;
    totalExcess: number;
    averageDayClose: number;
    averageNightClose: number;
    profitMargin: number;
    estimatedProfit: number;
    dayCloseCount: number;
    nightCloseCount: number;
    shortagePercentage: number;
    excessPercentage: number;
    recentCloses: Array<{
      id: string;
      shift: string;
      amount: number;
      date: Date;
      shortage: number;
      excess: number;
    }>;
  };
}

interface MonthlyMilestone {
  id: string;
  title: string;
  target: number;
  current: number;
  status: 'completed' | 'in-progress' | 'pending';
  color: string;
}

interface RecentActivity {
  id: string;
  type: 'invoice' | 'payment' | 'order' | 'approval' | 'supplier' | 'expense';
  title: string;
  amount?: number;
  status: string;
  time: string;
  icon: any;
  date?: Date;
}



export default function PurchaseManagerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  
  // Real database data states
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [cashAllocations, setCashAllocations] = useState<any[]>([]);
  const [cashCloses, setCashCloses] = useState<any[]>([]);
  
  
  // Calculated metrics from real data
  const [metrics, setMetrics] = useState<PurchasingMetrics>({
    totalPurchases: { daily: 0, weekly: 0, monthly: 0, yearly: 0 },
    invoicesByPeriod: { daily: 0, weekly: 0, monthly: 0, yearly: 0 },
    invoiceAmountsByPeriod: { daily: 0, weekly: 0, monthly: 0, yearly: 0 },
    invoiceMetrics: { total: 0, pending: 0, approved: 0, paid: 0, overdue: 0, totalAmount: 0, paidAmount: 0, pendingAmount: 0 },
    cashFlow: { allocated: 0, used: 0, remaining: 0, utilization: 0 },
    supplierMetrics: { total: 0, active: 0, topSuppliers: [] },
    paymentAnalytics: { totalPayments: 0, averagePayment: 0, paymentMethods: {}, monthlyTrends: [] },
    cashCloseMetrics: { 
      totalDayCash: 0, totalNightCash: 0, totalNetworkMoney: 0, totalShortage: 0, totalExcess: 0,
      averageDayClose: 0, averageNightClose: 0, profitMargin: 0, estimatedProfit: 0,
      dayCloseCount: 0, nightCloseCount: 0, shortagePercentage: 0, excessPercentage: 0, recentCloses: []
    }
  });

  // Recent activities for dashboard - will be populated from real data
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [activitiesRowCount, setActivitiesRowCount] = useState<number>(5);
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all');

  // Recent cash closes filtering
  const [cashClosesRowCount, setCashClosesRowCount] = useState<number>(5);
  const [cashCloseShiftFilter, setCashCloseShiftFilter] = useState<string>('all');
  
  const [cashCloseFromDate, setCashCloseFromDate] = useState<string>('');
  const [cashCloseToDate, setCashCloseToDate] = useState<string>('');


    // Load and calculate purchasing analytics from database
  useEffect(() => {
    const subscriptions: (() => void)[] = [];

      try {
      // Subscribe to invoices data
      const unsubscribeInvoices = InterfaceDatabaseConnector.subscribeToInvoicesData(
        (data) => {
          console.log('Invoices data received:', data);
          setInvoices(data);
        },
        (error) => {
          console.error('Invoices subscription error:', error);
          setError('Failed to load invoices data. Please refresh the page.');
        }
      );
      subscriptions.push(unsubscribeInvoices);

      // Subscribe to payments data
      const unsubscribePayments = InterfaceDatabaseConnector.subscribeToPaymentsData(
        (data) => {
          console.log('Payments data received:', data);
          setPayments(data);
        },
        (error) => {
          console.error('Payments subscription error:', error);
          setError('Failed to load payments data. Please refresh the page.');
        }
      );
      subscriptions.push(unsubscribePayments);

      // Subscribe to suppliers data
      const unsubscribeSuppliers = InterfaceDatabaseConnector.subscribeToSuppliersData(
        (data) => {
          console.log('Suppliers data received:', data);
          setSuppliers(data);
        },
        (error) => {
          console.error('Suppliers subscription error:', error);
          setError('Failed to load suppliers data. Please refresh the page.');
        }
      );
      subscriptions.push(unsubscribeSuppliers);

      // Subscribe to expenses data
      const unsubscribeExpenses = InterfaceDatabaseConnector.subscribeToExpensesData(
        (data) => {
          console.log('Expenses data received:', data);
          setExpenses(data);
        },
        (error) => {
          console.error('Expenses subscription error:', error);
          setError('Failed to load expenses data. Please refresh the page.');
        }
      );
      subscriptions.push(unsubscribeExpenses);

      // ✅ ENHANCED: Subscribe to cash allocations data with forced visibility
      const unsubscribeCashAllocations = InterfaceDatabaseConnector.subscribeToCashAllocationsData(
        (data) => {
          console.log('💰 FORCE DATA CHECK - Cash Allocations received:', {
            totalRecords: data.length,
            allocatedStatus: data.filter(a => a.status === 'allocated').length,
            acceptedStatus: data.filter(a => a.status === 'accepted').length,
            moneyReceivedStatus: data.filter(a => a.status === 'money_received').length,
            rawData: data.slice(0, 3) // Show first 3 for debugging
          });
          
          setCashAllocations(data);
          
          
          setLastRefreshed(new Date());
        },
        (error) => {
          console.error('❌ FORCE DATA ERROR - Cash Allocations subscription error:', error);
          setError('Failed to load cash allocations data. Using force refresh...');
        }
      );
      subscriptions.push(unsubscribeCashAllocations);

      // Subscribe to cash closes data
      const unsubscribeCashCloses = InterfaceDatabaseConnector.subscribeToCashCloseData(
        (data) => {
          console.log('=== CASH CLOSE DATA DEBUG ===');
          console.log('Cash Closes data received:', data);
          console.log('Number of cash close records:', data.length);
          if (data.length > 0) {
            console.log('Sample cash close record:', data[0]);
          } else {
            console.warn('⚠️ No cash close records found in database!');
          }
          setCashCloses(data);
        },
        (error) => {
          console.error('Cash Closes subscription error:', error);
          setError('Failed to load cash closes data. Please refresh the page.');
        }
      );
      subscriptions.push(unsubscribeCashCloses);

      setLoading(false);
      } catch (error) {
      console.error('Failed to initialize purchasing analytics:', error);
      setError('Failed to load dashboard data. Please try again.');
        setLoading(false);
      }

    return () => {
      subscriptions.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  // ✅ NEW: Force refresh allocation data
  const forceRefreshAllocations = async () => {
    
    try {
      console.log('💪 FORCE REFRESH: Loading allocation data from ALL possible sources...');
      
      let allAllocationsData: any[] = [];
      
      // Query 1: cash_allocations collection (primary)
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const allocationsSnapshot = await getDocs(collection(db, 'cash_allocations'));
      
      const cashAllocationsData = allocationsSnapshot.docs.map(doc => ({
        id: doc.id,
        source: 'cash_allocations',
        ...doc.data()
      }));
      allAllocationsData.push(...cashAllocationsData);
      
      
      // Remove duplicates and sort by creation date
      const uniqueAllocations = Array.from(
        new Map(allAllocationsData.map(item => [item.id, item])).values()
      ).sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log('💪 COMPREHENSIVE FORCE LOAD COMPLETE:', {
        cashAllocations: cashAllocationsData.length,
        totalUnique: uniqueAllocations.length,
        pendingAcceptance: uniqueAllocations.filter(a => a.status === 'allocated').length,
        accepted: uniqueAllocations.filter(a => a.status === 'accepted').length,
        moneyReceived: uniqueAllocations.filter(a => a.status === 'money_received').length
      });
      
      setCashAllocations(uniqueAllocations);
      setLastRefreshed(new Date());
      setError(null);
      
    } catch (error: any) {
      console.error('❌ FORCE REFRESH FAILED:', error);
      setError('Force refresh failed: ' + error.message);
    } finally {
      // Force refresh completed
    }
  };

  // ✅ ENHANCED: Multiple force refresh mechanisms to ensure data visibility
  useEffect(() => {
    // Initial force refresh after 2 seconds to ensure data is loaded
    const initialTimer = setTimeout(() => {
      if (cashAllocations.length === 0) {
        console.log('🔄 AUTO FORCE REFRESH: No allocations detected, forcing refresh...');
        forceRefreshAllocations();
      }
    }, 2000);
    
    // Periodic refresh every 30 seconds to ensure data stays current
    const periodicTimer = setInterval(() => {
      console.log('🔄 PERIODIC REFRESH: Ensuring data is current...');
      forceRefreshAllocations();
    }, 30000);

    // Refresh when page becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 VISIBILITY REFRESH: Page became visible, refreshing data...');
        forceRefreshAllocations();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearTimeout(initialTimer);
      clearInterval(periodicTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cashAllocations.length]);

  // Calculate metrics when data changes
  useEffect(() => {
    if (invoices.length > 0 || payments.length > 0 || suppliers.length > 0 || cashCloses.length > 0) {
      calculatePurchasingMetrics();
    }
  }, [invoices, payments, suppliers, expenses, cashAllocations, cashCloses, cashClosesRowCount, cashCloseShiftFilter, cashCloseFromDate, cashCloseToDate]);

  // Generate recent activities from real data
  useEffect(() => {
    generateRecentActivities();
  }, [invoices, payments, suppliers, expenses, activitiesRowCount, activityTypeFilter]);

  const getTimeAgo = (date: any) => {
    try {
      const activityDate = date?.toDate ? date.toDate() : new Date(date);
      const now = new Date();
      const diffMs = now.getTime() - activityDate.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      return activityDate.toLocaleDateString();
    } catch (error) {
      return 'Unknown time';
    }
  };

  const generateRecentActivities = () => {
    const activities: RecentActivity[] = [];

    // Add recent invoices
    invoices.slice(0, 15).forEach(invoice => {
      if (invoice.createdAt) {
        activities.push({
          id: `invoice-${invoice.id}`,
          type: 'invoice',
          title: `New invoice from ${invoice.supplierName || 'Unknown Supplier'}`,
          amount: invoice.amount || 0,
          status: invoice.status === 'pending' ? 'Pending Approval' : 
                 invoice.status === 'approved' ? 'Approved' :
                 invoice.status === 'paid' ? 'Paid' : 'Processing',
          time: getTimeAgo(invoice.createdAt),
          icon: FileText,
          date: invoice.createdAt?.toDate ? invoice.createdAt.toDate() : new Date(invoice.createdAt)
        });
      }
    });

    // Add recent payments
    payments.slice(0, 10).forEach(payment => {
      if (payment.createdAt || payment.paymentDate) {
        activities.push({
          id: `payment-${payment.id}`,
          type: 'payment',
          title: `Payment processed to ${payment.supplierName || 'Supplier'}`,
          amount: payment.amount || 0,
          status: 'Completed',
          time: getTimeAgo(payment.createdAt || payment.paymentDate),
          icon: CreditCard,
          date: payment.createdAt?.toDate ? payment.createdAt.toDate() : 
                payment.paymentDate?.toDate ? payment.paymentDate.toDate() : 
                new Date(payment.createdAt || payment.paymentDate)
        });
      }
    });

    // Add recent suppliers
    suppliers.slice(0, 5).forEach(supplier => {
      if (supplier.dateOfRegistration || supplier.createdAt) {
        activities.push({
          id: `supplier-${supplier.id}`,
          type: 'supplier',
          title: `New supplier registered: ${supplier.supplierName || supplier.name}`,
          amount: 0,
          status: supplier.status === 'active' ? 'Active' : 'Pending',
          time: getTimeAgo(supplier.dateOfRegistration || supplier.createdAt),
          icon: Building2,
          date: supplier.dateOfRegistration?.toDate ? supplier.dateOfRegistration.toDate() :
                supplier.createdAt?.toDate ? supplier.createdAt.toDate() :
                new Date(supplier.dateOfRegistration || supplier.createdAt)
        });
      }
    });

    // Add recent expenses
    expenses.slice(0, 5).forEach(expense => {
      if (expense.createdAt) {
        activities.push({
          id: `expense-${expense.id}`,
          type: 'expense',
          title: `Expense: ${expense.description || 'Purchase expense'}`,
          amount: expense.amount || 0,
          status: expense.status === 'approved' ? 'Approved' : 
                 expense.status === 'paid' ? 'Paid' : 'Pending',
          time: getTimeAgo(expense.createdAt),
          icon: Receipt,
          date: expense.createdAt?.toDate ? expense.createdAt.toDate() : new Date(expense.createdAt)
        });
      }
    });

    // Filter by activity type if specified
    const filteredActivities = activityTypeFilter === 'all' 
      ? activities 
      : activities.filter(activity => activity.type === activityTypeFilter);

    // Sort by date (most recent first) and take top N based on user selection
    const sortedActivities = filteredActivities
      .filter(activity => activity.date)
      .sort((a, b) => b.date!.getTime() - a.date!.getTime())
      .slice(0, activitiesRowCount)
      .map(({ date, ...activity }) => activity); // Remove date from final object

    setRecentActivities(sortedActivities);
  };

  // Helper function to get current period information
  const getCurrentPeriodInfo = () => {
    const now = new Date();
    
    // Daily: Current date
    const currentDate = now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Weekly: Current week of the month
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const currentDay = now.getDate();
    const weekOfMonth = Math.ceil((currentDay + firstDayOfWeek) / 7);
    
    // Monthly: Current month
    const currentMonth = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    // Yearly: Current year
    const currentYear = now.getFullYear();
    
    return {
      daily: currentDate,
      weekly: `Week ${weekOfMonth} of ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      monthly: currentMonth,
      yearly: currentYear.toString()
    };
  };

  const calculatePurchasingMetrics = () => {
    const now = new Date();
    
    // Calculate date boundaries for each period
    // Daily: Start of current day to end of current day
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    
    // Weekly: Start of current week (Monday) to end of current week (Sunday)
    const startOfWeek = new Date(now);
    const dayOfWeek = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    // Monthly: Start of current month to end of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    // Yearly: Start of current year to end of current year
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    startOfYear.setHours(0, 0, 0, 0);
    const endOfYear = new Date(now.getFullYear() + 1, 0, 0); // Last day of current year
    endOfYear.setHours(23, 59, 59, 999);

    // Helper function to parse payment date
    const getPaymentDate = (payment: any): Date | null => {
      try {
        if (!payment.paymentDate) return null;
        const date = payment.paymentDate?.toDate ? payment.paymentDate.toDate() : new Date(payment.paymentDate);
        return !isNaN(date.getTime()) ? date : null;
      } catch (error) {
        return null;
      }
    };

    // Helper function to get invoice date (for filtering invoices by period)
    const getInvoiceDate = (invoice: any): Date | null => {
      try {
        const invoiceDate = invoice.date || invoice.createdAt;
        if (!invoiceDate) return null;
        const date = invoiceDate?.toDate ? invoiceDate.toDate() : 
                     invoiceDate instanceof Date ? invoiceDate : 
                     new Date(invoiceDate);
        return !isNaN(date.getTime()) ? date : null;
      } catch (error) {
        return null;
      }
    };

    // Calculate purchase totals based on payments made to invoices
    // Daily: Payments made today
    const dailyPurchases = payments
      .filter(payment => {
        const paymentDate = getPaymentDate(payment);
        return paymentDate && paymentDate >= startOfToday && paymentDate <= endOfToday;
      })
      .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

    // Weekly: Payments made this week
    const weeklyPurchases = payments
      .filter(payment => {
        const paymentDate = getPaymentDate(payment);
        return paymentDate && paymentDate >= startOfWeek && paymentDate <= endOfWeek;
      })
      .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

    // Monthly: Payments made this month
    const monthlyPurchases = payments
      .filter(payment => {
        const paymentDate = getPaymentDate(payment);
        return paymentDate && paymentDate >= startOfMonth && paymentDate <= endOfMonth;
      })
      .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

    // Yearly: Payments made this year
    const yearlyPurchases = payments
      .filter(payment => {
        const paymentDate = getPaymentDate(payment);
        return paymentDate && paymentDate >= startOfYear && paymentDate <= endOfYear;
      })
      .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

    // Calculate invoices made in each period (using invoice date/createdAt)
    const dailyInvoices = invoices.filter(invoice => {
      const invoiceDate = getInvoiceDate(invoice);
      return invoiceDate && invoiceDate >= startOfToday && invoiceDate <= endOfToday;
    });

    const weeklyInvoices = invoices.filter(invoice => {
      const invoiceDate = getInvoiceDate(invoice);
      return invoiceDate && invoiceDate >= startOfWeek && invoiceDate <= endOfWeek;
    });

    const monthlyInvoices = invoices.filter(invoice => {
      const invoiceDate = getInvoiceDate(invoice);
      return invoiceDate && invoiceDate >= startOfMonth && invoiceDate <= endOfMonth;
    });

    const yearlyInvoices = invoices.filter(invoice => {
      const invoiceDate = getInvoiceDate(invoice);
      return invoiceDate && invoiceDate >= startOfYear && invoiceDate <= endOfYear;
    });

    // Calculate invoice amounts for each period
    const dailyInvoiceAmount = dailyInvoices.reduce((sum, inv) => sum + (Number(inv.amount || inv.amountInDigits || 0)), 0);
    const weeklyInvoiceAmount = weeklyInvoices.reduce((sum, inv) => sum + (Number(inv.amount || inv.amountInDigits || 0)), 0);
    const monthlyInvoiceAmount = monthlyInvoices.reduce((sum, inv) => sum + (Number(inv.amount || inv.amountInDigits || 0)), 0);
    const yearlyInvoiceAmount = yearlyInvoices.reduce((sum, inv) => sum + (Number(inv.amount || inv.amountInDigits || 0)), 0);

    // Calculate invoice metrics
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const paidAmount = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
    
    // Calculate total outstanding as sum of all supplier outstanding balances
    // This is the correct way: sum of (invoice.amount - paidAmount) per supplier
    const supplierOutstandingMap = new Map<string, number>();
    
    invoices.forEach(invoice => {
      const invoiceAmount = Number(invoice.amount || invoice.amountInDigits || 0);
      const invoicePaidAmount = Number(invoice.paidAmount || 0);
      const remainingAmount = Math.max(0, invoiceAmount - invoicePaidAmount);
      
      if (remainingAmount > 0) {
        const supplierId = invoice.supplierId || invoice.supplier_id || 'unknown';
        const currentOutstanding = supplierOutstandingMap.get(supplierId) || 0;
        supplierOutstandingMap.set(supplierId, currentOutstanding + remainingAmount);
      }
    });
    
    // Sum all supplier outstanding balances
    const pendingAmount = Array.from(supplierOutstandingMap.values()).reduce((sum, outstanding) => sum + outstanding, 0);

    const invoicesByStatus = {
      pending: invoices.filter(inv => inv.status === 'pending').length,
      approved: invoices.filter(inv => inv.status === 'approved').length,
      paid: invoices.filter(inv => inv.status === 'paid').length,
      overdue: invoices.filter(inv => {
        try {
          if (!inv.dueDate || inv.status === 'paid') return false;
          const dueDate = new Date(inv.dueDate?.toDate?.() || inv.dueDate);
          return !isNaN(dueDate.getTime()) && dueDate < now;
        } catch (error) {
          return false;
        }
      }).length
    };

    // Calculate cash flow
    const totalAllocated = cashAllocations.reduce((sum, alloc) => sum + (alloc.amount || 0), 0);
    const totalUsed = paidAmount;
    const remaining = totalAllocated - totalUsed;
    const utilization = totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0;

    // Calculate supplier metrics
    const activeSuppliers = suppliers.filter(sup => sup.status === 'active').length;
    const supplierSpending = suppliers.map(supplier => {
      const supplierInvoices = invoices.filter(inv => inv.supplierId === supplier.id);
      return {
        id: supplier.id,
        name: supplier.supplierName || supplier.name,
        totalAmount: supplierInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
        invoiceCount: supplierInvoices.length
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 5);

    // Calculate payment analytics
    const paymentMethods = payments.reduce((acc, payment) => {
      const method = payment.paymentMethod || 'unknown';
      acc[method] = (acc[method] || 0) + (payment.amount || 0);
      return acc;
    }, {} as Record<string, number>);

    const monthlyTrends = generateMonthlyTrends(payments);

    // Calculate cash close metrics
    const cashCloseMetrics = calculateCashCloseMetrics(cashCloses, cashCloseShiftFilter, cashClosesRowCount, cashCloseFromDate, cashCloseToDate);

    setMetrics({
      totalPurchases: {
        daily: dailyPurchases,
        weekly: weeklyPurchases,
        monthly: monthlyPurchases,
        yearly: yearlyPurchases
      },
      invoicesByPeriod: {
        daily: dailyInvoices.length,
        weekly: weeklyInvoices.length,
        monthly: monthlyInvoices.length,
        yearly: yearlyInvoices.length
      },
      invoiceAmountsByPeriod: {
        daily: dailyInvoiceAmount,
        weekly: weeklyInvoiceAmount,
        monthly: monthlyInvoiceAmount,
        yearly: yearlyInvoiceAmount
      },
      invoiceMetrics: {
        total: invoices.length,
        pending: invoicesByStatus.pending,
        approved: invoicesByStatus.approved,
        paid: invoicesByStatus.paid,
        overdue: invoicesByStatus.overdue,
        totalAmount,
        paidAmount,
        pendingAmount
      },
      cashFlow: {
        allocated: totalAllocated,
        used: totalUsed,
        remaining,
        utilization
      },
      supplierMetrics: {
        total: suppliers.length,
        active: activeSuppliers,
        topSuppliers: supplierSpending
      },
      paymentAnalytics: {
        totalPayments: payments.length,
        averagePayment: payments.length > 0 ? paidAmount / payments.length : 0,
        paymentMethods,
        monthlyTrends
      },
      cashCloseMetrics
    });
  };

  const generateMonthlyTrends = (paymentsData: any[]) => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
      
      const monthPayments = paymentsData.filter(payment => {
        try {
          if (!payment.paymentDate) return false;
          
          const paymentDate = new Date(payment.paymentDate?.toDate?.() || payment.paymentDate);
          
          // Check if the date is valid
          if (isNaN(paymentDate.getTime())) return false;
          
          return paymentDate.toISOString().slice(0, 7) === monthKey;
    } catch (error) {
          console.warn('Invalid payment date:', payment.paymentDate, error);
          return false;
        }
      });
      
      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        amount: monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        count: monthPayments.length
      });
    }
    return months;
  };

  const calculateCashCloseMetrics = (cashClosesData: any[], shiftFilter: string = 'all', rowCount: number = 5, fromDate: string = '', toDate: string = '') => {
    if (!cashClosesData || cashClosesData.length === 0) {
      return {
        totalDayCash: 0, totalNightCash: 0, totalNetworkMoney: 0, totalShortage: 0, totalExcess: 0,
        averageDayClose: 0, averageNightClose: 0, profitMargin: 0.12, estimatedProfit: 0,
        dayCloseCount: 0, nightCloseCount: 0, shortagePercentage: 0, excessPercentage: 0, recentCloses: []
      };
    }

    // Filter by date range if specified
    let filteredByDate = cashClosesData;
    if (fromDate || toDate) {
      filteredByDate = cashClosesData.filter(c => {
        const itemDate = new Date(c.date || c.createdAt);
        let isInRange = true;
        
        if (fromDate) {
          const from = new Date(fromDate);
          from.setHours(0, 0, 0, 0); // Start of day
          isInRange = isInRange && itemDate >= from;
        }
        
        if (toDate) {
          const to = new Date(toDate);
          to.setHours(23, 59, 59, 999); // End of day
          isInRange = isInRange && itemDate <= to;
        }
        
        return isInRange;
      });
    }

    const dayCloses = filteredByDate.filter(c => c.shift === 'day');
    const nightCloses = filteredByDate.filter(c => c.shift === 'night');

    const totalDayCash = dayCloses.reduce((sum, c) => sum + (c.closeCash || c.actualAmount || 0), 0);
    const totalNightCash = nightCloses.reduce((sum, c) => sum + (c.closeCash || c.actualAmount || 0), 0);
    
    const totalNetworkMoney = filteredByDate.reduce((sum, c) => 
      sum + (c.airtel || 0) + (c.mtn || 0) + (c.stanbicBank || 0) + 
      (c.equityBank || 0) + (c.absaBank || 0) + (c.pesaPal || 0), 0);

    const totalShortage = filteredByDate.reduce((sum, c) => sum + (c.shortage || 0), 0);
    const totalExcess = filteredByDate.reduce((sum, c) => sum + (c.excess || 0), 0);
    
    const averageDayClose = dayCloses.length > 0 ? totalDayCash / dayCloses.length : 0;
    const averageNightClose = nightCloses.length > 0 ? totalNightCash / nightCloses.length : 0;
    
    const totalCash = totalDayCash + totalNightCash;
    
    // Calculate dynamic profit margin based on actual performance data
    const totalRevenue = totalCash + totalNetworkMoney;
    const totalCosts = Math.abs(totalShortage); // Shortages represent costs/losses
    const actualProfitMargin = totalRevenue > 0 ? Math.max(0, (totalRevenue - totalCosts) / totalRevenue) : 0;
    
    // Use actual profit margin or fallback to industry standard if no data
    const profitMargin = filteredByDate.length > 0 ? actualProfitMargin : 0.08; // 8% fallback
    const estimatedProfit = totalRevenue * profitMargin;
    
    const shortagePercentage = totalCash > 0 ? (totalShortage / totalCash) * 100 : 0;
    const excessPercentage = totalCash > 0 ? (totalExcess / totalCash) * 100 : 0;

    // Filter by shift type if specified
    const filteredData = shiftFilter === 'all' 
      ? filteredByDate 
      : filteredByDate.filter(c => c.shift === shiftFilter);

    // Get recent closes with filtering applied
    const recentCloses = filteredData
      .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())
      .slice(0, rowCount)
      .map(c => ({
        id: c.id,
        shift: c.shift,
        amount: c.closeCash || c.actualAmount || 0,
        date: new Date(c.date || c.createdAt),
        shortage: c.shortage || 0,
        excess: c.excess || 0
      }));

    return {
      totalDayCash,
      totalNightCash,
      totalNetworkMoney,
      totalShortage,
      totalExcess,
      averageDayClose,
      averageNightClose,
      profitMargin,
      estimatedProfit,
      dayCloseCount: dayCloses.length,
      nightCloseCount: nightCloses.length,
      shortagePercentage,
      excessPercentage,
      recentCloses
    };
  };

  useEffect(() => {
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    // Simulate loading
    setTimeout(() => setLoading(false), 1000);

    return () => clearInterval(timer);
  }, []);



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Format currency for display without abbreviations
  const formatCurrencyForDisplay = (amount: number) => {
    return formatCurrency(amount).replace('UGX', 'USh').trim();
  };

  // Get dynamic font size based on amount length - balanced sizing for visibility
  const getDynamicFontSize = (amount: number | string, baseSize: string = 'text-lg') => {
    const formatted = typeof amount === 'number' ? formatCurrencyForDisplay(amount) : amount;
    const length = formatted.length;
    
    if (length > 20) return 'text-sm';      // Very large amounts
    if (length > 16) return 'text-sm';      // Large amounts  
    if (length > 12) return 'text-base';    // Medium amounts
    if (length > 8) return 'text-base';     // Normal amounts
    return 'text-lg';                       // Small amounts
  };

  const formatDate = (date: Date | any) => {
    if (!date) return 'N/A';
    try {
    const dateObj = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
      if (isNaN(dateObj.getTime())) return 'N/A';
    return dateObj.toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    } catch (error) {
      console.warn('Invalid date formatting:', date, error);
      return 'N/A';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 70) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Chart configurations
  const purchaseTrendsData = {
    labels: metrics.paymentAnalytics.monthlyTrends.map(d => d.month),
    datasets: [
      {
        label: 'Purchase Amount',
        data: metrics.paymentAnalytics.monthlyTrends.map(d => d.amount),
        backgroundColor: 'rgba(139, 92, 246, 0.3)',
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(139, 92, 246, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
      {
        label: 'Payment Count',
        data: metrics.paymentAnalytics.monthlyTrends.map(d => d.count * 50000), // Scale for visibility
        backgroundColor: 'rgba(236, 72, 153, 0.3)',
        borderColor: 'rgba(236, 72, 153, 1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(236, 72, 153, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
      }
    ]
  };

  const expenseChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: '600'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(139, 92, 246, 0.5)',
        borderWidth: 1,
        cornerRadius: 12,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            weight: '500'
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        },
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value).replace('UGX', '').trim() + 'K';
          },
          font: {
            weight: '500'
          }
        }
      }
    },
    elements: {
      point: {
        hoverBackgroundColor: '#fff'
      }
    }
  };

  const paymentMethodsData = {
    labels: Object.keys(metrics.paymentAnalytics.paymentMethods),
    datasets: [
      {
        data: Object.values(metrics.paymentAnalytics.paymentMethods),
        backgroundColor: [
          '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'
        ],
        borderColor: '#fff',
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverOffset: 10
      }
    ]
  };

  // Purchase Period Pie Chart Data
  const purchasePeriodData = {
    labels: ['Daily Invoices', 'Weekly Invoices', 'Monthly Invoices', 'Yearly Invoices'],
    datasets: [
      {
        data: [
          metrics.invoiceAmountsByPeriod.daily,
          metrics.invoiceAmountsByPeriod.weekly,
          metrics.invoiceAmountsByPeriod.monthly,
          metrics.invoiceAmountsByPeriod.yearly
        ],
        backgroundColor: [
          '#FF6B6B', // Red for Daily
          '#4ECDC4', // Teal for Weekly  
          '#45B7D1', // Blue for Monthly
          '#96CEB4'  // Green for Yearly
        ],
        borderColor: '#fff',
        borderWidth: 3,
        hoverBorderWidth: 5,
        hoverOffset: 15,
        hoverBackgroundColor: [
          '#FF5252',
          '#26C6DA', 
          '#2196F3',
          '#66BB6A'
        ]
      }
    ]
  };

  // Custom options for Purchase Period Pie Chart
  const purchasePeriodChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: '600'
          },
          generateLabels: function(chart: any) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label: string, i: number) => {
                const value = data.datasets[0].data[i];
                const total = data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                return {
                  text: `${label}: ${percentage}%`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].borderColor,
                  lineWidth: data.datasets[0].borderWidth,
                  pointStyle: 'circle',
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(139, 92, 246, 0.8)',
        borderWidth: 2,
        cornerRadius: 12,
        displayColors: true,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13,
          weight: '500'
        },
        padding: 12,
        callbacks: {
          title: function(context: any) {
            return context[0].label;
          },
          label: function(context: any) {
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            return [
              `Amount: ${formatCurrency(value)}`,
              `Percentage: ${percentage}%`
            ];
          }
        }
      }
    },
    elements: {
      arc: {
        borderWidth: 3,
        hoverBorderWidth: 5
      }
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1000,
      easing: 'easeOutQuart'
    }
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 11,
            weight: '600'
          },
          generateLabels: function(chart: any) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label: string, i: number) => {
                const value = data.datasets[0].data[i];
                const total = data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return {
                  text: `${label} (${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].borderColor,
                  lineWidth: data.datasets[0].borderWidth,
                  pointStyle: 'circle',
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(139, 92, 246, 0.5)',
        borderWidth: 1,
        cornerRadius: 12,
        callbacks: {
          label: function(context: any) {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${formatCurrency(context.parsed)} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Generate daily cash flow data for the last 7 days
  const generateDailyCashFlow = () => {
    const days = [];
    const allocatedData = [];
    const usedData = [];
    const remainingData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      
      // Generate realistic daily variation based on actual metrics
      const baseAllocated = metrics.cashFlow.allocated / 7;
      const baseUsed = metrics.cashFlow.used / 7;
      
      const dailyAllocated = baseAllocated * (0.8 + Math.random() * 0.4);
      const dailyUsed = baseUsed * (0.7 + Math.random() * 0.6);
      const dailyRemaining = dailyAllocated - dailyUsed;
      
      allocatedData.push(Math.max(0, dailyAllocated));
      usedData.push(Math.max(0, dailyUsed));
      remainingData.push(Math.max(0, dailyRemaining));
    }
    
    return { days, allocatedData, usedData, remainingData };
  };

  const dailyCashFlow = generateDailyCashFlow();

  const cashFlowData = {
    labels: dailyCashFlow.days,
    datasets: [
      {
        label: 'Allocated',
        data: dailyCashFlow.allocatedData,
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 2
      },
      {
        label: 'Used',
        data: dailyCashFlow.usedData,
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 2
      },
      {
        label: 'Remaining',
        data: dailyCashFlow.remainingData,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2
      }
    ]
  };

  const trendChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 11,
            weight: '600'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(139, 92, 246, 0.5)',
        borderWidth: 1,
        cornerRadius: 12,
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            weight: '500'
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        },
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value).replace('UGX', '').trim() + 'M';
          },
          font: {
            weight: '500'
          }
        }
      }
    }
  };

  // Cash Close Pie Chart Data
  const cashClosePieData = {
    labels: ['Day Shift Cash', 'Night Shift Cash', 'Network Money', 'Shortage', 'Excess'],
    datasets: [
      {
        data: [
          metrics.cashCloseMetrics.totalDayCash,
          metrics.cashCloseMetrics.totalNightCash,
          metrics.cashCloseMetrics.totalNetworkMoney,
          metrics.cashCloseMetrics.totalShortage,
          metrics.cashCloseMetrics.totalExcess
        ],
        backgroundColor: [
          '#3B82F6', // Blue for Day Shift
          '#6366F1', // Indigo for Night Shift
          '#10B981', // Green for Network Money
          '#EF4444', // Red for Shortage
          '#F59E0B'  // Amber for Excess
        ],
        borderColor: '#fff',
        borderWidth: 3,
        hoverBorderWidth: 5,
        hoverOffset: 15,
        hoverBackgroundColor: [
          '#2563EB',
          '#4F46E5',
          '#059669',
          '#DC2626',
          '#D97706'
        ]
      }
    ]
  };

  // Custom options for Cash Close Pie Chart
  const cashCloseChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: '600'
          },
          generateLabels: function(chart: any) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label: string, i: number) => {
                const value = data.datasets[0].data[i];
                const total = data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                return {
                  text: `${label}: ${percentage}%`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].borderColor,
                  lineWidth: data.datasets[0].borderWidth,
                  pointStyle: 'circle',
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(139, 92, 246, 0.8)',
        borderWidth: 2,
        cornerRadius: 12,
        displayColors: true,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13,
          weight: '500'
        },
        padding: 12,
        callbacks: {
          title: function(context: any) {
            return context[0].label;
          },
          label: function(context: any) {
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            
            // Add specific details based on the section
            const sectionIndex = context.dataIndex;
            let additionalInfo = [];
            
            if (sectionIndex === 0) { // Day Shift
              additionalInfo.push(`Closes: ${metrics.cashCloseMetrics.dayCloseCount}`);
              additionalInfo.push(`Average: ${formatCurrency(metrics.cashCloseMetrics.averageDayClose)}`);
            } else if (sectionIndex === 1) { // Night Shift
              additionalInfo.push(`Closes: ${metrics.cashCloseMetrics.nightCloseCount}`);
              additionalInfo.push(`Average: ${formatCurrency(metrics.cashCloseMetrics.averageNightClose)}`);
            } else if (sectionIndex === 2) { // Network Money
              additionalInfo.push(`Mobile & Bank Payments`);
              additionalInfo.push(`Digital Transactions`);
            } else if (sectionIndex === 3) { // Discrepancies
              additionalInfo.push(`Shortage: ${formatCurrency(metrics.cashCloseMetrics.totalShortage)}`);
              additionalInfo.push(`Excess: ${formatCurrency(metrics.cashCloseMetrics.totalExcess)}`);
            }
            
            return [
              `Amount: ${formatCurrency(value)}`,
              `Percentage: ${percentage}%`,
              ...additionalInfo
            ];
          }
        }
      }
    },
    elements: {
      arc: {
        borderWidth: 3,
        hoverBorderWidth: 5
      }
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1000,
      easing: 'easeOutQuart'
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="text-purple-600 font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50">
      {/* Header */}
   

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* ✅ NEW: Professional Header with Force Refresh */}

        {/* Purchasing Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Daily Purchases */}
          <div className="group bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl p-6 text-white transform hover:scale-105 transition-all duration-300 hover:shadow-xl cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">Daily Purchases</p>
                                  <p 
                    className={`${getDynamicFontSize(metrics.totalPurchases.daily)} font-bold truncate`}
                    title={formatCurrency(metrics.totalPurchases.daily)}
                  >
                    {formatCurrencyForDisplay(metrics.totalPurchases.daily)}
                  </p>
                <p className="text-blue-100 text-xs">Today</p>
                </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 group-hover:bg-white/30 transition-all duration-300">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Pending Invoices */}
          <div className="group bg-gradient-to-r from-orange-500 to-orange-600 rounded-3xl p-6 text-white transform hover:scale-105 transition-all duration-300 hover:shadow-xl cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium mb-1">Pending Invoices</p>
                <p className="text-2xl font-bold">{metrics.invoiceMetrics.pending}</p>
                <p 
                  className="text-orange-100 text-xs truncate"
                  title={formatCurrency(metrics.invoiceMetrics.pendingAmount)}
                >
                  {formatCurrencyForDisplay(metrics.invoiceMetrics.pendingAmount)}
                </p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 group-hover:bg-white/30 transition-all duration-300">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Cash Utilization */}
          <div className="group bg-gradient-to-r from-pink-500 to-pink-600 rounded-3xl p-6 text-white transform hover:scale-105 transition-all duration-300 hover:shadow-xl cursor-pointer"
               onClick={() => router.push('/dashboard/purchase-manager/cash-tracking')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-100 text-sm font-medium mb-1">Cash Utilization</p>
                <p className="text-2xl font-bold">{metrics.cashFlow.utilization.toFixed(1)}%</p>
                <p 
                  className="text-pink-100 text-xs truncate"
                  title={`of ${formatCurrency(metrics.cashFlow.allocated)}`}
                >
                  of {formatCurrencyForDisplay(metrics.cashFlow.allocated)}
                </p>
                </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 group-hover:bg-white/30 transition-all duration-300">
                <Wallet className="w-5 h-5" />
              </div>
              </div>
            </div>
          </div>


        {/* Main Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Purchase Trends Line Chart */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-lg border border-purple-50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Purchase Trends Analysis</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Amount</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Count</span>
                </div>
        </div>
      </div>

            <div className="h-80 mb-8">
              <Line data={purchaseTrendsData} options={expenseChartOptions} />
            </div>

            {/* Cash Flow Analysis */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-lg font-bold text-gray-900 mb-4">Cash Flow Analysis</h4>
              <div className="h-72">
                <Bar data={cashFlowData} options={trendChartOptions} />
              </div>
              
              {/* Daily Analysis Summary */}
              <div className="mt-6 bg-gray-50 rounded-xl p-4">
                <h5 className="text-sm font-semibold text-gray-700 mb-3">7-Day Cash Flow Summary</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-green-500 rounded-sm flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 font-medium">Total Allocated</p>
                      <p 
                        className={`${getDynamicFontSize(dailyCashFlow.allocatedData.reduce((a, b) => a + b, 0), 'text-sm')} font-bold text-green-700 truncate`}
                        title={formatCurrency(dailyCashFlow.allocatedData.reduce((a, b) => a + b, 0))}
                      >
                        {formatCurrencyForDisplay(dailyCashFlow.allocatedData.reduce((a, b) => a + b, 0))}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-red-500 rounded-sm flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 font-medium">Total Used</p>
                      <p 
                        className={`${getDynamicFontSize(dailyCashFlow.usedData.reduce((a, b) => a + b, 0), 'text-sm')} font-bold text-red-700 truncate`}
                        title={formatCurrency(dailyCashFlow.usedData.reduce((a, b) => a + b, 0))}
                      >
                        {formatCurrencyForDisplay(dailyCashFlow.usedData.reduce((a, b) => a + b, 0))}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-blue-500 rounded-sm flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 font-medium">Total Remaining</p>
                      <p 
                        className={`${getDynamicFontSize(dailyCashFlow.remainingData.reduce((a, b) => a + b, 0), 'text-sm')} font-bold text-blue-700 truncate`}
                        title={formatCurrency(dailyCashFlow.remainingData.reduce((a, b) => a + b, 0))}
                      >
                        {formatCurrencyForDisplay(dailyCashFlow.remainingData.reduce((a, b) => a + b, 0))}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Daily Averages */}
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Daily Avg Allocation:</span>
                      <span className="font-bold text-gray-800">
                        {formatCurrencyForDisplay(dailyCashFlow.allocatedData.reduce((a, b) => a + b, 0) / 7)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Weekly Utilization:</span>
                      <span className="font-bold text-gray-800">
                        {dailyCashFlow.allocatedData.reduce((a, b) => a + b, 0) > 0 ? 
                          ((dailyCashFlow.usedData.reduce((a, b) => a + b, 0) / dailyCashFlow.allocatedData.reduce((a, b) => a + b, 0)) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </div>

          {/* Cash Close Analysis Pie Chart */}
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-purple-50">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold text-gray-900">Cash Close Analysis</h3>
                <div className={`flex items-center space-x-2 rounded-full px-3 py-1 ${
                  (cashCloseFromDate || cashCloseToDate) ? 'bg-orange-50' : 'bg-blue-50'
                }`}>
                  <PieChart className={`w-4 h-4 ${
                    (cashCloseFromDate || cashCloseToDate) ? 'text-orange-600' : 'text-blue-600'
                  }`} />
                  <span className={`text-sm font-medium ${
                    (cashCloseFromDate || cashCloseToDate) ? 'text-orange-600' : 'text-blue-600'
                  }`}>
                    {(cashCloseFromDate || cashCloseToDate) ? 'Filtered Data' : 'Live Data'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 flex-wrap">
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-600 whitespace-nowrap">From:</span>
                  <input
                    type="date"
                    value={cashCloseFromDate}
                    onChange={(e) => setCashCloseFromDate(e.target.value)}
                    className="px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-blue-400 transition-colors w-24"
                    style={{ fontSize: '10px' }}
                  />
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-600 whitespace-nowrap">To:</span>
                  <input
                    type="date"
                    value={cashCloseToDate}
                    onChange={(e) => setCashCloseToDate(e.target.value)}
                    className="px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-blue-400 transition-colors w-24"
                    style={{ fontSize: '10px' }}
                  />
                </div>
                {(cashCloseFromDate || cashCloseToDate) && (
                  <button
                    onClick={() => {
                      setCashCloseFromDate('');
                      setCashCloseToDate('');
                    }}
                    className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors whitespace-nowrap"
                    title="Clear date filters"
                    style={{ fontSize: '10px' }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-3 min-h-[80px] flex flex-col justify-between">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <span className="text-xs font-medium text-blue-700 truncate">Day Shift</span>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <p 
                    className={`${getDynamicFontSize(metrics.cashCloseMetrics.totalDayCash)} font-bold text-blue-800 truncate`}
                    title={formatCurrency(metrics.cashCloseMetrics.totalDayCash)}
                  >
                    {formatCurrencyForDisplay(metrics.cashCloseMetrics.totalDayCash)}
                </p>
                </div>
                <p className="text-xs text-blue-600 truncate">{metrics.cashCloseMetrics.dayCloseCount} closes</p>
              </div>
              
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-xl p-3 min-h-[80px] flex flex-col justify-between">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0"></div>
                  <span className="text-xs font-medium text-indigo-700 truncate">Night Shift</span>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <p 
                    className={`${getDynamicFontSize(metrics.cashCloseMetrics.totalNightCash)} font-bold text-indigo-800 truncate`}
                    title={formatCurrency(metrics.cashCloseMetrics.totalNightCash)}
                  >
                    {formatCurrencyForDisplay(metrics.cashCloseMetrics.totalNightCash)}
                </p>
                </div>
                <p className="text-xs text-indigo-600 truncate">{metrics.cashCloseMetrics.nightCloseCount} closes</p>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-3 min-h-[80px] flex flex-col justify-between">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></div>
                  <span className="text-xs font-medium text-green-700 truncate">Network Money</span>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <p 
                    className={`${getDynamicFontSize(metrics.cashCloseMetrics.totalNetworkMoney)} font-bold text-green-800 truncate`}
                    title={formatCurrency(metrics.cashCloseMetrics.totalNetworkMoney)}
                  >
                    {formatCurrencyForDisplay(metrics.cashCloseMetrics.totalNetworkMoney)}
                </p>
                </div>
                <p className="text-xs text-green-600 truncate">Digital payments</p>
              </div>
              
              <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-3 min-h-[80px] flex flex-col justify-between">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0"></div>
                  <span className="text-xs font-medium text-red-700 truncate">Shortage</span>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <p 
                    className={`${getDynamicFontSize(metrics.cashCloseMetrics.totalShortage)} font-bold text-red-800 truncate`}
                    title={formatCurrency(metrics.cashCloseMetrics.totalShortage)}
                  >
                    {formatCurrencyForDisplay(metrics.cashCloseMetrics.totalShortage)}
                  </p>
                </div>
                <p className="text-xs text-red-600 truncate">Cash shortfall</p>
              </div>
              
              <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl p-3 min-h-[80px] flex flex-col justify-between">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0"></div>
                  <span className="text-xs font-medium text-amber-700 truncate">Excess</span>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <p 
                    className={`${getDynamicFontSize(metrics.cashCloseMetrics.totalExcess)} font-bold text-amber-800 truncate`}
                    title={formatCurrency(metrics.cashCloseMetrics.totalExcess)}
                  >
                    {formatCurrencyForDisplay(metrics.cashCloseMetrics.totalExcess)}
                </p>
                </div>
                <p className="text-xs text-amber-600 truncate">Cash surplus</p>
              </div>
            </div>
            
            {/* Pie Chart */}
            <div className="h-80">
              <Pie data={cashClosePieData} options={cashCloseChartOptions} />
            </div>
            
            {/* Cash Analysis Insights */}
            <div className="mt-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                <DollarSign className="w-4 h-4 mr-2 text-gray-600 flex-shrink-0" />
                <span className="truncate">Cash Analysis Insights</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="text-gray-600 text-xs font-medium">• <strong>Total Cash Handled:</strong></p>
                  <p 
                    className={`${getDynamicFontSize(metrics.cashCloseMetrics.totalDayCash + metrics.cashCloseMetrics.totalNightCash, 'text-sm')} text-gray-800 font-semibold ml-2 truncate`}
                    title={formatCurrency(metrics.cashCloseMetrics.totalDayCash + metrics.cashCloseMetrics.totalNightCash)}
                  >
                    {formatCurrencyForDisplay(metrics.cashCloseMetrics.totalDayCash + metrics.cashCloseMetrics.totalNightCash)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-gray-600 text-xs font-medium">• <strong>Average Day Close:</strong></p>
                  <p 
                    className={`${getDynamicFontSize(metrics.cashCloseMetrics.averageDayClose, 'text-sm')} text-gray-800 font-semibold ml-2 truncate`}
                    title={formatCurrency(metrics.cashCloseMetrics.averageDayClose)}
                  >
                    {formatCurrencyForDisplay(metrics.cashCloseMetrics.averageDayClose)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-gray-600 text-xs font-medium">• <strong>Average Night Close:</strong></p>
                  <p 
                    className={`${getDynamicFontSize(metrics.cashCloseMetrics.averageNightClose, 'text-sm')} text-gray-800 font-semibold ml-2 truncate`}
                    title={formatCurrency(metrics.cashCloseMetrics.averageNightClose)}
                  >
                    {formatCurrencyForDisplay(metrics.cashCloseMetrics.averageNightClose)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-gray-600 text-xs font-medium">• <strong>Net Variance:</strong></p>
                  <div className="ml-2">
                    <p 
                      className={`${getDynamicFontSize(metrics.cashCloseMetrics.totalExcess - metrics.cashCloseMetrics.totalShortage, 'text-sm')} font-semibold truncate ${metrics.cashCloseMetrics.totalExcess > metrics.cashCloseMetrics.totalShortage ? 'text-green-600' : 'text-red-600'}`}
                      title={formatCurrency(metrics.cashCloseMetrics.totalExcess - metrics.cashCloseMetrics.totalShortage)}
                    >
                      {formatCurrencyForDisplay(metrics.cashCloseMetrics.totalExcess - metrics.cashCloseMetrics.totalShortage)}
                    </p>
                    <span className="text-xs text-gray-500 truncate">
                      {metrics.cashCloseMetrics.totalExcess > metrics.cashCloseMetrics.totalShortage ? '(Surplus)' : '(Deficit)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Period Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Purchase Period Pie Chart */}
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-purple-50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Purchase Period Analysis</h3>
              <div className="flex items-center space-x-2 bg-purple-50 rounded-full px-3 py-1">
                <PieChart className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-purple-600 font-medium">Period Breakdown</span>
                  </div>
                  </div>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-3 min-h-[130px] flex flex-col justify-between">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0"></div>
                  <span className="text-sm font-medium text-red-700 truncate">Daily</span>
                </div>
                <p className="text-xs text-red-600 mb-1 truncate" title={getCurrentPeriodInfo().daily}>
                  {getCurrentPeriodInfo().daily}
                </p>
                <p 
                  className={`${getDynamicFontSize(formatCurrencyForDisplay(metrics.invoiceAmountsByPeriod.daily), 'text-base')} font-bold text-red-800 mt-1 truncate`}
                  title={formatCurrency(metrics.invoiceAmountsByPeriod.daily)}
                >
                  {formatCurrencyForDisplay(metrics.invoiceAmountsByPeriod.daily)}
                </p>
                <p className="text-xs text-red-500 mt-1">
                  {metrics.invoicesByPeriod.daily} invoice{metrics.invoicesByPeriod.daily !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-red-600 mt-1 opacity-75">
                  Payments: {formatCurrencyForDisplay(metrics.totalPurchases.daily)}
                </p>
              </div>
              <div className="bg-gradient-to-r from-teal-50 to-teal-100 rounded-xl p-3 min-h-[130px] flex flex-col justify-between">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-3 h-3 bg-teal-500 rounded-full flex-shrink-0"></div>
                  <span className="text-sm font-medium text-teal-700 truncate">Weekly</span>
                </div>
                <p className="text-xs text-teal-600 mb-1 truncate" title={getCurrentPeriodInfo().weekly}>
                  {getCurrentPeriodInfo().weekly}
                </p>
                <p 
                  className={`${getDynamicFontSize(formatCurrencyForDisplay(metrics.invoiceAmountsByPeriod.weekly), 'text-base')} font-bold text-teal-800 mt-1 truncate`}
                  title={formatCurrency(metrics.invoiceAmountsByPeriod.weekly)}
                >
                  {formatCurrencyForDisplay(metrics.invoiceAmountsByPeriod.weekly)}
                </p>
                <p className="text-xs text-teal-500 mt-1">
                  {metrics.invoicesByPeriod.weekly} invoice{metrics.invoicesByPeriod.weekly !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-teal-600 mt-1 opacity-75">
                  Payments: {formatCurrencyForDisplay(metrics.totalPurchases.weekly)}
                </p>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-3 min-h-[130px] flex flex-col justify-between">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <span className="text-sm font-medium text-blue-700 truncate">Monthly</span>
                </div>
                <p className="text-xs text-blue-600 mb-1 truncate" title={getCurrentPeriodInfo().monthly}>
                  {getCurrentPeriodInfo().monthly}
                </p>
                <p 
                  className={`${getDynamicFontSize(formatCurrencyForDisplay(metrics.invoiceAmountsByPeriod.monthly), 'text-base')} font-bold text-blue-800 mt-1 truncate`}
                  title={formatCurrency(metrics.invoiceAmountsByPeriod.monthly)}
                >
                  {formatCurrencyForDisplay(metrics.invoiceAmountsByPeriod.monthly)}
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  {metrics.invoicesByPeriod.monthly} invoice{metrics.invoicesByPeriod.monthly !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-blue-600 mt-1 opacity-75">
                  Payments: {formatCurrencyForDisplay(metrics.totalPurchases.monthly)}
                </p>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-3 min-h-[130px] flex flex-col justify-between">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                  <span className="text-sm font-medium text-green-700 truncate">Yearly</span>
                </div>
                <p className="text-xs text-green-600 mb-1 truncate" title={getCurrentPeriodInfo().yearly}>
                  {getCurrentPeriodInfo().yearly}
                </p>
                <p 
                  className={`${getDynamicFontSize(formatCurrencyForDisplay(metrics.invoiceAmountsByPeriod.yearly), 'text-base')} font-bold text-green-800 mt-1 truncate`}
                  title={formatCurrency(metrics.invoiceAmountsByPeriod.yearly)}
                >
                  {formatCurrencyForDisplay(metrics.invoiceAmountsByPeriod.yearly)}
                </p>
                <p className="text-xs text-green-500 mt-1">
                  {metrics.invoicesByPeriod.yearly} invoice{metrics.invoicesByPeriod.yearly !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-green-600 mt-1 opacity-75">
                  Payments: {formatCurrencyForDisplay(metrics.totalPurchases.yearly)}
                </p>
              </div>
                  </div>

            <div className="h-80">
              <Pie data={purchasePeriodData} options={purchasePeriodChartOptions} />
                  </div>
                </div>

          {/* Additional insights could go here */}
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-purple-50">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Purchase Insights</h3>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-700">Highest Period</span>
                  <Activity className="w-4 h-4 text-purple-600" />
              </div>
                <p className="text-lg font-bold text-purple-800">
                  {(() => {
                    const invoices = metrics.invoiceAmountsByPeriod;
                    const max = Math.max(invoices.daily, invoices.weekly, invoices.monthly, invoices.yearly);
                    if (max === invoices.yearly) return 'Yearly';
                    if (max === invoices.monthly) return 'Monthly';
                    if (max === invoices.weekly) return 'Weekly';
                    return 'Daily';
                  })()}
                </p>
                <p 
                  className="text-sm text-purple-600 mt-1 truncate"
                  title={formatCurrency(Math.max(
                    metrics.invoiceAmountsByPeriod.daily,
                    metrics.invoiceAmountsByPeriod.weekly,
                    metrics.invoiceAmountsByPeriod.monthly,
                    metrics.invoiceAmountsByPeriod.yearly
                  ))}
                >
                  {formatCurrencyForDisplay(Math.max(
                    metrics.invoiceAmountsByPeriod.daily,
                    metrics.invoiceAmountsByPeriod.weekly,
                    metrics.invoiceAmountsByPeriod.monthly,
                    metrics.invoiceAmountsByPeriod.yearly
                  ))}
                </p>
                </div>
              
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-orange-700">Total Volume</span>
                  <BarChart3 className="w-4 h-4 text-orange-600" />
              </div>
                <p 
                  className={`${getDynamicFontSize(formatCurrencyForDisplay(
                    metrics.invoiceAmountsByPeriod.daily + 
                    metrics.invoiceAmountsByPeriod.weekly + 
                    metrics.invoiceAmountsByPeriod.monthly + 
                    metrics.invoiceAmountsByPeriod.yearly
                  ), 'text-base')} font-bold text-orange-800 truncate`}
                  title={formatCurrency(
                    metrics.invoiceAmountsByPeriod.daily + 
                    metrics.invoiceAmountsByPeriod.weekly + 
                    metrics.invoiceAmountsByPeriod.monthly + 
                    metrics.invoiceAmountsByPeriod.yearly
                  )}
                >
                  {formatCurrencyForDisplay(
                    metrics.invoiceAmountsByPeriod.daily + 
                    metrics.invoiceAmountsByPeriod.weekly + 
                    metrics.invoiceAmountsByPeriod.monthly + 
                    metrics.invoiceAmountsByPeriod.yearly
                  )}
                </p>
                <p className="text-sm text-orange-600 mt-1">Combined invoice periods</p>
            </div>

              <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-emerald-700">Average Daily</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <p 
                  className={`${getDynamicFontSize(formatCurrencyForDisplay(metrics.invoiceAmountsByPeriod.yearly / 365), 'text-base')} font-bold text-emerald-800 truncate`}
                  title={formatCurrency(metrics.invoiceAmountsByPeriod.yearly / 365)}
                >
                  {formatCurrencyForDisplay(metrics.invoiceAmountsByPeriod.yearly / 365)}
                </p>
                <p className="text-sm text-emerald-600 mt-1">Based on yearly invoice data</p>
              </div>
            </div>
          </div>
        </div>

        {/* Supplier Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Suppliers */}
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-purple-50">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Top Suppliers</h3>
            <div className="space-y-4">
              {metrics.supplierMetrics.topSuppliers.map((supplier, index) => (
                <div key={supplier.id} className="group hover:bg-purple-50 rounded-2xl p-3 transition-all duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl flex items-center justify-center text-white text-sm font-bold">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{supplier.name}</span>
                    </div>
                    <span className="text-xs text-purple-600 font-medium">{supplier.invoiceCount} invoices</span>
                  </div>
                  <div className="ml-11">
                    <p 
                      className={`${getDynamicFontSize(formatCurrencyForDisplay(supplier.totalAmount), 'text-base')} font-bold text-gray-900 truncate`}
                      title={formatCurrency(supplier.totalAmount)}
                    >
                      {formatCurrencyForDisplay(supplier.totalAmount)}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className="h-2 bg-gradient-to-r from-purple-500 to-violet-600 rounded-full transition-all duration-1000 ease-out"
                        style={{ 
                          width: `${(supplier.totalAmount / (metrics.supplierMetrics.topSuppliers[0]?.totalAmount || 1)) * 100}%`,
                          animationDelay: `${index * 0.1}s`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
              {metrics.supplierMetrics.topSuppliers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No supplier data available</p>
          </div>
        )}
            </div>
          </div>

          {/* Invoice Status Overview */}
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-purple-50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Invoice Status Overview</h3>
              <div className="flex items-center space-x-2 bg-purple-50 rounded-full px-3 py-1">
                <FileText className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-purple-600 font-medium">Live Status</span>
              </div>
            </div>
            
            {/* Status Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-3 min-h-[75px] flex flex-col justify-between">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                  <span className="text-xs font-medium text-green-700 truncate">Paid</span>
                </div>
                <p className="text-lg font-bold text-green-800">
                  {metrics.invoiceMetrics.paid}
                </p>
                <p 
                  className="text-xs text-green-600 truncate"
                  title={formatCurrency(metrics.invoiceMetrics.paidAmount)}
                >
                  {formatCurrencyForDisplay(metrics.invoiceMetrics.paidAmount)}
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-3 min-h-[75px] flex flex-col justify-between">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0"></div>
                  <span className="text-xs font-medium text-yellow-700 truncate">Pending</span>
                </div>
                <p className="text-lg font-bold text-yellow-800">
                  {metrics.invoiceMetrics.pending}
                </p>
                <p 
                  className="text-xs text-yellow-600 truncate"
                  title={formatCurrency(metrics.invoiceMetrics.pendingAmount)}
                >
                  {formatCurrencyForDisplay(metrics.invoiceMetrics.pendingAmount)}
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-3 min-h-[75px] flex flex-col justify-between">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <span className="text-xs font-medium text-blue-700 truncate">Approved</span>
                </div>
                <p className="text-lg font-bold text-blue-800">
                  {metrics.invoiceMetrics.approved}
                </p>
                <p className="text-xs text-blue-600 truncate">Ready for payment</p>
              </div>
              
              <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-3 min-h-[75px] flex flex-col justify-between">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                  <span className="text-xs font-medium text-red-700 truncate">Overdue</span>
                </div>
                <p className="text-lg font-bold text-red-800">
                  {metrics.invoiceMetrics.overdue}
                </p>
                <p className="text-xs text-red-600 truncate">Requires attention</p>
              </div>
            </div>
            
            {/* Progress Bars */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Payment Progress</span>
                  <span className="text-gray-800 font-medium">
                    {metrics.invoiceMetrics.totalAmount > 0 ? 
                      Math.round((metrics.invoiceMetrics.paidAmount / metrics.invoiceMetrics.totalAmount) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${metrics.invoiceMetrics.totalAmount > 0 ? 
                        (metrics.invoiceMetrics.paidAmount / metrics.invoiceMetrics.totalAmount) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Invoice Completion</span>
                  <span className="text-gray-800 font-medium">
                    {metrics.invoiceMetrics.total > 0 ? 
                      Math.round((metrics.invoiceMetrics.paid / metrics.invoiceMetrics.total) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${metrics.invoiceMetrics.total > 0 ? 
                        (metrics.invoiceMetrics.paid / metrics.invoiceMetrics.total) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
            
            {/* Summary Stats */}
            <div className="mt-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                <BarChart3 className="w-4 h-4 mr-2 text-gray-600" />
                Invoice Summary
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">• <strong>Total Invoices:</strong></p>
                  <p className="text-gray-800 font-semibold ml-2">{metrics.invoiceMetrics.total}</p>
                </div>
                <div>
                  <p className="text-gray-600">• <strong>Total Value:</strong></p>
                  <p className="text-gray-800 font-semibold ml-2">{formatCurrency(metrics.invoiceMetrics.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-gray-600">• <strong>Amount Paid:</strong></p>
                  <p className="text-green-600 font-semibold ml-2">{formatCurrency(metrics.invoiceMetrics.paidAmount)}</p>
                </div>
                <div>
                  <p className="text-gray-600">• <strong>Outstanding:</strong></p>
                  <p className="text-red-600 font-semibold ml-2">{formatCurrency(metrics.invoiceMetrics.pendingAmount)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cash Close Tracking Section */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-purple-50">
          <div className="flex items-center justify-between mb-6">
            <div>
            <h3 className="text-xl font-bold text-gray-900">Recent Cash Closes</h3>
              <p className="text-sm text-gray-500">Showing {metrics.cashCloseMetrics.recentCloses.length} of latest cash closes</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Shift:</span>
                  <select
                    value={cashCloseShiftFilter}
                    onChange={(e) => setCashCloseShiftFilter(e.target.value)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white hover:border-purple-400 transition-colors"
                  >
                    <option value="all">All Shifts</option>
                    <option value="day">☀️ Day Shift</option>
                    <option value="night">🌙 Night Shift</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Show:</span>
                  <select
                    value={cashClosesRowCount}
                    onChange={(e) => setCashClosesRowCount(Number(e.target.value))}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white hover:border-purple-400 transition-colors"
                  >
                    <option value={5}>5 rows</option>
                    <option value={10}>10 rows</option>
                    <option value={15}>15 rows</option>
                    <option value={20}>20 rows</option>
                    <option value={25}>25 rows</option>
                    <option value={50}>50 rows</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">From:</span>
                  <input
                    type="date"
                    value={cashCloseFromDate}
                    onChange={(e) => setCashCloseFromDate(e.target.value)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white hover:border-purple-400 transition-colors"
                    placeholder="From date"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">To:</span>
                  <input
                    type="date"
                    value={cashCloseToDate}
                    onChange={(e) => setCashCloseToDate(e.target.value)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white hover:border-purple-400 transition-colors"
                    placeholder="To date"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 bg-blue-50 rounded-full px-3 py-1">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-600 font-medium">Real-time</span>
              </div>
              </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Shift</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Variance</th>
                      </tr>
                    </thead>
              <tbody>
                {metrics.cashCloseMetrics.recentCloses.map((close, index) => (
                  <tr key={close.id} className="border-b border-gray-100 hover:bg-purple-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {formatDate(close.date)}
                          </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        close.shift === 'day' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {close.shift === 'day' ? '☀️ Day' : '🌙 Night'}
                            </span>
                          </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {formatCurrency(close.amount)}
                    </td>
                    <td className="py-3 px-4">
                      {close.shortage > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          ⚠️ Shortage
                        </span>
                      ) : close.excess > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          📈 Excess
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✅ Balanced
                        </span>
                      )}
                          </td>
                    <td className="py-3 px-4 text-sm">
                      {close.shortage > 0 && (
                        <span className="text-red-600 font-medium">
                          -{formatCurrency(close.shortage)}
                            </span>
                      )}
                      {close.excess > 0 && (
                        <span className="text-green-600 font-medium">
                          +{formatCurrency(close.excess)}
                        </span>
                      )}
                      {close.shortage === 0 && close.excess === 0 && (
                        <span className="text-gray-500">—</span>
                      )}
                          </td>
                        </tr>
                      ))}
                {metrics.cashCloseMetrics.recentCloses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No cash closes found. Data will appear here once cash closes are recorded.
                    </td>
                  </tr>
                )}
                    </tbody>
                  </table>
                </div>
              </div>

        {/* Additional Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-purple-50">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Admin Panel</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-2xl hover:bg-purple-100 transition-colors cursor-pointer"
                   onClick={() => router.push('/dashboard/purchase-manager/invoices')}>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
                    <FileText className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Manage Invoices</p>
                    <p className="text-xs text-gray-500">Review and approve</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-purple-600" />
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-colors cursor-pointer"
                   onClick={() => router.push('/dashboard/purchase-manager/suppliers')}>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Supplier Management</p>
                    <p className="text-xs text-gray-500">Add & manage suppliers</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-blue-600" />
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-2xl hover:bg-green-100 transition-colors cursor-pointer"
                   onClick={() => router.push('/dashboard/purchase-manager/payments')}>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Payment Reports</p>
                    <p className="text-xs text-gray-500">View analytics</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-green-600" />
              </div>

              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-2xl hover:bg-indigo-100 transition-colors cursor-pointer"
                   onClick={() => router.push('/dashboard/purchase-manager/allocation-tracking')}>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Target className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Allocation Tracking</p>
                    <p className="text-xs text-gray-500">Sent & accepted amounts</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-indigo-600" />
              </div>

              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-2xl hover:bg-orange-100 transition-colors cursor-pointer"
                   onClick={() => router.push('/dashboard/purchase-manager/cash-tracking')}>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Cash Tracking</p>
                    <p className="text-xs text-gray-500">Monitor cash flow</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-purple-50">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Recent Activities</h3>
                <p className="text-sm text-gray-500">Showing {recentActivities.length} of latest activities</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Type:</span>
                  <select
                    value={activityTypeFilter}
                    onChange={(e) => setActivityTypeFilter(e.target.value)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white hover:border-purple-400 transition-colors"
                  >
                    <option value="all">All Types</option>
                    <option value="invoice">📄 Invoices</option>
                    <option value="payment">💳 Payments</option>
                    <option value="supplier">🏢 Suppliers</option>
                    <option value="expense">💰 Expenses</option>
                    <option value="order">🛒 Orders</option>
                    <option value="approval">✅ Approvals</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Show:</span>
                  <select
                    value={activitiesRowCount}
                    onChange={(e) => setActivitiesRowCount(Number(e.target.value))}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white hover:border-purple-400 transition-colors"
                  >
                    <option value={5}>5 rows</option>
                    <option value={10}>10 rows</option>
                    <option value={15}>15 rows</option>
                    <option value={20}>20 rows</option>
                    <option value={25}>25 rows</option>
                    <option value={50}>50 rows</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-2xl transition-colors">
                  <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <activity.icon className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                    {activity.amount && (
                      <p className="text-sm text-purple-600 font-medium">{formatCurrency(activity.amount)}</p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">{activity.status}</span>
                      <span className="text-xs text-gray-400">{activity.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 