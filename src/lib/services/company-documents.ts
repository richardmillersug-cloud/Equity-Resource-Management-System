export interface CompanyDocument {
  id: string;
  title: string;
  description: string;
  category: 'rules' | 'contract' | 'form' | 'operations';
  lastUpdated: Date;
  content: string;
  isRequired: boolean;
  canEdit: boolean;
}

export class CompanyDocumentsService {
  
  private static documents: CompanyDocument[] = [
    {
      id: 'employee-rules-regulations',
      title: 'Employee Rules & Regulations',
      description: 'Comprehensive workplace rules covering attendance, dress code, conduct, and disciplinary procedures',
      category: 'rules',
      lastUpdated: new Date('2025-06-01'),
      isRequired: true,
      canEdit: true,
      content: `
EQUITY SHOPPER'S SUPERMARKET
EMPLOYEE RULES & REGULATIONS

Effective Date: 1st June, 2025
Purpose: To ensure a professional, safe, and efficient work environment for all employees and customers.

1. WORK SCHEDULE & PUNCTUALITY

• Working Hours: Employees must arrive 10 minutes before their shift starts i.e 7:50 am and 6:50pm for the day and night shifts respectively.

• Late Coming:
  > 1-15 minutes late: Verbal warning.
  > 16-30 minutes late: Written warning.
  > More than 30 minutes late without notice: Considered absenteeism (subject to disciplinary action).

• Absenteeism:
  > Unauthorized absence for 2+ consecutive days may lead to suspension or termination.
  > Frequent absences (more than 3 times a month) require a medical certificate or formal explanation.

• Break Times:
  > Strictly 30 minutes as per meals program—unauthorized extended breaks will be penalized.

• Daily Checkout-Inspection:
  > Among the employees, one from both genders will be assigned the duty of checkout-inspection every week and he/she will exercise it strictly at the designated exit.

2. DRESS CODE & GROOMING

• Uniform:
  > Provided by supermarket: Must be worn clean and ironed daily.
  > Not provided: Wear plain black trousers/skirts (knee-length or longer) and a white/company-branded top.

• Prohibited Attire:
  > Short skirts/dresses (above knee), ripped jeans for the female employees.
  > Excessively skinny jeans and shorts for the male employees.
  > Excessive jewelry/perfume (hygiene/safety hazard), slippers, or offensive graphics.

Hairstyles (Male Employees)
• Acceptable:
  > Neat, tapered cuts (e.g., crew cut, fade, short afro).
  > Trimmed beards (if worn) – no longer than 1 inch (2.5 cm).

• Unacceptable:
  > Unkempt/dreaded hair (unless neatly groomed and covered in food sections).
  > Extreme styles (e.g., mohawks, bright colors) unless approved by management.

2. PERSONAL HYGIENE (ALL STAFF)

• Daily Requirements:
  > Shower before shifts – no body odor.
  > Brush teeth or use mouthwash – no bad breath.
  > Wear deodorant/antiperspirant – no excessive perfume/cologne.

3. CUSTOMER SERVICE & PROFESSIONAL CONDUCT

• Behavior:
  > No arguments with customers—refer disputes to a supervisor.
  > No personal calls while assisting customers.

• Relationships:
  > Romantic/familial relationships with customers must not interfere with work.
  > No favors/discounts for friends/family without management approval.

• Confidentiality:
  > Do not disclose sales data, promotions, or customer details to outsiders.

4. ATTENDANCE & LEAVE POLICY

• Reporting Absence:
  > Notify supervisor at least 2 hours before shift (except emergencies).
  > Medical leave requires a doctor's certificate for absences of more than 1 day.

• Unauthorized Leave:
  > More than three unauthorized absences in 6 months will lead to suspension without pay or termination.

5. GENERAL WORKPLACE RULES

• Prohibited Actions:
  > Theft, eating unpaid food, vaping/smoking indoors, or sleeping on duty.
  > Use of phones for the day shift employees (except emergencies).

• Safety:
  > Report spills/breakages immediately.
  > Report any suspicious activity.

6. DISCIPLINARY ACTIONS

Violations will result in:
1. First Offense: Verbal warning.
2. Second Offense: Written warning + probation.
3. Third Offense: Suspension without pay or termination.

Gross misconduct (e.g., theft, fraud) will lead to immediate dismissal.

EMPLOYEE ACKNOWLEDGEMENT

I have read and agree to comply with Supermarket's rules. I understand that violations may lead to penalties.

Name: _________________ Signature: _____________ Date: ___/___/____
`
    },
    {
      id: 'employment-contract',
      title: 'Employment Contract',
      description: 'Standard employment agreement outlining terms, conditions, and responsibilities',
      category: 'contract',
      lastUpdated: new Date('2025-01-15'),
      isRequired: true,
      canEdit: true,
      content: `
EMPLOYMENT CONTRACT

Employer: Equity Shopper's Supermarket
Employee Name: _________________________
Position: _______________________________
Date of Joining: _______________________
Contract Duration: Fixed-Term
Location: One Stop Center Building, Kampala-Masaka Road.

This Employment Contract ("Contract") is entered into between Equity Shopper's Supermarket ("Employer") and the above-named Employee in accordance with the labor laws of Uganda.

1. TERMS OF EMPLOYMENT

• The Employee shall be employed in the position of _________________________ at Equity Shopper's Supermarket.

• Probation Period: [3 months/6 months] (if applicable). Performance will be reviewed before confirmation.

• Working Hours:
  • Day Shift: 8:00 AM – 10:00 PM (with 30-minute break).
  • Night Shift: 7:00 PM – 6:00 AM (with 30-minute break).
  • Employees must arrive 10 minutes before shift starts.

2. REMUNERATION & BENEFITS

• Basic Salary: _____________ per month.
• Payment Date: By the 7th of every month via bank transfer, mobile money or cash.
• Benefits: _________________________________
• Performance-based bonuses (subject to management approval).

3. DUTIES & RESPONSIBILITIES

The Employee shall:
• Adhere to Equity Shopper's Supermarket Rules & Regulations (provided separately).
• Maintain professionalism, hygiene, and punctuality.
• Provide excellent customer service.
• Follow safety and security protocols.
• Report any misconduct or hazards to management.

4. LEAVE POLICY

• Sick Leave: 10 days per year (medical certificate required if >1 day).
• Emergency Leave: Subject to prior approval.
• Maternity/Paternity Leave: As per labor laws.

5. TERMINATION

A. By Employer
The Employer may terminate this Contract with written notice under the following conditions:
• Misconduct (theft, fraud, harassment, repeated violations).
• Poor Performance (after warnings and probation review).
• Redundancy/Business Closure

B. By Employee
• The Employee must give 7 days' notice in writing.
• Failure to provide notice may result in forfeiture of benefits.

6. CONFIDENTIALITY & NON-COMPETE

• The Employee shall not disclose trade secrets, sales data, or customer information to third parties.
• A 6-month non-compete clause applies post-employment.

7. GENERAL PROVISIONS

• This Contract supersedes any prior agreements.
• Disputes shall be resolved per Uganda labor laws.

EMPLOYEE ACKNOWLEDGEMENT

I _________________________, acknowledge that I have read, understood, and agree to the terms of this Employment Contract.

Employee Signature: _________________________
Date: ____/____/____

Employer Representative: _________________________
Signature & Stamp: _________________________
Date: ____/____/____

Attachments:
1. Equity Shopper's Supermarket Employee Rules & Regulations (provided separately).
`
    },
    {
      id: 'employee-information-form',
      title: 'Employee Information Form',
      description: 'Confidential form for collecting comprehensive employee personal and employment data',
      category: 'form',
      lastUpdated: new Date('2025-01-10'),
      isRequired: true,
      canEdit: true,
      content: `
EQUITY SHOPPER'S SUPERMARKET
EMPLOYEE INFORMATION FORM
(Confidential – For HR Use Only)

[Attach passport photo]

SECTION 1: PERSONAL INFORMATION

1. Full Name: _________________________________
   Surname: _________________________________
   First Name: ______________________________
   Other Names: _____________________________

2. Date of Birth: ___/___/______ (DD/MM/YYYY)

3. Gender: ☐ Male ☐ Female

4. NIN: ____________________________________

5. Marital Status: ☐ Single ☐ Married ☐ Divorced ☐ Widowed

6. Contact Information:
   Phone: ___________________________________
   Email: ___________________________________
   Residential Address: _______________________
   _______________________________________

SECTION 2: EMPLOYMENT INFORMATION

8. Job Title/Position: __________________________

9. Department: ☐ Cashier ☐ Stock/Inventory ☐ Customer Service (Specify section):
   _________________________ ☐ Management ☐ _____________

10. Date of Hire: ____/____/______ (DD/MM/YYYY)

11. Employment Type: ☐ Full-Time ☐ Part-Time ☐ Temporary ☐ Contract

12. Supervisor's Name: __________________________

13. Payment Details (for payroll):
    Payment Methods: ___________________________
    Name: ____________________________________
    Number: __________________________________

SECTION 3: PARENTS/GUARDIAN INFORMATION

14. Father's Name: ____________________________
    Occupation: ______________________________
    Contact No.: _____________________________

15. Mother's Name: ____________________________
    Occupation: ______________________________
    Contact No.: _____________________________

16. Guardian (if applicable): ____________________
    Relationship: _____________________________
    Contact No.: _____________________________

SECTION 4: NEXT OF KIN (Emergency Contact)

17. Name: ___________________________________

18. Relationship: _____________________________

19. Phone: __________________________________

20. Address: ________________________________
    _____________________________________

SECTION 5: OTHER RELEVANT INFORMATION

21. Medical Conditions (if any): _________________
    _____________________________________

22. Allergies: _______________________________
    _____________________________________

23. Educational Background:
    Highest Qualification: _____________________
    Institution: ______________________________

24. Previous Employment (if applicable):
    Company: _______________________________
    Position: _______________________________
    Duration: _______________________________

DECLARATION

I certify that the information provided is accurate and complete. I consent to the supermarket using this data for HR, payroll, and emergency purposes.

Employee's Signature: _________________ Date: UNIS (DD/MM/YYYY)
HR Representative's Signature: _________________ Date: ____/____/____

Notes:
• Attach a copy of ID, academic certificates, and any relevant documents
• Update HR promptly if any details change.
`
    },
    {
      id: 'supermarket-operations-mode',
      title: 'Supermarket Mode of Operation',
      description: 'Detailed operational procedures and responsibilities for different departmental roles',
      category: 'operations',
      lastUpdated: new Date('2025-01-05'),
      isRequired: false,
      canEdit: true,
      content: `
EQUITY SHOPPERS
SUPERMARKET MODE OF OPERATION

Purpose: To ensure efficiency, accuracy, teamwork, and customer satisfaction across all departments.

1. STOCK/DEPARTMENTAL ATTENDANTS

Daily Duties:
• Pricing & Labels:
  ○ Update price tags daily based on the central pricing system.
  ○ Report discrepancies (e.g., outdated/low/high prices) to the supervisor immediately.

• Shelf Management:
  ○ Rotate stock (FIFO) – oldest items at the front.
  ○ Keep shelves stocked, clean, and dust-free (wipe down daily).

Non-Negotiables:
☑ No empty shelves during operating hours.
☑ No mismatched price tags.

2. CASHIERS

Daily Duties:
• Customer Service:
  ○ Greet customers, scan items accurately, and announce totals clearly.
  ○ Report pricing errors to stock attendants (do not argue with customers).

• Cleanliness:
  ○ Wipe checkout counters every hour.
  ○ Keep bags/till area tidy.

• Teamwork:
  ○ Call for backup if queues exceed 5 customers
  ○ Assist with shelf labeling during downtime.

Non-Negotiables:
☑ Zero unverified price overrides.
☑ Zero dirty checkout areas.

3. SUPERVISORS

Daily Duties:
• Pricing Audits:
  ○ Conduct random price checks (10 items/day) to ensure accuracy.

• Staff Coordination:
  ○ Assign 15-minute cleaning rosters (all staff must participate).
  ○ Hold a team huddle at shift start to assign tasks.

• Problem-Solving:
  ○ Resolve customer complaints within 10 minutes.
  ○ Document and address recurring issues (e.g., absenteeism).

Non-Negotiables:
☑ No unresolved pricing/cleanliness complaints.
☑ No unsupervised departments.

4. GENERAL RULES FOR ALL STAFF

Teamwork & Accountability:
• "See It, Fix It" Policy:
  ○ If you notice a problem (dirt, misplaced items, wrong prices), solve it or report it immediately.

Cleanliness Standards:
• Daily Tasks:
  ○ Clean assigned items every morning, as well as if the evening if need be.
  ○ Clean spills within 5 minutes.

Pricing Integrity:
• All price changes must be approved by supervisors and updated in the system before tagging.

6. PENALTIES FOR NON-COMPLIANCE

• 1st Offense: Verbal warning + re-training.
• 2nd Offense: Written warning + extra cleaning duty.
• 3rd Offense: Suspension/dismissal.

Gross Negligence (e.g., intentional wrong pricing) = instant dismissal.

EMPLOYEE ACKNOWLEDGEMENT

I understand and will adhere to this Mode of Operation to ensure Supermarket's success.

Name: _________________ Signature: _________________ Date: ____/____/____
`
    }
  ];

  /**
   * Get all company documents
   */
  static getDocuments(): CompanyDocument[] {
    return this.documents;
  }

  /**
   * Get document by ID
   */
  static getDocument(id: string): CompanyDocument | null {
    return this.documents.find(doc => doc.id === id) || null;
  }

  /**
   * Get documents by category
   */
  static getDocumentsByCategory(category: CompanyDocument['category']): CompanyDocument[] {
    return this.documents.filter(doc => doc.category === category);
  }

  /**
   * Update document content
   */
  static updateDocument(id: string, content: string): boolean {
    const document = this.documents.find(doc => doc.id === id);
    if (document && document.canEdit) {
      document.content = content;
      document.lastUpdated = new Date();
      return true;
    }
    return false;
  }

  /**
   * Generate printable HTML for a document
   */
  static generatePrintableHTML(document: CompanyDocument): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${document.title} - Equity Shopper's Supermarket</title>
    <style>
        body {
            font-family: 'Times New Roman', serif;
            line-height: 1.6;
            margin: 20px;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .company-name {
            font-size: 18px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 5px;
        }
        .document-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .content {
            white-space: pre-line;
            margin: 20px 0;
            font-size: 12px;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 20px;
        }
        @media print {
            body { margin: 15px; }
            .no-print { display: none; }
        }
        h1, h2, h3 { 
            color: #2563eb;
            page-break-after: avoid;
        }
        .signature-line {
            border-bottom: 1px solid #333;
            display: inline-block;
            min-width: 200px;
            margin: 0 10px;
        }
        .checkbox {
            display: inline-block;
            width: 12px;
            height: 12px;
            border: 1px solid #333;
            margin-right: 5px;
        }
        ul, ol {
            margin: 10px 0;
            padding-left: 20px;
        }
        .section {
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">EQUITY SHOPPER'S SUPERMARKET</div>
        <div class="document-title">${document.title}</div>
        <div style="font-size: 10px; color: #666;">Last Updated: ${document.lastUpdated.toLocaleDateString()}</div>
    </div>
    
    <div class="content">${document.content.replace(/☐/g, '<span class="checkbox"></span>').replace(/•/g, '•')}</div>
    
    <div class="footer">
        <p>Document ID: ${document.id}</p>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <p>© Equity Shopper's Supermarket - Confidential Document</p>
    </div>
</body>
</html>`;
  }

  /**
   * Get document categories with counts
   */
  static getCategories(): Array<{
    category: CompanyDocument['category'];
    name: string;
    description: string;
    count: number;
  }> {
    const categories = [
      { category: 'rules' as const, name: 'Rules & Regulations', description: 'Workplace policies and conduct guidelines' },
      { category: 'contract' as const, name: 'Employment Contracts', description: 'Standard employment agreements' },
      { category: 'form' as const, name: 'Forms', description: 'Employee information and application forms' },
      { category: 'operations' as const, name: 'Operations Manual', description: 'Departmental procedures and workflows' }
    ];

    return categories.map(cat => ({
      ...cat,
      count: this.documents.filter(d => d.category === cat.category).length
    }));
  }

  /**
   * Get required documents
   */
  static getRequiredDocuments(): CompanyDocument[] {
    return this.documents.filter(doc => doc.isRequired);
  }

  /**
   * Search documents by title or content
   */
  static searchDocuments(searchTerm: string): CompanyDocument[] {
    if (!searchTerm) return this.documents;
    
    const term = searchTerm.toLowerCase();
    return this.documents.filter(doc => 
      doc.title.toLowerCase().includes(term) ||
      doc.description.toLowerCase().includes(term) ||
      doc.content.toLowerCase().includes(term)
    );
  }
} 