'use client';

import React, { useState, useEffect } from 'react';
import { PurchaseManagerQueries } from '../../../lib/firebase/role-based-queries';
import { 
  DollarSign, 
  Truck, 
  Package, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  ShoppingCart,
  AlertCircle
} from 'lucide-react';

export default function PurchaseManagerDashboard() {
  const [fundAcknowledgments, setFundAcknowledgments] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [restockItems, setRestockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPurchaseManagerData = async () => {
      try {
        setLoading(true);
        
        // Load fund acknowledgments
        const fundsData = await PurchaseManagerQueries.getFundAcknowledgments();
        setFundAcknowledgments(fundsData);

        // Load managed suppliers
        const suppliersData = await PurchaseManagerQueries.getManagedSuppliers();
        setSuppliers(suppliersData);

        // Load restock items
        const restockData = await PurchaseManagerQueries.getRestockItems();
        setRestockItems(restockData);

        setLoading(false);
      } catch (err) {
        console.error('Error loading purchase manager data:', err);
        setError('Failed to load purchase manager dashboard data');
        setLoading(false);
      }
    };

    loadPurchaseManagerData();

    // Set up real-time subscription for fund acknowledgments
    const unsubscribe = PurchaseManagerQueries.subscribeFundAcknowledgments((data) => {
      setFundAcknowledgments(data);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600 bg-red-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'LOW': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'URGENT': return <AlertTriangle className="h-4 w-4" />;
      case 'MEDIUM': return <Clock className="h-4 w-4" />;
      case 'LOW': return <CheckCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  // Calculate summary metrics
  const totalFundsAcknowledged = fundAcknowledgments.reduce((sum, fund) => sum + (fund.amount || 0), 0);
  const urgentRestockItems = restockItems.filter(item => item.priority === 'URGENT').length;
  const totalSuppliers = suppliers.length;
  const lowStockItems = restockItems.filter(item => item.currentStock <= item.restockThreshold).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Overview Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Purchase Management Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Funds Acknowledged</p>
              <p className="text-2xl font-bold text-gray-900">${totalFundsAcknowledged.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Truck className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Managed Suppliers</p>
              <p className="text-2xl font-bold text-gray-900">{totalSuppliers}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Urgent Restock Items</p>
              <p className="text-2xl font-bold text-gray-900">{urgentRestockItems}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Package className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">{lowStockItems}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">Acknowledge Funds</h3>
                <p className="text-sm text-gray-500">Process fund acknowledgments</p>
              </div>
            </div>
          </button>

          <button className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">Manage Suppliers</h3>
                <p className="text-sm text-gray-500">Add or update supplier info</p>
              </div>
            </div>
          </button>

          <button className="p-4 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ShoppingCart className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">Create Purchase Order</h3>
                <p className="text-sm text-gray-500">Generate new purchase orders</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Restock Items Priority */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Restock Items by Priority</h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Restock Threshold
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Restock Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {restockItems.slice(0, 15).map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.itemName || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">{item.itemCode || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.currentStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.restockThreshold}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.restockQuantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(item.priority)}`}>
                        {getPriorityIcon(item.priority)}
                        <span className="ml-1">{item.priority}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {suppliers.find(s => s.id === item.supplierId)?.supplierName || 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Fund Acknowledgments */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Fund Acknowledgments</h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Acknowledged
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fund Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fundAcknowledgments.slice(0, 10).map((fund) => (
                  <tr key={fund.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(fund.acknowledgedAt?.seconds * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {fund.fundType || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${fund.amount?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-green-800 bg-green-100">
                        Acknowledged
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {fund.notes || 'No notes'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Managed Suppliers */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Managed Suppliers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((supplier) => (
            <div key={supplier.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Truck className="h-6 w-6 text-blue-600" />
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  supplier.status === 'Active' 
                    ? 'text-green-800 bg-green-100' 
                    : 'text-red-800 bg-red-100'
                }`}>
                  {supplier.status || 'Unknown'}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {supplier.supplierName}
                </h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">Contact:</span> {supplier.contactPerson || 'N/A'}</p>
                  <p><span className="font-medium">Phone:</span> {supplier.phoneNumber || 'N/A'}</p>
                  <p><span className="font-medium">Email:</span> {supplier.email || 'N/A'}</p>
                  <p><span className="font-medium">Location:</span> {supplier.location || 'N/A'}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Registered: {new Date(supplier.dateOfRegistration?.seconds * 1000).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 