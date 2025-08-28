'use client';

import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase/config';
import { Timestamp } from 'firebase/firestore';
import { 
  User, 
  Mail, 
  Lock, 
  Building2, 
  Phone, 
  MapPin, 
  DollarSign,
  CheckCircle,
  AlertCircle,
  Crown
} from 'lucide-react';

const MD_ACCOUNT_DATA = {
  email: 'md@equity.com',
  password: 'MD@Equity2024!',
  firstName: 'Executive',
  lastName: 'Director',
  employeeNIN: 'MD001-2024-EXEC',
  phone: '+256 700 100 001',
  address: 'Equity Head Office, Kampala Central',
  branchId: 'main',
  department: 'Executive Leadership',
  jobTitle: 'Managing Director',
  baseSalary: 8000000
};

export default function CreateMDAccountPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountDetails, setAccountDetails] = useState<any>(null);

  const createMDAccount = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      console.log('🚀 Creating Managing Director account...');

      // Step 1: Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        MD_ACCOUNT_DATA.email,
        MD_ACCOUNT_DATA.password
      );

      const user = userCredential.user;
      console.log('✅ Firebase Auth user created:', user.uid);

      // Step 2: Create employee document
      const employeeData = {
        id: user.uid,
        firstName: MD_ACCOUNT_DATA.firstName,
        lastName: MD_ACCOUNT_DATA.lastName,
        email: MD_ACCOUNT_DATA.email,
        employeeNIN: MD_ACCOUNT_DATA.employeeNIN,
        phone: MD_ACCOUNT_DATA.phone,
        address: MD_ACCOUNT_DATA.address,
        hireDate: Timestamp.now(),
        employeeSalary: MD_ACCOUNT_DATA.baseSalary,
        employmentStatus: 'Active',
        branchId: MD_ACCOUNT_DATA.branchId,
        department: MD_ACCOUNT_DATA.department,
        
        roles: [{
          jobRoleId: 'managing-director',
          jobTitle: MD_ACCOUNT_DATA.jobTitle,
          baseSalary: MD_ACCOUNT_DATA.baseSalary,
          description: 'Executive leadership with comprehensive analytics access and strategic oversight across all business operations',
          assignedDate: Timestamp.now()
        }],
        
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        
        // Executive preferences
        accessLevel: 'Executive',
        dashboardPreferences: {
          theme: 'light',
          autoRefresh: true,
          defaultView: 'analytics'
        }
      };

      await setDoc(doc(db, 'employees', user.uid), employeeData);
      console.log('✅ Employee document created in Firestore');

      setAccountDetails({
        uid: user.uid,
        email: MD_ACCOUNT_DATA.email,
        password: MD_ACCOUNT_DATA.password,
        role: MD_ACCOUNT_DATA.jobTitle
      });

      setSuccess(true);

    } catch (err: any) {
      console.error('❌ Error creating MD account:', err);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use. The MD account may already exist.');
      } else {
        setError(err.message || 'Failed to create MD account');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success && accountDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-green-200">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">MD Account Created!</h1>
            <p className="text-gray-600">Managing Director account has been successfully created.</p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Email</span>
              </div>
              <p className="font-mono text-sm bg-white p-2 rounded border">{accountDetails.email}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Password</span>
              </div>
              <p className="font-mono text-sm bg-white p-2 rounded border">{accountDetails.password}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Role</span>
              </div>
              <p className="font-semibold text-purple-600">{accountDetails.role}</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/auth/login'}
              className="w-full bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3 px-4 rounded-lg hover:from-purple-700 hover:to-violet-800 transition-all duration-200 font-medium"
            >
              Go to Login
            </button>
            
            <button
              onClick={() => window.location.href = '/dashboard/managing-director'}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-700 text-white py-3 px-4 rounded-lg hover:from-green-700 hover:to-emerald-800 transition-all duration-200 font-medium"
            >
              Go to Executive Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-purple-200">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 via-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create MD Account</h1>
          <p className="text-gray-600">Set up the Managing Director account for executive access</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4 mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">Account Details:</h3>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Mail className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-sm font-medium text-gray-700">Email</p>
              <p className="text-sm text-gray-600">{MD_ACCOUNT_DATA.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <User className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-sm font-medium text-gray-700">Name</p>
              <p className="text-sm text-gray-600">{MD_ACCOUNT_DATA.firstName} {MD_ACCOUNT_DATA.lastName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Crown className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-sm font-medium text-gray-700">Role</p>
              <p className="text-sm text-gray-600">{MD_ACCOUNT_DATA.jobTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <DollarSign className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-sm font-medium text-gray-700">Salary</p>
              <p className="text-sm text-gray-600">UGX {MD_ACCOUNT_DATA.baseSalary.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Phone className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-sm font-medium text-gray-700">Phone</p>
              <p className="text-sm text-gray-600">{MD_ACCOUNT_DATA.phone}</p>
            </div>
          </div>
        </div>

        <button
          onClick={createMDAccount}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-violet-700 text-white py-3 px-4 rounded-lg hover:from-purple-700 hover:to-violet-800 disabled:opacity-50 transition-all duration-200 font-medium flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Creating Account...
            </>
          ) : (
            <>
              <Crown className="w-4 h-4" />
              Create MD Account
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          This will create a Firebase Auth user and employee record for the Managing Director
        </p>
      </div>
    </div>
  );
}