// Message Handler Service for 1nsp3ct0rG4dg3t Extension

export class MessageHandler {
  constructor() {
    this.maxRetries = 2
  }

  async sendMessage(action, data = {}, maxRetries = 2) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check if extension context is still valid
        if (!chrome.runtime?.id) {
          return { success: false, error: 'Extension context invalidated. Please reload the extension.' }
        }

        const tab = await this.getCurrentTab()
        if (!tab) {
          console.error('No active tab found')
          return { success: false, error: 'No active tab found' }
        }

        // Check if this is a retry
        if (attempt > 0) {
          // Wait longer on retries
          await new Promise(resolve => setTimeout(resolve, 500 * attempt))
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

        // If this is a connection error and we have retries left, continue
        if (response && response.error && response.error.includes('not ready') && attempt < maxRetries) {
          console.log(`Attempt ${attempt + 1} failed, retrying...`)
          continue
        }

        return response
      } catch (error) {
        console.error(`Error sending message (attempt ${attempt + 1}):`, error)

        // Check for context invalidation
        if (error.message.includes('Extension context invalidated')) {
          return { success: false, error: 'Extension context invalidated. Please reload the extension.' }
        }

        // If this is the last attempt, return the error
        if (attempt === maxRetries) {
          return { success: false, error: error.message }
        }

        // Otherwise, continue to retry
        console.log(`Attempt ${attempt + 1} failed, retrying...`)
      }
    }

    return { success: false, error: 'Max retries exceeded' }
  }

  async sendMessageWithRetry(action, data = {}, maxRetries = 2) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await this.sendMessage(action, data)
        if (response && response.success) {
          return response
        }

        // If response indicates content script not ready, wait before retry
        if (response?.error?.includes('Content script not ready')) {
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
            continue
          }
        }

        return response
      } catch (error) {
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
        } else {
          throw error
        }
      }
    }
  }

  async getCurrentTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      return tabs?.[0] || null
    } catch (error) {
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