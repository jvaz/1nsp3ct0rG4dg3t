// Background service worker for 1nsp3ct0rG4dg3t Chrome extension

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
    case 'executeScript':
      handleExecuteScript (request, sender, sendResponse)
      break
    case 'getTabInfo':
      handleGetTabInfo (request, sender, sendResponse)
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

    // Get tab info to validate
    const tab = await chrome.tabs.get(tabId)
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

    // Try to send message directly first (maybe script is ready)
    try {
      const response = await chrome.tabs.sendMessage(tabId, payload)
      if (response) {
        sendResponse(response)
        return
      }
    } catch (directError) {
      // If direct send fails, check readiness and try again
      console.log('Direct message failed, checking content script readiness')
    }

    // Check if content script is ready
    const isReady = await checkContentScriptReady(tabId)
    if (!isReady) {
      sendResponse({
        success: false,
        error: 'Content script not ready. Try refreshing the page or wait a moment.'
      })
      return
    }

    // Try sending message again
    const response = await chrome.tabs.sendMessage(tabId, payload)
    sendResponse(response)
  } catch (error) {
    console.error('Error forwarding to content script:', error)

    // Provide more specific error messages
    if (error.message.includes('Receiving end does not exist')) {
      sendResponse({
        success: false,
        error: 'Content script not available. Try refreshing the page.'
      })
    } else if (error.message.includes('No tab with id')) {
      sendResponse({
        success: false,
        error: 'Tab was closed or is not accessible.'
      })
    } else {
      sendResponse({ success: false, error: error.message })
    }
  }
}

// Check if content script is ready for a tab
async function checkContentScriptReady(tabId, maxRetries = 2) {
  // First check if we already know it's ready
  if (contentScriptReadyTabs.has(tabId)) {
    return true
  }

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' })
      if (response && response.success && response.ready) {
        contentScriptReadyTabs.add(tabId)
        return true
      }
    } catch (error) {
      // Content script not ready, wait and retry
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 200 * (i + 1)))
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

// Script execution with enhanced CSP-compliant methods
async function handleExecuteScript (request, sender, sendResponse) {
  const executionStart = performance.now()
  console.log('[BACKGROUND] handleExecuteScript() called at:', executionStart)

  try {
    console.log('[BACKGROUND] Request validation:')
    console.log('  - script type:', typeof request?.script)
    console.log('  - script length:', request?.script?.length || 'N/A')
    console.log('  - script preview:', request?.script?.substring(0, 100) + (request?.script?.length > 100 ? '...' : ''))

    const tabId = request.tabId || sender.tab?.id
    console.log('[BACKGROUND] Resolved tabId:', tabId)

    if (!tabId) {
      console.log('[BACKGROUND] No tab ID available')
      sendResponse({ success: false, error: 'No tab ID provided' })
      return
    }

    // Get tab information
    const tab = await chrome.tabs.get(tabId)
    if (!tab) {
      sendResponse({ success: false, error: 'Tab not found' })
      return
    }

    console.log('[BACKGROUND] Tab URL:', tab.url)

    // Check if we can use chrome.scripting.executeScript for simple expressions
    const scriptAnalysis = analyzeScript(request.script)
    console.log('[BACKGROUND] Script analysis:', scriptAnalysis)

    if (scriptAnalysis.canUseScriptingAPI && isContentScriptSupported(tab.url)) {
      console.log('[BACKGROUND] Using chrome.scripting.executeScript with function injection')
      try {
        const result = await executeWithScriptingAPI(tabId, request.script, scriptAnalysis)
        console.log('[BACKGROUND] Scripting API execution successful')
        sendResponse({ success: true, result })
        return
      } catch (scriptingError) {
        console.log('[BACKGROUND] Scripting API failed, falling back to content script:', scriptingError.message)
        // Fall through to content script method
      }
    }

    // Fallback to content script method for complex scripts or when scripting API fails
    console.log('[BACKGROUND] Using content script method')

    if (!isContentScriptSupported(tab.url)) {
      sendResponse({
        success: false,
        error: 'Script execution not supported on this page type'
      })
      return
    }

    const messagePayload = {
      action: 'executeScript',
      script: request.script
    }

    console.log('[BACKGROUND] Sending message to content script')
    const response = await chrome.tabs.sendMessage(tabId, messagePayload)
    console.log('[BACKGROUND] Content script response received')
    sendResponse(response)

  } catch (error) {
    console.error('[BACKGROUND] handleExecuteScript() caught error:', error)
    const errorResponse = { success: false, error: error.message }
    sendResponse(errorResponse)
  }

  const executionEnd = performance.now()
  console.log('[BACKGROUND] handleExecuteScript() completed in:', executionEnd - executionStart, 'ms')
}

// Analyze script to determine best execution method
function analyzeScript(script) {
  if (!script || typeof script !== 'string') {
    return { canUseScriptingAPI: false, type: 'invalid' }
  }

  const trimmedScript = script.trim()

  // Simple expressions that can be wrapped in a function
  const simpleExpressionPatterns = [
    /^document\./,                    // DOM queries
    /^window\./,                      // Window properties
    /^location\./,                    // Location properties
    /^navigator\./,                   // Navigator properties
    /^console\./,                     // Console operations
    /^Math\./,                        // Math operations
    /^Date\./,                        // Date operations
    /^JSON\./,                        // JSON operations
    /^Array\./,                       // Array operations
    /^Object\./,                      // Object operations
    /^String\./,                      // String operations
    /^Number\./,                      // Number operations
    /^Boolean\./,                     // Boolean operations
    /^\w+\s*\(.*\)$/,                 // Function calls
    /^[a-zA-Z_$][\w$]*(\.[a-zA-Z_$][\w$]*)*$/,  // Property access
    /^["'].*["']$/,                   // String literals
    /^\d+(\.\d+)?$/,                  // Number literals
    /^(true|false)$/,                 // Boolean literals
    /^null$/,                         // Null literal
    /^undefined$/                     // Undefined literal
  ]

  // Complex patterns that need content script injection
  const complexPatterns = [
    /\beval\s*\(/,                    // eval() calls
    /\bnew\s+Function\s*\(/,          // Function constructor
    /\bsetTimeout\s*\(/,              // setTimeout with code strings
    /\bsetInterval\s*\(/,             // setInterval with code strings
    /\bexecScript\s*\(/,              // execScript calls
    /\bwith\s*\(/,                    // with statements
    /\breturn\s+/,                    // return statements (need function context)
    /\bfor\s*\(/,                     // for loops (complex control flow)
    /\bwhile\s*\(/,                   // while loops
    /\bif\s*\(/,                      // if statements (may need broader context)
    /\bfunction\s+/,                  // function declarations
    /\bclass\s+/,                     // class declarations
    /\bvar\s+/,                       // variable declarations (scoping issues)
    /\blet\s+/,                       // let declarations
    /\bconst\s+/,                     // const declarations
    /=>/,                             // arrow functions
    /\{[\s\S]*\}/                     // code blocks
  ]

  // Check for complex patterns first
  for (const pattern of complexPatterns) {
    if (pattern.test(trimmedScript)) {
      return {
        canUseScriptingAPI: false,
        type: 'complex',
        reason: 'Contains complex syntax requiring content script injection'
      }
    }
  }

  // Check for simple expressions
  for (const pattern of simpleExpressionPatterns) {
    if (pattern.test(trimmedScript)) {
      return {
        canUseScriptingAPI: true,
        type: 'simple',
        reason: 'Simple expression suitable for function injection'
      }
    }
  }

  // Default to complex for safety
  return {
    canUseScriptingAPI: false,
    type: 'unknown',
    reason: 'Unknown pattern, using content script for safety'
  }
}

// Execute script using chrome.scripting.executeScript with function injection
async function executeWithScriptingAPI(tabId, script, analysis) {
  console.log('[BACKGROUND] Executing with chrome.scripting.executeScript')

  // Create a function that returns the result of the script
  // This function runs in the page context where eval() is allowed
  const scriptFunction = (userScript) => {
    try {
      // Execute the script and return the result
      // This eval() runs in the page context, not the extension context
      return eval(userScript)
    } catch (error) {
      throw new Error(error.message)
    }
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: scriptFunction,
    args: [script]
  })

  if (!results || results.length === 0) {
    throw new Error('No results returned from script execution')
  }

  const result = results[0].result

  // Serialize the result similar to content script method
  let serializedResult
  if (result === undefined) {
    serializedResult = 'undefined'
  } else if (result === null) {
    serializedResult = 'null'
  } else if (typeof result === 'function') {
    serializedResult = result.toString()
  } else if (typeof result === 'object') {
    try {
      serializedResult = JSON.stringify(result, null, 2)
    } catch (jsonError) {
      serializedResult = result.toString()
    }
  } else {
    serializedResult = String(result)
  }

  return serializedResult
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