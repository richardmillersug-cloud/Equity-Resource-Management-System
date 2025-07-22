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
      const verificationUrl = `https://equi-319f.vercel.app/invoice/verify/${invoice.id}`;
      const svgString = await QRCodeService.generateInvoiceQRCodeSVG(verificationUrl, invoice.invoiceNumber);
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
          {/* GRN-Style Header Section */}
          <div className="flex justify-between items-start mb-6 border-b pb-4">
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
                  UNISON TECHNOLOGIES AND INNOVATION LTD
                </h1>
                <p className="text-xs text-gray-600">EQUITY SHOPPERS SUPERMARKET</p>
                <p className="text-xs text-gray-600">KYENGERA, KAMPALA-MASAKA</p>
                <p className="text-xs text-blue-600 underline">unisontechnologiesaninnovation@gmail.com</p>
                <p className="text-xs text-blue-600 underline">equityshoppers@gmail.com</p>
              </div>
            </div>
          </div>

          {/* GRN Title and Number */}
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold border border-gray-600 py-2 inline-block px-8">GOODS RECEIVED NOTE</h3>
            <div className="mt-2 text-xs">EQS{invoice.invoiceNumber || invoice.id?.slice(-4) || '0000'}</div>
            {invoice.fdn && (
              <div className="mt-1 text-xs font-semibold text-gray-700">FDN: <span className="font-mono">{invoice.fdn}</span></div>
            )}
          </div>

          {/* Supplier and Description */}
          <div className="mb-2 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-bold">RECEIVED FROM:</span>
              <span className="ml-2">{invoice.supplierName}</span>
            </div>
            <div>
              <span className="font-bold">Description of goods:</span>
              <span className="ml-2">{invoice.description || 'N/A'}</span>
            </div>
          </div>

          {/* Checkboxes Section */}
          <div className="mb-2 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-bold">Quantity received according to order:</span>
              <span className="ml-2">
                <input type="checkbox" checked={!!invoice.quantity} readOnly className="mr-1" />YES
                <input type="checkbox" checked={!invoice.quantity} readOnly className="ml-4 mr-1" />NO
              </span>
            </div>
            <div>
              <span className="font-bold">Transport payment:</span>
              <span className="ml-2">
                <input type="checkbox" checked={!!invoice.hasTransportPayment} readOnly className="mr-1" />YES
                <input type="checkbox" checked={!invoice.hasTransportPayment} readOnly className="ml-4 mr-1" />NO
                {invoice.hasTransportPayment && (
                  <span className="ml-2">Amount: {formatAmount(invoice.transportAmount || 0)}</span>
                )}
              </span>
            </div>
          </div>
          <div className="mb-2 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-bold">Damages:</span>
              <span className="ml-2">
                <input type="checkbox" checked={!!invoice.hasDamages} readOnly className="mr-1" />YES
                <input type="checkbox" checked={!invoice.hasDamages} readOnly className="ml-4 mr-1" />NO
                {invoice.hasDamages && invoice.damages && invoice.damages.length > 0 && (
                  <span className="ml-2">Amount: {formatAmount(invoice.damages.reduce((sum, d) => sum + (d.estimatedValue || 0), 0))}</span>
                )}
              </span>
            </div>
          </div>

          {/* Payment Details Section */}
          <div className="mt-8 mb-2">
            <div className="text-center text-lg font-bold mb-2">PAYMENT DETAILS</div>
            {/* Payment method checkboxes removed: not present in Invoice model */}
            <div className="flex flex-wrap items-center gap-2 mt-2 justify-start text-base">
              <span>Amount:</span>
              <span className="font-bold underline">{formatAmount(invoice.amount)}</span>
            </div>
          </div>
          <div className="mb-2 text-sm">
            <span>Amount in words:</span>
            <span className="ml-2 font-bold underline">{convertNumberToWords(invoice.amount)}</span>
          </div>

          {/* Payment Table Section */}
          <div className="mb-8 mt-8"> {/* Add extra spacing above and below */}
            <table className="w-full border-collapse border border-gray-400 text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 px-1 py-1">DATE</th>
                  <th className="border border-gray-400 px-1 py-1">M.O.P</th>
                  <th className="border border-gray-400 px-1 py-1">AMOUNT</th>
                  <th className="border border-gray-400 px-1 py-1">TRANS ID</th>
                  <th className="border border-gray-400 px-1 py-1">NAME</th>
                  <th className="border border-gray-400 px-1 py-1">SIGN</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, idx) => {
                  const payment = paymentHistory[idx];
                  return payment ? (
                    <tr key={payment.id || idx}>
                      <td className="border border-gray-400 px-1 py-3">{new Date(payment.paymentDate).toLocaleDateString('en-GB')}</td>
                      <td className="border border-gray-400 px-1 py-3">{payment.paymentMethod?.type || 'N/A'}</td>
                      <td className="border border-gray-400 px-1 py-3">{formatAmount(payment.amount)}</td>
                      <td className="border border-gray-400 px-1 py-3">{payment.paymentReference?.slice(-8) || 'N/A'}</td>
                      <td className="border border-gray-400 px-1 py-3">{payment.paidByName || 'N/A'}</td>
                      <td className="border border-gray-400 px-1 py-3">{payment.approvedBy || ''}</td>
                    </tr>
                  ) : (
                    <tr key={`empty-${idx}`}>
                      <td className="border border-gray-400 px-1 py-3 h-8"></td>
                      <td className="border border-gray-400 px-1 py-3 h-8"></td>
                      <td className="border border-gray-400 px-1 py-3 h-8"></td>
                      <td className="border border-gray-400 px-1 py-3 h-8"></td>
                      <td className="border border-gray-400 px-1 py-3 h-8"></td>
                      <td className="border border-gray-400 px-1 py-3 h-8"></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Signature Section */}
          <div className="grid grid-cols-2 gap-4 mt-6 mb-2 text-sm">
            <div>
              <span className="font-bold">RECEIVED BY:</span>
              <span className="ml-2">{receiverName}</span>
              <div className="mt-2">
                <span className="font-bold">Signature:</span>
                <span className="ml-2 border-b border-gray-400 inline-block w-32 h-6 align-bottom"></span>
              </div>
              {/* Stamp field removed: receiverPosition not present in Invoice model */}
            </div>
            <div>
              <span className="font-bold">Date:</span>
              <span className="ml-2">{formatDate(invoice.date || new Date())}</span>
              <div className="mt-2 flex items-center">
                <span className="ml-2 w-[160px] h-[160px] border border-gray-100 bg-white p-1 flex-shrink-0 overflow-hidden qr-code-container">
                  <span
                    className="w-full h-full"
                    data-qr-code
                    dangerouslySetInnerHTML={{ __html: qrCodeSVG }}
                  />
                </span>
              </div>
            </div>
          </div>
          {/* QR Code at Bottom Center removed, now shown at Tell Number */}

          {/* Footer */}
          <div className="mt-8 text-xs text-gray-600 text-center border-t pt-2">
            Equity Shoppers Supermarket
            <span className="ml-4">{new Date().toLocaleString()}</span>
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
        .qr-code-container svg {
          width: 100% !important;
          height: 100% !important;
          display: block;
          object-fit: contain;
        }
      `}</style>
    </div>
  );
} 