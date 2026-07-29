'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { authService } from '@/lib/firebase/auth';
import { isSystemTestCashClose } from '@/lib/firebase/test-record-filters';
import { 
  DollarSign, 
  Send, 
  User, 
  Receipt,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  FileText,
  TrendingUp,
  Calculator,
  Clock,
  Calendar,
  Building2,
  Target,
  Zap
} from 'lucide-react';

interface PMUser {
  uid: string;
  name: string;
  email: string;
}

interface Allocation {
  id: string;
  pmId: string;
  pmName: string;
  amount: number;
  description: string;
  shiftType: 'day' | 'night' | 'both';
  businessDate: string;
  status: 'sent' | 'received' | 'confirmed';
  accountantId: string;
  accountantName: string;
  createdAt: any;
  notes?: string;
  cashCloseId?: string;
}

interface CashClose {
  id: string;
  businessDate: string;
  shifts: Array<{
    shift: 'day' | 'night';
    tills: Array<{
      tillNumber: number;
      totalCashInTill: number;
      cashAmount: number;
    }>;
  }>;
  totalRevenue: number;
  createdAt: any;
  createdBy: string;
}

interface SuggestedAllocation {
  cashCloseId: string;
  shiftType: 'day' | 'night';
  totalCash: number;
  suggestedAmount: number;
  profitDeduction: number;
  monthlyExpenseFund: number;
  totalDeductions: number;
  businessDate: string;
  createdAt: any;
  branchId?: string;
  createdBy: string;
  createdByName: string;
}

export default function AccountantAllocationsPage() {
  const [pmUsers, setPmUsers] = useState<PMUser[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [cashCloses, setCashCloses] = useState<CashClose[]>([]);
  const [allCashCloses, setAllCashCloses] = useState<CashClose[]>([]);
  const [allocatedCashCloses, setAllocatedCashCloses] = useState<CashClose[]>([]);
  const [suggestedAllocations, setSuggestedAllocations] = useState<SuggestedAllocation[]>([]);
  const [cashClosesByDate, setCashClosesByDate] = useState<{ [date: string]: CashClose[] }>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Form state
  const [selectedPM, setSelectedPM] = useState<string>('');
  const [selectedCashClose, setSelectedCashClose] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<'day' | 'night'>('day');

  useEffect(() => {
    loadData();
  }, []);

  // Reload suggestions when PM selection changes (no server filter needed — all submitted shown)
  useEffect(() => {
    if (selectedPM) loadData();
  }, [selectedPM]);

  const loadData = async (pmFilter?: string) => {
    setLoading(true);
    setError('');

    try {
      // Load employees and filter for PMs
      const employeesSnapshot = await getDocs(collection(db, 'employees'));
      const pmUsersData: PMUser[] = [];

      employeesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const roles = data.roles || [];
        const isPm = roles.some(
          (r: { jobTitle?: string }) =>
            r.jobTitle === 'Purchase Manager' || r.jobTitle === 'Purchasing Manager'
        );
        const isAdminOrMd = roles.some((r: { jobTitle?: string }) => {
          const t = (r.jobTitle || '').toLowerCase();
          return (
            t === 'admin' ||
            t === 'system admin' ||
            t === 'super admin' ||
            t === 'superadmin' ||
            t === 'managing director'
          );
        });

        // Admin / MD accounts are not operational PM wallets (ledger balance & used stay 0)
        if (isPm && !isAdminOrMd) {
          pmUsersData.push({
            uid: doc.id,
            name: `${data.firstName || 'Unknown'} ${data.lastName || 'User'}`,
            email: data.email || 'No email'
          });
        }
      });

      setPmUsers(pmUsersData);

      // Load submitted cash closes for allocation processing
      // Always fetch ALL submitted closes — the PM filter only controls who to SEND to, not what to show
      try {
        const cashClosesQuery = query(
          collection(db, 'cashCloses'),
          where('status', '==', 'submitted'),
          orderBy('createdAt', 'desc')
        );
        const cashClosesSnapshot = await getDocs(cashClosesQuery);

        // Process cash closes data - only those with status = "submitted"
        const submittedCashCloses = cashClosesSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(cc => !isSystemTestCashClose(cc));

        setCashCloses(submittedCashCloses);
        
        // Generate suggested allocations based on submitted cash closes
        const suggestions: SuggestedAllocation[] = [];

        // Check cash closes by business date to apply form-based monthly expense fund settings
        // MONTHLY EXPENSE FUND: Applied based on form settings (m_expensefund field) when enabled by accountant
        const localCashClosesByDate: { [date: string]: CashClose[] } = {};
        submittedCashCloses.forEach(cashClose => {
          const dateKey = cashClose.businessDate || cashClose.date;
          if (!localCashClosesByDate[dateKey]) {
            localCashClosesByDate[dateKey] = [];
          }
          localCashClosesByDate[dateKey].push(cashClose);
        });

        // Update the state variable
        setCashClosesByDate(localCashClosesByDate);

        // Sort cash closes by creation time for proper ordering
        Object.keys(localCashClosesByDate).forEach(dateKey => {
          localCashClosesByDate[dateKey].sort((a, b) => {
            const timeA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
            const timeB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
            return timeA.getTime() - timeB.getTime();
          });
        });

        submittedCashCloses.forEach(cashClose => {
          // Resolve total cash using every known field / structure
          const resolveTotalCash = (cc: any, shift?: any): number => {
            // From a specific shift's tills
            if (shift && Array.isArray(shift.tills)) {
              const t = shift.tills.reduce((s: number, till: any) =>
                s + (till.totalCashInTill || till.cashAmount || till.amount || 0), 0);
              if (t > 0) return t;
            }
            // Top-level fields
            if ((cc.totalCashInTill || 0) > 0) return cc.totalCashInTill;
            if ((cc.totalRevenue || 0) > 0) return cc.totalRevenue;
            if ((cc.closeCash || 0) > 0) return cc.closeCash;
            // Sum across all shifts
            if (Array.isArray(cc.shifts)) {
              const t = cc.shifts.reduce((s: number, sh: any) =>
                s + (Array.isArray(sh.tills)
                  ? sh.tills.reduce((ts: number, till: any) => ts + (till.totalCashInTill || till.cashAmount || 0), 0)
                  : 0), 0);
              if (t > 0) return t;
            }
            return 0;
          };

          const monthlyExpenseFund = cashClose.m_expenseFund || cashClose.m_expensefund || 0;
          const businessDate = cashClose.businessDate || cashClose.cashCloseDate || cashClose.date || new Date().toISOString().split('T')[0];
          const shiftLabel = (shift?: any) => shift?.shift || cashClose.shiftType || cashClose.shift || 'day';

          if (cashClose.shifts && Array.isArray(cashClose.shifts) && cashClose.shifts.length > 0) {
            cashClose.shifts.forEach((shift: any) => {
              const shiftTotalCash = resolveTotalCash(cashClose, shift);
              const profitDeduction = Math.round(shiftTotalCash * 0.12);
              const totalDeductions = profitDeduction + monthlyExpenseFund;
              const suggestedAmount = shiftTotalCash - totalDeductions;

              if (suggestedAmount > 0) {
                suggestions.push({
                  cashCloseId: cashClose.id,
                  shiftType: shiftLabel(shift),
                  totalCash: shiftTotalCash,
                  suggestedAmount,
                  profitDeduction,
                  monthlyExpenseFund,
                  totalDeductions,
                  businessDate,
                  createdAt: cashClose.createdAt,
                  branchId: cashClose.branchId,
                  createdBy: cashClose.createdBy || 'unknown',
                  createdByName: 'Loading...',
                });
              }
            });
          } else {
            // No shifts array — resolve from top-level fields
            const totalCash = resolveTotalCash(cashClose);
            if (totalCash > 0) {
              const profitDeduction = Math.round(totalCash * 0.12);
              const totalDeductions = profitDeduction + monthlyExpenseFund;
              const suggestedAmount = totalCash - totalDeductions;
              if (suggestedAmount > 0) {
                suggestions.push({
                  cashCloseId: cashClose.id,
                  shiftType: shiftLabel(),
                  totalCash,
                  suggestedAmount,
                  profitDeduction,
                  monthlyExpenseFund,
                  totalDeductions,
                  businessDate,
                  createdAt: cashClose.createdAt,
                  branchId: cashClose.branchId,
                  createdBy: cashClose.createdBy || 'unknown',
                  createdByName: 'Loading...',
                });
              }
            }
          }
        });
        
        // Sort suggestions by createdAt (most recent first)
        suggestions.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });

        // Set initial suggestions with "Loading..." names
        setSuggestedAllocations(suggestions);

        // Now look up creator names asynchronously
        const updatedSuggestions = await Promise.all(
          suggestions.map(async (suggestion) => ({
            ...suggestion,
            createdByName: await getEmployeeName(suggestion.createdBy)
          }))
        );

        setSuggestedAllocations(updatedSuggestions);



        
      } catch (cashCloseError) {
        console.warn('Could not load cash closes:', cashCloseError);
        setCashCloses([]);
        setSuggestedAllocations([]);
      }

      // Load allocations (gracefully handle if collection doesn't exist)
      try {
        const allocationsSnapshot = await getDocs(collection(db, 'allocation_PM'));
        const allocationsData: Allocation[] = [];
        
        allocationsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          allocationsData.push({
            id: doc.id,
            pmId: data.pmId || '',
            pmName: data.pmName || '',
            amount: data.amount || 0,
            description: data.description || '',
            shiftType: data.shiftType || 'day',
            businessDate: data.businessDate || '',
            status: data.status || 'sent',
            accountantId: data.accountantId || '',
            accountantName: data.accountantName || '',
            createdAt: data.createdAt,
            notes: data.notes || '',
            cashCloseId: data.cashCloseId || ''
          });
        });

        setAllocations(allocationsData);
      } catch (allocError) {
        console.warn('Allocations collection does not exist yet, starting fresh');
        setAllocations([]);
      }

      // Load ALL cash closes for overview display (not just submitted ones)
      try {
        const allCashClosesQuery = query(
          collection(db, 'cashCloses'),
          orderBy('createdAt', 'desc')
        );
        const allCashClosesSnapshot = await getDocs(allCashClosesQuery);

        const allCashClosesData = allCashClosesSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(cc => !isSystemTestCashClose(cc));

        setAllCashCloses(allCashClosesData);

        // Filter allocated cash closes for the recent allocations section
        const allocatedCashClosesData = allCashClosesData.filter(cc => cc.status === 'allocated');
        setAllocatedCashCloses(allocatedCashClosesData);
      } catch (allCashCloseError) {
        console.warn('Could not load all cash closes:', allCashCloseError);
        setAllCashCloses([]);
        setAllocatedCashCloses([]);
      }

    } catch (error: any) {
      console.error('❌ Error loading data:', error);
      setError(`Error loading data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendAllocationFromOverview = async (cashClose: any) => {
    if (!selectedPM) {
      setError('Please select a Purchase Manager first');
      return;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      setError('You must be logged in to send allocations');
      return;
    }

    const selectedPMUser = pmUsers.find(pm => pm.uid === selectedPM);
    if (!selectedPMUser) {
      setError('Selected PM not found');
      return;
    }

    setSending(true);
    setError('');

    try {
      // Calculate allocation amount based on the cash close data
      const totalCash = cashClose.totalCashInTill || 0;
      const profitDeduction = Math.round(totalCash * 0.12); // 12% profit
      const monthlyExpenseFund = cashClose.m_expenseFund || cashClose.m_expensefund || 0;
      const totalDeductions = profitDeduction + monthlyExpenseFund;
      const allocationAmount = totalCash - totalDeductions;

      if (allocationAmount <= 0) {
        throw new Error('Allocation amount would be zero or negative after deductions');
      }

      const accountantName = `${currentUser.employee?.firstName || ''} ${currentUser.employee?.lastName || ''}`.trim() || 'Accountant';

      // 1. Update the cashCloses collection status to "ALLOCATED"
      try {
        const cashCloseRef = doc(db, 'cashCloses', cashClose.id);
        await updateDoc(cashCloseRef, {
          status: 'allocated',
          allocatedAt: serverTimestamp(),
          allocatedBy: currentUser.uid,
          allocatedTo: selectedPM,
          allocationAmount: allocationAmount,
          profitDeduction: profitDeduction,
          monthlyExpenseFund: monthlyExpenseFund,
          totalDeductions: totalDeductions
        });
      } catch (updateError) {
        console.warn('Could not update cash close status:', updateError);
        // Don't fail the entire allocation process if this update fails
      }

      // 2. Insert into cashAllocations collection
      const businessDate = cashClose.businessDate || cashClose.date || new Date().toISOString().split('T')[0];

      const cashAllocationData = {
        allocatedBy: currentUser.uid,
        allocatedTo: selectedPM,
        allocationDate: serverTimestamp(),
        allocatorName: accountantName,
        amount: allocationAmount,
        branchId: "kyengera",
        createdAt: serverTimestamp(),
        recipientName: selectedPMUser.name,
        status: "pending",
        cashCloseId: cashClose.id,
        businessDate: businessDate,
        shiftType: 'day', // Default to day shift for overview allocations
        description: `Overview allocation - Total: ${totalCash.toLocaleString()}, Profit deducted: ${profitDeduction.toLocaleString()}`,
        monthlyExpenseFund: monthlyExpenseFund,
        profitDeduction: profitDeduction,
        totalDeductions: totalDeductions
      };

      // Validate required fields
      const requiredFields = ['allocatedBy', 'allocatedTo', 'allocatorName', 'amount', 'recipientName', 'status', 'businessDate', 'shiftType'];
      const missingFields = requiredFields.filter(field => !cashAllocationData[field]);

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields in cash allocation: ${missingFields.join(', ')}`);
      }

      const cashAllocationRef = await addDoc(collection(db, 'cashAllocations'), cashAllocationData);

      // 3. Keep the existing allocation_PM record for backward compatibility
      const allocationData = {
        pmId: selectedPM,
        pmName: selectedPMUser.name,
        amount: allocationAmount,
        description: `Overview allocation - Total: ${totalCash.toLocaleString()}, Profit deducted: ${profitDeduction.toLocaleString()}`,
        shiftType: 'day',
        businessDate: businessDate,
        status: 'sent',
        accountantId: currentUser.uid,
        accountantName: accountantName,
        cashCloseId: cashClose.id,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'allocation_PM'), allocationData);

      // Optimistic update — remove from overview immediately
      setAllCashCloses(prev => prev.filter(cc => cc.id !== cashClose.id));
      setAllocatedCashCloses(prev => [...prev, {
        ...cashClose,
        status: 'allocated',
        allocationAmount,
        profitDeduction,
        monthlyExpenseFund,
        totalDeductions,
        allocatedTo: selectedPM,
        allocatedToName: selectedPMUser.name,
        allocatedByName: accountantName,
        allocatedBy: currentUser.uid,
        allocatedAt: new Date(),
      }]);

      // Background reload to sync any server-side changes
      loadData();

      const amountText = allocationAmount.toLocaleString();
      alert(`✅ Allocation of UGX ${amountText} sent successfully to ${selectedPMUser.name} for cash close ${cashClose.id.slice(-8)}!`);

    } catch (error: any) {
      console.error('❌ Error sending overview allocation:', error);
      setError(`Failed to send overview allocation: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleSubmitCashClose = async (cashClose: any) => {
    if (!cashClose || !cashClose.id) {
      setError('Invalid cash close record');
      return;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      setError('You must be logged in to submit cash closes');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const submittedByName = `${currentUser.employee?.firstName || ''} ${currentUser.employee?.lastName || ''}`.trim() || currentUser.email || 'Unknown';

      // Update the cashCloses collection status to "submitted"
      const cashCloseRef = doc(db, 'cashCloses', cashClose.id);
      await updateDoc(cashCloseRef, {
        status: 'submitted',
        submittedAt: serverTimestamp(),
        submittedBy: currentUser.uid,
        submittedByName,
      });

      // Optimistic update — flip status in local state immediately so record moves to submitted
      setAllCashCloses(prev =>
        prev.map(cc => cc.id === cashClose.id ? { ...cc, status: 'submitted', createdBy: currentUser.uid } : cc)
      );

      // Background reload to sync
      loadData();

      const amountText = (cashClose.totalCashInTill || 0).toLocaleString();
      alert(`✅ Cash close for ${cashClose.businessDate || cashClose.date || 'N/A'} (${cashClose.shifts?.[0]?.shift || 'Unknown'} shift) has been submitted for allocation!\nTotal Amount: UGX ${amountText}`);

    } catch (error: any) {
      console.error('❌ Error submitting cash close:', error);
      setError(`Failed to submit cash close: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };


  const isAllocationAlreadySent = (cashCloseId: string, shiftType: string) => {
    return allocations.some(alloc => 
      alloc.cashCloseId === cashCloseId && 
      alloc.shiftType === shiftType &&
      alloc.status !== 'confirmed'
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">Sent</span>;
      case 'received':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Received</span>;
      case 'confirmed':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Confirmed</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">Unknown</span>;
    }
  };

  const formatDate = (timestamp: any) => {
    return timestamp?.toDate?.()?.toLocaleDateString() || new Date().toLocaleDateString();
  };

  const formatCreatedAt = (timestamp: any) => {
    if (!timestamp) return 'N/A';

    try {
      let date: Date;

      // Handle Firestore Timestamp
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      }
      // Handle regular Date object
      else if (timestamp instanceof Date) {
        date = timestamp;
      }
      // Handle string timestamp
      else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
        if (isNaN(date.getTime())) return 'Invalid Date';
      }
      // Handle number timestamp (milliseconds)
      else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
        if (isNaN(date.getTime())) return 'Invalid Date';
      }
      else {
        return 'Invalid Date';
      }

      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInHours / 24);

      let timeAgo = '';
      let urgencyColor = 'text-green-600';

      if (diffInHours < 1) {
        timeAgo = 'Just now';
        urgencyColor = 'text-green-500 font-semibold';
      } else if (diffInHours < 6) {
        timeAgo = `${diffInHours}h ago`;
        urgencyColor = 'text-blue-600';
      } else if (diffInHours < 24) {
        timeAgo = `${diffInHours}h ago`;
        urgencyColor = 'text-orange-600';
      } else if (diffInDays < 3) {
        timeAgo = `${diffInDays}d ago`;
        urgencyColor = 'text-orange-700';
      } else if (diffInDays < 7) {
        timeAgo = `${diffInDays}d ago`;
        urgencyColor = 'text-red-600';
      } else {
        timeAgo = date.toLocaleDateString();
        urgencyColor = 'text-red-700 font-semibold';
      }

      const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return { timeString, timeAgo, urgencyColor, fullDisplay: `${timeString} (${timeAgo})` };

    } catch (error) {
      console.warn('Error formatting createdAt timestamp:', error);
      return {
        timeString: 'Error',
        timeAgo: 'formatting date',
        urgencyColor: 'text-red-600',
        fullDisplay: 'Error formatting date'
      };
    }
  };

  /** Synchronously resolve a UID to a display name using the already-loaded pmUsers list.
   *  Falls back to a friendly shortened ID rather than exposing the raw UID. */
  const resolveName = (uid: string | undefined): string => {
    if (!uid) return 'Unknown';
    const match = pmUsers.find(pm => pm.uid === uid);
    if (match) return match.name;
    return `User …${uid.slice(-5)}`;
  };

  const ugx = (n: number) => `UGX ${n.toLocaleString()}`;

  // Function to get employee name by ID
  const getEmployeeName = async (employeeId: string): Promise<string> => {
    if (!employeeId || employeeId === 'system' || employeeId === 'unknown') {
      return 'System';
    }

    try {
      // First check if we already have this employee in our pmUsers list
      const existingPM = pmUsers.find(pm => pm.uid === employeeId);
      if (existingPM) {
        return existingPM.name;
      }

      // Otherwise, fetch from employees collection
      const employeeDoc = await getDoc(doc(db, 'employees', employeeId));
      if (employeeDoc.exists()) {
        const data = employeeDoc.data();
        const fullName = `${data.firstName || 'Unknown'} ${data.lastName || 'User'}`.trim();
        return fullName;
      }

      // If direct lookup fails, try searching by other fields that might contain the employeeId
      const employeesSnapshot = await getDocs(collection(db, 'employees'));

      for (const doc of employeesSnapshot.docs) {
        const data = doc.data();
        // Check if this employee document contains the employeeId in any field
        if (data.employeeId === employeeId ||
            data.uid === employeeId ||
            doc.id === employeeId ||
            data.userId === employeeId) {
          const fullName = `${data.firstName || 'Unknown'} ${data.lastName || 'User'}`.trim();
          return fullName;
        }
      }

      return 'Unknown User';
    } catch (error) {
      console.warn('Error fetching employee name:', error, { employeeId });
      return 'Unknown User';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-5 bg-white rounded-3xl p-12 shadow-xl border border-slate-100 text-center">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-[3px] border-slate-100" />
            <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-indigo-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Send className="w-5 h-5 text-indigo-500" />
            </div>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-800">Loading Allocations</p>
            <p className="text-sm text-slate-400 mt-1">Fetching cash closes and PM data…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 space-y-5">

      {/* ── Hero Header ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 p-6 sm:p-8 shadow-lg">
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-40 h-40 rounded-full bg-indigo-300/20 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-200">Accountant Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Allocation Processing</h1>
            <p className="text-indigo-200 mt-1.5 text-sm leading-relaxed">Review submitted cash closes and dispatch funds to purchase managers</p>
            <div className="flex flex-wrap gap-2.5 mt-4">
              {[
                { dot: 'bg-emerald-400', label: `${cashCloses.length} submitted` },
                { dot: 'bg-amber-400', label: `${allCashCloses.filter(cc => cc.status !== 'allocated' && cc.status !== 'submitted').length} pending` },
                { dot: 'bg-blue-300', label: `${allocatedCashCloses.length} allocated` },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  <span className="text-xs text-white/90">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={loadData}
            className="flex items-center gap-2 self-start sm:self-auto shrink-0 bg-white/10 hover:bg-white/20 active:bg-white/25 border border-white/25 rounded-xl px-5 py-2.5 text-white text-sm font-medium transition-all duration-150"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl bg-rose-50 border border-rose-200 px-5 py-4">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
          <p className="text-sm text-rose-800 font-medium">{error}</p>
        </div>
      )}

      {/* ── PM Selection ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Purchase Manager</h2>
            <p className="text-xs text-slate-400 mt-0.5">Select a PM to load their submitted cash closes</p>
          </div>
        </div>

        <div className="p-6 space-y-3">
          <select
            value={selectedPM}
            onChange={(e) => setSelectedPM(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 hover:bg-white px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
          >
            <option value="">Choose a Purchase Manager…</option>
            {pmUsers.map((pm) => (
              <option key={pm.uid} value={pm.uid}>{pm.name} ({pm.email})</option>
            ))}
          </select>

          {selectedPM ? (
            <div className="flex items-center gap-3 rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-indigo-900 truncate">{pmUsers.find(pm => pm.uid === selectedPM)?.name}</p>
                <p className="text-xs text-indigo-400 truncate">{pmUsers.find(pm => pm.uid === selectedPM)?.email}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-indigo-600 bg-indigo-100 border border-indigo-200 rounded-full px-2.5 py-1">Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 border-dashed px-4 py-3">
              <AlertCircle className="w-4 h-4 text-slate-300 shrink-0" />
              <span className="text-sm text-slate-400">No purchase manager selected yet</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Suggested Allocations ────────────────────────────────────── */}
      {selectedPM && suggestedAllocations.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Suggested Allocations</h2>
                <p className="text-xs text-slate-400 mt-0.5">{pmUsers.find(pm => pm.uid === selectedPM)?.name} · Ready to dispatch</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
              {suggestedAllocations.filter(s => {
                if (s.branchId === 'test_branch') return false;
                const currentYear = new Date().getFullYear();
                try {
                  const date = s.createdAt?.toDate?.() || new Date(s.createdAt);
                  return !isNaN(date.getTime()) && date.getFullYear() >= currentYear;
                } catch { return true; }
              }).length} available
            </span>
          </div>

          <div className="p-6 space-y-4">
            {suggestedAllocations
              .filter(s => !isAllocationAlreadySent(s.cashCloseId, s.shiftType))
              .filter(s => {
                if (s.branchId === 'test_branch') return false;
                const currentYear = new Date().getFullYear();
                try {
                  const date = s.createdAt?.toDate?.() || new Date(s.createdAt);
                  return !isNaN(date.getTime()) && date.getFullYear() >= currentYear;
                } catch { return true; }
              })
              .map((suggestion, index) => (
              <div key={index} className="rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all duration-200 overflow-hidden bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800 text-sm">
                      {new Date(suggestion.businessDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="capitalize text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5">
                      {suggestion.shiftType} shift
                    </span>
                    {suggestion.branchId && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />{suggestion.branchId}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {(() => {
                        const r = formatCreatedAt(suggestion.createdAt);
                        return typeof r === 'object' ? <span className={r.urgencyColor}>{r.timeAgo}</span> : r;
                      })()}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {suggestion.createdByName === 'Loading...'
                        ? <><RefreshCw className="w-3 h-3 animate-spin" /> Loading</>
                        : suggestion.createdByName}
                    </span>
                    <span className="font-mono text-slate-300 text-[11px]">#{suggestion.cashCloseId.slice(-6)}</span>
                  </div>
                </div>

                {/* Financial breakdown */}
                <div className="mx-4 mb-3 rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
                  <div className="grid grid-cols-4 divide-x divide-slate-100">
                    <div className="p-3 text-center">
                      <p className="text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Cash in Till</p>
                      <p className="text-sm font-bold text-slate-800">{ugx(suggestion.totalCash)}</p>
                    </div>
                    <div className="p-3 text-center">
                      <p className="text-[10px] font-semibold text-rose-400 mb-1 uppercase tracking-wider">Profit 12%</p>
                      <p className="text-sm font-bold text-rose-600">−{ugx(suggestion.profitDeduction)}</p>
                    </div>
                    <div className="p-3 text-center">
                      <p className="text-[10px] font-semibold text-amber-500 mb-1 uppercase tracking-wider">Exp. Fund</p>
                      <p className={`text-sm font-bold ${suggestion.monthlyExpenseFund > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                        {suggestion.monthlyExpenseFund > 0 ? `−${ugx(suggestion.monthlyExpenseFund)}` : '—'}
                      </p>
                    </div>
                    <div className="p-3 text-center">
                      <p className="text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Deducted</p>
                      <p className="text-sm font-bold text-slate-700">−{ugx(suggestion.totalDeductions)}</p>
                    </div>
                  </div>
                </div>

                {/* Action footer */}
                <div className="flex items-center justify-between bg-emerald-50 border-t border-emerald-100 px-4 py-3">
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">Allocation Amount</p>
                    <p className="text-lg font-bold text-emerald-800">UGX {suggestion.suggestedAmount.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => {
                      const cashClose = cashCloses.find(cc => cc.id === suggestion.cashCloseId);
                      if (cashClose) handleSendAllocationFromOverview(cashClose);
                    }}
                    disabled={sending || !selectedPM}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all duration-150 disabled:opacity-40 shadow-sm shadow-emerald-200"
                  >
                    {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send
                  </button>
                </div>
              </div>
            ))}

            {suggestedAllocations
              .filter(s => !isAllocationAlreadySent(s.cashCloseId, s.shiftType))
              .filter(s => {
                if (s.branchId === 'test_branch') return false;
                const currentYear = new Date().getFullYear();
                try {
                  const date = s.createdAt?.toDate?.() || new Date(s.createdAt);
                  return !isNaN(date.getTime()) && date.getFullYear() >= currentYear;
                } catch { return true; }
              }).length === 0 && (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-emerald-500" />
                </div>
                <p className="font-semibold text-slate-700">All caught up</p>
                <p className="text-sm text-slate-400 mt-1">All cash closes for this PM have been allocated.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Cash Closes Overview ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Cash Closes Overview</h2>
              <p className="text-xs text-slate-400 mt-0.5">Submit pending records to make them available for allocation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
              {allCashCloses.filter(cc => cc.status !== 'allocated' && cc.status !== 'submitted').length} pending
            </span>
            <span className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1">
              {allCashCloses.filter(cc => cc.status === 'allocated').length} allocated
            </span>
          </div>
        </div>

        <div className="p-6">
          {allCashCloses.filter(cc => cc.status !== 'allocated' && cc.status !== 'submitted').length === 0 ? (
            <div className="text-center py-14">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-300" />
              </div>
              <p className="font-semibold text-slate-600">
                {allCashCloses.length === 0 ? 'No Cash Closes Found' : 'Nothing Pending Submission'}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {allCashCloses.length === 0
                  ? 'No cash close records exist in the database.'
                  : 'All records have been submitted or allocated.'}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Status pipeline */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Pending Submit', value: allCashCloses.filter(cc => cc.status !== 'allocated' && cc.status !== 'submitted').length, icon: <Clock className="w-4 h-4" />, color: 'text-violet-700', iconColor: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-200' },
                  { label: 'Submitted', value: allCashCloses.filter(cc => cc.status === 'submitted').length, icon: <CheckCircle className="w-4 h-4" />, color: 'text-emerald-700', iconColor: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                  { label: 'Completed', value: allCashCloses.filter(cc => cc.status === 'completed').length, icon: <TrendingUp className="w-4 h-4" />, color: 'text-blue-700', iconColor: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
                  { label: 'Allocated', value: allCashCloses.filter(cc => cc.status === 'allocated').length, icon: <Send className="w-4 h-4" />, color: 'text-indigo-700', iconColor: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-200' },
                ].map((s, i) => (
                  <div key={i} className={`rounded-xl ${s.bg} border ${s.border} p-4 flex items-center gap-3`}>
                    <div className={`${s.iconColor} shrink-0`}>{s.icon}</div>
                    <div>
                      <p className={`text-2xl font-bold ${s.color} leading-none`}>{s.value}</p>
                      <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Records list */}
              <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-1">
                {allCashCloses.filter(cc => cc.status !== 'allocated' && cc.status !== 'submitted').map((cashClose) => {
                  const totalCash: number = (() => {
                    if ((cashClose.totalCashInTill || 0) > 0) return cashClose.totalCashInTill;
                    if ((cashClose.totalRevenue || 0) > 0) return cashClose.totalRevenue;
                    if ((cashClose.closeCash || 0) > 0) return cashClose.closeCash;
                    if (Array.isArray(cashClose.shifts)) {
                      const sum = cashClose.shifts.reduce((s: number, shift: any) =>
                        s + (Array.isArray(shift.tills)
                          ? shift.tills.reduce((ts: number, t: any) => ts + (t.totalCashInTill || t.cashAmount || 0), 0)
                          : 0), 0);
                      if (sum > 0) return sum;
                    }
                    return 0;
                  })();

                  const dateStr: string = (() => {
                    const raw = cashClose.businessDate || cashClose.cashCloseDate || cashClose.date;
                    if (raw) {
                      const d = new Date(raw);
                      if (!isNaN(d.getTime())) return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                    }
                    try {
                      const d = cashClose.createdAt?.toDate?.() || (cashClose.createdAt ? new Date(cashClose.createdAt) : null);
                      if (d && !isNaN(d.getTime())) return `~${d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                    } catch {}
                    return 'Date unknown';
                  })();

                  const shiftLabel: string =
                    cashClose.shifts?.[0]?.shift || cashClose.shiftType || cashClose.shift || null;

                  const profitDeduction = Math.round(totalCash * 0.12);
                  const monthlyFund = cashClose.m_expenseFund || cashClose.m_expensefund || 0;
                  const totalDeductions = profitDeduction + monthlyFund;
                  const allocationAmount = totalCash - totalDeductions;
                  const isIncomplete = totalCash === 0 || !shiftLabel || dateStr === 'Date unknown';

                  return (
                    <div key={cashClose.id} className={`rounded-xl border bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
                      isIncomplete ? 'border-amber-200' : 'border-slate-200 hover:border-violet-300'
                    }`}>
                      {isIncomplete && (
                        <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-100 px-4 py-2.5 text-xs text-amber-800">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                          <span><strong>Incomplete record</strong> — some fields are missing or zero. Review this entry.</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800 text-sm">{dateStr}</span>
                          {shiftLabel ? (
                            <span className="capitalize text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-2.5 py-0.5">
                              {shiftLabel} shift
                            </span>
                          ) : (
                            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5">Shift unknown</span>
                          )}
                          {cashClose.branchId && cashClose.branchId !== 'test_branch' && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />{cashClose.branchId}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {cashClose.status ? (
                            <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${
                              cashClose.status === 'submitted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              cashClose.status === 'completed' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              'bg-slate-50 text-slate-600 border border-slate-200'
                            }`}>{cashClose.status.toUpperCase()}</span>
                          ) : (
                            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5">NO STATUS</span>
                          )}
                          <span className="text-xs text-slate-300 font-mono text-[11px]">#{cashClose.id.slice(-6)}</span>
                        </div>
                      </div>

                      {/* Meta row */}
                      <div className="flex flex-wrap gap-4 text-xs text-slate-400 px-4 py-2 bg-slate-50/70 border-y border-slate-100">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span className="font-medium text-slate-500">Created:</span>
                          {(() => { const r = formatCreatedAt(cashClose.createdAt); return typeof r === 'object' ? <span className={r.urgencyColor}>{r.fullDisplay}</span> : r; })()}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <User className="w-3 h-3 shrink-0" />
                          <span className="font-medium text-slate-500">By:</span>
                          <span className="text-slate-700">{resolveName(cashClose.createdBy)}</span>
                        </span>
                      </div>

                      {/* Financial breakdown */}
                      <div className="mx-4 my-3 rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
                        <div className="grid grid-cols-4 divide-x divide-slate-100">
                          <div className="p-3 text-center">
                            <p className="text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Cash in Till</p>
                            <p className={`text-sm font-bold ${totalCash > 0 ? 'text-slate-800' : 'text-amber-500'}`}>
                              {totalCash > 0 ? ugx(totalCash) : 'Missing'}
                            </p>
                          </div>
                          <div className="p-3 text-center">
                            <p className="text-[10px] font-semibold text-rose-400 mb-1 uppercase tracking-wider">Profit 12%</p>
                            <p className="text-sm font-bold text-rose-600">−{ugx(profitDeduction)}</p>
                          </div>
                          <div className="p-3 text-center">
                            <p className="text-[10px] font-semibold text-amber-500 mb-1 uppercase tracking-wider">Exp. Fund</p>
                            <p className={`text-sm font-bold ${monthlyFund > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                              {monthlyFund > 0 ? `−${ugx(monthlyFund)}` : '—'}
                            </p>
                          </div>
                          <div className="p-3 text-center">
                            <p className="text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">Deducted</p>
                            <p className="text-sm font-bold text-slate-700">−{ugx(totalDeductions)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Footer: allocation + actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-4">
                        <div className={`rounded-xl px-4 py-2.5 ${isIncomplete ? 'bg-amber-50 border border-amber-100' : 'bg-violet-50 border border-violet-100'}`}>
                          <p className={`text-xs font-medium ${isIncomplete ? 'text-amber-600' : 'text-violet-600'}`}>
                            {isIncomplete ? 'Cannot calculate — data incomplete' : 'Suggested Allocation'}
                          </p>
                          <p className={`text-lg font-bold ${isIncomplete ? 'text-amber-700' : 'text-violet-800'}`}>
                            {isIncomplete ? '—' : ugx(allocationAmount)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {cashClose.status !== 'submitted' && cashClose.status !== 'allocated' && (
                            <button
                              onClick={() => handleSubmitCashClose(cashClose)}
                              disabled={submitting}
                              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3.5 py-2 rounded-xl transition-all disabled:opacity-50"
                            >
                              {submitting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                              Submit
                            </button>
                          )}
                          <button
                            onClick={() => handleSendAllocationFromOverview(cashClose)}
                            disabled={sending || !selectedPM || cashClose.status !== 'submitted'}
                            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all disabled:opacity-40 shadow-sm shadow-violet-200"
                          >
                            {sending ? <RefreshCw className="w-3 h-3 animate-spin" /> :
                              cashClose.status === 'submitted' ? <Send className="w-3 h-3" /> :
                              <Clock className="w-3 h-3" />}
                            {cashClose.status === 'submitted' ? 'Send' : 'Awaiting Submit'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Summary Stats ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Processing Statistics</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedPM ? `Filtered for ${pmUsers.find(pm => pm.uid === selectedPM)?.name}` : 'Aggregate across all cash closes'}
            </p>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: selectedPM ? "PM's Submitted" : 'Total Submitted',
                value: cashCloses.length,
                sub: 'cash closes',
                icon: <FileText className="w-5 h-5" />,
                color: 'text-amber-700',
                iconColor: 'text-amber-500',
                bg: 'bg-amber-50',
                border: 'border-amber-200',
              },
              {
                label: 'Total Suggested',
                value: `UGX ${suggestedAllocations.reduce((s, a) => s + a.suggestedAmount, 0).toLocaleString()}`,
                sub: 'to be allocated',
                icon: <Send className="w-5 h-5" />,
                color: 'text-blue-700',
                iconColor: 'text-blue-500',
                bg: 'bg-blue-50',
                border: 'border-blue-200',
              },
              {
                label: 'Profit Deductions',
                value: `UGX ${suggestedAllocations.reduce((s, a) => s + a.profitDeduction, 0).toLocaleString()}`,
                sub: '12% retained',
                icon: <TrendingUp className="w-5 h-5" />,
                color: 'text-emerald-700',
                iconColor: 'text-emerald-500',
                bg: 'bg-emerald-50',
                border: 'border-emerald-200',
              },
              {
                label: 'Total Deductions',
                value: `UGX ${suggestedAllocations.reduce((s, a) => s + a.totalDeductions, 0).toLocaleString()}`,
                sub: 'profit + expenses',
                icon: <Calculator className="w-5 h-5" />,
                color: 'text-indigo-700',
                iconColor: 'text-indigo-500',
                bg: 'bg-indigo-50',
                border: 'border-indigo-200',
              },
            ].map((stat, i) => (
              <div key={i} className={`rounded-xl ${stat.bg} border ${stat.border} p-4`}>
                <div className={`${stat.iconColor} mb-2.5`}>{stat.icon}</div>
                <p className={`text-lg font-bold ${stat.color} leading-tight`}>{stat.value}</p>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">{stat.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Allocations ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Recent Allocations</h2>
              <p className="text-xs text-slate-400 mt-0.5">Funds dispatched to purchase managers</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5">
            {allocatedCashCloses.length} records
          </span>
        </div>

        <div className="p-6">
          {allocatedCashCloses.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-8 h-8 text-slate-300" />
              </div>
              <p className="font-semibold text-slate-600">No Allocated Records Yet</p>
              <p className="text-sm text-slate-400 mt-1">Allocated cash closes will appear here once sent.</p>
            </div>
          ) : (
            <div className="space-y-5">

              {/* KPI strip */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: 'Total Dispatched',
                    value: allocatedCashCloses.length,
                    icon: <CheckCircle className="w-4 h-4" />,
                    color: 'text-slate-700',
                    iconColor: 'text-slate-500',
                    bg: 'bg-slate-50',
                    border: 'border-slate-200',
                  },
                  {
                    label: 'Total Amount',
                    value: `UGX ${allocatedCashCloses.reduce((s, cc) => s + (cc.allocationAmount || 0), 0).toLocaleString()}`,
                    icon: <DollarSign className="w-4 h-4" />,
                    color: 'text-emerald-700',
                    iconColor: 'text-emerald-500',
                    bg: 'bg-emerald-50',
                    border: 'border-emerald-200',
                  },
                  {
                    label: 'PMs Covered',
                    value: new Set(allocatedCashCloses.map(cc => cc.allocatedTo)).size,
                    icon: <User className="w-4 h-4" />,
                    color: 'text-indigo-700',
                    iconColor: 'text-indigo-500',
                    bg: 'bg-indigo-50',
                    border: 'border-indigo-200',
                  },
                ].map((kpi, i) => (
                  <div key={i} className={`rounded-xl ${kpi.bg} border ${kpi.border} p-4 flex items-center gap-3`}>
                    <div className={`${kpi.iconColor} shrink-0`}>{kpi.icon}</div>
                    <div>
                      <p className={`text-lg font-bold ${kpi.color} leading-none`}>{kpi.value}</p>
                      <p className="text-xs text-slate-500 mt-1">{kpi.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Timeline list */}
              <div className="relative max-h-[36rem] overflow-y-auto pr-1">
                <div className="absolute left-[18px] top-3 bottom-3 w-px bg-slate-100" />
                <div className="space-y-3">
                  {[...allocatedCashCloses]
                    .sort((a, b) => {
                      const dA = a.allocatedAt?.toDate?.() || new Date(a.allocatedAt || 0);
                      const dB = b.allocatedAt?.toDate?.() || new Date(b.allocatedAt || 0);
                      return dB.getTime() - dA.getTime();
                    })
                    .slice(0, 15)
                    .map((cashClose, index) => {
                      const dateStr = (() => {
                        const d = cashClose.businessDate || cashClose.date;
                        return d ? new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
                      })();
                      const allocatedAt = (() => {
                        const r = formatCreatedAt(cashClose.allocatedAt);
                        return typeof r === 'object' ? r : null;
                      })();

                      return (
                        <div key={cashClose.id} className="relative pl-10">
                          <div className="absolute left-0 top-4 w-9 h-9 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shadow-sm z-10">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 overflow-hidden">
                            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-50">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-800 text-sm">{dateStr}</span>
                                <span className="capitalize text-xs font-medium bg-slate-100 text-slate-600 rounded-full px-2.5 py-0.5">
                                  {cashClose.shifts?.[0]?.shift || cashClose.shiftType || 'Unknown'} shift
                                </span>
                                {cashClose.branchId && cashClose.branchId !== 'test_branch' && (
                                  <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />{cashClose.branchId}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                                  <CheckCircle className="w-3 h-3" /> Allocated
                                </span>
                                <span className="text-xs text-slate-300 font-mono text-[11px]">#{cashClose.id.slice(-6)}</span>
                              </div>
                            </div>

                            {/* People row */}
                            <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
                              <div className="bg-white px-4 py-2.5">
                                <p className="text-xs text-slate-400 mb-0.5">Sent to</p>
                                <p className="text-sm font-semibold text-slate-800 truncate">
                                  {cashClose.allocatedToName || resolveName(cashClose.allocatedTo)}
                                </p>
                              </div>
                              <div className="bg-white px-4 py-2.5">
                                <p className="text-xs text-slate-400 mb-0.5">Sent by</p>
                                <p className="text-sm font-medium text-slate-600 truncate">
                                  {cashClose.allocatedByName || resolveName(cashClose.allocatedBy)}
                                </p>
                              </div>
                            </div>

                            {/* Financial strip */}
                            <div className="mx-3 my-2.5 rounded-lg border border-slate-100 bg-slate-50 overflow-hidden">
                              <div className="grid grid-cols-4 divide-x divide-slate-100">
                                <div className="px-3 py-2 text-center">
                                  <p className="text-[10px] font-semibold text-slate-400 mb-0.5 uppercase tracking-wider">Cash in Till</p>
                                  <p className="text-xs font-bold text-slate-800">{ugx(cashClose.totalCashInTill || 0)}</p>
                                </div>
                                <div className="px-3 py-2 text-center">
                                  <p className="text-[10px] font-semibold text-rose-400 mb-0.5 uppercase tracking-wider">Profit 12%</p>
                                  <p className="text-xs font-bold text-rose-600">−{ugx(cashClose.profitDeduction || 0)}</p>
                                </div>
                                <div className="px-3 py-2 text-center">
                                  <p className="text-[10px] font-semibold text-amber-500 mb-0.5 uppercase tracking-wider">Exp. Fund</p>
                                  <p className="text-xs font-bold text-amber-600">
                                    {(cashClose.monthlyExpenseFund || 0) > 0 ? `−${ugx(cashClose.monthlyExpenseFund)}` : '—'}
                                  </p>
                                </div>
                                <div className="px-3 py-2 text-center bg-emerald-50">
                                  <p className="text-[10px] font-semibold text-emerald-500 mb-0.5 uppercase tracking-wider">Sent</p>
                                  <p className="text-xs font-bold text-emerald-700">{ugx(cashClose.allocationAmount || 0)}</p>
                                </div>
                              </div>
                            </div>

                            {allocatedAt && (
                              <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50/60 border-t border-slate-100">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="text-xs text-slate-400">Dispatched</span>
                                <span className={`text-xs font-medium ${allocatedAt.urgencyColor}`}>{allocatedAt.fullDisplay}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}