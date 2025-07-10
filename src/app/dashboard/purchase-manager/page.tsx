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
  Target,
  Zap,
  Star,
  Bell,
  Settings,
  Filter,
  Plus,
  Eye,
  TrendingDown,
  Activity,
  Wallet
} from 'lucide-react';
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
  type: 'invoice' | 'payment' | 'order' | 'approval';
  title: string;
  amount?: number;
  status: string;
  time: string;
  icon: any;
}



export default function PurchaseManagerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
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
    invoiceMetrics: { total: 0, pending: 0, approved: 0, paid: 0, overdue: 0, totalAmount: 0, paidAmount: 0, pendingAmount: 0 },
    cashFlow: { allocated: 0, used: 0, remaining: 0, utilization: 0 },
    supplierMetrics: { total: 0, active: 0, topSuppliers: [] },
    paymentAnalytics: { totalPayments: 0, averagePayment: 0, paymentMethods: {}, monthlyTrends: [] },
    cashCloseMetrics: { 
      totalDayCash: 0, totalNightCash: 0, totalNetworkMoney: 0, totalShortage: 0, totalExcess: 0,
      averageDayClose: 0, averageNightClose: 0, profitMargin: 0.12, estimatedProfit: 0,
      dayCloseCount: 0, nightCloseCount: 0, shortagePercentage: 0, excessPercentage: 0, recentCloses: []
    }
  });

  // Recent activities for dashboard
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([
    { id: '1', type: 'invoice', title: 'New invoice from ABC Suppliers', amount: 45000, status: 'Pending Approval', time: '2 min ago', icon: FileText },
    { id: '2', type: 'payment', title: 'Payment processed to XYZ Ltd', amount: 125000, status: 'Completed', time: '15 min ago', icon: CreditCard },
    { id: '3', type: 'approval', title: 'Expense approved for Travel', amount: 25000, status: 'Approved', time: '1 hour ago', icon: CheckCircle },
    { id: '4', type: 'order', title: 'Purchase order created', amount: 78000, status: 'Awaiting Delivery', time: '2 hours ago', icon: ShoppingCart }
  ]);

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

      // Subscribe to cash allocations data
      const unsubscribeCashAllocations = InterfaceDatabaseConnector.subscribeToCashAllocationsData(
        (data) => {
          console.log('Cash Allocations data received:', data);
          setCashAllocations(data);
        },
        (error) => {
          console.error('Cash Allocations subscription error:', error);
          setError('Failed to load cash allocations data. Please refresh the page.');
        }
      );
      subscriptions.push(unsubscribeCashAllocations);

      // Subscribe to cash closes data
      const unsubscribeCashCloses = InterfaceDatabaseConnector.subscribeToCashCloseData(
        (data) => {
          console.log('Cash Closes data received:', data);
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

  // Calculate metrics when data changes
  useEffect(() => {
    if (invoices.length > 0 || payments.length > 0 || suppliers.length > 0 || cashCloses.length > 0) {
      calculatePurchasingMetrics();
    }
  }, [invoices, payments, suppliers, expenses, cashAllocations, cashCloses]);

  const calculatePurchasingMetrics = () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    // Calculate purchase totals with date validation
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const dailyPurchases = invoices.filter(inv => {
      try {
        if (!inv.createdAt) return false;
        const createdDate = new Date(inv.createdAt?.toDate?.() || inv.createdAt);
        return !isNaN(createdDate.getTime()) && createdDate >= oneDayAgo;
    } catch (error) {
        return false;
      }
    }).reduce((sum, inv) => sum + (inv.amount || 0), 0);

    const weeklyPurchases = invoices.filter(inv => {
      try {
        if (!inv.createdAt) return false;
        const createdDate = new Date(inv.createdAt?.toDate?.() || inv.createdAt);
        return !isNaN(createdDate.getTime()) && createdDate >= oneWeekAgo;
      } catch (error) {
        return false;
      }
    }).reduce((sum, inv) => sum + (inv.amount || 0), 0);

    const monthlyPurchases = invoices.filter(inv => {
      try {
        if (!inv.createdAt) return false;
        const createdDate = new Date(inv.createdAt?.toDate?.() || inv.createdAt);
        return !isNaN(createdDate.getTime()) && createdDate >= oneMonthAgo;
      } catch (error) {
        return false;
      }
    }).reduce((sum, inv) => sum + (inv.amount || 0), 0);

    const yearlyPurchases = invoices.filter(inv => {
      try {
        if (!inv.createdAt) return false;
        const createdDate = new Date(inv.createdAt?.toDate?.() || inv.createdAt);
        return !isNaN(createdDate.getTime()) && createdDate >= oneYearAgo;
      } catch (error) {
        return false;
      }
    }).reduce((sum, inv) => sum + (inv.amount || 0), 0);

    // Calculate invoice metrics
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const paidAmount = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
    const pendingAmount = totalAmount - paidAmount;

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
    const cashCloseMetrics = calculateCashCloseMetrics(cashCloses);

    setMetrics({
      totalPurchases: {
        daily: dailyPurchases,
        weekly: weeklyPurchases,
        monthly: monthlyPurchases,
        yearly: yearlyPurchases
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

  const calculateCashCloseMetrics = (cashClosesData: any[]) => {
    if (!cashClosesData || cashClosesData.length === 0) {
      return {
        totalDayCash: 0, totalNightCash: 0, totalNetworkMoney: 0, totalShortage: 0, totalExcess: 0,
        averageDayClose: 0, averageNightClose: 0, profitMargin: 0.12, estimatedProfit: 0,
        dayCloseCount: 0, nightCloseCount: 0, shortagePercentage: 0, excessPercentage: 0, recentCloses: []
      };
    }

    const dayCloses = cashClosesData.filter(c => c.shift === 'day');
    const nightCloses = cashClosesData.filter(c => c.shift === 'night');

    const totalDayCash = dayCloses.reduce((sum, c) => sum + (c.closeCash || c.actualAmount || 0), 0);
    const totalNightCash = nightCloses.reduce((sum, c) => sum + (c.closeCash || c.actualAmount || 0), 0);
    
    const totalNetworkMoney = cashClosesData.reduce((sum, c) => 
      sum + (c.airtel || 0) + (c.mtn || 0) + (c.stanbicBank || 0) + 
      (c.equityBank || 0) + (c.absaBank || 0) + (c.pesaPal || 0), 0);

    const totalShortage = cashClosesData.reduce((sum, c) => sum + (c.shortage || 0), 0);
    const totalExcess = cashClosesData.reduce((sum, c) => sum + (c.excess || 0), 0);
    
    const averageDayClose = dayCloses.length > 0 ? totalDayCash / dayCloses.length : 0;
    const averageNightClose = nightCloses.length > 0 ? totalNightCash / nightCloses.length : 0;
    
    const totalCash = totalDayCash + totalNightCash;
    const estimatedProfit = totalCash * 0.12; // 12% profit margin
    
    const shortagePercentage = totalCash > 0 ? (totalShortage / totalCash) * 100 : 0;
    const excessPercentage = totalCash > 0 ? (totalExcess / totalCash) * 100 : 0;

    // Get recent closes (last 10)
    const recentCloses = cashClosesData
      .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())
      .slice(0, 10)
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
      profitMargin: 0.12,
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
    labels: ['Daily Purchases', 'Weekly Purchases', 'Monthly Purchases', 'Yearly Purchases'],
    datasets: [
      {
        data: [
          metrics.totalPurchases.daily,
          metrics.totalPurchases.weekly,
          metrics.totalPurchases.monthly,
          metrics.totalPurchases.yearly
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

  const cashFlowData = {
    labels: ['Allocated', 'Used', 'Remaining'],
    datasets: [
      {
        label: 'Cash Flow Analysis',
        data: [
          metrics.cashFlow.allocated,
          metrics.cashFlow.used,
          metrics.cashFlow.remaining
        ],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(59, 130, 246, 0.8)'
        ],
        borderColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(59, 130, 246, 1)'
        ],
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
    labels: ['Day Shift Cash', 'Night Shift Cash', 'Network Money', 'Shortage/Excess'],
    datasets: [
      {
        data: [
          metrics.cashCloseMetrics.totalDayCash,
          metrics.cashCloseMetrics.totalNightCash,
          metrics.cashCloseMetrics.totalNetworkMoney,
          Math.abs(metrics.cashCloseMetrics.totalShortage - metrics.cashCloseMetrics.totalExcess)
        ],
        backgroundColor: [
          '#3B82F6', // Blue for Day Shift
          '#6366F1', // Indigo for Night Shift
          '#10B981', // Green for Network Money
          '#EF4444'  // Red for Discrepancies
        ],
        borderColor: '#fff',
        borderWidth: 3,
        hoverBorderWidth: 5,
        hoverOffset: 15,
        hoverBackgroundColor: [
          '#2563EB',
          '#4F46E5',
          '#059669',
          '#DC2626'
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
      <div className="bg-white/80 backdrop-blur-sm border-b border-purple-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
              <div>
              <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
              <p className="text-purple-600 font-medium">{formatDate(currentTime)}</p>
              </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-white rounded-full px-4 py-2 shadow-sm border border-purple-100">
                <span className="text-sm text-gray-600">EN</span>
                <ArrowDownRight className="w-4 h-4 text-gray-400" />
            </div>
              <button className="p-2 bg-white rounded-full shadow-sm border border-purple-100 hover:shadow-md transition-all duration-200">
                <Bell className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 bg-white rounded-full shadow-sm border border-purple-100 hover:shadow-md transition-all duration-200">
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center space-x-3 bg-white rounded-full px-4 py-2 shadow-sm border border-purple-100">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-violet-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">PM</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">Purchase Manager</p>
                  <p className="text-xs text-gray-500">Admin & Finance</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Purchasing Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Weekly Purchases */}
          <div className="group bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl p-6 text-white transform hover:scale-105 transition-all duration-300 hover:shadow-xl cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">Weekly Purchases</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.totalPurchases.weekly).replace('UGX', '').trim()}</p>
                <p className="text-blue-100 text-xs">Last 7 days</p>
                </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 group-hover:bg-white/30 transition-all duration-300">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Monthly Purchases */}
          <div className="group bg-gradient-to-r from-purple-500 to-purple-600 rounded-3xl p-6 text-white transform hover:scale-105 transition-all duration-300 hover:shadow-xl cursor-pointer"
               onClick={() => router.push('/dashboard/purchase-manager/invoices')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium mb-1">Monthly Purchases</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.totalPurchases.monthly).replace('UGX', '').trim()}</p>
                <p className="text-purple-100 text-xs">Last 30 days</p>
                </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 group-hover:bg-white/30 transition-all duration-300">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Yearly Purchases */}
          <div className="group bg-gradient-to-r from-green-500 to-green-600 rounded-3xl p-6 text-white transform hover:scale-105 transition-all duration-300 hover:shadow-xl cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium mb-1">Yearly Purchases</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.totalPurchases.yearly).replace('UGX', '').trim()}</p>
                <p className="text-green-100 text-xs">Last 365 days</p>
                </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 group-hover:bg-white/30 transition-all duration-300">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Pending Invoices */}
          <div className="group bg-gradient-to-r from-orange-500 to-orange-600 rounded-3xl p-6 text-white transform hover:scale-105 transition-all duration-300 hover:shadow-xl cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium mb-1">Pending Invoices</p>
                <p className="text-2xl font-bold">{metrics.invoiceMetrics.pending}</p>
                <p className="text-orange-100 text-xs">{formatCurrency(metrics.invoiceMetrics.pendingAmount).replace('UGX', '').trim()}</p>
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
                <p className="text-pink-100 text-xs">of {formatCurrency(metrics.cashFlow.allocated).replace('UGX', '').trim()}</p>
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

            <div className="h-80">
              <Line data={purchaseTrendsData} options={expenseChartOptions} />
            </div>
        </div>

          {/* Cash Close Analysis Pie Chart */}
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-purple-50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Cash Close Analysis</h3>
              <div className="flex items-center space-x-2 bg-blue-50 rounded-full px-3 py-1">
                <PieChart className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-600 font-medium">Live Data</span>
              </div>
            </div>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-xs font-medium text-blue-700">Day Shift</span>
                </div>
                <p className="text-lg font-bold text-blue-800">
                  {formatCurrency(metrics.cashCloseMetrics.totalDayCash).replace('UGX', '').trim()}
                </p>
                <p className="text-xs text-blue-600">{metrics.cashCloseMetrics.dayCloseCount} closes</p>
              </div>
              
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-xl p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span className="text-xs font-medium text-indigo-700">Night Shift</span>
                </div>
                <p className="text-lg font-bold text-indigo-800">
                  {formatCurrency(metrics.cashCloseMetrics.totalNightCash).replace('UGX', '').trim()}
                </p>
                <p className="text-xs text-indigo-600">{metrics.cashCloseMetrics.nightCloseCount} closes</p>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-medium text-green-700">Network Money</span>
                </div>
                <p className="text-lg font-bold text-green-800">
                  {formatCurrency(metrics.cashCloseMetrics.totalNetworkMoney).replace('UGX', '').trim()}
                </p>
                <p className="text-xs text-green-600">Digital payments</p>
              </div>
              
              <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-xs font-medium text-red-700">Discrepancies</span>
                </div>
                <p className="text-lg font-bold text-red-800">
                  {formatCurrency(Math.abs(metrics.cashCloseMetrics.totalShortage - metrics.cashCloseMetrics.totalExcess)).replace('UGX', '').trim()}
                </p>
                <p className="text-xs text-red-600">Net variance</p>
              </div>
            </div>
            
            {/* Pie Chart */}
            <div className="h-80">
              <Pie data={cashClosePieData} options={cashCloseChartOptions} />
            </div>
            
            {/* Cash Analysis Insights */}
            <div className="mt-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                <DollarSign className="w-4 h-4 mr-2 text-gray-600" />
                Cash Analysis Insights
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">• <strong>Total Cash Handled:</strong></p>
                  <p className="text-gray-800 font-semibold ml-2">
                    {formatCurrency(metrics.cashCloseMetrics.totalDayCash + metrics.cashCloseMetrics.totalNightCash)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">• <strong>Average Day Close:</strong></p>
                  <p className="text-gray-800 font-semibold ml-2">
                    {formatCurrency(metrics.cashCloseMetrics.averageDayClose)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">• <strong>Average Night Close:</strong></p>
                  <p className="text-gray-800 font-semibold ml-2">
                    {formatCurrency(metrics.cashCloseMetrics.averageNightClose)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">• <strong>Net Variance:</strong></p>
                  <p className={`font-semibold ml-2 ${metrics.cashCloseMetrics.totalExcess > metrics.cashCloseMetrics.totalShortage ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(metrics.cashCloseMetrics.totalExcess - metrics.cashCloseMetrics.totalShortage)}
                    <span className="text-xs ml-1">
                      {metrics.cashCloseMetrics.totalExcess > metrics.cashCloseMetrics.totalShortage ? '(Surplus)' : '(Deficit)'}
                    </span>
                  </p>
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
              <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium text-red-700">Daily</span>
                </div>
                <p className="text-lg font-bold text-red-800 mt-1">
                  {formatCurrency(metrics.totalPurchases.daily).replace('UGX', '').trim()}
                </p>
              </div>
              <div className="bg-gradient-to-r from-teal-50 to-teal-100 rounded-xl p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                  <span className="text-sm font-medium text-teal-700">Weekly</span>
                </div>
                <p className="text-lg font-bold text-teal-800 mt-1">
                  {formatCurrency(metrics.totalPurchases.weekly).replace('UGX', '').trim()}
                </p>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-700">Monthly</span>
                </div>
                <p className="text-lg font-bold text-blue-800 mt-1">
                  {formatCurrency(metrics.totalPurchases.monthly).replace('UGX', '').trim()}
                </p>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-700">Yearly</span>
                </div>
                <p className="text-lg font-bold text-green-800 mt-1">
                  {formatCurrency(metrics.totalPurchases.yearly).replace('UGX', '').trim()}
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
                    const purchases = metrics.totalPurchases;
                    const max = Math.max(purchases.daily, purchases.weekly, purchases.monthly, purchases.yearly);
                    if (max === purchases.yearly) return 'Yearly';
                    if (max === purchases.monthly) return 'Monthly';
                    if (max === purchases.weekly) return 'Weekly';
                    return 'Daily';
                  })()}
                </p>
                <p className="text-sm text-purple-600 mt-1">
                  {formatCurrency(Math.max(
                    metrics.totalPurchases.daily,
                    metrics.totalPurchases.weekly,
                    metrics.totalPurchases.monthly,
                    metrics.totalPurchases.yearly
                  ))}
                </p>
                </div>
              
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-orange-700">Total Volume</span>
                  <BarChart3 className="w-4 h-4 text-orange-600" />
              </div>
                <p className="text-lg font-bold text-orange-800">
                  {formatCurrency(
                    metrics.totalPurchases.daily + 
                    metrics.totalPurchases.weekly + 
                    metrics.totalPurchases.monthly + 
                    metrics.totalPurchases.yearly
                  )}
                </p>
                <p className="text-sm text-orange-600 mt-1">Combined periods</p>
            </div>

              <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-emerald-700">Average Daily</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-lg font-bold text-emerald-800">
                  {formatCurrency(metrics.totalPurchases.yearly / 365)}
                </p>
                <p className="text-sm text-emerald-600 mt-1">Based on yearly data</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cash Flow & Supplier Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cash Flow Analysis */}
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-purple-50">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Cash Flow Analysis</h3>
            <div className="h-72">
              <Bar data={cashFlowData} options={trendChartOptions} />
            </div>
          </div>

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
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(supplier.totalAmount)}</p>
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
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-medium text-green-700">Paid</span>
                </div>
                <p className="text-lg font-bold text-green-800">
                  {metrics.invoiceMetrics.paid}
                </p>
                <p className="text-xs text-green-600">{formatCurrency(metrics.invoiceMetrics.paidAmount)}</p>
              </div>
              
              <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-xs font-medium text-yellow-700">Pending</span>
                </div>
                <p className="text-lg font-bold text-yellow-800">
                  {metrics.invoiceMetrics.pending}
                </p>
                <p className="text-xs text-yellow-600">{formatCurrency(metrics.invoiceMetrics.pendingAmount)}</p>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-xs font-medium text-blue-700">Approved</span>
                </div>
                <p className="text-lg font-bold text-blue-800">
                  {metrics.invoiceMetrics.approved}
                </p>
                <p className="text-xs text-blue-600">Ready for payment</p>
              </div>
              
              <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-xs font-medium text-red-700">Overdue</span>
                </div>
                <p className="text-lg font-bold text-red-800">
                  {metrics.invoiceMetrics.overdue}
                </p>
                <p className="text-xs text-red-600">Requires attention</p>
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
            <h3 className="text-xl font-bold text-gray-900">Recent Cash Closes</h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-blue-50 rounded-full px-3 py-1">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-600 font-medium">Real-time</span>
              </div>
                                  <button 
                onClick={() => router.push('/dashboard/purchase-manager/cash-tracking')}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                  >
                              <Eye className="w-4 h-4" />
                <span>View All</span>
                                </button>
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
            <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Activities</h3>
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