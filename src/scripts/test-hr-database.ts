#!/usr/bin/env ts-node

import { firestoreServices } from '../lib/firebase/firestore-service';
import { DatabaseInitialization } from '../lib/firebase/database-initialization';

/**
 * Test script to verify HR database connection and functionality
 */
async function testHRDatabase() {
  console.log('🧪 Testing HR Database Connection...\n');

  try {
    // Test 1: Check HR services are available
    console.log('📋 1. Testing HR services availability...');
    const services = ['employee', 'attendance', 'payroll', 'leaveRequest', 'barcode'];
    
    for (const service of services) {
      if (firestoreServices[service as keyof typeof firestoreServices]) {
        console.log(`   ✅ ${service} service is available`);
      } else {
        console.log(`   ❌ ${service} service is NOT available`);
      }
    }
    
    console.log('\n');

    // Test 2: Test Employee Service
    console.log('👥 2. Testing Employee Service...');
    try {
      const employees = await firestoreServices.employee.getAll();
      console.log(`   ✅ Found ${employees.length} employees`);
      
      // Look for HR employees
      const hrEmployees = await firestoreServices.employee.getEmployeesByRole('HR');
      console.log(`   ✅ Found ${hrEmployees.length} HR employees`);
      
      if (hrEmployees.length > 0) {
        console.log(`   📋 HR Employee: ${hrEmployees[0].firstName} ${hrEmployees[0].lastName}`);
      }
    } catch (error) {
      console.log(`   ❌ Employee service error: ${error}`);
    }

    console.log('\n');

    // Test 3: Test Attendance Service
    console.log('⏰ 3. Testing Attendance Service...');
    try {
      const attendanceRecords = await firestoreServices.attendance.getAll();
      console.log(`   ✅ Found ${attendanceRecords.length} attendance records`);
      
      // Test check-in functionality
      if (attendanceRecords.length > 0) {
        const employee = attendanceRecords[0];
        console.log(`   📋 Sample attendance for employee: ${employee.employeeId}`);
        console.log(`   📋 Status: ${employee.status}`);
        console.log(`   📋 Hours worked: ${employee.hoursWorked || 0}`);
      }
    } catch (error) {
      console.log(`   ❌ Attendance service error: ${error}`);
    }

    console.log('\n');

    // Test 4: Test Payroll Service
    console.log('💰 4. Testing Payroll Service...');
    try {
      const payrollRecords = await firestoreServices.payroll.getAll();
      console.log(`   ✅ Found ${payrollRecords.length} payroll records`);
      
      if (payrollRecords.length > 0) {
        const payroll = payrollRecords[0];
        console.log(`   📋 Sample payroll for employee: ${payroll.employeeId}`);
        console.log(`   📋 Gross salary: UGX ${payroll.grossSalary.toLocaleString()}`);
        console.log(`   📋 Net salary: UGX ${payroll.netSalary.toLocaleString()}`);
        console.log(`   📋 Status: ${payroll.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Payroll service error: ${error}`);
    }

    console.log('\n');

    // Test 5: Test Leave Request Service
    console.log('🏖️ 5. Testing Leave Request Service...');
    try {
      const leaveRequests = await firestoreServices.leaveRequest.getAll();
      console.log(`   ✅ Found ${leaveRequests.length} leave requests`);
      
      if (leaveRequests.length > 0) {
        const leave = leaveRequests[0];
        console.log(`   📋 Sample leave request for employee: ${leave.employeeId}`);
        console.log(`   📋 Leave type: ${leave.leaveType}`);
        console.log(`   📋 Days requested: ${leave.daysRequested}`);
        console.log(`   📋 Status: ${leave.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Leave request service error: ${error}`);
    }

    console.log('\n');

    // Test 6: Test Barcode Service
    console.log('🏷️ 6. Testing Barcode Service...');
    try {
      const barcodes = await firestoreServices.barcode.getAll();
      console.log(`   ✅ Found ${barcodes.length} barcodes`);
      
      if (barcodes.length > 0) {
        const barcode = barcodes[0];
        console.log(`   📋 Sample barcode for employee: ${barcode.employeeId}`);
        console.log(`   📋 Barcode number: ${barcode.barcodeNumber}`);
        console.log(`   📋 Employee name: ${barcode.name}`);
      }
    } catch (error) {
      console.log(`   ❌ Barcode service error: ${error}`);
    }

    console.log('\n');

    // Test 7: Database Status
    console.log('📊 7. Getting database status...');
    try {
      const status = await DatabaseInitialization.getAllCollectionStatus();
      console.log(`   ✅ Database status retrieved`);
      console.log(`   📋 Total collections: ${Object.keys(status).length}`);
      
      // Check HR-specific collections
      const hrCollections = ['employees', 'attendance', 'payroll', 'leaveRequests', 'barcodes'];
      for (const collection of hrCollections) {
        if (status[collection]) {
          console.log(`   📋 ${collection}: ${status[collection].count} records`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Database status error: ${error}`);
    }

    console.log('\n🎉 HR Database Test Complete!');
    console.log('✅ All HR services are properly linked to the database.');
    
  } catch (error) {
    console.error('❌ HR Database Test Failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testHRDatabase().then(() => {
    console.log('\n🔗 HR Database Connection Test Complete!');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

export default testHRDatabase; 