'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService, AuthUser } from '../../lib/firebase/auth';
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
  AlertTriangle,
  UserCheck,
  ClipboardList,
  QrCode,
  Factory,
  ChevronDown,
  Plus,
  Eye,
  RefreshCw,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  Banknote,
  Smartphone,
  Calendar,
  Sun,
  Moon
} from 'lucide-react';

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
  submenu?: {
    id: string;
    icon: React.ReactNode;
    label: string;
    path: string;
  }[];
}

const navigationItems: NavigationItem[] = [
  // Dashboard - Available to all roles
  { 
    id: 'dashboard', 
    icon: <LayoutDashboard className="w-5 h-5" />, 
    label: 'Dashboard', 
    path: '/dashboard',
    roles: ['Admin', 'Manager', 'Accountant', 'Purchase Manager', 'Purchasing Manager', 'HR', 'HR Manager', 'Stock Manager', 'Receiver', 'Auditor', 'Supervisor', 'Managing Director', 'Cashier', 'Customer Service']
  },
  
  // Admin specific
  { 
    id: 'system-overview', 
    icon: <Shield className="w-5 h-5" />, 
    label: 'System Overview', 
    path: '/dashboard/admin',
    roles: ['Admin']
  },
  { 
    id: 'user-management', 
    icon: <UserCheck className="w-5 h-5" />, 
    label: 'User Management', 
    path: '/dashboard/hr/employees',
    roles: ['Admin']
  },
  
  // Manager specific
  { 
    id: 'performance', 
    icon: <TrendingUp className="w-5 h-5" />, 
    label: 'Performance', 
    path: '/dashboard/manager',
    roles: ['Manager', 'Admin']
  },
  { 
    id: 'branches', 
    icon: <Building2 className="w-5 h-5" />, 
    label: 'Branch Management', 
    path: '/dashboard/settings',
    roles: ['Manager', 'Admin']
  },
  
  // Accountant specific
  { 
    id: 'cash-allocation', 
    icon: <Calculator className="w-5 h-5" />, 
    label: 'Cash Allocation', 
    path: '/dashboard/accountant',
    roles: ['Accountant', 'Admin']
  },
  { 
    id: 'expenses', 
    icon: <Receipt className="w-5 h-5" />, 
    label: 'Expenses', 
    path: '/dashboard/accountant/expenses',
    roles: ['Accountant', 'Admin']
  },
  { 
    id: 'financial-reports', 
    icon: <BarChart3 className="w-5 h-5" />, 
    label: 'Financial Reports', 
    path: '/dashboard/accountant/reports',
    roles: ['Accountant', 'Manager', 'Admin']
  },
  
  // Purchase Manager specific
  { 
    id: 'pm-dashboard', 
    icon: <LayoutDashboard className="w-5 h-5" />, 
    label: 'PM Dashboard', 
    path: '/dashboard/purchase-manager',
    roles: ['Purchase Manager', 'Purchasing Manager', 'Admin']
  },
  { 
    id: 'invoices', 
    icon: <FileText className="w-5 h-5" />, 
    label: 'Invoices', 
    path: '/dashboard/purchase-manager/invoices',
    roles: ['Purchase Manager', 'Purchasing Manager', 'Admin']
  },
  { 
    id: 'pm-expenses', 
    icon: <Receipt className="w-5 h-5" />, 
    label: 'PM Expenses', 
    path: '/dashboard/purchase-manager/expenses',
    roles: ['Purchase Manager', 'Purchasing Manager', 'Admin']
  },
  { 
    id: 'payments', 
    icon: <CreditCard className="w-5 h-5" />, 
    label: 'Payments', 
    path: '/dashboard/purchase-manager/payments',
    roles: ['Purchase Manager', 'Purchasing Manager', 'Admin']
  },
  { 
    id: 'suppliers', 
    icon: <Building2 className="w-5 h-5" />, 
    label: 'Suppliers', 
    path: '/dashboard/purchase-manager/suppliers',
    roles: ['Purchase Manager', 'Purchasing Manager', 'Admin']
  },
  { 
    id: 'cash-tracking', 
    icon: <Smartphone className="w-5 h-5" />, 
    label: 'Cash Tracking', 
    path: '/dashboard/purchase-manager/cash-tracking',
    roles: ['Purchase Manager', 'Purchasing Manager', 'Admin']
  },

  
  // HR specific
  { 
    id: 'hr-dashboard', 
    icon: <Users className="w-5 h-5" />, 
    label: 'HR Dashboard', 
    path: '/dashboard/hr',
    roles: ['HR', 'HR Manager', 'Manager', 'Admin']
  },
  { 
    id: 'employees', 
    icon: <Users className="w-5 h-5" />, 
    label: 'Employees', 
    roles: ['HR', 'HR Manager', 'Manager', 'Admin'],
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
    roles: ['HR', 'HR Manager', 'Manager', 'Admin', 'Supervisor']
  },
  { 
    id: 'attendance', 
    icon: <span className="w-5 h-5 flex items-center justify-center text-lg">📋</span>, 
    label: 'Attendance Reports', 
    path: '/dashboard/hr/attendance',
    roles: ['HR', 'HR Manager', 'Manager', 'Admin', 'Supervisor']
  },
  { 
    id: 'leave-requests', 
    icon: <span className="w-5 h-5 flex items-center justify-center text-lg">📄</span>, 
    label: 'Leave Requests', 
    path: '/dashboard/hr/leave-requests',
    roles: ['HR', 'HR Manager', 'Manager', 'Admin', 'Supervisor']
  },
  { 
    id: 'leave-calendar', 
    icon: <span className="w-5 h-5 flex items-center justify-center text-lg">📅</span>, 
    label: 'Leave Calendar', 
    path: '/dashboard/hr/leave',
    roles: ['HR', 'HR Manager', 'Manager', 'Admin', 'Supervisor']
  },
  { 
    id: 'payroll', 
    icon: <Banknote className="w-5 h-5" />, 
    label: 'Payroll', 
    roles: ['HR', 'HR Manager', 'Manager', 'Admin'],
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
    roles: ['HR', 'HR Manager', 'Manager', 'Admin']
  },
  { 
    id: 'employee-documents', 
    icon: <FileText className="w-5 h-5" />, 
    label: 'Documents', 
    path: '/dashboard/hr/employee-documents',
    roles: ['HR', 'HR Manager', 'Manager', 'Admin']
  },
  
  // Stock Manager specific
  { 
    id: 'inventory', 
    icon: <Package className="w-5 h-5" />, 
    label: 'Inventory', 
    path: '/dashboard/stock-manager',
    roles: ['Stock Manager', 'Admin']
  },
  { 
    id: 'damage-reports', 
    icon: <AlertTriangle className="w-5 h-5" />, 
    label: 'Damage Reports', 
    path: '/dashboard/receiver/damages',
    roles: ['Stock Manager', 'Manager', 'Admin']
  },
  
  // Receiver specific
  { 
    id: 'deliveries', 
    icon: <Truck className="w-5 h-5" />, 
    label: 'Deliveries', 
    path: '/dashboard/receiver/deliveries',
    roles: ['Receiver', 'Admin']
  },
  { 
    id: 'return-notes', 
    icon: <FileText className="w-5 h-5" />, 
    label: 'Return Notes', 
    path: '/dashboard/receiver/returns',
    roles: ['Receiver', 'Admin']
  },
  { 
    id: 'suppliers', 
    icon: <Factory className="w-5 h-5" />, 
    label: 'Suppliers', 
    roles: ['Receiver', 'Admin'],
    submenu: [
      {
        id: 'add-supplier',
        icon: <Plus className="w-4 h-4" />,
        label: 'Add Supplier',
        path: '/dashboard/receiver/suppliers/add'
      },
      {
        id: 'view-suppliers',
        icon: <Eye className="w-4 h-4" />,
        label: 'View Suppliers',
        path: '/dashboard/receiver/suppliers'
      }
    ]
  },
  { 
    id: 'invoices', 
    icon: <Receipt className="w-5 h-5" />, 
    label: 'Invoices', 
    roles: ['Receiver', 'Admin'],
    submenu: [
      {
        id: 'add-invoice',
        icon: <Plus className="w-4 h-4" />,
        label: 'Add Invoice',
        path: '/dashboard/receiver/invoices/add'
      },
      {
        id: 'view-invoices',
        icon: <Eye className="w-4 h-4" />,
        label: 'View Invoices',
        path: '/dashboard/receiver/invoices'
      }
    ]
  },
  { 
    id: 'damages', 
    icon: <AlertTriangle className="w-5 h-5" />, 
    label: 'Damages', 
    path: '/dashboard/receiver/damages',
    roles: ['Receiver', 'Admin']
  },
  { 
    id: 'barcode', 
    icon: <QrCode className="w-5 h-5" />, 
    label: 'Barcode', 
    path: '/dashboard/receiver/barcode',
    roles: ['Receiver', 'Admin']
  },
  { 
    id: 'restocking', 
    icon: <Package className="w-5 h-5" />, 
    label: 'Restocking', 
    path: '/dashboard/receiver/restocking',
    roles: ['Receiver', 'Admin']
  },
  
  // Auditor specific
  { 
    id: 'audit-reports', 
    icon: <QrCode className="w-5 h-5" />, 
    label: 'Audit Reports', 
    path: '/dashboard/auditor',
    roles: ['Auditor', 'Admin']
  },
  
  // Customer Service specific
  { 
    id: 'customer-service-desk', 
    icon: <Users className="w-5 h-5" />, 
    label: 'Customer Service', 
    path: '/dashboard/receiver/returns',
    roles: ['Customer Service', 'Manager', 'Admin']
  },
  
  // Cashier specific
  { 
    id: 'cashier-operations', 
    icon: <CreditCard className="w-5 h-5" />, 
    label: 'Cashier Operations', 
    path: '/dashboard/purchase-manager/payments',
    roles: ['Cashier', 'Manager', 'Admin']
  },
  
  // Employee Self-Service (for all employee roles)
  { 
    id: 'my-attendance', 
    icon: <span className="w-5 h-5 flex items-center justify-center text-lg">🕐</span>, 
    label: 'My Attendance', 
    path: '/dashboard/hr/attendance-tracking',
    roles: ['Cashier', 'Customer Service', 'Receiver', 'Stock Manager', 'Purchasing Manager', 'Accountant']
  },
  { 
    id: 'my-leave', 
    icon: <span className="w-5 h-5 flex items-center justify-center text-lg">📅</span>, 
    label: 'My Leave Requests', 
    path: '/dashboard/hr/leave-requests',
    roles: ['Cashier', 'Customer Service', 'Receiver', 'Stock Manager', 'Purchasing Manager', 'Accountant']
  },
  
  // Development/Testing
  { 
    id: 'offline-test', 
    icon: <RefreshCw className="w-5 h-5" />, 
    label: 'Offline Test', 
    path: '/dashboard/offline-test',
    roles: ['Admin']
  },
  
  // Settings - Available to all roles
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
    const userRole = getUserRole();
    return navigationItems.filter(item => 
      item.roles.includes(userRole) || 
      item.roles.includes('*') ||
      item.id === 'settings' // Always show settings
    );
  };

  const handleItemClick = (item: NavigationItem) => {
    // Special handling for deliveries item for receivers
    if (item.id === 'deliveries' && getUserRole() === 'Receiver') {
      // Toggle dropdown for expected suppliers
      const newOpenDropdowns = new Set(openDropdowns);
      if (newOpenDropdowns.has(item.id)) {
        newOpenDropdowns.delete(item.id);
      } else {
        newOpenDropdowns.add(item.id);
      }
      setOpenDropdowns(newOpenDropdowns);
      // Still navigate to the main deliveries page
      if (item.path) {
        if (onItemClick) {
          onItemClick(item.id);
        } else {
          router.push(item.path);
        }
      }
    }
    
    // Special handling for hr-dashboard item for HR
    else if (item.id === 'hr-dashboard' && getUserRole() === 'HR') {
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
    }
  };

  const handleSubmenuClick = (path: string) => {
    router.push(path);
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

  return (
    <div className={`${isExpanded ? 'w-64' : 'w-20'} bg-white border-r border-gray-100 flex flex-col py-6 transition-all duration-300 ease-in-out relative`}>
      {/* Logo and Toggle */}
      <div className="flex items-center px-6 mb-8">
        <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-xl">E</span>
        </div>
        {isExpanded && (
          <div className="ml-3 overflow-hidden">
            <h2 className="text-lg font-bold text-gray-900 whitespace-nowrap">Equity</h2>
            <p className="text-sm text-gray-500 whitespace-nowrap">Retail System</p>
          </div>
        )}
        
        {/* Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`${isExpanded ? 'ml-auto' : 'absolute -right-3 top-6'} w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-all duration-200 z-10 shadow-sm`}
        >
          <span className={`text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            ←
          </span>
        </button>
      </div>

      {/* Role Badge */}
      {isExpanded && (
        <div className="px-6 mb-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">
              {getUserRole()}
            </p>
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex flex-col gap-1 flex-1 px-3">
        {filteredItems.map((item) => (
          <div key={item.id}>
          <button
            onClick={() => handleItemClick(item)}
              className={`${isExpanded ? 'justify-start px-3' : 'justify-center'} h-12 rounded-xl flex items-center transition-all duration-200 group relative w-full ${
              isActiveItem(item)
                ? 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-700'
            }`}
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

              {/* Dropdown arrow - only show when expanded and has submenu OR is deliveries for receiver OR is pm-dashboard for PM */}
              {isExpanded && (item.submenu || 
                (item.id === 'deliveries' && getUserRole() === 'Receiver') ||
                (item.id === 'pm-dashboard' && (getUserRole() === 'Purchase Manager' || getUserRole() === 'Purchasing Manager'))
              ) && (
                <ChevronDown 
                  className={`w-4 h-4 transition-transform duration-200 ${
                    openDropdowns.has(item.id) ? 'rotate-180' : ''
                  }`} 
                />
              )}

              {/* Expected suppliers count badge for deliveries - only when collapsed */}
              {!isExpanded && item.id === 'deliveries' && getUserRole() === 'Receiver' && expectedSuppliers.length > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {expectedSuppliers.length}
                </div>
              )}

              {/* PM quick actions count badge for pm-dashboard - only when collapsed */}
              {!isExpanded && item.id === 'pm-dashboard' && (getUserRole() === 'Purchase Manager' || getUserRole() === 'Purchasing Manager') && pmQuickActions.length > 0 && (
                <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {pmQuickActions.reduce((sum, action) => sum + action.count, 0)}
                </div>
              )}
            
            {/* Tooltip - only show when collapsed */}
            {!isExpanded && (
              <div className="absolute left-16 bg-gray-900 text-white text-sm px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                {item.label}
              </div>
            )}
          </button>

            {/* Submenu - only show when expanded and dropdown is open */}
            {isExpanded && item.submenu && openDropdowns.has(item.id) && (
              <div className="ml-6 mt-1 space-y-1">
                {item.submenu.map((subItem) => (
                  <button
                    key={subItem.id}
                    onClick={() => handleSubmenuClick(subItem.path)}
                    className={`w-full h-10 rounded-lg flex items-center px-3 transition-all duration-200 text-sm ${
                      pathname === subItem.path || pathname.startsWith(subItem.path + '/')
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-700'
                    }`}
                  >
                    <span className="mr-2 flex-shrink-0">
                      {subItem.icon}
                    </span>
                    <span className="font-medium whitespace-nowrap overflow-hidden">
                      {subItem.label}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Expected Suppliers List - Special for deliveries when receiver */}
            {isExpanded && item.id === 'deliveries' && getUserRole() === 'Receiver' && openDropdowns.has(item.id) && (
              <div className="ml-6 mt-2 space-y-2">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-900">Today's Expected</span>
                  </div>
                  <span className="text-xs text-blue-600 font-medium">{getCurrentTime()}</span>
                </div>

                {/* Loading State */}
                {loadingSuppliers && (
                  <div className="px-3 py-4 text-center">
                    <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <span className="text-xs text-gray-500">Loading suppliers...</span>
                  </div>
                )}

                {/* Suppliers List */}
                {!loadingSuppliers && expectedSuppliers.length > 0 && (
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {expectedSuppliers.map((supplier) => (
                      <div
                        key={supplier.id}
                        className="px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
                        onClick={() => router.push('/dashboard/receiver/deliveries')}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-1">
                            <span className="text-xs">{getPriorityIcon(supplier.priority)}</span>
                            <span className="text-xs font-medium text-gray-900 truncate" title={supplier.name}>
                              {supplier.name.length > 12 ? supplier.name.substring(0, 12) + '...' : supplier.name}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">{supplier.expectedTime}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">{supplier.items} items</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(supplier.status)}`}>
                            {supplier.status === 'on-time' ? 'On Time' : 
                             supplier.status === 'delayed' ? 'Delayed' : 'Early'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* No Suppliers */}
                {!loadingSuppliers && expectedSuppliers.length === 0 && (
                  <div className="px-3 py-4 text-center">
                    <div className="text-gray-400 mb-2">📦</div>
                    <span className="text-xs text-gray-500">No deliveries expected today</span>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="border-t border-gray-200 pt-2 space-y-1">
                  <button
                    onClick={() => router.push('/dashboard/receiver/deliveries')}
                    className="w-full h-8 rounded-lg flex items-center px-3 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                  >
                    <Plus className="w-3 h-3 text-emerald-600 mr-2" />
                    <span className="text-xs font-medium text-emerald-700">View Deliveries</span>
                  </button>
                  <button
                    onClick={() => loadExpectedSuppliers()}
                    className="w-full h-8 rounded-lg flex items-center px-3 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3 text-blue-600 mr-2" />
                    <span className="text-xs font-medium text-blue-700">Refresh</span>
                  </button>
                </div>
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
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className="mt-auto px-3">
        <button className={`${isExpanded ? 'justify-start px-3' : 'justify-center'} w-full h-12 rounded-xl flex items-center hover:bg-gray-100 transition-all duration-200 group`}>
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-600 font-semibold text-sm">
              {currentUser?.employee?.firstName?.charAt(0) || 'U'}
            </span>
          </div>
          
          {isExpanded && (
            <div className="ml-3 text-left overflow-hidden">
              <p className="text-sm font-medium text-gray-900 whitespace-nowrap">
                {currentUser?.employee?.firstName} {currentUser?.employee?.lastName}
              </p>
              <p className="text-xs text-gray-500 whitespace-nowrap">
                {getUserRole()}
              </p>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}; 