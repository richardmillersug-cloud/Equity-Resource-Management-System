'use client';

import React from 'react';
import { getCompanyDisplayName } from '../../../../../config/company';
import { useRouter } from 'next/navigation';

export default function EmployeeContractTemplatePage() {
  const companyName = getCompanyDisplayName();
  const router = useRouter();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl p-8 print:p-0 print:shadow-none print:rounded-none">
        <div className="flex justify-end gap-2 mb-4 print:hidden">
          <button onClick={() => router.back()} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium">Close</button>
          <button
            onClick={handlePrint}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            Print Contract
          </button>
        </div>

        {/* Contract Header */}
        <h1 className="text-3xl font-bold text-center mb-6">EMPLOYMENT CONTRACT</h1>

        <div className="space-y-1 mb-8 text-sm">
          <p><strong>Employer:</strong> {companyName}</p>
          <p><strong>Employee Name:</strong> ________________________________</p>
          <p><strong>Position:</strong> _____________________________________</p>
          <p><strong>Date of Joining:</strong> ____ / ____ / ______</p>
          <p><strong>Contract Duration:</strong> Fixed-Term</p>
          <p><strong>Location:</strong> One Stop Center Building, Kampala–Masaka Road</p>
        </div>

        <p className="mb-6 text-sm">
          This Employment Contract ("Contract") is entered into between <strong>{companyName}</strong> ("Employer") and the above-named <strong>Employee</strong> in accordance with the labor laws of Uganda.
        </p>

        {/* 1. Terms of Employment */}
        <h2 className="font-semibold mb-2">1. TERMS OF EMPLOYMENT</h2>
        <ul className="list-disc pl-6 text-sm space-y-1 mb-6">
          <li>The Employee shall be employed in the position of __________________ at <strong>{companyName}</strong>.</li>
          <li><strong>Probation Period:</strong> [3 months / 6 months] (if applicable). Performance will be reviewed before confirmation.</li>
          <li><strong>Working Hours:</strong></li>
          <ul className="list-disc pl-10 space-y-1">
            <li><strong>Day Shift:</strong> 8:00 AM – 10:00 PM (with 30-minute break).</li>
            <li><strong>Night Shift:</strong> 7:00 PM – 6:00 AM (with 30-minute break).</li>
            <li>Employees must arrive <strong>10 minutes</strong> before shift starts.</li>
          </ul>
        </ul>

        {/* 2. Remuneration */}
        <h2 className="font-semibold mb-2">2. REMUNERATION &amp; BENEFITS</h2>
        <ul className="list-disc pl-6 text-sm space-y-1 mb-6">
          <li><strong>Basic Salary:</strong> ____________ per month.</li>
          <li><strong>Payment Date:</strong> By the 7th of every month via bank transfer, mobile money or cash.</li>
          <li><strong>Benefits:</strong> Performance-based bonuses (subject to management approval).</li>
        </ul>

        {/* 3. Duties */}
        <h2 className="font-semibold mb-2">3. DUTIES &amp; RESPONSIBILITIES</h2>
        <ul className="list-disc pl-6 text-sm space-y-1 mb-6">
          <li>Adhere to <strong>{companyName} Rules &amp; Regulations</strong>.</li>
          <li>Maintain professionalism, hygiene, and punctuality.</li>
          <li>Provide excellent customer service.</li>
          <li>Follow safety and security protocols.</li>
        </ul>

        {/* 4. Leave Policy */}
        <h2 className="font-semibold mb-2">4. LEAVE POLICY</h2>
        <ul className="list-disc pl-6 text-sm space-y-1 mb-6">
          <li><strong>Sick Leave:</strong> 10 days per year (medical certificate required if &gt;1 day).</li>
          <li><strong>Emergency Leave:</strong> Subject to prior approval.</li>
          <li><strong>Maternity / Paternity Leave:</strong> As per labor laws.</li>
        </ul>

        {/* 5. Termination */}
        <h2 className="font-semibold mb-2">5. TERMINATION</h2>
        <p className="font-medium mb-1">A. By Employer</p>
        <ul className="list-disc pl-10 text-sm space-y-1 mb-2">
          <li><strong>Misconduct</strong> (theft, fraud, harassment, repeated violations).</li>
          <li><strong>Poor Performance</strong> (after warnings and probation review).</li>
          <li><strong>Redundancy / Business Closure</strong></li>
        </ul>
        <p className="font-medium mb-1">B. By Employee</p>
        <ul className="list-disc pl-10 text-sm space-y-1 mb-6">
          <li>The Employee must give <strong>7 days’ notice</strong> in writing.</li>
          <li>Failure to provide notice may result in forfeiture of benefits.</li>
        </ul>

        {/* 6. Confidentiality */}
        <h2 className="font-semibold mb-2">6. CONFIDENTIALITY &amp; NON-COMPETE</h2>
        <ul className="list-disc pl-6 text-sm space-y-1 mb-6">
          <li>Do not disclose trade secrets, sales data, or customer information to third parties.</li>
          <li>A <strong>6-month non-compete clause</strong> applies post-employment.</li>
        </ul>

        {/* 7. General Provisions */}
        <h2 className="font-semibold mb-2">7. GENERAL PROVISIONS</h2>
        <ul className="list-disc pl-6 text-sm space-y-1 mb-6">
          <li>This Contract supersedes any prior agreements.</li>
          <li>Disputes shall be resolved per Uganda labor laws.</li>
        </ul>

        {/* Signatures */}
        <h2 className="font-semibold mb-4">EMPLOYEE ACKNOWLEDGEMENT</h2>
        <p className="text-sm mb-6">I, _________________________, acknowledge that I have read, understood, and agree to the terms of this Employment Contract.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm mb-10">
          <div>
            <p><strong>Employee Signature:</strong> __________________________</p>
            <p><strong>Date:</strong> ____ / ____ / ______</p>
          </div>
          <div>
            <p><strong>Employer Representative:</strong> __________________________</p>
            <p><strong>Signature &amp; Stamp:</strong> __________________</p>
            <p><strong>Date:</strong> ____ / ____ / ______</p>
          </div>
        </div>

        <p className="text-sm italic">Attachments: 1. {companyName} Employee Rules &amp; Regulations (provided separately).</p>
      </div>
    </div>
  );
} 