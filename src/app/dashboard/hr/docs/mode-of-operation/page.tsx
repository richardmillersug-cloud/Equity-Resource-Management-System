'use client';
import React from 'react';
import { getCompanyDisplayName } from '../../../../../config/company';
import { useRouter } from 'next/navigation';

export default function ModeOfOperationPage() {
  const companyName = getCompanyDisplayName();
  const router = useRouter();
  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl p-8 print:p-0 print:shadow-none print:rounded-none">
        <div className="flex justify-end gap-2 mb-4 print:hidden">
          <button onClick={() => router.back()} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium">Close</button>
          <button onClick={handlePrint} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium">Print</button>
        </div>
        <h1 className="text-2xl font-bold text-center mb-2">{companyName}</h1>
        <h2 className="text-xl font-semibold text-center mb-6">SUPERMARKET MODE OF OPERATION</h2>
        <p className="text-sm mb-6">Purpose: To ensure efficiency, accuracy, teamwork, and customer satisfaction across all departments.</p>

        <h3 className="font-semibold mb-2">1. STOCK / DEPARTMENTAL ATTENDANTS</h3>
        <ul className="list-disc pl-6 text-sm space-y-1 mb-4">
          <li><strong>Pricing &amp; Labels:</strong> Update price tags daily and report discrepancies immediately.</li>
          <li><strong>Shelf Management:</strong> Rotate stock (FIFO) and keep shelves clean and dust-free.</li>
          <li className="ml-4">Non-Negotiables: ✔ No empty shelves during operating hours. ✔ No mismatched price tags.</li>
        </ul>

        <h3 className="font-semibold mb-2">2. CASHIERS</h3>
        <ul className="list-disc pl-6 text-sm space-y-1 mb-4">
          <li><strong>Customer Service:</strong> Greet customers, scan items accurately, and announce totals clearly.</li>
          <li><strong>Cleanliness:</strong> Wipe checkout counters every hour; keep till area tidy.</li>
          <li><strong>Teamwork:</strong> Call backup if queues exceed 5 customers.</li>
          <li className="ml-4">Non-Negligibles: ✔ Zero unverified price overrides. ✔ Zero dirty checkout areas.</li>
        </ul>

        <h3 className="font-semibold mb-2">3. SUPERVISORS</h3>
        <ul className="list-disc pl-6 text-sm space-y-1 mb-4">
          <li><strong>Pricing Audits:</strong> Conduct random price checks (10 items/day).</li>
          <li><strong>Staff Coordination:</strong> Assign 15-minute cleaning rosters and hold a team huddle at shift start.</li>
          <li><strong>Problem-Solving:</strong> Resolve customer complaints within 10 minutes.</li>
          <li className="ml-4">Non-Negotiables: ✔ No unresolved pricing complaints. ✔ No unattended departments.</li>
        </ul>

        <h3 className="font-semibold mb-2">4. GENERAL RULES FOR ALL STAFF</h3>
        <ul className="list-disc pl-6 text-sm space-y-1 mb-4">
          <li>Follow the "See It, Fix It" policy—solve or report issues immediately.</li>
          <li>Clean assigned areas every morning and after spills within 5 minutes.</li>
          <li>All price changes must be approved by supervisors before tagging.</li>
        </ul>

        <h3 className="font-semibold mb-2">5. PENALTIES FOR NON-COMPLIANCE</h3>
        <ul className="list-disc pl-6 text-sm space-y-1 mb-6">
          <li><strong>1st Offense:</strong> Verbal warning + re-training.</li>
          <li><strong>2nd Offense:</strong> Written warning + extra cleaning duty.</li>
          <li><strong>3rd Offense:</strong> Suspension / dismissal.</li>
          <li>Gross negligence (e.g., intentional wrong pricing) results in instant dismissal.</li>
        </ul>

        <h3 className="font-semibold mb-2">EMPLOYEE ACKNOWLEDGEMENT</h3>
        <p className="text-sm mb-10">I understand and will adhere to this Mode of Operation to ensure the supermarket’s success.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
          <div>
            <p><strong>Name:</strong> __________________________</p>
            <p><strong>Signature:</strong> ______________________</p>
            <p><strong>Date:</strong> ____ / ____ / ______</p>
          </div>
          <div>
            <p><strong>Supervisor’s Name:</strong> __________________________</p>
            <p><strong>Signature:</strong> ______________________</p>
            <p><strong>Date:</strong> ____ / ____ / ______</p>
          </div>
        </div>
      </div>
    </div>
  );
} 