// Validation Utilities for 1nsp3ct0rG4dg3t Extension

/**
 * Validate if a string is valid JSON
 * @param {string} jsonString - The string to validate
 * @returns {boolean} True if valid JSON, false otherwise
 */
export function isValidJSON(jsonString) {
  if (typeof jsonString !== 'string' || !jsonString.trim()) {
    return false
  }

  try {
    JSON.parse(jsonString)
    return true
  } catch (e) {
    return false
  }
}

/**
 * Validate if a string is a valid email address
 * @param {string} email - The email to validate
 * @returns {boolean} True if valid email, false otherwise
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate if a string is a valid storage key
 * @param {string} key - The storage key to validate
 * @returns {string|boolean} True if valid, error message if invalid
 */
export function isValidStorageKey(key) {
  if (!key || !key.trim()) {
    return 'Key is required'
  }
  if (key.length > 100) {
    return 'Key must be less than 100 characters'
  }
  return true
}

/**
 * Validate if a string is a valid cookie name
 * @param {string} name - The cookie name to validate
 * @returns {string|boolean} True if valid, error message if invalid
 */
export function isValidCookieName(name) {
  if (!name || !name.trim()) {
    return 'Cookie name is required'
  }
  // Cookie name validation - no spaces, semicolons, etc.
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return 'Cookie name can only contain letters, numbers, underscores, and hyphens'
  }
  return true
}

/**
 * Validate if a string is a valid cookie domain
 * @param {string} domain - The domain to validate
 * @returns {string|boolean} True if valid, error message if invalid
 */
export function isValidCookieDomain(domain) {
  if (!domain) return true // Domain is optional

  // Basic domain validation
  const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!domainRegex.test(domain)) {
    return 'Invalid domain format'
  }
  return true
}

/**
 * Validate if a string is a valid cookie path
 * @param {string} path - The path to validate
 * @returns {string|boolean} True if valid, error message if invalid
 */
export function isValidCookiePath(path) {
  if (!path) return true // Path is optional

  if (!path.startsWith('/')) {
    return 'Cookie path must start with /'
  }
  return true
}

/**
 * Validate storage value - can be plain text or JSON
 * @param {string} value - The value to validate
 * @param {boolean} requireJSON - Whether to require valid JSON
 * @returns {string|boolean} True if valid, error message if invalid
 */
export function validateStorageValue(value, requireJSON = false) {
  if (!value && value !== '') {
    return 'Value is required'
  }

  if (requireJSON) {
    if (!isValidJSON(value)) {
      return 'Value must be valid JSON'
    }
  }

  return true
}