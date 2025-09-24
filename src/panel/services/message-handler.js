// Message Handler Service for 1nsp3ct0rG4dg3t Extension

export class MessageHandler {
  constructor() {
    this.maxRetries = 3
  }

  async sendMessage(action, data = {}, maxRetries = this.maxRetries) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Check if extension context is still valid
        if (!this.isExtensionContextValid()) {
          return { success: false, error: 'Extension context invalidated. Please reload the extension.' }
        }

        const tab = await this.getCurrentTab()
        if (!tab) {
          console.error('No active tab found')
          return { success: false, error: 'No active tab found' }
        }

        // Wait before retry (except first attempt)
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 300 * attempt))
        }

        // Send message via background script to handle properly
        const response = await chrome.runtime.sendMessage({
          action: 'forwardToContentScript',
          tabId: tab.id,
          payload: { action, ...data }
        })

        // If successful, return response
        if (response && response.success) {
          return response
        }

        // If this is the last attempt, return the error response
        if (attempt === maxRetries - 1) {
          return response || { success: false, error: 'No response received' }
        }

        // Log retry attempt
        console.log(`Message attempt ${attempt + 1} failed: ${response?.error || 'Unknown error'}, retrying...`)

      } catch (error) {
        console.error(`Error sending message (attempt ${attempt + 1}):`, error)

        // Check for context invalidation
        if (error.message.includes('Extension context invalidated')) {
          return { success: false, error: 'Extension context invalidated. Please reload the extension.' }
        }

        // If this is the last attempt, return the error
        if (attempt === maxRetries - 1) {
          return { success: false, error: error.message }
        }

        // Otherwise, continue to retry
        console.log(`Attempt ${attempt + 1} failed, retrying...`)
      }
    }

    return { success: false, error: 'Max retries exceeded' }
  }


  async getCurrentTab() {
    try {
      // Check extension context before attempting API call
      if (!this.isExtensionContextValid()) {
        console.error('Extension context invalidated while getting current tab')
        return null
      }

      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      return tabs?.[0] || null
    } catch (error) {
      // Check if error is due to extension context invalidation
      if (error.message && error.message.includes('Extension context invalidated')) {
        console.error('Extension context invalidated during tab query')
        return null
      }
      console.error('Error getting current tab:', error)
      return null
    }
  }

  async sendDirectMessage(message) {
    try {
      return await chrome.runtime.sendMessage(message)
    } catch (error) {
      console.error('Error sending direct message:', error)
      return { success: false, error: error.message }
    }
  }

  isExtensionContextValid() {
    try {
      // Multiple checks to ensure extension context is valid
      if (!chrome || !chrome.runtime) {
        return false
      }

      // Check if runtime ID is available
      if (!chrome.runtime.id) {
        return false
      }

      // Try to access extension APIs
      if (!chrome.tabs || !chrome.tabs.query) {
        return false
      }

      return true
    } catch (error) {
      console.warn('Extension context validation failed:', error)
      return false
    }
  }

  isContentScriptSupported(url) {
    if (!url) return false

    // Check if URL is supported for content script injection
    const supportedProtocols = ['http:', 'https:']
    const unsupportedPages = [
      'chrome://',
      'chrome-extension://',
      'moz-extension://',
      'edge://',
      'about:',
      'data:',
      'javascript:'
    ]

    try {
      const urlObj = new URL(url)

      // Check protocol
      if (!supportedProtocols.includes(urlObj.protocol)) {
        return false
      }

      // Check for unsupported pages
      if (unsupportedPages.some(prefix => url.startsWith(prefix))) {
        return false
      }

      return true
    } catch (error) {
      console.error('Error parsing URL:', error)
      return false
    }
  }
}