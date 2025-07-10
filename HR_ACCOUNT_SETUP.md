# HR Account Setup Guide

## Overview
This guide will help you create an HR account with proper permissions and role configuration in the system.

## HR Account Details

### Role Configuration
- **Role**: HR Manager
- **Salary**: UGX 1,300,000
- **Permissions**:
  - ✅ Employee Management
  - ✅ Payroll Processing
  - ✅ Attendance Tracking
  - ✅ Leave Request Approval
  - ✅ View Reports
  - ❌ Cash Management (restricted)
  - ❌ System Administration (restricted)

### Default Account Information
- **Email**: `hr@company.com`
- **Password**: `HR_TempPass123!`
- **Name**: HR Manager
- **Employee NIN**: `HR_NIN_123456789`
- **Phone**: `+256700000000`
- **Branch**: Kyengera

## How to Create the HR Account

### Option 1: Using npm script (Recommended)
```bash
npm run create-hr
```

### Option 2: Using ts-node directly
```bash
npx ts-node src/scripts/create-hr-account.ts
```

### Option 3: Using Node.js (if you prefer JavaScript)
```bash
node src/scripts/create-hr-account.js
```

## Before Running the Script

1. **Update Account Details**: Edit the `src/scripts/create-hr-account.ts` file to update:
   - Email address
   - Password (use a strong password)
   - Employee NIN (National Identification Number)
   - Phone number
   - Branch ID (if different from 'kyengera')

2. **Ensure Firebase is Configured**: Make sure your Firebase configuration is set up correctly in `src/lib/firebase/config.ts`

## After Account Creation

1. **Change Password**: The HR manager should change the default password immediately after first login
2. **Update Profile**: Complete the profile information including:
   - Phone number
   - Address
   - Other personal details
3. **Access HR Dashboard**: The HR account can access the HR dashboard at `/dashboard/hr`

## HR Dashboard Features

Once logged in, the HR account can:
- Manage employee records
- Process payroll
- Track attendance
- Approve leave requests
- View HR reports
- Manage employee barcode assignments

## Security Notes

- The HR account has sensitive permissions for employee management
- Always use strong passwords
- Regularly review HR account access logs
- Keep employee data confidential and secure

## Troubleshooting

### Common Issues:
1. **Firebase Authentication Error**: Ensure Firebase is properly configured
2. **Permission Denied**: Check Firestore security rules
3. **Employee NIN Conflict**: Ensure the NIN is unique in the system
4. **Branch Not Found**: Verify the branch ID exists or will be created

### Log Files:
- Check console output for detailed error messages
- Audit logs are automatically created in Firestore
- Monitor Firebase Auth logs for authentication issues

## Support

For issues with HR account creation, check:
1. Firebase console for authentication errors
2. Firestore console for data persistence issues
3. Application logs for detailed error messages 