import { bulletproofServices } from '../lib/firebase/firestore-service-fixed';
import { SalesReportParser } from './salesReportParser';
import { CSVParser, salesDataColumns } from './csvParser';

export interface CSVDataFilter {
  year?: number;
  month?: number;
  status?: 'stored' | 'processed' | 'analyzed';
  tags?: string[];
  uploadedBy?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface AnalysisResult {
  file: any;
  data: any[];
  summary: {
    totalRecords: number;
    totalRevenue: number;
    avgTransaction: number;
    dateRange: { start: string; end: string };
    topProducts?: Array<{
      name: string;
      revenue: number;
      quantity: number;
    }>;
    branchBreakdown?: Record<string, {
      revenue: number;
      transactions: number;
    }>;
  };
  errors: string[];
  warnings: string[];
}

export class CSVDataAnalyzer {
  
  /**
   * Get all stored CSV files with optional filtering
   */
  static async getStoredFiles(filter?: CSVDataFilter): Promise<any[]> {
    try {
      let files = await bulletproofServices.storedCSV.getAll();

      if (filter) {
        files = files.filter(file => {
          if (filter.year && file.year !== filter.year) return false;
          if (filter.month && file.month !== filter.month) return false;
          if (filter.status && file.status !== filter.status) return false;
          if (filter.uploadedBy && file.uploadedBy !== filter.uploadedBy) return false;
          if (filter.tags && !filter.tags.some(tag => file.tags.includes(tag))) return false;
          if (filter.dateRange) {
            const uploadDate = new Date(file.uploadDate);
            if (uploadDate < filter.dateRange.start || uploadDate > filter.dateRange.end) return false;
          }
          return true;
        });
      }

      return files.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
    } catch (error) {
      console.error('Failed to get stored files:', error);
      throw error;
    }
  }

  /**
   * Get CSV files for a specific month/year
   */
  static async getFilesByMonth(month: number, year: number): Promise<any[]> {
    try {
      return await bulletproofServices.storedCSV.getCSVFilesByMonth(month, year);
    } catch (error) {
      console.error('Failed to get files by month:', error);
      throw error;
    }
  }

  /**
   * Analyze a single CSV file
   */
  static async analyzeFile(fileId: string): Promise<AnalysisResult> {
    try {
      const file = await bulletproofServices.storedCSV.getById(fileId);
      if (!file) {
        throw new Error('File not found');
      }

      if (!file.csvContent) {
        throw new Error('No CSV content found in file');
      }

      // Try to parse with SalesReportParser first (for your specific format)
      try {
        const parser = new SalesReportParser(file.csvContent);
        const { transactions, summary } = parser.parse();

        // Calculate analytics
        const totalRevenue = transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
        const avgTransaction = transactions.length > 0 ? totalRevenue / transactions.length : 0;

        // Group by product
        const productMap = new Map();
        transactions.forEach(t => {
          const key = t.productDescription || 'Unknown';
          if (!productMap.has(key)) {
            productMap.set(key, { name: key, revenue: 0, quantity: 0 });
          }
          const product = productMap.get(key);
          product.revenue += t.totalAmount || 0;
          product.quantity += t.unitsSold || 0;
        });

        const topProducts = Array.from(productMap.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);

        // Group by branch
        const branchMap = new Map();
        transactions.forEach(t => {
          const branch = t.branch || 'Unknown';
          if (!branchMap.has(branch)) {
            branchMap.set(branch, { revenue: 0, transactions: 0 });
          }
          const branchData = branchMap.get(branch);
          branchData.revenue += t.totalAmount || 0;
          branchData.transactions += 1;
        });

        const result: AnalysisResult = {
          file,
          data: transactions,
          summary: {
            totalRecords: transactions.length,
            totalRevenue,
            avgTransaction,
            dateRange: {
              start: summary.reportPeriod.start,
              end: summary.reportPeriod.end
            },
            topProducts,
            branchBreakdown: Object.fromEntries(branchMap)
          },
          errors: [],
          warnings: []
        };

        return result;

      } catch (salesParserError) {
        console.warn('SalesReportParser failed, trying generic CSV parser:', salesParserError);

        // Fallback to generic CSV parser
        const csvParser = new CSVParser(salesDataColumns);
        const parseResult = csvParser.parse(file.csvContent);

        const totalRevenue = parseResult.data.reduce((sum, row) => sum + (row.amount || 0), 0);
        const avgTransaction = parseResult.data.length > 0 ? totalRevenue / parseResult.data.length : 0;

        const result: AnalysisResult = {
          file,
          data: parseResult.data,
          summary: {
            totalRecords: parseResult.validRows,
            totalRevenue,
            avgTransaction,
            dateRange: {
              start: 'Unknown',
              end: 'Unknown'
            }
          },
          errors: parseResult.errors,
          warnings: parseResult.warnings
        };

        return result;
      }

    } catch (error) {
      console.error('Failed to analyze file:', error);
      throw error;
    }
  }

  /**
   * Analyze multiple files and combine results
   */
  static async analyzeMultipleFiles(fileIds: string[]): Promise<{
    files: AnalysisResult[];
    combined: {
      totalFiles: number;
      totalRecords: number;
      totalRevenue: number;
      avgTransaction: number;
      dateRange: { start: string; end: string };
      monthlyBreakdown: Array<{
        month: string;
        year: number;
        revenue: number;
        transactions: number;
        files: number;
      }>;
    };
  }> {
    try {
      const results = await Promise.all(
        fileIds.map(id => this.analyzeFile(id))
      );

      // Combine results
      const totalRecords = results.reduce((sum, r) => sum + r.summary.totalRecords, 0);
      const totalRevenue = results.reduce((sum, r) => sum + r.summary.totalRevenue, 0);
      const avgTransaction = totalRecords > 0 ? totalRevenue / totalRecords : 0;

      // Monthly breakdown
      const monthlyMap = new Map();
      results.forEach(result => {
        const key = `${result.file.monthName} ${result.file.year}`;
        if (!monthlyMap.has(key)) {
          monthlyMap.set(key, {
            month: result.file.monthName,
            year: result.file.year,
            revenue: 0,
            transactions: 0,
            files: 0
          });
        }
        const monthly = monthlyMap.get(key);
        monthly.revenue += result.summary.totalRevenue;
        monthly.transactions += result.summary.totalRecords;
        monthly.files += 1;
      });

      const monthlyBreakdown = Array.from(monthlyMap.values())
        .sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return new Date(`${a.month} 1, ${a.year}`).getMonth() - new Date(`${b.month} 1, ${b.year}`).getMonth();
        });

      return {
        files: results,
        combined: {
          totalFiles: results.length,
          totalRecords,
          totalRevenue,
          avgTransaction,
          dateRange: {
            start: results.length > 0 ? results[0].summary.dateRange.start : 'Unknown',
            end: results.length > 0 ? results[results.length - 1].summary.dateRange.end : 'Unknown'
          },
          monthlyBreakdown
        }
      };

    } catch (error) {
      console.error('Failed to analyze multiple files:', error);
      throw error;
    }
  }

  /**
   * Export analysis results to different formats
   */
  static exportToCSV(analysisResult: AnalysisResult): string {
    if (!analysisResult.data.length) return '';

    const headers = Object.keys(analysisResult.data[0]);
    const csvRows = [
      headers.join(','),
      ...analysisResult.data.map(row => 
        headers.map(field => `"${row[field] || ''}"`).join(',')
      )
    ];

    return csvRows.join('\n');
  }

  static exportToJSON(analysisResult: AnalysisResult): string {
    return JSON.stringify({
      fileInfo: {
        name: analysisResult.file.fileName,
        month: analysisResult.file.monthName,
        year: analysisResult.file.year,
        uploadDate: analysisResult.file.uploadDate
      },
      summary: analysisResult.summary,
      data: analysisResult.data,
      errors: analysisResult.errors,
      warnings: analysisResult.warnings
    }, null, 2);
  }

  /**
   * Delete a stored CSV file
   */
  static async deleteFile(fileId: string): Promise<void> {
    try {
      await bulletproofServices.storedCSV.delete(fileId);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  /**
   * Update file status
   */
  static async updateFileStatus(fileId: string, status: 'stored' | 'processed' | 'analyzed'): Promise<void> {
    try {
      await bulletproofServices.storedCSV.update(fileId, { status });
    } catch (error) {
      console.error('Failed to update file status:', error);
      throw error;
    }
  }

  /**
   * Get summary statistics for all stored files
   */
  static async getOverallStatistics(): Promise<{
    totalFiles: number;
    totalSizeKB: number;
    filesByMonth: Record<string, number>;
    filesByYear: Record<number, number>;
    filesByStatus: Record<string, number>;
    oldestFile: Date | null;
    newestFile: Date | null;
  }> {
    try {
      const files = await this.getStoredFiles();

      const stats = {
        totalFiles: files.length,
        totalSizeKB: files.reduce((sum, f) => sum + (f.fileSize / 1024), 0),
        filesByMonth: {} as Record<string, number>,
        filesByYear: {} as Record<number, number>,
        filesByStatus: {} as Record<string, number>,
        oldestFile: null as Date | null,
        newestFile: null as Date | null
      };

      files.forEach(file => {
        // By month
        const monthKey = `${file.monthName} ${file.year}`;
        stats.filesByMonth[monthKey] = (stats.filesByMonth[monthKey] || 0) + 1;

        // By year
        stats.filesByYear[file.year] = (stats.filesByYear[file.year] || 0) + 1;

        // By status
        stats.filesByStatus[file.status] = (stats.filesByStatus[file.status] || 0) + 1;

        // Date range
        const uploadDate = new Date(file.uploadDate);
        if (!stats.oldestFile || uploadDate < stats.oldestFile) {
          stats.oldestFile = uploadDate;
        }
        if (!stats.newestFile || uploadDate > stats.newestFile) {
          stats.newestFile = uploadDate;
        }
      });

      return stats;

    } catch (error) {
      console.error('Failed to get overall statistics:', error);
      throw error;
    }
  }
}

// Helper functions for common operations
export const csvHelpers = {
  
  // Format currency
  formatCurrency: (amount: number, currency = 'UGX') => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  },

  // Format numbers
  formatNumber: (num: number) => {
    return new Intl.NumberFormat().format(num);
  },

  // Calculate percentage change
  percentageChange: (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  },

  // Group data by time period
  groupByPeriod: (data: any[], dateField: string, period: 'day' | 'week' | 'month' | 'year') => {
    const groups = new Map();

    data.forEach(item => {
      const date = new Date(item[dateField]);
      let key: string;

      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
        case 'year':
          key = date.getFullYear().toString();
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(item);
    });

    return Object.fromEntries(groups);
  },

  // Download file
  downloadFile: (content: string, filename: string, mimeType: string = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
};