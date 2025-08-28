import React from 'react';

interface FundingSourceDisplayProps {
  fundingSource: 'DAILY_EXPENSE_FUND' | 'WALLET_GROSS_PROFIT' | null;
  amount?: number;
  size?: 'sm' | 'md' | 'lg';
  showAmount?: boolean;
  className?: string;
}

export function FundingSourceDisplay({ 
  fundingSource, 
  amount, 
  size = 'md', 
  showAmount = false,
  className = '' 
}: FundingSourceDisplayProps) {
  // Handle null funding source
  if (!fundingSource) {
    const sizeClasses = {
      sm: 'text-xs px-2 py-1',
      md: 'text-sm px-3 py-1',
      lg: 'text-base px-4 py-2'
    };
    
    const baseClasses = `inline-flex items-center rounded-full font-medium ${sizeClasses[size]}`;
    
    return (
      <span className={`${baseClasses} bg-gray-100 text-gray-600 border border-gray-200 ${className}`}>
        <span className="mr-1">📋</span>
        <span>No Funding Assigned</span>
      </span>
    );
  }

  const isDailyFund = fundingSource === 'DAILY_EXPENSE_FUND';
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };
  
  const baseClasses = `inline-flex items-center rounded-full font-medium ${sizeClasses[size]}`;
  
  const fundingClasses = isDailyFund
    ? 'bg-blue-100 text-blue-800 border border-blue-200'
    : 'bg-green-100 text-green-800 border border-green-200';
  
  const icon = isDailyFund ? '🏦' : '💰';
  const label = isDailyFund ? 'Daily Fund' : 'Gross Profit';
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(value);
  };
  
  return (
    <span className={`${baseClasses} ${fundingClasses} ${className}`}>
      <span className="mr-1">{icon}</span>
      <span>{label}</span>
      {showAmount && amount && (
        <span className="ml-2 font-semibold">
          {formatCurrency(amount)}
        </span>
      )}
    </span>
  );
}

interface FundingSourceSelectorProps {
  value: 'DAILY_EXPENSE_FUND' | 'WALLET_GROSS_PROFIT';
  onChange: (value: 'DAILY_EXPENSE_FUND' | 'WALLET_GROSS_PROFIT') => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  showBalances?: boolean;
  dailyFundBalance?: number;
  grossProfitBalance?: number;
}

export function FundingSourceSelector({
  value,
  onChange,
  disabled = false,
  label = "Funding Source",
  description = "Choose which fund to assign to this payment",
  showBalances = false,
  dailyFundBalance = 0,
  grossProfitBalance = 0
}: FundingSourceSelectorProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      {description && (
        <p className="text-sm text-gray-600">{description}</p>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
            value === 'DAILY_EXPENSE_FUND' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 bg-white hover:border-blue-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && onChange('DAILY_EXPENSE_FUND')}
        >
          <div className="flex items-center mb-2">
            <div className="w-4 h-4 border-2 border-blue-500 rounded-full mr-3 flex items-center justify-center">
              {value === 'DAILY_EXPENSE_FUND' && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>
            <span className="font-medium text-gray-900">🏦 Daily Expense Fund</span>
          </div>
          <div className="text-sm text-gray-600 ml-7">
            <div className="font-medium text-blue-600">Fixed Daily Collection</div>
            <div className="text-xs mt-1">Regular operational expenses</div>
            {showBalances && (
              <div className="text-xs mt-2 font-semibold text-blue-700">
                Available: {formatCurrency(dailyFundBalance)}
              </div>
            )}
          </div>
        </div>
        
        <div 
          className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
            value === 'WALLET_GROSS_PROFIT' 
              ? 'border-green-500 bg-green-50' 
              : 'border-gray-200 bg-white hover:border-green-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && onChange('WALLET_GROSS_PROFIT')}
        >
          <div className="flex items-center mb-2">
            <div className="w-4 h-4 border-2 border-green-500 rounded-full mr-3 flex items-center justify-center">
              {value === 'WALLET_GROSS_PROFIT' && (
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              )}
            </div>
            <span className="font-medium text-gray-900">💰 Wallet Gross Profit</span>
          </div>
          <div className="text-sm text-gray-600 ml-7">
            <div className="font-medium text-green-600">Business Profit Allocation</div>
            <div className="text-xs mt-1">Larger investments & strategic expenses</div>
            {showBalances && (
              <div className="text-xs mt-2 font-semibold text-green-700">
                Available: {formatCurrency(grossProfitBalance)}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-3 text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded p-2">
        📝 <strong>Payment-Time Assignment:</strong> Funds are assigned when payment is made - no pre-allocation required. Choose the appropriate source based on expense type.
      </div>
    </div>
  );
}

export default FundingSourceDisplay;
