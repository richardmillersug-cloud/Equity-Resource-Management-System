'use client';

import React, { useState } from 'react';
import { Card } from '../ui/Card';

interface ActivityChartProps {
  data?: Array<{ day: string; amount: number }>;
}

const mockData = [
  { day: 'Mon', amount: 20 },
  { day: 'Tue', amount: 35 },
  { day: 'Wed', amount: 45 },
  { day: 'Thu', amount: 60 },
  { day: 'Fri', amount: 55 },
  { day: 'Sat', amount: 70 },
  { day: 'Sun', amount: 65 },
];

export const ActivityChart: React.FC<ActivityChartProps> = ({ data = mockData }) => {
  const [activeTab, setActiveTab] = useState<'Day' | 'Week' | 'Month'>('Week');
  
  const maxAmount = Math.max(...data.map(d => d.amount));
  
  // Generate SVG path for the smooth curve
  const generatePath = () => {
    const width = 300;
    const height = 120;
    const padding = 20;
    
    const points = data.map((item, index) => ({
      x: padding + (index * (width - 2 * padding)) / (data.length - 1),
      y: height - padding - ((item.amount / maxAmount) * (height - 2 * padding))
    }));
    
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cp1x = prev.x + (curr.x - prev.x) / 3;
      const cp1y = prev.y;
      const cp2x = curr.x - (curr.x - prev.x) / 3;
      const cp2y = curr.y;
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }
    
    return path;
  };
  
  return (
    <Card 
      title="Activity" 
      subtitle="Your transaction activities"
      className="col-span-2"
    >
      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        {(['Day', 'Week', 'Month'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      
      {/* Chart */}
      <div className="relative">
        <svg width="100%" height="140" viewBox="0 0 300 140" className="overflow-visible">
          {/* Grid lines */}
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          
          {/* Background grid */}
          {[20, 40, 60, 80].map((y) => (
            <line
              key={y}
              x1="20"
              y1={y + 20}
              x2="280"
              y2={y + 20}
              stroke="#f3f4f6"
              strokeWidth="1"
            />
          ))}
          
          {/* Area under curve */}
          <path
            d={`${generatePath()} L 280 120 L 20 120 Z`}
            fill="url(#chartGradient)"
          />
          
          {/* Main curve */}
          <path
            d={generatePath()}
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Data points */}
          {data.map((item, index) => {
            const x = 20 + (index * 240) / (data.length - 1);
            const y = 120 - 20 - ((item.amount / maxAmount) * 80);
            
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill="#10b981"
                stroke="white"
                strokeWidth="2"
                className="hover:r-6 transition-all duration-200 cursor-pointer"
              />
            );
          })}
        </svg>
        
        {/* X-axis labels */}
        <div className="flex justify-between mt-4 px-5">
          {data.map((item, index) => (
            <span key={index} className="text-xs text-gray-500">
              {item.day}
            </span>
          ))}
        </div>
        
        {/* Y-axis values */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-5 text-xs text-gray-500">
          <span>${maxAmount}</span>
          <span>${Math.round(maxAmount * 0.75)}</span>
          <span>${Math.round(maxAmount * 0.5)}</span>
          <span>${Math.round(maxAmount * 0.25)}</span>
          <span>$0</span>
        </div>
      </div>
    </Card>
  );
}; 