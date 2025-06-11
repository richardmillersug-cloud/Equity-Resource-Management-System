import { enhancedInvoiceService, Invoice, Damage } from './enhanced-invoice';
import { enhancedSupplierService, EnhancedSupplier } from './enhanced-supplier';

export interface DamageWithDetails extends Damage {
  invoiceNumber: string;
  invoiceDate: Date;
  supplierName: string;
  supplierId: string;
}

export class EnhancedDamageService {
  // Get all damages from all invoices
  async getAllDamages(): Promise<DamageWithDetails[]> {
    try {
      console.log('Fetching all invoices to extract damages...');
      
      // Get all invoices
      const invoices = await enhancedInvoiceService.getAll();
      console.log(`Found ${invoices.length} invoices`);
      
      const damagesWithDetails: DamageWithDetails[] = [];
      
      // Extract damages from each invoice
      for (const invoice of invoices) {
        if (invoice.hasDamages && invoice.damages && invoice.damages.length > 0) {
          console.log(`Processing ${invoice.damages.length} damages from invoice ${invoice.invoiceNumber}`);
          
          for (let i = 0; i < invoice.damages.length; i++) {
            const damage = invoice.damages[i];
            
            const damageWithDetails: DamageWithDetails = {
              id: `${invoice.id}_damage_${i}`, // Generate a unique ID
              invoiceId: invoice.id,
              itemDescription: damage.itemDescription,
              quantityDamaged: damage.quantityDamaged,
              estimatedValue: damage.estimatedValue,
              damageReason: damage.damageReason,
              reportedBy: damage.reportedBy,
              reportedAt: damage.reportedAt,
              status: damage.status || 'Reported',
              
              // Additional details from invoice
              invoiceNumber: invoice.invoiceNumber,
              invoiceDate: invoice.date.toDate(),
              supplierName: invoice.supplierName,
              supplierId: invoice.supplierId
            };
            
            damagesWithDetails.push(damageWithDetails);
          }
        }
      }
      
      console.log(`Extracted ${damagesWithDetails.length} total damages`);
      
      // Sort by most recent first
      damagesWithDetails.sort((a, b) => b.reportedAt.toDate().getTime() - a.reportedAt.toDate().getTime());
      
      return damagesWithDetails;
      
    } catch (error) {
      console.error('Error fetching damages:', error);
      throw new Error('Failed to fetch damages data');
    }
  }
  
  // Get damages by supplier
  async getDamagesBySupplier(supplierId: string): Promise<DamageWithDetails[]> {
    const allDamages = await this.getAllDamages();
    return allDamages.filter(damage => damage.supplierId === supplierId);
  }
  
  // Get damages by status
  async getDamagesByStatus(status: Damage['status']): Promise<DamageWithDetails[]> {
    const allDamages = await this.getAllDamages();
    return allDamages.filter(damage => damage.status === status);
  }
  
  // Get damage statistics
  async getDamageStats(): Promise<{
    total: number;
    reported: number;
    underReview: number;
    approved: number;
    rejected: number;
    totalValue: number;
    affectedSuppliers: number;
  }> {
    const damages = await this.getAllDamages();
    
    const stats = {
      total: damages.length,
      reported: damages.filter(d => d.status === 'Reported').length,
      underReview: damages.filter(d => d.status === 'UnderReview').length,
      approved: damages.filter(d => d.status === 'Approved').length,
      rejected: damages.filter(d => d.status === 'Rejected').length,
      totalValue: damages.reduce((sum, d) => sum + d.estimatedValue, 0),
      affectedSuppliers: new Set(damages.map(d => d.supplierId)).size
    };
    
    return stats;
  }
  
  // Search damages
  async searchDamages(searchTerm: string): Promise<DamageWithDetails[]> {
    const damages = await this.getAllDamages();
    const term = searchTerm.toLowerCase();
    
    return damages.filter(damage => 
      damage.itemDescription.toLowerCase().includes(term) ||
      damage.damageReason.toLowerCase().includes(term) ||
      damage.supplierName.toLowerCase().includes(term) ||
      damage.invoiceNumber.toLowerCase().includes(term)
    );
  }
}

// Export singleton instance
export const enhancedDamageService = new EnhancedDamageService(); 