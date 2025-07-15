'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './ui/Sidebar';
import { MetricCard } from './ui/card';
import { ActivityChart } from './dashboard/ActivityChart';
import { TransactionsList } from './dashboard/TransactionsList';
import { QuickActions } from './dashboard/QuickActions';
import { ScheduleCalendar } from './dashboard/ScheduleCalendar';

// Firebase imports
import { firestoreServices } from '../lib/firebase/firestore-service';
import { authService, AuthUser } from '../lib/firebase/auth';
import { CashClose, Invoice, Employee, Expense } from '../lib/firebase/models';
import { LogOut, User, ChevronDown } from 'lucide-react';

interface DashboardMetrics {
  totalRevenue: number;
  totalExpenses: number;
  activeEmployees: number;
  pendingInvoices: number;
  overdueInvoices: number;
  todayCashCloses: number;
}

export function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    totalExpenses: 0,
    activeEmployees: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    todayCashCloses: 0
  });

  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Get current user
  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    const unsubscribe = authService.onAuthStateChange((user) => {
      setCurrentUser(user);
    });

    return unsubscribe;
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserMenu) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showUserMenu]);

  // Real-time data subscriptions
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    const setupRealtimeSubscriptions = async () => {
      try {
        // Subscribe to cash closes for real-time revenue updates
        const unsubscribeCashCloses = firestoreServices.cashClose.onSnapshot(
          (cashCloses: CashClose[]) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const todayCloses = cashCloses.filter(close => {
              const closeDate = close.cashCloseDate.toDate();
              closeDate.setHours(0, 0, 0, 0);
              return closeDate.getTime() === today.getTime();
            });

            const totalRevenue = todayCloses.reduce((sum, close) => sum + close.actualAmount, 0);
            
            setMetrics(prev => ({
              ...prev,
              totalRevenue,
              todayCashCloses: todayCloses.length
            }));
          },
          [
            { field: 'cashCloseDate', operator: '>=', value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          ]
        );
        unsubscribers.push(unsubscribeCashCloses);

        // Subscribe to invoices for pending/overdue counts
        const unsubscribeInvoices = firestoreServices.invoice.onSnapshot(
          (invoices: Invoice[]) => {
            const pending = invoices.filter(inv => inv.status === 'Pending').length;
            const overdue = invoices.filter(inv => inv.status === 'Overdue').length;
            
            setMetrics(prev => ({
              ...prev,
              pendingInvoices: pending,
              overdueInvoices: overdue
            }));

            // Update recent transactions (last 10 invoices)
            const recentInvoices = invoices
              .sort((a, b) => b.date.seconds - a.date.seconds)
              .slice(0, 10)
              .map(invoice => ({
                id: invoice.id,
                type: 'Invoice',
                description: invoice.title,
                amount: invoice.amount,
                status: invoice.status,
                date: invoice.createdAt.toDate()
              }));
            
            setRecentTransactions(recentInvoices);
          },
          [],
          { orderBy: 'date', orderDirection: 'desc', limit: 50 }
        );
        unsubscribers.push(unsubscribeInvoices);

        // Subscribe to employees for active count
        const unsubscribeEmployees = firestoreServices.employee.onSnapshot(
          (employees: Employee[]) => {
            const active = employees.filter(emp => emp.employmentStatus === 'Active').length;
            setMetrics(prev => ({ ...prev, activeEmployees: active }));
          },
          [{ field: 'employmentStatus', operator: '==', value: 'Active' }]
        );
        unsubscribers.push(unsubscribeEmployees);

        // Subscribe to expenses for total expenses
        const unsubscribeExpenses = firestoreServices.expense.onSnapshot(
          (expenses: Expense[]) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const todayExpenses = expenses.filter(expense => {
              const expenseDate = expense.expenseDate.toDate();
              expenseDate.setHours(0, 0, 0, 0);
              return expenseDate.getTime() === today.getTime();
            });

            const totalExpenses = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
            setMetrics(prev => ({ ...prev, totalExpenses }));
          },
          [
            { field: 'expenseDate', operator: '>=', value: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          ]
        );
        unsubscribers.push(unsubscribeExpenses);

        setLoading(false);
      } catch (err) {
        console.error('Error setting up real-time subscriptions:', err);
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    };

    setupRealtimeSubscriptions();

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  // Sample data for charts and calendar (in a real app, this would come from Firestore)
  const activityData = [
    { month: 'Jan', revenue: 45000, expenses: 32000 },
    { month: 'Feb', revenue: 52000, expenses: 38000 },
    { month: 'Mar', revenue: 48000, expenses: 35000 },
    { month: 'Apr', revenue: 61000, expenses: 42000 },
    { month: 'May', revenue: 55000, expenses: 39000 },
    { month: 'Jun', revenue: 67000, expenses: 45000 },
  ];

  const upcomingBills = [
    { id: 1, title: 'Office Rent', amount: 2500, dueDate: '2024-01-15', status: 'pending' },
    { id: 2, title: 'Utility Bills', amount: 850, dueDate: '2024-01-18', status: 'pending' },
    { id: 3, title: 'Supplier Payment', amount: 15000, dueDate: '2024-01-20', status: 'overdue' },
    { id: 4, title: 'Insurance Premium', amount: 1200, dueDate: '2024-01-25', status: 'pending' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-500 mt-1">Welcome back! Here's what's happening with your business.</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-80 pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  🔍
                </div>
              </div>
              
              {/* Notifications */}
              <button className="relative w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors duration-200">
                <span className="text-lg">🔔</span>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">3</span>
                </div>
              </button>
              
              {/* Profile */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {currentUser?.displayName || `${currentUser?.employee?.firstName} ${currentUser?.employee?.lastName}` || 'User'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {currentUser?.employee?.roles?.[0]?.jobTitle || 'Employee'}
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* User Menu Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-medium text-gray-900">
                        {currentUser?.displayName || `${currentUser?.employee?.firstName} ${currentUser?.employee?.lastName}`}
                      </p>
                      <p className="text-sm text-gray-500">{currentUser?.email}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {currentUser?.employee?.roles?.map((role, index) => (
                          <span
                            key={index}
                            className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                          >
                            {role.jobTitle}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          // Add profile edit functionality here
                        }}
                        className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <User className="w-4 h-4" />
                        Edit Profile
                      </button>
                      
                      <button
                        onClick={async () => {
                          setShowUserMenu(false);
                          try {
                            await authService.signOut();
                          } catch (error) {
                            console.error('Logout error:', error);
                          }
                        }}
                        className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-3"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-8">
          <div className="grid grid-cols-12 gap-6">
            {/* Metrics Row */}
            <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Today's Revenue"
                value={`$${metrics.totalRevenue.toLocaleString()}`}
                trend={{ value: 12.5, isPositive: true }}
                icon="💰"
              />
              <MetricCard
                title="Today's Expenses"
                value={`$${metrics.totalExpenses.toLocaleString()}`}
                trend={{ value: 3.2, isPositive: false }}
                icon="💸"
              />
              <MetricCard
                title="Active Employees"
                value={metrics.activeEmployees.toString()}
                trend={{ value: 5.1, isPositive: true }}
                icon="👥"
              />
              <MetricCard
                title="Pending Invoices"
                value={metrics.pendingInvoices.toString()}
                trend={{ 
                  value: metrics.overdueInvoices, 
                  isPositive: metrics.overdueInvoices === 0 
                }}
                icon="📄"
              />
            </div>

            {/* Main Content Row */}
            <div className="col-span-12 lg:col-span-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Activity Chart - spans 2 columns */}
              <div className="lg:col-span-2">
                <ActivityChart />
              </div>
              
              {/* Transactions List - spans 1 column */}
              <div className="lg:col-span-1">
                <TransactionsList />
              </div>
            </div>

            {/* Right Sidebar Content */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              {/* Quick Actions */}
              <QuickActions />
              
              {/* Schedule & Bills */}
              <ScheduleCalendar />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 