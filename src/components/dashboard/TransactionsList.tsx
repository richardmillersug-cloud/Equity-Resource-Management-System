import React from 'react';
import { Card } from '../ui/card';

interface Transaction {
  id: string;
  company: string;
  category: string;
  amount: number;
  icon: string;
  color: string;
}

interface TransactionsListProps {
  transactions?: Transaction[];
}

const mockTransactions: Transaction[] = [
  {
    id: '1',
    company: 'Supplier Payment',
    category: 'Supply Chain',
    amount: -7700,
    icon: '🍎',
    color: 'bg-gray-100'
  },
  {
    id: '2',
    company: 'Cash Allocation',
    category: 'Financial',
    amount: -3500,
    icon: '💰',
    color: 'bg-emerald-100'
  },
  {
    id: '3',
    company: 'Employee Salary',
    category: 'Payroll',
    amount: -2800,
    icon: '👥',
    color: 'bg-red-100'
  },
  {
    id: '4',
    company: 'Sales Revenue',
    category: 'Income',
    amount: 15000,
    icon: '📈',
    color: 'bg-blue-100'
  }
];

export const TransactionsList: React.FC<TransactionsListProps> = ({ 
  transactions = mockTransactions 
}) => {
  return (
    <Card 
      title="Transactions" 
      subtitle="Your weekly transactions update"
      className="col-span-1"
    >
      <div className="space-y-4">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${transaction.color} flex items-center justify-center text-lg`}>
                {transaction.icon}
              </div>
              <div>
                <p className="font-medium text-gray-900">{transaction.company}</p>
                <p className="text-sm text-gray-500">{transaction.category}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-semibold ${
                transaction.amount > 0 ? 'text-emerald-600' : 'text-gray-900'
              }`}>
                {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      <button className="w-full mt-6 py-2 text-emerald-600 font-medium hover:bg-emerald-50 rounded-lg transition-colors duration-200">
        View All Transactions
      </button>
    </Card>
  );
}; 