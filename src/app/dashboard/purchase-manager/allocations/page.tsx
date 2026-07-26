'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  collection, 
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { authService } from '@/lib/firebase/auth';
import { isSystemTestCashClose } from '@/lib/firebase/test-record-filters';
import { 
  Receipt,
  AlertCircle,
  RefreshCw,
  DollarSign,
  Calendar,
  TrendingUp,
  Banknote,
  Smartphone,
  Building,
  Clock,
  Eye,
  Filter,
  Search,
  Table,
  Printer,
  FileText,
  Download
} from 'lucide-react';

// PDF Generation Utility
const generatePDF = async (elementId: string, filename: string) => {
  try {
    // Dynamic import to avoid issues in server-side rendering
    const html2pdf = (await import('html2pdf.js')).default;

    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID ${elementId} not found`);
    }

    const opt = {
      margin: 1,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff'
      },
      jsPDF: {
        unit: 'in',
        format: 'a4',
        orientation: 'portrait'
      }
    };

    await html2pdf().set(opt).from(element).save();
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

interface TillData {
  tillNumber: number;
  tillName?: string;
  totalCashInTill?: number;
  cashAmount?: number;
  cashAtHand?: number;
  expectedNetworkMoney?: number;
  actualNetworkMoney?: number;
  tillUsed?: number;
  expenses?: number;
  expenseDetails?: any[];
  networkPayments?: any[];
  totalNetworkPayments?: number;
  expectedCashAtHand?: number;
  cashShortage?: number;
  cashExcess?: number;
  networkShortage?: number;
  networkExcess?: number;
}

interface ShiftData {
  shift: 'day' | 'night';
  shiftTotalRevenue?: number;
  shiftTotalCash?: number;
  shiftTotalNetwork?: number;
  shiftStartTime?: any;
  shiftEndTime?: any;
  shiftSupervisor?: string;
  tills?: TillData[];
}

interface CashClose {
  id: string;
  // Document Metadata
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
  branchId?: string;
  status?: string;

  // Date Fields
  cashCloseDate?: any;
  date?: string | any;
  businessDate?: string;

  // Core Financial Totals
  totalRevenue?: number;
  totalCashInTill?: number;
  closeCash?: number;
  totalNetworkPayments?: number;
  totalNetworkMoney?: number;
  totalExpenses?: number;
  totalTillUsed?: number;

  // Cash Management
  totalExpectedCash?: number;
  totalActualCash?: number;
  cashPresent?: number;
  actualAmount?: number;
  expectedAmount?: number;

  // Variances
  totalShortage?: number;
  shortage?: number;
  totalExcess?: number;
  excess?: number;
  totalNetworkShortage?: number;
  totalNetworkExcess?: number;

  // Financial Calculations
  profitPercentage?: number;
  profitAmount?: number;
  taxRate?: number;
  taxAmount?: number;
  afterTaxAmount?: number;
  remainingAmount?: number;
  m_expenseFund?: number;
  purchasingManager?: number;

  // Network Payment Breakdown
  airtel?: number;
  mtn?: number;
  stanbicBank?: number;
  equityBank?: number;
  absaBank?: number;
  pesaPal?: number;

  // Shifts Array
  shifts?: ShiftData[];

  // Additional Fields
  notes?: string;
  shift?: string;
  shiftType?: string;
  employeeId?: string;
  approvedBy?: string;
  approvedAt?: any;
  rejectionReason?: string;

  // Workflow & Tracking
  entryDelay?: number;
  isLateEntry?: boolean;
  dataSource?: string;
  automatedAllocation?: boolean;
}

export default function PMAllocationsPage() {
  const [cashCloses, setCashCloses] = useState<CashClose[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedShiftForPrint, setSelectedShiftForPrint] = useState<{cashClose: CashClose, shiftIndex: number} | null>(null);

  useEffect(() => {
    loadCashCloses();
  }, []);

  const loadCashCloses = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('📊 Loading cash close records from cashCloses collection');

      // No orderBy here — Firestore's orderBy silently excludes documents
      // that don't have the ordered field, causing recent records to disappear.
      // We fetch all docs and sort client-side instead.
      const cashClosesSnapshot = await getDocs(collection(db, 'cashCloses'));
      const cashClosesData: CashClose[] = [];

      cashClosesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (isSystemTestCashClose(data)) return;
        cashClosesData.push({
          id: doc.id,
          ...data
        });
      });

      // Sort client-side: prefer cashCloseDate, fall back to createdAt
      cashClosesData.sort((a, b) => {
        const getTime = (v: any): number => {
          if (!v) return 0;
          if (v.toDate) return v.toDate().getTime();
          return new Date(v).getTime();
        };
        const aTime = getTime(a.cashCloseDate) || getTime(a.createdAt);
        const bTime = getTime(b.cashCloseDate) || getTime(b.createdAt);
        return bTime - aTime;
      });

      setCashCloses(cashClosesData);
      console.log(`✅ Found ${cashClosesData.length} cash close records`);
      
    } catch (error: any) {
      console.error('❌ Error loading cash closes:', error);
      setError(`Error loading cash close records: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">Unknown</span>;

    switch (status.toLowerCase()) {
      case 'completed':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded flex items-center">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </span>;
      case 'approved':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded flex items-center">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </span>;
      case 'draft':
        return <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          Draft
        </span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded flex items-center">
          <AlertCircle className="w-3 h-3 mr-1" />
          Rejected
        </span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">{status}</span>;
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'UGX 0';
    return `UGX ${amount.toLocaleString()}`;
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      if (date.toDate) {
        return date.toDate().toLocaleDateString();
      }
      if (typeof date === 'string') {
        return new Date(date).toLocaleDateString();
      }
      return new Date(date).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  const filteredCashCloses = cashCloses.filter(cashClose => {
    const matchesSearch = !searchTerm ||
      cashClose.businessDate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cashClose.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cashClose.branchId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === 'all' || cashClose.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const handlePrintReceipt = async (cashClose: CashClose, shiftIndex: number) => {
    try {
      // Set the receipt data for rendering
      setSelectedShiftForPrint({ cashClose, shiftIndex });

      // Wait for the component to render
      await new Promise(resolve => setTimeout(resolve, 200));

      // Show the receipt for PDF generation
      const receiptElement = document.getElementById('cash-close-receipt-printable');
      if (receiptElement) {
        receiptElement.classList.add('show-for-pdf');
      }

      // Wait a bit more for the styles to apply
      await new Promise(resolve => setTimeout(resolve, 300));

      // Generate PDF
      const shift = cashClose.shifts?.[shiftIndex];
      const filename = `CashClose_${cashClose.businessDate || 'Unknown'}_${shift?.shift || 'Unknown'}_Receipt.pdf`;

      await generatePDF('cash-close-receipt-printable', filename);
      console.log('PDF generated successfully:', filename);

      // Hide the receipt again
      if (receiptElement) {
        receiptElement.classList.remove('show-for-pdf');
      }

      // Clear the receipt data
      setSelectedShiftForPrint(null);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');

      // Clean up on error
      const receiptElement = document.getElementById('cash-close-receipt-printable');
      if (receiptElement) {
        receiptElement.classList.remove('show-for-pdf');
      }
      setSelectedShiftForPrint(null);
    }
  };

  const PrintReceipt = ({ cashClose, shiftIndex }: { cashClose: CashClose, shiftIndex: number }) => {
    const shift = cashClose.shifts?.[shiftIndex];
    if (!shift) return null;

    const totalTillCash = shift.tills?.reduce((sum, till) => sum + (till.totalCashInTill || 0), 0) || 0;
    const totalTillNetwork = shift.tills?.reduce((sum, till) => sum + (till.totalNetworkPayments || 0), 0) || 0;
    const totalTillExpenses = shift.tills?.reduce((sum, till) => sum + (till.expenses || 0), 0) || 0;

    const convertNumberToWords = (amount: number): string => {
      const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
      const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
      const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
      const scales = ['', 'THOUSAND', 'MILLION', 'BILLION'];

      if (amount === 0) return 'ZERO SHILLINGS ONLY';

      const convertGroup = (num: number): string => {
        let result = '';

        if (num >= 100) {
          result += ones[Math.floor(num / 100)] + ' HUNDRED ';
          num %= 100;
        }

        if (num >= 20) {
          result += tens[Math.floor(num / 10)] + ' ';
          num %= 10;
        } else if (num >= 10) {
          result += teens[num - 10] + ' ';
          return result;
        }

        if (num > 0) {
          result += ones[num] + ' ';
        }

        return result;
      };

      let words = '';
      let scaleIndex = 0;

      while (amount > 0) {
        const group = amount % 1000;
        if (group !== 0) {
          const groupWords = convertGroup(group);
          words = groupWords + (scales[scaleIndex] ? scales[scaleIndex] + ' ' : '') + words;
        }
        amount = Math.floor(amount / 1000);
        scaleIndex++;
      }

      return words.trim() + ' SHILLINGS ONLY';
    };

    return (
      <div
        id="cash-close-receipt-printable"
        className="print-receipt"
        style={{
          fontFamily: 'Arial, sans-serif',
          maxWidth: '210mm',
          margin: '0 auto',
          padding: '20px',
          background: 'white'
        }}
      >
        {/* GRN-Style Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #000', paddingBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ width: '60px', height: '60px', background: 'white', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img
                src="/equity-logo.png"
                alt="Equity Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  const img = e.currentTarget;
                  const fallback = img.nextElementSibling as HTMLElement;
                  img.style.display = 'none';
                  if (fallback) {
                    fallback.style.display = 'block';
                  }
                }}
              />
              <div style={{ display: 'none', fontSize: '10px', fontWeight: 'bold', color: '#666' }}>EQUITY</div>
            </div>
            <div>
              <h1 style={{ margin: '0', fontSize: '18px', fontWeight: 'bold', color: '#000', lineHeight: '1.2' }}>
                UNISON TECHNOLOGIES AND INNOVATION LTD
              </h1>
              <p style={{ margin: '3px 0', fontSize: '12px', color: '#666' }}>EQUITY SHOPPERS SUPERMARKET</p>
              <p style={{ margin: '3px 0', fontSize: '12px', color: '#666' }}>KYENGERA, KAMPALA-MASAKA</p>
              <p style={{ margin: '3px 0', fontSize: '12px', color: '#2563EB', textDecoration: 'underline' }}>unisontechnologiesaninnovation@gmail.com</p>
              <p style={{ margin: '3px 0', fontSize: '12px', color: '#2563EB', textDecoration: 'underline' }}>equityshoppers@gmail.com</p>
            </div>
          </div>
        </div>

        {/* Cash Close Title and Number */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', border: '2px solid #000', padding: '10px 30px', display: 'inline-block' }}>
            CASH CLOSE RECEIPT
          </h3>
          <div style={{ marginTop: '8px', fontSize: '14px' }}>
            Receipt #: CC{cashClose.id?.slice(-6) || '000000'}
          </div>
          {cashClose.businessDate && (
            <div style={{ marginTop: '4px', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>
              Date: <span style={{ fontFamily: 'monospace' }}>{cashClose.businessDate}</span>
            </div>
          )}
        </div>

        {/* Branch and Shift Details */}
        <div style={{ marginBottom: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '14px' }}>
          <div>
            <span style={{ fontWeight: 'bold' }}>BRANCH:</span>
            <span style={{ marginLeft: '10px' }}>{cashClose.branchId || 'N/A'}</span>
          </div>
          <div>
            <span style={{ fontWeight: 'bold' }}>SHIFT:</span>
            <span style={{ marginLeft: '10px' }}>{shift.shift?.toUpperCase()}</span>
          </div>
        </div>

        {/* Supervisor Details */}
        <div style={{ marginBottom: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '14px' }}>
          <div>
            <span style={{ fontWeight: 'bold' }}>SUPERVISOR:</span>
            <span style={{ marginLeft: '10px' }}>{shift.shiftSupervisor || 'N/A'}</span>
          </div>
          <div>
            <span style={{ fontWeight: 'bold' }}>STATUS:</span>
            <span style={{ marginLeft: '10px' }}>{cashClose.status?.toUpperCase()}</span>
          </div>
        </div>

        {/* Shift Summary Section */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>SHIFT SUMMARY</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', fontSize: '14px' }}>
            <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Total Revenue</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2563EB' }}>{formatCurrency(shift.shiftTotalRevenue)}</div>
            </div>
            <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Cash Amount</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#059669' }}>{formatCurrency(shift.shiftTotalCash)}</div>
            </div>
            <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Network Payments</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#7C3AED' }}>{formatCurrency(shift.shiftTotalNetwork)}</div>
            </div>
            <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', background: '#f8fafc' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Total Amount</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#DC2626' }}>
                {formatCurrency((shift.shiftTotalCash || 0) + (shift.shiftTotalNetwork || 0))}
              </div>
            </div>
          </div>
        </div>

        {/* Till Details Section */}
        {shift.tills && shift.tills.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', textAlign: 'center' }}>TILL DETAILS</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left' }}>Till #</th>
                  <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>Cash Amount</th>
                  <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>Network</th>
                  <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>Expenses</th>
                  <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {shift.tills.map((till, index) => (
                  <tr key={index}>
                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>
                      Till {till.tillNumber}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                      {formatCurrency(till.totalCashInTill)}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                      {formatCurrency(till.totalNetworkPayments)}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                      {formatCurrency(till.expenses)}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency((till.totalCashInTill || 0) + (till.totalNetworkPayments || 0) - (till.expenses || 0))}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#f3f4f6', fontWeight: 'bold' }}>
                  <td style={{ border: '1px solid #000', padding: '8px' }}>TOTAL</td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                    {formatCurrency(totalTillCash)}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                    {formatCurrency(totalTillNetwork)}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                    {formatCurrency(totalTillExpenses)}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
                    {formatCurrency(totalTillCash + totalTillNetwork - totalTillExpenses)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Network Payments Breakdown */}
        {(cashClose.airtel || cashClose.mtn || cashClose.stanbicBank || cashClose.equityBank || cashClose.absaBank || cashClose.pesaPal) && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', textAlign: 'center' }}>NETWORK PAYMENTS BREAKDOWN</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', fontSize: '13px' }}>
              {cashClose.airtel && (
                <div style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>Airtel</div>
                  <div style={{ fontSize: '14px', color: '#DC2626' }}>{formatCurrency(cashClose.airtel)}</div>
                </div>
              )}
              {cashClose.mtn && (
                <div style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>MTN</div>
                  <div style={{ fontSize: '14px', color: '#DC2626' }}>{formatCurrency(cashClose.mtn)}</div>
                </div>
              )}
              {cashClose.stanbicBank && (
                <div style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>Stanbic</div>
                  <div style={{ fontSize: '14px', color: '#DC2626' }}>{formatCurrency(cashClose.stanbicBank)}</div>
                </div>
              )}
              {cashClose.equityBank && (
                <div style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>Equity</div>
                  <div style={{ fontSize: '14px', color: '#DC2626' }}>{formatCurrency(cashClose.equityBank)}</div>
                </div>
              )}
              {cashClose.absaBank && (
                <div style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>ABSA</div>
                  <div style={{ fontSize: '14px', color: '#DC2626' }}>{formatCurrency(cashClose.absaBank)}</div>
                </div>
              )}
              {cashClose.pesaPal && (
                <div style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>PesaPal</div>
                  <div style={{ fontSize: '14px', color: '#DC2626' }}>{formatCurrency(cashClose.pesaPal)}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment Details Section */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>PAYMENT DETAILS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', marginBottom: '10px', justifyContent: 'center', fontSize: '14px' }}>
            <span>Total Amount:</span>
            <span style={{ fontSize: '18px', fontWeight: 'bold', textDecoration: 'underline' }}>
              {formatCurrency((cashClose.totalCashInTill || 0) + (cashClose.totalNetworkPayments || 0))}
            </span>
          </div>
          <div style={{ marginBottom: '15px', fontSize: '13px', textAlign: 'center' }}>
            <span>Amount in words:</span>
            <span style={{ marginLeft: '8px', fontWeight: 'bold', textDecoration: 'underline' }}>
              {convertNumberToWords((cashClose.totalCashInTill || 0) + (cashClose.totalNetworkPayments || 0))}
            </span>
          </div>
        </div>

        {/* Financial Summary */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', textAlign: 'center' }}>FINANCIAL SUMMARY</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', fontSize: '13px' }}>
            <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Total Revenue</div>
              <div style={{ fontSize: '14px' }}>{formatCurrency(cashClose.totalRevenue)}</div>
            </div>
            <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Total Cash</div>
              <div style={{ fontSize: '14px' }}>{formatCurrency(cashClose.totalCashInTill)}</div>
            </div>
            <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Total Expenses</div>
              <div style={{ fontSize: '14px' }}>{formatCurrency(cashClose.totalExpenses)}</div>
            </div>
            {cashClose.profitAmount && (
              <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Profit</div>
                <div style={{ fontSize: '14px', color: '#059669' }}>{formatCurrency(cashClose.profitAmount)}</div>
              </div>
            )}
            {cashClose.purchasingManager && (
              <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>PM Allocation</div>
                <div style={{ fontSize: '14px', color: '#7C3AED' }}>{formatCurrency(cashClose.purchasingManager)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Variances Section */}
        {(cashClose.totalShortage || cashClose.totalExcess || cashClose.totalNetworkShortage || cashClose.totalNetworkExcess) && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', textAlign: 'center' }}>VARIANCES</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', fontSize: '13px' }}>
              {cashClose.totalShortage && cashClose.totalShortage > 0 && (
                <div style={{ padding: '10px', border: '2px solid #DC2626', borderRadius: '4px', textAlign: 'center', background: '#FEF2F2' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#DC2626' }}>Cash Shortage</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#DC2626' }}>{formatCurrency(cashClose.totalShortage)}</div>
                </div>
              )}
              {cashClose.totalExcess && cashClose.totalExcess > 0 && (
                <div style={{ padding: '10px', border: '2px solid #059669', borderRadius: '4px', textAlign: 'center', background: '#F0FDF4' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#059669' }}>Cash Excess</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#059669' }}>{formatCurrency(cashClose.totalExcess)}</div>
                </div>
              )}
              {cashClose.totalNetworkShortage && cashClose.totalNetworkShortage > 0 && (
                <div style={{ padding: '10px', border: '2px solid #DC2626', borderRadius: '4px', textAlign: 'center', background: '#FEF2F2' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#DC2626' }}>Network Shortage</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#DC2626' }}>{formatCurrency(cashClose.totalNetworkShortage)}</div>
                </div>
              )}
              {cashClose.totalNetworkExcess && cashClose.totalNetworkExcess > 0 && (
                <div style={{ padding: '10px', border: '2px solid #059669', borderRadius: '4px', textAlign: 'center', background: '#F0FDF4' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#059669' }}>Network Excess</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#059669' }}>{formatCurrency(cashClose.totalNetworkExcess)}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes Section */}
        {cashClose.notes && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center' }}>NOTES</div>
            <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', background: '#f9fafb' }}>
              {cashClose.notes}
            </div>
          </div>
        )}

        {/* Signature Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '30px', fontSize: '13px' }}>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>PROCESSED BY:</div>
            <div style={{ marginBottom: '5px' }}>{cashClose.createdBy || 'System'}</div>
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Signature:</div>
              <div style={{ borderBottom: '1px solid #000', width: '150px', height: '30px' }}></div>
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>APPROVED BY:</div>
            <div style={{ marginBottom: '5px' }}>{cashClose.approvedBy || 'Purchasing Manager'}</div>
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Signature:</div>
              <div style={{ borderBottom: '1px solid #000', width: '150px', height: '30px' }}></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '30px', textAlign: 'center', borderTop: '2px solid #000', paddingTop: '15px', fontSize: '12px', color: '#666' }}>
          <div>Equity Shoppers Supermarket - Cash Close Receipt</div>
          <div>Generated on {new Date().toLocaleString()}</div>
          <div style={{ marginTop: '8px', fontSize: '11px' }}>
            This receipt contains official cash close records for the specified shift and date.
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="w-full p-6">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          <div className="ml-4 text-lg text-gray-600">Loading cash close records...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Receipt className="w-8 h-8 mr-3 text-blue-600" />
            Cash Close Records
          </h1>
          <p className="text-gray-600 mt-2">Complete overview of all cash close data fields and records</p>
        </div>
        <Button onClick={loadCashCloses} variant="outline">
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

      {/* View Toggle and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* View Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">View:</span>
              <div className="flex rounded-lg border border-gray-300 p-1">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'cards'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Eye className="w-4 h-4 mr-1 inline" />
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'table'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Table className="w-4 h-4 mr-1 inline" />
                  Table
                </button>
            </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="flex-1">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by date, branch, notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="approved">Approved</option>
                  <option value="draft">Draft</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{cashCloses.length}</div>
              <div className="text-sm text-gray-600">Total Records</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {cashCloses.filter(c => c.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {cashCloses.reduce((sum, c) => sum + (c.totalRevenue || 0), 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Revenue (UGX)</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {cashCloses.reduce((sum, c) => sum + (c.totalCashInTill || 0), 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Cash (UGX)</div>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Table className="w-5 h-5 mr-2" />
              Cash Close Records Table
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Branch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cash
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Network
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expenses
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shifts
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCashCloses.map((cashClose) => (
                    <tr key={cashClose.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {cashClose.businessDate || formatDate(cashClose.cashCloseDate)}
                      </div>
                        <div className="text-sm text-gray-500">
                          {cashClose.branchId || 'N/A'}
                    </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(cashClose.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(cashClose.totalRevenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(cashClose.totalCashInTill)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(cashClose.totalNetworkPayments)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(cashClose.totalExpenses)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(cashClose.profitAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="space-y-1">
                          {cashClose.shifts?.map((shift, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {shift.shift?.toUpperCase()}
                        </span>
                              <button
                                onClick={() => handlePrintReceipt(cashClose, index)}
                                className="ml-2 text-blue-600 hover:text-blue-800 text-xs"
                                title="Print Receipt"
                              >
                                <Printer className="w-3 h-3" />
                              </button>
                  </div>
                          )) || 'N/A'}
                </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setExpandedRecord(expandedRecord === cashClose.id ? null : cashClose.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                  </div>
                      </td>
                    </tr>
              ))}
                </tbody>
              </table>
            </div>

            {filteredCashCloses.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No records found matching your criteria.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Card View */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          {/* Cash Close Records */}
          {filteredCashCloses.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Cash Close Records Found</h3>
              <p className="text-gray-500">
                {searchTerm || selectedStatus !== 'all'
                  ? 'No records match your search criteria.'
                  : 'Cash close records will appear here when available.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCashCloses.map((cashClose) => (
            <Card key={cashClose.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                      {cashClose.businessDate || formatDate(cashClose.cashCloseDate)}
                      {cashClose.branchId && (
                        <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {cashClose.branchId}
                        </span>
                      )}
            </CardTitle>
                    <div className="flex items-center mt-2 space-x-2">
                      {getStatusBadge(cashClose.status)}
                      {cashClose.shift && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                          {cashClose.shift} shift
                        </span>
                      )}
                      </div>
                    </div>
                    <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedRecord(expandedRecord === cashClose.id ? null : cashClose.id)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    {expandedRecord === cashClose.id ? 'Collapse' : 'View Details'}
                    </Button>
                  </div>
          </CardHeader>
          <CardContent>
                {/* Core Financial Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-lg font-bold text-blue-700">
                      {formatCurrency(cashClose.totalRevenue)}
                </div>
                    <div className="text-xs text-blue-600">Revenue</div>
            </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-lg font-bold text-green-700">
                      {formatCurrency(cashClose.totalCashInTill)}
                    </div>
                    <div className="text-xs text-green-600">Cash in Till</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-lg font-bold text-purple-700">
                      {formatCurrency(cashClose.totalNetworkPayments)}
                    </div>
                    <div className="text-xs text-purple-600">Network Payments</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-lg font-bold text-orange-700">
                      {formatCurrency(cashClose.totalExpenses)}
                    </div>
                    <div className="text-xs text-orange-600">Expenses</div>
                  </div>
                </div>

                {/* Network Payment Breakdown */}
                {(cashClose.airtel || cashClose.mtn || cashClose.stanbicBank) && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Smartphone className="w-4 h-4 mr-1" />
                      Network Payments Breakdown
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      {cashClose.airtel && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Airtel:</span>
                          <span className="font-medium">{formatCurrency(cashClose.airtel)}</span>
                        </div>
                      )}
                      {cashClose.mtn && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">MTN:</span>
                          <span className="font-medium">{formatCurrency(cashClose.mtn)}</span>
                        </div>
                      )}
                      {cashClose.stanbicBank && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Stanbic:</span>
                          <span className="font-medium">{formatCurrency(cashClose.stanbicBank)}</span>
                        </div>
                      )}
                      {cashClose.equityBank && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Equity:</span>
                          <span className="font-medium">{formatCurrency(cashClose.equityBank)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Additional Info */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  {cashClose.profitAmount && (
                    <span>Profit: <strong className="text-green-600">{formatCurrency(cashClose.profitAmount)}</strong></span>
                  )}
                  {cashClose.purchasingManager && (
                    <span>PM Allocation: <strong className="text-blue-600">{formatCurrency(cashClose.purchasingManager)}</strong></span>
                  )}
                  {cashClose.totalShortage && cashClose.totalShortage > 0 && (
                    <span>Shortage: <strong className="text-red-600">{formatCurrency(cashClose.totalShortage)}</strong></span>
                  )}
                  {cashClose.createdAt && (
                    <span>Created: {formatDate(cashClose.createdAt)}</span>
                  )}
                    </div>

                {/* Expanded Details */}
                {expandedRecord === cashClose.id && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Complete Record Details</h4>

                    {/* Document Metadata */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      <div className="bg-gray-50 p-3 rounded">
                        <h5 className="font-medium text-gray-700 mb-2">📋 Document Metadata</h5>
                        <div className="space-y-1 text-sm">
                          <div><span className="text-gray-600">ID:</span> {cashClose.id}</div>
                          <div><span className="text-gray-600">Status:</span> {cashClose.status}</div>
                          <div><span className="text-gray-600">Created By:</span> {cashClose.createdBy || 'N/A'}</div>
                          <div><span className="text-gray-600">Branch:</span> {cashClose.branchId || 'N/A'}</div>
                    </div>
                  </div>

                      {/* Date Fields */}
                      <div className="bg-gray-50 p-3 rounded">
                        <h5 className="font-medium text-gray-700 mb-2">📅 Date Fields</h5>
                        <div className="space-y-1 text-sm">
                          <div><span className="text-gray-600">Cash Close Date:</span> {formatDate(cashClose.cashCloseDate)}</div>
                          <div><span className="text-gray-600">Business Date:</span> {cashClose.businessDate || 'N/A'}</div>
                          <div><span className="text-gray-600">Created At:</span> {formatDate(cashClose.createdAt)}</div>
                          <div><span className="text-gray-600">Updated At:</span> {formatDate(cashClose.updatedAt)}</div>
                        </div>
                      </div>

                      {/* Financial Calculations */}
                      <div className="bg-gray-50 p-3 rounded">
                        <h5 className="font-medium text-gray-700 mb-2">💰 Calculations</h5>
                        <div className="space-y-1 text-sm">
                          <div><span className="text-gray-600">Profit %:</span> {cashClose.profitPercentage || 'N/A'}%</div>
                          <div><span className="text-gray-600">Profit Amount:</span> {formatCurrency(cashClose.profitAmount)}</div>
                          <div><span className="text-gray-600">Tax Amount:</span> {formatCurrency(cashClose.taxAmount)}</div>
                          <div><span className="text-gray-600">After Tax:</span> {formatCurrency(cashClose.afterTaxAmount)}</div>
                          <div><span className="text-gray-600">M Expense Fund:</span> {formatCurrency(cashClose.m_expenseFund)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Variances */}
                    {(cashClose.totalShortage || cashClose.totalExcess) && (
                      <div className="mb-6">
                        <h5 className="font-medium text-gray-700 mb-3">📊 Variances</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 bg-red-50 rounded">
                            <div className="font-bold text-red-700">{formatCurrency(cashClose.totalShortage)}</div>
                            <div className="text-xs text-red-600">Cash Shortage</div>
                          </div>
                          <div className="text-center p-3 bg-yellow-50 rounded">
                            <div className="font-bold text-yellow-700">{formatCurrency(cashClose.totalExcess)}</div>
                            <div className="text-xs text-yellow-600">Cash Excess</div>
                          </div>
                          <div className="text-center p-3 bg-orange-50 rounded">
                            <div className="font-bold text-orange-700">{formatCurrency(cashClose.totalNetworkShortage)}</div>
                            <div className="text-xs text-orange-600">Network Shortage</div>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded">
                            <div className="font-bold text-green-700">{formatCurrency(cashClose.totalNetworkExcess)}</div>
                            <div className="text-xs text-green-600">Network Excess</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Shifts Data */}
                    {cashClose.shifts && cashClose.shifts.length > 0 && (
                      <div className="mb-6">
                        <h5 className="font-medium text-gray-700 mb-3">🏪 Shifts Data</h5>
                        <div className="space-y-4">
                          {cashClose.shifts.map((shift, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex justify-between items-center mb-3">
                                <h6 className="font-medium text-gray-800 flex items-center">
                                  {shift.shift?.toUpperCase()} Shift
                                  <button
                                    onClick={() => handlePrintReceipt(cashClose, index)}
                                    className="ml-2 text-blue-600 hover:text-blue-800"
                                    title="Print Receipt"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </button>
                                </h6>
                                <span className="text-sm text-gray-500">
                                  {shift.shiftSupervisor && `Supervisor: ${shift.shiftSupervisor}`}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-3">
                                <div><span className="text-gray-600">Revenue:</span> {formatCurrency(shift.shiftTotalRevenue)}</div>
                                <div><span className="text-gray-600">Cash:</span> {formatCurrency(shift.shiftTotalCash)}</div>
                                <div><span className="text-gray-600">Network:</span> {formatCurrency(shift.shiftTotalNetwork)}</div>
                              </div>

                              {shift.tills && shift.tills.length > 0 && (
                  <div>
                                  <h6 className="font-medium text-gray-700 mb-2">Till Details</h6>
                                  <div className="space-y-2">
                                    {shift.tills.map((till, tillIndex) => (
                                      <div key={tillIndex} className="bg-gray-50 p-3 rounded text-sm">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                          <div><span className="text-gray-600">Till {till.tillNumber}:</span></div>
                                          <div>Cash: {formatCurrency(till.totalCashInTill)}</div>
                                          <div>Network: {formatCurrency(till.totalNetworkPayments)}</div>
                                          <div>Expenses: {formatCurrency(till.expenses)}</div>
                  </div>
                </div>
              ))}
            </div>
                                </div>
                              )}
                </div>
              ))}
            </div>
                      </div>
                    )}

                    {/* Notes */}
                    {cashClose.notes && (
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-700 mb-2">📝 Notes</h5>
                        <div className="bg-gray-50 p-3 rounded text-sm">
                          {cashClose.notes}
                        </div>
                      </div>
                    )}

                    {/* Additional Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {cashClose.employeeId && (
                        <div><span className="text-gray-600">Employee ID:</span> {cashClose.employeeId}</div>
                      )}
                      {cashClose.approvedBy && (
                        <div><span className="text-gray-600">Approved By:</span> {cashClose.approvedBy}</div>
                      )}
                      {cashClose.approvedAt && (
                        <div><span className="text-gray-600">Approved At:</span> {formatDate(cashClose.approvedAt)}</div>
                      )}
                      {cashClose.rejectionReason && (
                        <div><span className="text-gray-600">Rejection Reason:</span> {cashClose.rejectionReason}</div>
                      )}
                      {cashClose.entryDelay && (
                        <div><span className="text-gray-600">Entry Delay:</span> {cashClose.entryDelay} days</div>
                      )}
                      {cashClose.isLateEntry && (
                        <div><span className="text-gray-600">Late Entry:</span> Yes</div>
                      )}
                      {cashClose.dataSource && (
                        <div><span className="text-gray-600">Data Source:</span> {cashClose.dataSource}</div>
                      )}
                      {cashClose.automatedAllocation && (
                        <div><span className="text-gray-600">Automated Allocation:</span> Yes</div>
                      )}
                    </div>
                  </div>
                )}
          </CardContent>
        </Card>
          ))
        )}
      </div>
      )}

      {/* Hidden Print Receipt */}
      {selectedShiftForPrint && (
        <PrintReceipt
          cashClose={selectedShiftForPrint.cashClose}
          shiftIndex={selectedShiftForPrint.shiftIndex}
        />
      )}

      {/* PDF Generation Styles */}
      <style jsx>{`
        /* PDF Generation Styles */
        .print-receipt {
          font-family: 'Arial', sans-serif !important;
          font-size: 12px;
          line-height: 1.4;
          color: #000 !important;
          background: white !important;
        }

        .print-receipt * {
          box-sizing: border-box;
        }

        .print-receipt h1, .print-receipt h2, .print-receipt h3 {
          color: #000 !important;
          font-weight: bold;
          margin: 0;
          padding: 0;
        }

        .print-receipt table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
        }

        .print-receipt th, .print-receipt td {
          border: 1px solid #000;
          padding: 4px 6px;
          text-align: left;
          font-size: 10px;
        }

        .print-receipt th {
          background: #f5f5f5 !important;
          font-weight: bold;
        }

        .print-receipt .border {
          border: 1px solid #000 !important;
        }

        .print-receipt .border-b {
          border-bottom: 1px solid #000 !important;
        }

        .print-receipt .border-t {
          border-top: 1px solid #000 !important;
        }

        .print-receipt .bg-gray-50 {
          background: #f9fafb !important;
        }

        .print-receipt .bg-green-50 {
          background: #f0fdf4 !important;
        }

        .print-receipt .bg-red-50 {
          background: #fef2f2 !important;
        }

        .print-receipt .text-green-600 {
          color: #059669 !important;
        }

        .print-receipt .text-red-600 {
          color: #dc2626 !important;
        }

        .print-receipt .text-blue-600 {
          color: #2563eb !important;
        }

        .print-receipt .font-bold {
          font-weight: bold !important;
        }

        .print-receipt .text-center {
          text-align: center !important;
        }

        .print-receipt .grid {
          display: table !important;
        }

        .print-receipt .grid-cols-1 {
          display: block !important;
        }

        .print-receipt .grid-cols-2 {
          display: table !important;
          width: 100%;
        }

        .print-receipt .gap-4 > div {
          display: table-cell !important;
          padding: 0 10px;
          vertical-align: top;
        }

        /* Hide the receipt when not needed for PDF generation */
        #cash-close-receipt-printable {
          position: absolute;
          left: -9999px;
          top: -9999px;
          visibility: hidden;
        }

        #cash-close-receipt-printable.show-for-pdf {
          position: static;
          left: auto;
          top: auto;
          visibility: visible;
        }
      `}</style>
    </div>
  );
}