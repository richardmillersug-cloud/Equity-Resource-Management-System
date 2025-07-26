'use client';
import React from 'react';
import { getCompanyDisplayName } from '../../../../../config/company';
import { useRouter } from 'next/navigation';

export default function EmployeeInformationFormPage() {
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
        <h1 className="text-2xl font-bold text-center mb-6">{companyName} - EMPLOYEE INFORMATION FORM</h1>

        {/* SECTION 1 */}
        <h2 className="font-semibold mb-2">SECTION 1: PERSONAL INFORMATION</h2>
        <div className="text-sm space-y-2 mb-6">
          <p>1. Full Name: ____________________________________</p>
          <p>2. Date of Birth (DD/MM/YYYY): ____ / ____ / ______</p>
          <p>3. Gender: ☐ Male ☐ Female</p>
          <p>4. NIN: _______________________________________</p>
          <p>5. Marital Status: ☐ Single ☐ Married ☐ Divorced ☐ Widowed</p>
          <p>6. Contact Number: _____________________________</p>
          <p>7. Email Address: ______________________________</p>
          <p>8. Residential Address: __________________________</p>
        </div>

        {/* SECTION 2 */}
        <h2 className="font-semibold mb-2">SECTION 2: EMPLOYMENT INFORMATION</h2>
        <div className="text-sm space-y-2 mb-6">
          <p>9. Job Title / Position: ___________________________</p>
          <p>10. Department: ☐ Cashier ☐ Stock ☐ Customer Service ☐ Management ☐ Other __________</p>
          <p>11. Date of Hire (DD/MM/YYYY): ____ / ____ / ______</p>
          <p>12. Employment Type: ☐ Full-Time ☐ Part-Time ☐ Temporary ☐ Contract</p>
          <p>13. Supervisor’s Name: __________________________</p>
          <p>14. Payment Details (for payroll): __________________</p>
        </div>

        {/* SECTION 3 */}
        <h2 className="font-semibold mb-2">SECTION 3: PARENTS / GUARDIAN INFORMATION</h2>
        <div className="text-sm space-y-2 mb-6">
          <p>15. Father’s Name &amp; Contact: _____________________</p>
          <p>16. Mother’s Name &amp; Contact: _____________________</p>
          <p>17. Guardian (if applicable): _______________________</p>
        </div>

        {/* SECTION 4 */}
        <h2 className="font-semibold mb-2">SECTION 4: NEXT OF KIN (Emergency Contact)</h2>
        <div className="text-sm space-y-2 mb-6">
          <p>18. Name: _____________________________________</p>
          <p>19. Relationship: ________________________________</p>
          <p>20. Phone: _____________________________________</p>
          <p>21. Address: ___________________________________</p>
        </div>

        {/* SECTION 5 */}
        <h2 className="font-semibold mb-2">SECTION 5: OTHER RELEVANT INFORMATION</h2>
        <div className="text-sm space-y-2 mb-6">
          <p>22. Medical Conditions (if any): ____________________</p>
          <p>23. Allergies: ____________________________________</p>
          <p>24. Highest Qualification: _________________________</p>
          <p>25. Previous Employment (Company / Position / Duration): ______________________________</p>
        </div>

        <h2 className="font-semibold mb-2">DECLARATION</h2>
        <p className="text-sm mb-10">I certify that the information provided is accurate and complete. I consent to the supermarket using this data for HR, payroll, and emergency purposes.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
          <div>
            <p><strong>Employee’s Signature:</strong> ______________________</p>
            <p><strong>Date (DD/MM/YYYY):</strong> ____ / ____ / ______</p>
          </div>
          <div>
            <p><strong>HR Representative’s Signature:</strong> ______________________</p>
            <p><strong>Date:</strong> ____ / ____ / ______</p>
          </div>
        </div>
      </div>
    </div>
  );
} 