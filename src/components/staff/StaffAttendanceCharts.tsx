'use client';

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { EQUITY_BRAND } from './brand';
import { formatHours, type MonthlyAttendanceStat } from './monthly-attendance-stats';
import { getShiftDefinition } from '@/lib/firebase/staff-shifts';

ChartJS.register(ArcElement, Tooltip, Legend);

interface StaffAttendanceChartsProps {
  stats: MonthlyAttendanceStat[];
  shift?: string | null;
}

function roundPct(value: number): number {
  return Math.round(value * 10) / 10;
}

function monthCompletionPie(gainedPercent: number, kind: 'expected' | 'gained') {
  if (kind === 'expected') {
    return {
      labels: ['Expected'],
      datasets: [
        {
          data: [100],
          backgroundColor: [EQUITY_BRAND.purple],
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    };
  }

  const gained = Math.min(Math.max(gainedPercent, 0), 100);
  const unfilled = roundPct(100 - gained);

  // Partial ring toward 100% — unfilled track only (not labeled as remaining days)
  return {
    labels: ['Gained', ''],
    datasets: [
      {
        data: gained <= 0 ? [0.0001, 100] : [gained, unfilled || 0.0001],
        backgroundColor: [EQUITY_BRAND.green, 'rgba(226, 232, 240, 0.45)'],
        borderColor: ['#ffffff', 'transparent'],
        borderWidth: 2,
      },
    ],
  };
}

function doughnutOptions(centerLabel: string) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { label?: string; parsed: number; raw: unknown }) => {
            const value = typeof ctx.parsed === 'number' ? ctx.parsed : Number(ctx.raw) || 0;
            if (!ctx.label || value < 0.01) return '';
            return ` ${ctx.label}: ${roundPct(value)}%`;
          },
        },
      },
    },
  };
}

function CenterLabel({
  title,
  subtitle,
  color,
}: {
  title: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
      <p className="text-2xl font-bold" style={{ color }}>
        {title}
      </p>
      <p className="mt-0.5 max-w-[7rem] text-[10px] leading-tight text-slate-500 dark:text-slate-400">
        {subtitle}
      </p>
    </div>
  );
}

export function StaffAttendanceCharts({ stats, shift }: StaffAttendanceChartsProps) {
  const def = getShiftDefinition(shift || stats[0]?.shift);
  const current = stats[0];
  const totalRequired = stats.reduce((sum, s) => sum + s.required, 0);
  const totalGained = stats.reduce((sum, s) => sum + s.gained, 0);
  const overallPct = totalRequired > 0 ? roundPct((totalGained / totalRequired) * 100) : 0;

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span
          className="rounded-full px-2.5 py-0.5 font-medium text-white"
          style={{ backgroundColor: def.id === 'night' ? EQUITY_BRAND.purple : EQUITY_BRAND.orange }}
        >
          {def.label} shift · {def.hoursLabel}
        </span>
        <span>
          {formatHours(def.durationHours)} h default / day (Mon–Sun) · shifts vary by date · Overall
          gained{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-200">{overallPct}%</span>
          {' '}of expected
        </span>
      </div>

      {current && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-2 flex flex-col gap-1 sm:mb-3 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 sm:text-base dark:text-white">
                  Expected
                </h2>
                <p className="text-[10px] text-slate-500 sm:text-xs dark:text-slate-400">
                  {current.label} · full shift target
                </p>
              </div>
              <span
                className="w-fit rounded-full px-2 py-0.5 text-[10px] font-medium text-white sm:text-xs"
                style={{ backgroundColor: EQUITY_BRAND.purple }}
              >
                100%
              </span>
            </div>
            <div className="relative mx-auto h-36 w-36 sm:h-52 sm:w-52">
              <Doughnut
                data={monthCompletionPie(100, 'expected')}
                options={doughnutOptions('100%')}
              />
              <CenterLabel
                title="100%"
                subtitle={`${formatHours(current.required)} h · ${current.expectedDays} days`}
                color={EQUITY_BRAND.purple}
              />
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-500 sm:mt-3 sm:text-xs dark:text-slate-400">
              {current.expectedDays} days in month · {current.dayShiftDays} day /{' '}
              {current.nightShiftDays} night assigned
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-2 flex flex-col gap-1 sm:mb-3 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 sm:text-base dark:text-white">
                  Gained
                </h2>
                <p className="text-[10px] text-slate-500 sm:text-xs dark:text-slate-400">
                  {current.label} · % of expected
                </p>
              </div>
              <span
                className="w-fit rounded-full px-2 py-0.5 text-[10px] font-medium text-white sm:text-xs"
                style={{ backgroundColor: EQUITY_BRAND.green }}
              >
                {current.gainedPercent}%
              </span>
            </div>
            <div className="relative mx-auto h-36 w-36 sm:h-52 sm:w-52">
              <Doughnut
                data={monthCompletionPie(current.gainedPercent, 'gained')}
                options={doughnutOptions(`${current.gainedPercent}%`)}
              />
              <CenterLabel
                title={`${current.gainedPercent}%`}
                subtitle={`${formatHours(current.gained)} of ${formatHours(current.required)} h`}
                color={EQUITY_BRAND.green}
              />
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-500 sm:mt-3 sm:text-xs dark:text-slate-400">
              {current.daysAttended}/{current.expectedDays} days · {formatHours(def.durationHours)} h/
              day
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          Monthly expected vs gained
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="pb-2 pr-3 font-medium">Month</th>
                <th className="pb-2 pr-3 font-medium">Expected</th>
                <th className="pb-2 pr-3 font-medium">Gained</th>
                <th className="pb-2 font-medium">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {stats.map((month) => (
                <tr key={month.key}>
                  <td className="py-2.5 pr-3 font-medium text-slate-800 dark:text-slate-100">
                    {month.label}
                  </td>
                  <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-300">
                    <span className="font-semibold" style={{ color: EQUITY_BRAND.purple }}>
                      100%
                    </span>
                    <span className="ml-1 text-xs text-slate-400">
                      ({formatHours(month.required)} h)
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-300">
                    <span className="font-semibold" style={{ color: EQUITY_BRAND.green }}>
                      {month.gainedPercent}%
                    </span>
                    <span className="ml-1 text-xs text-slate-400">
                      ({formatHours(month.gained)} h)
                    </span>
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(month.gainedPercent, 100)}%`,
                            backgroundColor: EQUITY_BRAND.green,
                          }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">
                        {month.daysAttended}/{month.expectedDays} days
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
