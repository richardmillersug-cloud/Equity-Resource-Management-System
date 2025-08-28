import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  setDoc,
  query, 
  where, 
  orderBy, 
  Timestamp,
  limit,
  startAfter,
  QueryConstraint
} from 'firebase/firestore';
import { db } from './config';
import { FirestoreService } from './firestore-service';

export interface ReturnItem {
  id: string;
  itemName: string;
  itemDescription?: string;
  category: string;
  supplierName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalValue: number;
  reason: string;
  batchNumber?: string;
  expiryDate?: Date;
  invoiceNumber?: string;
  notes?: string;
}

export interface ReturnNote {
  id: string;
  returnNoteNumber: string;
  supplierId: string;
  supplierName: string;
  items: ReturnItem[];
  totalQuantity: number;
  totalValue: number;
  returnDate: any; // Firestore Timestamp
  expectedPickupDate?: any; // Firestore Timestamp
  actualPickupDate?: any; // Firestore Timestamp
  status: 'draft' | 'pending' | 'approved' | 'picked_up' | 'received' | 'processed' | 'rejected' | 'cancelled';
  reason: string;
  notes?: string;
  createdBy: string;
  approvedBy?: string;
  processedBy?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
}

export interface ReturnNoteStats {
  totalReturns: number;
  totalValue: number;
  pendingReturns: number;
  processedReturns: number;
  rejectedReturns: number;
  draftReturns: number;
}

export const RETURN_REASONS = [
  'Expired goods',
  'Short expiry dates',
  'Damaged goods',
  'Wrong items delivered',
  'Quality issues',
  'Overstock',
  'Defective products',
  'Incorrect specifications',
  'Customer complaints',
  'Recall notice',
  'Other'
];

export const RETURN_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'pending', label: 'Pending Approval', color: 'yellow' },
  { value: 'approved', label: 'Approved', color: 'green' },
  { value: 'picked_up', label: 'Picked Up', color: 'blue' },
  { value: 'received', label: 'Items Received', color: 'green' },
  { value: 'processed', label: 'Processed', color: 'purple' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
  { value: 'cancelled', label: 'Cancelled', color: 'gray' }
];

export class EnhancedReturnNoteService extends FirestoreService<ReturnNote> {
  constructor() {
    super('returnNotes');
  }

  // Generate return note number
  private async generateReturnNoteNumber(): Promise<string> {
    try {
      // Get the current count from a counter document
      const counterRef = doc(db, 'counters', 'returnNotes');
      const counterDoc = await getDoc(counterRef);
      
      let nextNumber = 1;
      if (counterDoc.exists()) {
        nextNumber = (counterDoc.data().count || 0) + 1;
      }
      
      // Update the counter
      await setDoc(counterRef, { count: nextNumber }, { merge: true });
      
      // Format as RN0001, RN0002, etc.
      return `RN${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating return note number:', error);
      // Fallback to timestamp-based number if counter fails
      const timestamp = Date.now().toString();
      return `RN${timestamp.slice(-4)}`;
    }
  }

  // Create return note
  async createReturnNote(returnNoteData: Omit<ReturnNote, 'id' | 'returnNoteNumber' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      console.log('EnhancedReturnNoteService: Starting createReturnNote');
      console.log('Input data:', returnNoteData);
      
      // Generate the return note number
      const returnNoteNumber = await this.generateReturnNoteNumber();
      console.log('Generated return note number:', returnNoteNumber);
      
      const returnNote: Omit<ReturnNote, 'id' | 'createdAt' | 'updatedAt'> = {
        ...returnNoteData,
        returnNoteNumber: returnNoteNumber
      };

      console.log('Generated return note:', returnNote);
      console.log('Collection name:', this.collectionName);

      const result = await this.create(returnNote);
      console.log('Return note created successfully with ID:', result);
      
      return result;
    } catch (error) {
      console.error('Error in createReturnNote:', error);
      throw error;
    }
  }

  // Get return notes by date range
  async getReturnNotesByDateRange(startDate: string, endDate: string): Promise<ReturnNote[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return await this.getAll([
      { field: 'returnDate', operator: '>=', value: start },
      { field: 'returnDate', operator: '<=', value: end }
    ], { orderBy: 'returnDate', orderDirection: 'desc' });
  }

  // Get return notes by supplier
  async getReturnNotesBySupplier(supplierId: string): Promise<ReturnNote[]> {
    return await this.getAll([
      { field: 'supplierId', operator: '==', value: supplierId }
    ], { orderBy: 'createdAt', orderDirection: 'desc' });
  }

  // Get return notes by status
  async getReturnNotesByStatus(status: string): Promise<ReturnNote[]> {
    return await this.getAll([
      { field: 'status', operator: '==', value: status }
    ], { orderBy: 'createdAt', orderDirection: 'desc' });
  }

  // Update return note status
  async updateReturnNoteStatus(returnNoteId: string, status: string, updatedBy?: string): Promise<void> {
    const updates: any = {
      status,
      updatedAt: new Date()
    };

    if (status === 'approved' && updatedBy) {
      updates.approvedBy = updatedBy;
    }

    if (status === 'processed' && updatedBy) {
      updates.processedBy = updatedBy;
      updates.actualPickupDate = new Date();
    }

    await this.update(returnNoteId, updates);
  }

  // Update return note
  async updateReturnNote(returnNoteId: string, updates: Partial<ReturnNote>): Promise<void> {
    await this.update(returnNoteId, {
      ...updates,
      updatedAt: new Date()
    });
  }

  // Delete return note
  async deleteReturnNote(returnNoteId: string): Promise<void> {
    await this.delete(returnNoteId);
  }

  // Get return note statistics
  async getReturnNoteStats(): Promise<ReturnNoteStats> {
    const allReturns = await this.getAll();
    
    const stats = {
      totalReturns: allReturns.length,
      totalValue: allReturns.reduce((sum, rn) => sum + rn.totalValue, 0),
      pendingReturns: allReturns.filter(rn => rn.status === 'pending').length,
      processedReturns: allReturns.filter(rn => rn.status === 'processed').length,
      rejectedReturns: allReturns.filter(rn => rn.status === 'rejected').length,
      draftReturns: allReturns.filter(rn => rn.status === 'draft').length
    };

    return stats;
  }

  // Search return notes
  async searchReturnNotes(searchTerm: string): Promise<ReturnNote[]> {
    const allReturns = await this.getAll();
    
    return allReturns.filter(returnNote => 
      returnNote.returnNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnNote.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnNote.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnNote.items.some(item => 
        item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.itemDescription && item.itemDescription.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    );
  }

  // Get recent return notes
  async getRecentReturnNotes(limitCount: number = 10): Promise<ReturnNote[]> {
    return await this.getAll([], { 
      orderBy: 'createdAt', 
      orderDirection: 'desc',
      limit: limitCount
    });
  }

  // Get return notes by reason
  async getReturnNotesByReason(reason: string): Promise<ReturnNote[]> {
    return await this.getAll([
      { field: 'reason', operator: '==', value: reason }
    ], { orderBy: 'createdAt', orderDirection: 'desc' });
  }

  // Approve return note
  async approveReturnNote(returnNoteId: string, approvedBy: string): Promise<void> {
    await this.updateReturnNoteStatus(returnNoteId, 'approved', approvedBy);
  }

  // Reject return note
  async rejectReturnNote(returnNoteId: string, rejectedBy: string, reason?: string): Promise<void> {
    const updates: any = {
      status: 'rejected',
      updatedAt: new Date(),
      processedBy: rejectedBy
    };

    if (reason) {
      updates.notes = `Rejected: ${reason}`;
    }

    await this.update(returnNoteId, updates);
  }

  // Mark as picked up
  async markAsPickedUp(returnNoteId: string, pickedUpBy: string): Promise<void> {
    await this.update(returnNoteId, {
      status: 'picked_up',
      actualPickupDate: new Date(),
      processedBy: pickedUpBy,
      updatedAt: new Date()
    });
  }

  // Get return notes requiring action
  async getReturnNotesRequiringAction(): Promise<ReturnNote[]> {
    return await this.getAll([
      { field: 'status', operator: 'in', value: ['pending', 'approved'] }
    ], { orderBy: 'createdAt', orderDirection: 'asc' });
  }

  // Backfill missing return note numbers for existing return notes
  async backfillReturnNoteNumbers(): Promise<void> {
    try {
      console.log('Starting backfill of return note numbers...');
      
      // Get all return notes
      const allReturnNotes = await this.getAll();
      
      // Find return notes without numbers
      const returnNotesWithoutNumbers = allReturnNotes.filter(note => 
        !note.returnNoteNumber || note.returnNoteNumber.trim() === ''
      );
      
      console.log(`Found ${returnNotesWithoutNumbers.length} return notes without numbers`);
      
      // Assign numbers to each one
      for (const returnNote of returnNotesWithoutNumbers) {
        const returnNoteNumber = await this.generateReturnNoteNumber();
        await this.update(returnNote.id, { returnNoteNumber });
        console.log(`Assigned ${returnNoteNumber} to return note ${returnNote.id}`);
      }
      
      console.log('Backfill completed successfully');
    } catch (error) {
      console.error('Error during backfill:', error);
      throw error;
    }
  }

  // Get return notes with their items for purchasing manager
  async getReturnNotesForPurchasing(): Promise<ReturnNote[]> {
    return await this.getAll([], { 
      orderBy: 'createdAt', 
      orderDirection: 'desc' 
    });
  }

  // Get items that have been returned and need restocking
  async getItemsForRestocking(): Promise<any[]> {
    try {
      const receivedNotes = await this.getAll([
        { field: 'status', operator: '==', value: 'received' }
      ]);
      
      const restockingItems: any[] = [];
      
      receivedNotes.forEach(note => {
        note.items.forEach(item => {
          restockingItems.push({
            itemName: item.itemName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalValue: item.totalValue || (item.quantity * item.unitPrice),
            returnNoteId: note.id,
            returnNoteNumber: note.returnNoteNumber || 'N/A',
            supplierName: note.supplierName,
            returnDate: note.returnDate,
            reason: note.reason,
            status: 'pending_restock',
            priority: this.calculateRestockPriority(item)
          });
        });
      });
      
      return restockingItems;
    } catch (error) {
      console.error('Error getting items for restocking:', error);
      throw error;
    }
  }

  // Calculate restocking priority based on item characteristics
  private calculateRestockPriority(item: any): 'high' | 'medium' | 'low' {
    const quantity = item.quantity || 0;
    const value = item.totalValue || (item.quantity * item.unitPrice) || 0;
    
    // High priority: large quantities or high value items
    if (quantity > 100 || value > 1000000) return 'high'; // UGX 1M+
    
    // Low priority: small quantities and low value
    if (quantity < 10 && value < 100000) return 'low'; // UGX 100K-
    
    // Medium priority: everything else
    return 'medium';
  }

  // Get statistics for purchasing dashboard
  async getPurchasingStats(): Promise<{
    totalReturns: number;
    pendingReturns: number;
    receivedItems: number;
    itemsNeedingRestock: number;
    totalReturnValue: number;
    monthlyTrend: { month: string; returns: number; value: number }[];
  }> {
    try {
      const allNotes = await this.getAll();
      const restockingItems = await this.getItemsForRestocking();
      
      const receivedNotes = allNotes.filter(note => note.status === 'received');
      const totalReturnValue = receivedNotes.reduce((sum, note) => sum + (note.totalValue || 0), 0);
      
      // Calculate monthly trend for last 6 months
      const monthlyTrend = this.calculateMonthlyTrend(allNotes);
      
      return {
        totalReturns: allNotes.length,
        pendingReturns: allNotes.filter(note => ['pending', 'approved', 'picked_up'].includes(note.status)).length,
        receivedItems: receivedNotes.length,
        itemsNeedingRestock: restockingItems.length,
        totalReturnValue: totalReturnValue,
        monthlyTrend: monthlyTrend
      };
    } catch (error) {
      console.error('Error getting purchasing stats:', error);
      throw error;
    }
  }

  // Calculate monthly trend data
  private calculateMonthlyTrend(notes: ReturnNote[]): { month: string; returns: number; value: number }[] {
    const last6Months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      const monthNotes = notes.filter(note => {
        const returnDate = note.returnDate.toDate();
        const noteMonthKey = `${returnDate.getFullYear()}-${String(returnDate.getMonth() + 1).padStart(2, '0')}`;
        return noteMonthKey === monthKey;
      });
      
      const monthValue = monthNotes
        .filter(note => note.status === 'received')
        .reduce((sum, note) => sum + (note.totalValue || 0), 0);
      
      last6Months.push({
        month: monthName,
        returns: monthNotes.length,
        value: monthValue
      });
    }
    
    return last6Months;
  }

  // Mark item as restocked
  async markItemAsRestocked(returnNoteId: string, itemIndex: number): Promise<void> {
    try {
      // This would typically update an inventory system
      // For now, we'll add a note to the return note
      const returnNote = await this.getById(returnNoteId);
      if (returnNote && returnNote.items[itemIndex]) {
        const updatedItems = [...returnNote.items];
        updatedItems[itemIndex] = {
          ...updatedItems[itemIndex],
          restockedAt: new Date(),
          restockStatus: 'restocked'
        };
        
        await this.update(returnNoteId, { items: updatedItems });
      }
    } catch (error) {
      console.error('Error marking item as restocked:', error);
      throw error;
    }
  }
} 