/**
 * Password validation utilities
 */

/**
 * Validate password strength
 * @param {string} password - The password to validate
 * @returns {string[]} Array of error messages (empty if valid)
 */
export function validatePasswordStrength(password) {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return errors;
}

/**
 * Validate email format
 * @param {string} email - The email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 * @param {string} phone - The phone number to validate
 * @returns {boolean} True if valid
 */
export function isValidPhone(phone) {
  if (!phone) return false;
  const phoneRegex = /^[+]?[\d\s-]{10,15}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate Indian pincode format
 * @param {string} pincode - The pincode to validate
 * @returns {boolean} True if valid
 */
export function isValidPincode(pincode) {
  if (!pincode) return false;
  const pincodeRegex = /^[0-9]{5,6}$/;
  return pincodeRegex.test(pincode);
}
