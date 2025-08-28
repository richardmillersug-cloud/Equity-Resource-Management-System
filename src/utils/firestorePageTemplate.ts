// Template for connecting any page to Firestore
// Copy this template and modify for your specific needs

import { useState, useEffect } from 'react';
import { authService } from '../lib/firebase/auth';
import { bulletproofServices } from '../lib/firebase/firestore-service-fixed';

// Step 1: Define your data interface
interface YourDataInterface {
  id: string;
  // Add your specific fields here
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// Step 2: Set up state management
export function useFirestoreConnection() {
  const [data, setData] = useState<YourDataInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string>('');

  // Step 3: Load user and data on mount
  useEffect(() => {
    loadUser();
    loadData();
  }, []);

  // Step 4: Authentication
  const loadUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Failed to load user:', error);
      setError('Authentication failed');
    }
  };

  // Step 5: Load data from Firestore
  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Choose your service based on what data you need:
      // bulletproofServices.expenses.getAll()
      // bulletproofServices.suppliers.getAll()
      // bulletproofServices.invoices.getAll()
      // bulletproofServices.employees.getAll()
      // bulletproofServices.storedCSV.getAll()
      // etc.

      const result = await bulletproofServices.expenses.getAll(); // Change this
      setData(result);

    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Step 6: CRUD operations
  const createItem = async (itemData: Omit<YourDataInterface, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!currentUser) throw new Error('User not authenticated');

    try {
      setSaving(true);
      const newItem = {
        ...itemData,
        createdBy: currentUser.uid,
      };

      const id = await bulletproofServices.expenses.create(newItem); // Change service
      await loadData(); // Refresh data
      return id;

    } catch (error) {
      console.error('Failed to create item:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const updateItem = async (id: string, updates: Partial<YourDataInterface>) => {
    try {
      setSaving(true);
      await bulletproofServices.expenses.update(id, updates); // Change service
      await loadData(); // Refresh data

    } catch (error) {
      console.error('Failed to update item:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await bulletproofServices.expenses.delete(id); // Change service
      await loadData(); // Refresh data

    } catch (error) {
      console.error('Failed to delete item:', error);
      throw error;
    }
  };

  return {
    data,
    loading,
    saving,
    currentUser,
    error,
    loadData,
    createItem,
    updateItem,
    deleteItem,
    setError
  };
}

// Step 7: Available Firestore Services
export const AVAILABLE_SERVICES = {
  // CSV and Analytics
  storedCSV: bulletproofServices.storedCSV,
  productSales: bulletproofServices.productSales,
  salesAnalytics: bulletproofServices.salesAnalytics,
  
  // Purchase Manager
  suppliers: bulletproofServices.suppliers,
  invoices: bulletproofServices.invoices,
  payments: bulletproofServices.payments,
  expenses: bulletproofServices.expenses,
  
  // HR
  employees: bulletproofServices.employees,
  attendance: bulletproofServices.attendance,
  leaveRequests: bulletproofServices.leaveRequests,
  payroll: bulletproofServices.payroll,
  
  // Receiver
  deliveries: bulletproofServices.deliveries,
  returnNotes: bulletproofServices.returnNotes,
  damages: bulletproofServices.damages,
  restockItems: bulletproofServices.restockItems,
  
  // General
  branches: bulletproofServices.branches,
  auditLogs: bulletproofServices.auditLogs,
  notifications: bulletproofServices.notifications,
  
  // Import Sessions
  importSession: bulletproofServices.importSession,
  importedCashClose: bulletproofServices.importedCashClose,
};

// Step 8: Common CRUD patterns
export const FIRESTORE_PATTERNS = {
  
  // Get all records
  getAllRecords: async (serviceName: keyof typeof AVAILABLE_SERVICES) => {
    return await AVAILABLE_SERVICES[serviceName].getAll();
  },

  // Get by ID
  getById: async (serviceName: keyof typeof AVAILABLE_SERVICES, id: string) => {
    return await AVAILABLE_SERVICES[serviceName].getById(id);
  },

  // Get with filter
  getWithFilter: async (serviceName: keyof typeof AVAILABLE_SERVICES, filters: any) => {
    return await AVAILABLE_SERVICES[serviceName].getWhere(filters);
  },

  // Real-time subscription
  subscribeToData: (
    serviceName: keyof typeof AVAILABLE_SERVICES, 
    onData: (data: any[]) => void,
    onError: (error: Error) => void
  ) => {
    return AVAILABLE_SERVICES[serviceName].subscribeToCollection(onData, onError);
  },

  // Bulk operations
  bulkCreate: async (serviceName: keyof typeof AVAILABLE_SERVICES, items: any[]) => {
    return await AVAILABLE_SERVICES[serviceName].bulkCreate(items);
  },

  // Get by date range
  getByDateRange: async (
    serviceName: keyof typeof AVAILABLE_SERVICES, 
    startDate: Date, 
    endDate: Date,
    dateField = 'createdAt'
  ) => {
    return await AVAILABLE_SERVICES[serviceName].getByDateRange(dateField, startDate, endDate);
  }
};

// Step 9: Usage examples
export const USAGE_EXAMPLES = {
  
  // Basic page connection
  basicPage: `
    import { useFirestoreConnection } from './firestorePageTemplate';
    
    export default function MyPage() {
      const { 
        data, 
        loading, 
        error, 
        createItem, 
        updateItem, 
        deleteItem 
      } = useFirestoreConnection();
      
      // Your component logic here
    }
  `,

  // Custom service usage
  customService: `
    import { AVAILABLE_SERVICES } from './firestorePageTemplate';
    
    // Get all suppliers
    const suppliers = await AVAILABLE_SERVICES.suppliers.getAll();
    
    // Get specific invoice
    const invoice = await AVAILABLE_SERVICES.invoices.getById('invoice-id');
    
    // Create new expense
    const expenseId = await AVAILABLE_SERVICES.expenses.create({
      amount: 5000,
      description: 'Office supplies',
      category: 'Operations'
    });
  `,

  // Real-time subscription
  realtimeSubscription: `
    useEffect(() => {
      const unsubscribe = FIRESTORE_PATTERNS.subscribeToData(
        'invoices',
        (newData) => setInvoices(newData),
        (error) => console.error('Subscription error:', error)
      );
      
      return unsubscribe; // Cleanup on unmount
    }, []);
  `,

  // Filtered queries
  filteredQueries: `
    // Get active employees only
    const activeEmployees = await AVAILABLE_SERVICES.employees.getWhere({
      status: 'active'
    });
    
    // Get invoices by date range
    const recentInvoices = await AVAILABLE_SERVICES.invoices.getByDateRange(
      'createdAt', 
      new Date('2024-01-01'), 
      new Date('2024-12-31')
    );
  `
};

// Step 10: Error handling utilities
export const handleFirestoreError = (error: any, operation: string) => {
  console.error(`Firestore ${operation} error:`, error);
  
  if (error.code === 'permission-denied') {
    return 'You do not have permission to perform this action';
  }
  
  if (error.code === 'not-found') {
    return 'The requested item was not found';
  }
  
  if (error.code === 'already-exists') {
    return 'An item with this identifier already exists';
  }
  
  if (error.code === 'failed-precondition') {
    return 'Operation failed due to system constraints';
  }
  
  return `Failed to ${operation}: ${error.message || 'Unknown error'}`;
};