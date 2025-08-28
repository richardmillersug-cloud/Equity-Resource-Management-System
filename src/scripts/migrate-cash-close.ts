#!/usr/bin/env tsx

/**
 * Migration Script: Old Cash Close → New Comprehensive Cash Close
 * 
 * This script migrates data from:
 * - Old `cashClose` collection
 * - `importedCashCloses` collection  
 * - Cash close data in `cashAllocations`
 * 
 * To the new `comprehensiveCashClose` collection
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { comprehensiveCashCloseService, ComprehensiveCashClose } from '../lib/firebase/comprehensive-cash-close-service';

// Firebase config (you'll need to provide this)
const firebaseConfig = {
  // Your Firebase config here
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface MigrationStats {
  totalOldRecords: number;
  successfulMigrations: number;
  failedMigrations: number;
  skippedRecords: number;
  errors: string[];
}

class CashCloseMigration {
  private stats: MigrationStats = {
    totalOldRecords: 0,
    successfulMigrations: 0,
    failedMigrations: 0,
    skippedRecords: 0,
    errors: []
  };

  async runMigration(dryRun: boolean = true): Promise<MigrationStats> {
    console.log('🚀 Starting Cash Close Migration...');
    console.log(`📋 Mode: ${dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
    
    try {
      // Step 1: Migrate from old cashClose collection
      await this.migrateOldCashCloses(dryRun);
      
      // Step 2: Migrate from importedCashCloses collection
      await this.migrateImportedCashCloses(dryRun);
      
      // Step 3: Migrate from cashAllocations with cashCloseDetails
      await this.migrateCashAllocations(dryRun);
      
      console.log('✅ Migration completed successfully!');
      this.printStats();
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      this.stats.errors.push(`General error: ${error}`);
    }
    
    return this.stats;
  }

  private async migrateOldCashCloses(dryRun: boolean): Promise<void> {
    console.log('📦 Migrating old cashClose collection...');
    
    try {
      const oldCashClosesSnapshot = await getDocs(collection(db, 'cashClose'));
      const oldCashCloses = oldCashClosesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      this.stats.totalOldRecords += oldCashCloses.length;
      console.log(`📊 Found ${oldCashCloses.length} old cash close records`);

      for (const oldRecord of oldCashCloses) {
        try {
          if (dryRun) {
            console.log(`🔍 [DRY RUN] Would migrate: ${oldRecord.id}`);
            this.stats.successfulMigrations++;
          } else {
            await comprehensiveCashCloseService.migrateFromOldCashClose(oldRecord);
            console.log(`✅ Migrated: ${oldRecord.id}`);
            this.stats.successfulMigrations++;
          }
        } catch (error) {
          console.error(`❌ Failed to migrate ${oldRecord.id}:`, error);
          this.stats.failedMigrations++;
          this.stats.errors.push(`Old cash close ${oldRecord.id}: ${error}`);
        }
      }
    } catch (error) {
      console.error('❌ Error accessing old cashClose collection:', error);
      this.stats.errors.push(`Old cashClose collection error: ${error}`);
    }
  }

  private async migrateImportedCashCloses(dryRun: boolean): Promise<void> {
    console.log('📦 Migrating importedCashCloses collection...');
    
    try {
      const importedSnapshot = await getDocs(collection(db, 'importedCashCloses'));
      const importedRecords = importedSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      this.stats.totalOldRecords += importedRecords.length;
      console.log(`📊 Found ${importedRecords.length} imported cash close records`);

      // Group by date and branch to create comprehensive records
      const groupedRecords = this.groupImportedRecords(importedRecords);

      for (const [key, records] of Object.entries(groupedRecords)) {
        try {
          if (dryRun) {
            console.log(`🔍 [DRY RUN] Would migrate grouped record: ${key}`);
            this.stats.successfulMigrations++;
          } else {
            await this.createComprehensiveFromImported(records);
            console.log(`✅ Migrated grouped record: ${key}`);
            this.stats.successfulMigrations++;
          }
        } catch (error) {
          console.error(`❌ Failed to migrate grouped record ${key}:`, error);
          this.stats.failedMigrations++;
          this.stats.errors.push(`Imported group ${key}: ${error}`);
        }
      }
    } catch (error) {
      console.error('❌ Error accessing importedCashCloses collection:', error);
      this.stats.errors.push(`ImportedCashCloses collection error: ${error}`);
    }
  }

  private async migrateCashAllocations(dryRun: boolean): Promise<void> {
    console.log('📦 Migrating cashAllocations with cashCloseDetails...');
    
    try {
      const allocationsSnapshot = await getDocs(collection(db, 'cashAllocations'));
      const allocationsWithCashClose = allocationsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(allocation => allocation.cashCloseDetails);

      this.stats.totalOldRecords += allocationsWithCashClose.length;
      console.log(`📊 Found ${allocationsWithCashClose.length} cash allocations with cash close details`);

      for (const allocation of allocationsWithCashClose) {
        try {
          if (dryRun) {
            console.log(`🔍 [DRY RUN] Would migrate allocation: ${allocation.id}`);
            this.stats.successfulMigrations++;
          } else {
            await this.createComprehensiveFromAllocation(allocation);
            console.log(`✅ Migrated allocation: ${allocation.id}`);
            this.stats.successfulMigrations++;
          }
        } catch (error) {
          console.error(`❌ Failed to migrate allocation ${allocation.id}:`, error);
          this.stats.failedMigrations++;
          this.stats.errors.push(`Allocation ${allocation.id}: ${error}`);
        }
      }
    } catch (error) {
      console.error('❌ Error accessing cashAllocations collection:', error);
      this.stats.errors.push(`CashAllocations collection error: ${error}`);
    }
  }

  private groupImportedRecords(records: any[]): { [key: string]: any[] } {
    const grouped: { [key: string]: any[] } = {};
    
    for (const record of records) {
      const key = `${record.date?.toDateString() || 'unknown'}_${record.branch || 'unknown'}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(record);
    }
    
    return grouped;
  }

  private async createComprehensiveFromImported(records: any[]): Promise<void> {
    // Convert imported records to comprehensive cash close format
    const firstRecord = records[0];
    
    const newCashClose: Omit<ComprehensiveCashClose, 'id' | 'createdAt' | 'updatedAt'> = {
      createdBy: firstRecord.importedBy || 'migration-script',
      branchId: firstRecord.branch || 'imported-branch',
      cashCloseDate: firstRecord.date || new Date(),
      profitPercentage: 12,
      taxRate: 18,
      notes: `Migrated from imported CSV data. Original import session: ${firstRecord.importSessionId}`,
      
      shifts: this.createShiftsFromImported(records),
      
      // Calculate totals from records
      totalRevenue: records.reduce((sum, r) => sum + (r.totalSales || 0), 0),
      totalCashInTill: records.reduce((sum, r) => sum + (r.totalSales || 0), 0),
      totalNetworkPayments: records.reduce((sum, r) => sum + (r.mobileMoneyAmount || 0) + (r.cardAmount || 0), 0),
      totalExpectedCash: records.reduce((sum, r) => sum + (r.cashAmount || 0), 0),
      totalActualCash: records.reduce((sum, r) => sum + (r.cashAmount || 0), 0),
      totalTillUsed: 0,
      totalExpenses: 0,
      totalShortage: 0,
      totalExcess: 0,
      totalNetworkShortage: 0,
      totalNetworkExcess: 0,
      
      // Financial calculations
      taxAmount: records.reduce((sum, r) => sum + (r.totalSales || 0), 0) * 0.18,
      afterTaxAmount: records.reduce((sum, r) => sum + (r.totalSales || 0), 0) * 0.82,
      profitAmount: records.reduce((sum, r) => sum + (r.totalSales || 0), 0) * 0.82 * 0.12,
      remainingAmount: records.reduce((sum, r) => sum + (r.totalSales || 0), 0) * 0.82 * 0.88,
      specialFunds: records.reduce((sum, r) => sum + (r.totalSales || 0), 0) * 0.82 * 0.88 * 0.3,
      purchasingManager: records.reduce((sum, r) => sum + (r.totalSales || 0), 0) * 0.82 * 0.88 * 0.7,
      
      status: 'approved'
    };

    await comprehensiveCashCloseService.create(newCashClose);
  }

  private createShiftsFromImported(records: any[]): any[] {
    // Group by shift
    const dayRecords = records.filter(r => r.shift === 'day');
    const nightRecords = records.filter(r => r.shift === 'night');
    
    const shifts = [];
    
    if (dayRecords.length > 0) {
      shifts.push(this.createShiftFromRecords('day', dayRecords));
    }
    
    if (nightRecords.length > 0) {
      shifts.push(this.createShiftFromRecords('night', nightRecords));
    }
    
    return shifts;
  }

  private createShiftFromRecords(shift: 'day' | 'night', records: any[]): any {
    return {
      shift,
      tills: records.map((record, index) => ({
        tillNumber: (index % 2) + 1,
        totalCashInTill: record.totalSales || 0,
        cashAmount: record.cashAmount || 0,
        cashAtHand: record.cashAmount || 0,
        expectedNetworkMoney: (record.mobileMoneyAmount || 0) + (record.cardAmount || 0),
        actualNetworkMoney: (record.mobileMoneyAmount || 0) + (record.cardAmount || 0),
        tillUsed: 0,
        expenses: 0,
        networkPayments: [],
        totalNetworkPayments: (record.mobileMoneyAmount || 0) + (record.cardAmount || 0),
        expectedCashAtHand: record.cashAmount || 0,
        cashShortage: 0,
        cashExcess: 0,
        networkShortage: 0,
        networkExcess: 0
      })),
      shiftTotalRevenue: records.reduce((sum, r) => sum + (r.totalSales || 0), 0),
      shiftTotalCash: records.reduce((sum, r) => sum + (r.cashAmount || 0), 0),
      shiftTotalNetwork: records.reduce((sum, r) => sum + (r.mobileMoneyAmount || 0) + (r.cardAmount || 0), 0)
    };
  }

  private async createComprehensiveFromAllocation(allocation: any): Promise<void> {
    const cashCloseDetails = allocation.cashCloseDetails;
    
    const newCashClose: Omit<ComprehensiveCashClose, 'id' | 'createdAt' | 'updatedAt'> = {
      createdBy: allocation.employeeId || 'migration-script',
      branchId: allocation.branchId || 'allocation-branch',
      cashCloseDate: allocation.allocationDate || new Date(),
      profitPercentage: cashCloseDetails.profitPercentage || 12,
      taxRate: cashCloseDetails.taxRate || 18,
      notes: `Migrated from cash allocation: ${allocation.id}. ${allocation.notes || ''}`,
      
      shifts: cashCloseDetails.shifts || [],
      
      // Use existing totals from cash close details
      totalRevenue: cashCloseDetails.totals?.totalRevenue || 0,
      totalCashInTill: cashCloseDetails.totals?.totalCashInTill || 0,
      totalNetworkPayments: cashCloseDetails.totals?.totalNetworkPayments || 0,
      totalExpectedCash: cashCloseDetails.totals?.totalExpectedCash || 0,
      totalActualCash: cashCloseDetails.totals?.totalActualCash || 0,
      totalTillUsed: cashCloseDetails.totals?.totalTillUsed || 0,
      totalExpenses: cashCloseDetails.totals?.totalExpenses || 0,
      totalShortage: cashCloseDetails.totals?.totalShortage || 0,
      totalExcess: cashCloseDetails.totals?.totalExcess || 0,
      totalNetworkShortage: 0, // New field, default to 0
      totalNetworkExcess: 0,    // New field, default to 0
      
      // Financial calculations
      taxAmount: cashCloseDetails.totals?.taxAmount || 0,
      afterTaxAmount: cashCloseDetails.totals?.afterTaxAmount || 0,
      profitAmount: cashCloseDetails.totals?.profitAmount || 0,
      remainingAmount: cashCloseDetails.totals?.remainingAmount || 0,
      specialFunds: cashCloseDetails.totals?.specialFunds || 0,
      purchasingManager: cashCloseDetails.totals?.purchasingManager || 0,
      
      status: 'approved'
    };

    await comprehensiveCashCloseService.create(newCashClose);
  }

  private printStats(): void {
    console.log('\n📊 Migration Statistics:');
    console.log('========================');
    console.log(`📋 Total Old Records: ${this.stats.totalOldRecords}`);
    console.log(`✅ Successful Migrations: ${this.stats.successfulMigrations}`);
    console.log(`❌ Failed Migrations: ${this.stats.failedMigrations}`);
    console.log(`⏭️  Skipped Records: ${this.stats.skippedRecords}`);
    console.log(`🎯 Success Rate: ${((this.stats.successfulMigrations / this.stats.totalOldRecords) * 100).toFixed(2)}%`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ Errors Encountered:');
      this.stats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--live');
  
  if (!dryRun) {
    console.log('⚠️  WARNING: This will perform a LIVE migration!');
    console.log('⚠️  Make sure you have backed up your data first!');
    // Add confirmation prompt here if needed
  }
  
  const migration = new CashCloseMigration();
  const stats = await migration.runMigration(dryRun);
  
  if (dryRun) {
    console.log('\n💡 To run live migration, use: npm run migrate-cash-close -- --live');
  }
  
  process.exit(stats.failedMigrations > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { CashCloseMigration };
