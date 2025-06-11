import { enhancedSupplierService } from './enhanced-supplier';

// Function to create sample suppliers
export async function seedSuppliers() {
  try {
    console.log('Starting to seed suppliers...');
    
    const createdIds = await enhancedSupplierService.createSampleSuppliers();
    
    console.log(`Successfully created ${createdIds.length} suppliers:`);
    createdIds.forEach((id, index) => {
      console.log(`${index + 1}. Supplier ID: ${id}`);
    });
    
    return createdIds;
  } catch (error) {
    console.error('Error seeding suppliers:', error);
    throw error;
  }
}

// Function to check if suppliers already exist
export async function checkExistingSuppliers() {
  try {
    const suppliers = await enhancedSupplierService.getAll();
    console.log(`Found ${suppliers.length} existing suppliers`);
    return suppliers;
  } catch (error) {
    console.error('Error checking existing suppliers:', error);
    throw error;
  }
}

// Main seeding function
export async function initializeSuppliers() {
  try {
    // Check if suppliers already exist
    const existingSuppliers = await checkExistingSuppliers();
    
    if (existingSuppliers.length > 0) {
      console.log('Suppliers already exist. Skipping seeding.');
      return existingSuppliers.map(s => s.id);
    }
    
    // Create sample suppliers if none exist
    console.log('No suppliers found. Creating sample data...');
    return await seedSuppliers();
    
  } catch (error) {
    console.error('Error initializing suppliers:', error);
    throw error;
  }
} 