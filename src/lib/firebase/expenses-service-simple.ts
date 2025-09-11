import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from './config';

// Simple expenses service without complex queries to avoid index issues
export class SimpleExpensesService {
  
  // Get all expenses without complex filtering - no index needed
  async getAllExpensesSimple(): Promise<any[]> {
    try {
      console.log('🔍 Fetching all expenses (simple query)...');
      
      const collectionRef = collection(db, 'expenses');
      const snapshot = await getDocs(collectionRef);
      
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamps
        expenseDate: doc.data().expenseDate?.toDate?.() || doc.data().expenseDate,
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
        dueDate: doc.data().dueDate?.toDate?.() || doc.data().dueDate,
      }));
      
      console.log(`✅ Found ${documents.length} expense documents`);
      return documents;
      
    } catch (error) {
      console.error('❌ Error fetching expenses:', error);
      throw error;
    }
  }

  // Get recent expenses with simple ordering
  async getRecentExpenses(limitCount: number = 10): Promise<any[]> {
    try {
      console.log(`🔍 Fetching recent ${limitCount} expenses...`);
      
      const collectionRef = collection(db, 'expenses');
      const q = query(collectionRef, orderBy('createdAt', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        expenseDate: doc.data().expenseDate?.toDate?.() || doc.data().expenseDate,
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
        dueDate: doc.data().dueDate?.toDate?.() || doc.data().dueDate,
      }));
      
      console.log(`✅ Found ${documents.length} recent expenses`);
      return documents;
      
    } catch (error) {
      console.error('❌ Error fetching recent expenses:', error);
      throw error;
    }
  }

  // Get expenses summary without complex aggregations
  async getExpensesSummary(): Promise<{
    totalExpenses: number;
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
    categories: string[];
  }> {
    try {
      console.log('🔍 Calculating expenses summary...');
      
      const expenses = await this.getAllExpensesSimple();
      
      const summary = {
        totalExpenses: expenses.length,
        totalAmount: expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0),
        totalPaid: expenses.reduce((sum, exp) => sum + (exp.paidAmount || 0), 0),
        totalRemaining: expenses.reduce((sum, exp) => sum + (exp.remainingBalance || (exp.amount || 0) - (exp.paidAmount || 0)), 0),
        categories: [...new Set(expenses.map(exp => exp.category).filter(cat => cat))]
      };
      
      console.log('✅ Expenses summary calculated:', summary);
      return summary;
      
    } catch (error) {
      console.error('❌ Error calculating expenses summary:', error);
      throw error;
    }
  }
}



































