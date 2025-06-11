import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
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
  status: 'draft' | 'pending' | 'approved' | 'picked_up' | 'processed' | 'rejected' | 'cancelled';
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
  { value: 'processed', label: 'Processed', color: 'purple' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
  { value: 'cancelled', label: 'Cancelled', color: 'gray' }
];

export class EnhancedReturnNoteService extends FirestoreService<ReturnNote> {
  constructor() {
    super('returnNotes');
  }

  // Generate return note number
  private generateReturnNoteNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RN${year}${month}${day}${random}`;
  }

  // Create return note
  async createReturnNote(returnNoteData: Omit<ReturnNote, 'id' | 'returnNoteNumber' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      console.log('EnhancedReturnNoteService: Starting createReturnNote');
      console.log('Input data:', returnNoteData);
      
      const returnNote: Omit<ReturnNote, 'id' | 'createdAt' | 'updatedAt'> = {
        ...returnNoteData,
        returnNoteNumber: this.generateReturnNoteNumber()
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
      orderDirection: 'desc' 
    }, limitCount);
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
} 