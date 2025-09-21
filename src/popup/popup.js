// 1nsp3ct0rG4dg3t Extension Popup JavaScript

class Inspector {
  constructor () {
    this.currentTab = 'dashboard'
    this.currentStorage = 'localStorage'
    this.theme = 'light'
    this.tabInfo = null
    this.storageData = {}
    this.cookieData = []
    this.pinnedProperties = []
    this.organizationMode = 'default'
    this.tabChangeTimeout = null
    this.contentScriptReadyCache = new Map()

    // Script templates library
    this.scriptTemplates = this.initializeTemplates()

    this.init()
  }

  async init () {
    await this.loadSettings()
    this.setupEventListeners()
    this.setupTheme()
    this.updateUIState()
    await this.getCurrentTab()
    this.setupTabChangeListener()

    // Load data for the currently active tab (non-blocking)
    this.loadCurrentTabData()

    this.updateStatusBar()
  }

  initializeTemplates() {
    return {
      injection: {
        'auto-fill-forms': {
          name: 'Auto-fill Forms',
          description: 'Automatically fill form fields with test data',
          code: `// Auto-fill all forms on the page with test data
const forms = document.querySelectorAll('form');
const testData = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User',
  phone: '+1234567890',
  address: '123 Test Street',
  city: 'Test City',
  zipcode: '12345'
};

forms.forEach(form => {
  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    const name = input.name.toLowerCase();
    const type = input.type.toLowerCase();

    if (type === 'email' || name.includes('email')) {
      input.value = testData.email;
    } else if (type === 'password' || name.includes('password')) {
      input.value = testData.password;
    } else if (name.includes('name') || name.includes('user')) {
      input.value = testData.name;
    } else if (name.includes('phone') || name.includes('tel')) {
      input.value = testData.phone;
    } else if (name.includes('address')) {
      input.value = testData.address;
    } else if (name.includes('city')) {
      input.value = testData.city;
    } else if (name.includes('zip') || name.includes('postal')) {
      input.value = testData.zipcode;
    } else if (type === 'number') {
      input.value = '123';
    } else if (input.tagName === 'SELECT') {
      input.selectedIndex = Math.min(1, input.options.length - 1);
    }
  });
});

console.log(\`Auto-filled \${forms.length} forms with test data\`);`
        },
        'track-clicks': {
          name: 'Track All Clicks',
          description: 'Log all click events on the page with element details',
          code: `// Track all click events on the page
let clickCount = 0;

document.addEventListener('click', function(event) {
  clickCount++;
  const element = event.target;

  console.log(\`Click #\${clickCount}:\`, {
    tag: element.tagName,
    id: element.id || 'no-id',
    classes: element.className || 'no-classes',
    text: element.textContent?.substring(0, 50) || 'no-text',
    position: { x: event.clientX, y: event.clientY },
    timestamp: new Date().toISOString()
  });
}, true);

console.log('✅ Click tracking enabled - all clicks will be logged');`
        },
        'intercept-fetch': {
          name: 'Intercept API Calls',
          description: 'Monitor and log all fetch API requests and responses',
          code: `// Intercept and log all fetch requests
const originalFetch = window.fetch;
const apiCalls = [];

window.fetch = function(...args) {
  const startTime = Date.now();
  const url = args[0];
  const options = args[1] || {};

  console.log('🚀 Fetch Request:', {
    url: url,
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body,
    timestamp: new Date().toISOString()
  });

  return originalFetch.apply(this, arguments)
    .then(response => {
      const duration = Date.now() - startTime;
      const responseInfo = {
        url: response.url,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        duration: \`\${duration}ms\`,
        timestamp: new Date().toISOString()
      };

      apiCalls.push({ request: { url, method: options.method || 'GET' }, response: responseInfo });

      console.log('✅ Fetch Response:', responseInfo);
      return response;
    })
    .catch(error => {
      console.log('❌ Fetch Error:', { url, error: error.message });
      throw error;
    });
};

// Store API calls in global variable for inspection
window.inspectorApiCalls = apiCalls;
console.log('✅ Fetch interception enabled - check window.inspectorApiCalls for history');`
        }
      },
      scraping: {
        'extract-tables': {
          name: 'Extract Tables',
          description: 'Extract data from all HTML tables on the page',
          code: `// Extract data from all tables on the page
const tables = document.querySelectorAll('table');
const extractedData = [];

tables.forEach((table, tableIndex) => {
  const tableData = {
    index: tableIndex,
    rows: [],
    headers: [],
    summary: {}
  };

  // Extract headers
  const headerRow = table.querySelector('thead tr, tr:first-child');
  if (headerRow) {
    tableData.headers = Array.from(headerRow.querySelectorAll('th, td'))
      .map(cell => cell.textContent.trim());
  }

  // Extract all rows
  const rows = Array.from(table.querySelectorAll('tr'));
  rows.forEach(row => {
    const rowData = Array.from(row.querySelectorAll('td, th'))
      .map(cell => cell.textContent.trim());
    if (rowData.length > 0) {
      tableData.rows.push(rowData);
    }
  });

  tableData.summary = {
    totalRows: tableData.rows.length,
    totalColumns: tableData.headers.length || (tableData.rows[0]?.length || 0),
    hasHeaders: !!table.querySelector('thead')
  };

  extractedData.push(tableData);
});

console.log(\`📊 Extracted \${extractedData.length} tables:\`, extractedData);
return extractedData;`
        },
        'collect-links': {
          name: 'Collect All Links',
          description: 'Get all links with their attributes and metadata',
          code: `// Collect all links from the page
const links = Array.from(document.querySelectorAll('a')).map((link, index) => {
  return {
    index: index,
    text: link.textContent.trim(),
    href: link.href,
    hostname: link.hostname || 'relative',
    pathname: link.pathname,
    target: link.target || '_self',
    title: link.title || '',
    isExternal: link.hostname && link.hostname !== window.location.hostname,
    isEmail: link.href.startsWith('mailto:'),
    isTel: link.href.startsWith('tel:'),
    hasImage: !!link.querySelector('img'),
    classes: link.className || '',
    id: link.id || ''
  };
});

// Group links by type
const linkStats = {
  total: links.length,
  external: links.filter(l => l.isExternal).length,
  internal: links.filter(l => !l.isExternal && !l.isEmail && !l.isTel).length,
  email: links.filter(l => l.isEmail).length,
  telephone: links.filter(l => l.isTel).length,
  withImages: links.filter(l => l.hasImage).length
};

console.log(\`🔗 Collected \${links.length} links:\`, { links, stats: linkStats });
return { links, stats: linkStats };`
        },
        'analyze-forms': {
          name: 'Analyze Forms',
          description: 'Extract and analyze all forms and their field structure',
          code: `// Analyze all forms on the page
const forms = Array.from(document.querySelectorAll('form')).map((form, formIndex) => {
  const formData = {
    index: formIndex,
    action: form.action || 'current-page',
    method: form.method || 'GET',
    encoding: form.enctype || 'application/x-www-form-urlencoded',
    target: form.target || '_self',
    id: form.id || '',
    classes: form.className || '',
    fields: []
  };

  // Analyze each form field
  const elements = Array.from(form.elements);
  elements.forEach((element, fieldIndex) => {
    if (element.type !== 'submit' && element.type !== 'button') {
      formData.fields.push({
        index: fieldIndex,
        name: element.name || '',
        id: element.id || '',
        type: element.type || element.tagName.toLowerCase(),
        required: element.required || false,
        placeholder: element.placeholder || '',
        value: element.value || '',
        maxLength: element.maxLength || null,
        pattern: element.pattern || '',
        disabled: element.disabled || false,
        readonly: element.readOnly || false,
        options: element.tagName === 'SELECT' ?
          Array.from(element.options).map(opt => ({ text: opt.text, value: opt.value })) : null
      });
    }
  });

  return formData;
});

// Generate form statistics
const formStats = {
  totalForms: forms.length,
  totalFields: forms.reduce((sum, form) => sum + form.fields.length, 0),
  fieldTypes: {},
  hasValidation: forms.some(form => form.fields.some(field => field.required || field.pattern))
};

// Count field types
forms.forEach(form => {
  form.fields.forEach(field => {
    formStats.fieldTypes[field.type] = (formStats.fieldTypes[field.type] || 0) + 1;
  });
});

console.log(\`📝 Analyzed \${forms.length} forms:\`, { forms, stats: formStats });
return { forms, stats: formStats };`
        }
      },
      debugging: {
        'performance-monitor': {
          name: 'Performance Monitor',
          description: 'Monitor page performance metrics and resource loading',
          code: `// Monitor page performance
const performanceData = {
  timing: {},
  resources: [],
  memory: {}
};

// Navigation timing
if (performance.timing) {
  const timing = performance.timing;
  performanceData.timing = {
    domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
    loadComplete: timing.loadEventEnd - timing.navigationStart,
    firstByte: timing.responseStart - timing.navigationStart,
    domReady: timing.domComplete - timing.navigationStart,
    totalTime: timing.loadEventEnd - timing.navigationStart
  };
}

// Resource timing
performanceData.resources = performance.getEntriesByType('resource').map(entry => ({
  name: entry.name.split('/').pop(),
  type: entry.initiatorType,
  size: entry.transferSize || 0,
  duration: Math.round(entry.duration),
  startTime: Math.round(entry.startTime)
}));

// Memory usage (if available)
if (performance.memory) {
  performanceData.memory = {
    used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
    allocated: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
    limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
  };
}

console.log('⚡ Performance Analysis:', performanceData);
return performanceData;`
        },
        'find-errors': {
          name: 'Find JavaScript Errors',
          description: 'Set up error monitoring and display existing console errors',
          code: `// Monitor JavaScript errors
const errors = [];
let errorCount = 0;

// Capture future errors
window.addEventListener('error', function(event) {
  errorCount++;
  const errorInfo = {
    count: errorCount,
    message: event.message,
    filename: event.filename,
    line: event.lineno,
    column: event.colno,
    stack: event.error ? event.error.stack : 'No stack trace',
    timestamp: new Date().toISOString()
  };

  errors.push(errorInfo);
  console.error(\`❌ Error #\${errorCount}:\`, errorInfo);
});

// Capture unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
  errorCount++;
  const errorInfo = {
    count: errorCount,
    type: 'unhandled-promise',
    reason: event.reason,
    timestamp: new Date().toISOString()
  };

  errors.push(errorInfo);
  console.error(\`❌ Unhandled Promise #\${errorCount}:\`, errorInfo);
});

// Store errors globally for inspection
window.inspectorErrors = errors;

console.log('🔍 Error monitoring enabled - check window.inspectorErrors for captured errors');
console.log('💡 Try triggering an error: throw new Error("Test error")');`
        }
      }
    };
  }

  isContentScriptSupported(url) {
    if (!url) return false
    try {
      const urlObj = new URL(url)
      // Content scripts only work on http and https URLs
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
    } catch (error) {
      return false
    }
  }

  loadCurrentTabData () {
    // Load data for the currently active UI tab (non-blocking)
    switch (this.currentTab) {
      case 'dashboard':
        this.loadDashboardWithData()
        break
      case 'storage':
        this.loadStorageDataSmart()
        break
      case 'cookies':
        this.loadCookies()
        break
      case 'app-info':
        this.loadAppInfo()
        break
      case 'console':
        this.executePersistentScript()
        break
      default:
        // Default to dashboard if unknown tab
        this.loadDashboardWithData()
    }
  }

  loadStorageDataSmart () {
    const container = document.getElementById('storageItems')

    // Check if current tab supports content scripts
    if (!this.tabInfo || !this.isContentScriptSupported(this.tabInfo.url)) {
      container.innerHTML = `
        <div class="empty-state">
          <p>Storage inspection not available</p>
          <p class="empty-state-subtitle">Content scripts cannot run on this page type (${this.tabInfo?.url ? new URL(this.tabInfo.url).protocol : 'unknown'})</p>
          <p class="empty-state-subtitle">Try navigating to an http:// or https:// website</p>
        </div>
      `
      return
    }

    // Show loading state
    container.innerHTML = '<div class="loading">Initializing storage inspection...</div>'

    // Load storage data in background without blocking
    this.loadStorageDataInBackground()
  }

  async loadStorageDataInBackground () {
    const container = document.getElementById('storageItems')

    try {
      // Try to load storage data with reduced retry attempts
      const response = await this.sendMessageWithRetry('getStorageData', {
        storageType: this.currentStorage
      }, 2) // Only 2 retries instead of 3

      if (response && response.success) {
        this.storageData[this.currentStorage] = response.data
        this.displayStorageData(response.data)
      } else {
        throw new Error(response?.error || 'Failed to load storage data')
      }
    } catch (error) {
      console.log('Storage data loading pending:', error.message)

      // Show user-friendly message without error spam
      container.innerHTML = `
        <div class="empty-state">
          <p>Initializing page connection...</p>
          <p class="empty-state-subtitle">Storage data will appear when the page is ready</p>
          <button class="btn btn-secondary retry-storage-btn" style="margin-top: 10px;">Retry Now</button>
        </div>
      `

      // Add retry functionality
      const retryBtn = container.querySelector('.retry-storage-btn')
      if (retryBtn) {
        retryBtn.addEventListener('click', () => this.loadStorageDataSmart())
      }

      // Auto-retry after 3 seconds
      setTimeout(() => {
        if (container.innerHTML.includes('Initializing page connection')) {
          this.loadStorageDataInBackground()
        }
      }, 3000)
    }
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

  async loadSettings () {
    try {
      const result = await chrome.storage.local.get(['dashboardConfig', 'settings'])
      if (result.dashboardConfig) {
        this.pinnedProperties = result.dashboardConfig.pinnedProperties || []
        this.theme = result.dashboardConfig.theme || 'light'
        this.organizationMode = result.dashboardConfig.organizationMode || 'default'
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  setupEventListeners () {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab)
      })
    })

    // Storage type switching
    document.querySelectorAll('.storage-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchStorageType(e.target.dataset.storage)
      })
    })

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
      this.toggleTheme()
    })

    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.showDashboardConfig()
    })

    document.getElementById('refreshDashboard').addEventListener('click', () => {
      this.refreshDashboard()
    })

    document.getElementById('organizationMode').addEventListener('change', (e) => {
      this.changeOrganizationMode(e.target.value)
    })

    // Storage actions
    document.getElementById('addStorageItem').addEventListener('click', () => {
      this.showAddStorageModal()
    })

    document.getElementById('refreshStorage').addEventListener('click', () => {
      this.loadStorageDataSmart()
    })

    // Cookie actions
    document.getElementById('addCookie').addEventListener('click', async () => {
      try {
        await this.showAddCookieModal()
      } catch (error) {
        console.error('Error showing add cookie modal:', error)
        this.showToast(`Error: ${error.message}`, 'error')
      }
    })

    document.getElementById('refreshCookies').addEventListener('click', () => {
      this.loadCookies()
    })

    // Console actions
    document.getElementById('executeScript').addEventListener('click', () => {
      this.executeScript()
    })

    document.getElementById('clearConsole').addEventListener('click', () => {
      this.clearConsole()
    })

    document.getElementById('saveScript').addEventListener('click', () => {
      this.saveScript()
    })

    // DOM selection tools
    document.getElementById('selectElement').addEventListener('click', () => {
      this.activateElementPicker()
    })

    document.getElementById('inspectMode').addEventListener('click', () => {
      this.toggleInspectorMode()
    })

    // Template selector actions
    document.getElementById('templateCategory').addEventListener('change', (e) => {
      this.handleTemplateCategoryChange(e.target.value)
    })

    document.getElementById('templateScript').addEventListener('change', (e) => {
      this.handleTemplateScriptChange(e.target.value)
    })

    document.getElementById('loadTemplate').addEventListener('click', () => {
      this.loadSelectedTemplate()
    })

    // Output formatting and export actions
    document.getElementById('outputFormat').addEventListener('change', (e) => {
      this.handleOutputFormatChange(e.target.value)
    })

    document.getElementById('exportOutput').addEventListener('click', () => {
      this.exportOutputData()
    })

    document.getElementById('clearOutput').addEventListener('click', () => {
      this.clearConsole()
    })

    // Modal actions
    document.getElementById('modalClose').addEventListener('click', () => {
      this.hideModal()
    })

    document.getElementById('modalCancel').addEventListener('click', () => {
      this.hideModal()
    })

    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.hideModal()
      }
    })

    // Search functionality
    document.getElementById('storageSearch').addEventListener('input', (e) => {
      this.filterStorage(e.target.value)
    })

    document.getElementById('cookieSearch').addEventListener('input', (e) => {
      this.filterCookies(e.target.value)
    })

    // Status bar actions
    document.getElementById('exportData').addEventListener('click', () => {
      this.exportData()
    })

    document.getElementById('helpBtn').addEventListener('click', () => {
      this.showHelp()
    })
  }

  setupTheme () {
    document.body.setAttribute('data-theme', this.theme)
    const themeIcon = document.querySelector('.theme-icon')
    themeIcon.textContent = this.theme === 'light' ? '🌙' : '☀️'
  }

  toggleTheme () {
    this.theme = this.theme === 'light' ? 'dark' : 'light'
    this.setupTheme()
    this.saveSettings()
  }

  async saveSettings () {
    try {
      await chrome.storage.local.set({
        dashboardConfig: {
          pinnedProperties: this.pinnedProperties,
          theme: this.theme,
          organizationMode: this.organizationMode
        }
      })
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  updateUIState () {
    // Set organization mode select value
    const organizationSelect = document.getElementById('organizationMode')
    if (organizationSelect) {
      organizationSelect.value = this.organizationMode
    }
  }

  switchTab (tabName) {
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active')
    })
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active')

    // Update active content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active')
    })
    document.getElementById(tabName).classList.add('active')

    this.currentTab = tabName

    // Load tab-specific data
    switch (tabName) {
      case 'dashboard':
        this.loadDashboardWithData()
        break
      case 'storage':
        this.loadStorageDataSmart()
        break
      case 'cookies':
        this.loadCookies()
        break
      case 'app-info':
        this.loadAppInfo()
        break
      case 'console':
        this.executePersistentScript()
        break
    }

    // Update pin button states for storage and cookies tabs
    if (tabName === 'storage' || tabName === 'cookies') {
      setTimeout(() => this.updatePinButtonStates(), 100)
    }
  }

  switchStorageType (storageType) {
    document.querySelectorAll('.storage-tab-btn').forEach(btn => {
      btn.classList.remove('active')
    })
    document.querySelector(`[data-storage="${storageType}"]`).classList.add('active')

    this.currentStorage = storageType
    this.loadStorageDataSmart()
  }

  setupTabChangeListener () {
    // Listen for tab changes to auto-update
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      this.handleTabChange()
    })

    // Listen for tab updates (URL changes, etc.)
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.active) {
        this.handleTabChange()
      }
    })
  }

  handleTabChange () {
    // Clear previous timeout
    if (this.tabChangeTimeout) {
      clearTimeout(this.tabChangeTimeout)
    }

    // Debounce tab change handling
    this.tabChangeTimeout = setTimeout(async () => {
      try {
        await this.getCurrentTab()
        this.updateStatusBar()

        // Clear readiness cache for the new tab
        if (this.tabInfo) {
          this.contentScriptReadyCache.delete(this.tabInfo.id)
        }

        // Refresh current section data with delay
        await this.refreshCurrentTabData()
      } catch (error) {
        console.error('Error handling tab change:', error)
      }
    }, 300) // 300ms delay to allow content script initialization
  }

  async refreshCurrentTabData () {
    // Wait a bit more for content script to be ready
    await new Promise(resolve => setTimeout(resolve, 200))

    if (this.currentTab === 'storage') {
      this.loadStorageDataSmart()
    } else if (this.currentTab === 'cookies') {
      this.loadCookies()
    } else if (this.currentTab === 'app-info') {
      this.loadAppInfo()
    }
  }

  async getCurrentTab () {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })

      if (!tabs || tabs.length === 0) {
        console.warn('No active tabs found')
        this.tabInfo = null
        return null
      }

      const tab = tabs[0]

      // Validate tab has required properties
      if (!tab || typeof tab.id !== 'number' || !tab.url) {
        console.warn('Invalid tab object:', tab)
        this.tabInfo = null
        return null
      }

      this.tabInfo = tab
      return tab
    } catch (error) {
      console.error('Error getting current tab:', error)
      this.tabInfo = null
      return null
    }
  }

  async sendMessage (action, data = {}, maxRetries = 2) {
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


  async loadStorageDataByType (storageType) {
    // Check if current tab supports content scripts
    if (!this.tabInfo || !this.isContentScriptSupported(this.tabInfo.url)) {
      console.log(`Cannot load ${storageType} data: page type not supported`)
      return null
    }

    try {
      // Use the new retry logic with reduced attempts
      const response = await this.sendMessageWithRetry('getStorageData', {
        storageType: storageType
      }, 2) // Only 2 retries

      if (response && response.success) {
        this.storageData[storageType] = response.data
        console.log(`Loaded ${storageType} data:`, response.data)
        return response.data
      } else {
        console.log(`Could not load ${storageType} data:`, response?.error)
        return null
      }
    } catch (error) {
      console.log(`${storageType} data loading pending:`, error.message)
      return null
    }
  }

  async loadStorageData () {
    const container = document.getElementById('storageItems')
    container.innerHTML = '<div class="loading">Loading storage data...</div>'

    try {
      // Ensure content script is ready before attempting to get storage data
      await this.pingContentScript()

      const response = await this.sendMessage('getStorageData', {
        storageType: this.currentStorage
      })

      if (response && response.success) {
        this.storageData[this.currentStorage] = response.data
        this.displayStorageData(response.data)
      } else {
        const errorMsg = response?.error || 'Unknown error'
        container.innerHTML = `
          <div class="empty-state">
            <p>Error loading storage data</p>
            <p class="empty-state-subtitle">${errorMsg}</p>
            <button class="btn btn-secondary retry-storage-btn">Retry</button>
          </div>
        `
        // Add event listener to retry button
        const retryBtn = container.querySelector('.retry-storage-btn')
        if (retryBtn) {
          retryBtn.addEventListener('click', () => this.loadStorageDataSmart())
        }
      }
    } catch (error) {
      console.error('Error loading storage data:', error)
      container.innerHTML = `
        <div class="empty-state">
          <p>Error loading storage data</p>
          <p class="empty-state-subtitle">${error.message}</p>
          <button class="btn btn-secondary retry-storage-btn">Retry</button>
        </div>
      `
      // Add event listener to retry button
      const retryBtn = container.querySelector('.retry-storage-btn')
      if (retryBtn) {
        retryBtn.addEventListener('click', () => this.loadStorageDataSmart())
      }
    }
  }

  displayStorageData (data) {
    const container = document.getElementById('storageItems')
    const entries = Object.entries(data)

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No ${this.currentStorage} data found</p>
        </div>
      `
      return
    }

    const html = entries.map(([key, value]) => `
      <div class="storage-item" data-key="${key}">
        <div class="storage-item-header">
          <span class="storage-key">${this.escapeHtml(key)}</span>
          <div class="storage-actions">
            <button class="btn-icon pin-btn" title="Pin to Dashboard">●</button>
            <button class="btn-icon edit-btn" title="Edit">✏️</button>
            <button class="btn-icon delete-btn" title="Delete">🗑️</button>
          </div>
        </div>
        <div class="storage-value">${this.escapeHtml(this.formatValue(value))}</div>
      </div>
    `).join('')

    container.innerHTML = html

    // Add event listeners to action buttons
    this.attachStorageItemListeners()
  }

  async loadCookies () {
    const container = document.getElementById('cookiesList')
    container.innerHTML = '<div class="loading">Loading cookies...</div>'

    try {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        container.innerHTML = '<div class="empty-state">Extension context invalidated. Please reload the extension.</div>'
        return
      }

      // Get cookies via background script since content scripts can't access cookies directly
      const tab = await this.getCurrentTab()
      if (!tab) {
        container.innerHTML = '<div class="empty-state">No active tab</div>'
        return
      }

      const response = await chrome.runtime.sendMessage({
        action: 'getCookies',
        tabId: tab.id
      })

      if (response && response.success) {
        this.cookieData = response.data
        this.displayCookies(response.data)
      } else {
        const errorMsg = response?.error || 'Unknown error'
        container.innerHTML = `
          <div class="empty-state">
            <p>Error loading cookies</p>
            <p class="empty-state-subtitle">${errorMsg}</p>
            <button class="btn btn-secondary retry-cookies-btn">Retry</button>
          </div>
        `
        // Add event listener to retry button
        const retryBtn = container.querySelector('.retry-cookies-btn')
        if (retryBtn) {
          retryBtn.addEventListener('click', () => this.loadCookies())
        }
      }
    } catch (error) {
      console.error('Error loading cookies:', error)
      container.innerHTML = `
        <div class="empty-state">
          <p>Error loading cookies</p>
          <p class="empty-state-subtitle">${error.message}</p>
          <button class="btn btn-secondary retry-cookies-btn">Retry</button>
        </div>
      `
      // Add event listener to retry button
      const retryBtn = container.querySelector('.retry-cookies-btn')
      if (retryBtn) {
        retryBtn.addEventListener('click', () => this.loadCookies())
      }
    }
  }

  displayCookies (cookies) {
    const container = document.getElementById('cookiesList')

    if (cookies.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No cookies found</p>
        </div>
      `
      return
    }

    const html = cookies.map(cookie => `
      <div class="cookie-item" data-name="${cookie.name}">
        <div class="cookie-header">
          <span class="cookie-name">${this.escapeHtml(cookie.name)}</span>
          <div class="cookie-actions">
            <button class="btn-icon pin-btn" title="Pin to Dashboard">●</button>
            <button class="btn-icon edit-btn" title="Edit">✏️</button>
            <button class="btn-icon delete-btn" title="Delete">🗑️</button>
          </div>
        </div>
        <div class="cookie-value">${this.escapeHtml(cookie.value)}</div>
        <div class="cookie-details">
          <span class="cookie-domain">Domain: ${cookie.domain}</span>
          <span class="cookie-path">Path: ${cookie.path}</span>
          ${cookie.secure ? '<span class="cookie-secure">Secure</span>' : ''}
          ${cookie.httpOnly ? '<span class="cookie-httponly">HttpOnly</span>' : ''}
        </div>
      </div>
    `).join('')

    container.innerHTML = html

    // Add event listeners to action buttons
    this.attachCookieItemListeners()
  }

  async loadAppInfo () {
    // Load page info
    const pageInfoContainer = document.getElementById('pageInfo')
    pageInfoContainer.innerHTML = '<div class="loading">Loading page information...</div>'

    try {
      const tab = await this.getCurrentTab()
      if (tab) {
        const pageInfo = {
          title: tab.title,
          url: tab.url,
          domain: new URL(tab.url).hostname,
          protocol: new URL(tab.url).protocol,
          status: tab.status
        }

        pageInfoContainer.innerHTML = Object.entries(pageInfo)
          .map(([key, value]) => `
            <div class="info-item">
              <strong>${key}:</strong> ${this.escapeHtml(value)}
            </div>
          `).join('')
      }
    } catch (error) {
      console.error('Error loading page info:', error)
      pageInfoContainer.innerHTML = '<div class="empty-state">Error loading page information</div>'
    }

    // TODO: Load performance and security info
    document.getElementById('performanceInfo').innerHTML = '<div class="empty-state">Performance metrics coming soon</div>'
    document.getElementById('securityInfo').innerHTML = '<div class="empty-state">Security information coming soon</div>'
  }

  attachStorageItemListeners () {
    // Update pin button states first
    this.updatePinButtonStates()

    // Add pin button listeners
    document.querySelectorAll('.storage-item .pin-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const storageItem = e.target.closest('.storage-item')
        const key = storageItem.dataset.key
        const storageType = this.currentStorage || 'localStorage'

        if (button.classList.contains('pinned')) {
          // If already pinned, unpin it
          this.unpinPropertyByKey(storageType, key)
        } else {
          // If not pinned, pin it
          this.pinProperty(storageType, key)
        }
      })
    })

    // Add edit button listeners
    document.querySelectorAll('.storage-item .edit-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const storageItem = e.target.closest('.storage-item')
        const key = storageItem.dataset.key
        this.showEditStorageModal(key)
      })
    })

    // Add delete button listeners
    document.querySelectorAll('.storage-item .delete-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const storageItem = e.target.closest('.storage-item')
        const key = storageItem.dataset.key
        this.showDeleteStorageConfirmation(key)
      })
    })
  }

  attachCookieItemListeners () {
    // Update pin button states first
    this.updatePinButtonStates()

    // Add pin button listeners
    document.querySelectorAll('.cookie-item .pin-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const cookieItem = e.target.closest('.cookie-item')
        const key = cookieItem.dataset.name

        if (button.classList.contains('pinned')) {
          // If already pinned, unpin it
          this.unpinPropertyByKey('cookie', key)
        } else {
          // If not pinned, pin it
          this.pinProperty('cookie', key)
        }
      })
    })

    // Add edit button listeners
    document.querySelectorAll('.cookie-item .edit-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        try {
          const cookieItem = e.target.closest('.cookie-item')
          const cookieName = cookieItem.dataset.name
          await this.showEditCookieModal(cookieName)
        } catch (error) {
          console.error('Error showing edit cookie modal:', error)
          this.showToast(`Error: ${error.message}`, 'error')
        }
      })
    })

    // Add delete button listeners
    document.querySelectorAll('.cookie-item .delete-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const cookieItem = e.target.closest('.cookie-item')
        const cookieName = cookieItem.dataset.name
        this.showDeleteCookieConfirmation(cookieName)
      })
    })
  }

  async executeScript () {
    const code = document.getElementById('codeEditor').value.trim()
    if (!code) return

    const timing = document.getElementById('executionTiming').value

    try {
      if (timing === 'immediate') {
        // Execute immediately in current page
        const response = await this.sendMessage('executeScript', { script: code })

        if (response && response.success) {
          // Store the result for formatting and export
          this.lastScriptResult = response.result
          this.addOutput(response.result)

          // Enable export button if there's a result
          const exportBtn = document.getElementById('exportOutput')
          if (exportBtn) exportBtn.disabled = false
        } else {
          this.addOutput(`Error: ${response.error}`, 'error')
        }
      } else if (timing === 'onload') {
        // Store script to execute on next page load
        await this.saveScriptForLater(code, 'onload')
        this.addOutput('Script saved to execute on next page load', 'info')
      } else if (timing === 'persistent') {
        // Store script to auto-execute on tab switch
        await this.saveScriptForLater(code, 'persistent')
        this.addOutput('Script saved for auto-execution on tab switch', 'info')
      }
    } catch (error) {
      this.addOutput(`Error: ${error.message}`, 'error')
    }
  }

  async saveScriptForLater (script, timing) {
    try {
      const key = timing === 'onload' ? 'onloadScript' : 'persistentScript'
      await chrome.storage.local.set({ [key]: script })
    } catch (error) {
      console.error('Error saving script:', error)
      throw error
    }
  }

  async executePersistentScript () {
    try {
      const result = await chrome.storage.local.get(['persistentScript'])
      if (result.persistentScript) {
        const response = await this.sendMessage('executeScript', { script: result.persistentScript })
        if (response && response.success) {
          // Store the result for formatting and export
          this.lastScriptResult = response.result
          this.addOutput(`Auto-executed: ${response.result}`, 'info')

          // Enable export button if there's a result
          const exportBtn = document.getElementById('exportOutput')
          if (exportBtn) exportBtn.disabled = false
        } else {
          this.addOutput(`Auto-execution error: ${response.error}`, 'error')
        }
      }
    } catch (error) {
      console.error('Error executing persistent script:', error)
    }
  }

  addOutput (content, type = 'log') {
    const outputContainer = document.getElementById('outputContent')
    const outputItem = document.createElement('div')
    outputItem.className = `output-item output-${type}`
    outputItem.textContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content)

    if (outputContainer.querySelector('.output-empty')) {
      outputContainer.innerHTML = ''
    }

    outputContainer.appendChild(outputItem)
    outputContainer.scrollTop = outputContainer.scrollHeight
  }

  clearConsole () {
    document.getElementById('outputContent').innerHTML = '<div class="output-empty">No output yet. Execute some code to see results.</div>'

    // Clear stored result and disable export
    this.lastScriptResult = null
    const exportBtn = document.getElementById('exportOutput')
    if (exportBtn) exportBtn.disabled = true
  }

  async handleTemplateCategoryChange(category) {
    const scriptSelect = document.getElementById('templateScript')
    const loadButton = document.getElementById('loadTemplate')

    // Clear and disable script selector
    scriptSelect.innerHTML = '<option value="">Select Script...</option>'
    scriptSelect.disabled = !category
    loadButton.disabled = true

    if (category === 'saved') {
      // Load saved scripts from storage
      await this.loadSavedScriptsToSelector(scriptSelect)
    } else if (category && this.scriptTemplates[category]) {
      // Populate built-in template options for selected category
      Object.keys(this.scriptTemplates[category]).forEach(scriptKey => {
        const template = this.scriptTemplates[category][scriptKey]
        const option = document.createElement('option')
        option.value = scriptKey
        option.textContent = template.name
        option.title = template.description
        scriptSelect.appendChild(option)
      })
    }

    if (category) {
      scriptSelect.disabled = false
    }
  }

  async loadSavedScriptsToSelector(scriptSelect) {
    try {
      const result = await chrome.storage.local.get(['savedScripts'])
      const savedScripts = result.savedScripts || []

      if (savedScripts.length === 0) {
        const option = document.createElement('option')
        option.value = ''
        option.textContent = 'No saved scripts yet'
        option.disabled = true
        scriptSelect.appendChild(option)
        return
      }

      // Group scripts by category
      const scriptsByCategory = {}
      savedScripts.forEach(script => {
        if (!scriptsByCategory[script.category]) {
          scriptsByCategory[script.category] = []
        }
        scriptsByCategory[script.category].push(script)
      })

      // Add scripts grouped by category
      Object.keys(scriptsByCategory).sort().forEach(category => {
        // Add category header
        const categoryOption = document.createElement('option')
        categoryOption.value = ''
        categoryOption.textContent = `── ${category.toUpperCase()} ──`
        categoryOption.disabled = true
        categoryOption.style.fontWeight = 'bold'
        scriptSelect.appendChild(categoryOption)

        // Add scripts in this category
        scriptsByCategory[category]
          .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
          .forEach(script => {
            const option = document.createElement('option')
            option.value = `saved:${script.id}`
            option.textContent = `${script.name} (${script.useCount || 0} uses)`
            option.title = script.description || 'No description'
            scriptSelect.appendChild(option)
          })
      })

    } catch (error) {
      console.error('Error loading saved scripts:', error)
      const option = document.createElement('option')
      option.value = ''
      option.textContent = 'Error loading scripts'
      option.disabled = true
      scriptSelect.appendChild(option)
    }
  }

  handleTemplateScriptChange(scriptKey) {
    const loadButton = document.getElementById('loadTemplate')
    loadButton.disabled = !scriptKey
  }

  async loadSelectedTemplate() {
    const categorySelect = document.getElementById('templateCategory')
    const scriptSelect = document.getElementById('templateScript')
    const codeEditor = document.getElementById('codeEditor')

    const category = categorySelect.value
    const scriptKey = scriptSelect.value

    if (!category || !scriptKey) return

    try {
      if (category === 'saved' && scriptKey.startsWith('saved:')) {
        // Load saved script
        const scriptId = parseInt(scriptKey.replace('saved:', ''))
        await this.loadSavedScript(scriptId, codeEditor)
      } else if (this.scriptTemplates[category] && this.scriptTemplates[category][scriptKey]) {
        // Load built-in template
        const template = this.scriptTemplates[category][scriptKey]

        // Load template code into editor
        codeEditor.value = template.code

        // Show template info in output
        this.addOutput(`📝 Loaded template: ${template.name}`, 'info')
        this.addOutput(`Description: ${template.description}`, 'info')

        // Focus on the editor
        codeEditor.focus()

        // Show success toast
        this.showToast(`Template "${template.name}" loaded successfully`)
      }
    } catch (error) {
      console.error('Error loading template:', error)
      this.showToast(`Error loading template: ${error.message}`, 'error')
    }
  }

  async loadSavedScript(scriptId, codeEditor) {
    try {
      const result = await chrome.storage.local.get(['savedScripts'])
      const savedScripts = result.savedScripts || []
      const script = savedScripts.find(s => s.id === scriptId)

      if (!script) {
        throw new Error('Script not found')
      }

      // Load script code into editor
      codeEditor.value = script.code

      // Update usage statistics
      script.lastUsed = new Date().toISOString()
      script.useCount = (script.useCount || 0) + 1

      // Save updated statistics
      await chrome.storage.local.set({ savedScripts })

      // Show script info in output
      this.addOutput(`📚 Loaded saved script: ${script.name}`, 'info')
      if (script.description) {
        this.addOutput(`Description: ${script.description}`, 'info')
      }
      this.addOutput(`Category: ${script.category} | Uses: ${script.useCount} | Created: ${new Date(script.created).toLocaleDateString()}`, 'info')

      // Focus on the editor
      codeEditor.focus()

      // Show success toast
      this.showToast(`Script "${script.name}" loaded successfully`)

    } catch (error) {
      console.error('Error loading saved script:', error)
      throw new Error('Failed to load saved script')
    }
  }

  saveScript () {
    const code = document.getElementById('codeEditor').value.trim()
    if (!code) {
      this.showToast('No code to save', 'error')
      return
    }

    this.showSaveScriptModal()
  }

  showSaveScriptModal () {
    const code = document.getElementById('codeEditor').value.trim()

    const formFields = [
      {
        id: 'scriptName',
        label: 'Script Name',
        type: 'text',
        required: true,
        placeholder: 'Enter script name...',
        validation: 'required'
      },
      {
        id: 'scriptCategory',
        label: 'Category',
        type: 'select',
        required: true,
        value: 'custom',
        options: [
          { value: 'custom', label: 'Custom Scripts' },
          { value: 'injection', label: 'Code Injection' },
          { value: 'scraping', label: 'Data Scraping' },
          { value: 'debugging', label: 'Debugging Tools' },
          { value: 'automation', label: 'Automation' }
        ]
      },
      {
        id: 'scriptDescription',
        label: 'Description (Optional)',
        type: 'textarea',
        placeholder: 'Brief description of what this script does...',
        rows: 3
      }
    ]

    this.showFormModal(
      'Save Script',
      'Save this script to your personal library for future use.',
      formFields,
      async (formData) => {
        await this.handleSaveScript(formData, code)
      }
    )
  }

  async handleSaveScript (formData, code) {
    try {
      const script = {
        id: Date.now(),
        name: formData.scriptName,
        code: code,
        category: formData.scriptCategory,
        description: formData.scriptDescription || '',
        created: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        useCount: 0
      }

      // Get existing saved scripts
      const result = await chrome.storage.local.get(['savedScripts'])
      const savedScripts = result.savedScripts || []

      // Check for duplicate names in the same category
      const duplicate = savedScripts.find(s =>
        s.name.toLowerCase() === script.name.toLowerCase() &&
        s.category === script.category
      )

      if (duplicate) {
        throw new Error(`A script named "${script.name}" already exists in the ${script.category} category`)
      }

      // Add new script
      savedScripts.push(script)

      // Save to storage
      await chrome.storage.local.set({ savedScripts })

      // Show success message
      this.addOutput(`💾 Script "${script.name}" saved successfully!`, 'info')
      this.showToast(`Script "${script.name}" saved to ${script.category} category`)

      // Update script management UI if needed
      this.refreshScriptLibrary()

    } catch (error) {
      console.error('Error saving script:', error)
      this.showToast(`Error: ${error.message}`, 'error')
      throw error // Re-throw to prevent modal from closing
    }
  }

  async refreshScriptLibrary() {
    // If "My Saved Scripts" category is currently selected, refresh the script list
    const categorySelect = document.getElementById('templateCategory')
    if (categorySelect.value === 'saved') {
      const scriptSelect = document.getElementById('templateScript')
      scriptSelect.innerHTML = '<option value="">Select Script...</option>'
      await this.loadSavedScriptsToSelector(scriptSelect)
    }
  }

  filterStorage (query) {
    const items = document.querySelectorAll('.storage-item')
    items.forEach(item => {
      const key = item.dataset.key.toLowerCase()
      const value = item.querySelector('.storage-value').textContent.toLowerCase()
      const matches = key.includes(query.toLowerCase()) || value.includes(query.toLowerCase())
      item.style.display = matches ? 'block' : 'none'
    })
  }

  filterCookies (query) {
    const items = document.querySelectorAll('.cookie-item')
    items.forEach(item => {
      const name = item.dataset.name.toLowerCase()
      const value = item.querySelector('.cookie-value').textContent.toLowerCase()
      const matches = name.includes(query.toLowerCase()) || value.includes(query.toLowerCase())
      item.style.display = matches ? 'block' : 'none'
    })
  }

  showModal (title, content, confirmCallback = null, options = {}) {
    document.getElementById('modalTitle').textContent = title
    document.getElementById('modalContent').innerHTML = content
    document.getElementById('modalOverlay').classList.add('active')

    const confirmBtn = document.getElementById('modalConfirm')
    const cancelBtn = document.getElementById('modalCancel')

    // Configure buttons based on options
    confirmBtn.textContent = options.confirmText || 'Confirm'
    cancelBtn.textContent = options.cancelText || 'Cancel'

    // Show/hide buttons as needed
    confirmBtn.style.display = options.hideConfirm ? 'none' : 'inline-block'
    cancelBtn.style.display = options.hideCancel ? 'none' : 'inline-block'

    confirmBtn.onclick = () => {
      if (confirmCallback) {
        const result = confirmCallback()
        // If callback returns false, don't close modal (for validation errors)
        if (result !== false) {
          this.hideModal()
        }
      } else {
        this.hideModal()
      }
    }
  }

  showFormModal (title, formFields, submitCallback, options = {}) {
    const formHtml = this.generateFormHTML(formFields, options)

    this.showModal(title, formHtml, () => {
      return this.handleFormSubmit(formFields, submitCallback)
    }, {
      confirmText: options.submitText || 'Save',
      cancelText: 'Cancel'
    })

    // Set up real-time validation
    setTimeout(() => this.setupFormValidation(formFields), 100)
  }

  generateFormHTML (formFields, options = {}) {
    let html = '<form class="modal-form" id="modalForm">'

    formFields.forEach(field => {
      html += '<div class="form-group">'
      html += `<label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label>`

      if (field.type === 'select') {
        html += `<select id="${field.id}" ${field.required ? 'required' : ''}>`
        field.options.forEach(option => {
          const selected = option.value === field.value ? 'selected' : ''
          html += `<option value="${option.value}" ${selected}>${option.label}</option>`
        })
        html += '</select>'
      } else if (field.type === 'textarea') {
        html += `<textarea id="${field.id}" placeholder="${field.placeholder || ''}"
                    ${field.required ? 'required' : ''} rows="${field.rows || 4}">${field.value || ''}</textarea>`
      } else if (field.type === 'checkbox') {
        html += `<input type="checkbox" id="${field.id}" ${field.checked ? 'checked' : ''}>`
        html += `<span class="checkbox-label">${field.checkboxLabel || ''}</span>`
      } else {
        html += `<input type="${field.type || 'text'}" id="${field.id}"
                    placeholder="${field.placeholder || ''}" value="${field.value || ''}"
                    ${field.required ? 'required' : ''} ${field.pattern ? `pattern="${field.pattern}"` : ''}>`
      }

      if (field.help) {
        html += `<small class="form-help">${field.help}</small>`
      }
      html += '<div class="form-error" id="' + field.id + '_error"></div>'
      html += '</div>'
    })

    html += '</form>'
    return html
  }

  setupFormValidation (formFields) {
    formFields.forEach(field => {
      const input = document.getElementById(field.id)
      const errorDiv = document.getElementById(field.id + '_error')

      if (input && errorDiv) {
        input.addEventListener('input', () => {
          this.validateField(field, input, errorDiv)
        })
        input.addEventListener('blur', () => {
          this.validateField(field, input, errorDiv)
        })
      }
    })
  }

  validateField (field, input, errorDiv) {
    const value = input.type === 'checkbox' ? input.checked : input.value
    let isValid = true
    let errorMessage = ''

    // Required validation
    if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
      isValid = false
      errorMessage = `${field.label} is required`
    }

    // Pattern validation
    if (isValid && field.pattern && value && !new RegExp(field.pattern).test(value)) {
      isValid = false
      errorMessage = field.patternMessage || `Invalid format for ${field.label}`
    }

    // Custom validation
    if (isValid && field.validate) {
      const customResult = field.validate(value)
      if (customResult !== true) {
        isValid = false
        errorMessage = customResult || `Invalid ${field.label}`
      }
    }

    // JSON validation for storage values (only if it looks like JSON)
    if (isValid && field.type === 'textarea' && field.validateJSON && value.trim()) {
      const trimmedValue = value.trim()
      // Only validate as JSON if it starts with JSON-like characters
      if (trimmedValue.startsWith('{') || trimmedValue.startsWith('[') || trimmedValue.startsWith('"')) {
        try {
          JSON.parse(value)
        } catch (e) {
          isValid = false
          errorMessage = 'Invalid JSON format'
        }
      }
      // Plain text values are always valid
    }

    // Update UI
    input.classList.toggle('error', !isValid)
    errorDiv.textContent = errorMessage
    errorDiv.style.display = errorMessage ? 'block' : 'none'

    return isValid
  }

  handleFormSubmit (formFields, submitCallback) {
    const formData = {}
    let isFormValid = true

    // Validate all fields
    formFields.forEach(field => {
      const input = document.getElementById(field.id)
      const errorDiv = document.getElementById(field.id + '_error')

      if (input && errorDiv) {
        const isFieldValid = this.validateField(field, input, errorDiv)
        isFormValid = isFormValid && isFieldValid

        // Collect form data
        formData[field.id] = input.type === 'checkbox' ? input.checked : input.value
      }
    })

    if (!isFormValid) {
      return false // Don't close modal
    }

    // Call submit callback
    if (submitCallback) {
      try {
        submitCallback(formData)
      } catch (error) {
        this.showToast(`Error: ${error.message}`, 'error')
        return false
      }
    }

    return true // Close modal
  }

  hideModal () {
    document.getElementById('modalOverlay').classList.remove('active')
  }

  showDashboardConfig () {
    // Show the new configuration overlay
    document.getElementById('configOverlay').classList.add('active')

    // Set up event listeners for the new interface
    this.setupConfigEventListeners()

    // Load data immediately
    this.loadConfigData()
  }

  setupConfigEventListeners () {
    // Clear existing listeners to prevent duplicates
    const overlay = document.getElementById('configOverlay')
    const newOverlay = overlay.cloneNode(true)
    overlay.parentNode.replaceChild(newOverlay, overlay)

    // Close button
    document.getElementById('configClose').addEventListener('click', () => {
      this.hideConfigOverlay()
    })

    // Search functionality
    document.getElementById('configSearch').addEventListener('input', (e) => {
      this.filterConfigProperties(e.target.value)
    })

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
        e.target.classList.add('active')
        this.filterPropertiesByType(e.target.dataset.filter)
      })
    })

    // Clear all pinned button
    document.getElementById('clearAllPinned').addEventListener('click', () => {
      this.clearAllPinnedProperties()
    })

    // Close on overlay click
    document.getElementById('configOverlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.hideConfigOverlay()
      }
    })
  }

  hideConfigOverlay () {
    document.getElementById('configOverlay').classList.remove('active')
  }

  async loadConfigData () {
    await Promise.all([
      this.loadAvailablePropertiesNew(),
      this.loadPinnedPropertiesNew()
    ])
  }

  showAddStorageModal () {
    const formFields = [
      {
        id: 'storageKey',
        label: 'Key',
        type: 'text',
        required: true,
        placeholder: 'Enter storage key...',
        help: 'The key name for the storage item',
        validate: (value) => {
          if (!value || !value.trim()) return 'Key is required'
          if (value.length > 100) return 'Key must be less than 100 characters'
          return true
        }
      },
      {
        id: 'storageValue',
        label: 'Value',
        type: 'textarea',
        required: true,
        placeholder: 'Enter value... (plain text or JSON)',
        rows: 4,
        help: 'The value to store. Plain text or JSON objects (JSON will be automatically parsed).',
        validateJSON: true
      },
      {
        id: 'storageType',
        label: 'Storage Type',
        type: 'select',
        value: this.currentStorage || 'localStorage',
        required: true,
        options: [
          { value: 'localStorage', label: 'Local Storage' },
          { value: 'sessionStorage', label: 'Session Storage' }
        ]
      }
    ]

    this.showFormModal(
      'Add Storage Item',
      formFields,
      (formData) => this.handleAddStorageItem(formData),
      { submitText: 'Add Item' }
    )
  }

  async handleAddStorageItem (formData) {
    try {
      const { storageKey, storageValue, storageType } = formData

      // Try to parse JSON value, otherwise use as string
      let parsedValue = storageValue
      try {
        parsedValue = JSON.parse(storageValue)
      } catch (e) {
        // Keep as string if not valid JSON
      }

      // Send message to content script to set the storage item
      const response = await this.sendMessage('setStorageData', {
        storageType: storageType,
        key: storageKey,
        value: parsedValue
      })

      if (response && response.success) {
        this.showToast(`${storageKey} added to ${storageType}`, 'success')

        // Update local cache
        if (!this.storageData[storageType]) {
          this.storageData[storageType] = {}
        }
        this.storageData[storageType][storageKey] = parsedValue

        // Refresh the current view if we're on the storage tab
        if (this.currentTab === 'storage' && this.currentStorage === storageType) {
          this.displayStorageData(this.storageData[storageType])
        }

        // Update dashboard if this storage type has pinned items
        this.updateDashboardIfNeeded(storageType, storageKey)
      } else {
        throw new Error(response?.error || 'Failed to add storage item')
      }
    } catch (error) {
      console.error('Error adding storage item:', error)
      this.showToast(`Error: ${error.message}`, 'error')
      throw error // Re-throw to prevent modal from closing
    }
  }

  async showAddCookieModal () {
    // Ensure tab info is available for form defaults
    const currentTab = await this.ensureTabInfo()
    const domain = currentTab ? new URL(currentTab.url).hostname : ''
    const isSecure = currentTab ? currentTab.url.startsWith('https:') : false

    const formFields = [
      {
        id: 'cookieName',
        label: 'Name',
        type: 'text',
        required: true,
        placeholder: 'Enter cookie name...',
        help: 'The name of the cookie',
        validate: (value) => {
          if (!value || !value.trim()) return 'Cookie name is required'
          if (value.length > 100) return 'Cookie name must be less than 100 characters'
          if (/[;,\s]/.test(value)) return 'Cookie name cannot contain semicolons, commas, or spaces'
          return true
        }
      },
      {
        id: 'cookieValue',
        label: 'Value',
        type: 'textarea',
        required: true,
        placeholder: 'Enter cookie value...',
        rows: 3,
        help: 'The value of the cookie',
        validate: (value) => {
          if (!value && value !== '') return 'Cookie value is required'
          if (value.length > 4096) return 'Cookie value must be less than 4096 characters'
          return true
        }
      },
      {
        id: 'cookieDomain',
        label: 'Domain',
        type: 'text',
        value: domain,
        placeholder: 'e.g., example.com or .example.com',
        help: 'The domain for the cookie. Use dot prefix for subdomains (e.g., .example.com)'
      },
      {
        id: 'cookiePath',
        label: 'Path',
        type: 'text',
        value: '/',
        placeholder: '/',
        help: 'The path for the cookie. Defaults to /'
      },
      {
        id: 'cookieExpires',
        label: 'Expires',
        type: 'datetime-local',
        help: 'When the cookie expires. Leave empty for session cookie'
      },
      {
        id: 'cookieSecure',
        label: 'Security Options',
        type: 'checkbox',
        checked: isSecure,
        checkboxLabel: 'Secure (HTTPS only)',
        help: 'Cookie will only be sent over HTTPS connections'
      },
      {
        id: 'cookieHttpOnly',
        label: '',
        type: 'checkbox',
        checkboxLabel: 'HttpOnly (not accessible via JavaScript)',
        help: 'Cookie cannot be accessed via document.cookie'
      },
      {
        id: 'cookieSameSite',
        label: 'SameSite',
        type: 'select',
        value: 'lax',
        options: [
          { value: 'strict', label: 'Strict' },
          { value: 'lax', label: 'Lax' },
          { value: 'no_restriction', label: 'None' },
          { value: 'unspecified', label: 'Unspecified' }
        ],
        help: 'Controls when the cookie is sent with cross-site requests'
      }
    ]

    this.showFormModal(
      'Add Cookie',
      formFields,
      (formData) => this.handleAddCookie(formData),
      { submitText: 'Add Cookie' }
    )
  }

  async handleAddCookie (formData) {
    try {
      // Ensure tab info is available
      console.log('handleAddCookie: Getting tab info...')
      const tabInfo = await this.ensureTabInfo()
      console.log('handleAddCookie: Tab info result:', tabInfo)

      if (!tabInfo) {
        throw new Error('Unable to get current tab information')
      }

      if (!tabInfo.id) {
        throw new Error('Tab object missing required id property')
      }

      const {
        cookieName,
        cookieValue,
        cookieDomain,
        cookiePath,
        cookieExpires,
        cookieSecure,
        cookieHttpOnly,
        cookieSameSite
      } = formData

      // Prepare cookie object
      const cookieData = {
        name: cookieName,
        value: cookieValue,
        domain: cookieDomain || undefined,
        path: cookiePath || '/',
        secure: cookieSecure,
        httpOnly: cookieHttpOnly,
        sameSite: cookieSameSite
      }

      // Add expiration if provided
      if (cookieExpires) {
        cookieData.expirationDate = Math.floor(new Date(cookieExpires).getTime() / 1000)
      }

      // Send message to background script to set the cookie
      console.log('About to send setCookie message. tabInfo:', tabInfo, 'tabInfo.id:', tabInfo?.id)
      console.log('cookieData object:', cookieData)

      // Validate cookieData for undefined properties
      console.log('Validating cookieData properties:')
      Object.keys(cookieData).forEach(key => {
        console.log(`  ${key}:`, cookieData[key], typeof cookieData[key])
        if (cookieData[key] === undefined) {
          console.warn(`WARNING: cookieData.${key} is undefined`)
        }
      })

      // Test with minimal hardcoded data first
      console.log('Testing with minimal hardcoded cookieData...')
      const testCookieData = {
        name: 'test',
        value: 'value'
      }

      let response
      try {
        console.log('Calling chrome.runtime.sendMessage with test data...')
        response = await chrome.runtime.sendMessage({
          action: 'setCookie',
          cookieData: testCookieData,
          tabId: tabInfo.id
        })
        console.log('Test call completed successfully, now trying with real data...')

        console.log('Calling chrome.runtime.sendMessage with real data...')
        response = await chrome.runtime.sendMessage({
          action: 'setCookie',
          cookieData: cookieData,
          tabId: tabInfo.id
        })
        console.log('chrome.runtime.sendMessage completed successfully, response:', response)
      } catch (chromeApiError) {
        console.error('Error in chrome.runtime.sendMessage:', chromeApiError)
        throw chromeApiError
      }

      if (response && response.success) {
        this.showToast(`Cookie "${cookieName}" added successfully`, 'success')

        // Refresh cookies if we're on the cookies tab
        if (this.currentTab === 'cookies') {
          setTimeout(() => this.loadCookies(), 500) // Small delay to ensure cookie is set
        }

        // Update dashboard if needed
        this.updateDashboardIfNeeded('cookie', cookieName)
      } else {
        throw new Error(response?.error || 'Failed to add cookie')
      }
    } catch (error) {
      console.error('Error adding cookie:', error)
      this.showToast(`Error: ${error.message}`, 'error')
      throw error // Re-throw to prevent modal from closing
    }
  }

  async showEditCookieModal (cookieName) {
    // Find the cookie in our cached data
    const cookie = this.cookieData?.find(c => c.name === cookieName)

    if (!cookie) {
      this.showToast(`Cookie "${cookieName}" not found`, 'error')
      return
    }

    // Convert expiration date to datetime-local format if it exists
    let expiresValue = ''
    if (cookie.expirationDate) {
      const date = new Date(cookie.expirationDate * 1000)
      expiresValue = date.toISOString().slice(0, 16) // Format for datetime-local
    }

    const formFields = [
      {
        id: 'cookieName',
        label: 'Name',
        type: 'text',
        value: cookie.name,
        required: true,
        placeholder: 'Enter cookie name...',
        help: 'The name of the cookie',
        validate: (value) => {
          if (!value || !value.trim()) return 'Cookie name is required'
          if (value.length > 100) return 'Cookie name must be less than 100 characters'
          if (/[;,\s]/.test(value)) return 'Cookie name cannot contain semicolons, commas, or spaces'
          return true
        }
      },
      {
        id: 'cookieValue',
        label: 'Value',
        type: 'textarea',
        value: cookie.value || '',
        required: true,
        placeholder: 'Enter cookie value...',
        rows: 3,
        help: 'The value of the cookie',
        validate: (value) => {
          if (!value && value !== '') return 'Cookie value is required'
          if (value.length > 4096) return 'Cookie value must be less than 4096 characters'
          return true
        }
      },
      {
        id: 'cookieDomain',
        label: 'Domain',
        type: 'text',
        value: cookie.domain || '',
        placeholder: 'e.g., example.com or .example.com',
        help: 'The domain for the cookie. Use dot prefix for subdomains (e.g., .example.com)'
      },
      {
        id: 'cookiePath',
        label: 'Path',
        type: 'text',
        value: cookie.path || '/',
        placeholder: '/',
        help: 'The path for the cookie. Defaults to /'
      },
      {
        id: 'cookieExpires',
        label: 'Expires',
        type: 'datetime-local',
        value: expiresValue,
        help: 'When the cookie expires. Leave empty for session cookie'
      },
      {
        id: 'cookieSecure',
        label: 'Security Options',
        type: 'checkbox',
        checked: cookie.secure || false,
        checkboxLabel: 'Secure (HTTPS only)',
        help: 'Cookie will only be sent over HTTPS connections'
      },
      {
        id: 'cookieHttpOnly',
        label: '',
        type: 'checkbox',
        checked: cookie.httpOnly || false,
        checkboxLabel: 'HttpOnly (not accessible via JavaScript)',
        help: 'Cookie cannot be accessed via document.cookie'
      },
      {
        id: 'cookieSameSite',
        label: 'SameSite',
        type: 'select',
        value: cookie.sameSite || 'lax',
        options: [
          { value: 'strict', label: 'Strict' },
          { value: 'lax', label: 'Lax' },
          { value: 'no_restriction', label: 'None' },
          { value: 'unspecified', label: 'Unspecified' }
        ],
        help: 'Controls when the cookie is sent with cross-site requests'
      }
    ]

    this.showFormModal(
      `Edit Cookie: ${cookieName}`,
      formFields,
      (formData) => this.handleEditCookie(cookie, formData),
      { submitText: 'Update Cookie' }
    )
  }

  async handleEditCookie (originalCookie, formData) {
    try {
      // Ensure tab info is available
      console.log('handleEditCookie: Getting tab info...')
      const tabInfo = await this.ensureTabInfo()
      console.log('handleEditCookie: Tab info result:', tabInfo)

      if (!tabInfo) {
        throw new Error('Unable to get current tab information')
      }

      if (!tabInfo.id) {
        throw new Error('Tab object missing required id property')
      }

      const {
        cookieName,
        cookieValue,
        cookieDomain,
        cookiePath,
        cookieExpires,
        cookieSecure,
        cookieHttpOnly,
        cookieSameSite
      } = formData

      // If name changed, we need to delete the old cookie first
      const nameChanged = originalCookie.name !== cookieName

      if (nameChanged) {
        // Delete old cookie
        const deleteResponse = await chrome.runtime.sendMessage({
          action: 'deleteCookie',
          cookieData: {
            name: originalCookie.name,
            domain: originalCookie.domain,
            path: originalCookie.path
          },
          tabId: tabInfo.id
        })

        if (!deleteResponse || !deleteResponse.success) {
          throw new Error(`Failed to delete original cookie: ${deleteResponse?.error}`)
        }
      }

      // Prepare new cookie object
      const cookieData = {
        name: cookieName,
        value: cookieValue,
        domain: cookieDomain || undefined,
        path: cookiePath || '/',
        secure: cookieSecure,
        httpOnly: cookieHttpOnly,
        sameSite: cookieSameSite
      }

      // Add expiration if provided
      if (cookieExpires) {
        cookieData.expirationDate = Math.floor(new Date(cookieExpires).getTime() / 1000)
      }

      // Set the new/updated cookie
      const response = await chrome.runtime.sendMessage({
        action: 'setCookie',
        cookieData: cookieData,
        tabId: tabInfo.id
      })

      if (response && response.success) {
        this.showToast(`Cookie "${cookieName}" updated successfully`, 'success')

        // Refresh cookies if we're on the cookies tab
        if (this.currentTab === 'cookies') {
          setTimeout(() => this.loadCookies(), 500) // Small delay to ensure cookie is set
        }

        // Update dashboard if needed
        this.updateDashboardIfNeeded('cookie', cookieName)
        if (nameChanged) {
          this.updateDashboardIfNeeded('cookie', originalCookie.name)
        }
      } else {
        throw new Error(response?.error || 'Failed to update cookie')
      }
    } catch (error) {
      console.error('Error editing cookie:', error)
      this.showToast(`Error: ${error.message}`, 'error')
      throw error // Re-throw to prevent modal from closing
    }
  }

  showDeleteCookieConfirmation (cookieName) {
    // Find the cookie in our cached data
    const cookie = this.cookieData?.find(c => c.name === cookieName)

    if (!cookie) {
      this.showToast(`Cookie "${cookieName}" not found`, 'error')
      return
    }

    // Format cookie details for display
    let displayValue = cookie.value || ''
    if (displayValue.length > 100) {
      displayValue = displayValue.substring(0, 100) + '...'
    }

    const expiresText = cookie.expirationDate
      ? new Date(cookie.expirationDate * 1000).toLocaleString()
      : 'Session cookie'

    const securityFlags = []
    if (cookie.secure) securityFlags.push('Secure')
    if (cookie.httpOnly) securityFlags.push('HttpOnly')
    if (cookie.sameSite) securityFlags.push(`SameSite=${cookie.sameSite}`)

    const confirmationHtml = `
      <div class="delete-confirmation">
        <div class="warning-icon" style="font-size: 24px; color: var(--danger-color); text-align: center; margin-bottom: 16px;">⚠️</div>
        <p>Are you sure you want to delete this cookie?</p>
        <div class="delete-details">
          <strong>Name:</strong> <code>${this.escapeHtml(cookie.name)}</code><br>
          <strong>Value:</strong> <code>${this.escapeHtml(displayValue)}</code><br>
          <strong>Domain:</strong> <code>${this.escapeHtml(cookie.domain || 'Current domain')}</code><br>
          <strong>Path:</strong> <code>${this.escapeHtml(cookie.path || '/')}</code><br>
          <strong>Expires:</strong> ${this.escapeHtml(expiresText)}<br>
          ${securityFlags.length > 0 ? `<strong>Flags:</strong> ${this.escapeHtml(securityFlags.join(', '))}<br>` : ''}
        </div>
        <p style="color: var(--danger-color); font-size: 12px; margin-top: 16px;">
          This action cannot be undone.
        </p>
      </div>
    `

    this.showModal(
      'Delete Cookie',
      confirmationHtml,
      () => this.handleDeleteCookie(cookie),
      {
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    )

    // Style the confirm button as dangerous
    setTimeout(() => {
      const confirmBtn = document.getElementById('modalConfirm')
      if (confirmBtn) {
        confirmBtn.style.backgroundColor = 'var(--danger-color)'
        confirmBtn.style.borderColor = 'var(--danger-color)'
      }
    }, 100)
  }

  async handleDeleteCookie (cookie) {
    try {
      // Ensure tab info is available
      console.log('handleDeleteCookie: Getting tab info...')
      const tabInfo = await this.ensureTabInfo()
      console.log('handleDeleteCookie: Tab info result:', tabInfo)

      if (!tabInfo) {
        throw new Error('Unable to get current tab information')
      }

      if (!tabInfo.id) {
        throw new Error('Tab object missing required id property')
      }

      // Send message to background script to delete the cookie
      const response = await chrome.runtime.sendMessage({
        action: 'deleteCookie',
        cookieData: {
          name: cookie.name,
          domain: cookie.domain,
          path: cookie.path
        },
        tabId: tabInfo.id
      })

      if (response && response.success) {
        this.showToast(`Cookie "${cookie.name}" deleted successfully`, 'success')

        // Refresh cookies if we're on the cookies tab
        if (this.currentTab === 'cookies') {
          setTimeout(() => this.loadCookies(), 500) // Small delay to ensure cookie is deleted
        }

        // Update dashboard if this cookie was pinned
        this.updateDashboardIfNeeded('cookie', cookie.name)
      } else {
        throw new Error(response?.error || 'Failed to delete cookie')
      }
    } catch (error) {
      console.error('Error deleting cookie:', error)
      this.showToast(`Error: ${error.message}`, 'error')
      throw error // Re-throw to prevent modal from closing
    }
  }

  exportData () {
    // TODO: Implement data export functionality
    console.log('Exporting data...')
  }

  showHelp () {
    const helpContent = `
      <h4>1nsp3ct0rG4dg3t Help</h4>
      <p>Welcome to 1nsp3ct0rG4dg3t! This extension helps you debug web pages by providing access to:</p>
      <ul>
        <li><strong>Dashboard:</strong> Pin frequently used storage values</li>
        <li><strong>Storage:</strong> View and edit localStorage and sessionStorage</li>
        <li><strong>Cookies:</strong> Manage cookies for the current domain</li>
        <li><strong>App Info:</strong> View page and application information</li>
        <li><strong>Console:</strong> Execute JavaScript in the page context</li>
      </ul>
      <p>Use the theme toggle to switch between light and dark modes.</p>
    `
    this.showModal('Help', helpContent)
  }

  updateStatusBar () {
    const statusElement = document.getElementById('pageUrl')
    if (this.tabInfo) {
      statusElement.textContent = this.tabInfo.url || 'Unknown URL'
    }
  }

  escapeHtml (text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  formatValue (value) {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return JSON.stringify(parsed, null, 2)
      } catch {
        return value
      }
    }
    return String(value)
  }

  async loadAvailablePropertiesNew () {
    try {
      const container = document.getElementById('availablePropertiesList')
      container.innerHTML = '<div class="loading">Loading properties...</div>'

      // Use cached data or load fresh
      let storageData = this.storageData
      let cookieData = this.cookieData

      if (!storageData && !cookieData) {
        // Use smart loading for storage data (non-blocking)
        this.loadStorageDataSmart()
        await this.loadCookies()
        storageData = this.storageData
        cookieData = this.cookieData
      }

      // Build property cards with modern design
      let html = ''
      const allProperties = []

      // Add localStorage properties
      if (storageData?.localStorage) {
        Object.entries(storageData.localStorage).forEach(([key, value]) => {
          allProperties.push({
            type: 'localStorage',
            key,
            value,
            domain: this.getCurrentDomain()
          })
        })
      }

      // Add sessionStorage properties
      if (storageData?.sessionStorage) {
        Object.entries(storageData.sessionStorage).forEach(([key, value]) => {
          allProperties.push({
            type: 'sessionStorage',
            key,
            value,
            domain: this.getCurrentDomain()
          })
        })
      }

      // Add cookies
      if (cookieData && cookieData.length > 0) {
        cookieData.forEach(cookie => {
          allProperties.push({
            type: 'cookie',
            key: cookie.name,
            value: cookie.value,
            domain: cookie.domain || this.getCurrentDomain()
          })
        })
      }

      if (allProperties.length === 0) {
        html = `
          <div class="config-empty-state">
            <h4>No properties found</h4>
            <p>No storage items or cookies are available for this page</p>
          </div>
        `
      } else {
        allProperties.forEach(prop => {
          const valuePreview = this.truncateValue(prop.value, 20)
          html += `
            <div class="property-card" data-type="${prop.type}" data-key="${this.escapeHtml(prop.key)}">
              <div class="property-info">
                <div class="property-name">${this.escapeHtml(prop.key)}</div>
                <div class="property-details">
                  <span class="property-type ${prop.type}">${this.getTypeDisplayName(prop.type)}</span>
                  <span class="property-domain">${prop.domain}</span>
                  <span class="property-value-preview">${this.escapeHtml(valuePreview)}</span>
                </div>
              </div>
              <div class="property-actions">
                <button class="pin-btn" data-type="${prop.type}" data-key="${this.escapeHtml(prop.key)}">Pin</button>
              </div>
            </div>
          `
        })
      }

      container.innerHTML = html
      this.allAvailableProperties = allProperties

      // Add event listeners for pin buttons
      container.querySelectorAll('.pin-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          this.pinPropertyFromConfig(btn.dataset.type, btn.dataset.key)
        })
      })

    } catch (error) {
      console.error('Error loading available properties:', error)
      document.getElementById('availablePropertiesList').innerHTML =
        '<div class="config-empty-state"><h4>Error</h4><p>Failed to load properties</p></div>'
    }
  }

  async loadPinnedPropertiesNew () {
    try {
      const result = await chrome.storage.local.get(['pinnedProperties'])
      const pinnedProperties = result.pinnedProperties || []
      const container = document.getElementById('pinnedPropertiesList')

      if (pinnedProperties.length === 0) {
        container.innerHTML = `
          <div class="config-empty-state">
            <h4>No pinned properties</h4>
            <p>Pin properties from the available list to see them here</p>
          </div>
        `
        return
      }

      let html = ''
      pinnedProperties.forEach((item, index) => {
        html += `
          <div class="property-card" data-index="${index}">
            <div class="property-info">
              <div class="property-name">${this.escapeHtml(item.alias || item.key)}</div>
              <div class="property-details">
                <span class="property-type ${item.type}">${this.getTypeDisplayName(item.type)}</span>
                <span class="property-domain">${item.domain}</span>
              </div>
            </div>
            <div class="property-actions">
              <button class="unpin-btn" data-index="${index}">Unpin</button>
            </div>
          </div>
        `
      })

      container.innerHTML = html

      // Add event listeners for unpin buttons
      container.querySelectorAll('.unpin-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          this.unpinPropertyFromConfig(parseInt(btn.dataset.index))
        })
      })

    } catch (error) {
      console.error('Error loading pinned properties:', error)
      document.getElementById('pinnedPropertiesList').innerHTML =
        '<div class="config-empty-state"><h4>Error</h4><p>Failed to load pinned properties</p></div>'
    }
  }

  getCurrentDomain () {
    return this.tabInfo ? new URL(this.tabInfo.url).hostname : 'unknown'
  }

  async ensureTabInfo () {
    console.log('ensureTabInfo: Current tabInfo:', this.tabInfo)
    if (!this.tabInfo) {
      console.log('ensureTabInfo: Getting current tab...')
      await this.getCurrentTab()
      console.log('ensureTabInfo: After getCurrentTab, tabInfo:', this.tabInfo)
    }
    return this.tabInfo
  }

  async pingContentScript (maxRetries = 3) {
    const tab = await this.ensureTabInfo()
    if (!tab) {
      throw new Error('Unable to get current tab information')
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'forwardToContentScript',
          tabId: tab.id,
          payload: { action: 'ping' }
        })

        if (response && response.success && response.ready) {
          return true
        }

        // Wait longer with each retry
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
        }
      } catch (error) {
        console.warn(`Content script ping attempt ${attempt + 1} failed:`, error)
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
        }
      }
    }

    throw new Error('Content script not ready. Please wait a moment and try again.')
  }

  truncateValue (value, maxLength) {
    if (!value) return ''
    const str = String(value)
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str
  }

  async pinPropertyFromConfig (type, key) {
    await this.pinProperty(type, key)
    await this.loadPinnedPropertiesNew()
    this.showToast(`${key} pinned successfully`)
  }

  async unpinPropertyFromConfig (index) {
    await this.unpinProperty(index)
    await this.loadPinnedPropertiesNew()
    this.showToast('Property unpinned successfully')
  }

  async clearAllPinnedProperties () {
    if (confirm('Are you sure you want to remove all pinned properties?')) {
      this.pinnedProperties = []
      await this.saveSettings()
      await this.loadPinnedPropertiesNew()
      this.showToast('All properties unpinned')
    }
  }

  filterConfigProperties (query) {
    if (!this.allAvailableProperties) return

    const cards = document.querySelectorAll('#availablePropertiesList .property-card')
    cards.forEach(card => {
      const key = card.dataset.key.toLowerCase()
      const type = card.dataset.type.toLowerCase()
      const matches = key.includes(query.toLowerCase()) || type.includes(query.toLowerCase())
      card.style.display = matches ? 'flex' : 'none'
    })
  }

  filterPropertiesByType (filter) {
    if (!this.allAvailableProperties) return

    const cards = document.querySelectorAll('#availablePropertiesList .property-card')
    cards.forEach(card => {
      const type = card.dataset.type
      const shouldShow = filter === 'all' || type === filter
      card.style.display = shouldShow ? 'flex' : 'none'
    })
  }

  showToast (message, type = 'info') {
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

  async updateDashboardIfNeeded (storageType, key) {
    try {
      // Check if this storage item is pinned
      const result = await chrome.storage.local.get(['pinnedProperties'])
      const pinnedProperties = result.pinnedProperties || []

      const currentTab = await this.getCurrentTab()
      const currentDomain = currentTab ? new URL(currentTab.url).hostname : 'unknown'

      const isPinned = pinnedProperties.some(prop =>
        prop.type === storageType &&
        prop.key === key &&
        prop.domain === currentDomain
      )

      // If pinned and we're on dashboard tab, refresh it
      if (isPinned && this.currentTab === 'dashboard') {
        setTimeout(() => this.loadDashboardProperties(), 100)
      }
    } catch (error) {
      console.error('Error updating dashboard:', error)
    }
  }

  showEditStorageModal (key) {
    const storageType = this.currentStorage || 'localStorage'
    const currentValue = this.storageData[storageType]?.[key]

    if (currentValue === undefined) {
      this.showToast(`Storage item "${key}" not found`, 'error')
      return
    }

    // Format value for display (if it's an object, stringify it)
    let displayValue = currentValue
    if (typeof currentValue === 'object' && currentValue !== null) {
      displayValue = JSON.stringify(currentValue, null, 2)
    } else {
      displayValue = String(currentValue)
    }

    const formFields = [
      {
        id: 'storageKey',
        label: 'Key',
        type: 'text',
        value: key,
        required: true,
        placeholder: 'Enter storage key...',
        help: 'The key name for the storage item',
        validate: (value) => {
          if (!value || !value.trim()) return 'Key is required'
          if (value.length > 100) return 'Key must be less than 100 characters'
          return true
        }
      },
      {
        id: 'storageValue',
        label: 'Value',
        type: 'textarea',
        value: displayValue,
        required: true,
        placeholder: 'Enter value... (plain text or JSON)',
        rows: 6,
        help: 'The value to store. Plain text or JSON objects (JSON will be automatically parsed).',
        validateJSON: true
      },
      {
        id: 'storageType',
        label: 'Storage Type',
        type: 'select',
        value: storageType,
        required: true,
        options: [
          { value: 'localStorage', label: 'Local Storage' },
          { value: 'sessionStorage', label: 'Session Storage' }
        ]
      }
    ]

    this.showFormModal(
      `Edit Storage Item: ${key}`,
      formFields,
      (formData) => this.handleEditStorageItem(key, formData),
      { submitText: 'Update Item' }
    )
  }

  async handleEditStorageItem (originalKey, formData) {
    try {
      const { storageKey, storageValue, storageType } = formData
      const originalStorageType = this.currentStorage || 'localStorage'

      // Try to parse JSON value, otherwise use as string
      let parsedValue = storageValue
      try {
        parsedValue = JSON.parse(storageValue)
      } catch (e) {
        // Keep as string if not valid JSON
      }

      // If key or storage type changed, we need to delete the old one
      const keyChanged = originalKey !== storageKey
      const typeChanged = originalStorageType !== storageType

      if (keyChanged || typeChanged) {
        // Delete old item
        const deleteResponse = await this.sendMessage('removeStorageData', {
          storageType: originalStorageType,
          key: originalKey
        })

        if (!deleteResponse || !deleteResponse.success) {
          throw new Error(`Failed to delete original item: ${deleteResponse?.error}`)
        }

        // Update local cache - remove old item
        if (this.storageData[originalStorageType]) {
          delete this.storageData[originalStorageType][originalKey]
        }
      }

      // Set the new/updated item
      const response = await this.sendMessage('setStorageData', {
        storageType: storageType,
        key: storageKey,
        value: parsedValue
      })

      if (response && response.success) {
        this.showToast(`${storageKey} updated in ${storageType}`, 'success')

        // Update local cache
        if (!this.storageData[storageType]) {
          this.storageData[storageType] = {}
        }
        this.storageData[storageType][storageKey] = parsedValue

        // Refresh the current view if we're on the storage tab
        if (this.currentTab === 'storage') {
          if (this.currentStorage === storageType) {
            this.displayStorageData(this.storageData[storageType])
          } else if (this.currentStorage === originalStorageType && typeChanged) {
            // If type changed and we're viewing the original type, refresh it
            this.displayStorageData(this.storageData[originalStorageType])
          }
        }

        // Update dashboard if needed
        this.updateDashboardIfNeeded(storageType, storageKey)
        if (keyChanged || typeChanged) {
          this.updateDashboardIfNeeded(originalStorageType, originalKey)
        }
      } else {
        throw new Error(response?.error || 'Failed to update storage item')
      }
    } catch (error) {
      console.error('Error editing storage item:', error)
      this.showToast(`Error: ${error.message}`, 'error')
      throw error // Re-throw to prevent modal from closing
    }
  }

  showDeleteStorageConfirmation (key) {
    const storageType = this.currentStorage || 'localStorage'
    const currentValue = this.storageData[storageType]?.[key]

    if (currentValue === undefined) {
      this.showToast(`Storage item "${key}" not found`, 'error')
      return
    }

    // Format value for display
    let displayValue = currentValue
    if (typeof currentValue === 'object' && currentValue !== null) {
      displayValue = JSON.stringify(currentValue)
    } else {
      displayValue = String(currentValue)
    }

    // Truncate long values for display
    if (displayValue.length > 100) {
      displayValue = displayValue.substring(0, 100) + '...'
    }

    const confirmationHtml = `
      <div class="delete-confirmation">
        <div class="warning-icon" style="font-size: 24px; color: var(--danger-color); text-align: center; margin-bottom: 16px;">⚠️</div>
        <p>Are you sure you want to delete this storage item?</p>
        <div class="delete-details">
          <strong>Storage Type:</strong> ${this.getTypeDisplayName(storageType)}<br>
          <strong>Key:</strong> <code>${this.escapeHtml(key)}</code><br>
          <strong>Value:</strong> <code>${this.escapeHtml(displayValue)}</code>
        </div>
        <p style="color: var(--danger-color); font-size: 12px; margin-top: 16px;">
          This action cannot be undone.
        </p>
      </div>
    `

    this.showModal(
      'Delete Storage Item',
      confirmationHtml,
      () => this.handleDeleteStorageItem(key),
      {
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    )

    // Style the confirm button as dangerous
    setTimeout(() => {
      const confirmBtn = document.getElementById('modalConfirm')
      if (confirmBtn) {
        confirmBtn.style.backgroundColor = 'var(--danger-color)'
        confirmBtn.style.borderColor = 'var(--danger-color)'
      }
    }, 100)
  }

  async handleDeleteStorageItem (key) {
    try {
      const storageType = this.currentStorage || 'localStorage'

      // Send message to content script to delete the storage item
      const response = await this.sendMessage('removeStorageData', {
        storageType: storageType,
        key: key
      })

      if (response && response.success) {
        this.showToast(`${key} deleted from ${storageType}`, 'success')

        // Update local cache
        if (this.storageData[storageType]) {
          delete this.storageData[storageType][key]
        }

        // Refresh the current view if we're on the storage tab
        if (this.currentTab === 'storage' && this.currentStorage === storageType) {
          this.displayStorageData(this.storageData[storageType])
        }

        // Update dashboard if this storage item was pinned
        this.updateDashboardIfNeeded(storageType, key)
      } else {
        throw new Error(response?.error || 'Failed to delete storage item')
      }
    } catch (error) {
      console.error('Error deleting storage item:', error)
      this.showToast(`Error: ${error.message}`, 'error')
      throw error // Re-throw to prevent modal from closing
    }
  }

  async loadAvailableProperties () {
    try {
      console.log('Loading available properties...')

      // First try to use cached data
      let storageData = this.storageData
      let cookieData = this.cookieData

      // If no cached data, try to load from current tab
      if (!storageData && !cookieData) {
        console.log('No cached data, loading from Storage/Cookies tabs...')
        // Use smart loading for storage data (non-blocking)
        this.loadStorageDataSmart()
        await this.loadCookies()
        storageData = this.storageData
        cookieData = this.cookieData
      }

      // If still no data, try direct message to content script
      if (!storageData || !cookieData) {
        console.log('Loading directly from content script...')
        const results = await Promise.all([
          this.sendMessage('getStorage'),
          this.sendMessage('getCookies')
        ])
        storageData = results[0]
        cookieData = results[1]
      }

      console.log('Available properties - Storage data:', storageData)
      console.log('Available properties - Cookie data:', cookieData)

      const container = document.getElementById('availableProperties')
      if (!container) {
        console.log('Container not found')
        return
      }

      let html = ''

      // Add localStorage properties
      if (storageData?.localStorage) {
        html += '<div class="property-group"><h5>localStorage</h5>'
        Object.keys(storageData.localStorage).forEach(key => {
          html += `
            <div class="property-item" data-type="localStorage" data-key="${this.escapeHtml(key)}">
              <span class="property-key">${this.escapeHtml(key)}</span>
              <button class="btn-pin" data-type="localStorage" data-key="${this.escapeHtml(key)}">Pin</button>
            </div>
          `
        })
        html += '</div>'
      }

      // Add sessionStorage properties
      if (storageData?.sessionStorage) {
        html += '<div class="property-group"><h5>sessionStorage</h5>'
        Object.keys(storageData.sessionStorage).forEach(key => {
          html += `
            <div class="property-item" data-type="sessionStorage" data-key="${this.escapeHtml(key)}">
              <span class="property-key">${this.escapeHtml(key)}</span>
              <button class="btn-pin" data-type="sessionStorage" data-key="${this.escapeHtml(key)}">Pin</button>
            </div>
          `
        })
        html += '</div>'
      }

      // Add cookies
      if (cookieData?.cookies && cookieData.cookies.length > 0) {
        html += '<div class="property-group"><h5>Cookies</h5>'
        cookieData.cookies.forEach(cookie => {
          html += `
            <div class="property-item" data-type="cookie" data-key="${this.escapeHtml(cookie.name)}">
              <span class="property-key">${this.escapeHtml(cookie.name)}</span>
              <button class="btn-pin" data-type="cookie" data-key="${this.escapeHtml(cookie.name)}">Pin</button>
            </div>
          `
        })
        html += '</div>'
      }

      if (!html) {
        html = `
          <div class="empty-state-small">
            <p>No properties found</p>
            <p style="font-size: 10px; margin-top: 8px;">
              Debug: localStorage: ${storageData?.localStorage ? Object.keys(storageData.localStorage).length + ' items' : 'none'}<br>
              sessionStorage: ${storageData?.sessionStorage ? Object.keys(storageData.sessionStorage).length + ' items' : 'none'}<br>
              Cookies: ${cookieData?.cookies ? cookieData.cookies.length + ' items' : 'none'}
            </p>
          </div>
        `
      }

      container.innerHTML = html

      // Add event listeners for pin buttons
      container.querySelectorAll('.btn-pin').forEach(button => {
        button.addEventListener('click', () => {
          const type = button.dataset.type
          const key = button.dataset.key
          this.pinProperty(type, key)
        })
      })
    } catch (error) {
      console.error('Error loading available properties:', error)
      const container = document.getElementById('availableProperties')
      if (container) {
        container.innerHTML = '<div class="error-state">Error loading properties</div>'
      }
    }
  }

  async loadPinnedProperties () {
    try {
      const result = await chrome.storage.local.get(['pinnedProperties'])
      const pinnedProperties = result.pinnedProperties || []

      const container = document.getElementById('pinnedList')
      if (!container) return

      if (pinnedProperties.length === 0) {
        container.innerHTML = '<div class="empty-state-small">No properties pinned</div>'
        return
      }

      let html = ''
      pinnedProperties.forEach((item, index) => {
        const domainDisplay = item.domain ? ` (${item.domain})` : ''
        html += `
          <div class="pinned-item" data-index="${index}">
            <span class="pinned-type">${item.type}</span>
            <span class="pinned-key">${this.escapeHtml(item.key)}${domainDisplay}</span>
            <button class="btn-unpin" data-index="${index}">Unpin</button>
          </div>
        `
      })

      container.innerHTML = html

      // Add event listeners for unpin buttons
      container.querySelectorAll('.btn-unpin').forEach(button => {
        button.addEventListener('click', () => {
          const index = parseInt(button.dataset.index)
          this.unpinProperty(index)
        })
      })
    } catch (error) {
      console.error('Error loading pinned properties:', error)
    }
  }

  async pinProperty (type, key) {
    try {
      const result = await chrome.storage.local.get(['pinnedProperties'])
      const pinnedProperties = result.pinnedProperties || []

      // Check if already pinned for this domain
      const currentTab = await this.getCurrentTab()
      const domain = currentTab ? new URL(currentTab.url).hostname : 'unknown'

      const exists = pinnedProperties.some(item =>
        item.type === type &&
        item.key === key &&
        item.domain === domain
      )
      if (exists) {
        console.log('Property already pinned for this domain:', type, key, domain)
        return
      }

      // Add to pinned properties with tab/domain information

      pinnedProperties.push({
        type,
        key,
        alias: key,
        domain: domain,
        url: currentTab?.url || '',
        tabId: currentTab?.id || null
      })
      await chrome.storage.local.set({ pinnedProperties })

      // Refresh the pinned list
      this.loadPinnedProperties()
      this.loadDashboardProperties()
      this.updatePinButtonStates()

      console.log('Property pinned successfully:', type, key)
    } catch (error) {
      console.error('Error pinning property:', error)
    }
  }

  async unpinProperty (index) {
    try {
      const result = await chrome.storage.local.get(['pinnedProperties'])
      const pinnedProperties = result.pinnedProperties || []

      if (index >= 0 && index < pinnedProperties.length) {
        pinnedProperties.splice(index, 1)
        await chrome.storage.local.set({ pinnedProperties })

        // Refresh the pinned list
        this.loadPinnedProperties()
        this.loadDashboardProperties()
        this.updatePinButtonStates()
      }
    } catch (error) {
      console.error('Error unpinning property:', error)
    }
  }

  async unpinPropertyByKey (type, key) {
    try {
      const result = await chrome.storage.local.get(['pinnedProperties'])
      const pinnedProperties = result.pinnedProperties || []

      const currentTab = await this.getCurrentTab()
      const currentDomain = currentTab ? new URL(currentTab.url).hostname : 'unknown'

      // Find the index of the property to unpin (matching type, key, and domain)
      const index = pinnedProperties.findIndex(item =>
        item.type === type &&
        item.key === key &&
        item.domain === currentDomain
      )

      if (index >= 0) {
        pinnedProperties.splice(index, 1)
        await chrome.storage.local.set({ pinnedProperties })

        // Refresh the displays
        this.loadPinnedProperties()
        this.loadDashboardProperties()
        this.updatePinButtonStates()

        console.log('Property unpinned successfully:', type, key, currentDomain)
      } else {
        console.log('Property not found for unpinning:', type, key, currentDomain)
      }
    } catch (error) {
      console.error('Error unpinning property by key:', error)
    }
  }

  async saveDashboardConfiguration () {
    this.hideModal()
    this.loadDashboardProperties()
  }

  async refreshDashboard () {
    console.log('Refreshing dashboard data...')

    // Show loading state immediately
    const container = document.getElementById('pinnedProperties')
    container.innerHTML = '<div class="loading">Refreshing dashboard...</div>'

    // Force reload both storage types and cookies for dashboard
    const refreshPromises = [
      this.loadStorageDataByType('localStorage'),
      this.loadStorageDataByType('sessionStorage'),
      this.loadCookies()
    ]

    try {
      await Promise.all(refreshPromises)
      console.log('Dashboard data refreshed successfully')

      // Now reload dashboard with fresh data
      this.loadDashboardProperties()
    } catch (error) {
      console.error('Error refreshing dashboard:', error)
      container.innerHTML = '<div class="error-state">Error refreshing dashboard. Please try again.</div>'
    }
  }

  async loadDashboardWithData () {
    // Show loading state
    const container = document.getElementById('pinnedProperties')
    container.innerHTML = '<div class="loading">Loading dashboard...</div>'

    // Load data independently without race conditions
    const loadPromises = []

    if (!this.storageData?.localStorage) {
      console.log('Loading localStorage data for dashboard...')
      loadPromises.push(this.loadStorageDataByType('localStorage'))
    }

    if (!this.storageData?.sessionStorage) {
      console.log('Loading sessionStorage data for dashboard...')
      loadPromises.push(this.loadStorageDataByType('sessionStorage'))
    }

    if (!this.cookieData) {
      console.log('Loading cookie data for dashboard...')
      loadPromises.push(this.loadCookies())
    }

    // Wait for all data to load with error handling
    if (loadPromises.length > 0) {
      console.log('Loading missing data for dashboard...')
      try {
        const results = await Promise.allSettled(loadPromises)

        // Log results for debugging
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`Promise ${index} failed:`, result.reason)
          } else {
            console.log(`Promise ${index} succeeded:`, result.value)
          }
        })
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      }
    }

    console.log('Data loading complete, rendering dashboard...')
    console.log('Final storage data:', this.storageData)
    console.log('Final cookie data:', this.cookieData)

    // Now load dashboard with available data (even if some failed)
    this.loadDashboardProperties()
  }

  async loadDashboardProperties () {
    try {
      const result = await chrome.storage.local.get(['pinnedProperties'])
      const pinnedProperties = result.pinnedProperties || []

      const container = document.getElementById('pinnedProperties')
      if (!container) return

      if (pinnedProperties.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <p>No properties pinned yet</p>
            <p class="empty-state-subtitle">Pin localStorage, sessionStorage, or cookie values to see them here</p>
          </div>
        `
        return
      }

      // Filter pinned properties for current tab/domain
      const currentTab = await this.getCurrentTab()
      const currentDomain = currentTab ? new URL(currentTab.url).hostname : 'unknown'

      console.log('Current domain:', currentDomain)
      const relevantProperties = pinnedProperties.filter(item =>
        item.domain === currentDomain || !item.domain // include legacy items without domain
      )

      console.log('Relevant pinned properties for current domain:', relevantProperties)

      if (relevantProperties.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <p>No properties pinned for this domain (${currentDomain})</p>
            <p class="empty-state-subtitle">Pin localStorage, sessionStorage, or cookie values to see them here</p>
          </div>
        `
        return
      }

      // Use cached data from Storage/Cookies tabs
      console.log('Loading dashboard properties using cached data...')
      console.log('Relevant properties to load:', relevantProperties)
      console.log('Available cached storage data:', this.storageData)
      console.log('Available cached cookie data:', this.cookieData)

      // Construct unified data structure from cached data with fallbacks
      const storageData = {
        localStorage: this.storageData?.localStorage || {},
        sessionStorage: this.storageData?.sessionStorage || {}
      }
      const cookieData = { cookies: this.cookieData || [] }

      console.log('Unified storage data for dashboard:', storageData)
      console.log('Cookie data for dashboard:', cookieData)

      // Check if we have any data at all
      const hasLocalStorage = Object.keys(storageData.localStorage).length > 0
      const hasSessionStorage = Object.keys(storageData.sessionStorage).length > 0
      const hasCookies = cookieData.cookies && cookieData.cookies.length > 0

      console.log(`Data availability: localStorage: ${hasLocalStorage}, sessionStorage: ${hasSessionStorage}, cookies: ${hasCookies}`)

      // Organize properties according to current organization mode
      const organizedProperties = this.organizeProperties(relevantProperties, this.organizationMode)
      console.log('Properties organized with mode:', this.organizationMode, organizedProperties)

      let html = '<div class="dashboard-properties">'

      // Add properties with group separators
      html += this.renderOrganizedProperties(organizedProperties, storageData, cookieData)

      html += '</div>'

      // Add last updated timestamp
      const now = new Date()
      const timeString = now.toLocaleTimeString()
      html += `<div class="dashboard-footer">Last updated: ${timeString}</div>`

      container.innerHTML = html

      // Set up drag and drop if in custom mode
      if (this.organizationMode === 'custom') {
        this.setupDragAndDrop()
      }
    } catch (error) {
      console.error('Error loading dashboard properties:', error)
      const container = document.getElementById('pinnedProperties')
      if (container) {
        container.innerHTML = '<div class="error-state">Error loading pinned properties</div>'
      }
    }
  }

  renderOrganizedProperties (organizedProperties, storageData, cookieData) {
    let html = ''
    let currentGroup = null

    for (const item of organizedProperties) {
      // Add group header if needed
      const groupName = this.getGroupName(item, this.organizationMode)
      if (groupName !== currentGroup && this.organizationMode !== 'default') {
        currentGroup = groupName
        html += `<div class="group-header">${groupName}</div>`
      }

      let value = 'Not found'
      let found = false

      console.log(`Looking for ${item.type}.${item.key}`)

      if (item.type === 'localStorage' && storageData.localStorage) {
        value = storageData.localStorage[item.key]
        found = value !== undefined
        console.log(`localStorage[${item.key}] = ${value}, found: ${found}`)
      } else if (item.type === 'sessionStorage' && storageData.sessionStorage) {
        value = storageData.sessionStorage[item.key]
        found = value !== undefined
        console.log(`sessionStorage[${item.key}] = ${value}, found: ${found}`)
      } else if (item.type === 'cookie' && cookieData?.cookies) {
        const cookie = cookieData.cookies.find(c => c.name === item.key)
        if (cookie) {
          value = cookie.value
          found = true
        }
        console.log(`cookie[${item.key}] = ${value}, found: ${found}`)
      }

      console.log(`Final value for ${item.type}.${item.key}: ${value} (found: ${found})`)

      const isDraggable = this.organizationMode === 'custom'
      html += `
        <div class="dashboard-property ${found ? '' : 'not-found'}"
             ${isDraggable ? 'draggable="true"' : ''}
             data-property-type="${item.type}"
             data-property-key="${this.escapeHtml(item.key)}"
             data-property-domain="${this.escapeHtml(item.domain || '')}">
          ${isDraggable ? '<div class="drag-handle">⋮⋮</div>' : ''}
          <div class="property-header">
            <span class="property-label">${this.escapeHtml(item.alias || item.key)}</span>
            <div class="property-meta">
              <span class="property-source">${this.getTypeDisplayName(item.type)}</span>
              ${item.domain ? `<span class="property-domain">${item.domain}</span>` : ''}
            </div>
          </div>
          <div class="property-value">${this.escapeHtml(this.formatValue(value))}</div>
        </div>
      `
    }

    return html
  }

  getGroupName (item, organizationMode) {
    switch (organizationMode) {
      case 'type':
        return this.getTypeDisplayName(item.type)
      case 'domain':
        return item.domain || 'Unknown Domain'
      case 'alphabetical':
        const firstLetter = (item.alias || item.key).charAt(0).toUpperCase()
        return firstLetter.match(/[A-Z]/) ? firstLetter : '#'
      default:
        return null
    }
  }

  getTypeDisplayName (type) {
    switch (type) {
      case 'localStorage':
        return 'Local Storage'
      case 'sessionStorage':
        return 'Session Storage'
      case 'cookie':
        return 'Cookies'
      default:
        return type
    }
  }

  async updatePinButtonStates () {
    try {
      const result = await chrome.storage.local.get(['pinnedProperties'])
      const pinnedProperties = result.pinnedProperties || []

      const currentTab = await this.getCurrentTab()
      const currentDomain = currentTab ? new URL(currentTab.url).hostname : 'unknown'

      // Update storage item pin buttons
      document.querySelectorAll('.storage-item').forEach(item => {
        const key = item.dataset.key
        const storageType = this.currentStorage || 'localStorage'
        const isPinned = pinnedProperties.some(prop =>
          prop.type === storageType &&
          prop.key === key &&
          prop.domain === currentDomain
        )

        const pinBtn = item.querySelector('.pin-btn')
        if (pinBtn) {
          pinBtn.innerHTML = '●' // Use a simple dot that can be colored with CSS
          if (isPinned) {
            pinBtn.title = 'Click to unpin from Dashboard'
            pinBtn.classList.add('pinned')
          } else {
            pinBtn.title = 'Click to pin to Dashboard'
            pinBtn.classList.remove('pinned')
          }
        }
      })

      // Update cookie item pin buttons
      document.querySelectorAll('.cookie-item').forEach(item => {
        const key = item.dataset.name
        const isPinned = pinnedProperties.some(prop =>
          prop.type === 'cookie' &&
          prop.key === key &&
          prop.domain === currentDomain
        )

        const pinBtn = item.querySelector('.pin-btn')
        if (pinBtn) {
          pinBtn.innerHTML = '●' // Use a simple dot that can be colored with CSS
          if (isPinned) {
            pinBtn.title = 'Click to unpin from Dashboard'
            pinBtn.classList.add('pinned')
          } else {
            pinBtn.title = 'Click to pin to Dashboard'
            pinBtn.classList.remove('pinned')
          }
        }
      })
    } catch (error) {
      console.error('Error updating pin button states:', error)
    }
  }

  async changeOrganizationMode (mode) {
    this.organizationMode = mode
    await this.saveSettings()

    // Update the UI
    document.getElementById('organizationMode').value = mode

    // Reload dashboard with new organization
    await this.loadDashboardProperties()
  }

  organizeProperties (properties, mode) {
    const organizedProperties = [...properties]

    switch (mode) {
      case 'type':
        return this.organizeByType(organizedProperties)
      case 'domain':
        return this.organizeByDomain(organizedProperties)
      case 'alphabetical':
        return this.organizeAlphabetically(organizedProperties)
      case 'custom':
        return this.organizeCustom(organizedProperties)
      case 'default':
      default:
        return organizedProperties
    }
  }

  organizeByType (properties) {
    const grouped = {
      localStorage: [],
      sessionStorage: [],
      cookie: []
    }

    properties.forEach(prop => {
      if (grouped[prop.type]) {
        grouped[prop.type].push(prop)
      }
    })

    return [
      ...grouped.localStorage,
      ...grouped.sessionStorage,
      ...grouped.cookie
    ]
  }

  organizeByDomain (properties) {
    const grouped = {}

    properties.forEach(prop => {
      const domain = prop.domain || 'unknown'
      if (!grouped[domain]) {
        grouped[domain] = []
      }
      grouped[domain].push(prop)
    })

    // Sort domains alphabetically and flatten
    return Object.keys(grouped)
      .sort()
      .reduce((result, domain) => {
        return result.concat(grouped[domain])
      }, [])
  }

  organizeAlphabetically (properties) {
    return properties.sort((a, b) => {
      const keyA = (a.alias || a.key).toLowerCase()
      const keyB = (b.alias || b.key).toLowerCase()
      return keyA.localeCompare(keyB)
    })
  }

  organizeCustom (properties) {
    // For custom organization, maintain current order
    // Custom order is preserved in the original properties array
    return properties
  }

  setupDragAndDrop () {
    const draggableItems = document.querySelectorAll('.dashboard-property[draggable="true"]')

    draggableItems.forEach(item => {
      item.addEventListener('dragstart', this.handleDragStart.bind(this))
      item.addEventListener('dragend', this.handleDragEnd.bind(this))
      item.addEventListener('dragover', this.handleDragOver.bind(this))
      item.addEventListener('drop', this.handleDrop.bind(this))
      item.addEventListener('dragenter', this.handleDragEnter.bind(this))
      item.addEventListener('dragleave', this.handleDragLeave.bind(this))
    })
  }

  handleDragStart (e) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.target.outerHTML)
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: e.target.dataset.propertyType,
      key: e.target.dataset.propertyKey,
      domain: e.target.dataset.propertyDomain
    }))

    e.target.classList.add('dragging')
    this.draggedElement = e.target
  }

  handleDragEnd (e) {
    e.target.classList.remove('dragging')
    this.draggedElement = null

    // Remove all drag visual indicators
    document.querySelectorAll('.dashboard-property').forEach(item => {
      item.classList.remove('drag-over')
    })
  }

  handleDragOver (e) {
    if (e.preventDefault) {
      e.preventDefault()
    }
    e.dataTransfer.dropEffect = 'move'
    return false
  }

  handleDragEnter (e) {
    e.target.classList.add('drag-over')
  }

  handleDragLeave (e) {
    e.target.classList.remove('drag-over')
  }

  async handleDrop (e) {
    if (e.stopPropagation) {
      e.stopPropagation()
    }

    e.target.classList.remove('drag-over')

    if (this.draggedElement !== e.target) {
      await this.reorderProperties(this.draggedElement, e.target)
    }

    return false
  }

  async reorderProperties (draggedElement, targetElement) {
    try {
      const draggedData = {
        type: draggedElement.dataset.propertyType,
        key: draggedElement.dataset.propertyKey,
        domain: draggedElement.dataset.propertyDomain
      }

      const targetData = {
        type: targetElement.dataset.propertyType,
        key: targetElement.dataset.propertyKey,
        domain: targetElement.dataset.propertyDomain
      }

      // Get current pinned properties
      const result = await chrome.storage.local.get(['pinnedProperties'])
      const pinnedProperties = result.pinnedProperties || []

      // Find the indices of the dragged and target items
      const draggedIndex = pinnedProperties.findIndex(prop =>
        prop.type === draggedData.type &&
        prop.key === draggedData.key &&
        prop.domain === draggedData.domain
      )

      const targetIndex = pinnedProperties.findIndex(prop =>
        prop.type === targetData.type &&
        prop.key === targetData.key &&
        prop.domain === targetData.domain
      )

      if (draggedIndex !== -1 && targetIndex !== -1) {
        // Remove the dragged item and insert it at the target position
        const [draggedItem] = pinnedProperties.splice(draggedIndex, 1)
        pinnedProperties.splice(targetIndex, 0, draggedItem)

        // Update the instance variable and save
        this.pinnedProperties = pinnedProperties
        await this.saveSettings()

        // Reload the dashboard
        await this.loadDashboardProperties()
      }
    } catch (error) {
      console.error('Error reordering properties:', error)
    }
  }

  handleOutputFormatChange(format) {
    const outputContent = document.getElementById('outputContent')
    const currentText = outputContent.textContent || outputContent.innerText

    if (!currentText || currentText.trim() === '' || currentText.includes('No output yet')) {
      return // No content to format
    }

    let lastScriptResult = this.lastScriptResult
    if (!lastScriptResult) {
      // Try to parse the current text content
      try {
        lastScriptResult = JSON.parse(currentText)
      } catch (e) {
        lastScriptResult = currentText
      }
    }

    switch (format) {
      case 'json':
        this.formatAsJSON(lastScriptResult, outputContent)
        break
      case 'table':
        this.formatAsTable(lastScriptResult, outputContent)
        break
      case 'html':
        this.formatAsHTML(lastScriptResult, outputContent)
        break
      case 'text':
      default:
        this.formatAsText(lastScriptResult, outputContent)
        break
    }

    // Enable export button if there's content
    document.getElementById('exportOutput').disabled = false
  }

  formatAsJSON(data, container) {
    try {
      const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
      container.innerHTML = `<pre class="json-viewer">${this.escapeHtml(jsonString)}</pre>`
    } catch (error) {
      container.innerHTML = `<div class="error">Error formatting as JSON: ${error.message}</div>`
    }
  }

  formatAsTable(data, container) {
    if (!Array.isArray(data)) {
      container.innerHTML = '<div class="info">Table view requires array data</div>'
      return
    }

    if (data.length === 0) {
      container.innerHTML = '<div class="info">No data to display in table</div>'
      return
    }

    try {
      // Handle array of objects
      if (typeof data[0] === 'object' && data[0] !== null) {
        const headers = Object.keys(data[0])
        let tableHTML = '<table class="result-table"><thead><tr>'

        headers.forEach(header => {
          tableHTML += `<th>${this.escapeHtml(header)}</th>`
        })
        tableHTML += '</tr></thead><tbody>'

        data.forEach(row => {
          tableHTML += '<tr>'
          headers.forEach(header => {
            const value = row[header]
            const displayValue = value === null || value === undefined ? '' :
                               typeof value === 'object' ? JSON.stringify(value) : String(value)
            tableHTML += `<td>${this.escapeHtml(displayValue)}</td>`
          })
          tableHTML += '</tr>'
        })
        tableHTML += '</tbody></table>'
        container.innerHTML = tableHTML
      } else {
        // Handle array of primitives
        let tableHTML = '<table class="result-table"><thead><tr><th>Index</th><th>Value</th></tr></thead><tbody>'
        data.forEach((item, index) => {
          const displayValue = item === null || item === undefined ? '' : String(item)
          tableHTML += `<tr><td>${index}</td><td>${this.escapeHtml(displayValue)}</td></tr>`
        })
        tableHTML += '</tbody></table>'
        container.innerHTML = tableHTML
      }
    } catch (error) {
      container.innerHTML = `<div class="error">Error formatting as table: ${error.message}</div>`
    }
  }

  formatAsHTML(data, container) {
    if (typeof data === 'string' && (data.includes('<') && data.includes('>'))) {
      // Looks like HTML content
      container.innerHTML = `<div class="html-preview">${data}</div>`
    } else {
      // Convert to HTML representation
      const htmlString = typeof data === 'object' ?
        `<pre>${this.escapeHtml(JSON.stringify(data, null, 2))}</pre>` :
        `<div>${this.escapeHtml(String(data))}</div>`
      container.innerHTML = `<div class="html-preview">${htmlString}</div>`
    }
  }

  formatAsText(data, container) {
    const textContent = typeof data === 'object' ?
      JSON.stringify(data, null, 2) : String(data)
    container.innerHTML = `<pre class="text-output">${this.escapeHtml(textContent)}</pre>`
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  async exportOutputData() {
    const outputContent = document.getElementById('outputContent')
    const format = document.getElementById('outputFormat').value

    if (!this.lastScriptResult) {
      this.showToast('No data to export', 'warning')
      return
    }

    try {
      let filename, content, mimeType

      switch (format) {
        case 'json':
          filename = 'scraped-data.json'
          content = JSON.stringify(this.lastScriptResult, null, 2)
          mimeType = 'application/json'
          break
        case 'table':
          if (Array.isArray(this.lastScriptResult) && this.lastScriptResult.length > 0) {
            filename = 'scraped-data.csv'
            content = this.arrayToCSV(this.lastScriptResult)
            mimeType = 'text/csv'
          } else {
            filename = 'scraped-data.txt'
            content = String(this.lastScriptResult)
            mimeType = 'text/plain'
          }
          break
        case 'html':
          filename = 'scraped-data.html'
          content = outputContent.innerHTML
          mimeType = 'text/html'
          break
        default:
          filename = 'scraped-data.txt'
          content = typeof this.lastScriptResult === 'object' ?
            JSON.stringify(this.lastScriptResult, null, 2) : String(this.lastScriptResult)
          mimeType = 'text/plain'
      }

      // Create and trigger download
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      URL.revokeObjectURL(url)
      this.showToast(`Data exported as ${filename}`, 'success')

    } catch (error) {
      console.error('Export error:', error)
      this.showToast(`Export failed: ${error.message}`, 'error')
    }
  }

  arrayToCSV(arrayData) {
    if (!Array.isArray(arrayData) || arrayData.length === 0) {
      return ''
    }

    // Handle array of objects
    if (typeof arrayData[0] === 'object' && arrayData[0] !== null) {
      const headers = Object.keys(arrayData[0])
      const csvRows = []

      // Add header row
      csvRows.push(headers.map(header => `"${header}"`).join(','))

      // Add data rows
      arrayData.forEach(row => {
        const values = headers.map(header => {
          const value = row[header]
          const stringValue = value === null || value === undefined ? '' :
                            typeof value === 'object' ? JSON.stringify(value) : String(value)
          return `"${stringValue.replace(/"/g, '""')}"`
        })
        csvRows.push(values.join(','))
      })

      return csvRows.join('\n')
    } else {
      // Handle array of primitives
      const csvRows = ['Index,Value']
      arrayData.forEach((item, index) => {
        const value = item === null || item === undefined ? '' : String(item)
        csvRows.push(`${index},"${value.replace(/"/g, '""')}"`)
      })
      return csvRows.join('\n')
    }
  }

  // DOM Selection Tools Methods
  async activateElementPicker() {
    try {
      const selectBtn = document.getElementById('selectElement')

      if (selectBtn.classList.contains('active')) {
        // Deactivate if already active
        await this.deactivateElementPicker()
        return
      }

      // Check if we can inject into the current tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tabs[0]) {
        this.showToast('No active tab found', 'error')
        return
      }

      const tab = tabs[0]
      if (!this.canInjectIntoUrl(tab.url)) {
        this.showToast('Cannot pick elements on this page type', 'warning')
        return
      }

      // Activate picker mode UI first
      selectBtn.classList.add('active')
      selectBtn.textContent = '⏹️ Stop Picking'
      selectBtn.title = 'Stop Element Picker'

      try {
        // Inject element picker script into page
        const response = await this.sendMessage('injectElementPicker', { activate: true })

        if (!response || !response.success) {
          throw new Error(response?.error || 'Failed to activate element picker')
        }

        // Set up message listener for element selection
        this.setupElementSelectionListener()

        this.showToast('Element picker activated. Click on any element on the page, or press Escape to cancel.', 'info')

      } catch (injectionError) {
        // Reset button state on injection failure
        selectBtn.classList.remove('active')
        selectBtn.textContent = '📌 Pick Element'
        selectBtn.title = 'Pick Element on Page'

        throw injectionError
      }

    } catch (error) {
      console.error('Error activating element picker:', error)
      this.showToast(`Error: ${error.message}`, 'error')
    }
  }

  async deactivateElementPicker() {
    try {
      const selectBtn = document.getElementById('selectElement')

      // Reset button state
      selectBtn.classList.remove('active')
      selectBtn.textContent = '📌 Pick Element'
      selectBtn.title = 'Pick Element on Page'

      // Deactivate picker in page
      await this.sendMessage('injectElementPicker', { activate: false })

      // Remove message listener
      this.removeElementSelectionListener()

      this.showToast('Element picker deactivated', 'info')

    } catch (error) {
      console.error('Error deactivating element picker:', error)
    }
  }

  setupElementSelectionListener() {
    if (this.elementSelectionListener) {
      this.removeElementSelectionListener()
    }

    this.elementSelectionListener = (message) => {
      if (message.type === 'ELEMENT_SELECTED') {
        this.handleElementSelected(message.data)
      } else if (message.type === 'ELEMENT_PICKER_CANCELLED') {
        this.deactivateElementPicker()
      }
    }

    chrome.runtime.onMessage.addListener(this.elementSelectionListener)
  }

  removeElementSelectionListener() {
    if (this.elementSelectionListener) {
      chrome.runtime.onMessage.removeListener(this.elementSelectionListener)
      this.elementSelectionListener = null
    }
  }

  async handleElementSelected(elementData) {
    try {
      // Deactivate picker first
      await this.deactivateElementPicker()

      // Insert selector into code editor
      const codeEditor = document.getElementById('codeEditor')
      const currentCode = codeEditor.value
      const cursorPos = codeEditor.selectionStart

      // Insert selector at cursor position
      const selectorCode = `document.querySelector('${elementData.cssSelector}')`
      const newCode = currentCode.slice(0, cursorPos) + selectorCode + currentCode.slice(cursorPos)

      codeEditor.value = newCode
      codeEditor.focus()

      // Position cursor after inserted text
      const newCursorPos = cursorPos + selectorCode.length
      codeEditor.setSelectionRange(newCursorPos, newCursorPos)

      // Show element info
      this.showElementInfo(elementData)

    } catch (error) {
      console.error('Error handling selected element:', error)
      this.showToast(`Error: ${error.message}`, 'error')
    }
  }

  showElementInfo(elementData) {
    const { tagName, cssSelector, xpath, textContent, elementInfo } = elementData

    const infoHtml = `
      <div class="element-info">
        <h4>Selected Element</h4>
        <div class="element-details">
          <div class="detail-row">
            <strong>Tag:</strong> &lt;${tagName.toLowerCase()}&gt;
          </div>
          <div class="detail-row">
            <strong>CSS Selector:</strong>
            <code class="selector-code">${this.escapeHtml(cssSelector)}</code>
          </div>
          ${xpath ? `
          <div class="detail-row">
            <strong>XPath:</strong>
            <code class="selector-code">${this.escapeHtml(xpath)}</code>
          </div>
          ` : ''}
          ${textContent ? `
          <div class="detail-row">
            <strong>Text:</strong>
            <span class="element-text">${this.escapeHtml(textContent.substring(0, 100))}${textContent.length > 100 ? '...' : ''}</span>
          </div>
          ` : ''}
          ${elementInfo ? `
          <div class="detail-row">
            <strong>Attributes:</strong>
            <span class="element-attrs">${this.escapeHtml(elementInfo)}</span>
          </div>
          ` : ''}
        </div>
        <div class="element-actions">
          <button class="btn btn-small" onclick="navigator.clipboard.writeText('${cssSelector.replace(/'/g, "\\'")}')">📋 Copy CSS</button>
          ${xpath ? `<button class="btn btn-small" onclick="navigator.clipboard.writeText('${xpath.replace(/'/g, "\\'")}')">📋 Copy XPath</button>` : ''}
        </div>
      </div>
    `

    this.showModal('Element Selected', infoHtml, null, {
      hideConfirm: true,
      cancelText: 'Close'
    })
  }

  toggleInspectorMode() {
    const inspectBtn = document.getElementById('inspectMode')

    if (inspectBtn.classList.contains('active')) {
      // Deactivate inspector mode
      inspectBtn.classList.remove('active')
      inspectBtn.textContent = '🔍 Inspector'
      inspectBtn.title = 'Toggle Inspector Mode'
      this.showToast('Inspector mode deactivated', 'info')
    } else {
      // Activate inspector mode
      inspectBtn.classList.add('active')
      inspectBtn.textContent = '🔍 Stop'
      inspectBtn.title = 'Stop Inspector Mode'
      this.showToast('Inspector mode activated (experimental)', 'info')
    }
  }

  canInjectIntoUrl(url) {
    if (!url) return false

    // Check for restricted URLs
    const restrictedProtocols = ['chrome:', 'chrome-extension:', 'moz-extension:', 'edge:', 'about:']
    const restrictedDomains = ['chrome.google.com']

    for (const protocol of restrictedProtocols) {
      if (url.startsWith(protocol)) {
        return false
      }
    }

    for (const domain of restrictedDomains) {
      if (url.includes(domain)) {
        return false
      }
    }

    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')
  }
}

// Global error handler for context invalidation
window.addEventListener('error', (event) => {
  if (event.error && event.error.message.includes('Extension context invalidated')) {
    console.warn('Extension context invalidated, side panel may need refresh')
    // Show a notification to the user
    const body = document.body
    if (body && !body.querySelector('.context-invalidated-notice')) {
      const notice = document.createElement('div')
      notice.className = 'context-invalidated-notice'
      notice.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #ff6b6b;
        color: white;
        padding: 8px;
        text-align: center;
        font-size: 12px;
        z-index: 9999;
      `
      notice.textContent = 'Extension was reloaded. Please close and reopen this panel.'
      body.appendChild(notice)
    }
  }
})

// Initialize the extension when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new Inspector()
})