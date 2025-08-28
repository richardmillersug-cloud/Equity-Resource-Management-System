// Common functionality patterns that can be added to any page

import { useState } from 'react';

// 1. SEARCH AND FILTER FUNCTIONALITY
export function useSearchAndFilter<T>(data: T[], searchFields: string[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredData = data.filter(item => {
    // Search functionality
    const matchesSearch = searchTerm === '' || searchFields.some(field => {
      const value = getNestedValue(item, field);
      return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Filter functionality
    const matchesFilters = Object.entries(filters).every(([key, value]) => {
      if (value === '' || value === null || value === undefined) return true;
      const itemValue = getNestedValue(item, key);
      return itemValue === value;
    });

    return matchesSearch && matchesFilters;
  });

  // Sorting functionality
  const sortedData = sortField ? filteredData.sort((a, b) => {
    const aValue = getNestedValue(a, sortField);
    const bValue = getNestedValue(b, sortField);
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  }) : filteredData;

  return {
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    filteredData: sortedData
  };
}

// 2. BULK ACTIONS FUNCTIONALITY
export function useBulkActions<T>(items: T[], keyField: string = 'id') {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  const selectItem = (id: string, selected: boolean) => {
    const newSelected = new Set(selectedItems);
    if (selected) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = (selected: boolean) => {
    if (selected) {
      setSelectedItems(new Set(items.map(item => getNestedValue(item, keyField))));
    } else {
      setSelectedItems(new Set());
    }
  };

  const clearSelection = () => setSelectedItems(new Set());

  const getSelectedData = () => {
    return items.filter(item => selectedItems.has(getNestedValue(item, keyField)));
  };

  return {
    selectedItems,
    bulkMode,
    setBulkMode,
    selectItem,
    selectAll,
    clearSelection,
    getSelectedData,
    selectedCount: selectedItems.size
  };
}

// 3. PAGINATION FUNCTIONALITY
export function usePagination<T>(data: T[], itemsPerPage: number = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(itemsPerPage);

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = data.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  return {
    currentPage,
    pageSize,
    setPageSize,
    totalPages,
    currentData,
    goToPage,
    nextPage,
    prevPage,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    startIndex: startIndex + 1,
    endIndex: Math.min(endIndex, data.length),
    totalItems: data.length
  };
}

// 4. EXPORT FUNCTIONALITY
export function useExport() {
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(field => `"${row[field] || ''}"`).join(',')
      )
    ].join('\n');

    downloadFile(csvContent, `${filename}.csv`, 'text/csv');
  };

  const exportToJSON = (data: any[], filename: string) => {
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, `${filename}.json`, 'application/json');
  };

  const exportToExcel = async (data: any[], filename: string) => {
    // Note: This would require additional libraries like xlsx
    console.log('Excel export functionality would go here');
    // For now, export as CSV
    exportToCSV(data, filename);
  };

  return {
    exportToCSV,
    exportToJSON,
    exportToExcel
  };
}

// 5. MODAL/DIALOG FUNCTIONALITY
export function useModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = useState<any>(null);

  const openModal = (data?: any) => {
    setModalData(data);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setModalData(null);
  };

  return {
    isOpen,
    modalData,
    openModal,
    closeModal
  };
}

// 6. FORM MANAGEMENT FUNCTIONALITY
export function useForm<T>(initialData: T, onSubmit: (data: T) => Promise<void>) {
  const [formData, setFormData] = useState<T>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const resetForm = () => {
    setFormData(initialData);
    setErrors({});
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setErrors({});
      await onSubmit(formData);
      resetForm();
    } catch (error: any) {
      if (error.validationErrors) {
        setErrors(error.validationErrors);
      } else {
        setErrors({ general: error.message || 'An error occurred' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    errors,
    isSubmitting,
    updateField,
    resetForm,
    handleSubmit,
    setErrors
  };
}

// 7. NOTIFICATION/TOAST FUNCTIONALITY
export function useNotifications() {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timeout?: number;
  }>>([]);

  const addNotification = (
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
    timeout: number = 5000
  ) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message, timeout }]);

    if (timeout > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, timeout);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const success = (message: string, timeout?: number) => 
    addNotification('success', message, timeout);
  
  const error = (message: string, timeout?: number) => 
    addNotification('error', message, timeout);
  
  const warning = (message: string, timeout?: number) => 
    addNotification('warning', message, timeout);
  
  const info = (message: string, timeout?: number) => 
    addNotification('info', message, timeout);

  return {
    notifications,
    addNotification,
    removeNotification,
    success,
    error,
    warning,
    info
  };
}

// 8. REAL-TIME DATA FUNCTIONALITY
export function useRealTimeData<T>(
  loadData: () => Promise<T[]>,
  subscribeToData?: (callback: (data: T[]) => void) => () => void
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const refreshData = async () => {
    try {
      setLoading(true);
      setError('');
      const newData = await loadData();
      setData(newData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription if available
  const setupSubscription = () => {
    if (subscribeToData) {
      return subscribeToData((newData) => {
        setData(newData);
        setLoading(false);
      });
    }
    return undefined;
  };

  return {
    data,
    loading,
    error,
    refreshData,
    setupSubscription
  };
}

// UTILITY FUNCTIONS
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// 9. ADVANCED ANALYTICS FUNCTIONALITY
export function useAnalytics<T>(data: T[]) {
  const calculateStats = (field: string) => {
    const values = data.map(item => getNestedValue(item, field)).filter(v => typeof v === 'number');
    
    return {
      total: values.reduce((sum, val) => sum + val, 0),
      average: values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    };
  };

  const groupBy = (field: string) => {
    return data.reduce((groups: Record<string, T[]>, item) => {
      const key = getNestedValue(item, field);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  };

  const getTopItems = (field: string, limit: number = 10) => {
    const groups = groupBy(field);
    return Object.entries(groups)
      .sort(([,a], [,b]) => b.length - a.length)
      .slice(0, limit)
      .map(([key, items]) => ({ [field]: key, count: items.length }));
  };

  return {
    calculateStats,
    groupBy,
    getTopItems
  };
}

// 10. COMPONENT STATE MANAGEMENT
export function useComponentState() {
  const [activeTab, setActiveTab] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('table');

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  return {
    activeTab,
    setActiveTab,
    expandedSections,
    toggleSection,
    viewMode,
    setViewMode
  };
}