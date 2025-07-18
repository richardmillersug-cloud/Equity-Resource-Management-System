'use client';

import React, { useState } from 'react';
import { Card } from '../ui/Card';

interface QuickActionsProps {
  onAction?: (action: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onAction }) => {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [transferAmount, setTransferAmount] = useState('');

  const contacts = [
    { id: '1', name: 'John Doe', avatar: '👨', role: 'Purchasing Manager' },
    { id: '2', name: 'Jane Smith', avatar: '👩', role: 'Accountant' },
    { id: '3', name: 'Mike Johnson', avatar: '👨‍💼', role: 'Stock Manager' },
    { id: '4', name: 'Sarah Wilson', avatar: '👩‍💼', role: 'HR Manager' },
    { id: '5', name: 'David Brown', avatar: '👨‍🔧', role: 'Supervisor' },
    { id: '6', name: 'Lisa Davis', avatar: '👩‍💻', role: 'Receiver' },
    { id: '7', name: 'Tom Anderson', avatar: '👨‍🏭', role: 'Branch Manager' },
    { id: '8', name: 'Emma Taylor', avatar: '👩‍🎓', role: 'Analyst' },
  ];

  const quickActionButtons = [
    { id: 'topup', icon: '⬇', label: 'Cash Injection', color: 'bg-emerald-100 text-emerald-600' },
    { id: 'transfer', icon: '⇄', label: 'Transfer', color: 'bg-blue-100 text-blue-600' },
    { id: 'allocation', icon: '💰', label: 'Cash Allocation', color: 'bg-purple-100 text-purple-600' },
    { id: 'payment', icon: '💳', label: 'Process Payment', color: 'bg-orange-100 text-orange-600' },
  ];

  return (
    <Card title="Quick Actions" className="col-span-1">
      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {quickActionButtons.map((button) => (
          <button
            key={button.id}
            onClick={() => onAction?.(button.id)}
            className={`p-3 rounded-xl ${button.color} hover:scale-105 transition-all duration-200 flex flex-col items-center gap-2`}
          >
            <span className="text-xl">{button.icon}</span>
            <span className="text-xs font-medium">{button.label}</span>
          </button>
        ))}
      </div>

      {/* Quick Transfer */}
      <div className="border-t pt-6">
        <h4 className="font-semibold text-gray-900 mb-4">Quick Transfer</h4>
        
        {/* Contact Selection */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {contacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => {
                setSelectedContacts(prev => 
                  prev.includes(contact.id) 
                    ? prev.filter(id => id !== contact.id)
                    : [...prev, contact.id]
                );
              }}
              className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all duration-200 ${
                selectedContacts.includes(contact.id)
                  ? 'bg-emerald-100 ring-2 ring-emerald-500'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              title={`${contact.name} - ${contact.role}`}
            >
              {contact.avatar}
            </button>
          ))}
          {selectedContacts.length > 0 && (
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">
              +{selectedContacts.length}
            </div>
          )}
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="block text-sm text-gray-500 mb-2">Amount</label>
          <input
            type="text"
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button 
            onClick={() => onAction?.('send')}
            className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors duration-200"
            disabled={!transferAmount || selectedContacts.length === 0}
          >
//   Send
          </button>
          <button 
            onClick={() => onAction?.('save-draft')}
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors duration-200"
          >
            Save Draft
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="border-t pt-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">Recent Activity</h4>
          <button className="text-emerald-600 text-sm font-medium hover:underline">
            See All
          </button>
        </div>
        
        <div className="space-y-3">
          {[
            { name: 'Clara Tan', amount: 7700, time: '01-03-2023 | 07:00 PM', avatar: '👩‍💼' },
            { name: 'Leyla', amount: 8000, time: '03-03-2023 | 08:15 PM', avatar: '👩' },
            { name: 'Jonas Kim', amount: 8000, time: '05-03-2023 | 09:30 PM', avatar: '👨' },
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  {activity.avatar}
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{activity.name}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
              <p className="font-semibold text-red-500 text-sm">
                -${activity.amount.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}; 