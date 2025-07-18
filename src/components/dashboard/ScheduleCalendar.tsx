'use client';

import React, { useState } from 'react';
import { LegacyCard } from '../ui/Card';

interface ScheduleEvent {
  date: number;
  title: string;
  amount?: number;
  type: 'bill' | 'payment' | 'meeting' | 'deadline';
  count?: number;
}

interface ScheduleCalendarProps {
  events?: ScheduleEvent[];
}

const mockEvents: ScheduleEvent[] = [
  { date: 4, title: 'Supplier Payments', amount: 7700, type: 'bill', count: 2 },
  { date: 8, title: 'Payroll Processing', amount: 24000, type: 'payment', count: 3 },
  { date: 24, title: 'Monthly Reports', amount: 12000, type: 'deadline', count: 2 },
  { date: 1, title: 'Quarterly Review', amount: 50000, type: 'meeting', count: 5 },
];

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ 
  events = mockEvents 
}) => {
  const [selectedMonth, setSelectedMonth] = useState('May 2023');
  const [selectedDate, setSelectedDate] = useState<number | null>(4);

  // Generate calendar days
  const generateCalendarDays = () => {
    const daysInMonth = 31; // May 2023
    const firstDayOfWeek = 1; // Monday (May 1, 2023 was a Monday)
    const days = [];

    // Previous month days
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ day: 30 - firstDayOfWeek + i + 1, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true });
    }

    // Next month days to fill the grid
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ day: i, isCurrentMonth: false });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const getEventForDate = (date: number) => {
    return events.find(event => event.date === date);
  };

  const upcomingBills = events
    .filter(event => event.type === 'bill' || event.type === 'payment')
    .sort((a, b) => a.date - b.date);

  return (
    <div className="space-y-6">
      {/* Calendar */}
      <LegacyCard 
        title="Schedule" 
        subtitle="Schedule your transaction"
        actions={
          <button className="text-emerald-600 hover:text-emerald-700">
            <span className="text-xl">+</span>
          </button>
        }
      >
        {/* Month Selector */}
        <div className="flex items-center justify-between mb-6">
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-lg font-semibold bg-transparent border-none outline-none cursor-pointer"
          >
            <option>May 2023</option>
            <option>June 2023</option>
            <option>July 2023</option>
          </select>
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              ←
            </button>
            <button className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              →
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Week day headers */}
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs text-gray-500 font-medium py-2">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((dayObj, index) => {
            const event = getEventForDate(dayObj.day);
            const isSelected = selectedDate === dayObj.day && dayObj.isCurrentMonth;
            const hasEvent = event && dayObj.isCurrentMonth;

            return (
              <button
                key={index}
                onClick={() => dayObj.isCurrentMonth && setSelectedDate(dayObj.day)}
                className={`
                  aspect-square flex items-center justify-center text-sm font-medium rounded-lg transition-all duration-200
                  ${!dayObj.isCurrentMonth 
                    ? 'text-gray-300' 
                    : isSelected
                      ? 'bg-emerald-600 text-white'
                      : hasEvent
                        ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                        : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                {dayObj.day}
              </button>
            );
          })}
        </div>
      </LegacyCard>

      {/* Bills */}
      <LegacyCard 
        title="Bills" 
        subtitle="Your upcoming bills"
      >
        <div className="space-y-4">
          {upcomingBills.map((bill, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{bill.date}</div>
                    <div className="text-xs text-gray-500">May</div>
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{bill.title}</p>
                  <p className="text-sm text-gray-500">
                    {bill.count} {bill.type === 'bill' ? 'bills' : 'payments'} upcoming
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  ${bill.amount?.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </LegacyCard>
    </div>
  );
}; 