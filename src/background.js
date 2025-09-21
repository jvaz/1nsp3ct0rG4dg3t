// Background service worker for 1nsp3ct0rG4dg3t Chrome extension

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

// Handle messages from content scripts and popup
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

    // First check if content script is ready
    const isReady = await checkContentScriptReady(tabId)
    if (!isReady) {
      sendResponse({
        success: false,
        error: 'Content script not ready. Please wait a moment and try again.'
      })
      return
    }

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
    } else {
      sendResponse({ success: false, error: error.message })
    }
  }
}

// Check if content script is ready for a tab
async function checkContentScriptReady(tabId, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' })
      if (response && response.ready) {
        contentScriptReadyTabs.add(tabId)
        return true
      }
    } catch (error) {
      // Content script not ready, wait and retry
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)))
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
    const url = new URL(tab.url)
    const cookies = await chrome.cookies.getAll({ url: url.origin })
    sendResponse({ success: true, data: cookies })
  } catch (error) {
    sendResponse({ success: false, error: error.message })
  }
}

async function handleSetCookie (request, sender, sendResponse) {
  try {
    // Use tabId from request instead of sender.tab.id (which is undefined for popup calls)
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

    const url = new URL(tab.url)

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
    // Use tabId from request instead of sender.tab.id (which is undefined for popup calls)
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

    const url = new URL(tab.url)

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

// Script execution
async function handleExecuteScript (request, sender, sendResponse) {
  try {
    // Forward script execution to content script to avoid CSP issues
    const tabId = request.tabId || sender.tab?.id
    if (!tabId) {
      sendResponse({ success: false, error: 'No tab ID provided' })
      return
    }

    const response = await chrome.tabs.sendMessage(tabId, {
      action: 'executeScript',
      script: request.script
    })
    sendResponse(response)
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