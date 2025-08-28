// Seed script to populate expense types collection
import { ExpenseTypesService, sampleExpenseTypes } from './expense-types';
import { authService } from './auth';

export class ExpenseTypeSeeder {
  private expenseTypesService: ExpenseTypesService;

  constructor() {
    this.expenseTypesService = new ExpenseTypesService();
  }

  async seedExpenseTypes(): Promise<void> {
    try {
      console.log('🌱 Starting expense types seeding...');
      
      // Check if expense types already exist
      const existingTypes = await this.expenseTypesService.getActiveExpenseTypes();
      
      if (existingTypes.length > 0) {
        console.log(`📋 Found ${existingTypes.length} existing expense types. Skipping seed.`);
        return;
      }

      // Get current user for attribution
      const currentUser = authService.getCurrentUser();
      const userId = currentUser?.uid || 'system';

      console.log(`👤 Seeding as user: ${userId}`);

      // Create expense types
      let createdCount = 0;
      for (const expenseType of sampleExpenseTypes) {
        try {
          const typeWithUser = {
            ...expenseType,
            createdBy: userId,
            lastModifiedBy: userId
          };
          
          const id = await this.expenseTypesService.createExpenseType(typeWithUser);
          console.log(`✅ Created expense type: ${expenseType.name} (${id})`);
          createdCount++;
        } catch (error) {
          console.error(`❌ Failed to create expense type: ${expenseType.name}`, error);
        }
      }

      console.log(`🎉 Successfully created ${createdCount} expense types!`);
      
      // Display summary
      const summary = await this.getExpenseTypesSummary();
      console.log('\n📊 EXPENSE TYPES SUMMARY:');
      console.log(`Total Active Types: ${summary.totalActive}`);
      console.log(`Categories: ${summary.categories.join(', ')}`);
      console.log(`Departments Covered: ${summary.departments.join(', ')}`);

    } catch (error) {
      console.error('❌ Error seeding expense types:', error);
      throw error;
    }
  }

  async getExpenseTypesSummary() {
    const types = await this.expenseTypesService.getActiveExpenseTypes();
    
    const categories = Array.from(new Set(types.map(t => t.category)));
    const departments = Array.from(new Set(
      types.flatMap(t => t.allowedDepartments)
    ));

    return {
      totalActive: types.length,
      categories,
      departments,
      types: types.map(t => ({
        name: t.name,
        category: t.category,
        priority: t.priority,
        requiresApproval: t.requiresApproval
      }))
    };
  }

  async clearExpenseTypes(): Promise<void> {
    console.log('🗑️ Clearing all expense types...');
    
    try {
      const allTypes = await this.expenseTypesService.getAll();
      
      for (const type of allTypes) {
        await this.expenseTypesService.delete(type.id);
        console.log(`🗑️ Deleted: ${type.name}`);
      }
      
      console.log(`✅ Cleared ${allTypes.length} expense types`);
    } catch (error) {
      console.error('❌ Error clearing expense types:', error);
      throw error;
    }
  }

  async resetAndSeed(): Promise<void> {
    console.log('🔄 Resetting and seeding expense types...');
    await this.clearExpenseTypes();
    await this.seedExpenseTypes();
  }
}

// Helper function to run seeding
export const runExpenseTypesSeeding = async () => {
  const seeder = new ExpenseTypeSeeder();
  await seeder.seedExpenseTypes();
};

// Helper function to get expense types summary
export const getExpenseTypesSummary = async () => {
  const seeder = new ExpenseTypeSeeder();
  return await seeder.getExpenseTypesSummary();
};












