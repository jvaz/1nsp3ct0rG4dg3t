// URL validation and parsing utilities for 1nsp3ct0rG4dg3t Extension

/**
 * Safely parses a URL and extracts the hostname
 * @param {string} url - The URL to parse
 * @param {string} fallback - Fallback value if URL is invalid (default: 'unknown')
 * @returns {string} The hostname or fallback value
 */
export function getHostnameFromUrl(url, fallback = 'unknown') {
  if (!url || typeof url !== 'string') {
    return fallback
  }

  try {
    const urlObj = new URL(url)
    return urlObj.hostname || fallback
  } catch (error) {
    console.warn('Invalid URL provided to getHostnameFromUrl:', url, error.message)
    return fallback
  }
}

/**
 * Safely parses a URL and extracts the protocol
 * @param {string} url - The URL to parse
 * @param {string} fallback - Fallback value if URL is invalid (default: 'unknown:')
 * @returns {string} The protocol or fallback value
 */
export function getProtocolFromUrl(url, fallback = 'unknown:') {
  if (!url || typeof url !== 'string') {
    return fallback
  }

  try {
    const urlObj = new URL(url)
    return urlObj.protocol || fallback
  } catch (error) {
    console.warn('Invalid URL provided to getProtocolFromUrl:', url, error.message)
    return fallback
  }
}

/**
 * Safely parses a URL and extracts the origin
 * @param {string} url - The URL to parse
 * @param {string} fallback - Fallback value if URL is invalid (default: '')
 * @returns {string} The origin or fallback value
 */
export function getOriginFromUrl(url, fallback = '') {
  if (!url || typeof url !== 'string') {
    return fallback
  }

  try {
    const urlObj = new URL(url)
    return urlObj.origin || fallback
  } catch (error) {
    console.warn('Invalid URL provided to getOriginFromUrl:', url, error.message)
    return fallback
  }
}

/**
 * Safely creates a URL object with error handling
 * @param {string} url - The URL to parse
 * @returns {URL|null} URL object or null if invalid
 */
export function safeCreateUrl(url) {
  if (!url || typeof url !== 'string') {
    return null
  }

  try {
    return new URL(url)
  } catch (error) {
    console.warn('Invalid URL provided to safeCreateUrl:', url, error.message)
    return null
  }
}

// Security: Allowed protocols for the extension
const ALLOWED_PROTOCOLS = new Set([
  'http:',
  'https:',
  'file:'
])

// Security: Restricted protocols that should never be processed
const RESTRICTED_PROTOCOLS = new Set([
  'javascript:',
  'data:',
  'vbscript:',
  'about:',
  'chrome:',
  'chrome-extension:',
  'moz-extension:',
  'edge-extension:'
])

/**
 * Validates if a string is a valid URL with security checks
 * @param {string} url - The URL to validate
 * @param {boolean} strictMode - Whether to apply strict protocol filtering (default: true)
 * @returns {boolean} True if valid and safe URL, false otherwise
 */
export function isValidUrl(url, strictMode = true) {
  const urlObj = safeCreateUrl(url)
  if (!urlObj) {
    return false
  }

  // Security check: block dangerous protocols
  if (RESTRICTED_PROTOCOLS.has(urlObj.protocol)) {
    console.warn('Blocked dangerous protocol:', urlObj.protocol)
    return false
  }

  // In strict mode, only allow specific protocols
  if (strictMode && !ALLOWED_PROTOCOLS.has(urlObj.protocol)) {
    console.warn('Protocol not allowed in strict mode:', urlObj.protocol)
    return false
  }

  return true
}

/**
 * Validates if a URL is safe for extension operations
 * @param {string} url - The URL to validate
 * @returns {boolean} True if safe for extension operations, false otherwise
 */
export function isSafeUrl(url) {
  const urlObj = safeCreateUrl(url)
  if (!urlObj) {
    return false
  }

  // Block dangerous protocols
  if (RESTRICTED_PROTOCOLS.has(urlObj.protocol)) {
    return false
  }

  // Additional security checks
  try {
    // Check for suspicious URL patterns
    const suspiciousPatterns = [
      /javascript:/i,
      /data:text\/html/i,
      /vbscript:/i,
      /%[0-9a-f]{2}javascript/i  // URL-encoded javascript
    ]

    const urlString = url.toLowerCase()
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(urlString)) {
        console.warn('Blocked suspicious URL pattern:', url)
        return false
      }
    }

    return true
  } catch (error) {
    console.warn('Error validating URL safety:', error)
    return false
  }
}

/**
 * Gets domain from tab object safely
 * @param {Object} tab - Chrome tab object
 * @param {string} fallback - Fallback value (default: 'unknown')
 * @returns {string} The domain or fallback value
 */
export function getDomainFromTab(tab, fallback = 'unknown') {
  if (!tab || !tab.url) {
    return fallback
  }
  return getHostnameFromUrl(tab.url, fallback)
}