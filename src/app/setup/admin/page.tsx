'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService, SignUpData } from '@/lib/firebase/auth';
import { JobRole } from '@/lib/firebase/models';
import { Timestamp } from 'firebase/firestore';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

export default function SetupAdminPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: 'admin@equi.local',
    password: '',
    confirmPassword: '',
    firstName: 'System',
    lastName: 'Administrator',
    employeeNIN: '80001019700001',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.employeeNIN.length !== 14) {
      setError('Employee NIN must be exactly 14 characters');
      return;
    }

    const adminRole: JobRole = {
      jobRoleId: 'admin',
      jobTitle: 'Admin',
      baseSalary: 2500000,
      description: 'Full administrator (business + platform)',
      assignedDate: Timestamp.now(),
    };

    const signUpData: SignUpData = {
      email: form.email.trim(),
      password: form.password,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      employeeNIN: form.employeeNIN.trim(),
      phone: form.phone || undefined,
      branchId: 'main',
      roles: [adminRole],
    };

    setLoading(true);
    try {
      await authService.signUp(signUpData);
      setSuccess(true);
      setTimeout(() => router.push('/dashboard/admin'), 1500);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Failed to create account';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-100 rounded-xl">
            <Shield className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Admin Account</h1>
            <p className="text-sm text-gray-500">Business admin + platform security (single role)</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-sm text-amber-800 flex gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>One Admin account covers operations, users, audit logs, and login sessions.</p>
        </div>

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 text-green-800 text-sm flex gap-2">
            <CheckCircle className="w-5 h-5" />
            Account created. Redirecting to Admin console…
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
              <input
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
              <input
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee NIN (14 digits)</label>
            <input
              required
              maxLength={14}
              value={form.employeeNIN}
              onChange={(e) => setForm({ ...form, employeeNIN: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
            <input
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating account…' : 'Create Admin account'}
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-6 text-center">
          Already have an account?{' '}
          <a href="/auth/login" className="text-indigo-600 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
