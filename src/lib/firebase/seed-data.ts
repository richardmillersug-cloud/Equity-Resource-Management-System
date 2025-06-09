import { firestoreServices } from './firestore-service';
import { Branch } from './models';

export const sampleBranches: Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    branchName: 'Kyengera Branch',
    address: 'Kyengera Town',
    phoneNumber: '+256 700 123 450',
    email: 'kyengera@retailsystem.com'
  },
  {
    branchName: 'Main Branch',
    address: 'Kampala Central',
    phoneNumber: '+256 700 123 456',
    email: 'main@retailsystem.com'
  },
  {
    branchName: 'Ntinda Branch',
    address: 'Ntinda Shopping Center',
    phoneNumber: '+256 700 123 457',
    email: 'ntinda@retailsystem.com'
  },
  {
    branchName: 'Entebbe Branch',
    address: 'Entebbe Road',
    phoneNumber: '+256 700 123 458',
    email: 'entebbe@retailsystem.com'
  },
  {
    branchName: 'Jinja Branch',
    address: 'Jinja Main Street',
    phoneNumber: '+256 700 123 459',
    email: 'jinja@retailsystem.com'
  }
];

export async function seedBranches() {
  try {
    console.log('Seeding branches...');
    
    // Check if branches already exist
    const existingBranches = await firestoreServices.branch.getAll();
    if (existingBranches.length > 0) {
      console.log('Branches already exist, skipping seed');
      return existingBranches;
    }

    // Create sample branches
    const createdBranches = [];
    for (const branchData of sampleBranches) {
      const branchId = await firestoreServices.branch.create(branchData);
      const branch = await firestoreServices.branch.getById(branchId);
      if (branch) {
        createdBranches.push(branch);
        console.log(`Created branch: ${branch.branchName}`);
      }
    }

    console.log('Branches seeded successfully');
    return createdBranches;
  } catch (error) {
    console.error('Error seeding branches:', error);
    throw error;
  }
}

// Function to seed all initial data
export async function seedInitialData() {
  try {
    console.log('Starting initial data seeding...');
    
    const branches = await seedBranches();
    
    console.log('Initial data seeding completed');
    return { branches };
  } catch (error) {
    console.error('Error seeding initial data:', error);
    throw error;
  }
} 