import { CashCloseService } from '../lib/firebase/firestore-service';
import { authService } from '../lib/firebase/auth';
import { Timestamp } from 'firebase/firestore';

// Sample cash close data
export async function createSampleCashClose() {
  try {
    console.log('🔄 Creating sample cash close data...');
    
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('No authenticated user found');
    }

    const cashCloseService = new CashCloseService();
    
    const sampleCashClose = {
      createdBy: currentUser.uid,
      branchId: 'sample-branch-001',
      cashCloseDate: Timestamp.now(),
      profitPercentage: 12,
      taxRate: 18,
      notes: 'Sample cash close for testing',
      
      // Sample shift data with network payments
      shifts: [
        {
          shift: 'day' as const,
          tills: [
            {
              tillNumber: 1,
              tillName: 'Day Till 1',
              cashAmount: 500000,
              tillUsed: 50000,
              expenses: 25000,
              expenseDetails: [],
              cashAtHand: 425000,
              totalCashInTill: 650000, // Cash + Network money
              expectedNetworkMoney: 150000,
              actualNetworkMoney: 150000,
              networkPayments: [
                {
                  id: 'payment1',
                  paymentMethod: 'mobile' as const,
                  serviceProvider: 'Airtel Money',
                  amount: 75000
                },
                {
                  id: 'payment2',
                  paymentMethod: 'visa_machine' as const,
                  serviceProvider: 'Stanbic Bank',
                  amount: 75000
                }
              ]
            }
          ]
        }
      ],
      
      // Calculated totals
      totalRevenue: 650000,
      totalCashInTill: 650000,
      totalNetworkPayments: 150000,
      totalExpectedCash: 425000,
      totalActualCash: 425000,
      totalTillUsed: 50000,
      totalExpenses: 25000,
      
      // Variances
      totalShortage: 0,
      totalExcess: 0,
      totalNetworkShortage: 0,
      totalNetworkExcess: 0,
      
      // Financial calculations
      taxAmount: 117000, // 18% of 650000
      afterTaxAmount: 533000,
      profitAmount: 63960, // 12% of after-tax
      remainingAmount: 469040,
      specialFunds: 140712, // 30% of remaining
      purchasingManager: 328328, // 70% of remaining
      
      status: 'completed' as const
    };

    const docId = await cashCloseService.createCashClose(sampleCashClose);
    console.log('✅ Sample cash close created with ID:', docId);
    
    return docId;
    
  } catch (error) {
    console.error('❌ Error creating sample cash close:', error);
    throw error;
  }
}

// Run this function to create sample data
if (typeof window !== 'undefined') {
  (window as any).createSampleCashClose = createSampleCashClose;
}


