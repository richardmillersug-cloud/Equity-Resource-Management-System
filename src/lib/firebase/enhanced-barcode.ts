import { FirestoreService } from './firestore-service';
import { Timestamp } from 'firebase/firestore';
import { ItemCode, CodeType, BarcodeFormat, PrintSettings } from '../services/barcode-service';

export interface BarcodeItem {
  id: string;
  itemName: string;
  itemDescription: string;
  category: string;
  supplierName: string;
  receivedDate: Timestamp;
  codeType: CodeType;
  codeValue: string; // The actual barcode/QR code data
  barcodeFormat?: BarcodeFormat; // Only for barcodes
  generatedBy: string; // Employee ID
  generatedAt: Timestamp;
  printSettings: {
    width: number;
    height: number;
    labelSize: string;
    showText: boolean;
    fontSize: number;
    margin: number;
  };
  status: 'Active' | 'Inactive';
  notes?: string;
  codeImageUrl?: string; // Generated code image
  printHistory: Array<{
    printedAt: Timestamp;
    printedBy: string;
    quantity: number;
    printSettings: PrintSettings;
  }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateBarcodeItemInput {
  itemName: string;
  itemDescription?: string;
  category: string;
  supplierName: string;
  receivedDate: Date;
  codeType: CodeType;
  codeValue: string;
  barcodeFormat?: BarcodeFormat;
  generatedBy: string;
  printSettings: {
    width: number;
    height: number;
    labelSize: string;
    showText: boolean;
    fontSize: number;
    margin: number;
  };
  notes?: string;
  codeImageUrl?: string;
}

export interface BarcodeStats {
  total: number;
  active: number;
  inactive: number;
  barcodes: number;
  qrcodes: number;
  totalPrints: number;
  categories: Array<{ category: string; count: number }>;
  suppliers: Array<{ supplier: string; count: number }>;
}

const COLLECTIONS = {
  BARCODE_ITEMS: 'barcodeItems'
};

export class EnhancedBarcodeService extends FirestoreService<BarcodeItem> {
  constructor() {
    super(COLLECTIONS.BARCODE_ITEMS);
  }

  // Create a new barcode item
  async createBarcodeItem(data: CreateBarcodeItemInput): Promise<string> {
    const barcodeItem: Omit<BarcodeItem, 'id'> = {
      itemName: data.itemName,
      itemDescription: data.itemDescription || data.notes || '', // Use notes as fallback if no description
      category: data.category,
      supplierName: data.supplierName,
      receivedDate: Timestamp.fromDate(data.receivedDate),
      codeType: data.codeType,
      codeValue: data.codeValue,
      barcodeFormat: data.barcodeFormat,
      generatedBy: data.generatedBy,
      generatedAt: Timestamp.now(),
      printSettings: data.printSettings,
      status: 'Active',
      notes: data.notes,
      codeImageUrl: data.codeImageUrl,
      printHistory: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    return await this.create(barcodeItem);
  }

  // Get barcode items by category
  async getByCategory(category: string): Promise<BarcodeItem[]> {
    return await this.getAll([
      {
        field: 'category',
        operator: '==',
        value: category
      }
    ]);
  }

  // Get barcode items by supplier
  async getBySupplier(supplierName: string): Promise<BarcodeItem[]> {
    return await this.getAll([
      {
        field: 'supplierName',
        operator: '==',
        value: supplierName
      }
    ]);
  }

  // Get barcode items by code type
  async getByCodeType(codeType: CodeType): Promise<BarcodeItem[]> {
    return await this.getAll([
      {
        field: 'codeType',
        operator: '==',
        value: codeType
      }
    ]);
  }

  // Get barcode items by status
  async getByStatus(status: 'Active' | 'Inactive'): Promise<BarcodeItem[]> {
    return await this.getAll([
      {
        field: 'status',
        operator: '==',
        value: status
      }
    ]);
  }

  // Search barcode items
  async searchItems(searchTerm: string): Promise<BarcodeItem[]> {
    const allItems = await this.getAll();
    const term = searchTerm.toLowerCase();
    
    return allItems.filter(item => 
      item.itemName.toLowerCase().includes(term) ||
      item.itemDescription.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term) ||
      item.supplierName.toLowerCase().includes(term) ||
      item.codeValue.toLowerCase().includes(term)
    );
  }

  // Update barcode item status
  async updateStatus(itemId: string, status: 'Active' | 'Inactive'): Promise<void> {
    await this.update(itemId, {
      status,
      updatedAt: Timestamp.now()
    });
  }

  // Record print activity
  async recordPrint(
    itemId: string, 
    printedBy: string, 
    quantity: number, 
    printSettings: PrintSettings
  ): Promise<void> {
    const item = await this.getById(itemId);
    if (!item) {
      throw new Error('Barcode item not found');
    }

    const newPrintRecord = {
      printedAt: Timestamp.now(),
      printedBy,
      quantity,
      printSettings
    };

    const updatedPrintHistory = [...item.printHistory, newPrintRecord];

    await this.update(itemId, {
      printHistory: updatedPrintHistory,
      updatedAt: Timestamp.now()
    });
  }

  // Get barcode statistics
  async getBarcodeStats(): Promise<BarcodeStats> {
    const items = await this.getAll();
    
    const categoryMap = new Map<string, number>();
    const supplierMap = new Map<string, number>();
    let totalPrints = 0;

    items.forEach(item => {
      // Count categories
      categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + 1);
      
      // Count suppliers
      supplierMap.set(item.supplierName, (supplierMap.get(item.supplierName) || 0) + 1);
      
      // Count total prints
      totalPrints += item.printHistory.reduce((sum, print) => sum + print.quantity, 0);
    });

    return {
      total: items.length,
      active: items.filter(item => item.status === 'Active').length,
      inactive: items.filter(item => item.status === 'Inactive').length,
      barcodes: items.filter(item => item.codeType === 'barcode').length,
      qrcodes: items.filter(item => item.codeType === 'qrcode').length,
      totalPrints,
      categories: Array.from(categoryMap.entries()).map(([category, count]) => ({ category, count })),
      suppliers: Array.from(supplierMap.entries()).map(([supplier, count]) => ({ supplier, count }))
    };
  }

  // Get recent items (last 30 days)
  async getRecentItems(days: number = 30): Promise<BarcodeItem[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await this.getAll([
      {
        field: 'createdAt',
        operator: '>=',
        value: Timestamp.fromDate(cutoffDate)
      }
    ], [{ field: 'createdAt', direction: 'desc' }]);
  }

  // Create sample data for testing
  async createSampleBarcodeItems(): Promise<string[]> {
    const sampleItems: CreateBarcodeItemInput[] = [
      {
        itemName: 'Laptop Dell Inspiron',
        itemDescription: 'Dell Inspiron 15 3000 laptop with 8GB RAM',
        category: 'Electronics',
        supplierName: 'Dell Uganda',
        receivedDate: new Date(),
        codeType: 'barcode',
        codeValue: 'ELLAP' + Date.now().toString().slice(-8),
        barcodeFormat: 'CODE128',
        generatedBy: 'EMP001',
        printSettings: {
          width: 50.8,
          height: 25.4,
          labelSize: '2"×1"',
          showText: true,
          fontSize: 12,
          margin: 2
        },
        notes: 'High-value item, handle with care'
      },
      {
        itemName: 'Office Chair',
        itemDescription: 'Ergonomic office chair with lumbar support',
        category: 'Furniture',
        supplierName: 'Furniture Plus',
        receivedDate: new Date(),
        codeType: 'qrcode',
        codeValue: 'FUCHA' + Date.now().toString().slice(-8),
        generatedBy: 'EMP001',
        printSettings: {
          width: 25.4,
          height: 25.4,
          labelSize: '1"×1"',
          showText: true,
          fontSize: 10,
          margin: 2
        }
      },
      {
        itemName: 'Printer Paper A4',
        itemDescription: 'A4 size printer paper, 500 sheets per ream',
        category: 'Stationery',
        supplierName: 'Office Supplies Ltd',
        receivedDate: new Date(),
        codeType: 'barcode',
        codeValue: 'STPRI' + Date.now().toString().slice(-8),
        barcodeFormat: 'CODE128',
        generatedBy: 'EMP001',
        printSettings: {
          width: 76.2,
          height: 25.4,
          labelSize: '3"×1"',
          showText: true,
          fontSize: 14,
          margin: 3
        }
      }
    ];

    const createdIds: string[] = [];
    
    for (const item of sampleItems) {
      const id = await this.createBarcodeItem(item);
      createdIds.push(id);
    }

    return createdIds;
  }

  // Bulk create items
  async bulkCreateItems(items: CreateBarcodeItemInput[]): Promise<string[]> {
    const createdIds: string[] = [];
    
    for (const item of items) {
      const id = await this.createBarcodeItem(item);
      createdIds.push(id);
    }

    return createdIds;
  }

  // Export items data
  async exportItemsData(format: 'csv' | 'json' = 'csv'): Promise<string> {
    const items = await this.getAll();
    
    if (format === 'json') {
      return JSON.stringify(items, null, 2);
    }
    
    // CSV format
    const headers = [
      'Item Name',
      'Description', 
      'Category',
      'Supplier',
      'Code Type',
      'Code Value',
      'Status',
      'Created Date',
      'Total Prints'
    ];
    
    const csvRows = [headers.join(',')];
    
    items.forEach(item => {
      const totalPrints = item.printHistory.reduce((sum, print) => sum + print.quantity, 0);
      const row = [
        `"${item.itemName}"`,
        `"${item.itemDescription}"`,
        `"${item.category}"`,
        `"${item.supplierName}"`,
        item.codeType,
        item.codeValue,
        item.status,
        item.createdAt.toDate().toLocaleDateString(),
        totalPrints.toString()
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }
}

// Export singleton instance
export const enhancedBarcodeService = new EnhancedBarcodeService(); 