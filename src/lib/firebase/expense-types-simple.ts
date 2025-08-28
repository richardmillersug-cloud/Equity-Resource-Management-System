// Simple ExpenseTypes service that works without composite indexes
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from './config';
import { ExpenseType } from './expense-types';

export class SimpleExpenseTypesService {
  private collectionName = 'expenseTypes';

  // Get all active expense types (simple query without complex composite index)
  async getActiveExpenseTypesSimple(): Promise<ExpenseType[]> {
    try {
      console.log('🔍 Loading active expense types (simple query)...');
      
      if (!db) {
        throw new Error('Firestore database not initialized');
      }
      
      let expenseTypes: ExpenseType[] = [];
      
      try {
        // Try simple filtered query first
        const q = query(
          collection(db, this.collectionName),
          where('isActive', '==', true)
        );
        
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach((doc) => {
          expenseTypes.push({ 
            id: doc.id, 
            ...doc.data() 
          } as ExpenseType);
        });
        
        console.log(`📋 Found ${expenseTypes.length} documents with isActive filter`);
        
      } catch (filterError) {
        console.warn('⚠️ Filtered query failed, trying unfiltered approach:', filterError);
        
        // Fallback: Get all documents and filter in memory
        const allDocsSnapshot = await getDocs(collection(db, this.collectionName));
        
        allDocsSnapshot.forEach((doc) => {
          const data = doc.data() as ExpenseType;
          if (data.isActive) {
            expenseTypes.push({ 
              id: doc.id, 
              ...data
            } as ExpenseType);
          }
        });
        
        console.log(`📋 Filtered ${expenseTypes.length} active types from all documents`);
      }
      
      // Sort in memory by category, then by name
      expenseTypes.sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.name.localeCompare(b.name);
      });
      
      console.log(`✅ Loaded ${expenseTypes.length} active expense types (simple)`);
      return expenseTypes;
      
    } catch (error) {
      console.error('❌ Error loading active expense types (simple):', error);
      throw error;
    }
  }

  // Get all expense types without any filtering (fallback)
  async getAllExpenseTypesSimple(): Promise<ExpenseType[]> {
    try {
      console.log('🔍 Loading all expense types (no filters)...');
      
      const querySnapshot = await getDocs(collection(db, this.collectionName));
      const expenseTypes: ExpenseType[] = [];
      
      querySnapshot.forEach((doc) => {
        expenseTypes.push({ 
          id: doc.id, 
          ...doc.data() 
        } as ExpenseType);
      });
      
      // Filter active types in memory and sort
      const activeTypes = expenseTypes
        .filter(type => type.isActive)
        .sort((a, b) => {
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
          }
          return a.name.localeCompare(b.name);
        });
      
      console.log(`✅ Loaded ${activeTypes.length} active expense types (all -> filtered)`);
      return activeTypes;
      
    } catch (error) {
      console.error('❌ Error loading all expense types (simple):', error);
      throw error;
    }
  }

  // Search expense types by name or tags (in memory)
  async searchExpenseTypesSimple(searchTerm: string): Promise<ExpenseType[]> {
    try {
      const allTypes = await this.getActiveExpenseTypesSimple();
      const searchLower = searchTerm.toLowerCase();
      
      const filtered = allTypes.filter(type => 
        type.name.toLowerCase().includes(searchLower) ||
        type.description.toLowerCase().includes(searchLower) ||
        type.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
      
      console.log(`🔍 Search "${searchTerm}" found ${filtered.length} matches`);
      return filtered;
      
    } catch (error) {
      console.error('❌ Error searching expense types (simple):', error);
      throw error;
    }
  }

  // Get expense types by category (in memory filtering)
  async getExpenseTypesByCategorySimple(category: string): Promise<ExpenseType[]> {
    try {
      const allTypes = await this.getActiveExpenseTypesSimple();
      
      const filtered = allTypes
        .filter(type => type.category === category)
        .sort((a, b) => a.name.localeCompare(b.name));
      
      console.log(`📂 Category "${category}" has ${filtered.length} expense types`);
      return filtered;
      
    } catch (error) {
      console.error('❌ Error loading expense types by category (simple):', error);
      throw error;
    }
  }

  // Get expense types for department (in memory filtering)
  async getExpenseTypesForDepartmentSimple(department: string): Promise<ExpenseType[]> {
    try {
      const allTypes = await this.getActiveExpenseTypesSimple();
      
      const filtered = allTypes
        .filter(type => type.allowedDepartments.includes(department))
        .sort((a, b) => {
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
          }
          return a.name.localeCompare(b.name);
        });
      
      console.log(`🏢 Department "${department}" has ${filtered.length} allowed expense types`);
      return filtered;
      
    } catch (error) {
      console.error('❌ Error loading expense types for department (simple):', error);
      throw error;
    }
  }

  // Get most used expense types (in memory sorting)
  async getMostUsedExpenseTypesSimple(limit: number = 10): Promise<ExpenseType[]> {
    try {
      const allTypes = await this.getActiveExpenseTypesSimple();
      
      const sorted = allTypes
        .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
        .slice(0, limit);
      
      console.log(`📊 Top ${limit} most used expense types loaded`);
      return sorted;
      
    } catch (error) {
      console.error('❌ Error loading most used expense types (simple):', error);
      throw error;
    }
  }
}
