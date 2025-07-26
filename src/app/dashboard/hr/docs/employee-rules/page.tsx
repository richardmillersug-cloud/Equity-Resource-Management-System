'use client';
import React from 'react';
import { getCompanyDisplayName } from '../../../../../config/company';
import { useRouter } from 'next/navigation';

export default function EmployeeRulesPage() {
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
        <h1 className="text-3xl font-bold text-center mb-2">{companyName.toUpperCase()}</h1>
        <h2 className="text-xl font-semibold text-center mb-6">EMPLOYEE RULES &amp; REGULATIONS</h2>

        <h3 className="font-semibold mb-2">1. WORK SCHEDULE &amp; PUNCTUALITY</h3>
        <ul className="list-disc pl-6 text-sm space-y-1 mb-4">
          <li>Employees must arrive <strong>10 minutes</strong> before their shift start time.</li>
          <li><strong>Late Coming:</strong> 1–15 min = verbal warning; 16–30 min = written warning; &gt;30 min without notice = disciplinary action.</li>
          <li>Unauthorized absence for 2+ consecutive days may lead to suspension or termination.</li>
        </ul>

        <h3 className="font-semibold mb-2">2. DRESS CODE &amp; GROOMING</h3>
        <ul className="list-disc pl-6 text-sm space-y-1 mb-4">
          <li>Uniform provided by supermarket must be worn clean and ironed daily.</li>
          <li>Prohibited attire includes short skirts (above knee), ripped jeans, excessively skinny jeans/shorts, and offensive graphics.</li>
          <li>Hair must be neat; no extreme styles without approval.</li>
        </ul>

        <h3 className="font-semibold mb-2">3. CUSTOMER SERVICE &amp; PROFESSIONAL CONDUCT</h3>
        <ul className="list-disc pl-6 text-sm space-y-1 mb-4">
          <li>No arguments with customers—refer disputes to a supervisor.</li>
          <li>No personal calls while assisting customers.</li>
          <li>Do not disclose sales data, promotions, or customer details to outsiders.</li>
        </ul>

        <h3 className="font-semibold mb-2">4. ATTENDANCE &amp; LEAVE POLICY</h3>
        <ul className="list-disc pl-6 text-sm space-y-1 mb-4">
          <li>Sick leave requires a doctor’s certificate for absences over 1 day.</li>
          <li>Notify supervisor at least 2 hours before shift for emergencies.</li>
          <li>More than three unauthorized absences in 6 months may result in suspension or termination.</li>
        </ul>

        <h3 className="font-semibold mb-2">5. DISCIPLINARY ACTIONS</h3>
        <ul className="list-disc pl-6 text-sm space-y-1 mb-4">
          <li><strong>1st Offense:</strong> Verbal warning + re-training.</li>
          <li><strong>2nd Offense:</strong> Written warning + extra duty.</li>
          <li><strong>3rd Offense:</strong> Suspension / dismissal.</li>
          <li>Gross misconduct (e.g., theft, fraud) leads to immediate dismissal.</li>
        </ul>

        <h3 className="font-semibold mb-2">EMPLOYEE ACKNOWLEDGEMENT</h3>
        <p className="text-sm mb-10">I understand and will adhere to these rules and regulations to ensure the supermarket’s success.</p>

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