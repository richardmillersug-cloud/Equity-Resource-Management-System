/** Deterministic account number from branchId — same input always gives same output */
export function generateAccountNumber(branchId: string): string {
  let hash = 5381;
  for (let i = 0; i < branchId.length; i++) {
    hash = ((hash << 5) + hash + branchId.charCodeAt(i)) & 0x7fffffff;
  }
  const digits = String(hash).padStart(10, '1').slice(0, 10);
  return `1001 ${digits.slice(0, 4)} ${digits.slice(4, 8)}`;
}

export function maskAccountNumber(acct: string): string {
  const parts = acct.split(' ');
  if (parts.length < 3) return acct;
  return `${parts[0]} •••• ${parts[2]}`;
}
