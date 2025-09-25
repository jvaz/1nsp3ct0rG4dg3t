// Content script for 1nsp3ct0rG4dg3t Chrome extension
// This script runs in the context of web pages and provides access to page storage

// Track content script readiness
let isContentScriptReady = false

// Event listener management
const eventListeners = new Map()
let eventListenerCounter = 0

// Establish communication with the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle ping requests to check readiness
  if (request.action === 'ping') {
    sendResponse({ success: true, ready: isContentScriptReady })
    return
  }

  // Only handle other requests if ready
  if (!isContentScriptReady) {
    sendResponse({ success: false, error: 'Content script not ready' })
    return
  }

  handleMessage(request, sender, sendResponse)
  return true // Keep message channel open for async responses
})

async function handleMessage (request, sender, sendResponse) {
  try {
    switch (request.action) {
      case 'getStorageData':
        sendResponse(await getStorageData(request.storageType))
        break
      case 'setStorageData':
        sendResponse(await setStorageData(request.storageType, request.key, request.value))
        break
      case 'removeStorageData':
        sendResponse(await removeStorageData(request.storageType, request.key))
        break
      case 'clearStorage':
        sendResponse(await clearStorage(request.storageType))
        break
      case 'executeScript':
        sendResponse(await executeScript(request.script))
        break
      case 'getPageInfo':
        sendResponse(await getPageInfo())
        break
      case 'getPerformanceInfo':
        sendResponse(await getPerformanceInfo())
        break
      case 'getSecurityInfo':
        sendResponse(await getSecurityInfo())
        break
      case 'detectFrameworks':
        sendResponse(await detectFrameworks())
        break
      case 'injectElementPicker':
        sendResponse(await handleElementPicker(request.activate))
        break
      case 'getConsoleMessages':
        sendResponse(await getConsoleMessages())
        break
      case 'addEventListener':
        sendResponse(await addEventListenerHandler(request.eventListener))
        break
      case 'removeEventListener':
        sendResponse(await removeEventListenerHandler(request.listenerId))
        break
      case 'toggleEventListener':
        sendResponse(await toggleEventListenerHandler(request.listenerId))
        break
      case 'clearAllEventListeners':
        sendResponse(await clearAllEventListenersHandler())
        break
      case 'getEventListeners':
        sendResponse(await getEventListenersHandler())
        break
      default:
        sendResponse({ success: false, error: 'Unknown action' })
    }
  } catch (error) {
    console.error('Content script error:', error)
    sendResponse({ success: false, error: error.message })
  }
}

// Storage operations
async function getStorageData (storageType) {
  try {
    const storage = getStorageObject(storageType)
    if (!storage) {
      return { success: false, error: `${storageType} not available` }
    }

    const data = {}
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key) {
        data[key] = storage.getItem(key)
      }
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function setStorageData (storageType, key, value) {
  try {
    const storage = getStorageObject(storageType)
    if (!storage) {
      return { success: false, error: `${storageType} not available` }
    }

    storage.setItem(key, value)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function removeStorageData (storageType, key) {
  try {
    const storage = getStorageObject(storageType)
    if (!storage) {
      return { success: false, error: `${storageType} not available` }
    }

    storage.removeItem(key)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function clearStorage (storageType) {
  try {
    const storage = getStorageObject(storageType)
    if (!storage) {
      return { success: false, error: `${storageType} not available` }
    }

    storage.clear()
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

function getStorageObject (storageType) {
  switch (storageType) {
    case 'localStorage':
      return window.localStorage
    case 'sessionStorage':
      return window.sessionStorage
    default:
      return null
  }
}

// Script execution - fixed to avoid CSP unsafe-eval violations
async function executeScript (script) {
  const executionStart = performance.now()
  console.log('[CONTENT-SCRIPT] executeScript() called at:', executionStart)

  try {
    console.log('[CONTENT-SCRIPT] Input validation:')
    console.log('  - script type:', typeof script)
    console.log('  - script length:', script?.length || 'N/A')
    console.log('  - script preview:', script?.substring(0, 100) + (script?.length > 100 ? '...' : ''))

    // Create a unique identifier for this execution
    const timestamp = Date.now()
    const randomPart = Math.random().toString(36).substring(2, 11)
    const executionId = 'inspector_exec_' + timestamp + '_' + randomPart

    console.log('[CONTENT-SCRIPT] Using script element injection to bypass CSP')

    // Create a script element to execute in the page context (bypasses CSP completely)
    const scriptElement = document.createElement('script')
    scriptElement.type = 'text/javascript'

    // Wrap the script to capture result and handle errors in page context
    // This approach avoids eval() and executes in the main world context
    const wrappedScript = `
(function() {
  try {
    console.log("[INJECTED-SCRIPT] Starting execution in page context");
    window.${executionId}_result = undefined;
    window.${executionId}_error = undefined;

    // Execute the user script and capture the result
    const result = (function() {
      ${script}
    })();

    console.log("[INJECTED-SCRIPT] Script executed, result:", result);
    window.${executionId}_result = result;
    window.${executionId}_complete = true;
    console.log("[INJECTED-SCRIPT] Execution completed successfully");
  } catch (error) {
    console.error("[INJECTED-SCRIPT] Execution error:", error);
    window.${executionId}_error = error.message;
    window.${executionId}_complete = true;
  }
})();`

    console.log('[CONTENT-SCRIPT] Wrapped script prepared for injection')

    const injectStart = performance.now()

    // Set the script content and inject it
    scriptElement.textContent = wrappedScript

    // Inject into page
    const targetElement = document.head || document.documentElement
    targetElement.appendChild(scriptElement)

    console.log('[CONTENT-SCRIPT] Script element injected into page')

    const injectEnd = performance.now()
    console.log('[CONTENT-SCRIPT] Script injection completed at:', injectEnd, 'injection time:', injectEnd - injectStart, 'ms')

    // Wait for execution to complete with polling
    let attempts = 0
    const maxAttempts = 100 // 1 second timeout
    const pollingStart = performance.now()

    console.log('[CONTENT-SCRIPT] Starting polling for completion')
    while (!window[executionId + '_complete'] && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10))
      attempts++
    }

    const pollingEnd = performance.now()
    console.log('[CONTENT-SCRIPT] Polling completed at:', pollingEnd, 'polling time:', pollingEnd - pollingStart, 'ms')

    // Get the results from the page context
    const result = window[executionId + '_result']
    const error = window[executionId + '_error']

    console.log('[CONTENT-SCRIPT] Execution results:')
    console.log('  - result type:', typeof result)
    console.log('  - result value:', result)
    console.log('  - error type:', typeof error)
    console.log('  - error value:', error)

    // Clean up
    console.log('[CONTENT-SCRIPT] Starting cleanup')
    scriptElement.remove()
    delete window[executionId + '_result']
    delete window[executionId + '_error']
    delete window[executionId + '_complete']
    console.log('[CONTENT-SCRIPT] Cleanup completed')

    if (error) {
      console.log('[CONTENT-SCRIPT] Returning error response:', error)
      return { success: false, error }
    }

    if (attempts >= maxAttempts) {
      console.log('[CONTENT-SCRIPT] Execution timed out')
      return { success: false, error: 'Script execution timed out' }
    }

    // Handle different result types
    let serializedResult
    console.log('[CONTENT-SCRIPT] Serializing result...')

    if (result === undefined) {
      serializedResult = 'undefined'
      console.log('[CONTENT-SCRIPT] Result is undefined')
    } else if (result === null) {
      serializedResult = 'null'
      console.log('[CONTENT-SCRIPT] Result is null')
    } else if (typeof result === 'function') {
      serializedResult = result.toString()
      console.log('[CONTENT-SCRIPT] Result is function, serialized length:', serializedResult.length)
    } else if (typeof result === 'object') {
      try {
        serializedResult = JSON.stringify(result, null, 2)
        console.log('[CONTENT-SCRIPT] Result is object, JSON serialized length:', serializedResult.length)
      } catch (jsonError) {
        console.log('[CONTENT-SCRIPT] JSON serialization failed:', jsonError.message)
        serializedResult = result.toString()
        console.log('[CONTENT-SCRIPT] Used toString() instead, length:', serializedResult.length)
      }
    } else {
      serializedResult = String(result)
      console.log('[CONTENT-SCRIPT] Result converted to string, length:', serializedResult.length)
    }

    const successResponse = { success: true, result: serializedResult }
    console.log('[CONTENT-SCRIPT] Returning success response')
    return successResponse
  } catch (error) {
    console.error('[CONTENT-SCRIPT] executeScript() caught error:', error)
    console.error('[CONTENT-SCRIPT] Error stack:', error.stack)
    console.error('[CONTENT-SCRIPT] Error name:', error.name)
    console.error('[CONTENT-SCRIPT] Error message:', error.message)

    const errorResponse = { success: false, error: error.message }
    console.log('[CONTENT-SCRIPT] Returning error response:', errorResponse)
    return errorResponse
  } finally {
    const executionEnd = performance.now()
    console.log('[CONTENT-SCRIPT] executeScript() completed at:', executionEnd, 'total time:', executionEnd - executionStart, 'ms')
  }
}

// Page information gathering
async function getPageInfo () {
  try {
    const info = {
      title: document.title,
      url: window.location.href,
      domain: window.location.hostname,
      protocol: window.location.protocol,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      referrer: document.referrer,
      charset: document.characterSet,
      contentType: document.contentType,
      lastModified: document.lastModified,
      readyState: document.readyState,
      visibilityState: document.visibilityState,
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      },
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        colorDepth: window.screen.colorDepth
      }
    }

    return { success: true, data: info }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Performance information
async function getPerformanceInfo () {
  try {
    if (!window.performance) {
      return { success: false, error: 'Performance API not available' }
    }

    const navigation = window.performance.getEntriesByType('navigation')[0]
    const paint = window.performance.getEntriesByType('paint')
    const resources = window.performance.getEntriesByType('resource')

    const info = {
      navigation: navigation ? {
        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
        loadComplete: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
        firstByte: Math.round(navigation.responseStart - navigation.requestStart),
        domInteractive: Math.round(navigation.domInteractive - navigation.navigationStart),
        domComplete: Math.round(navigation.domComplete - navigation.navigationStart)
      } : null,
      paint: paint.reduce((acc, entry) => {
        acc[entry.name] = Math.round(entry.startTime)
        return acc
      }, {}),
      resources: {
        total: resources.length,
        scripts: resources.filter(r => r.initiatorType === 'script').length,
        stylesheets: resources.filter(r => r.initiatorType === 'link').length,
        images: resources.filter(r => r.initiatorType === 'img').length,
        xhr: resources.filter(r => r.initiatorType === 'xmlhttprequest').length,
        fetch: resources.filter(r => r.initiatorType === 'fetch').length
      },
      memory: window.performance.memory ? {
        usedJSHeapSize: Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024),
        totalJSHeapSize: Math.round(window.performance.memory.totalJSHeapSize / 1024 / 1024),
        jsHeapSizeLimit: Math.round(window.performance.memory.jsHeapSizeLimit / 1024 / 1024)
      } : null
    }

    return { success: true, data: info }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Security information
async function getSecurityInfo () {
  try {
    const info = {
      https: window.location.protocol === 'https:',
      mixedContent: checkMixedContent(),
      csp: getCSPInfo(),
      cookies: {
        secure: checkSecureCookies(),
        sameSite: checkSameSiteCookies()
      },
      iframe: window !== window.top,
      features: {
        serviceWorker: 'serviceWorker' in navigator,
        pushNotifications: 'PushManager' in window,
        geolocation: 'geolocation' in navigator,
        camera: 'mediaDevices' in navigator,
        microphone: 'mediaDevices' in navigator
      }
    }

    return { success: true, data: info }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

function checkMixedContent () {
  const resources = document.querySelectorAll('img, script, link[rel="stylesheet"], iframe')
  let mixedContent = false

  resources.forEach(resource => {
    const src = resource.src || resource.href
    if (src && src.startsWith('http:') && window.location.protocol === 'https:') {
      mixedContent = true
    }
  })

  return mixedContent
}

function getCSPInfo () {
  const metaTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]')
  const cspPolicies = []

  metaTags.forEach(tag => {
    cspPolicies.push(tag.content)
  })

  return {
    present: cspPolicies.length > 0,
    policies: cspPolicies
  }
}

function checkSecureCookies () {
  // Note: This is limited information as we can't read cookie flags from JavaScript
  return document.cookie.length > 0 && window.location.protocol === 'https:'
}

function checkSameSiteCookies () {
  // This would require server-side information, returning placeholder
  return 'Unknown (requires server inspection)'
}

// Framework detection
async function detectFrameworks () {
  try {
    const frameworks = []

    // React
    if (window.React || document.querySelector('[data-reactroot]') || window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      frameworks.push({ name: 'React', version: window.React?.version || 'Unknown' })
    }

    // Vue
    if (window.Vue || document.querySelector('[data-v-]') || window.__VUE__) {
      frameworks.push({ name: 'Vue', version: window.Vue?.version || 'Unknown' })
    }

    // Angular
    if (window.angular || document.querySelector('[ng-app], [ng-version]') || window.ng) {
      frameworks.push({ name: 'Angular', version: window.angular?.version?.full || 'Unknown' })
    }

    // jQuery
    if (window.jQuery || window.$) {
      frameworks.push({ name: 'jQuery', version: window.jQuery?.fn?.jquery || 'Unknown' })
    }

    // Svelte
    if (document.querySelector('[data-svelte]') || window.__SVELTE__) {
      frameworks.push({ name: 'Svelte', version: 'Unknown' })
    }

    // Next.js
    if (window.__NEXT_DATA__ || document.querySelector('[id="__next"]')) {
      frameworks.push({ name: 'Next.js', version: 'Unknown' })
    }

    // Nuxt.js
    if (window.$nuxt || document.querySelector('[data-n-head]')) {
      frameworks.push({ name: 'Nuxt.js', version: 'Unknown' })
    }

    // Gatsby
    if (window.___gatsby || document.querySelector('[id="___gatsby"]')) {
      frameworks.push({ name: 'Gatsby', version: 'Unknown' })
    }

    // Express (if server-side rendered)
    if (document.querySelector('meta[name="generator"][content*="Express"]')) {
      frameworks.push({ name: 'Express', version: 'Unknown' })
    }

    return { success: true, data: frameworks }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Console message capture (basic implementation)
async function getConsoleMessages () {
  try {
    // This is a simplified version - full implementation would require
    // overriding console methods on page load
    const messages = []

    // We can only capture future messages, not past ones
    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn

    // Store reference to restore later
    if (!window.__inspector_console_overridden) {
      window.__inspector_console_messages = []

      console.log = function (...args) {
        window.__inspector_console_messages.push({
          type: 'log',
          message: args.join(' '),
          timestamp: Date.now()
        })
        originalLog.apply(console, args)
      }

      console.error = function (...args) {
        window.__inspector_console_messages.push({
          type: 'error',
          message: args.join(' '),
          timestamp: Date.now()
        })
        originalError.apply(console, args)
      }

      console.warn = function (...args) {
        window.__inspector_console_messages.push({
          type: 'warn',
          message: args.join(' '),
          timestamp: Date.now()
        })
        originalWarn.apply(console, args)
      }

      window.__inspector_console_overridden = true
    }

    return {
      success: true,
      data: window.__inspector_console_messages || []
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Storage change monitoring
let storageChangeListeners = []

function monitorStorageChanges () {
  // Monitor localStorage changes
  window.addEventListener('storage', (e) => {
    notifyStorageChange('localStorage', e.key, e.newValue, e.oldValue)
  })

  // Monitor sessionStorage changes (only works within same tab)
  const originalSetItem = Storage.prototype.setItem
  const originalRemoveItem = Storage.prototype.removeItem
  const originalClear = Storage.prototype.clear

  Storage.prototype.setItem = function (key, value) {
    const oldValue = this.getItem(key)
    originalSetItem.call(this, key, value)

    const storageType = this === localStorage ? 'localStorage' : 'sessionStorage'
    notifyStorageChange(storageType, key, value, oldValue)
  }

  Storage.prototype.removeItem = function (key) {
    const oldValue = this.getItem(key)
    originalRemoveItem.call(this, key)

    const storageType = this === localStorage ? 'localStorage' : 'sessionStorage'
    notifyStorageChange(storageType, key, null, oldValue)
  }

  Storage.prototype.clear = function () {
    const storageType = this === localStorage ? 'localStorage' : 'sessionStorage'
    originalClear.call(this)
    notifyStorageChange(storageType, null, null, null)
  }
}

function notifyStorageChange (storageType, key, newValue, oldValue) {
  // Notify extension about storage changes
  chrome.runtime.sendMessage({
    action: 'storageChanged',
    storageType,
    key,
    newValue,
    oldValue
  }).catch(() => {
    // Extension might not be listening, ignore errors
  })
}

// Initialize content script
function initializeContentScript() {
  try {
    // Set up storage monitoring
    monitorStorageChanges()

    // Mark as ready
    isContentScriptReady = true

    // Notify extension that content script is ready
    chrome.runtime.sendMessage({
      action: 'contentScriptReady',
      tabId: chrome.runtime.getURL ? undefined : window.location.href // Fallback identification
    }).catch(() => {
      // Extension might not be listening, ignore errors
    })

    console.log('1nsp3ct0rG4dg3t content script ready')
  } catch (error) {
    console.error('Error initializing content script:', error)
  }
}

// Execute onload script when page loads
async function executeOnloadScript() {
  try {
    const result = await chrome.storage.local.get(['onloadScript'])
    if (result.onloadScript) {
      await executeScript(result.onloadScript)
      // Clear the script after execution
      await chrome.storage.local.remove(['onloadScript'])
    }
  } catch (error) {
    console.error('Error executing onload script:', error)
  }
}

// Event Listener Management Functions

async function addEventListenerHandler(eventListenerData) {
  try {
    const { id, eventType, target, script, created, active } = eventListenerData

    // Get the target element(s)
    let targetElement
    if (target === 'document') {
      targetElement = document
    } else if (target === 'window') {
      targetElement = window
    } else if (target === 'body') {
      targetElement = document.body
    } else {
      // Custom selector
      targetElement = document.querySelector(target)
      if (!targetElement) {
        return { success: false, error: `Target element not found: ${target}` }
      }
    }

    // Create the event handler function
    const eventHandler = async function(event) {
      if (!eventListeners.get(id)?.active) return // Skip if disabled

      try {
        console.log(`🎯 Event triggered: ${eventType} on ${target}`)

        // Execute the script in page context
        const result = await executeScript(script)

        // Optionally send results back to extension
        chrome.runtime.sendMessage({
          action: 'eventScriptExecuted',
          eventId: id,
          eventType: eventType,
          target: target,
          result: result,
          timestamp: Date.now()
        }).catch(() => {
          // Extension might not be listening, ignore errors
        })

      } catch (error) {
        console.error(`Error executing event script for ${eventType}:`, error)
        chrome.runtime.sendMessage({
          action: 'eventScriptError',
          eventId: id,
          eventType: eventType,
          target: target,
          error: error.message,
          timestamp: Date.now()
        }).catch(() => {
          // Extension might not be listening, ignore errors
        })
      }
    }

    // Add the event listener
    targetElement.addEventListener(eventType, eventHandler, { passive: true })

    // Store the listener data
    eventListeners.set(id, {
      id,
      eventType,
      target,
      script,
      created,
      active,
      handler: eventHandler,
      element: targetElement
    })

    return { success: true, message: `Event listener added for ${eventType} on ${target}` }
  } catch (error) {
    console.error('Error adding event listener:', error)
    return { success: false, error: error.message }
  }
}

async function removeEventListenerHandler(listenerId) {
  try {
    const listener = eventListeners.get(listenerId)
    if (!listener) {
      return { success: false, error: 'Event listener not found' }
    }

    // Remove the actual event listener
    listener.element.removeEventListener(listener.eventType, listener.handler)

    // Remove from our tracking
    eventListeners.delete(listenerId)

    return { success: true, message: 'Event listener removed' }
  } catch (error) {
    console.error('Error removing event listener:', error)
    return { success: false, error: error.message }
  }
}

async function toggleEventListenerHandler(listenerId) {
  try {
    const listener = eventListeners.get(listenerId)
    if (!listener) {
      return { success: false, error: 'Event listener not found' }
    }

    // Toggle the active state
    listener.active = !listener.active
    eventListeners.set(listenerId, listener)

    return {
      success: true,
      message: `Event listener ${listener.active ? 'enabled' : 'disabled'}`,
      active: listener.active
    }
  } catch (error) {
    console.error('Error toggling event listener:', error)
    return { success: false, error: error.message }
  }
}

async function clearAllEventListenersHandler() {
  try {
    let removedCount = 0

    for (const [id, listener] of eventListeners) {
      try {
        listener.element.removeEventListener(listener.eventType, listener.handler)
        removedCount++
      } catch (error) {
        console.warn(`Error removing listener ${id}:`, error)
      }
    }

    eventListeners.clear()

    return {
      success: true,
      message: `Cleared ${removedCount} event listeners`,
      removedCount
    }
  } catch (error) {
    console.error('Error clearing all event listeners:', error)
    return { success: false, error: error.message }
  }
}

async function getEventListenersHandler() {
  try {
    const listeners = Array.from(eventListeners.values()).map(listener => ({
      id: listener.id,
      eventType: listener.eventType,
      target: listener.target,
      script: listener.script,
      created: listener.created,
      active: listener.active
    }))

    return {
      success: true,
      listeners,
      count: listeners.length
    }
  } catch (error) {
    console.error('Error getting event listeners:', error)
    return { success: false, error: error.message }
  }
}

// Element Picker Functionality
let elementPickerActive = false
let pickerOverlay = null
let highlightedElement = null
let highlightedElementOriginalStyle = null

async function handleElementPicker(activate) {
  try {
    if (activate) {
      await activateElementPicker()
    } else {
      await deactivateElementPicker()
    }
    return { success: true }
  } catch (error) {
    console.error('Element picker error:', error)
    return { success: false, error: error.message }
  }
}

async function activateElementPicker() {
  if (elementPickerActive) {
    return
  }

  elementPickerActive = true

  // Create overlay
  pickerOverlay = document.createElement('div')
  pickerOverlay.id = 'inspector-gadget-picker-overlay'
  pickerOverlay.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    background: rgba(0, 123, 255, 0.05) !important;
    z-index: 999999 !important;
    cursor: crosshair !important;
    pointer-events: all !important;
  `

  // Add event listeners
  pickerOverlay.addEventListener('mousemove', handleMouseMove, true)
  pickerOverlay.addEventListener('click', handleElementClick, true)
  pickerOverlay.addEventListener('keydown', handleKeyDown, true)

  // Add to document
  document.body.appendChild(pickerOverlay)

  // Focus overlay to capture keyboard events
  pickerOverlay.tabIndex = -1
  pickerOverlay.focus()

  console.log('Element picker activated')
}

async function deactivateElementPicker() {
  if (!elementPickerActive) {
    return
  }

  elementPickerActive = false

  // Remove highlight
  removeElementHighlight()

  // Remove overlay
  if (pickerOverlay) {
    pickerOverlay.remove()
    pickerOverlay = null
  }

  console.log('Element picker deactivated')
}

function handleMouseMove(event) {
  if (!elementPickerActive) return

  event.preventDefault()
  event.stopPropagation()

  // Get element under cursor
  const elementUnderCursor = document.elementFromPoint(event.clientX, event.clientY)
  if (elementUnderCursor && elementUnderCursor !== pickerOverlay) {
    highlightElement(elementUnderCursor)
  }
}

function handleElementClick(event) {
  if (!elementPickerActive) return

  event.preventDefault()
  event.stopPropagation()

  // Get element under cursor
  const selectedElement = document.elementFromPoint(event.clientX, event.clientY)
  if (selectedElement && selectedElement !== pickerOverlay) {
    selectElement(selectedElement)
  }
}

function handleKeyDown(event) {
  if (!elementPickerActive) return

  // Escape key to cancel
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    deactivateElementPicker()
    chrome.runtime.sendMessage({
      type: 'ELEMENT_PICKER_CANCELLED'
    })
  }
}

function highlightElement(element) {
  // Remove previous highlight
  removeElementHighlight()

  // Store original style
  highlightedElement = element
  highlightedElementOriginalStyle = {
    outline: element.style.outline,
    outlineOffset: element.style.outlineOffset
  }

  // Apply highlight
  element.style.outline = '2px solid #007bff !important'
  element.style.outlineOffset = '1px !important'
}

function removeElementHighlight() {
  if (highlightedElement && highlightedElementOriginalStyle) {
    // Restore original style
    highlightedElement.style.outline = highlightedElementOriginalStyle.outline
    highlightedElement.style.outlineOffset = highlightedElementOriginalStyle.outlineOffset

    highlightedElement = null
    highlightedElementOriginalStyle = null
  }
}

function selectElement(element) {
  try {
    // Generate selectors
    const cssSelector = generateCSSSelector(element)
    const xpath = generateXPath(element)

    // Get element info
    const elementData = {
      tagName: element.tagName,
      cssSelector: cssSelector,
      xpath: xpath,
      textContent: element.textContent?.trim(),
      elementInfo: getElementAttributes(element)
    }

    // Send message to extension
    chrome.runtime.sendMessage({
      type: 'ELEMENT_SELECTED',
      data: elementData
    })

    // Deactivate picker
    deactivateElementPicker()

  } catch (error) {
    console.error('Error selecting element:', error)
  }
}

function generateCSSSelector(element) {
  // Generate unique CSS selector
  let path = []
  let current = element

  while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.documentElement) {
    let selector = current.nodeName.toLowerCase()

    // Use ID if available and valid
    if (current.id && /^[a-zA-Z][\w-]*$/.test(current.id)) {
      selector += '#' + CSS.escape(current.id)
      path.unshift(selector)
      break
    }

    // Use class names if available and valid
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/)
        .filter(c => c && /^[a-zA-Z][\w-]*$/.test(c))
        .map(c => CSS.escape(c))

      if (classes.length > 0) {
        selector += '.' + classes.join('.')
      }
    }

    // Add nth-child if needed for uniqueness
    if (current.parentNode) {
      const siblings = Array.from(current.parentNode.children)
        .filter(child => child.nodeName === current.nodeName)

      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1
        selector += `:nth-child(${index})`
      }
    }

    path.unshift(selector)
    current = current.parentNode

    // Prevent infinite loops
    if (path.length > 10) break
  }

  return path.join(' > ') || '*'
}

function generateXPath(element) {
  // Generate XPath selector
  let path = []
  let current = element

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 0
    let hasFollowingSiblings = false

    // Count preceding siblings with same tag
    for (let sibling = current.previousSibling; sibling; sibling = sibling.previousSibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
        index++
      }
    }

    // Check if there are following siblings with same tag
    for (let sibling = current.nextSibling; sibling; sibling = sibling.nextSibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
        hasFollowingSiblings = true
        break
      }
    }

    const tagName = current.nodeName.toLowerCase()
    const pathIndex = (index > 0 || hasFollowingSiblings) ? `[${index + 1}]` : ''
    path.unshift(tagName + pathIndex)

    current = current.parentNode
  }

  return path.length ? '/' + path.join('/') : null
}

function getElementAttributes(element) {
  const attrs = []
  for (const attr of element.attributes) {
    attrs.push(`${attr.name}="${attr.value}"`)
  }
  return attrs.join(' ')
}

// Cleanup element picker on page unload
window.addEventListener('beforeunload', () => {
  if (elementPickerActive) {
    deactivateElementPicker()
  }
})

// Cleanup on extension context invalidation
window.addEventListener('error', (event) => {
  if (event.error && event.error.message.includes('Extension context invalidated')) {
    if (elementPickerActive) {
      deactivateElementPicker()
    }
  }
})

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeContentScript()
    executeOnloadScript()
  })
} else {
  initializeContentScript()
  executeOnloadScript()
}