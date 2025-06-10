'use client';

import React, { useState, useEffect } from 'react';
import { ReceiverQueries } from '../../../lib/firebase/role-based-queries';
import { 
  Truck, 
  Package, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  FileText,
  AlertCircle,
  Calendar
} from 'lucide-react';

export default function ReceiverDashboard() {
  const [incomingDeliveries, setIncomingDeliveries] = useState<any[]>([]);
  const [returnNotes, setReturnNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReceiverData = async () => {
      try {
        setLoading(true);
        
        const deliveriesData = await ReceiverQueries.getIncomingDeliveries();
        setIncomingDeliveries(deliveriesData);

        const returnsData = await ReceiverQueries.getReturnNotes();
        setReturnNotes(returnsData);

        setLoading(false);
      } catch (err) {
        console.error('Error loading receiver data:', err);
        setError('Failed to load receiver dashboard data');
        setLoading(false);
      }
    };

    loadReceiverData();

    // Set up real-time subscription for incoming deliveries
    const unsubscribe = ReceiverQueries.subscribeIncomingDeliveries((data) => {
      setIncomingDeliveries(data);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'OVERDUE': return 'text-red-600 bg-red-100';
      case 'DUE_SOON': return 'text-yellow-600 bg-yellow-100';
      case 'ON_TIME': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'OVERDUE': return <AlertTriangle className="h-4 w-4" />;
      case 'DUE_SOON': return <Clock className="h-4 w-4" />;
      case 'ON_TIME': return <CheckCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const totalDeliveries = incomingDeliveries.length;
  const overdueDeliveries = incomingDeliveries.filter(d => d.urgencyStatus === 'OVERDUE').length;
  const dueSoonDeliveries = incomingDeliveries.filter(d => d.urgencyStatus === 'DUE_SOON').length;
  const totalReturns = returnNotes.length;

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
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Receiving Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Truck className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Incoming Deliveries</p>
              <p className="text-2xl font-bold text-gray-900">{totalDeliveries}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Overdue Deliveries</p>
              <p className="text-2xl font-bold text-gray-900">{overdueDeliveries}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Due Soon</p>
              <p className="text-2xl font-bold text-gray-900">{dueSoonDeliveries}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Return Notes</p>
              <p className="text-2xl font-bold text-gray-900">{totalReturns}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">Process Delivery</h3>
                <p className="text-sm text-gray-500">Receive and process incoming deliveries</p>
              </div>
            </div>
          </button>

          <button className="p-4 bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">Create Return Note</h3>
                <p className="text-sm text-gray-500">Process returns and exchanges</p>
              </div>
            </div>
          </button>

          <button className="p-4 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">Schedule Delivery</h3>
                <p className="text-sm text-gray-500">Plan upcoming deliveries</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Incoming Deliveries</h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Urgency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Until Due
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {incomingDeliveries.slice(0, 15).map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {delivery.title || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">{delivery.id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(delivery.dueDate?.seconds * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${delivery.amount?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        delivery.status === 'Pending' 
                          ? 'text-yellow-800 bg-yellow-100'
                          : 'text-blue-800 bg-blue-100'
                      }`}>
                        {delivery.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getUrgencyColor(delivery.urgencyStatus)}`}>
                        {getUrgencyIcon(delivery.urgencyStatus)}
                        <span className="ml-1">{delivery.urgencyStatus?.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {delivery.daysUntilDue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Return Notes</h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Return Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {returnNotes.slice(0, 10).map((returnNote) => (
                  <tr key={returnNote.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(returnNote.returnDate?.seconds * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {returnNote.itemName || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">{returnNote.itemCode || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {returnNote.quantity || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {returnNote.reason || 'Not specified'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        returnNote.status === 'Processed' 
                          ? 'text-green-800 bg-green-100'
                          : returnNote.status === 'Pending'
                          ? 'text-yellow-800 bg-yellow-100'
                          : 'text-gray-800 bg-gray-100'
                      }`}>
                        {returnNote.status || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 