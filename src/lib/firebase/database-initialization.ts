import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { fundingSourceService } from './funding-source-service';

// =====================================================
// DATABASE INITIALIZATION SERVICE
// =====================================================

export class DatabaseInitialization {

  /**
   * Initialize all collections with dummy data for testing
   */
  static async initializeAllCollections(): Promise<void> {
    console.log('🚀 Starting database initialization...');
    
    try {
      // Purchasing Manager Collections
      await this.initializeCashCloseCollection();
      await this.initializeSuppliersCollection();
      await this.initializeExpensesCollection();
      await this.initializePurchaseOrdersCollection();
      await this.initializePaymentsCollection();
      await this.initializeChequeTrackerCollection();
      await this.initializeInstallmentPlansCollection();
      await this.initializeExpenseRequestsCollection();
      await this.initializeFundAcknowledgmentsCollection();
      await this.initializeCashAllocationsCollection();
      await this.initializeSpecialFundsTrackerCollection();

      // Receiver Collections
      await this.initializeDeliveriesCollection();
      await this.initializeReturnNotesCollection();
      await this.initializeDamagesCollection();
      await this.initializeRestockItemsCollection();

      // HR Collections
      await this.initializeAttendanceCollection();
      await this.initializeLeaveRequestsCollection();
      await this.initializePayrollCollection();
      await this.initializeBarcodesCollection();

      // Shared Collections
      await this.initializeInvoicesCollection();
      await this.initializeEmployeesCollection();
      await this.initializeBranchesCollection();
      await this.initializeNotificationsCollection();
      await this.initializeAuditLogsCollection();
      await this.initializeUserSessionsCollection();
      await this.initializeUsersCollection();

      // Financial Collections
      await this.initializeFundBalancesCollection();

      console.log('✅ All collections initialized successfully!');
    } catch (error) {
      console.error('❌ Error initializing collections:', error);
      
      // If there's an installment plans error, try to fix it
      if (error instanceof Error && error.message.includes('installmentPlans')) {
        console.log('🔧 Attempting to fix installment plans data...');
        await this.fixInstallmentPlansData();
      } else {
        throw error;
      }
    }
  }

  // =====================================================
  // PURCHASING MANAGER COLLECTIONS
  // =====================================================

  static async initializeCashCloseCollection(): Promise<void> {
    const collectionRef = collection(db, 'cashClose');
    
    // Check if collection already has data
    const snapshot = await getDocs(collectionRef);
    if (snapshot.size > 0) {
      console.log('⏭️  cashClose collection already has data, skipping...');
      return;
    }

    const cashCloseData = [
      {
        employeeId: 'emp_001',
        branchId: 'branch_kampala',
        shift: 'day',
        closeCash: 2500000,
        actualAmount: 2485000,
        expectedAmount: 2500000,
        cashPresent: 1200000,
        airtel: 450000,
        mtn: 380000,
        stanbicBank: 255000,
        equityBank: 200000,
        absaBank: 0,
        pesaPal: 0,
        shortage: 15000,
        excess: 0,
        date: serverTimestamp(),
        time: '18:00',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        employeeId: 'emp_002',
        branchId: 'branch_kampala',
        shift: 'night',
        closeCash: 1800000,
        actualAmount: 1820000,
        expectedAmount: 1800000,
        cashPresent: 900000,
        airtel: 320000,
        mtn: 280000,
        stanbicBank: 200000,
        equityBank: 120000,
        absaBank: 0,
        pesaPal: 0,
        shortage: 0,
        excess: 20000,
        date: serverTimestamp(),
        time: '06:00',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        employeeId: 'emp_003',
        branchId: 'branch_kampala',
        shift: 'day',
        closeCash: 2750000,
        actualAmount: 2730000,
        expectedAmount: 2750000,
        cashPresent: 1350000,
        airtel: 520000,
        mtn: 410000,
        stanbicBank: 280000,
        equityBank: 170000,
        absaBank: 0,
        pesaPal: 0,
        shortage: 20000,
        excess: 0,
        date: Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)), // Yesterday
        time: '18:30',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        employeeId: 'emp_004',
        branchId: 'branch_kampala',
        shift: 'night',
        closeCash: 1950000,
        actualAmount: 1965000,
        expectedAmount: 1950000,
        cashPresent: 980000,
        airtel: 380000,
        mtn: 320000,
        stanbicBank: 185000,
        equityBank: 100000,
        absaBank: 0,
        pesaPal: 0,
        shortage: 0,
        excess: 15000,
        date: Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)), // Yesterday
        time: '06:15',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        employeeId: 'emp_001',
        branchId: 'branch_kampala',
        shift: 'day',
        closeCash: 2300000,
        actualAmount: 2285000,
        expectedAmount: 2300000,
        cashPresent: 1100000,
        airtel: 420000,
        mtn: 365000,
        stanbicBank: 240000,
        equityBank: 160000,
        absaBank: 0,
        pesaPal: 0,
        shortage: 15000,
        excess: 0,
        date: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)), // 2 days ago
        time: '18:00',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        employeeId: 'emp_002',
        branchId: 'branch_kampala',
        shift: 'night',
        closeCash: 2100000,
        actualAmount: 2120000,
        expectedAmount: 2100000,
        cashPresent: 1050000,
        airtel: 400000,
        mtn: 350000,
        stanbicBank: 220000,
        equityBank: 100000,
        absaBank: 0,
        pesaPal: 0,
        shortage: 0,
        excess: 20000,
        date: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)), // 2 days ago
        time: '06:30',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];

    for (const data of cashCloseData) {
      await addDoc(collectionRef, data);
    }
    console.log('✅ cashClose collection initialized with 6 records');
  }

  static async initializeSuppliersCollection(): Promise<void> {
    const collectionRef = collection(db, 'suppliers');
    
    const snapshot = await getDocs(collectionRef);
    if (snapshot.size > 0) {
      console.log('⏭️  suppliers collection already has data, skipping...');
      return;
    }

    const suppliersData = [
      {
        name: 'Kampala Fresh Foods Ltd',
        contactPerson: 'John Mukasa',
        email: 'orders@kampalafresh.co.ug',
        phone: '+256712345678',
        address: 'Plot 15, Industrial Area, Kampala',
        paymentTerms: '30 days net',
        creditLimit: 5000000,
        currentBalance: 2300000,
        totalPaid: 10200000,
        totalOutstanding: 2300000,
        status: 'active',
        rating: 4,
        category: 'Food & Beverages',
        description: 'Leading supplier of fresh fruits and vegetables in Kampala',
        lastPaymentDate: new Date('2024-01-10'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Uganda Dairy Cooperative',
        contactPerson: 'Mary Nakato',
        email: 'supply@ugandadairy.org',
        phone: '+256701987654',
        address: 'Mbarara Road, Masaka District',
        paymentTerms: '21 days net',
        creditLimit: 3000000,
        currentBalance: 850000,
        totalPaid: 6950000,
        totalOutstanding: 850000,
        status: 'active',
        rating: 5,
        category: 'Dairy Products',
        description: 'Cooperative providing high-quality dairy products across Uganda',
        lastPaymentDate: new Date('2024-01-12'),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const data of suppliersData) {
      await addDoc(collectionRef, data);
    }
    console.log('✅ suppliers collection initialized with 2 records');
  }

  static async initializeExpensesCollection(): Promise<void> {
    const collectionRef = collection(db, 'expenses');
    
    const snapshot = await getDocs(collectionRef);
    if (snapshot.size > 0) {
      console.log('⏭️  expenses collection already has data, skipping...');
      return;
    }

    const expensesData = [
      {
        employeeId: 'emp_003',
        name: 'Office Supplies Purchase',
        amount: 250000,
        type: 'GENERAL',
        status: 'pending',
        date: serverTimestamp(),
        note: 'Monthly office supplies including stationery and cleaning materials',
        paidAmount: 0,
        submittedBy: 'emp_003',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        employeeId: 'emp_004',
        name: 'VAT Payment',
        amount: 1200000,
        type: 'URA',
        status: 'approved',
        date: serverTimestamp(),
        note: 'Monthly VAT payment to URA',
        paidAmount: 1200000,
        submittedBy: 'emp_004',
        approvedBy: 'pm_001',
        approvedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];

    for (const data of expensesData) {
      await addDoc(collectionRef, data);
    }
    console.log('✅ expenses collection initialized with 2 records');
  }

  static async initializePurchaseOrdersCollection(): Promise<void> {
    const collectionRef = collection(db, 'purchaseOrders');
    
    const snapshot = await getDocs(collectionRef);
    if (snapshot.size > 0) {
      console.log('⏭️  purchaseOrders collection already has data, skipping...');
      return;
    }

    const purchaseOrdersData = [
      {
        supplierId: 'supplier_001',
        supplierName: 'Kampala Fresh Foods Ltd',
        orderNumber: 'PO-2024-001',
        items: [
          { name: 'Fresh Tomatoes', quantity: 50, unitPrice: 3000, totalPrice: 150000 },
          { name: 'Onions', quantity: 30, unitPrice: 2500, totalPrice: 75000 }
        ],
        totalAmount: 225000,
        expectedDeliveryDate: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        notes: 'Urgent order for weekend sales',
        priority: 'high',
        status: 'pending',
        purchasingManagerId: 'pm_001',
        orderDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        supplierId: 'supplier_002',
        supplierName: 'Uganda Dairy Cooperative',
        orderNumber: 'PO-2024-002',
        items: [
          { name: 'Fresh Milk (1L)', quantity: 100, unitPrice: 3500, totalPrice: 350000 },
          { name: 'Yogurt (500ml)', quantity: 50, unitPrice: 4000, totalPrice: 200000 }
        ],
        totalAmount: 550000,
        expectedDeliveryDate: Timestamp.fromDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
        notes: 'Weekly dairy supply order',
        priority: 'medium',
        status: 'approved',
        purchasingManagerId: 'pm_001',
        orderDate: serverTimestamp(),
        approvedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];

    for (const data of purchaseOrdersData) {
      await addDoc(collectionRef, data);
    }
    console.log('✅ purchaseOrders collection initialized with 2 records');
  }

  static async initializePaymentsCollection(): Promise<void> {
    const collectionRef = collection(db, 'payments');
    
    const snapshot = await getDocs(collectionRef);
    if (snapshot.size > 0) {
      console.log('⏭️  payments collection already has data, skipping...');
      return;
    }

    const now = new Date();
    const today = new Date(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 5);
    const lastMonth = new Date(now);
    lastMonth.setDate(lastMonth.getDate() - 20);
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const paymentsData = [
      {
        reference: 'PAY-2024-001',
        supplierName: 'Kampala Fresh Foods Ltd',
        amount: 875000,
        method: 'Bank Transfer',
        type: 'outgoing',
        status: 'completed',
        description: 'Payment for fresh vegetables and fruits supply',
        processedBy: 'pm_001',
        processedAt: serverTimestamp(),
        paymentDate: today,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        reference: 'PAY-2024-002',
        supplierName: 'Uganda Dairy Cooperative',
        amount: 450000,
        method: 'Mobile Money',
        type: 'outgoing',
        status: 'completed',
        description: 'Mobile money payment for dairy products',
        processedBy: 'pm_001',
        processedAt: serverTimestamp(),
        paymentDate: yesterday,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        reference: 'PAY-2024-003',
        supplierName: 'East Africa Beverages Ltd',
        amount: 1200000,
        method: 'Cheque',
        type: 'outgoing',
        status: 'pending',
        description: 'Payment for beverage supplies - awaiting approval',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        reference: 'PAY-2024-004',
        supplierName: 'Mukwano Industries',
        amount: 650000,
        method: 'Bank Transfer',
        type: 'outgoing',
        status: 'completed',
        description: 'Payment for cooking oil and soap supplies',
        processedBy: 'pm_001',
        processedAt: serverTimestamp(),
        paymentDate: lastWeek,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        reference: 'REC-2024-001',
        supplierName: 'Customer Returns',
        amount: 85000,
        method: 'Cash',
        type: 'incoming',
        status: 'completed',
        description: 'Refund received from customer return',
        processedBy: 'pm_001',
        processedAt: serverTimestamp(),
        paymentDate: lastMonth,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        reference: 'PAY-2024-005',
        supplierName: 'Nile Breweries Ltd',
        amount: 2300000,
        method: 'Bank Transfer',
        type: 'outgoing',
        status: 'failed',
        description: 'Payment failed due to insufficient funds',
        cancelledBy: 'pm_001',
        cancelledAt: serverTimestamp(),
        cancellationReason: 'Insufficient account balance',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        reference: 'PAY-2024-006',
        supplierName: 'Kampala Fresh Foods Ltd',
        amount: 1250000,
        method: 'Bank Transfer',
        type: 'outgoing',
        status: 'completed',
        description: 'Weekly payment for fresh produce supply',
        processedBy: 'pm_001',
        processedAt: serverTimestamp(),
        paymentDate: lastWeek,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        reference: 'PAY-2024-007',
        supplierName: 'Uganda Dairy Cooperative',
        amount: 780000,
        method: 'Mobile Money',
        type: 'outgoing',
        status: 'completed',
        description: 'Monthly dairy products payment',
        processedBy: 'pm_001',
        processedAt: serverTimestamp(),
        paymentDate: twoMonthsAgo,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];

    for (const data of paymentsData) {
      await addDoc(collectionRef, data);
    }
    console.log('✅ payments collection initialized with 8 records');
  }

  static async initializeChequeTrackerCollection(): Promise<void> {
    const collectionRef = collection(db, 'chequeTracker');
    
    const snapshot = await getDocs(collectionRef);
    if (snapshot.size > 0) {
      console.log('⏭️  chequeTracker collection already has data, skipping...');
      return;
    }

    const chequeData = [
      {
        chequeNumber: 'CHQ001234',
        amount: 1200000,
        payeeName: 'Kampala Fresh Foods Ltd',
        bankName: 'Stanbic Bank Uganda',
        issuedDate: serverTimestamp(),
        dueDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        status: 'issued',
        purpose: 'Payment for vegetables supply',
        issuedBy: 'pm_001',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        chequeNumber: 'CHQ001235',
        amount: 750000,
        payeeName: 'Uganda Dairy Cooperative',
        bankName: 'Centenary Bank',
        issuedDate: serverTimestamp(),
        dueDate: Timestamp.fromDate(new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)),
        status: 'cleared',
        purpose: 'Payment for dairy products',
        issuedBy: 'pm_001',
        clearedDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];

    for (const data of chequeData) {
      await addDoc(collectionRef, data);
    }
    console.log('✅ chequeTracker collection initialized with 2 records');
  }

  /**
   * Clear problematic installment plans data
   */
  static async clearInstallmentPlansCollection(): Promise<void> {
    try {
      const collectionRef = collection(db, 'installmentPlans');
      const snapshot = await getDocs(collectionRef);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log('✅ installmentPlans collection cleared');
    } catch (error) {
      console.error('❌ Error clearing installmentPlans collection:', error);
    }
  }

  static async initializeInstallmentPlansCollection(): Promise<void> {
    const collectionRef = collection(db, 'installmentPlans');
    
    const snapshot = await getDocs(collectionRef);
    if (snapshot.size > 0) {
      console.log('⏭️  installmentPlans collection already has data, skipping...');
      return;
    }

    const installmentData = [
      {
        invoiceId: 'inv_003',
        totalAmount: 2500000,
        paidAmount: 1000000,
        remainingAmount: 1500000,
        numberOfInstallments: 3,
        installments: [
          {
            installmentNumber: 1,
            amount: 1000000,
            dueDate: Timestamp.fromDate(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)),
            status: 'paid',
            paidDate: Timestamp.fromDate(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000))
          },
          {
            installmentNumber: 2,
            amount: 750000,
            dueDate: Timestamp.fromDate(new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)),
            status: 'pending'
          },
          {
            installmentNumber: 3,
            amount: 750000,
            dueDate: Timestamp.fromDate(new Date(Date.now() + 50 * 24 * 60 * 60 * 1000)),
            status: 'pending'
          }
        ],
        createdBy: 'pm_001',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        invoiceId: 'inv_004',
        totalAmount: 1800000,
        paidAmount: 600000,
        remainingAmount: 1200000,
        numberOfInstallments: 2,
        installments: [
          {
            installmentNumber: 1,
            amount: 600000,
            dueDate: Timestamp.fromDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
            status: 'paid',
            paidDate: Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000))
          },
          {
            installmentNumber: 2,
            amount: 1200000,
            dueDate: Timestamp.fromDate(new Date(Date.now() + 25 * 24 * 60 * 60 * 1000)),
            status: 'pending'
          }
        ],
        createdBy: 'pm_001',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];

    for (const data of installmentData) {
      await addDoc(collectionRef, data);
    }
    console.log('✅ installmentPlans collection initialized with 2 records');
  }

  /**
   * Initialize Expense Requests Collection
   */
  static async initializeExpenseRequestsCollection(): Promise<void> {
    const collectionRef = collection(db, 'expenseRequests');
    const snapshot = await getDocs(collectionRef);
    
    if (snapshot.size > 0) {
      console.log('⏭️  expenseRequests collection already has data, skipping...');
      return;
    }

    const expenseRequests = [
      {
        id: 'exp-req-001',
        submittedBy: 'emp-001',
        submitterName: 'John Doe',
        requestType: 'GENERAL',
        amount: 150000,
        description: 'Office supplies and stationery',
        justification: 'Monthly office supplies replenishment for Kyengera branch',
        status: 'pending',
        priority: 'medium',
        requestDate: new Date('2024-01-15'),
        requiredBy: new Date('2024-01-20'),
        approvedBy: null,
        approvedAt: null,
        rejectedReason: null,
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'exp-req-002',
        submittedBy: 'emp-002',
        submitterName: 'Jane Smith',
        requestType: 'EMERGENCIES',
        amount: 500000,
        description: 'Emergency equipment repair',
        justification: 'Critical refrigeration unit repair to prevent stock spoilage',
        status: 'approved',
        priority: 'high',
        requestDate: new Date('2024-01-14'),
        requiredBy: new Date('2024-01-16'),
        approvedBy: 'pm-001',
        approvedAt: new Date('2024-01-15'),
        rejectedReason: null,
        attachments: ['repair-quote.pdf'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const request of expenseRequests) {
      await addDoc(collectionRef, request);
    }

    console.log('✅ expenseRequests collection initialized with 2 records');
  }

  /**
   * Initialize Fund Acknowledgments Collection
   */
  static async initializeFundAcknowledgmentsCollection(): Promise<void> {
    const collectionRef = collection(db, 'fundAcknowledgments');
    const snapshot = await getDocs(collectionRef);
    
    if (snapshot.size > 0) {
      console.log('⏭️  fundAcknowledgments collection already has data, skipping...');
      return;
    }

    const fundAcknowledgments = [
      {
        id: 'fund-ack-001',
        allocationId: 'cash-alloc-001',
        fundType: 'purchasing',
        amount: 2000000,
        acknowledgedBy: 'pm-001',
        acknowledgerName: 'Sarah Johnson',
        acknowledgedAt: new Date('2024-01-15'),
        purpose: 'Weekly supplier payments and inventory purchases',
        status: 'acknowledged',
        notes: 'Funds received and allocated for supplier payments',
        branchId: 'kyengera',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'fund-ack-002',
        allocationId: 'cash-alloc-002',
        fundType: 'operational',
        amount: 800000,
        acknowledgedBy: 'pm-002',
        acknowledgerName: 'Michael Brown',
        acknowledgedAt: new Date('2024-01-16'),
        purpose: 'Daily operational expenses and emergency fund',
        status: 'pending',
        notes: 'Awaiting acknowledgment from purchasing manager',
        branchId: 'kyengera',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const acknowledgment of fundAcknowledgments) {
      await addDoc(collectionRef, acknowledgment);
    }

    console.log('✅ fundAcknowledgments collection initialized with 2 records');
  }

  /**
   * Initialize Cash Allocations Collection
   */
  static async initializeCashAllocationsCollection(): Promise<void> {
    const collectionRef = collection(db, 'cashAllocations');
    const snapshot = await getDocs(collectionRef);
    
    if (snapshot.size > 0) {
      console.log('⏭️  cashAllocations collection already has data, skipping...');
      return;
    }

    const cashAllocations = [
      {
        id: 'cash-alloc-001',
        allocatedBy: 'acc-001',
        allocatorName: 'David Wilson',
        allocatedTo: 'pm-001',
        recipientName: 'Sarah Johnson',
        amount: 2000000,
        purpose: 'Weekly supplier payments',
        allocationDate: new Date('2024-01-15'),
        expectedUsage: 'Supplier payments and inventory purchases',
        status: 'allocated',
        branchId: 'kyengera',
        fundType: 'purchasing',
        priority: 'high',
        notes: 'Urgent allocation for pending supplier payments',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'cash-alloc-002',
        allocatedBy: 'acc-001',
        allocatorName: 'David Wilson',
        allocatedTo: 'pm-002',
        recipientName: 'Michael Brown',
        amount: 800000,
        purpose: 'Operational expenses',
        allocationDate: new Date('2024-01-16'),
        expectedUsage: 'Daily operational costs and emergency expenses',
        status: 'pending',
        branchId: 'kyengera',
        fundType: 'operational',
        priority: 'medium',
        notes: 'Regular operational fund allocation',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const allocation of cashAllocations) {
      await addDoc(collectionRef, allocation);
    }

    console.log('✅ cashAllocations collection initialized with 2 records');
  }

  /**
   * Initialize Special Funds Tracker Collection
   */
  static async initializeSpecialFundsTrackerCollection(): Promise<void> {
    const collectionRef = collection(db, 'specialFundsTracker');
    const snapshot = await getDocs(collectionRef);
    
    if (snapshot.size > 0) {
      console.log('⏭️  specialFundsTracker collection already has data, skipping...');
      return;
    }

    const specialFundsTrackers = [
      {
        id: 'special-fund-001',
        fundName: 'Emergency Reserve Fund',
        fundType: 'emergency',
        totalAmount: 5000000,
        allocatedAmount: 1500000,
        remainingAmount: 3500000,
        purpose: 'Emergency expenses and critical repairs',
        managedBy: 'acc-001',
        managerName: 'David Wilson',
        status: 'active',
        lastAllocation: new Date('2024-01-15'),
        nextReview: new Date('2024-02-15'),
        branchId: 'kyengera',
        restrictions: ['Emergency use only', 'Requires manager approval'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'special-fund-002',
        fundName: 'Equipment Maintenance Fund',
        fundType: 'maintenance',
        totalAmount: 3000000,
        allocatedAmount: 800000,
        remainingAmount: 2200000,
        purpose: 'Equipment maintenance and repairs',
        managedBy: 'acc-001',
        managerName: 'David Wilson',
        status: 'active',
        lastAllocation: new Date('2024-01-14'),
        nextReview: new Date('2024-03-01'),
        branchId: 'kyengera',
        restrictions: ['Equipment related only', 'Monthly review required'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const tracker of specialFundsTrackers) {
      await addDoc(collectionRef, tracker);
    }

    console.log('✅ specialFundsTracker collection initialized with 2 records');
  }

  // =====================================================
  // RECEIVER COLLECTIONS
  // =====================================================

  static async initializeDeliveriesCollection(): Promise<void> {
    const collectionRef = collection(db, 'deliveries');
    
    const snapshot = await getDocs(collectionRef);
    if (snapshot.size > 0) {
      console.log('⏭️  deliveries collection already has data, skipping...');
      return;
    }

    const deliveriesData = [
      {
        supplierId: 'supplier_001',
        supplierName: 'Kampala Fresh Foods Ltd',
        receiverId: 'rec_001',
        scheduledDate: Timestamp.fromDate(new Date()),
        scheduledTime: '10:00',
        actualArrivalTime: '10:15',
        status: 'completed',
        items: [
          { name: 'Fresh Tomatoes', quantity: 50, received: 48, discrepancy: 2 },
          { name: 'Onions', quantity: 30, received: 30, discrepancy: 0 }
        ],
        contactPerson: 'John Mukasa',
        phone: '+256712345678',
        notes: 'Delivery completed successfully, minor shortage in tomatoes',
        discrepancies: '2 tomatoes were damaged during transport',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        supplierId: 'supplier_002',
        supplierName: 'Uganda Dairy Cooperative',
        receiverId: 'rec_001',
        scheduledDate: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
        scheduledTime: '14:00',
        status: 'pending',
        items: [
          { name: 'Fresh Milk (1L)', quantity: 100, expected: 100 },
          { name: 'Yogurt (500ml)', quantity: 50, expected: 50 }
        ],
        contactPerson: 'Mary Nakato',
        phone: '+256701987654',
        notes: 'Scheduled for tomorrow afternoon delivery',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];

    for (const data of deliveriesData) {
      await addDoc(collectionRef, data);
    }
    console.log('✅ deliveries collection initialized with 2 records');
  }

  static async initializeReturnNotesCollection(): Promise<void> {
    const collectionRef = collection(db, 'returnNotes');
    
    const snapshot = await getDocs(collectionRef);
    if (snapshot.size > 0) {
      console.log('⏭️  returnNotes collection already has data, skipping...');
      return;
    }

    const returnNotesData = [
      {
        supplierId: 'supplier_001',
        supplierName: 'Kampala Fresh Foods Ltd',
        receiverId: 'rec_001',
        items: [
          { name: 'Damaged Tomatoes', quantity: 5, unitValue: 3000, totalValue: 15000, reason: 'Arrived damaged' }
        ],
        reason: 'damaged',
        totalValue: 15000,
        description: 'Tomatoes arrived with visible damage and spoilage',
        evidence: ['photo1.jpg', 'photo2.jpg'],
        status: 'pending',
        returnDate: serverTimestamp(),
        processedBy: 'rec_001',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        supplierId: 'supplier_002',
        supplierName: 'Uganda Dairy Cooperative',
        receiverId: 'rec_001',
        items: [
          { name: 'Expired Yogurt', quantity: 8, unitValue: 4000, totalValue: 32000, reason: 'Expired product' }
        ],
        reason: 'expired',
        totalValue: 32000,
        description: 'Yogurt products delivered past expiry date',
        status: 'approved',
        returnDate: serverTimestamp(),
        processedBy: 'rec_001',
        approvedBy: 'pm_001',
        approvedAt: serverTimestamp(),
        approvalNotes: 'Return approved, replacement scheduled',
        resolution: 'Supplier will provide replacement products',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];

    for (const data of returnNotesData) {
      await addDoc(collectionRef, data);
    }
    console.log('✅ returnNotes collection initialized with 2 records');
  }

  static async initializeDamagesCollection(): Promise<void> {
    const collectionRef = collection(db, 'damages');
    
    const snapshot = await getDocs(collectionRef);
    if (snapshot.size > 0) {
      console.log('⏭️  damages collection already has data, skipping...');
      return;
    }

    const damagesData = [
      {
        itemName: 'Refrigerated Display Unit',
        category: 'Equipment',
        damageType: 'Mechanical Failure',
        description: 'Compressor stopped working, unit not maintaining temperature',
        reportedBy: 'emp_005',
        reportedDate: serverTimestamp(),
        estimatedCost: 850000,
        actualCost: 920000,
        status: 'resolved',
        resolvedBy: 'maint_001',
        resolvedDate: serverTimestamp(),
        resolution: 'Compressor replaced, unit fully operational',
        location: 'Main Sales Floor',
        priority: 'high',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        itemName: 'Shopping Trolleys',
        category: 'Equipment',
        damageType: 'Physical Damage',
        description: '3 shopping trolleys with broken wheels and bent frames',
        reportedBy: 'emp_006',
        reportedDate: serverTimestamp(),
        estimatedCost: 180000,
        status: 'pending',
        location: 'Parking Area',
        priority: 'medium',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];

    for (const data of damagesData) {
      await addDoc(collectionRef, data);
    }
    console.log('✅ damages collection initialized with 2 records');
  }

  static async initializeRestockItemsCollection(): Promise<void> {
    const collectionRef = collection(db, 'restockItems');
    
    const snapshot = await getDocs(collectionRef);
    if (snapshot.size > 0) {
      console.log('⏭️  restockItems collection already has data, skipping...');
      return;
    }

    const restockData = [
      {
        itemName: 'Coca Cola 500ml',
        category: 'Beverages',
        currentStock: 15,
        minimumThreshold: 50,
        restockQuantity: 100,
        unitCost: 1800,
        totalCost: 180000,
        supplierId: 'supplier_003',
        supplierName: 'Coca Cola Beverages Uganda',
        priority: 'URGENT',
        status: 'pending',
        requestedBy: 'stock_001',
        requestedDate: serverTimestamp(),
        expectedDeliveryDate: Timestamp.fromDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)),
        notes: 'Stock critically low, urgent restock needed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        itemName: 'Rice 5kg bags',
        category: 'Staples',
        currentStock: 25,
        minimumThreshold: 20,
        restockQuantity: 80,
        unitCost: 18000,
        totalCost: 1440000,
        supplierId: 'supplier_004',
        supplierName: 'Uganda Rice Farmers Association',
        priority: 'NORMAL',
        status: 'approved',
        requestedBy: 'stock_001',
        requestedDate: serverTimestamp(),
        approvedBy: 'pm_001',
        approvedDate: serverTimestamp(),
        expectedDeliveryDate: Timestamp.fromDate(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)),
        notes: 'Regular monthly restock order',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];

    for (const data of restockData) {
      await addDoc(collectionRef, data);
    }
    console.log('✅ restockItems collection initialized with 2 records');
  }

  // =====================================================
  // SHARED COLLECTIONS
  // =====================================================

  static async initializeInvoicesCollection(): Promise<void> {
    const collectionRef = collection(db, 'invoices');
    
    const snapshot = await getDocs(collectionRef);
    if (snapshot.size > 0) {
      console.log('⏭️  invoices collection already has data, skipping...');
      return;
    }

    const invoicesData = [
      {
        receiverId: 'rec_001',
        supplierId: 'supplier_001',
        supplierName: 'Kampala Fresh Foods Ltd',
        invoiceNumber: 'INV-2024-001',
        amount: 875000,
        description: 'Weekly fresh vegetables supply',
        fdn: 'FDN001234567',
        quantity: 80,
        dueDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        status: 'approved',
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        approvedBy: 'pm_001',
        approvedAt: serverTimestamp(),
        items: [
          { description: 'Fresh Tomatoes', quantity: 50, unitPrice: 3000, totalPrice: 150000 },
          { description: 'Onions', quantity: 30, unitPrice: 2500, totalPrice: 75000 }
        ],
        paymentPlan: [
          { installmentNumber: 1, amount: 437500, dueDate: Timestamp.fromDate(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)) },
          { installmentNumber: 2, amount: 437500, dueDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) }
        ]
      },
      {
        receiverId: 'rec_001',
        supplierId: 'supplier_002',
        supplierName: 'Uganda Dairy Cooperative',
        invoiceNumber: 'INV-2024-002',
        amount: 550000,
        description: 'Dairy products monthly supply',
        fdn: 'FDN001234568',
        quantity: 150,
        dueDate: Timestamp.fromDate(new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)),
        status: 'pending',
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        items: [
          { description: 'Fresh Milk (1L)', quantity: 100, unitPrice: 3500, totalPrice: 350000 },
          { description: 'Yogurt (500ml)', quantity: 50, unitPrice: 4000, totalPrice: 200000 }
        ]
      }
    ];

    for (const data of invoicesData) {
      await addDoc(collectionRef, data);
    }
    console.log('✅ invoices collection initialized with 2 records');
  }

  static async initializeEmployeesCollection(): Promise<void> {
    const collectionRef = collection(db, 'employees');
    
    const snapshot = await getDocs(collectionRef);
    if (snapshot.size > 0) {
      console.log('⏭️  employees collection already has data, skipping...');
      return;
    }

    const employeesData = [
      {
        firstName: 'James',
        lastName: 'Mugisha',
        email: 'james.mugisha@equi.com',
        phoneNumber: '+256712345678',
        nationalId: 'CM90001234567P',
        position: 'Purchasing Manager',
        department: 'Procurement',
        branchId: 'branch_kampala',
        hireDate: Timestamp.fromDate(new Date('2023-01-15')),
        salary: 2500000,
        status: 'active',
        roles: [
          {
            jobRoleId: 'purchasing-manager',
            jobTitle: 'Purchasing Manager',
            permissions: ['MANAGE_SUPPLIERS', 'APPROVE_INVOICES', 'PROCESS_PAYMENTS']
          }
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        firstName: 'Sarah',
        lastName: 'Nakato',
        email: 'sarah.nakato@equi.com',
        phoneNumber: '+256701987654',
        nationalId: 'CM90001234568P',
        position: 'Receiver',
        department: 'Receiving',
        branchId: 'branch_kampala',
        hireDate: Timestamp.fromDate(new Date('2023-03-20')),
        salary: 1800000,
        status: 'active',
        roles: [
          {
            jobRoleId: 'receiver',
            jobTitle: 'Receiver',
            permissions: ['MANAGE_DELIVERIES', 'CREATE_INVOICES', 'PROCESS_RETURNS']
          }
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        firstName: 'Grace',
        lastName: 'Namukasa',
        email: 'grace.namukasa@equi.com',
        phoneNumber: '+256789123456',
        nationalId: 'CM90001234569P',
        position: 'HR Manager',
        department: 'Human Resources',
        branchId: 'branch_kampala',
        hireDate: Timestamp.fromDate(new Date('2023-02-10')),
        salary: 1300000,
        status: 'active',
        roles: [
          {
            jobRoleId: 'hr',
            jobTitle: 'HR',
            permissions: ['EMPLOYEE_MANAGEMENT', 'PAYROLL_MANAGEMENT', 'ATTENDANCE_TRACKING', 'LEAVE_APPROVAL']
          }
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];

    for (const data of employeesData) {
      await addDoc(collectionRef, data);
    }
    console.log('✅ employees collection initialized with 3 records');
  }

  // =====================================================
  // HR COLLECTIONS
  // =====================================================

  static async initializeAttendanceCollection(): Promise<void> {
    const collectionRef = collection(db, 'attendance');
    
    const snapshot = await getDocs(collectionRef);
    if (snapshot.size > 0) {
      console.log('⏭️  attendance collection already has data, skipping...');
      return;
    }

    const attendanceData = [
      {
        employeeId: 'emp_001',
        attendanceDate: Timestamp.fromDate(new Date()),
        checkInTime: Timestamp.fromDate(new Date(Date.now() - 8 * 60 * 60 * 1000)),
        checkOutTime: Timestamp.fromDate(new Date(Date.now() - 1 * 60 * 60 * 1000)),
        status: 'Present',
        hoursWorked: 8,
        overtimeHours: 0,
        barcodeScanned: 'BC001',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        employeeId: 'emp_002',
        attendanceDate: Timestamp.fromDate(new Date()),
        checkInTime: Timestamp.fromDate(new Date(Date.now() - 7 * 60 * 60 * 1000)),
        status: 'Present',
        hoursWorked: 0,
        overtimeHours: 0,
        barcodeScanned: 'BC002',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];

    for (const data of attendanceData) {
      await addDoc(collectionRef, data);
    }
    console.log('✅ attendance collection initialized with 2 records');
  }

  static async initializeLeaveRequestsCollection(): Promise<void> {
    const collectionRef = collection(db, 'leaveRequests');
    
    const snapshot = await getDocs(collectionRef);
    if (snapshot.size > 0) {
      console.log('⏭️  leaveRequests collection already has data, skipping...');
      return;
    }

    const leaveRequestsData = [
      {
        employeeId: 'emp_001',
        leaveType: 'Annual',
        startDate: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        endDate: Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
        daysRequested: 7,
        status: 'Pending',
        reason: 'Family vacation',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        employeeId: 'emp_002',
        leaveType: 'Sick',
        startDate: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
        endDate: Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
        daysRequested: 2,
        status: 'Approved',
        reason: 'Medical checkup',
        approvedBy: 'emp_hr_001',
        approvalDate: Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)),
        comments: 'Approved for medical reasons',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];

    for (const data of leaveRequestsData) {
      await addDoc(collectionRef, data);
    }
    console.log('✅ leaveRequests collection initialized with 2 records');
  }

  static async initializePayrollCollection(): Promise<void> {
    const collectionRef = collection(db, 'payroll');
    
    const snapshot = await getDocs(collectionRef);
    if (snapshot.size > 0) {
      console.log('⏭️  payroll collection already has data, skipping...');
      return;
    }

    const payrollData = [
      {
        employeeId: 'emp_001',
        payPeriodStart: Timestamp.fromDate(new Date(2024, 0, 1)),
        payPeriodEnd: Timestamp.fromDate(new Date(2024, 0, 31)),
        baseSalary: 2500000,
        grossSalary: 2500000,
        deductions: 625000, // 25% tax + NSSF
        netSalary: 1875000,
        paymentDate: Timestamp.fromDate(new Date(2024, 1, 1)),
        overtimePay: 0,
        processedBy: 'emp_hr_001',
        status: 'paid',
        createdAt: serverTimestamp()
      },
      {
        employeeId: 'emp_002',
        payPeriodStart: Timestamp.fromDate(new Date(2024, 0, 1)),
        payPeriodEnd: Timestamp.fromDate(new Date(2024, 0, 31)),
        baseSalary: 1800000,
        grossSalary: 1800000,
        deductions: 450000, // 25% tax + NSSF
        netSalary: 1350000,
        paymentDate: Timestamp.fromDate(new Date(2024, 1, 1)),
        overtimePay: 0,
        processedBy: 'emp_hr_001',
        status: 'paid',
        createdAt: serverTimestamp()
      }
    ];

    for (const data of payrollData) {
      await addDoc(collectionRef, data);
    }
    console.log('✅ payroll collection initialized with 2 records');
  }

  static async initializeBarcodesCollection(): Promise<void> {
    const collectionRef = collection(db, 'barcodes');
    
    const snapshot = await getDocs(collectionRef);
    if (snapshot.size > 0) {
      console.log('⏭️  barcodes collection already has data, skipping...');
      return;
    }

    const barcodesData = [
      {
        employeeId: 'emp_001',
        name: 'James Mugisha',
        barcodeNumber: 'BC001234567890',
        barcodeDate: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        barcodeTime: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        createdAt: serverTimestamp()
      },
      {
        employeeId: 'emp_002',
        name: 'Sarah Nakato',
        barcodeNumber: 'BC002345678901',
        barcodeDate: Timestamp.fromDate(new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)),
        barcodeTime: Timestamp.fromDate(new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)),
        createdAt: serverTimestamp()
      }
    ];

    for (const data of barcodesData) {
      await addDoc(collectionRef, data);
    }
    console.log('✅ barcodes collection initialized with 2 records');
  }

  static async initializeBranchesCollection(): Promise<void> {
    const collectionRef = collection(db, 'branches');
    
    const snapshot = await getDocs(collectionRef);
    if (snapshot.size > 0) {
      console.log('⏭️  branches collection already has data, skipping...');
      return;
    }

    const branchesData = [
      {
        name: 'Equity Shoppers Main Branch',
        address: 'Plot 24, Kampala Road, Kampala',
        city: 'Kampala',
        region: 'Central',
        phone: '+256414123456',
        email: 'kampala@equityshoppers.co.ug',
        manager: 'emp_001',
        status: 'active',
        openingHours: {
          monday: '08:00 - 22:00',
          tuesday: '08:00 - 22:00',
          wednesday: '08:00 - 22:00',
          thursday: '08:00 - 22:00',
          friday: '08:00 - 22:00',
          saturday: '08:00 - 22:00',
          sunday: '10:00 - 20:00'
        },
        services: ['Retail', 'Wholesale', 'Delivery'],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        name: 'Equity Shoppers Entebbe Branch',
        address: 'Plot 12, Entebbe Road, Entebbe',
        city: 'Entebbe',
        region: 'Central',
        phone: '+256414123457',
        email: 'entebbe@equityshoppers.co.ug',
        manager: 'emp_002',
        status: 'active',
        openingHours: {
          monday: '08:00 - 21:00',
          tuesday: '08:00 - 21:00',
          wednesday: '08:00 - 21:00',
          thursday: '08:00 - 21:00',
          friday: '08:00 - 21:00',
          saturday: '08:00 - 21:00',
          sunday: '10:00 - 19:00'
        },
        services: ['Retail', 'Delivery'],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];

    for (const data of branchesData) {
      await addDoc(collectionRef, data);
    }
    console.log('✅ branches collection initialized with 2 records');
  }

  static async initializeNotificationsCollection(): Promise<void> {
    const collectionRef = collection(db, 'notifications');
    
    const snapshot = await getDocs(collectionRef);
    if (snapshot.size > 0) {
      console.log('⏭️  notifications collection already has data, skipping...');
      return;
    }

    const notificationsData = [
      {
        userId: 'pm_001',
        title: 'Invoice Approval Required',
        message: 'Invoice INV-2024-003 from Kampala Fresh Foods Ltd requires your approval',
        type: 'invoice_approval',
        priority: 'high',
        isRead: false,
        actionUrl: '/dashboard/purchase-manager/invoices',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      {
        userId: 'rec_001',
        title: 'Delivery Scheduled',
        message: 'Uganda Dairy Cooperative delivery scheduled for tomorrow at 2:00 PM',
        type: 'delivery_reminder',
        priority: 'medium',
        isRead: false,
        actionUrl: '/dashboard/receiver/deliveries',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    ];

    for (const data of notificationsData) {
      await addDoc(collectionRef, data);
    }
    console.log('✅ notifications collection initialized with 2 records');
  }

  static async initializeAuditLogsCollection(): Promise<void> {
    const collectionRef = collection(db, 'auditLogs');
    
    const snapshot = await getDocs(collectionRef);
    if (snapshot.size > 0) {
      console.log('⏭️  auditLogs collection already has data, skipping...');
      return;
    }

    const auditData = [
      {
        operation: 'create',
        resource: 'suppliers',
        resourceId: 'supplier_001',
        userId: 'pm_001',
        userEmail: 'james.mugisha@equi.com',
        timestamp: serverTimestamp(),
        details: {
          supplierName: 'Kampala Fresh Foods Ltd',
          action: 'Supplier created'
        },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        operation: 'update',
        resource: 'invoices',
        resourceId: 'inv_001',
        userId: 'pm_001',
        userEmail: 'james.mugisha@equi.com',
        timestamp: serverTimestamp(),
        details: {
          invoiceNumber: 'INV-2024-001',
          action: 'Invoice approved',
          oldStatus: 'pending',
          newStatus: 'approved'
        },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    ];

    for (const data of auditData) {
      await addDoc(collectionRef, data);
    }
    console.log('✅ auditLogs collection initialized with 2 records');
  }

  static async initializeUserSessionsCollection(): Promise<void> {
    const collectionRef = collection(db, 'userSessions');
    
    const snapshot = await getDocs(collectionRef);
    if (snapshot.size > 0) {
      console.log('⏭️  userSessions collection already has data, skipping...');
      return;
    }

    const sessionData = [
      {
        userId: 'pm_001',
        email: 'james.mugisha@equi.com',
        role: 'Purchasing Manager',
        loginTime: serverTimestamp(),
        lastActivity: serverTimestamp(),
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        isActive: true,
        sessionDuration: 0
      },
      {
        userId: 'rec_001',
        email: 'sarah.nakato@equi.com',
        role: 'Receiver',
        loginTime: serverTimestamp(),
        lastActivity: serverTimestamp(),
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        isActive: true,
        sessionDuration: 0
      }
    ];

    for (const data of sessionData) {
      await addDoc(collectionRef, data);
    }
    console.log('✅ userSessions collection initialized with 2 records');
  }

  /**
   * Initialize Users Collection
   */
  static async initializeUsersCollection(): Promise<void> {
    const collectionRef = collection(db, 'users');
    const snapshot = await getDocs(collectionRef);
    
    if (snapshot.size > 0) {
      console.log('⏭️  users collection already has data, skipping...');
      return;
    }

    const users = [
      {
        uid: 'user-001',
        email: 'sarah.johnson@equity.com',
        displayName: 'Sarah Johnson',
        role: 'Purchasing Manager',
        employeeId: 'pm-001',
        branchId: 'kyengera',
        permissions: {
          canViewSuppliers: true,
          canManageSuppliers: true,
          canApproveExpenses: true,
          canViewCashAllocations: true,
          canManagePayments: true
        },
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        uid: 'user-002',
        email: 'james.receiver@equity.com',
        displayName: 'James Receiver',
        role: 'Receiver',
        employeeId: 'rec-001',
        branchId: 'kyengera',
        permissions: {
          canViewDeliveries: true,
          canManageDeliveries: true,
          canCreateReturnNotes: true,
          canViewInventory: true,
          canReportDamages: true
        },
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const user of users) {
      await addDoc(collectionRef, user);
    }

    console.log('✅ users collection initialized with 2 records');
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Check database status and collection counts
   */
  static async getDatabaseStatus(): Promise<any> {
    const collections = [
      'cashClose', 'suppliers', 'expenses', 'purchaseOrders', 'payments',
      'chequeTracker', 'installmentPlans', 'deliveries', 'returnNotes',
      'damages', 'restockItems', 'invoices', 'employees', 'branches',
      'notifications', 'auditLogs', 'userSessions'
    ];

    const status: unknown = {
      timestamp: new Date().toISOString(),
      collections: {}
    };

    for (const collectionName of collections) {
      try {
        const snapshot = await getDocs(collection(db, collectionName));
        status.collections[collectionName] = {
          exists: true,
          count: snapshot.size,
          lastChecked: new Date().toISOString()
        };
      } catch (error) {
        status.collections[collectionName] = {
          exists: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          lastChecked: new Date().toISOString()
        };
      }
    }

    return status;
  }

  /**
   * Clear all collections (for testing purposes)
   */
  static async clearAllCollections(): Promise<void> {
    console.warn('⚠️  Clearing all collections - THIS WILL DELETE ALL DATA!');
    
    const collections = [
      'cashClose', 'suppliers', 'expenses', 'purchaseOrders', 'payments',
      'chequeTracker', 'installmentPlans', 'deliveries', 'returnNotes',
      'damages', 'restockItems', 'invoices', 'employees', 'branches',
      'notifications', 'auditLogs', 'userSessions'
    ];

    for (const collectionName of collections) {
      try {
        const snapshot = await getDocs(collection(db, collectionName));
        const batch = [];
        
        snapshot.docs.forEach(doc => {
          batch.push(doc.ref.delete());
        });
        
        await Promise.all(batch);
        console.log(`🗑️  Cleared collection: ${collectionName}`);
      } catch (error) {
        console.error(`❌ Failed to clear collection ${collectionName}:`, error);
      }
    }
    
    console.log('✅ All collections cleared');
  }

  /**
   * Get collection status for all collections
   */
  static async getAllCollectionStatus(): Promise<any> {
    const collections = [
      'cashClose', 'suppliers', 'expenses', 'purchaseOrders', 'payments', 
      'chequeTracker', 'installmentPlans', 'expenseRequests', 'fundAcknowledgments',
      'cashAllocations', 'specialFundsTracker', 'deliveries', 'returnNotes', 
      'damages', 'restockItems', 'invoices', 'employees', 'branches', 
      'notifications', 'auditLogs', 'userSessions', 'users'
    ];

    const status: unknown = {};

    for (const collectionName of collections) {
      try {
        const snapshot = await getDocs(collection(db, collectionName));
        status[collectionName] = {
          exists: true,
          count: snapshot.size,
          lastUpdated: new Date().toISOString()
        };
      } catch (error) {
        status[collectionName] = {
          exists: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          lastUpdated: new Date().toISOString()
        };
      }
    }

    return status;
  }

  /**
   * Quick status check for purchasing manager collections
   */
  static async getPurchasingManagerCollectionStatus(): Promise<any> {
    const pmCollections = [
      'cashClose', 'suppliers', 'expenses', 'purchaseOrders', 'payments',
      'chequeTracker', 'installmentPlans', 'expenseRequests', 'fundAcknowledgments',
      'cashAllocations', 'specialFundsTracker', 'invoices'
    ];

    const status: unknown = {};

    for (const collectionName of pmCollections) {
      try {
        const snapshot = await getDocs(collection(db, collectionName));
        status[collectionName] = snapshot.size;
      } catch (error) {
        status[collectionName] = 0;
      }
    }

    return status;
  }

  /**
   * Quick status check for receiver collections
   */
  static async getReceiverCollectionStatus(): Promise<any> {
    const receiverCollections = [
      'deliveries', 'returnNotes', 'damages', 'restockItems', 'invoices'
    ];

    const status: unknown = {};

    for (const collectionName of receiverCollections) {
      try {
        const snapshot = await getDocs(collection(db, collectionName));
        status[collectionName] = snapshot.size;
      } catch (error) {
        status[collectionName] = 0;
      }
    }

    return status;
  }

  /**
   * Fix installment plans data by clearing and reinitializing
   */
  static async fixInstallmentPlansData(): Promise<void> {
    console.log('🔧 Fixing installment plans data...');
    try {
      await this.clearInstallmentPlansCollection();
      await this.initializeInstallmentPlansCollection();
      console.log('✅ installment plans data fixed successfully');
    } catch (error) {
      console.error('❌ Error fixing installment plans data:', error);
      throw error;
    }
  }

  /**
   * Initialize Fund Balances Collection
   */
  static async initializeFundBalancesCollection(): Promise<void> {
    console.log('🏦 Initializing fund balances...');
    
    try {
      // Initialize fund balances for the default branch
      const defaultBranchId = 'kyengera'; // or get from current user context
      await fundingSourceService.initializeFundBalances(defaultBranchId);
      
      console.log('✅ Fund balances initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing fund balances:', error);
      // Don't throw error to prevent stopping other initializations
    }
  }
}

// =====================================================
// BROWSER CONSOLE INTEGRATION
// =====================================================

if (typeof window !== 'undefined') {
  const enableDevDbTools =
    process.env.NODE_ENV !== 'production' &&
    process.env.NEXT_PUBLIC_ENABLE_DEV_DB_TOOLS === 'true';

  if (enableDevDbTools) {
    (window as any).dbInit = {
      initialize: () => DatabaseInitialization.initializeAllCollections(),
      status: () => DatabaseInitialization.getDatabaseStatus(),
      clear: () => DatabaseInitialization.clearAllCollections(),
      purchasingManager: () => DatabaseInitialization.initializePurchasingManagerCollections(),
      receiver: () => DatabaseInitialization.initializeReceiverCollections(),
      shared: () => DatabaseInitialization.initializeSharedCollections(),
      fundBalances: () => DatabaseInitialization.initializeFundBalancesCollection()
    };
    
    console.log('🗄️  Database Initialization loaded!');
    console.log('Available commands:');
    console.log('- dbInit.initialize() - Initialize all collections with dummy data');
    console.log('- dbInit.status() - Check database status and collection counts');
    console.log('- dbInit.clear() - Clear all collections (DESTRUCTIVE)');
    console.log('- dbInit.purchasingManager() - Initialize purchasing manager collections only');
    console.log('- dbInit.receiver() - Initialize receiver collections only');
    console.log('- dbInit.shared() - Initialize shared collections only');
    console.log('- dbInit.fundBalances() - Initialize fund balances for expense payments');
  }
}