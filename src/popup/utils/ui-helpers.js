// UI Helper Functions for 1nsp3ct0rG4dg3t Extension

/**
 * Show toast notification with type support
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (info, success, error, warning)
 */
export function showToast(message, type = 'info') {
  // Create toast notification with type support
  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  toast.textContent = message

  document.body.appendChild(toast)

  // Animate in
  setTimeout(() => toast.classList.add('show'), 100)

  // Animate out
  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast)
      }
    }, 300)
  }, 3000)
}

/**
 * Escape HTML characters to prevent XSS
 * @param {string} text - The text to escape
 * @returns {string} The escaped HTML
 */
export function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}