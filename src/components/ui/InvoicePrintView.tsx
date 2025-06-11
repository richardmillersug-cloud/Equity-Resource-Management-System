import React, { useState, useEffect } from 'react';
import { Invoice } from '../../lib/firebase/enhanced-invoice';
import { QRCodeService } from '../../lib/utils/qr-code';
import { authService } from '../../lib/firebase/auth';

interface InvoicePrintViewProps {
  invoice: Invoice;
  onClose: () => void;
}

export default function InvoicePrintView({ invoice, onClose }: InvoicePrintViewProps) {
  const [qrCodeSVG, setQrCodeSVG] = useState<string>('');
  const [loadingQR, setLoadingQR] = useState(false);
  const [receiverName, setReceiverName] = useState<string>('Receiver Name');

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
    // Get the current user's name for receiver
    const currentUser = authService.getCurrentUser();
    if (currentUser?.employee) {
      const fullName = `${currentUser.employee.firstName} ${currentUser.employee.lastName}`;
      setReceiverName(fullName);
    } else if (currentUser?.displayName) {
      setReceiverName(currentUser.displayName);
    }
  }, []);

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
          <div className="text-center mb-4">
            
            <h3 className="text-base font-bold border border-gray-600 py-1">
              GOODS RECEIVED NOTE
            </h3>
            <div className="text-right mt-1">
              <span className="font-bold text-sm">#{invoice.invoiceNumber}</span>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div>
              <div className="mb-3">
                <span className="font-bold text-sm">RECEIVED FROM:</span>
                <span className="ml-2 underline font-bold text-sm">{invoice.supplierName}</span>
              </div>
              <div className="mb-3">
                <span className="font-bold text-sm">Description of goods:</span>
                <span className="ml-2 underline text-sm">{invoice.description}</span>
              </div>
            </div>
            <div>
              <div className="mb-3">
                <span className="font-bold text-sm">Date:</span>
                <span className="ml-2 underline text-sm">{formatDate(invoice.date)}</span>
              </div>
              <div className="mb-3">
                <span className="font-bold text-sm">FDN:</span>
                <span className="ml-2 underline text-sm">{invoice.fdn}</span>
              </div>
            </div>
          </div>

          {/* Quantity Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm">Quantity received according to order:</span>
              <div className="flex space-x-3">
                <label className="flex items-center">
                  <input type="checkbox" checked={invoice.quantity > 0} readOnly className="mr-1" />
                  <span className="text-sm">YES</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={invoice.quantity === 0} readOnly className="mr-1" />
                  <span className="text-sm">NO</span>
                </label>
              </div>
            </div>
            <div className="border border-gray-400 p-2 h-12">
              <p className="text-xs">Quantity: {invoice.quantity}</p>
              {invoice.quantity === 0 && <p className="text-xs italic">If No, Please specify reason above</p>}
            </div>
          </div>

          {/* Transport Payment Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm">Transport payment:</span>
              <div className="flex space-x-3">
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="mr-1" />
                  <span className="text-sm">YES</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-1" />
                  <span className="text-sm">NO</span>
                </label>
              </div>
            </div>
            <div className="border border-gray-400 p-2 h-10">
              <p className="text-xs italic">If No, Please specify</p>
            </div>
          </div>

          {/* Damages Section */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm">Damages:</span>
              <div className="flex space-x-3">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-1" />
                  <span className="text-sm">YES</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="mr-1" />
                  <span className="text-sm">NO</span>
                </label>
              </div>
            </div>
            <div className="border border-gray-400 p-2 h-12">
              <p className="text-xs italic">If yes, Please specify</p>
            </div>
          </div>

          {/* Signature and Payment Section */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold mb-3 underline text-sm">RECEIVED BY:</h3>
              <div className="space-y-2">
                <div>
                  <span className="font-bold text-sm">Name:</span>
                  <div className="border-b border-gray-400 h-6 flex items-end">
                    <span className="text-sm font-medium">{receiverName}</span>
                  </div>
                </div>
                <div>
                  <span className="font-bold text-sm">Position:</span>
                  <span className="ml-2 text-sm">Receiver</span>
                </div>
                <div>
                  <span className="font-bold text-sm">Signature:</span>
                  <div className="border-b border-gray-400 h-6"></div>
                </div>
                <div>
                  <span className="font-bold text-sm">STAMP:</span>
                  <div className="border border-gray-400 h-8 w-20"></div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-3 underline text-sm">CASH PAYMENT:</h3>
              <div className="space-y-2">
                <div>
                  <span className="font-bold text-sm">Name:</span>
                  <div className="border-b border-gray-400 h-6"></div>
                </div>
                <div>
                  <span className="font-bold text-sm">Amount:</span>
                  <span className="ml-2 font-bold text-base">{formatAmount(invoice.amount)}</span>
                </div>
                <div>
                  <span className="font-bold text-sm">Amount in words:</span>
                  <div className="border-b border-gray-400 h-6 flex items-end">
                    <span className="text-xs font-medium">{convertNumberToWords(invoice.amount)}</span>
                  </div>
                </div>
                <div>
                  <span className="font-bold text-sm">Signature:</span>
                  <div className="border-b border-gray-400 h-6"></div>
                </div>
                <div>
                  <span className="font-bold text-sm">Tel Number:</span>
                  <div className="border-b border-gray-400 h-6"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Plan Section */}
          <div className="mt-6 mb-4">
            <h3 className="font-bold mb-2 underline text-sm">PAYMENT PLAN:</h3>
            <table className="w-full border-collapse border border-gray-400">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 px-1 py-1 text-xs font-bold text-left w-12">Installment</th>
                  <th className="border border-gray-400 px-1 py-1 text-xs font-bold text-left w-20">Date</th>
                  <th className="border border-gray-400 px-1 py-1 text-xs font-bold text-left w-24">Amount (UGX)</th>
                  <th className="border border-gray-400 px-1 py-1 text-xs font-bold text-left w-20">Bal</th>
                  <th className="border border-gray-400 px-1 py-1 text-xs font-bold text-left w-28">Transaction ID</th>
                  <th className="border border-gray-400 px-1 py-1 text-xs font-bold text-left w-32">Name</th>
                  <th className="border border-gray-400 px-1 py-1 text-xs font-bold text-left w-20">Number</th>
                  <th className="border border-gray-400 px-1 py-1 text-xs font-bold text-left w-16">Signature</th>
                </tr>
              </thead>
              <tbody>
                {invoice.paymentPlan && invoice.paymentPlan.length > 0 ? (
                  invoice.paymentPlan.slice(0, 5).map((payment, index) => (
                    <tr key={payment.id || index}>
                      <td className="border border-gray-400 px-1 py-2 text-xs">{payment.installmentNumber}</td>
                      <td className="border border-gray-400 px-1 py-2 text-xs h-8"></td>
                      <td className="border border-gray-400 px-1 py-2 text-xs h-8"></td>
                      <td className="border border-gray-400 px-1 py-2 text-xs h-8"></td>
                      <td className="border border-gray-400 px-1 py-2 text-xs h-8"></td>
                      <td className="border border-gray-400 px-1 py-2 text-xs h-8"></td>
                      <td className="border border-gray-400 px-1 py-2 text-xs h-8"></td>
                      <td className="border border-gray-400 px-1 py-2 text-xs h-8"></td>
                    </tr>
                  ))
                ) : (
                  // Default 5 empty rows when no payment plan exists
                  Array.from({ length: 5 }, (_, index) => (
                    <tr key={index}>
                      <td className="border border-gray-400 px-1 py-2 text-xs">{index + 1}</td>
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
                {/* Fill remaining rows if payment plan has less than 5 items */}
                {invoice.paymentPlan && invoice.paymentPlan.length > 0 && invoice.paymentPlan.length < 5 && 
                  Array.from({ length: 5 - Math.min(invoice.paymentPlan.length, 5) }, (_, index) => (
                    <tr key={`empty-${index}`}>
                      <td className="border border-gray-400 px-1 py-2 text-xs">{(invoice.paymentPlan?.length || 0) + index + 1}</td>
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
              </tbody>
            </table>
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