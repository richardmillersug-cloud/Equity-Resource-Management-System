'use client';

import React, { useState } from 'react';

interface SidebarProps {
  activeItem?: string;
  onItemClick?: (item: string) => void;
}

const navigationItems = [
  { id: 'dashboard', icon: '⊞', label: 'Dashboard' },
  { id: 'transactions', icon: '💳', label: 'Transactions' },
  { id: 'analytics', icon: '📊', label: 'Analytics' },
  { id: 'cash-allocation', icon: '💰', label: 'Cash Allocation' },
  { id: 'suppliers', icon: '🏢', label: 'Suppliers' },
  { id: 'employees', icon: '👥', label: 'Employees' },
  { id: 'inventory', icon: '📦', label: 'Inventory' },
  { id: 'reports', icon: '📋', label: 'Reports' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeItem = 'dashboard', onItemClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`${isExpanded ? 'w-64' : 'w-20'} bg-white border-r border-gray-100 flex flex-col py-6 transition-all duration-300 ease-in-out relative`}>
      {/* Logo and Toggle */}
      <div className="flex items-center px-6 mb-8">
        <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-xl">A</span>
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

      {/* Navigation Items */}
      <nav className="flex flex-col gap-2 flex-1 px-3">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick?.(item.id)}
            className={`${isExpanded ? 'justify-start px-3' : 'justify-center'} h-12 rounded-xl flex items-center text-xl transition-all duration-200 group relative ${
              activeItem === item.id
                ? 'bg-emerald-100 text-emerald-600'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            }`}
            title={!isExpanded ? item.label : undefined}
          >
            <span className={`${isExpanded ? 'mr-3' : ''} flex-shrink-0`}>
              {item.icon}
            </span>
            
            {/* Label - only show when expanded */}
            {isExpanded && (
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap overflow-hidden">
                {item.label}
              </span>
            )}
            
            {/* Tooltip - only show when collapsed */}
            {!isExpanded && (
              <div className="absolute left-16 bg-gray-900 text-white text-sm px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                {item.label}
              </div>
            )}
          </button>
        ))}
      </nav>

      {/* User Profile */}
      <div className="mt-auto px-3">
        <button className={`${isExpanded ? 'justify-start px-3' : 'justify-center'} w-full h-12 rounded-xl flex items-center hover:bg-gray-100 transition-all duration-200 group`}>
          <div className="w-8 h-8 rounded-lg overflow-hidden border-2 border-gray-200 flex-shrink-0">
            <img
              src="/api/placeholder/32/32"
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          
          {isExpanded && (
            <div className="ml-3 text-left overflow-hidden">
              <p className="text-sm font-medium text-gray-900 whitespace-nowrap">John Doe</p>
              <p className="text-xs text-gray-500 whitespace-nowrap">Administrator</p>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}; 