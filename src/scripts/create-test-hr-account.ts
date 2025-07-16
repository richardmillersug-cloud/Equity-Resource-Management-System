import { authService, SignUpData } from '../lib/firebase/auth';

/**
 * Creates a test HR account for debugging authentication issues
 */
async function createTestHRAccount() {
  console.log('🏢 Creating Test HR Account');
  console.log('============================');
  
  const testHRData: SignUpData = {
    email: 'hr@test.com',
    password: 'TestHR123!',
    firstName: 'HR',
    lastName: 'Manager',
    employeeNIN: 'HR_TEST_123456789',
    phone: '+256700000001',
    branchId: 'main',
    roles: [{
      jobRoleId: 'hr-manager',
      jobTitle: 'HR Manager',
      baseSalary: 1300000,
      description: 'Human Resources Manager with full HR permissions',
      assignedDate: new Date()
    }]
  };

  try {
    console.log('Creating HR account with:');
    console.log(`Email: ${testHRData.email}`);
    console.log(`Password: ${testHRData.password}`);
    console.log(`Name: ${testHRData.firstName} ${testHRData.lastName}`);
    
    const result = await authService.signUp(testHRData);
    
    console.log('✅ HR Account created successfully!');
    console.log(`User ID: ${result.user.uid}`);
    console.log(`Email: ${result.user.email}`);
    console.log(`Display Name: ${result.user.displayName}`);
    
    console.log('\n📧 Verification email sent to:', testHRData.email);
    console.log('\n🔑 You can now login with:');
    console.log(`Email: ${testHRData.email}`);
    console.log(`Password: ${testHRData.password}`);
    
    // Sign out after creation
    await authService.signOut();
    console.log('\n✅ Account created and signed out. Ready for login test!');
    
  } catch (error: unknown) {
    console.error('❌ Error creating HR account:', error);
    console.error('Error details:', error.message || error);
    
    // Provide specific guidance based on error type
    if (error.code === 'auth/email-already-in-use') {
      console.log('\n💡 The email hr@test.com is already in use.');
      console.log('You can try logging in with:');
      console.log('Email: hr@test.com');
      console.log('Password: TestHR123!');
    } else if (error.code === 'auth/weak-password') {
      console.log('\n💡 Password is too weak. Please use a stronger password.');
    } else if (error.code === 'auth/invalid-email') {
      console.log('\n💡 Email format is invalid.');
    } else {
      console.log('\n💡 Please check your Firebase configuration and ensure:');
      console.log('1. Firebase project is correctly configured');
      console.log('2. Authentication is enabled in Firebase console');
      console.log('3. Email/Password provider is enabled');
    }
  }
}

/**
 * Test login with the created account
 */
async function testLogin() {
  console.log('\n🧪 Testing Login');
  console.log('================');
  
  try {
    const loginResult = await authService.signIn({
      email: 'hr@test.com',
      password: 'TestHR123!'
    });
    
    console.log('✅ Login successful!');
    console.log(`Logged in as: ${loginResult.displayName} (${loginResult.email})`);
    console.log(`User ID: ${loginResult.uid}`);
    
    if (loginResult.employee) {
      console.log(`Employee Role: ${loginResult.employee.roles?.[0]?.jobTitle || 'N/A'}`);
      console.log(`Employment Status: ${loginResult.employee.employmentStatus}`);
    }
    
    await authService.signOut();
    console.log('✅ Login test completed successfully!');
    
  } catch (error: unknown) {
    console.error('❌ Login test failed:', error.message || error);
  }
}

// Main function
async function main() {
  console.log('🚀 HR Account Setup and Testing');
  console.log('===============================\n');
  
  try {
    // First try to create the account
    await createTestHRAccount();
    
    // Wait a moment then test login
    setTimeout(async () => {
      await testLogin();
    }, 2000);
    
  } catch (error) {
    console.error('Script failed:', error);
  }
}

// Export for use
export { createTestHRAccount, testLogin };

// Run if called directly
if (require.main === module) {
  main();
} 