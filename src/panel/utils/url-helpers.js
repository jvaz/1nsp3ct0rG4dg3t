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

/**
 * Validates if a string is a valid URL
 * @param {string} url - The URL to validate
 * @returns {boolean} True if valid URL, false otherwise
 */
export function isValidUrl(url) {
  return safeCreateUrl(url) !== null
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