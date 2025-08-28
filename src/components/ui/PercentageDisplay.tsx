'use client';

import React from 'react';

interface PercentageDisplayProps {
  amount: number;
  total: number;
  label: string;
  color?: 'blue' | 'green' | 'purple' | 'red' | 'gray';
  showAmount?: boolean;
}

export default function PercentageDisplay({ 
  amount, 
  total, 
  label, 
  color = 'blue',
  showAmount = true 
}: PercentageDisplayProps) {
  const percentage = total > 0 ? (amount / total * 100) : 0;
  
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
    green: 'bg-green-50 text-green-800 border-green-200',
    purple: 'bg-purple-50 text-purple-800 border-purple-200',
    red: 'bg-red-50 text-red-800 border-red-200',
    gray: 'bg-gray-50 text-gray-800 border-gray-200'
  };

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded border text-xs font-medium ${colorClasses[color]}`}>
      {showAmount && (
        <span className="mr-2">UGX {amount.toLocaleString()}</span>
      )}
      <span>
        {label}: <strong>{percentage.toFixed(1)}%</strong>
      </span>
    </div>
  );
}












