'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService, AuthUser } from '../../lib/firebase/auth';
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
  Eye
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
    roles: ['Admin', 'Manager', 'Accountant', 'Purchase Manager', 'HR', 'Stock Manager', 'Receiver', 'Auditor']
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
    path: '/admin/users',
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
    label: 'Branches', 
    path: '/manager/branches',
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
    path: '/accountant/expenses',
    roles: ['Accountant', 'Admin']
  },
  { 
    id: 'financial-reports', 
    icon: <BarChart3 className="w-5 h-5" />, 
    label: 'Financial Reports', 
    path: '/accountant/reports',
    roles: ['Accountant', 'Manager', 'Admin']
  },
  
  // Purchase Manager specific
  { 
    id: 'suppliers', 
    icon: <Building2 className="w-5 h-5" />, 
    label: 'Suppliers', 
    path: '/dashboard/purchase-manager',
    roles: ['Purchase Manager', 'Admin']
  },
  { 
    id: 'fund-acknowledgments', 
    icon: <DollarSign className="w-5 h-5" />, 
    label: 'Fund Acknowledgments', 
    path: '/purchase-manager/funds',
    roles: ['Purchase Manager', 'Admin']
  },
  { 
    id: 'restock-items', 
    icon: <Package className="w-5 h-5" />, 
    label: 'Restock Items', 
    path: '/purchase-manager/restock',
    roles: ['Purchase Manager', 'Stock Manager', 'Admin']
  },
  
  // HR specific
  { 
    id: 'employees', 
    icon: <Users className="w-5 h-5" />, 
    label: 'Employees', 
    path: '/dashboard/hr',
    roles: ['HR', 'Manager', 'Admin']
  },
  { 
    id: 'attendance', 
    icon: <ClipboardList className="w-5 h-5" />, 
    label: 'Attendance', 
    path: '/hr/attendance',
    roles: ['HR', 'Manager', 'Admin']
  },
  { 
    id: 'leave-requests', 
    icon: <FileText className="w-5 h-5" />, 
    label: 'Leave Requests', 
    path: '/hr/leave',
    roles: ['HR', 'Manager', 'Admin']
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
    path: '/stock-manager/damages',
    roles: ['Stock Manager', 'Manager', 'Admin']
  },
  
  // Receiver specific
  { 
    id: 'deliveries', 
    icon: <Truck className="w-5 h-5" />, 
    label: 'Deliveries', 
    path: '/dashboard/receiver',
    roles: ['Receiver', 'Admin']
  },
  { 
    id: 'return-notes', 
    icon: <FileText className="w-5 h-5" />, 
    label: 'Return Notes', 
    path: '/receiver/returns',
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
    path: '/receiver/damages',
    roles: ['Receiver', 'Admin']
  },
  { 
    id: 'barcode', 
    icon: <QrCode className="w-5 h-5" />, 
    label: 'Barcode', 
    path: '/receiver/barcode',
    roles: ['Receiver', 'Admin']
  },
  { 
    id: 'restock-items', 
    icon: <Package className="w-5 h-5" />, 
    label: 'Restock Items', 
    path: '/receiver/restock',
    roles: ['Receiver', 'Admin']
  },
  
  // Auditor specific
  { 
    id: 'audit-trail', 
    icon: <Shield className="w-5 h-5" />, 
    label: 'Audit Trail', 
    path: '/dashboard/auditor',
    roles: ['Auditor', 'Admin']
  },
  { 
    id: 'discrepancies', 
    icon: <AlertTriangle className="w-5 h-5" />, 
    label: 'Discrepancies', 
    path: '/auditor/discrepancies',
    roles: ['Auditor', 'Manager', 'Admin']
  },
  
  // Settings - Available to all roles
  { 
    id: 'settings', 
    icon: <Settings className="w-5 h-5" />, 
    label: 'Settings', 
    path: '/settings',
    roles: ['Admin', 'Manager', 'Accountant', 'Purchase Manager', 'HR', 'Stock Manager', 'Receiver', 'Auditor']
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ activeItem, onItemClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    const unsubscribe = authService.onAuthStateChange((user) => {
      setCurrentUser(user);
    });

    return unsubscribe;
  }, []);

  const getUserRole = (): string => {
    return currentUser?.employee?.roles?.[0]?.jobTitle || 'User';
  };

  const getFilteredNavigationItems = (): NavigationItem[] => {
    const userRole = getUserRole();
    return navigationItems.filter(item => 
      item.roles.includes(userRole) || item.roles.includes('*')
    );
  };

  const handleItemClick = (item: NavigationItem) => {
    if (item.submenu) {
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

              {/* Dropdown arrow - only show when expanded and has submenu */}
              {isExpanded && item.submenu && (
                <ChevronDown 
                  className={`w-4 h-4 transition-transform duration-200 ${
                    openDropdowns.has(item.id) ? 'rotate-180' : ''
                  }`} 
                />
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