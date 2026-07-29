'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService, AuthUser } from '../../lib/firebase/auth';
import { isAdminUser, ADMIN_NAV_ITEM_IDS } from '../../lib/firebase/admin-access';
import { ReceiverQueries } from '../../lib/firebase/role-based-queries';
import { 
  LayoutDashboard,
  DollarSign,
  Package,
  Users,
  FileText,
  TrendingUp,
  Shield,
  Truck,
  Calculator,
  BarChart3,
  Settings,
  Building2,
  Receipt,
  CreditCard,
  Upload,
  AlertTriangle,
  UserCheck,
  UserPlus,
  UserX,
  ClipboardList,
  QrCode,
  Factory,
  ChevronDown,
  Plus,
  Eye,
  RefreshCw,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Banknote,
  Smartphone,
  Calendar,
  Sun,
  Moon,
  LogOut,
  Wallet,
  Database,
  Send,
  KeyRound,
  Monitor,
  ArrowDownUp,
  Menu,
  X
} from 'lucide-react';
import { EQUITY_BRAND } from '@/components/staff/brand';

interface SidebarProps {
  activeItem?: string;
  onItemClick?: (item: string) => void;
}

interface NavigationItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  path?: string;
  roles: string[];
  isGroupHeader?: boolean;
  submenu?: {
    id: string;
    icon: React.ReactNode;
    label: string;
    path: string;
  }[];
}

const navigationItems: NavigationItem[] = [
  // Managing Director specific
  { 
    id: 'executive-dashboard', 
    icon: <LayoutDashboard className="w-5 h-5" />, 
    label: 'Dashboard', 
    path: '/dashboard/managing-director',
    roles: ['Managing Director']
  },
  { 
    id: 'business-analytics', 
    icon: <TrendingUp className="w-5 h-5" />, 
    label: 'Analytics & Forecasting', 
    path: '/dashboard/managing-director/analytics',
    roles: ['Managing Director']
  },
  { 
    id: 'outstanding-invoices', 
    icon: <Receipt className="w-5 h-5" />, 
    label: 'Outstanding Invoices', 
    path: '/dashboard/managing-director/outstanding-invoices',
    roles: ['Managing Director']
  },

  // Managing Director — Finance & Oversight
  {
    id: 'md-group-finance',
    icon: <span />,
    label: 'Finance & Oversight',
    isGroupHeader: true,
    roles: ['Managing Director']
  },
  {
    id: 'md-till-cash-closes',
    icon: <Wallet className="w-5 h-5" />,
    label: 'Till Cash Closes',
    path: '/dashboard/purchase-manager/till-cash-closes',
    roles: ['Managing Director']
  },
  {
    id: 'md-supplier-statements',
    icon: <FileText className="w-5 h-5" />,
    label: 'Supplier Statements',
    path: '/dashboard/purchase-manager/supplier-statements',
    roles: ['Managing Director']
  },
  {
    id: 'md-cheque-tracker',
    icon: <Banknote className="w-5 h-5" />,
    label: 'Cheque Tracker',
    path: '/dashboard/purchase-manager/cheques',
    roles: ['Managing Director']
  },
  {
    id: 'md-group-ledgers',
    icon: <span />,
    label: 'Money Usage & Ledgers',
    isGroupHeader: true,
    roles: ['Managing Director']
  },
  {
    id: 'md-account-ledgers',
    icon: <Wallet className="w-5 h-5" />,
    label: 'Account Ledgers',
    path: '/dashboard/account-ledgers',
    roles: ['Managing Director']
  },
  {
    id: 'md-expenses',
    icon: <Receipt className="w-5 h-5" />,
    label: 'Expenses & Equity Wallet',
    path: '/dashboard/managing-director/expenses',
    roles: ['Managing Director']
  },
  {
    id: 'md-cash-pay',
    icon: <ArrowDownUp className="w-5 h-5" />,
    label: 'Cash Pay',
    path: '/dashboard/purchase-manager/cash-pay',
    roles: ['Managing Director']
  },

  // Dashboard - Available to all roles except purchasing managers (they use PM Dashboard)
  { 
    id: 'dashboard', 
    icon: <LayoutDashboard className="w-5 h-5" />, 
    label: 'Dashboard', 
    path: '/dashboard',
    roles: ['Manager', 'Accountant', 'HR', 'HR Manager', 'Stock Manager', 'Receiver', 'Auditor', 'Supervisor', 'Cashier', 'Customer Service', 'Managing Director']
  },
  
  // Analytics Dashboard - For business intelligence and data analysis
  { 
    id: 'analytics', 
    icon: <TrendingUp className="w-5 h-5" />, 
    label: 'Analytics Dashboard', 
    path: '/dashboard/analytics',
    roles: ['Manager', 'Accountant', 'Managing Director']
  },
  


  
  // Admin — business + platform (merged business admin & system admin)
  {
    id: 'admin-home',
    icon: <Shield className="w-5 h-5" />,
    label: 'Admin Console',
    path: '/dashboard/admin',
    roles: ['Admin'],
  },
  {
    id: 'admin-roles',
    icon: <KeyRound className="w-5 h-5" />,
    label: 'System Roles',
    path: '/dashboard/system-admin/roles',
    roles: ['Admin'],
  },
  {
    id: 'admin-accountability',
    icon: <FileText className="w-5 h-5" />,
    label: 'Accountability',
    path: '/dashboard/system-admin/accountability',
    roles: ['Admin'],
  },
  {
    id: 'admin-sessions',
    icon: <Monitor className="w-5 h-5" />,
    label: 'Login Sessions',
    path: '/dashboard/system-admin/sessions',
    roles: ['Admin'],
  },
  {
    id: 'admin-users',
    icon: <Users className="w-5 h-5" />,
    label: 'User Directory',
    path: '/dashboard/system-admin/users',
    roles: ['Admin'],
  },
  {
    id: 'admin-create-account',
    icon: <UserPlus className="w-5 h-5" />,
    label: 'Create Account',
    path: '/dashboard/admin/create-account',
    roles: ['Admin', 'Managing Director'],
  },
  {
    id: 'admin-registered-employees',
    icon: <Users className="w-5 h-5" />,
    label: 'Registered Employees',
    path: '/dashboard/purchase-manager/registered-employees',
    roles: ['Admin', 'Managing Director'],
  },
  {
    id: 'md-pm-accounts',
    icon: <UserX className="w-5 h-5" />,
    label: 'PM Accounts',
    path: '/dashboard/managing-director/pm-accounts',
    roles: ['Managing Director'],
  },
  {
    id: 'admin-security',
    icon: <Activity className="w-5 h-5" />,
    label: 'Security Overview',
    path: '/dashboard/system-admin/security',
    roles: ['Admin'],
  },
  // Manager specific
  { 
    id: 'performance', 
    icon: <TrendingUp className="w-5 h-5" />, 
    label: 'Performance', 
    path: '/dashboard/manager',
    roles: ['Manager']
  },
  { 
    id: 'branches', 
    icon: <Building2 className="w-5 h-5" />, 
    label: 'Branch Management', 
    path: '/dashboard/settings',
    roles: ['Manager']
  },
  
  // Accountant specific
  // Cash allocation removed per user request
  { 
    id: 'pm-allocations', 
    icon: <Send className="w-5 h-5" />, 
    label: 'PM Allocations', 
    path: '/dashboard/accountant/allocations',
    roles: ['Accountant']
  },
  { 
    id: 'cash-close', 
    icon: <DollarSign className="w-5 h-5" />, 
    label: 'Daily Cash Close', 
    path: '/dashboard/accountant/cash-close',
    roles: ['Accountant']
  },
  { 
    id: 'profit-analysis', 
    icon: <TrendingUp className="w-5 h-5" />, 
    label: 'Profit Analysis', 
    path: '/dashboard/accountant/profits',
    roles: ['Accountant']
  },
  { 
    id: 'expenses', 
    icon: <Receipt className="w-5 h-5" />, 
    label: 'Expenses', 
    path: '/dashboard/accountant/expenses',
    roles: ['Accountant']
  },
  { 
    id: 'expense-payments', 
    icon: <CreditCard className="w-5 h-5" />, 
    label: 'Expense Payments', 
    path: '/dashboard/accountant/expenses/payments',
    roles: ['Accountant']
  },
  { 
    id: 'expense-types', 
    icon: <Settings className="w-5 h-5" />, 
    label: 'Expense Types', 
    path: '/dashboard/accountant/expense-types',
    roles: ['Accountant']
  },
  { 
    id: 'fund-balances', 
    icon: <DollarSign className="w-5 h-5" />, 
    label: 'Fund Balances', 
    path: '/dashboard/accountant/fund-balances',
    roles: ['Accountant']
  },
  { 
    id: 'equity-wallet', 
    icon: <Wallet className="w-5 h-5" />, 
    label: 'Equity Wallet', 
    path: '/dashboard/accountant/reports',
    roles: ['Accountant', 'Manager']
  },
  {
    id: 'accountant-cash-pay',
    icon: <ArrowDownUp className="w-5 h-5" />,
    label: 'Cash Pay',
    path: '/dashboard/purchase-manager/cash-pay',
    roles: ['Accountant', 'Manager']
  },
  {
    id: 'your-account',
    icon: <Banknote className="w-5 h-5" />,
    label: 'Your Account',
    path: '/dashboard/accountant/account',
    roles: ['Accountant', 'Manager']
  },
  
  // Purchase Manager specific — Dashboard first
  { 
    id: 'pm-dashboard', 
    icon: <LayoutDashboard className="w-5 h-5" />, 
    label: 'PM Dashboard', 
    path: '/dashboard/purchase-manager',
    roles: ['Purchase Manager', 'Purchasing Manager']
  },
  {
    id: 'pm-register-employee',
    icon: <UserPlus className="w-5 h-5" />,
    label: 'Register Staff',
    path: '/dashboard/purchase-manager/register-employee',
    roles: ['Purchase Manager', 'Purchasing Manager']
  },
  {
    id: 'pm-registered-employees',
    icon: <Users className="w-5 h-5" />,
    label: 'Registered Employees',
    path: '/dashboard/purchase-manager/registered-employees',
    roles: ['Purchase Manager', 'Purchasing Manager'],
  },

  // Group: Procurement
  {
    id: 'pm-group-procurement',
    icon: <span />,
    label: 'Procurement',
    isGroupHeader: true,
    roles: ['Purchase Manager', 'Purchasing Manager']
  },
  { 
    id: 'restock-orders', 
    icon: <Package className="w-5 h-5" />, 
    label: 'Restock Orders', 
    path: '/dashboard/purchase-manager/restock-orders',
    roles: ['Purchase Manager', 'Purchasing Manager']
  },
  { 
    id: 'invoices', 
    icon: <FileText className="w-5 h-5" />, 
    label: 'Invoices', 
    path: '/dashboard/purchase-manager/invoices',
    roles: ['Purchase Manager', 'Purchasing Manager']
  },
  { 
    id: 'pm-return-notes', 
    icon: <RefreshCw className="w-5 h-5" />, 
    label: 'Return Notes & Restocking', 
    path: '/dashboard/purchase-manager/return-notes',
    roles: ['Purchase Manager', 'Purchasing Manager']
  },
  { 
    id: 'suppliers', 
    icon: <Building2 className="w-5 h-5" />, 
    label: 'Suppliers', 
    path: '/dashboard/purchase-manager/suppliers',
    roles: ['Purchase Manager', 'Purchasing Manager']
  },
  {
    id: 'supplier-totals', 
    icon: <Calculator className="w-5 h-5" />, 
    label: 'Supplier Totals', 
    path: '/dashboard/purchase-manager/supplier-totals',
    roles: ['Purchase Manager', 'Purchasing Manager']
  },
  {
    id: 'supplier-statements',
    icon: <FileText className="w-5 h-5" />,
    label: 'Supplier Statements',
    path: '/dashboard/purchase-manager/supplier-statements',
    roles: ['Purchase Manager', 'Purchasing Manager']
  },

  // Group: Finance & Cash
  {
    id: 'pm-group-finance',
    icon: <span />,
    label: 'Finance & Cash',
    isGroupHeader: true,
    roles: ['Purchase Manager', 'Purchasing Manager']
  },
  { 
    id: 'pm-account', 
    icon: <Wallet className="w-5 h-5" />, 
    label: 'PM Account', 
    path: '/dashboard/purchase-manager/pm-account',
    roles: ['Purchase Manager', 'Purchasing Manager']
  },
  { 
    id: 'daily-allocation', 
    icon: <Calendar className="w-5 h-5" />, 
    label: 'Daily Fund Allocation', 
    path: '/dashboard/purchase-manager/daily-allocation',
    roles: ['Purchase Manager', 'Purchasing Manager']
  },
  { 
    id: 'payments',
    icon: <CreditCard className="w-5 h-5" />,
    label: 'Payments',
    path: '/dashboard/purchase-manager/payments',
    roles: ['Purchase Manager', 'Purchasing Manager']
  },
  {
    id: 'cash-pay',
    icon: <ArrowDownUp className="w-5 h-5" />,
    label: 'Cash Pay',
    path: '/dashboard/purchase-manager/cash-pay',
    roles: ['Purchase Manager', 'Purchasing Manager']
  },
  { 
    id: 'pm-cheques', 
    icon: <Banknote className="w-5 h-5" />, 
    label: 'Cheque Tracker', 
    path: '/dashboard/purchase-manager/cheques',
    roles: ['Purchase Manager', 'Purchasing Manager']
  },
  { 
    id: 'pm-expenses', 
    icon: <Receipt className="w-5 h-5" />, 
    label: 'PM Expenses', 
    path: '/dashboard/purchase-manager/expenses',
    roles: ['Purchase Manager', 'Purchasing Manager']
  },
  { 
    id: 'pm-allocations', 
    icon: <Send className="w-5 h-5" />, 
    label: 'Cash Close Records', 
    path: '/dashboard/purchase-manager/allocations',
    roles: ['Purchase Manager', 'Purchasing Manager']
  },
  { 
    id: 'till-cash-closes', 
    icon: <Wallet className="w-5 h-5" />, 
    label: 'Till Cash Closes', 
    path: '/dashboard/purchase-manager/till-cash-closes',
    roles: ['Purchase Manager', 'Purchasing Manager']
  },

  
  // HR specific
  { 
    id: 'hr-dashboard', 
    icon: <LayoutDashboard className="w-5 h-5" />, 
    label: 'HR Dashboard', 
    path: '/dashboard/hr',
    roles: ['HR', 'HR Manager', 'Manager']
  },
  { 
    id: 'employees', 
    icon: <Users className="w-5 h-5" />, 
    label: 'Employees', 
    roles: ['HR', 'HR Manager', 'Manager'],
    submenu: [
      {
        id: 'view-employees',
        icon: <Eye className="w-4 h-4" />,
        label: 'View All',
        path: '/dashboard/hr/employees'
      },
      {
        id: 'add-employee',
        icon: <Plus className="w-4 h-4" />,
        label: 'Add Employee',
        path: '/dashboard/hr/employees/add'
      }
    ]
  },
  { 
    id: 'attendance-tracking', 
    icon: <span className="w-5 h-5 flex items-center justify-center text-lg">🕐</span>, 
    label: 'Attendance Tracking', 
    path: '/dashboard/hr/attendance-tracking',
    roles: ['HR', 'HR Manager', 'Manager', 'Supervisor']
  },
  { 
    id: 'attendance', 
    icon: <span className="w-5 h-5 flex items-center justify-center text-lg">📋</span>, 
    label: 'Attendance Reports', 
    path: '/dashboard/hr/attendance',
    roles: ['HR', 'HR Manager', 'Manager', 'Supervisor']
  },
  { 
    id: 'leave-requests', 
    icon: <span className="w-5 h-5 flex items-center justify-center text-lg">📄</span>, 
    label: 'Leave Requests', 
    path: '/dashboard/hr/leave-requests',
    roles: ['HR', 'HR Manager', 'Manager', 'Supervisor']
  },
  { 
    id: 'leave-calendar', 
    icon: <span className="w-5 h-5 flex items-center justify-center text-lg">📅</span>, 
    label: 'Leave Calendar', 
    path: '/dashboard/hr/leave',
    roles: ['HR', 'HR Manager', 'Manager', 'Supervisor']
  },
  { 
    id: 'payroll', 
    icon: <Banknote className="w-5 h-5" />, 
    label: 'Payroll', 
    roles: ['HR', 'HR Manager', 'Manager'],
    submenu: [
      {
        id: 'payroll-processing',
        icon: <Calculator className="w-4 h-4" />,
        label: 'Processing',
        path: '/dashboard/hr/payroll'
      },
      {
        id: 'payroll-reports',
        icon: <BarChart3 className="w-4 h-4" />,
        label: 'Reports',
        path: '/dashboard/hr/reports'
      }
    ]
  },
  { 
    id: 'hr-barcodes', 
    icon: <QrCode className="w-5 h-5" />, 
    label: 'ID Cards & Barcodes', 
    path: '/dashboard/hr/barcodes',
    roles: ['HR', 'HR Manager', 'Manager']
  },
  { 
    id: 'employee-documents', 
    icon: <FileText className="w-5 h-5" />, 
    label: 'Documents', 
    path: '/dashboard/hr/employee-documents',
    roles: ['HR', 'HR Manager', 'Manager']
  },
  
  // Stock Manager specific
  { 
    id: 'inventory', 
    icon: <Package className="w-5 h-5" />, 
    label: 'Inventory', 
    path: '/dashboard/stock-manager',
    roles: ['Stock Manager']
  },

  // Receiver specific - arranged in order
  { 
    id: 'receiver-dashboard', 
    icon: <LayoutDashboard className="w-5 h-5" />, 
    label: 'Receiver Dashboard', 
    path: '/dashboard/receiver',
    roles: ['Receiver']
  },
  { 
    id: 'restocking', 
    icon: <Package className="w-5 h-5" />, 
    label: 'Restocking', 
    path: '/dashboard/receiver/restocking',
    roles: ['Receiver']
  },
  {
    id: 'restock-verification',
    icon: <Package className="w-5 h-5" />,
    label: 'Stock Received',
    path: '/dashboard/receiver/restock-verification',
    roles: ['Receiver']
  },
  { 
    id: 'deliveries', 
    icon: <Truck className="w-5 h-5" />, 
    label: 'Suppliers Expected', 
    path: '/dashboard/receiver/deliveries',
    roles: ['Receiver']
  },
  { 
    id: 'suppliers', 
    icon: <Factory className="w-5 h-5" />, 
    label: 'Suppliers', 
    path: '/dashboard/receiver/suppliers',
    roles: ['Receiver']
  },
  { 
    id: 'invoices', 
    icon: <Receipt className="w-5 h-5" />, 
    label: 'Invoice', 
    path: '/dashboard/receiver/invoices',
    roles: ['Receiver']
  },
  { 
    id: 'return-notes-management', 
    icon: <ClipboardList className="w-5 h-5" />, 
    label: 'Return Notes Management', 
    path: '/dashboard/receiver/returns',
    roles: ['Receiver']
  },
  { 
    id: 'return-notes-tracking', 
    icon: <RefreshCw className="w-5 h-5" />, 
    label: 'Return Notes Tracking', 
    path: '/dashboard/receiver/returns/tracking',
    roles: ['Receiver']
  },
  { 
    id: 'damages', 
    icon: <AlertTriangle className="w-5 h-5" />, 
    label: 'Damages', 
    path: '/dashboard/receiver/damages',
    roles: ['Receiver']
  },
  { 
    id: 'barcode', 
    icon: <QrCode className="w-5 h-5" />, 
    label: 'Barcode', 
    path: '/dashboard/receiver/barcode',
    roles: ['Receiver']
  },
  { 
    id: 'damage-reports', 
    icon: <AlertTriangle className="w-5 h-5" />, 
    label: 'Damage Reports', 
    path: '/dashboard/receiver/damages',
    roles: ['Stock Manager', 'Manager']
  },
  
  // Auditor specific
  { 
    id: 'audit-reports', 
    icon: <QrCode className="w-5 h-5" />, 
    label: 'Audit Reports', 
    path: '/dashboard/auditor',
    roles: ['Auditor']
  },
  
  // Customer Service specific
  { 
    id: 'customer-service-desk', 
    icon: <Users className="w-5 h-5" />, 
    label: 'Customer Service', 
    path: '/dashboard/receiver/returns',
    roles: ['Customer Service', 'Manager']
  },
  
  // Cashier specific
  { 
    id: 'cashier-operations', 
    icon: <CreditCard className="w-5 h-5" />, 
    label: 'Cashier Operations', 
    path: '/dashboard/purchase-manager/payments',
    roles: ['Cashier', 'Manager']
  },
  
  // Employee Self-Service (for all employee roles)
  { 
    id: 'my-attendance', 
    icon: <span className="w-5 h-5 flex items-center justify-center text-lg">🕐</span>, 
    label: 'My Attendance', 
    path: '/dashboard/hr/attendance-tracking',
    roles: []
  },
  { 
    id: 'my-leave', 
    icon: <span className="w-5 h-5 flex items-center justify-center text-lg">📅</span>, 
    label: 'My Leave Requests', 
    path: '/dashboard/hr/leave-requests',
    roles: []
  },
  
  // Development/Testing
  { 
    id: 'offline-test', 
    icon: <RefreshCw className="w-5 h-5" />, 
    label: 'Offline Test', 
    path: '/dashboard/offline-test',
    roles: []
  },
  
  // Settings - Available to all roles except Admin (platform-only account)
  { 
    id: 'settings', 
    icon: <Settings className="w-5 h-5" />, 
    label: 'Settings', 
    path: '/dashboard/settings',
    roles: ['*'] // All roles can access settings
  }
];

interface ExpectedSupplier {
  id: string;
  name: string;
  expectedTime: string;
  items: number;
  status: 'on-time' | 'delayed' | 'early';
  priority: 'high' | 'medium' | 'low';
}

interface PMQuickAction {
  id: string;
  title: string;
  count: number;
  type: 'pending-invoices' | 'overdue-payments' | 'cash-shortage';
  priority: 'high' | 'medium' | 'low';
  action: string;
}

interface HRQuickAction {
  id: string;
  title: string;
  count: number;
  type: 'pending-leave-requests' | 'attendance-alerts' | 'new-employees' | 'expired-documents' | 'birthday-reminders';
  priority: 'high' | 'medium' | 'low';
  action: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeItem, onItemClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());
  const [expectedSuppliers, setExpectedSuppliers] = useState<ExpectedSupplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [pmQuickActions, setPMQuickActions] = useState<PMQuickAction[]>([]);
  const [loadingPMActions, setLoadingPMActions] = useState(false);
  const [hrQuickActions, setHRQuickActions] = useState<HRQuickAction[]>([]);
  const [loadingHRActions, setLoadingHRActions] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    const unsubscribe = authService.onAuthStateChange((user) => {
      setCurrentUser(user);
      // Load expected suppliers when user changes and is a receiver
      if (user && user.employee?.roles?.[0]?.jobTitle === 'Receiver') {
        loadExpectedSuppliers();
      }
      // Load PM quick actions when user changes and is a purchasing manager
      const userRole = user?.employee?.roles?.[0]?.jobTitle;
      if (user && (userRole === 'Purchase Manager' || userRole === 'Purchasing Manager')) {
        loadPMQuickActions();
      }
      // Load HR quick actions when user changes and is HR
      if (user && userRole === 'HR') {
        loadHRQuickActions();
      }
    });

    // Load expected suppliers immediately if user is already a receiver
    if (user && user.employee?.roles?.[0]?.jobTitle === 'Receiver') {
      loadExpectedSuppliers();
    }

    // Load PM quick actions immediately if user is already a purchasing manager
    const userRole = user?.employee?.roles?.[0]?.jobTitle;
    if (user && (userRole === 'Purchase Manager' || userRole === 'Purchasing Manager')) {
      loadPMQuickActions();
    }

    // Load HR quick actions immediately if user is already HR
    if (user && userRole === 'HR') {
      loadHRQuickActions();
    }

    return unsubscribe;
  }, []);

  // Phone drawer: always show labels while open; close when route changes
  useEffect(() => {
    if (mobileOpen) setIsExpanded(true);
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const closeMobileNav = () => setMobileOpen(false);

  const loadExpectedSuppliers = async () => {
    try {
      setLoadingSuppliers(true);
      // This would be replaced with actual API call
      const data = await ReceiverQueries.getTodaysExpectedSuppliers();
      setExpectedSuppliers(data);
    } catch (error) {
      console.error('Error loading expected suppliers:', error);
      // Mock data for demo purposes
      const mockSuppliers: ExpectedSupplier[] = [
        {
          id: '1',
          name: 'TechCorp Ltd',
          expectedTime: '09:30 AM',
          items: 45,
          status: 'on-time',
          priority: 'high'
        },
        {
          id: '2',
          name: 'Supply Chain Co',
          expectedTime: '11:15 AM',
          items: 23,
          status: 'delayed',
          priority: 'medium'
        },
        {
          id: '3',
          name: 'Global Parts Inc',
          expectedTime: '02:00 PM',
          items: 67,
          status: 'early',
          priority: 'high'
        },
        {
          id: '4',
          name: 'Reliable Suppliers',
          expectedTime: '03:45 PM',
          items: 12,
          status: 'on-time',
          priority: 'low'
        },
        {
          id: '5',
          name: 'Express Delivery',
          expectedTime: '04:30 PM',
          items: 89,
          status: 'on-time',
          priority: 'high'
        }
      ];
      setExpectedSuppliers(mockSuppliers);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const loadPMQuickActions = async () => {
    const userRole = getUserRole();
    if (userRole !== 'Purchase Manager' && userRole !== 'Purchasing Manager') return;
    
    setLoadingPMActions(true);
    try {
      // Mock data for now - in real implementation, this would fetch from Firebase
      const mockActions: PMQuickAction[] = [
        {
          id: 'pending-invoices',
          title: 'Pending Invoices',
          count: 5,
          type: 'pending-invoices',
          priority: 'high',
          action: 'Approve/Reject'
        },

        {
          id: 'overdue-payments',
          title: 'Overdue Payments',
          count: 2,
          type: 'overdue-payments',
          priority: 'high',
          action: 'Process'
        },
        {
          id: 'cash-shortage',
          title: 'Cash Shortages',
          count: 1,
          type: 'cash-shortage',
          priority: 'high',
          action: 'Investigate'
        }
      ];
      
      setPMQuickActions(mockActions.filter(action => action.count > 0));
    } catch (error) {
      console.error('Error loading PM quick actions:', error);
      setPMQuickActions([]);
    } finally {
      setLoadingPMActions(false);
    }
  };

  const loadHRQuickActions = async () => {
    const userRole = getUserRole();
    if (userRole !== 'HR') return;
    
    setLoadingHRActions(true);
    try {
      // Mock data for now - in real implementation, this would fetch from Firebase
      const mockActions: HRQuickAction[] = [
        {
          id: 'pending-leave-requests',
          title: 'Leave Requests',
          count: 8,
          type: 'pending-leave-requests',
          priority: 'high',
          action: 'Review & Approve'
        },
        {
          id: 'attendance-alerts',
          title: 'Late Check-ins',
          count: 3,
          type: 'attendance-alerts',
          priority: 'medium',
          action: 'Follow Up'
        },
        {
          id: 'new-employees',
          title: 'New Joiners',
          count: 2,
          type: 'new-employees',
          priority: 'medium',
          action: 'Complete Setup'
        },
        {
          id: 'expired-documents',
          title: 'Expired Docs',
          count: 5,
          type: 'expired-documents',
          priority: 'high',
          action: 'Update Required'
        },
        {
          id: 'birthday-reminders',
          title: 'Birthdays Today',
          count: 4,
          type: 'birthday-reminders',
          priority: 'low',
          action: 'Send Wishes'
        }
      ];
      
      setHRQuickActions(mockActions.filter(action => action.count > 0));
    } catch (error) {
      console.error('Error loading HR quick actions:', error);
      setHRQuickActions([]);
    } finally {
      setLoadingHRActions(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-time': return 'bg-green-100 text-green-700 border-green-200';
      case 'delayed': return 'bg-red-100 text-red-700 border-red-200';
      case 'early': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚫';
    }
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getUserRole = (): string => {
    return currentUser?.employee?.roles?.[0]?.jobTitle || 'User';
  };

  const getFilteredNavigationItems = (): NavigationItem[] => {
    if (isAdminUser(currentUser)) {
      const allowed = new Set<string>(ADMIN_NAV_ITEM_IDS);
      return navigationItems.filter((item) => allowed.has(item.id));
    }

    const userRole = getUserRole();

    return navigationItems
      .filter(
        (item) =>
          item.roles.includes(userRole) ||
          item.roles.includes('*') ||
          item.id === 'settings'
      )
      .filter((item) => item.id !== 'dashboard');
  };

  const handleItemClick = (item: NavigationItem) => {
    // Special handling for hr-dashboard item for HR
    if (item.id === 'hr-dashboard' && getUserRole() === 'HR') {
      // Toggle dropdown for HR quick actions
      const newOpenDropdowns = new Set(openDropdowns);
      if (newOpenDropdowns.has(item.id)) {
        newOpenDropdowns.delete(item.id);
      } else {
        newOpenDropdowns.add(item.id);
      }
      setOpenDropdowns(newOpenDropdowns);
      // Still navigate to the main HR dashboard page
      if (item.path) {
        if (onItemClick) {
          onItemClick(item.id);
        } else {
          router.push(item.path);
        }
        closeMobileNav();
      }
    }
    // Special handling for PM dashboard item for purchasing managers
    else if (item.id === 'pm-dashboard' && (getUserRole() === 'Purchase Manager' || getUserRole() === 'Purchasing Manager')) {
      // Toggle dropdown for quick actions
      const newOpenDropdowns = new Set(openDropdowns);
      if (newOpenDropdowns.has(item.id)) {
        newOpenDropdowns.delete(item.id);
      } else {
        newOpenDropdowns.add(item.id);
      }
      setOpenDropdowns(newOpenDropdowns);
      // Still navigate to the main PM dashboard
      if (item.path) {
        if (onItemClick) {
          onItemClick(item.id);
        } else {
          router.push(item.path);
        }
        closeMobileNav();
      }
    } else if (item.submenu) {
      // Toggle dropdown
      const newOpenDropdowns = new Set(openDropdowns);
      if (newOpenDropdowns.has(item.id)) {
        newOpenDropdowns.delete(item.id);
      } else {
        newOpenDropdowns.add(item.id);
      }
      setOpenDropdowns(newOpenDropdowns);
    } else if (item.path) {
    if (onItemClick) {
      onItemClick(item.id);
    } else {
      router.push(item.path);
    }
    closeMobileNav();
    }
  };

  const handleSubmenuClick = (path: string) => {
    router.push(path);
    closeMobileNav();
  };

  const isActiveItem = (item: NavigationItem): boolean => {
    if (activeItem) {
      return activeItem === item.id;
    }
    if (item.path) {
    return pathname === item.path || pathname.startsWith(item.path + '/');
    }
    // For dropdown items, check if any submenu is active
    if (item.submenu) {
      return item.submenu.some(subItem => 
        pathname === subItem.path || pathname.startsWith(subItem.path + '/')
      );
    }
    return false;
  };

  const filteredItems = getFilteredNavigationItems();

  const renderSidebarPanel = () => (
    <div
      className="relative flex h-full min-h-0 w-full flex-col border-r bg-white py-4 transition-all duration-300 ease-in-out dark:border-white/10 dark:bg-[#120818] sm:py-6"
      style={{ borderColor: `${EQUITY_BRAND.purple}22` }}
    >
      {/* Logo and Toggle */}
      <div
        className="mb-6 border-b px-4 pb-4 sm:mb-8 sm:px-6"
        style={{
          borderColor: `${EQUITY_BRAND.purple}22`,
          background: `linear-gradient(135deg, ${EQUITY_BRAND.purpleSoft} 0%, #ffffff 45%, ${EQUITY_BRAND.greenSoft} 100%)`,
        }}
      >
        <div className="flex items-center">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white sm:h-12 sm:w-12"
          style={{ borderColor: `${EQUITY_BRAND.purple}33` }}
        >
          <img src="/equity-logo.png" alt="Equity Logo" className="h-full w-full object-contain" />
        </div>
        {isExpanded && (
          <div className="ml-3 min-w-0 overflow-hidden">
            <h2 className="whitespace-nowrap text-base font-bold sm:text-lg" style={{ color: EQUITY_BRAND.purple }}>
              Equity
            </h2>
            <p className="whitespace-nowrap text-xs font-medium sm:text-sm" style={{ color: EQUITY_BRAND.green }}>
              Retail System
            </p>
          </div>
        )}
        
        {/* Toggle Button — desktop collapse only */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`${isExpanded ? 'ml-auto' : 'absolute -right-3 top-6'} z-10 hidden h-6 w-6 items-center justify-center rounded-full border bg-white shadow-sm transition-all duration-200 hover:bg-[#F3EAF7] lg:flex`}
          style={{ borderColor: `${EQUITY_BRAND.purple}33`, color: EQUITY_BRAND.purple }}
        >
          <span className={`text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            ←
          </span>
        </button>

        <button
          type="button"
          onClick={closeMobileNav}
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg border lg:hidden"
          style={{ borderColor: `${EQUITY_BRAND.purple}33`, color: EQUITY_BRAND.purple }}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
        </div>
      </div>

      {/* Role Badge */}
      {isExpanded && (
        <div className="px-6 mb-4">
          <div
            className="rounded-lg border px-3 py-2"
            style={{
              borderColor: isAdminUser(currentUser)
                ? `${EQUITY_BRAND.purple}44`
                : `${EQUITY_BRAND.green}44`,
              backgroundColor: isAdminUser(currentUser)
                ? EQUITY_BRAND.purpleSoft
                : EQUITY_BRAND.greenSoft,
            }}
          >
            <p
              className="text-xs font-medium uppercase tracking-wide"
              style={{
                color: isAdminUser(currentUser) ? EQUITY_BRAND.purple : EQUITY_BRAND.green,
              }}
            >
              {getUserRole()}
            </p>
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-3">
        {filteredItems.map((item) => (
          <div key={item.id}>
          {item.isGroupHeader ? (
            // Group header label
            isExpanded ? (
              <div className="px-3 pt-4 pb-1">
                <span
                  className="text-[10px] font-bold uppercase tracking-widest select-none"
                  style={{ color: EQUITY_BRAND.orange }}
                >
                  {item.label}
                </span>
              </div>
            ) : (
              <div className="my-2 mx-2 border-t" style={{ borderColor: `${EQUITY_BRAND.purple}22` }} />
            )
          ) : (
          <>
          <button
            onClick={() => handleItemClick(item)}
              className={`${isExpanded ? 'justify-start px-3' : 'justify-center'} group relative flex h-12 w-full items-center rounded-xl transition-all duration-200 ${
              isActiveItem(item)
                ? 'text-white shadow-sm'
                : 'text-slate-700 hover:bg-[#F3EAF7] dark:text-slate-300 dark:hover:bg-white/5'
              }`}
            style={
              isActiveItem(item)
                ? { backgroundColor: EQUITY_BRAND.green }
                : undefined
            }
            title={!isExpanded ? item.label : undefined}
          >
            <span className={`${isExpanded ? 'mr-3' : ''} flex-shrink-0`}>
              {item.icon}
            </span>
            
            {/* Label - only show when expanded */}
            {isExpanded && (
                <span className="text-sm font-medium whitespace-nowrap overflow-hidden flex-1 text-left">
                {item.label}
              </span>
            )}

              {/* Dropdown arrow - only show when expanded and has submenu OR is pm-dashboard for PM */}
              {isExpanded && (item.submenu || 
                (item.id === 'pm-dashboard' && (getUserRole() === 'Purchase Manager' || getUserRole() === 'Purchasing Manager'))
              ) && (
                <ChevronDown 
                  className={`w-4 h-4 transition-transform duration-200 ${
                    openDropdowns.has(item.id) ? 'rotate-180' : ''
                  }`} 
                />
              )}

              {/* PM quick actions count badge for pm-dashboard - only when collapsed */}
              {!isExpanded && item.id === 'pm-dashboard' && (getUserRole() === 'Purchase Manager' || getUserRole() === 'Purchasing Manager') && pmQuickActions.length > 0 && (
                <div
                  className="absolute -top-1 -right-1 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                  style={{ backgroundColor: EQUITY_BRAND.orange }}
                >
                  {pmQuickActions.reduce((sum, action) => sum + action.count, 0)}
                </div>
              )}
            
            {/* Tooltip - only show when collapsed */}
            {!isExpanded && (
              <div
                className="absolute left-16 text-white text-sm px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50"
                style={{ backgroundColor: EQUITY_BRAND.purpleDark }}
              >
                {item.label}
              </div>
            )}
          </button>

            {/* Submenu - only show when expanded and dropdown is open */}
            {isExpanded && item.submenu && openDropdowns.has(item.id) && (
              <div className="ml-6 mt-1 space-y-1">
                {item.submenu.map((subItem) => {
                  const subActive =
                    pathname === subItem.path || pathname.startsWith(subItem.path + '/');
                  return (
                  <button
                    key={subItem.id}
                    onClick={() => handleSubmenuClick(subItem.path)}
                    className={`w-full h-10 rounded-lg flex items-center px-3 transition-all duration-200 text-sm ${
                      subActive
                        ? 'font-semibold text-white'
                        : 'text-slate-600 hover:bg-[#F3EAF7] hover:text-slate-800'
                    }`}
                    style={
                      subActive
                        ? { backgroundColor: EQUITY_BRAND.purple }
                        : undefined
                    }
                  >
                    <span className="mr-2 flex-shrink-0">
                      {subItem.icon}
                    </span>
                    <span className="font-medium whitespace-nowrap overflow-hidden">
                      {subItem.label}
                    </span>
                  </button>
                  );
                })}
              </div>
            )}

            {/* PM Quick Actions List - Special for pm-dashboard when purchasing manager */}
            {isExpanded && item.id === 'pm-dashboard' && (getUserRole() === 'Purchase Manager' || getUserRole() === 'Purchasing Manager') && openDropdowns.has(item.id) && (
              <div className="ml-6 mt-2 space-y-2">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-semibold text-orange-900">Quick Actions</span>
                  </div>
                  <span className="text-xs text-orange-600 font-medium">{getCurrentTime()}</span>
                </div>

                {/* Loading State */}
                {loadingPMActions && (
                  <div className="px-3 py-4 text-center">
                    <div className="animate-spin w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <span className="text-xs text-gray-500">Loading actions...</span>
                  </div>
                )}

                {/* Quick Actions List */}
                {!loadingPMActions && pmQuickActions.length > 0 && (
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {pmQuickActions.map((action) => (
                      <div
                        key={action.id}
                        className="px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
                        onClick={() => {
                          if (action.type === 'pending-invoices') {
                            router.push('/dashboard/purchase-manager?tab=invoices&filter=pending');
                          } else if (action.type === 'pending-expenses') {
                            router.push('/dashboard/purchase-manager?tab=expenses');
                          } else if (action.type === 'overdue-payments') {
                            router.push('/dashboard/purchase-manager?tab=payments&view=overdue');
                          } else if (action.type === 'cash-shortage') {
                            router.push('/dashboard/purchase-manager?tab=cash-tracking');
                          }
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-1">
                            <span className="text-xs">{getPriorityIcon(action.priority)}</span>
                            <span className="text-xs font-medium text-gray-900 truncate" title={action.title}>
                              {action.title.length > 12 ? action.title.substring(0, 12) + '...' : action.title}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-orange-600">{action.count}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">{action.action}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${
                            action.priority === 'high' ? 'bg-red-100 text-red-700 border-red-200' :
                            action.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                            'bg-green-100 text-green-700 border-green-200'
                          }`}>
                            {action.priority.charAt(0).toUpperCase() + action.priority.slice(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* No Actions */}
                {!loadingPMActions && pmQuickActions.length === 0 && (
                  <div className="px-3 py-4 text-center">
                    <div className="text-gray-400 mb-2">✅</div>
                    <span className="text-xs text-gray-500">All caught up!</span>
                  </div>
                )}

                {/* Quick Actions Buttons */}
                <div className="border-t border-gray-200 pt-2 space-y-1">
                  <button
                    onClick={() => router.push('/dashboard/purchase-manager')}
                    className="w-full h-8 rounded-lg flex items-center px-3 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                  >
                    <Eye className="w-3 h-3 text-emerald-600 mr-2" />
                    <span className="text-xs font-medium text-emerald-700">View Dashboard</span>
                  </button>
                  <button
                    onClick={() => loadPMQuickActions()}
                    className="w-full h-8 rounded-lg flex items-center px-3 bg-orange-50 hover:bg-orange-100 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3 text-orange-600 mr-2" />
                    <span className="text-xs font-medium text-orange-700">Refresh</span>
                  </button>
                </div>
              </div>
            )}

            {/* HR Quick Actions List - Special for hr-dashboard when HR */}
            {isExpanded && item.id === 'hr-dashboard' && getUserRole() === 'HR' && openDropdowns.has(item.id) && (
              <div className="ml-6 mt-2 space-y-2">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-semibold text-purple-900">HR Quick Actions</span>
                  </div>
                  <span className="text-xs text-purple-600 font-medium">{getCurrentTime()}</span>
                </div>

                {/* Loading State */}
                {loadingHRActions && (
                  <div className="px-3 py-4 text-center">
                    <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <span className="text-xs text-gray-500">Loading actions...</span>
                  </div>
                )}

                {/* Quick Actions List */}
                {!loadingHRActions && hrQuickActions.length > 0 && (
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {hrQuickActions.map((action) => (
                      <div
                        key={action.id}
                        className="px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
                        onClick={() => {
                          if (action.type === 'pending-leave-requests') {
                            router.push('/dashboard/hr/leave-requests');
                          } else if (action.type === 'attendance-alerts') {
                            router.push('/dashboard/hr/attendance-tracking');
                          } else if (action.type === 'new-employees') {
                            router.push('/dashboard/hr/employees/add');
                          } else if (action.type === 'expired-documents') {
                            router.push('/dashboard/hr/employee-documents');
                          } else if (action.type === 'birthday-reminders') {
                            router.push('/dashboard/hr/employees');
                          }
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-1">
                            <span className="text-xs">{getPriorityIcon(action.priority)}</span>
                            <span className="text-xs font-medium text-gray-900 truncate" title={action.title}>
                              {action.title.length > 12 ? action.title.substring(0, 12) + '...' : action.title}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-purple-600">{action.count}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">{action.action}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${
                            action.priority === 'high' ? 'bg-red-100 text-red-700 border-red-200' :
                            action.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                            'bg-green-100 text-green-700 border-green-200'
                          }`}>
                            {action.priority.charAt(0).toUpperCase() + action.priority.slice(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* No Actions */}
                {!loadingHRActions && hrQuickActions.length === 0 && (
                  <div className="px-3 py-4 text-center">
                    <div className="text-gray-400 mb-2">✅</div>
                    <span className="text-xs text-gray-500">All caught up!</span>
                  </div>
                )}

                {/* Quick Actions Buttons */}
                <div className="border-t border-gray-200 pt-2 space-y-1">
                  <button
                    onClick={() => router.push('/dashboard/hr')}
                    className="w-full h-8 rounded-lg flex items-center px-3 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                  >
                    <Eye className="w-3 h-3 text-emerald-600 mr-2" />
                    <span className="text-xs font-medium text-emerald-700">View Dashboard</span>
                  </button>
                  <button
                    onClick={() => loadHRQuickActions()}
                    className="w-full h-8 rounded-lg flex items-center px-3 bg-purple-50 hover:bg-purple-100 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3 text-purple-600 mr-2" />
                    <span className="text-xs font-medium text-purple-700">Refresh</span>
                  </button>
                </div>
              </div>
            )}
          </>
          )}
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className="mt-auto border-t px-3 pt-3" style={{ borderColor: `${EQUITY_BRAND.purple}22` }}>
        <button
          className={`${isExpanded ? 'justify-start px-3' : 'justify-center'} w-full h-12 rounded-xl flex items-center transition-all duration-200 group hover:bg-[#F3EAF7]`}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: EQUITY_BRAND.purpleSoft }}
          >
            <span className="font-semibold text-sm" style={{ color: EQUITY_BRAND.purple }}>
              {currentUser?.employee?.firstName?.charAt(0) || 'U'}
            </span>
          </div>
          
          {isExpanded && (
            <div className="ml-3 text-left overflow-hidden">
              <p className="text-sm font-medium text-slate-900 whitespace-nowrap">
                {currentUser?.employee?.firstName} {currentUser?.employee?.lastName}
              </p>
              <p className="text-xs font-medium whitespace-nowrap" style={{ color: EQUITY_BRAND.orange }}>
                {getUserRole()}
              </p>
            </div>
          )}
        </button>
        {/* Logout Button */}
        <button
          onClick={async () => {
            try {
              await authService.signOut();
              setCurrentUser(null);
              router.push('/auth/login');
            } catch (error) {
              console.error('Error signing out:', error);
              alert('Failed to sign out. You will be redirected to login.');
              setCurrentUser(null);
              router.push('/auth/login');
            }
          }}
          className={`${isExpanded ? 'justify-start px-3 mt-2' : 'justify-center mt-2'} w-full h-12 rounded-xl flex items-center hover:bg-red-50 transition-all duration-200 group border border-red-100`}
        >
          <LogOut className={`w-5 h-5 text-red-500 group-hover:text-red-600 transition-colors ${isExpanded ? 'mr-3' : ''}`} />
          {isExpanded && (
            <span className="text-sm font-medium text-red-600 whitespace-nowrap overflow-hidden flex-1 text-left">
              Sign Out
            </span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="contents">
      {/* Phone top bar */}
      <div
        className="sticky top-0 z-40 flex w-full items-center justify-between border-b bg-white/95 px-3 py-2.5 backdrop-blur lg:hidden"
        style={{ borderColor: `${EQUITY_BRAND.purple}33` }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <img src="/equity-logo.png" alt="Equity" className="h-8 w-auto object-contain" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold" style={{ color: EQUITY_BRAND.purple }}>
              Equity RMS
            </p>
            <p className="truncate text-[10px] font-medium" style={{ color: EQUITY_BRAND.green }}>
              {getUserRole()}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-white shadow-sm"
          style={{ borderColor: `${EQUITY_BRAND.green}66`, color: EQUITY_BRAND.purple }}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Phone drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={closeMobileNav}
          />
          <aside className="absolute left-0 top-0 flex h-full w-[min(18rem,88vw)] flex-col bg-white shadow-2xl dark:bg-[#120818]">
            {renderSidebarPanel()}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`${isExpanded ? 'w-64' : 'w-20'} hidden h-dvh shrink-0 overflow-hidden lg:flex lg:flex-col`}
        style={{ borderColor: `${EQUITY_BRAND.purple}22` }}
      >
        {renderSidebarPanel()}
      </aside>
    </div>
  );
}; 