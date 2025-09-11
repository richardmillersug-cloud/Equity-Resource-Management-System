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

  // Reload data when PM selection changes
  useEffect(() => {
    if (selectedPM) {
      loadData(selectedPM);
    } else {
      // If no PM selected, load all submitted cash closes
      loadData();
    }
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
        const role = data.roles?.[0]?.jobTitle;

        if (role === 'Purchase Manager' || role === 'Purchasing Manager') {
          pmUsersData.push({
            uid: doc.id,
            name: `${data.firstName || 'Unknown'} ${data.lastName || 'User'}`,
            email: data.email || 'No email'
          });
        }
      });

      setPmUsers(pmUsersData);

      // Load submitted cash closes for allocation processing
      try {
        // Query cashCloses collection with enforced status filter
        // If PM is selected, filter by createdBy field as well
        let cashClosesQuery;
        if (pmFilter) {
          cashClosesQuery = query(
            collection(db, 'cashCloses'),
            where('status', '==', 'submitted'),
            where('createdBy', '==', pmFilter),
            orderBy('createdAt', 'desc')
          );
        } else {
          cashClosesQuery = query(
            collection(db, 'cashCloses'),
            where('status', '==', 'submitted'),
            orderBy('createdAt', 'desc')
          );
        }
        const cashClosesSnapshot = await getDocs(cashClosesQuery);

        // Process cash closes data - only those with status = "submitted"
        const submittedCashCloses = cashClosesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

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

          if (cashClose.shifts && Array.isArray(cashClose.shifts)) {
            cashClose.shifts.forEach(shift => {
              const shiftTotalCash = shift.tills.reduce((sum, till) => sum + (till.totalCashInTill || 0), 0);
              const profitDeduction = Math.round(shiftTotalCash * 0.12); // 12% profit

              // Check if monthly expense fund was enabled in the form (from m_expensefund field)
              const monthlyExpenseFund = cashClose.m_expensefund || 0; // Use the form's setting, default to 0 if not set


              // Calculate total deductions and final suggested amount
              const totalDeductions = profitDeduction + monthlyExpenseFund;
              const suggestedAmount = shiftTotalCash - totalDeductions;

              if (suggestedAmount > 0) {
                suggestions.push({
                  cashCloseId: cashClose.id,
                  shiftType: shift.shift,
                  totalCash: shiftTotalCash,
                  suggestedAmount: suggestedAmount,
                  profitDeduction: profitDeduction,
                  monthlyExpenseFund: monthlyExpenseFund,
                  totalDeductions: totalDeductions,
                  businessDate: cashClose.businessDate || cashClose.date || new Date().toISOString().split('T')[0],
                  createdAt: cashClose.createdAt,
                  branchId: cashClose.branchId,
                  createdBy: cashClose.createdBy || 'unknown',
                  createdByName: 'Loading...', // Will be updated after async lookup
                });
              }
            });
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

        const allCashClosesData = allCashClosesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

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

      const docRef = await addDoc(collection(db, 'allocation_PM'), allocationData);

      // Reload data to reflect changes
      await loadData();

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
      // Update the cashCloses collection status to "submitted"
      const cashCloseRef = doc(db, 'cashCloses', cashClose.id);
      await updateDoc(cashCloseRef, {
        status: 'submitted',
        submittedAt: serverTimestamp(),
        submittedBy: currentUser.uid,
        submittedByName: `${currentUser.employee?.firstName || ''} ${currentUser.employee?.lastName || ''}`.trim() || currentUser.email || 'Unknown'
      });

      // Reload data to reflect changes
      await loadData();

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
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <div className="ml-4 text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Zap className="w-8 h-8 mr-3 text-yellow-500" />
            Cash Close Allocation Processing
          </h1>
          <p className="text-gray-600 mt-2">Process submitted cash closes and allocate funds to purchase managers</p>
        </div>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>


      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center text-red-800">
              <AlertCircle className="w-5 h-5 mr-2" />
              <strong>{error}</strong>
            </div>
          </CardContent>
        </Card>
      )}


      {/* PM Selection - Required for all allocations */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <User className="w-5 h-5 mr-2" />
            Select Purchase Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedPM}
            onChange={(e) => setSelectedPM(e.target.value)}
            className="w-full p-3 border border-blue-300 rounded-lg text-lg"
            required
          >
            <option value="">Choose a Purchase Manager...</option>
            {pmUsers.map((pm) => (
              <option key={pm.uid} value={pm.uid}>
                {pm.name} ({pm.email})
              </option>
            ))}
          </select>
          {selectedPM ? (
            <div className="mt-2 p-2 bg-blue-50 rounded">
              <span className="text-blue-800 text-sm">
                ✅ Selected: {pmUsers.find(pm => pm.uid === selectedPM)?.name}
              </span>
              <div className="text-xs text-blue-600 mt-1">
                Showing only submitted cash closes created by this PM
              </div>
            </div>
          ) : (
            <div className="mt-2 p-2 bg-gray-50 rounded">
              <span className="text-gray-600 text-sm">
                ℹ️ Select a PM to filter submitted cash closes by creator
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggested Allocations Based on Cash Closes */}
      {selectedPM && suggestedAllocations.length > 0 && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-green-800">
              <div className="flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Suggested Allocations from {pmUsers.find(pm => pm.uid === selectedPM)?.name}'s Submitted Cash Closes
              </div>
              <div className="text-sm text-green-600 font-medium">
                {suggestedAllocations.length} available • Filtered by selected PM
              </div>
            </CardTitle>

          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestedAllocations
                .filter(suggestion => !isAllocationAlreadySent(suggestion.cashCloseId, suggestion.shiftType))
                .map((suggestion, index) => (
                <div key={index} className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="mb-3">
                        <div className="flex items-center mb-2">
                          <Calendar className="w-4 h-4 mr-2 text-green-600" />
                          <span className="font-semibold text-green-800">
                            {new Date(suggestion.businessDate).toLocaleDateString()} - {suggestion.shiftType} shift
                          </span>
                        </div>

                        {/* Created Date and Time - Enhanced Display */}
                        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                          <div className="grid grid-cols-1 gap-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center text-xs text-blue-700">
                                <Clock className="w-3 h-3 mr-1" />
                                <span className="font-medium">Created:</span>
                              </div>
                              <div className={`text-xs font-mono ${(() => {
                                const result = formatCreatedAt(suggestion.createdAt);
                                return typeof result === 'object' ? result.urgencyColor : 'text-blue-800';
                              })()}`}>
                                {(() => {
                                  const result = formatCreatedAt(suggestion.createdAt);
                                  return typeof result === 'object' ? result.fullDisplay : result;
                                })()}
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center text-xs text-blue-700">
                                <User className="w-3 h-3 mr-1" />
                                <span className="font-medium">Created by:</span>
                              </div>
                              <div className="text-xs text-blue-800 font-medium flex items-center">
                                {suggestion.createdByName === 'Loading...' ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                    Loading...
                                  </>
                                ) : (
                                  suggestion.createdByName
                                )}
                                {/* Debug: Show raw employee ID */}
                                <span className="ml-2 text-xs text-gray-500 font-mono">
                                  ({suggestion.createdBy})
                                </span>
                              </div>
                            </div>

                            {suggestion.createdAt && (
                              <div className="text-xs text-blue-600 mt-1 pt-1 border-t border-blue-200">
                                <span className="font-medium">Full timestamp:</span>
                                <div className="font-mono mt-1">
                                  {(() => {
                                    try {
                                      const date = suggestion.createdAt?.toDate?.() || new Date(suggestion.createdAt);
                                      return date.toISOString();
                                    } catch {
                                      return 'Unable to parse';
                                    }
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Branch Information */}
                        {suggestion.branchId && (
                          <div className="flex items-center text-xs text-green-600 mb-2">
                            <Building2 className="w-3 h-3 mr-1" />
                            <span>Branch: {suggestion.branchId}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div className="bg-white p-3 rounded border">
                          <div className="text-green-700 font-medium mb-1">💰 Total Cash in Till</div>
                          <div className="text-lg font-bold text-green-800">UGX {suggestion.totalCash.toLocaleString()}</div>
                          <div className="text-xs text-green-600 mt-1">Raw amount before deductions</div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <div className="text-green-700 font-medium mb-1">📊 Deductions Breakdown</div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-red-600">12% Profit:</span>
                              <span className="font-semibold text-red-600">-UGX {suggestion.profitDeduction.toLocaleString()}</span>
                            </div>
                            {suggestion.monthlyExpenseFund > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-orange-600">Monthly Fund:</span>
                                <span className="font-semibold text-orange-600">-UGX {suggestion.monthlyExpenseFund.toLocaleString()}</span>
                              </div>
                            )}
                            <div className="border-t border-gray-300 pt-1 mt-2">
                              <div className="flex justify-between font-semibold">
                                <span>Total Deductions:</span>
                                <span className="text-red-600">UGX {suggestion.totalDeductions.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Monthly Expense Fund Deduction - Applied from form settings */}
                      {suggestion.monthlyExpenseFund > 0 && (
                        <div className="bg-orange-50 border-2 border-orange-300 rounded p-3 mb-3 relative">
                          {/* Form Setting Badge */}
                          <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                            FORM SETTING
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-orange-700">
                              <span className="text-lg mr-2">🏢</span>
                              <div>
                                <div className="font-bold text-orange-800">Monthly Expense Fund - Applied</div>
                                <div className="text-xs text-orange-600 font-medium">
                                  📝 Deduction enabled in cash close form for {new Date(suggestion.businessDate).toLocaleDateString()}
                                </div>
                                <div className="text-xs text-orange-700 mt-1">
                                  This deduction was set by the accountant in the cash close form
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-orange-800">
                                -UGX {suggestion.monthlyExpenseFund.toLocaleString()}
                              </div>
                              <div className="text-xs text-orange-600 font-medium">
                                FORM SETTING
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Additional Details Row */}
                      <div className="grid grid-cols-4 gap-3 text-sm mb-3">
                        <div className="bg-white p-2 rounded border text-center">
                          <div className="text-green-700 font-medium text-xs">Record ID</div>
                          <div className="font-mono text-xs text-green-800 mt-1">{suggestion.cashCloseId.slice(-8)}</div>
                        </div>
                        <div className="bg-white p-2 rounded border text-center">
                          <div className="text-green-700 font-medium text-xs">Shift Type</div>
                          <div className="font-semibold text-green-800 mt-1 capitalize">{suggestion.shiftType}</div>
                        </div>
                        <div className="bg-white p-2 rounded border text-center">
                          <div className="text-green-700 font-medium text-xs">Monthly Fund</div>
                          <div className={`font-semibold mt-1 ${suggestion.monthlyExpenseFund > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                            {suggestion.monthlyExpenseFund > 0
                              ? `UGX ${suggestion.monthlyExpenseFund.toLocaleString()}`
                              : 'None'
                            }
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded border text-center">
                          <div className="text-green-700 font-medium text-xs">Total Deductions</div>
                          <div className="font-semibold text-red-600 mt-1">
                            UGX {suggestion.totalDeductions.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2 p-2 bg-white rounded border">
                        <span className="text-green-700 text-sm">Suggested PM Allocation:</span>
                        <div className="text-xl font-bold text-green-600">
                          UGX {suggestion.suggestedAmount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handleSendAllocation(suggestion)}
                      disabled={sending || !selectedPM}
                      className="bg-green-600 hover:bg-green-700 ml-4"
                    >
                      {sending ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-1" />
                          Send
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
              
              {suggestedAllocations.filter(suggestion => !isAllocationAlreadySent(suggestion.cashCloseId, suggestion.shiftType)).length === 0 && (
                <div className="text-center py-4 text-green-700">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>All {pmUsers.find(pm => pm.uid === selectedPM)?.name}'s submitted cash closes have been allocated!</p>
                  <p className="text-sm text-gray-500 mt-1">Select a different PM or check back later for new submissions.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cash Closes Overview - Excluding Allocated Records */}
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-purple-800">
            <div className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Cash Closes Overview (Excluding Allocated)
            </div>
            <div className="text-sm text-purple-600 font-medium">
              {allCashCloses.filter(cc => cc.status !== 'allocated').length} available records • {allCashCloses.filter(cc => cc.status === 'allocated').length} allocated
            </div>
          </CardTitle>
          <div className="text-sm text-gray-600 mt-2">
            📋 Overview of available cash close records (excluding already allocated) - submit, allocate, or review
            <br />
            📊 Detailed financial breakdown with deductions and suggested allocations
            <br />
            🚀 Submit records for allocation or send allocations directly (select a PM first)
          </div>
        </CardHeader>
        <CardContent>
          {allCashCloses.filter(cc => cc.status !== 'allocated').length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {allCashCloses.length === 0 ? 'No Cash Closes Found' : 'All Records Already Allocated'}
              </h3>
              <p className="text-gray-500">
                {allCashCloses.length === 0
                  ? 'No cash close records exist in the database.'
                  : 'All cash close records have already been allocated. Check the Recent Allocations section below.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-purple-50 p-4 rounded-lg text-center border-2 border-purple-300">
                  <div className="text-2xl font-bold text-purple-600">
                    {allCashCloses.filter(cc => cc.status !== 'allocated').length}
                  </div>
                  <div className="text-sm text-purple-700 font-semibold">Available Records</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center border-2 border-green-300">
                  <div className="text-2xl font-bold text-green-600">
                    {allCashCloses.filter(cc => cc.status === 'submitted').length}
                  </div>
                  <div className="text-sm text-green-700 font-semibold">Ready for Allocation</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {allCashCloses.filter(cc => cc.status === 'completed').length}
                  </div>
                  <div className="text-sm text-blue-700">Completed</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {allCashCloses.filter(cc => cc.status === 'allocated').length}
                  </div>
                  <div className="text-sm text-orange-700">Already Allocated</div>
                </div>
              </div>

              {/* Cash Closes List - Excluding Allocated Records */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(() => {
                  const nonAllocatedCashCloses = allCashCloses.filter(cashClose => cashClose.status !== 'allocated');
                  return nonAllocatedCashCloses.map((cashClose, index) => (
                    <div key={cashClose.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                        {/* Header with Date, Shift and Status */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2 text-purple-600" />
                              <span className="font-bold text-purple-800 text-lg">
                                {(() => {
                                  const date = cashClose.businessDate || cashClose.date;
                                  if (date) {
                                    const dateObj = new Date(date);
                                    return dateObj.toLocaleDateString();
                                  }
                                  return 'N/A';
                                })()} - {cashClose.shifts?.[0]?.shift || 'Unknown'} shift
                              </span>
                            </div>
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                              cashClose.status === 'submitted' ? 'bg-green-100 text-green-800 border border-green-300' :
                              cashClose.status === 'completed' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                              cashClose.status === 'allocated' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                              'bg-gray-100 text-gray-800 border border-gray-300'
                            }`}>
                              {cashClose.status?.toUpperCase() || 'UNKNOWN'}
                            </span>
                          </div>

                          {/* Created Information */}
                          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                            <div className="grid grid-cols-1 gap-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center text-xs text-blue-700">
                                  <Clock className="w-3 h-3 mr-1" />
                                  <span className="font-medium">Created:</span>
                                </div>
                                <div className="text-xs font-mono text-blue-800">
                                  {(() => {
                                    const result = formatCreatedAt(cashClose.createdAt);
                                    return typeof result === 'object' ? result.fullDisplay : result;
                                  })()}
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center text-xs text-blue-700">
                                  <User className="w-3 h-3 mr-1" />
                                  <span className="font-medium">Created by:</span>
                                </div>
                                <div className="text-xs text-blue-800 font-medium flex items-center">
                                  {cashClose.createdBy || 'Unknown User'}
                                  <span className="ml-2 text-xs text-gray-500 font-mono">
                                    ({cashClose.createdBy?.slice(-8) || 'N/A'})
                                  </span>
                                </div>
                              </div>

                              {cashClose.createdAt && (
                                <div className="text-xs text-blue-600 mt-1 pt-1 border-t border-blue-200">
                                  <span className="font-medium">Full timestamp:</span>
                                  <div className="font-mono mt-1">
                                    {(() => {
                                      try {
                                        const date = cashClose.createdAt?.toDate?.() || new Date(cashClose.createdAt);
                                        return date.toISOString();
                                      } catch {
                                        return 'Unable to parse';
                                      }
                                    })()}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Branch Information */}
                          {cashClose.branchId && (
                            <div className="flex items-center text-xs text-purple-600 mb-2">
                              <Building2 className="w-3 h-3 mr-1" />
                              <span>Branch: {cashClose.branchId}</span>
                            </div>
                          )}
                        </div>

                        {/* Financial Breakdown */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-3">
                          {/* Total Cash in Till */}
                          <div className="bg-white p-3 rounded border border-green-200">
                            <div className="text-green-700 font-medium mb-1 flex items-center">
                              <span className="text-lg mr-2">💰</span>
                              Total Cash in Till
                            </div>
                            <div className="text-xl font-bold text-green-800">
                              UGX {(cashClose.totalCashInTill || 0).toLocaleString()}
                            </div>
                            <div className="text-xs text-green-600 mt-1">Raw amount before deductions</div>
                          </div>

                          {/* Deductions Breakdown */}
                          <div className="bg-white p-3 rounded border border-red-200">
                            <div className="text-red-700 font-medium mb-2 flex items-center">
                              <span className="text-lg mr-2">📊</span>
                              Deductions Breakdown
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-red-600">12% Profit:</span>
                                <span className="font-semibold text-red-600">
                                  -UGX {Math.round((cashClose.totalCashInTill || 0) * 0.12).toLocaleString()}
                                </span>
                              </div>
                              {(cashClose.m_expenseFund || cashClose.m_expensefund || 0) > 0 && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-orange-600">Monthly Fund:</span>
                                  <span className="font-semibold text-orange-600">
                                    -UGX {(cashClose.m_expenseFund || cashClose.m_expensefund || 0).toLocaleString()}
                                  </span>
                                </div>
                              )}
                              <div className="border-t border-gray-300 pt-1 mt-2">
                                <div className="flex justify-between font-semibold">
                                  <span>Total Deductions:</span>
                                  <span className="text-red-600">
                                    UGX {(() => {
                                      const profitDeduction = Math.round((cashClose.totalCashInTill || 0) * 0.12);
                                      const monthlyExpenseFund = cashClose.m_expenseFund || cashClose.m_expensefund || 0;
                                      return (profitDeduction + monthlyExpenseFund).toLocaleString();
                                    })()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Additional Details Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                          <div className="bg-white p-2 rounded border text-center">
                            <div className="text-purple-700 font-medium text-xs">Record ID</div>
                            <div className="font-mono text-xs text-purple-800 mt-1">{cashClose.id.slice(-8)}</div>
                          </div>
                          <div className="bg-white p-2 rounded border text-center">
                            <div className="text-purple-700 font-medium text-xs">Shift Type</div>
                            <div className="font-semibold text-purple-800 mt-1 capitalize">
                              {cashClose.shifts?.[0]?.shift || 'Unknown'}
                            </div>
                          </div>
                          <div className="bg-white p-2 rounded border text-center">
                            <div className="text-purple-700 font-medium text-xs">Monthly Fund</div>
                            <div className={`font-semibold mt-1 ${
                              (cashClose.m_expenseFund || cashClose.m_expensefund || 0) > 0 ? 'text-orange-600' : 'text-gray-500'
                            }`}>
                              {(cashClose.m_expenseFund || cashClose.m_expensefund || 0) > 0
                                ? `UGX ${(cashClose.m_expenseFund || cashClose.m_expensefund || 0).toLocaleString()}`
                                : 'None'
                              }
                            </div>
                          </div>
                          <div className="bg-white p-2 rounded border text-center">
                            <div className="text-purple-700 font-medium text-xs">Total Deductions</div>
                            <div className="font-semibold text-red-600 mt-1">
                              UGX {(() => {
                                const profitDeduction = Math.round((cashClose.totalCashInTill || 0) * 0.12);
                                const monthlyExpenseFund = cashClose.m_expenseFund || cashClose.m_expensefund || 0;
                                return (profitDeduction + monthlyExpenseFund).toLocaleString();
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Suggested PM Allocation */}
                        <div className="bg-purple-50 p-3 rounded border border-purple-200">
                          <div className="flex items-center justify-between">
                            <span className="text-purple-700 text-sm font-medium">
                              Suggested PM Allocation:
                            </span>
                            <div className="text-xl font-bold text-purple-600">
                              UGX {(() => {
                                const totalCash = cashClose.totalCashInTill || 0;
                                const profitDeduction = Math.round(totalCash * 0.12);
                                const monthlyExpenseFund = cashClose.m_expenseFund || cashClose.m_expensefund || 0;
                                const totalDeductions = profitDeduction + monthlyExpenseFund;
                                const allocationAmount = totalCash - totalDeductions;
                                return allocationAmount.toLocaleString();
                              })()}
                            </div>
                          </div>
                        </div>

                      </div>

                      <div className="text-right space-y-2">
                        {/* Submit Button - Only show if not already submitted */}
                        {cashClose.status !== 'submitted' && cashClose.status !== 'allocated' && (
                          <Button
                            onClick={() => handleSubmitCashClose(cashClose)}
                            disabled={submitting}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 w-full mb-2"
                          >
                            {submitting ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                                Submitting...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Submit for Allocation
                              </>
                            )}
                          </Button>
                        )}

                        {/* Send Allocation Button */}
                        <Button
                          onClick={() => handleSendAllocationFromOverview(cashClose)}
                          disabled={sending || !selectedPM || cashClose.status !== 'submitted'}
                          size="sm"
                          className={`${
                            cashClose.status === 'allocated'
                              ? 'bg-gray-500 hover:bg-gray-600'
                              : 'bg-purple-600 hover:bg-purple-700'
                          } disabled:bg-gray-400 w-full`}
                        >
                          {sending ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                              Sending...
                            </>
                          ) : cashClose.status === 'allocated' ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Allocated
                            </>
                          ) : cashClose.status === 'submitted' ? (
                            <>
                              <Send className="w-3 h-3 mr-1" />
                              Send Allocation
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 mr-1" />
                              Not Submitted
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>
            Cash Close Processing Statistics
            {selectedPM && (
              <div className="text-sm text-gray-600 mt-1">
                Filtered for {pmUsers.find(pm => pm.uid === selectedPM)?.name}
              </div>
            )}
          </CardTitle>
        </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{cashCloses.length}</div>
                <div className="text-sm text-orange-800">
                  {selectedPM ? 'PM\'s Submitted' : 'Submitted'}
                </div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {suggestedAllocations.reduce((sum, suggestion) => sum + suggestion.suggestedAmount, 0).toLocaleString()}
                </div>
                <div className="text-sm text-blue-800">Total Suggested</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {suggestedAllocations.reduce((sum, suggestion) => sum + suggestion.profitDeduction, 0).toLocaleString()}
                </div>
                <div className="text-sm text-green-800">Profit Deductions</div>
              </div>
              <div className="text-center p-4 bg-indigo-50 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">
                  {suggestedAllocations.reduce((sum, suggestion) => sum + suggestion.totalDeductions, 0).toLocaleString()}
                </div>
                <div className="text-sm text-indigo-800">Total Deductions</div>
              </div>
            </div>
        </CardContent>
      </Card>

      {/* Recent Allocations - From Cash Closes with Status ALLOCATED */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-orange-800">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Recent Allocations
            </div>
            <div className="text-sm text-orange-600 font-medium">
              {allocatedCashCloses.length} allocated records
            </div>
          </CardTitle>
          <div className="text-sm text-gray-600 mt-2">
            📋 Showing cash close records that have been allocated to purchase managers
          </div>
        </CardHeader>
        <CardContent>
          {allocatedCashCloses.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Allocated Cash Closes</h3>
              <p className="text-gray-500">No cash close records have been allocated yet. Use the buttons above to allocate funds.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">{allocatedCashCloses.length}</div>
                  <div className="text-sm text-orange-700">Total Allocated</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {allocatedCashCloses.reduce((sum, cc) => sum + (cc.allocationAmount || 0), 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-green-700">Total Allocated Amount</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {new Set(allocatedCashCloses.map(cc => cc.allocatedTo)).size}
                  </div>
                  <div className="text-sm text-blue-700">PMs Allocated To</div>
                </div>
              </div>

              {/* Allocated Cash Closes List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {allocatedCashCloses
                  .sort((a, b) => {
                    const dateA = a.allocatedAt?.toDate?.() || new Date(a.allocatedAt || 0);
                    const dateB = b.allocatedAt?.toDate?.() || new Date(b.allocatedAt || 0);
                    return dateB.getTime() - dateA.getTime();
                  })
                  .slice(0, 10)
                  .map((cashClose, index) => (
                  <div key={cashClose.id} className="border border-orange-200 rounded-lg p-4 bg-orange-50 hover:bg-orange-100">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        {/* Header with Date, Shift and Status */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2 text-orange-600" />
                              <span className="font-bold text-orange-800">
                                {(() => {
                                  const date = cashClose.businessDate || cashClose.date;
                                  if (date) {
                                    const dateObj = new Date(date);
                                    return dateObj.toLocaleDateString();
                                  }
                                  return 'N/A';
                                })()} - {cashClose.shifts?.[0]?.shift || 'Unknown'} shift
                              </span>
                            </div>
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 border border-orange-300">
                              ALLOCATED
                            </span>
                          </div>
                        </div>

                        {/* Allocation Information */}
                        <div className="bg-white border border-orange-200 rounded p-3 mb-2">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <span className="text-gray-600 text-xs">Allocated To:</span>
                              <div className="font-medium text-orange-800">
                                {cashClose.allocatedTo || 'Unknown PM'}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600 text-xs">Allocation Amount:</span>
                              <div className="font-bold text-green-600">
                                UGX {(cashClose.allocationAmount || 0).toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600 text-xs">Allocated By:</span>
                              <div className="font-medium text-blue-600">
                                {cashClose.allocatedByName || cashClose.allocatedBy || 'System'}
                              </div>
                            </div>
                          </div>

                          {/* Allocation Timestamp */}
                          {cashClose.allocatedAt && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <div className="flex items-center text-xs text-gray-500">
                                <Clock className="w-3 h-3 mr-1" />
                                <span>Allocated: {(() => {
                                  const result = formatCreatedAt(cashClose.allocatedAt);
                                  return typeof result === 'object' ? result.fullDisplay : result;
                                })()}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Financial Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div className="bg-white p-2 rounded border text-center">
                            <div className="text-gray-600">Original Amount</div>
                            <div className="font-medium text-blue-600">
                              UGX {(cashClose.totalCashInTill || 0).toLocaleString()}
                            </div>
                          </div>
                          <div className="bg-white p-2 rounded border text-center">
                            <div className="text-gray-600">Profit Deducted</div>
                            <div className="font-medium text-red-600">
                              UGX {(cashClose.profitDeduction || 0).toLocaleString()}
                            </div>
                          </div>
                          <div className="bg-white p-2 rounded border text-center">
                            <div className="text-gray-600">Monthly Fund</div>
                            <div className="font-medium text-orange-600">
                              UGX {(cashClose.monthlyExpenseFund || 0).toLocaleString()}
                            </div>
                          </div>
                          <div className="bg-white p-2 rounded border text-center">
                            <div className="text-gray-600">Final Allocation</div>
                            <div className="font-bold text-green-600">
                              UGX {(cashClose.allocationAmount || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right ml-4">
                        <div className="text-xs text-gray-500 mb-2">
                          ID: {cashClose.id.slice(-6)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Record #{allocatedCashCloses.length - index}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}