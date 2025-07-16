import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Timestamp } from "firebase/firestore"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// =====================================================
// DATE AND TIMESTAMP UTILITIES
// =====================================================

/**
 * Safely converts Firestore Timestamp to Date
 * Handles various input types and returns a valid Date object
 */
export function toSafeDate(dateValue: any): Date {
  if (!dateValue) {
    return new Date()
  }

  try {
    // If it's already a Date object
    if (dateValue instanceof Date) {
      return isNaN(dateValue.getTime()) ? new Date() : dateValue
    }

    // If it's a Firestore Timestamp
    if (dateValue && typeof dateValue.toDate === 'function') {
      return dateValue.toDate()
    }

    // If it's a Firestore Timestamp object with seconds
    if (dateValue && typeof dateValue.seconds === 'number') {
      return new Date(dateValue.seconds * 1000)
    }

    // If it's a string or number
    if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      const date = new Date(dateValue)
      return isNaN(date.getTime()) ? new Date() : date
    }

    // Default fallback
    return new Date()
  } catch (error) {
    console.warn('Error converting date value:', dateValue, error)
    return new Date()
  }
}

/**
 * Safely converts Firestore Timestamp to Date with null handling
 * Returns null if the input is null/undefined, otherwise returns a Date
 */
export function toSafeDateOrNull(dateValue: any): Date | null {
  if (!dateValue || dateValue === null || dateValue === undefined) {
    return null
  }
  return toSafeDate(dateValue)
}

/**
 * Checks if a value is a valid Firestore Timestamp
 */
export function isFirestoreTimestamp(value: any): value is Timestamp {
  return value && typeof value.toDate === 'function' && typeof value.seconds === 'number'
}

/**
 * Safely formats a date value to locale string
 */
export function formatSafeDate(dateValue: any, options?: Intl.DateTimeFormatOptions): string {
  const date = toSafeDate(dateValue)
  return date.toLocaleDateString('en-UG', options || {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Safely formats a date value to locale date and time string
 */
export function formatSafeDateTime(dateValue: any): string {
  const date = toSafeDate(dateValue)
  return date.toLocaleString('en-UG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// =====================================================
// EMPLOYEE UTILITIES
// =====================================================

/**
 * Safely extracts the role from an employee object
 * Handles both 'role' and 'roles' properties
 */
export function getEmployeeRole(employee: any): string {
  if (!employee) return 'Employee'
  
  // Check for direct role property
  if (employee.role && typeof employee.role === 'string') {
    return employee.role
  }
  
  // Check for roles array
  if (employee.roles && Array.isArray(employee.roles) && employee.roles.length > 0) {
    const firstRole = employee.roles[0]
    if (typeof firstRole === 'string') {
      return firstRole
    }
    if (firstRole && firstRole.jobTitle) {
      return firstRole.jobTitle
    }
  }
  
  // Check for jobTitle directly
  if (employee.jobTitle && typeof employee.jobTitle === 'string') {
    return employee.jobTitle
  }
  
  // Default fallback
  return 'Employee'
}

/**
 * Safely extracts phone numbers array with null checking
 */
export function getPhoneNumbers(entity: any): string[] {
  if (!entity) return []
  
  const phoneNumbers = entity.phoneNumbers || entity.PhoneNumbers || []
  return Array.isArray(phoneNumbers) ? phoneNumbers : []
}

/**
 * Safely extracts bank accounts array with null checking
 */
export function getBankAccounts(entity: any): any[] {
  if (!entity) return []
  
  const bankAccounts = entity.bankAccounts || entity.BankAccounts || []
  return Array.isArray(bankAccounts) ? bankAccounts : []
}

/**
 * Gets the first phone number safely
 */
export function getFirstPhoneNumber(entity: any): string {
  const phones = getPhoneNumbers(entity)
  return phones.length > 0 ? phones[0] : 'No phone'
}

/**
 * Gets the first bank account safely
 */
export function getFirstBankAccount(entity: any): any {
  const accounts = getBankAccounts(entity)
  return accounts.length > 0 ? accounts[0] : null
}

// =====================================================
// EXISTING UTILITIES (UNCHANGED)
// =====================================================

export function formatCurrency(amount: number, currency: string = 'UGX'): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-UG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-UG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
} 