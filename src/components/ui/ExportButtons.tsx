'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import {
  exportTable,
  exportToPdf,
  exportToXls,
  type ExportColumn,
  type ExportOptions,
} from '@/lib/export/table-export';

type CommonProps = {
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  label?: string;
} & Omit<ExportOptions, 'filename'> & { filename: string };

type ColumnExportProps<T> = CommonProps & {
  rows: T[];
  columns: ExportColumn<T>[];
  data?: never;
};

type RecordExportProps = CommonProps & {
  data: Record<string, string | number | boolean | null | undefined>[];
  rows?: never;
  columns?: never;
};

export type ExportButtonsProps<T = unknown> = ColumnExportProps<T> | RecordExportProps;

export function ExportButtons<T>(props: ExportButtonsProps<T>) {
  const {
    disabled = false,
    className = '',
    size = 'sm',
    label = 'Export',
    filename,
    title,
    subtitle,
  } = props;

  const [busy, setBusy] = useState<'pdf' | 'xls' | null>(null);
  const [error, setError] = useState('');

  const rowCount =
    'rows' in props && props.rows
      ? props.rows.length
      : 'data' in props && props.data
        ? props.data.length
        : 0;

  const isDisabled = disabled || rowCount === 0 || busy !== null;

  const run = async (format: 'pdf' | 'xls') => {
    setError('');
    setBusy(format);
    try {
      const options = { filename, title, subtitle };
      if ('columns' in props && props.columns && props.rows) {
        await exportTable(props.rows, props.columns, format, options);
      } else if ('data' in props && props.data) {
        if (format === 'xls') exportToXls(props.data, options);
        else await exportToPdf(props.data, options);
      } else {
        throw new Error('No data to export');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      setError(message);
      console.error('Export failed:', err);
    } finally {
      setBusy(null);
    }
  };

  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';

  return (
    <div className={`inline-flex flex-col items-end gap-1 ${className}`}>
      <div className="inline-flex items-center overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <span
          className={`hidden items-center gap-1.5 border-r border-gray-200 bg-gray-50 font-medium text-gray-600 sm:inline-flex ${pad}`}
        >
          <Download className="h-3.5 w-3.5" />
          {label}
        </span>
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => run('pdf')}
          className={`inline-flex items-center gap-1.5 font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 ${pad}`}
          title={rowCount === 0 ? 'No rows to export' : 'Export PDF'}
        >
          {busy === 'pdf' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileText className="h-3.5 w-3.5" />
          )}
          PDF
        </button>
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => run('xls')}
          className={`inline-flex items-center gap-1.5 border-l border-gray-200 font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 ${pad}`}
          title={rowCount === 0 ? 'No rows to export' : 'Export Excel (XLS)'}
        >
          {busy === 'xls' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-3.5 w-3.5" />
          )}
          XLS
        </button>
      </div>
      {error && <p className="max-w-[16rem] text-right text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
