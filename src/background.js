// Background service worker for 1nsp3ct0rG4dg3t Chrome extension

// Handle extension context invalidation gracefully
self.addEventListener('error', (event) => {
  if (event.error && event.error.message.includes('Extension context invalidated')) {
    console.warn('Extension context invalidated - background script terminated')
    // Clear any timers or listeners
    contentScriptReadyTabs.clear()
  }
})

// Security: Whitelist of allowed message actions
const ALLOWED_ACTIONS = new Set([
  'contentScriptReady',
  'forwardToContentScript',
  'getStorageData',
  'setStorageData',
  'getCookies',
  'setCookie',
  'deleteCookie',
  'getTabInfo',
  'storageChanged'
])

// Security: Validate incoming messages
function isValidMessage(request, sender) {
  // Check if request exists and has required structure
  if (!request || typeof request !== 'object') {
    console.warn('Invalid message: not an object', request)
    return false
  }

  // Check if action is in whitelist
  if (!ALLOWED_ACTIONS.has(request.action)) {
    console.warn('Invalid message: unknown action', request.action)
    return false
  }

  // Check sender is from extension context (allow both extension context and null sender for internal calls)
  if (sender && sender.id && sender.id !== chrome.runtime.id) {
    console.warn('Invalid message: sender not from extension', sender)
    return false
  }

  // Additional validation for specific actions
  switch (request.action) {
    case 'forwardToContentScript':
      if (!request.payload || typeof request.payload !== 'object') {
        console.warn('Invalid forwardToContentScript: missing payload')
        return false
      }
      if (!request.tabId || typeof request.tabId !== 'number') {
        console.warn('Invalid forwardToContentScript: missing tabId')
        return false
      }
      break
    case 'setStorageData':
      if (!request.storageType || !['localStorage', 'sessionStorage'].includes(request.storageType)) {
        console.warn('Invalid setStorageData: invalid storageType')
        return false
      }
      break
    case 'setCookie':
      if (!request.cookieData || typeof request.cookieData !== 'object') {
        console.warn('Invalid setCookie: missing cookieData object')
        return false
      }
      if (!request.tabId || typeof request.tabId !== 'number') {
        console.warn('Invalid setCookie: missing tabId')
        return false
      }
      break
    case 'deleteCookie':
      if (!request.cookieData || typeof request.cookieData !== 'object') {
        console.warn('Invalid deleteCookie: missing cookieData object')
        return false
      }
      if (!request.cookieData.name || typeof request.cookieData.name !== 'string') {
        console.warn('Invalid deleteCookie: missing cookieData.name')
        return false
      }
      if (!request.tabId || typeof request.tabId !== 'number') {
        console.warn('Invalid deleteCookie: missing tabId')
        return false
      }
      break
  }

  return true
}

// URL Helper Functions
function getOriginFromUrl(url, fallback = '') {
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

function safeCreateUrl(url) {
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

// Extension lifecycle management
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('1nsp3ct0rG4dg3t extension installed')
    // Initialize default settings
    chrome.storage.local.set({
      dashboardConfig: {
        pinnedProperties: [],
        customGroups: [],
        theme: 'light'
      },
      settings: {
        autoRefresh: true,
        refreshInterval: 1000,
        enableNotifications: true
      }
    })
  }
})

// Handle messages from content scripts and panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Validate incoming message for security
  if (!isValidMessage(request, sender)) {
    sendResponse({ success: false, error: 'Invalid message format or action' })
    return true
  }

  switch (request.action) {
    case 'contentScriptReady':
      handleContentScriptReady(request, sender)
      sendResponse({ success: true })
      break
    case 'forwardToContentScript':
      handleForwardToContentScript(request, sender, sendResponse)
      break
    case 'getStorageData':
      handleGetStorageData (request, sender, sendResponse)
      break
    case 'setStorageData':
      handleSetStorageData (request, sender, sendResponse)
      break
    case 'getCookies':
      handleGetCookies (request, sender, sendResponse)
      break
    case 'setCookie':
      handleSetCookie (request, sender, sendResponse)
      break
    case 'deleteCookie':
      handleDeleteCookie (request, sender, sendResponse)
      break
    case 'getTabInfo':
      handleGetTabInfo (request, sender, sendResponse)
      break
    case 'storageChanged':
      // Handle storage change notifications (no response needed)
      sendResponse({ success: true })
      break
    default:
      console.warn('Unknown action:', request.action)
  }
  return true // Keep message channel open for async response
})

// Track content script readiness
const contentScriptReadyTabs = new Set()

// Handle content script ready notifications
function handleContentScriptReady(request, sender) {
  if (sender.tab) {
    contentScriptReadyTabs.add(sender.tab.id)
    console.log(`Content script ready for tab ${sender.tab.id}`)
  }
}

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  contentScriptReadyTabs.delete(tabId)
})

// Forward messages from side panel to content script
async function handleForwardToContentScript(request, sender, sendResponse) {
  try {
    const { tabId, payload } = request

    // Validate tabId
    if (!tabId || typeof tabId !== 'number') {
      sendResponse({
        success: false,
        error: 'Invalid tab ID provided'
      })
      return
    }

    // Get tab info to validate
    let tab
    try {
      tab = await chrome.tabs.get(tabId)
    } catch (tabError) {
      sendResponse({
        success: false,
        error: 'Tab not found or no longer accessible'
      })
      return
    }

    if (!tab) {
      sendResponse({
        success: false,
        error: 'Tab not found'
      })
      return
    }

    // Check if tab URL supports content scripts
    if (!isContentScriptSupported(tab.url)) {
      sendResponse({
        success: false,
        error: 'Content script not supported on this page type'
      })
      return
    }

    // Try to send message with timeout protection
    try {
      const messagePromise = chrome.tabs.sendMessage(tabId, payload)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Message timeout')), 5000)
      )

      const response = await Promise.race([messagePromise, timeoutPromise])

      if (response) {
        sendResponse(response)
        return
      }
    } catch (directError) {
      console.log('Direct message failed:', directError.message)

      // If it's a context invalidation, respond immediately
      if (directError.message.includes('Extension context invalidated')) {
        sendResponse({
          success: false,
          error: 'Extension was reloaded. Please close and reopen the panel.'
        })
        return
      }
    }

    // Check if content script is ready with reduced retries
    const isReady = await checkContentScriptReady(tabId, 1)
    if (!isReady) {
      sendResponse({
        success: false,
        error: 'Content script not ready. Try refreshing the page.'
      })
      return
    }

    // Try sending message again with timeout
    try {
      const messagePromise = chrome.tabs.sendMessage(tabId, payload)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Message timeout')), 3000)
      )

      const response = await Promise.race([messagePromise, timeoutPromise])
      sendResponse(response)
    } catch (retryError) {
      throw retryError
    }
  } catch (error) {
    console.error('Error forwarding to content script:', error)

    // Provide more specific error messages
    if (error.message.includes('Extension context invalidated')) {
      sendResponse({
        success: false,
        error: 'Extension was reloaded. Please close and reopen the panel.'
      })
    } else if (error.message.includes('Receiving end does not exist')) {
      sendResponse({
        success: false,
        error: 'Content script not available. Please refresh the page.'
      })
    } else if (error.message.includes('No tab with id')) {
      sendResponse({
        success: false,
        error: 'Tab was closed or is not accessible.'
      })
    } else if (error.message.includes('Message timeout')) {
      sendResponse({
        success: false,
        error: 'Request timed out. Page may be unresponsive.'
      })
    } else {
      sendResponse({ success: false, error: error.message })
    }
  }
}

// Check if content script is ready for a tab
async function checkContentScriptReady(tabId, maxRetries = 1) {
  // First check if we already know it's ready
  if (contentScriptReadyTabs.has(tabId)) {
    return true
  }

  for (let i = 0; i < maxRetries; i++) {
    try {
      const pingPromise = chrome.tabs.sendMessage(tabId, { action: 'ping' })
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Ping timeout')), 1000)
      )

      const response = await Promise.race([pingPromise, timeoutPromise])

      if (response && response.success && response.ready) {
        contentScriptReadyTabs.add(tabId)
        return true
      }
    } catch (error) {
      // Don't log every ping failure to reduce noise
      if (error.message.includes('Extension context invalidated')) {
        return false // Fail fast on context invalidation
      }

      // Content script not ready, wait and retry
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }
  }
  return false
}

// Storage data operations
async function handleGetStorageData (request, sender, sendResponse) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      func: getPageStorageData,
      args: [request.storageType]
    })
    sendResponse({ success: true, data: results[0].result })
  } catch (error) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleSetStorageData (request, sender, sendResponse) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      func: setPageStorageData,
      args: [request.storageType, request.key, request.value]
    })
    sendResponse({ success: true })
  } catch (error) {
    sendResponse({ success: false, error: error.message })
  }
}

// Cookie operations
async function handleGetCookies (request, sender, sendResponse) {
  try {
    const tabId = request.tabId || sender.tab?.id
    if (!tabId) {
      sendResponse({ success: false, error: 'No tab ID provided' })
      return
    }

    const tab = await chrome.tabs.get(tabId)
    const origin = getOriginFromUrl(tab?.url)
    if (!origin) {
      sendResponse({ success: false, error: 'Invalid tab URL' })
      return
    }
    const cookies = await chrome.cookies.getAll({ url: origin })
    sendResponse({ success: true, data: cookies })
  } catch (error) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleSetCookie (request, sender, sendResponse) {
  try {
    // Use tabId from request instead of sender.tab.id (which is undefined for panel calls)
    const tabId = request.tabId || sender.tab?.id
    if (!tabId) {
      sendResponse({ success: false, error: 'No tab ID provided' })
      return
    }

    const tab = await chrome.tabs.get(tabId)
    if (!tab || !tab.url) {
      sendResponse({ success: false, error: 'Invalid tab or tab URL' })
      return
    }

    const url = safeCreateUrl(tab.url)
    if (!url) {
      sendResponse({ success: false, error: 'Invalid tab URL' })
      return
    }

    // Extract cookie data from request.cookieData or fallback to top-level properties
    const cookieData = request.cookieData || request

    // Validate and normalize sameSite value
    const validSameSiteValues = ['strict', 'lax', 'no_restriction', 'unspecified']
    let sameSite = cookieData.sameSite || 'lax'
    if (!validSameSiteValues.includes(sameSite)) {
      console.warn(`Invalid sameSite value: ${sameSite}, defaulting to 'lax'`)
      sameSite = 'lax'
    }

    await chrome.cookies.set({
      url: url.origin,
      name: cookieData.name,
      value: cookieData.value,
      domain: cookieData.domain || url.hostname,
      path: cookieData.path || '/',
      secure: cookieData.secure || false,
      httpOnly: cookieData.httpOnly || false,
      sameSite: sameSite,
      expirationDate: cookieData.expirationDate
    })
    sendResponse({ success: true })
  } catch (error) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleDeleteCookie (request, sender, sendResponse) {
  try {
    // Use tabId from request instead of sender.tab.id (which is undefined for panel calls)
    const tabId = request.tabId || sender.tab?.id
    if (!tabId) {
      sendResponse({ success: false, error: 'No tab ID provided' })
      return
    }

    const tab = await chrome.tabs.get(tabId)
    if (!tab || !tab.url) {
      sendResponse({ success: false, error: 'Invalid tab or tab URL' })
      return
    }

    const url = safeCreateUrl(tab.url)
    if (!url) {
      sendResponse({ success: false, error: 'Invalid tab URL' })
      return
    }

    // Extract cookie data from request.cookieData or fallback to top-level properties
    const cookieData = request.cookieData || request

    await chrome.cookies.remove({
      url: url.origin,
      name: cookieData.name
    })
    sendResponse({ success: true })
  } catch (error) {
    sendResponse({ success: false, error: error.message })
  }
}


// Tab information
async function handleGetTabInfo (request, sender, sendResponse) {
  try {
    const tab = await chrome.tabs.get(sender.tab.id)
    const tabInfo = {
      title: tab.title,
      url: tab.url,
      favIconUrl: tab.favIconUrl,
      status: tab.status
    }
    sendResponse({ success: true, data: tabInfo })
  } catch (error) {
    sendResponse({ success: false, error: error.message })
  }
}

// Injected functions (these run in the page context)
function getPageStorageData (storageType) {
  const storage = storageType === 'localStorage' ? window.localStorage : window.sessionStorage
  const data = {}
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    data[key] = storage.getItem(key)
  }
  return data
}

function setPageStorageData (storageType, key, value) {
  const storage = storageType === 'localStorage' ? window.localStorage : window.sessionStorage
  storage.setItem(key, value)
}


// Handle extension icon click - open side panel
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked for tab:', tab.id)
  // Open the side panel
  await chrome.sidePanel.open({ windowId: tab.windowId })
})

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-extension') {
    // Open the side panel for the current window
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab) {
      await chrome.sidePanel.open({ windowId: tab.windowId })
    }
  }
})

// Helper function to check if content scripts are supported on a URL
function isContentScriptSupported(url) {
  if (!url) return false

  // Check for supported protocols
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