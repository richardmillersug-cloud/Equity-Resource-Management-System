export type DocumentType =
  | 'employment_contract'
  | 'operations_manual'
  | 'employment_form'
  | 'policy_document'
  | 'training_certificate'
  | 'chairman_letter'
  | 'national_id_employee'
  | 'national_id_next_of_kin'
  | 'employment_contract_main'
  | 'rules_and_regulations'
  | 'employee_information_form'
  | 'mode_of_operation'
  | 'application_letter'
  | 'other';

export const DOCUMENT_TYPE_OPTIONS: Array<{ value: DocumentType; label: string }> = [
  { value: 'employment_contract', label: 'Employment Contract (Signed)' },
  { value: 'employment_contract_main', label: 'Employment Contract (Template)' },
  { value: 'operations_manual', label: 'Operations Manual' },
  { value: 'employment_form', label: 'Employment Form' },
  { value: 'policy_document', label: 'Policy Document' },
  { value: 'training_certificate', label: 'Training Certificate' },
  { value: 'chairman_letter', label: 'Chairman Letter' },
  { value: 'application_letter', label: 'Application Letter' },
  { value: 'national_id_employee', label: 'Employee National ID' },
  { value: 'national_id_next_of_kin', label: 'Next-of-Kin National ID' },
  { value: 'rules_and_regulations', label: 'Rules & Regulations' },
  { value: 'employee_information_form', label: 'Employee Information Form' },
  { value: 'mode_of_operation', label: 'Mode of Operation' },
  { value: 'other', label: 'Other' }
];

export const getDocumentTypeLabel = (value: DocumentType): string => {
  return DOCUMENT_TYPE_OPTIONS.find(o => o.value === value)?.label || value;
}; 