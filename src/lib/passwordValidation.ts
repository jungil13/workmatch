/**
 * Shared password validation utility.
 * Enforced on both client (for UX) and server (for security).
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  checks: {
    minLength: boolean;
    hasLetter: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export function validatePassword(password: string): PasswordValidationResult {
  const checks = {
    minLength: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^a-zA-Z0-9]/.test(password),
  };

  const errors: string[] = [];
  if (!checks.minLength) errors.push('At least 8 characters');
  if (!checks.hasLetter) errors.push('At least one letter');
  if (!checks.hasNumber) errors.push('At least one number');
  if (!checks.hasSpecial) errors.push('At least one special character (e.g. !@#$%)');

  return {
    isValid: errors.length === 0,
    errors,
    checks,
  };
}
