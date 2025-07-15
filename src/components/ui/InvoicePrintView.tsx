import React, { useState, useEffect } from 'react';
import { Invoice } from '../../lib/firebase/enhanced-invoice';
import { QRCodeService } from '../../lib/utils/qr-code';
import { authService } from '../../lib/firebase/auth';
import { InvoicePayment, getInvoicePaymentHistory, Invoice as PMInvoice } from '../../lib/firebase/purchasing-manager-service';

interface InvoicePrintViewProps {
  invoice: Invoice;
  onClose: () => void;
}

export default function InvoicePrintView({ invoice, onClose }: InvoicePrintViewProps) {
  const [qrCodeSVG, setQrCodeSVG] = useState<string>('');
  const [loadingQR, setLoadingQR] = useState(false);
  const [receiverName, setReceiverName] = useState<string>('Receiver Name');
  const [paymentHistory, setPaymentHistory] = useState<InvoicePayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [purchasingManagerName, setPurchasingManagerName] = useState<string>('Purchasing Manager');

  useEffect(() => {
    // First try to use the stored QR code from the invoice
    if (invoice.qrCodeSVG) {
      console.log('Using stored QR code from invoice');
      setQrCodeSVG(invoice.qrCodeSVG);
      setLoadingQR(false);
    } else {
      // Fallback to generating QR code if not stored
      console.log('QR code not found in invoice, generating new one');
      generateQRCode();
    }
  }, [invoice]);

  useEffect(() => {
    // Get the current user's name for receiver and purchasing manager
    const currentUser = authService.getCurrentUser();
    if (currentUser?.employee) {
      const fullName = `${currentUser.employee.firstName} ${currentUser.employee.lastName}`;
      setReceiverName(fullName);
      setPurchasingManagerName(fullName); // Default to current user
    } else if (currentUser?.displayName) {
      setReceiverName(currentUser.displayName);
      setPurchasingManagerName(currentUser.displayName);
    }
  }, []);

  useEffect(() => {
    // Load payment history for this invoice
    const loadPaymentHistory = async () => {
      if (invoice.id) {
        try {
          setLoadingPayments(true);
          const payments = await getInvoicePaymentHistory(invoice.id);
          // Sort payments in ascending order (oldest first)
          const sortedPayments = (payments || []).sort((a, b) => {
            const dateA = new Date(a.paymentDate).getTime();
            const dateB = new Date(b.paymentDate).getTime();
            return dateA - dateB; // Ascending order
          });
          setPaymentHistory(sortedPayments);
        } catch (error) {
          console.error('Error loading payment history for print view:', error);
          setPaymentHistory([]);
        } finally {
          setLoadingPayments(false);
        }
      }
    };

    loadPaymentHistory();
  }, [invoice.id]);

  const generateQRCode = async () => {
    try {
      setLoadingQR(true);
      const svgString = await QRCodeService.generateInvoiceQRCodeSVG(invoice.id, invoice.invoiceNumber);
      setQrCodeSVG(svgString);
      console.log('QR code generated for print view');
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      setQrCodeSVG(''); // Keep placeholder if QR generation fails
    } finally {
      setLoadingQR(false);
    }
  };

  const formatDate = (timestamp: any) => {
    return timestamp?.toDate?.()?.toLocaleDateString() || new Date().toLocaleDateString();
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white max-w-4xl w-full max-h-screen overflow-auto">
        {/* Print Controls - Hidden in print */}
        <div className="flex justify-between items-center p-4 border-b print:hidden">
          <h2 className="text-lg font-semibold">Invoice Print Preview</h2>
          <div className="flex space-x-2">
            <button
              onClick={handlePrint}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
            >
              Print
            </button>
            <button
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>

        {/* Printable Invoice Content */}
        <div id="printable-invoice" className="p-6 bg-white">
          {/* Header Section */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white border border-gray-300 flex items-center justify-center overflow-hidden">
                <img 
                  src="/equity-logo.png" 
                  alt="Equity Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const img = e.currentTarget;
                    const fallback = img.nextElementSibling as HTMLElement;
                    img.style.display = 'none';
                    if (fallback) {
                      fallback.style.display = 'block';
                    }
                  }}
                />
                <div className="hidden text-xs font-bold text-gray-600">EQUITY</div>
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900 leading-tight">
                  UNISON TECHNOLOGIES AND INNOVATIONS LTD
                </h1>
                <p className="text-xs text-gray-600">EQUITY SHOPPERS SUPERMARKET</p>
                <p className="text-xs text-gray-600">RECEIVING SECTION</p>
                <p className="text-xs text-gray-600">KAMPALA-UGANDA</p>
                <p className="text-xs text-blue-600 underline">unisontechnologiesaninnovation@gmail.com</p>
                <p className="text-xs text-blue-600 underline">equityshoppers@gmail.com</p>
              </div>
            </div>
            <div className="text-right">
              <div className="w-[100px] h-[100px] border border-gray-400 bg-white p-1 flex-shrink-0 mb-2">
                <div 
                  className="w-full h-full"
                  data-qr-code
                  dangerouslySetInnerHTML={{ __html: qrCodeSVG }}
                />
              </div>
              <p className="text-xs text-gray-600">Scan for details</p>
            </div>
          </div>

          {/* Title Section */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold border border-gray-600 py-2">
              PAYMENT HISTORY RECORD
            </h3>
            <div className="text-right mt-2">
              <span className="font-bold text-base">Invoice #{invoice.invoiceNumber}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-bold text-sm">Supplier:</span>
                <span className="ml-2 text-sm">{invoice.supplierName}</span>
              </div>
              <div>
                <span className="font-bold text-sm">Date:</span>
                <span className="ml-2 text-sm">{formatDate(invoice.createdAt || new Date())}</span>
              </div>
            </div>
          </div>

          {/* Payment History Section */}
          <div className="mt-4 mb-4">
            <h3 className="font-bold mb-4 underline text-lg text-center">
              {paymentHistory.length > 0 ? 'PAYMENT HISTORY DETAILS' : 'PAYMENT PLAN TEMPLATE'}
            </h3>
            <table className="w-full border-collapse border border-gray-400">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 px-1 py-1 text-xs font-bold text-left w-12">Installment</th>
                  <th className="border border-gray-400 px-1 py-1 text-xs font-bold text-left w-20">Date</th>
                  <th className="border border-gray-400 px-1 py-1 text-xs font-bold text-left w-24">Amount (UGX)</th>
                  <th className="border border-gray-400 px-1 py-1 text-xs font-bold text-left w-20">Bal</th>
                  <th className="border border-gray-400 px-1 py-1 text-xs font-bold text-left w-28">Transaction ID</th>
                  <th className="border border-gray-400 px-1 py-1 text-xs font-bold text-left w-32">Paid By</th>
                  <th className="border border-gray-400 px-1 py-1 text-xs font-bold text-left w-20">Received By</th>
                  <th className="border border-gray-400 px-1 py-1 text-xs font-bold text-left w-16">Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.length > 0 ? (
                  // Show actual payment history if available
                  <>
                    {paymentHistory.slice(0, 5).map((payment, index) => {
                      // Calculate running total up to this payment (including this payment)
                      const runningTotal = paymentHistory.slice(0, index + 1).reduce((sum, p) => sum + p.amount, 0);
                      // Calculate remaining balance after this payment
                      const remainingBalance = runningTotal >= invoice.amount ? 0 : Math.max(0, invoice.amount - runningTotal);
                      
                      // If invoice is fully paid, treat all payments as completed
                      const isInvoiceFullyPaid = paymentHistory.reduce((sum, p) => sum + p.amount, 0) >= invoice.amount;
                      const displayStatus = isInvoiceFullyPaid ? 'completed' : (payment.paymentStatus || 'completed');
                      
                      return (
                        <tr key={payment.id || index}>
                          <td className="border border-gray-400 px-1 py-2 text-xs font-medium">#{payment.installmentNumber}</td>
                          <td className="border border-gray-400 px-1 py-2 text-xs">
                            {new Date(payment.paymentDate).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit'
                            })}
                            <br />
                            <span className="text-gray-600">
                              {new Date(payment.paymentDate).toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </td>
                          <td className="border border-gray-400 px-1 py-2 text-xs font-medium">
                            {formatAmount(payment.amount)}
                          </td>
                          <td className="border border-gray-400 px-1 py-2 text-xs">
                            {formatAmount(remainingBalance)}
                          </td>
                        <td className="border border-gray-400 px-1 py-2 text-xs font-mono">
                          {payment.paymentMethod.details.transactionId || 
                           payment.paymentMethod.details.chequeNumber || 
                           payment.paymentReference.slice(-8)}
                        </td>
                                                 <td className="border border-gray-400 px-1 py-2 text-xs">
                           {payment.paidByName}
                         </td>
                         <td className="border border-gray-400 px-1 py-2 text-xs">
                           {payment.approvedBy || receiverName}
                         </td>
                                                 <td className="border border-gray-400 px-1 py-2 text-xs">
                           {displayStatus === 'completed' ? '✓ PAID' :
                            displayStatus === 'pending' ? '⏳ PENDING' :
                            displayStatus === 'failed' ? '✗ FAILED' :
                            displayStatus === 'cancelled' ? '✗ CANCELLED' :
                            '? UNKNOWN'}
                         </td>
                       </tr>
                     );
                     })}
                    {/* Fill remaining rows if payment history has less than 5 items */}
                    {paymentHistory.length < 5 && 
                      Array.from({ length: 5 - paymentHistory.length }, (_, index) => (
                        <tr key={`empty-${index}`}>
                          <td className="border border-gray-400 px-1 py-2 text-xs">#{paymentHistory.length + index + 1}</td>
                          <td className="border border-gray-400 px-1 py-2 text-xs h-8"></td>
                          <td className="border border-gray-400 px-1 py-2 text-xs h-8"></td>
                          <td className="border border-gray-400 px-1 py-2 text-xs h-8"></td>
                          <td className="border border-gray-400 px-1 py-2 text-xs h-8"></td>
                          <td className="border border-gray-400 px-1 py-2 text-xs h-8"></td>
                          <td className="border border-gray-400 px-1 py-2 text-xs h-8"></td>
                          <td className="border border-gray-400 px-1 py-2 text-xs h-8"></td>
                        </tr>
                      ))
                    }
                  </>
                ) : (
                  // Default 5 empty rows when no payment history exists
                  Array.from({ length: 5 }, (_, index) => (
                    <tr key={index}>
                      <td className="border border-gray-400 px-1 py-2 text-xs">#{index + 1}</td>
                      <td className="border border-gray-400 px-1 py-2 text-xs h-8"></td>
                      <td className="border border-gray-400 px-1 py-2 text-xs h-8"></td>
                      <td className="border border-gray-400 px-1 py-2 text-xs h-8"></td>
                      <td className="border border-gray-400 px-1 py-2 text-xs h-8"></td>
                      <td className="border border-gray-400 px-1 py-2 text-xs h-8"></td>
                      <td className="border border-gray-400 px-1 py-2 text-xs h-8"></td>
                      <td className="border border-gray-400 px-1 py-2 text-xs h-8"></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            {/* Payment Summary for paid invoices */}
            {paymentHistory.length > 0 && (
              <div className="mt-3 p-2 bg-gray-50 border border-gray-300 rounded">
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div className="text-center">
                    <span className="font-bold">Total Invoice:</span>
                    <br />
                    <span className="font-bold text-blue-600">{formatAmount(invoice.amount)}</span>
                  </div>
                                     <div className="text-center">
                     <span className="font-bold">Total Paid:</span>
                     <br />
                     <span className="font-bold text-green-600">
                       {formatAmount(paymentHistory.reduce((sum, p) => sum + p.amount, 0))}
                     </span>
                   </div>
                   <div className="text-center">
                     <span className="font-bold">Balance:</span>
                     <br />
                     <span className="font-bold text-red-600">
                       {formatAmount(Math.max(0, invoice.amount - paymentHistory.reduce((sum, p) => sum + p.amount, 0)))}
                     </span>
                   </div>
                 </div>
                 <div className="mt-2 text-center text-xs text-gray-600">
                   <span className="font-bold">Payment Status: </span>
                   {paymentHistory.reduce((sum, p) => sum + p.amount, 0) >= invoice.amount ? 
                     <span className="text-green-600 font-bold">FULLY PAID</span> : 
                     <span className="text-orange-600 font-bold">PARTIAL PAYMENT</span>
                   }
                </div>
              </div>
            )}
          </div>

          {/* Digital Verification Section */}
          <div className="mt-3 text-center border-t border-gray-300 pt-2">
            <div className="text-center">
              <p className="text-xs font-semibold text-gray-900">Digital Verification</p>
              <p className="text-xs text-gray-600">Scan QR code to verify this invoice online</p>
              <p className="text-xs text-gray-600">Invoice: {invoice.invoiceNumber}</p>
            </div>
          </div>

          {/* Footer - Left Aligned at Bottom */}
          <div className="mt-4 text-left text-xs text-gray-600">
            <p>This document serves as proof of goods received and payment made</p>
            <p>Generated by EQUI Supply Management System - {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media print {
          @page {
            size: A4;
            margin: 1in;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          body * {
            visibility: hidden;
          }
          
          #printable-invoice,
          #printable-invoice * {
            visibility: visible;
          }
          
          #printable-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            padding: 0;
            margin: 0;
            font-size: 12px;
            line-height: 1.3;
            box-sizing: border-box;
            page-break-inside: avoid;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          /* Ensure no page breaks within sections */
          .grid {
            page-break-inside: avoid;
          }
          
          /* Adjust font sizes for print */
          h1, h2, h3 {
            page-break-after: avoid;
          }
          
          /* Ensure checkboxes print properly */
          input[type="checkbox"] {
            -webkit-appearance: checkbox;
            -moz-appearance: checkbox;
            appearance: checkbox;
            print-color-adjust: exact;
          }
          
          /* QR Code optimization for print */
          [data-qr-code] {
            max-width: 100% !important;
            max-height: 100% !important;
            object-fit: contain !important;
          }
          
          [data-qr-code] svg {
            width: 100% !important;
            height: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
          }
          
          /* Border and background colors */
          .border-gray-400 {
            border-color: #9CA3AF !important;
          }
          
          .bg-red-600 {
            background-color: #DC2626 !important;
            color: white !important;
          }
          
          .text-blue-600 {
            color: #2563EB !important;
          }
          
          .underline {
            text-decoration: underline !important;
          }
        }
      `}</style>
    </div>
  );
} 