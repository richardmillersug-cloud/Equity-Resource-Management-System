'use client';

import { useState } from 'react';
import { 
  X, 
  FileText, 
  Building2, 
  Calendar, 
  DollarSign, 
  User, 
  Package, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Download,
  Printer,
  Edit,
  MessageSquare,
  Star,
  Zap,
  TrendingUp
} from 'lucide-react';

interface InvoiceDetailModalProps {
  invoice: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function InvoiceDetailModal({ invoice, isOpen, onClose }: InvoiceDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen || !invoice) return null;

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-gradient-to-r from-yellow-400 to-orange-500',
      approved: 'bg-gradient-to-r from-blue-400 to-blue-600',
      paid: 'bg-gradient-to-r from-green-400 to-green-600',
      overdue: 'bg-gradient-to-r from-red-400 to-red-600',
      rejected: 'bg-gradient-to-r from-gray-400 to-gray-600'
    };
    return colors[status] || 'bg-gradient-to-r from-gray-400 to-gray-600';
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'high') return <Zap className="w-4 h-4 text-red-500" />;
    if (priority === 'medium') return <TrendingUp className="w-4 h-4 text-yellow-500" />;
    return <Clock className="w-4 h-4 text-green-500" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const mockItems = [
    { id: 1, description: 'Premium Office Chairs', quantity: 10, unitPrice: 250000, total: 2500000 },
    { id: 2, description: 'Standing Desks', quantity: 5, unitPrice: 400000, total: 2000000 },
    { id: 3, description: 'Monitor Arms', quantity: 15, unitPrice: 80000, total: 1200000 }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600"></div>
          <div className="relative p-8 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-1">{invoice.invoiceNumber}</h2>
                  <p className="text-blue-100 text-lg">{invoice.supplierName}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(invoice.status)}`}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                    <div className="flex items-center gap-1">
                      {getPriorityIcon(invoice.priority)}
                      <span className="text-sm text-blue-100 capitalize">{invoice.priority} Priority</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button className="bg-white/20 backdrop-blur-sm border border-white/30 text-white p-3 rounded-2xl hover:bg-white/30 transition-all duration-300">
                  <Download className="w-5 h-5" />
                </button>
                <button className="bg-white/20 backdrop-blur-sm border border-white/30 text-white p-3 rounded-2xl hover:bg-white/30 transition-all duration-300">
                  <Printer className="w-5 h-5" />
                </button>
                <button className="bg-white/20 backdrop-blur-sm border border-white/30 text-white p-3 rounded-2xl hover:bg-white/30 transition-all duration-300">
                  <Edit className="w-5 h-5" />
                </button>
                <button 
                  onClick={onClose}
                  className="bg-white/20 backdrop-blur-sm border border-white/30 text-white p-3 rounded-2xl hover:bg-white/30 transition-all duration-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex">
            {[
              { id: 'overview', label: 'Overview', icon: FileText },
              { id: 'items', label: 'Items', icon: Package },
              { id: 'timeline', label: 'Timeline', icon: Clock },
              { id: 'comments', label: 'Comments', icon: MessageSquare }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[60vh]">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-blue-600 text-sm font-medium">Total Amount</p>
                      <p className="text-2xl font-bold text-blue-900">{formatCurrency(invoice.amount)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-green-600 text-sm font-medium">Items</p>
                      <p className="text-2xl font-bold text-green-900">{invoice.items}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-purple-600 text-sm font-medium">Due Date</p>
                      <p className="text-lg font-bold text-purple-900">{invoice.dueDate.toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-orange-600 text-sm font-medium">Days Left</p>
                      <p className="text-2xl font-bold text-orange-900">
                        {Math.ceil((invoice.dueDate - new Date()) / (1000 * 60 * 60 * 24))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    Supplier Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Company Name</p>
                      <p className="font-medium text-gray-900">{invoice.supplierName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Category</p>
                      <p className="font-medium text-gray-900">{invoice.category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Contact</p>
                      <p className="font-medium text-gray-900">+256 700 123 456</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium text-gray-900">contact@supplier.com</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Invoice Details
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Invoice Number</p>
                      <p className="font-medium text-gray-900 font-mono">{invoice.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Created Date</p>
                      <p className="font-medium text-gray-900">{invoice.createdAt.toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Due Date</p>
                      <p className="font-medium text-gray-900">{invoice.dueDate.toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Payment Terms</p>
                      <p className="font-medium text-gray-900">Net 30 Days</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'items' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4">
                  <h3 className="text-lg font-semibold text-gray-900">Invoice Items</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {mockItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{item.description}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-900">{item.quantity}</td>
                          <td className="px-6 py-4 text-gray-900">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-6 py-4 font-semibold text-gray-900">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-right font-semibold text-gray-900">Total Amount:</td>
                        <td className="px-6 py-4 font-bold text-xl text-blue-600">{formatCurrency(invoice.amount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <div className="relative">
                {[
                  { date: '2024-01-15', title: 'Invoice Created', description: 'Invoice was created and submitted for review', status: 'completed' },
                  { date: '2024-01-16', title: 'Under Review', description: 'Invoice is being reviewed by the purchasing team', status: 'completed' },
                  { date: '2024-01-18', title: 'Approved', description: 'Invoice has been approved for payment', status: 'current' },
                  { date: '2024-02-15', title: 'Payment Due', description: 'Payment is due on this date', status: 'pending' }
                ].map((event, index) => (
                  <div key={index} className="relative flex items-start gap-4 pb-8">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      event.status === 'completed' ? 'bg-green-500 border-green-500' :
                      event.status === 'current' ? 'bg-blue-500 border-blue-500' :
                      'bg-gray-300 border-gray-300'
                    }`}></div>
                    {index < 3 && <div className="absolute left-2 top-4 w-0.5 h-16 bg-gray-200"></div>}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{event.title}</h4>
                        <span className="text-sm text-gray-500">{event.date}</span>
                      </div>
                      <p className="text-gray-600 text-sm">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Comment</h3>
                <textarea
                  placeholder="Add your comment here..."
                  className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                ></textarea>
                <div className="mt-4 flex justify-end">
                  <button className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-colors">
                    Add Comment
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                {[
                  { user: 'John Doe', time: '2 hours ago', comment: 'Invoice looks good, approved for payment.' },
                  { user: 'Jane Smith', time: '1 day ago', comment: 'Please verify the quantities before processing.' }
                ].map((comment, index) => (
                  <div key={index} className="bg-white rounded-2xl p-6 border border-gray-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{comment.user}</p>
                        <p className="text-sm text-gray-500">{comment.time}</p>
                      </div>
                    </div>
                    <p className="text-gray-700">{comment.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 