'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  BarChart3, 
  Calendar,
  DollarSign,
  TrendingUp,
  Database,
  Search,
  Filter,
  Trash2,
  Eye
} from 'lucide-react';
import { bulletproofServices } from '../../../../lib/firebase/firestore-service-fixed';
import { authService } from '../../../../lib/firebase/auth';
import { CSVParser, salesDataColumns } from '../../../../utils/csvParser';
import { SalesReportParser } from '../../../../utils/salesReportParser';

interface CSVAnalysis {
  file: any;
  parsedData: any[];
  summary: {
    totalRecords: number;
    totalRevenue: number;
    avgTransaction: number;
    dateRange: { start: string; end: string };
  };
}

export default function CSVAnalyzerPage() {
  const [storedFiles, setStoredFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [analysis, setAnalysis] = useState<CSVAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [filter, setFilter] = useState({
    year: '',
    month: '',
    status: ''
  });
  const [bulkActions, setBulkActions] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonFiles, setComparisonFiles] = useState<any[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    loadUser();
    loadStoredFiles();
  }, []);

  const loadUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  const loadStoredFiles = async () => {
    try {
      setLoading(true);
      const files = await bulletproofServices.storedCSV.getAll();
      const sortedFiles = files.sort((a, b) => 
        new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
      );
      setStoredFiles(sortedFiles);
    } catch (error) {
      console.error('Failed to load stored files:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeCSVFile = async (file: any) => {
    if (!file.csvContent) {
      alert('No CSV content found in this file');
      return;
    }

    setAnalyzing(true);
    setSelectedFile(file);

    try {
      // Use your existing sales report parser
      const parser = new SalesReportParser(file.csvContent);
      const { transactions, summary } = parser.parse();

      const analysis: CSVAnalysis = {
        file,
        parsedData: transactions,
        summary: {
          totalRecords: transactions.length,
          totalRevenue: transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0),
          avgTransaction: transactions.length > 0 
            ? transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0) / transactions.length 
            : 0,
          dateRange: {
            start: summary.reportPeriod.start,
            end: summary.reportPeriod.end
          }
        }
      };

      setAnalysis(analysis);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert(`Analysis failed: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const exportAnalysis = (format: 'csv' | 'json') => {
    if (!analysis) return;

    const data = analysis.parsedData;
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'csv') {
      const headers = Object.keys(data[0] || {});
      const csvRows = [
        headers.join(','),
        ...data.map(row => headers.map(field => `"${row[field] || ''}"`).join(','))
      ];
      content = csvRows.join('\n');
      filename = `analysis-${analysis.file.fileName}.csv`;
      mimeType = 'text/csv';
    } else {
      content = JSON.stringify({
        file: {
          name: analysis.file.fileName,
          month: analysis.file.monthName,
          year: analysis.file.year
        },
        summary: analysis.summary,
        data: data
      }, null, 2);
      filename = `analysis-${analysis.file.fileName}.json`;
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const deleteCSVFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this CSV file?')) return;

    try {
      await bulletproofServices.storedCSV.delete(fileId);
      setStoredFiles(files => files.filter(f => f.id !== fileId));
      if (selectedFile?.id === fileId) {
        setSelectedFile(null);
        setAnalysis(null);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file');
    }
  };

  // Bulk Actions
  const handleSelectFile = (fileId: string, checked: boolean) => {
    const newSelected = new Set(selectedFiles);
    if (checked) {
      newSelected.add(fileId);
    } else {
      newSelected.delete(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(new Set(filteredFiles.map(f => f.id)));
    } else {
      setSelectedFiles(new Set());
    }
  };

  const bulkDeleteFiles = async () => {
    if (selectedFiles.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedFiles.size} files?`)) return;

    try {
      await Promise.all(
        Array.from(selectedFiles).map(id => bulletproofServices.storedCSV.delete(id))
      );
      setStoredFiles(files => files.filter(f => !selectedFiles.has(f.id)));
      setSelectedFiles(new Set());
      alert(`Successfully deleted ${selectedFiles.size} files`);
    } catch (error) {
      console.error('Bulk delete failed:', error);
      alert('Some files failed to delete');
    }
  };

  const bulkUpdateStatus = async (status: 'stored' | 'processed' | 'analyzed') => {
    if (selectedFiles.size === 0) return;

    try {
      await Promise.all(
        Array.from(selectedFiles).map(id => 
          bulletproofServices.storedCSV.update(id, { status })
        )
      );
      await loadStoredFiles();
      setSelectedFiles(new Set());
      alert(`Updated ${selectedFiles.size} files to ${status}`);
    } catch (error) {
      console.error('Bulk update failed:', error);
      alert('Failed to update file status');
    }
  };

  const compareFiles = async () => {
    if (selectedFiles.size < 2) {
      alert('Please select at least 2 files to compare');
      return;
    }

    const filesToCompare = filteredFiles.filter(f => selectedFiles.has(f.id));
    setComparisonFiles(filesToCompare);
    setShowComparison(true);
  };

  const exportBulkAnalysis = async () => {
    if (selectedFiles.size === 0) return;

    try {
      const analyses = await Promise.all(
        Array.from(selectedFiles).map(async (id) => {
          const file = filteredFiles.find(f => f.id === id);
          if (!file) return null;
          
          const parser = new SalesReportParser(file.csvContent);
          const { transactions } = parser.parse();
          
          return {
            fileName: file.fileName,
            month: file.monthName,
            year: file.year,
            totalRecords: transactions.length,
            totalRevenue: transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0),
            data: transactions
          };
        })
      );

      const validAnalyses = analyses.filter(a => a !== null);
      const csvContent = generateBulkCSV(validAnalyses);
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bulk-analysis-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Bulk export failed:', error);
      alert('Failed to export bulk analysis');
    }
  };

  const generateBulkCSV = (analyses: any[]) => {
    const headers = ['File Name', 'Month', 'Year', 'Total Records', 'Total Revenue'];
    const rows = analyses.map(analysis => [
      analysis.fileName,
      analysis.month,
      analysis.year,
      analysis.totalRecords,
      analysis.totalRevenue
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const filteredFiles = storedFiles.filter(file => {
    if (filter.year && file.year.toString() !== filter.year) return false;
    if (filter.month && file.month.toString() !== filter.month) return false;
    if (filter.status && file.status !== filter.status) return false;
    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-600" />
            CSV Data Analyzer
          </h1>
          <p className="text-gray-600 mt-2">Analyze and work with stored CSV data</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* File List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Stored CSV Files</h2>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                  {filteredFiles.length} files
                </span>
              </div>

              {/* Bulk Actions Toggle */}
              <div className="mb-4">
                <button
                  onClick={() => setBulkActions(!bulkActions)}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    bulkActions 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {bulkActions ? 'Exit Bulk Mode' : 'Enable Bulk Actions'}
                </button>
              </div>

              {/* Bulk Actions Toolbar */}
              {bulkActions && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">
                      {selectedFiles.size} selected
                    </span>
                    <button
                      onClick={() => handleSelectAll(selectedFiles.size !== filteredFiles.length)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {selectedFiles.size === filteredFiles.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  
                  {selectedFiles.size > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={bulkDeleteFiles}
                        className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => bulkUpdateStatus('processed')}
                        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        Mark Processed
                      </button>
                      <button
                        onClick={() => bulkUpdateStatus('analyzed')}
                        className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                      >
                        Mark Analyzed
                      </button>
                      <button
                        onClick={compareFiles}
                        className="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                      >
                        Compare
                      </button>
                      <button
                        onClick={exportBulkAnalysis}
                        className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700"
                      >
                        Export
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Filters */}
              <div className="space-y-3 mb-4">
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  {showAdvancedFilters ? '▼' : '▶'} Filters
                </button>
                
                {showAdvancedFilters && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                      <select 
                        value={filter.year} 
                        onChange={(e) => setFilter({...filter, year: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">All Years</option>
                        {Array.from(new Set(storedFiles.map(f => f.year))).sort().map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                      <select 
                        value={filter.month} 
                        onChange={(e) => setFilter({...filter, month: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">All Months</option>
                        {Array.from(new Set(storedFiles.map(f => f.month))).sort().map(month => (
                          <option key={month} value={month}>
                            {new Date(2024, month - 1, 1).toLocaleDateString('en-US', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select 
                        value={filter.status} 
                        onChange={(e) => setFilter({...filter, status: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">All Status</option>
                        <option value="stored">Stored</option>
                        <option value="processed">Processed</option>
                        <option value="analyzed">Analyzed</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* File List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-4 text-gray-500">Loading files...</div>
                ) : filteredFiles.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No files found</div>
                ) : (
                  filteredFiles.map((file) => (
                    <div 
                      key={file.id}
                      className={`p-3 border-2 rounded-lg transition-all ${
                        selectedFile?.id === file.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : selectedFiles.has(file.id)
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${bulkActions ? 'cursor-default' : 'cursor-pointer'}`}
                      onClick={() => !bulkActions && setSelectedFile(file)}
                    >
                      <div className="flex items-start justify-between">
                        {bulkActions && (
                          <div className="mr-3 pt-1">
                            <input
                              type="checkbox"
                              checked={selectedFiles.has(file.id)}
                              onChange={(e) => handleSelectFile(file.id, e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{file.fileName}</p>
                          <p className="text-sm text-gray-600">{file.monthName} {file.year}</p>
                          <p className="text-xs text-gray-500">
                            {(file.fileSize / 1024).toFixed(1)} KB • {file.metadata?.estimatedRecords || 0} records
                          </p>
                        </div>
                        {!bulkActions && (
                          <div className="ml-2 flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                analyzeCSVFile(file);
                              }}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                              title="Analyze"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCSVFile(file.id);
                              }}
                              className="p-1 text-red-600 hover:bg-red-100 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Analysis Results */}
          <div className="lg:col-span-2">
            {!selectedFile ? (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Select a CSV File</h3>
                <p className="text-gray-600">Choose a CSV file from the list to analyze its contents</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* File Info */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">File Information</h2>
                    <button
                      onClick={() => analyzeCSVFile(selectedFile)}
                      disabled={analyzing}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {analyzing ? 'Analyzing...' : 'Analyze Data'}
                      <BarChart3 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">File Name</p>
                      <p className="font-medium">{selectedFile.fileName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Period</p>
                      <p className="font-medium">{selectedFile.monthName} {selectedFile.year}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Size</p>
                      <p className="font-medium">{(selectedFile.fileSize / 1024).toFixed(1)} KB</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        selectedFile.status === 'stored' ? 'bg-yellow-100 text-yellow-800' :
                        selectedFile.status === 'processed' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {selectedFile.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Analysis Results */}
                {analysis && (
                  <>
                    {/* Summary Stats */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Analysis Summary</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => exportAnalysis('csv')}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            Export CSV
                          </button>
                          <button
                            onClick={() => exportAnalysis('json')}
                            className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                          >
                            Export JSON
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-blue-900">{analysis.summary.totalRecords}</p>
                          <p className="text-sm text-blue-700">Total Records</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-green-900">
                            {formatCurrency(analysis.summary.totalRevenue)}
                          </p>
                          <p className="text-sm text-green-700">Total Revenue</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-purple-900">
                            {formatCurrency(analysis.summary.avgTransaction)}
                          </p>
                          <p className="text-sm text-purple-700">Avg Transaction</p>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <Calendar className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                          <p className="text-sm font-bold text-orange-900">
                            {analysis.summary.dateRange.start}
                          </p>
                          <p className="text-sm text-orange-700">Report Period</p>
                        </div>
                      </div>
                    </div>

                    {/* Sample Data */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Sample Data (First 10 Records)</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              {Object.keys(analysis.parsedData[0] || {}).map((key) => (
                                <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {analysis.parsedData.slice(0, 10).map((record, index) => (
                              <tr key={index}>
                                {Object.values(record).map((value: any, i) => (
                                  <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {typeof value === 'number' ? 
                                      (value % 1 === 0 ? value.toLocaleString() : value.toFixed(2)) : 
                                      String(value)
                                    }
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {analysis.parsedData.length > 10 && (
                        <p className="text-sm text-gray-500 mt-4 text-center">
                          Showing 10 of {analysis.parsedData.length} records
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* File Comparison Modal */}
        {showComparison && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">File Comparison</h3>
                  <button
                    onClick={() => setShowComparison(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {comparisonFiles.map((file) => (
                    <div key={file.id} className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">{file.fileName}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Period:</span>
                          <span className="font-medium">{file.monthName} {file.year}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Size:</span>
                          <span className="font-medium">{(file.fileSize / 1024).toFixed(1)} KB</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Records:</span>
                          <span className="font-medium">{file.metadata?.estimatedRecords || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            file.status === 'stored' ? 'bg-yellow-100 text-yellow-800' :
                            file.status === 'processed' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {file.status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Uploaded:</span>
                          <span className="font-medium">
                            {new Date(file.uploadDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          analyzeCSVFile(file);
                          setShowComparison(false);
                        }}
                        className="w-full mt-3 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                      >
                        Analyze This File
                      </button>
                    </div>
                  ))}
                </div>
                
                {comparisonFiles.length > 1 && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h5 className="font-medium text-blue-900 mb-2">Quick Comparison</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-blue-600">Total Files:</span>
                        <p className="font-bold text-blue-900">{comparisonFiles.length}</p>
                      </div>
                      <div>
                        <span className="text-blue-600">Size Range:</span>
                        <p className="font-bold text-blue-900">
                          {Math.min(...comparisonFiles.map(f => f.fileSize / 1024)).toFixed(1)} - 
                          {Math.max(...comparisonFiles.map(f => f.fileSize / 1024)).toFixed(1)} KB
                        </p>
                      </div>
                      <div>
                        <span className="text-blue-600">Date Range:</span>
                        <p className="font-bold text-blue-900">
                          {Math.min(...comparisonFiles.map(f => f.year))} - 
                          {Math.max(...comparisonFiles.map(f => f.year))}
                        </p>
                      </div>
                      <div>
                        <span className="text-blue-600">Estimated Records:</span>
                        <p className="font-bold text-blue-900">
                          {comparisonFiles.reduce((sum, f) => sum + (f.metadata?.estimatedRecords || 0), 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}