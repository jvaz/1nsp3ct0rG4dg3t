// 1nsp3ct0rG4dg3t Extension Popup JavaScript

import { showToast, escapeHtml } from './utils/ui-helpers.js'
import { TABS, STORAGE_TYPES, THEMES, TOAST_TYPES, ORGANIZATION_MODES } from './utils/constants.js'
import { MessageHandler } from './services/message-handler.js'
import { ModalManager } from './components/modal-manager.js'
import { StorageManager } from './components/storage-manager.js'
import { CookieManager } from './components/cookie-manager.js'
import { DashboardManager } from './components/dashboard-manager.js'
import { getDomainFromTab } from './utils/url-helpers.js'

class Inspector {
  constructor () {
    this.currentTab = TABS.DASHBOARD
    this.theme = THEMES.LIGHT
    this.tabInfo = null
    this.pinnedProperties = []
    this.organizationMode = ORGANIZATION_MODES.DEFAULT
    this.tabChangeTimeout = null
    this.contentScriptReadyCache = new Map()

    // Initialize services
    this.messageHandler = new MessageHandler()
    this.modalManager = new ModalManager()
    this.storageManager = new StorageManager(this.messageHandler, this.modalManager, this)
    this.cookieManager = new CookieManager(this.messageHandler, this.modalManager, this)
    this.dashboardManager = new DashboardManager(this.messageHandler, this.modalManager, this.storageManager, this.cookieManager, this)

    // Set cross-references between components
    this.cookieManager.setDashboardManager(this.dashboardManager)


    this.init()
  }

  async init () {
    await this.loadSettings()
    this.setupEventListeners()
    this.setupTheme()
    this.updateUIState()
    this.tabInfo = await this.messageHandler.getCurrentTab()
    this.storageManager.setTabInfo(this.tabInfo)
    this.cookieManager.setTabInfo(this.tabInfo)
    this.dashboardManager.setTabInfo(this.tabInfo)
    this.setupTabChangeListener()

    // Load data for the currently active tab (non-blocking)
    this.loadCurrentTabData()

    this.updateStatusBar()
  }



  loadCurrentTabData () {
    // Load data for the currently active UI tab (non-blocking)
    switch (this.currentTab) {
      case TABS.DASHBOARD:
        this.loadDashboardWithData()
        break
      case TABS.STORAGE:
        this.storageManager.loadStorageDataSmart()
        break
      case TABS.COOKIES:
        this.cookieManager.loadCookies()
        break
      default:
        // Default to dashboard if unknown tab
        this.loadDashboardWithData()
    }
  }



  async loadSettings () {
    try {
      const result = await chrome.storage.local.get(['dashboardConfig', 'settings'])
      if (result.dashboardConfig) {
        this.pinnedProperties = result.dashboardConfig.pinnedProperties || []
        this.theme = result.dashboardConfig.theme || THEMES.LIGHT
        this.organizationMode = result.dashboardConfig.organizationMode || ORGANIZATION_MODES.DEFAULT
        this.dashboardManager.setOrganizationMode(this.organizationMode)
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
        this.storageManager.switchStorageType(e.target.dataset.storage)
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
      this.dashboardManager.refreshDashboard()
    })

    document.getElementById('organizationMode').addEventListener('change', (e) => {
      this.changeOrganizationMode(e.target.value)
    })

    // Storage actions
    document.getElementById('addStorageItem').addEventListener('click', () => {
      this.storageManager.showAddStorageModal()
    })

    document.getElementById('refreshStorage').addEventListener('click', () => {
      this.storageManager.loadStorageDataSmart()
    })

    // Cookie actions
    document.getElementById('addCookie').addEventListener('click', async () => {
      try {
        await this.cookieManager.showAddCookieModal()
      } catch (error) {
        console.error('Error showing add cookie modal:', error)
        showToast(`Error: ${error.message}`, TOAST_TYPES.ERROR)
      }
    })

    document.getElementById('refreshCookies').addEventListener('click', () => {
      this.cookieManager.loadCookies()
    })


    // Search functionality
    document.getElementById('storageSearch').addEventListener('input', (e) => {
      this.storageManager.filterStorage(e.target.value)
    })

    document.getElementById('cookieSearch').addEventListener('input', (e) => {
      this.cookieManager.filterCookies(e.target.value)
    })

    // Status bar actions

    document.getElementById('aboutBtn').addEventListener('click', () => {
      this.showAbout()
    })

    // Dashboard search functionality
    const dashboardSearch = document.getElementById('dashboardSearch')
    const dashboardSearchClear = document.getElementById('dashboardSearchClear')

    dashboardSearch.addEventListener('input', (e) => {
      this.dashboardManager.searchAllData(e.target.value)
    })

    // Escape key to clear search
    dashboardSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.clearDashboardSearch()
      }
    })

    // Clear button functionality
    dashboardSearchClear.addEventListener('click', () => {
      this.clearDashboardSearch()
    })

    // Storage search functionality
    const storageSearch = document.getElementById('storageSearch')
    const storageSearchClear = document.getElementById('storageSearchClear')

    // Escape key to clear storage search
    storageSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.clearStorageSearch()
      }
    })

    // Clear button for storage search
    storageSearchClear.addEventListener('click', () => {
      this.clearStorageSearch()
    })

    // Cookie search functionality
    const cookieSearch = document.getElementById('cookieSearch')
    const cookieSearchClear = document.getElementById('cookieSearchClear')

    // Escape key to clear cookie search
    cookieSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.clearCookieSearch()
      }
    })

    // Clear button for cookie search
    cookieSearchClear.addEventListener('click', () => {
      this.clearCookieSearch()
    })
  }

  clearDashboardSearch() {
    const searchInput = document.getElementById('dashboardSearch')
    searchInput.value = ''
    this.dashboardManager.hideSearchResults()
    searchInput.focus()
  }

  clearStorageSearch() {
    const searchInput = document.getElementById('storageSearch')
    searchInput.value = ''
    searchInput.dispatchEvent(new Event('input'))
    searchInput.focus()
  }

  clearCookieSearch() {
    const searchInput = document.getElementById('cookieSearch')
    searchInput.value = ''
    searchInput.dispatchEvent(new Event('input'))
    searchInput.focus()
  }

  setupTheme () {
    document.body.setAttribute('data-theme', this.theme)
    const themeIcon = document.querySelector('.theme-icon')
    themeIcon.textContent = this.theme === THEMES.LIGHT ? '🌙' : '☀️'
  }

  toggleTheme () {
    this.theme = this.theme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT
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
      case TABS.DASHBOARD:
        this.loadDashboardWithData()
        break
      case TABS.STORAGE:
        this.storageManager.loadStorageDataSmart()
        break
      case TABS.COOKIES:
        this.cookieManager.loadCookies()
        break
    }

    // Update pin button states for storage and cookies tabs
    if (tabName === TABS.STORAGE || tabName === TABS.COOKIES) {
      setTimeout(() => this.dashboardManager.updatePinButtonStates(), 100)
    }
  }


  setupTabChangeListener () {
    // Listen for tab changes to auto-update
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      console.log('Tab activated:', activeInfo.tabId)
      this.handleTabChange()
    })

    // Listen for tab updates (URL changes, page loads, etc.)
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      console.log('Tab updated:', tabId, changeInfo)

      // Handle multiple change scenarios
      if (tab.active) {
        // Tab is active and something changed
        if (changeInfo.status === 'complete') {
          // Page finished loading
          console.log('Active tab finished loading')
          this.handleTabChange()
        } else if (changeInfo.url) {
          // URL changed (navigation)
          console.log('Active tab URL changed')
          this.handleTabChange()
        } else if (changeInfo.status === 'loading') {
          // Page started loading - clear current data
          this.handleTabLoading()
        }
      }
    })

    // Listen for window focus events (when user switches back to browser)
    chrome.windows.onFocusChanged.addListener(async (windowId) => {
      if (windowId !== chrome.windows.WINDOW_ID_NONE) {
        // Browser window gained focus, refresh current tab
        setTimeout(() => this.handleTabChange(), 100)
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
        this.tabInfo = await this.messageHandler.getCurrentTab()
        this.storageManager.setTabInfo(this.tabInfo)
        this.cookieManager.setTabInfo(this.tabInfo)
        this.dashboardManager.setTabInfo(this.tabInfo)
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

  handleTabLoading() {
    // When a tab starts loading, show loading states in content areas
    console.log('Tab started loading, showing loading states')

    if (this.currentTab === TABS.STORAGE) {
      const container = document.getElementById('storageItems')
      if (container) {
        container.innerHTML = '<div class="loading">Page loading...</div>'
      }
    } else if (this.currentTab === TABS.DASHBOARD) {
      const container = document.getElementById('pinnedProperties')
      if (container && !container.innerHTML.includes('No properties pinned')) {
        container.innerHTML = '<div class="loading">Page loading...</div>'
      }
    }
  }

  async refreshCurrentTabData () {
    // Cookies can load immediately (background script)
    if (this.currentTab === TABS.COOKIES) {
      this.cookieManager.loadCookies()
      return
    }

    // Storage and Dashboard need content script readiness
    if (this.currentTab === TABS.STORAGE || this.currentTab === TABS.DASHBOARD) {
      await this.waitForContentScriptReadiness()

      if (this.currentTab === TABS.DASHBOARD) {
        this.dashboardManager.refreshDashboard()
      } else if (this.currentTab === TABS.STORAGE) {
        this.storageManager.loadStorageDataSmart()
      }
    }
  }

  async waitForContentScriptReadiness(maxWaitTime = 2000) {
    const startTime = Date.now()
    const checkInterval = 200

    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Check if we have a tab and it supports content scripts
        if (!this.tabInfo || !this.messageHandler.isContentScriptSupported(this.tabInfo.url)) {
          console.log('Tab does not support content scripts, skipping readiness check')
          return
        }

        // Try a simple ping to the content script
        const response = await this.messageHandler.sendMessage('ping', {}, 1) // Only 1 retry
        if (response && response.success) {
          console.log(`Content script ready after ${Date.now() - startTime}ms`)
          return
        }
      } catch (error) {
        // Continue trying
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, checkInterval))
    }

    console.log(`Content script readiness check timed out after ${maxWaitTime}ms`)
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
      this.dashboardManager.filterConfigProperties(e.target.value)
    })

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
        e.target.classList.add('active')
        this.dashboardManager.filterPropertiesByType(e.target.dataset.filter)
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
      this.dashboardManager.loadAvailablePropertiesNew(),
      this.dashboardManager.loadPinnedProperties()
    ])
  }


  showAbout () {
    const aboutContent = `
      <div class="about-modal">
        <div class="about-header">
          <h2>🔍 1nsp3ct0rG4dg3t</h2>
          <p class="about-subtitle">helps you view, pin, and explore storage values and cookies at a glance</p>
        </div>

        <div class="about-section">
          <h3>📊 Features</h3>
          <ul class="about-features">
            <li><strong>Dashboard:</strong> Pin important values for quick access</li>
            <li><strong>Storage:</strong> View and edit localStorage & sessionStorage</li>
            <li><strong>Cookies:</strong> Manage cookies with security insights</li>
            <li><strong>Search:</strong> Find any storage item across all types</li>
            <li><strong>JSON Viewer:</strong> Pretty-print and explore JSON data</li>
          </ul>
        </div>

        <div class="about-section">
          <h3>👨‍💻 Created By</h3>
          <p><strong>João Vaz</strong></p>
          <p class="about-note">Links available in the footer below.</p>
        </div>
      </div>
    `
    this.modalManager.showModal('About - 1nsp3ct0rG4dg3t', aboutContent, null, {
      hideConfirm: true,
      cancelText: 'Close'
    })
  }

  updateStatusBar () {
    const statusElement = document.getElementById('pageUrl')
    if (this.tabInfo) {
      statusElement.textContent = this.tabInfo.url || 'Unknown URL'
    }
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




  async ensureTabInfo () {
    console.log('ensureTabInfo: Current tabInfo:', this.tabInfo)
    if (!this.tabInfo) {
      console.log('ensureTabInfo: Getting current tab...')
      this.tabInfo = await this.messageHandler.getCurrentTab()
    this.storageManager.setTabInfo(this.tabInfo)
    this.cookieManager.setTabInfo(this.tabInfo)
    this.dashboardManager.setTabInfo(this.tabInfo)
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



  async clearAllPinnedProperties () {
    if (confirm('Are you sure you want to remove all pinned properties?')) {
      // Clear from Chrome storage
      await chrome.storage.local.set({ pinnedProperties: [] })
      // Refresh dashboard manager
      await this.dashboardManager.loadPinnedProperties()
      // Refresh main dashboard
      this.dashboardManager.loadDashboardProperties()
      showToast('All properties unpinned')
    }
  }



  async updateDashboardIfNeeded (storageType, key) {
    try {
      // Check if this storage item is pinned
      const result = await chrome.storage.local.get(['pinnedProperties'])
      const pinnedProperties = result.pinnedProperties || []

      const currentTab = await this.messageHandler.getCurrentTab()
      const currentDomain = getDomainFromTab(currentTab)

      const isPinned = pinnedProperties.some(prop =>
        prop.type === storageType &&
        prop.key === key &&
        prop.domain === currentDomain
      )

      // If pinned and we're on dashboard tab, refresh it
      if (isPinned && this.currentTab === 'dashboard') {
        setTimeout(() => this.dashboardManager.loadDashboardProperties(), 100)
      }
    } catch (error) {
      console.error('Error updating dashboard:', error)
    }
  }



  async loadAvailableProperties () {
    try {
      console.log('Loading available properties...')

      // First try to use cached data
      let storageData = this.storageData
      let cookieData = this.cookieManager.getCookieData()

      // If no cached data, try to load from current tab
      if (!storageData && !cookieData) {
        console.log('No cached data, loading from Storage/Cookies tabs...')
        // Use smart loading for storage data (non-blocking)
        this.storageManager.loadStorageDataSmart()
        await this.cookieManager.loadCookies()
        storageData = this.storageData
        cookieData = this.cookieManager.getCookieData()
      }

      // If still no data, try direct message to content script
      if (!storageData || !cookieData) {
        console.log('Loading directly from content script...')
        const results = await Promise.all([
          this.messageHandler.sendMessage('getStorage'),
          this.messageHandler.sendMessage('getCookies')
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
            <div class="property-item" data-type="localStorage" data-key="${escapeHtml(key)}">
              <span class="property-key">${escapeHtml(key)}</span>
              <button class="btn-pin" data-type="localStorage" data-key="${escapeHtml(key)}">Pin</button>
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
            <div class="property-item" data-type="sessionStorage" data-key="${escapeHtml(key)}">
              <span class="property-key">${escapeHtml(key)}</span>
              <button class="btn-pin" data-type="sessionStorage" data-key="${escapeHtml(key)}">Pin</button>
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
            <div class="property-item" data-type="cookie" data-key="${escapeHtml(cookie.name)}">
              <span class="property-key">${escapeHtml(cookie.name)}</span>
              <button class="btn-pin" data-type="cookie" data-key="${escapeHtml(cookie.name)}">Pin</button>
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
          this.dashboardManager.pinProperty(type, key)
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
            <span class="pinned-key">${escapeHtml(item.key)}${domainDisplay}</span>
            <button class="btn-unpin" data-index="${index}">Unpin</button>
          </div>
        `
      })

      container.innerHTML = html

      // Add event listeners for unpin buttons
      container.querySelectorAll('.btn-unpin').forEach(button => {
        button.addEventListener('click', () => {
          const index = parseInt(button.dataset.index)
          this.dashboardManager.unpinProperty(index)
        })
      })
    } catch (error) {
      console.error('Error loading pinned properties:', error)
    }
  }




  async saveDashboardConfiguration () {
    this.modalManager.hideModal()
    this.dashboardManager.loadDashboardProperties()
  }
  
  async loadDashboardWithData () {
    // Show loading state
    const container = document.getElementById('pinnedProperties')
    container.innerHTML = '<div class="loading">Loading dashboard data...</div>'

    // Load data independently with timeout protection
    const loadPromises = []

    if (!this.storageData?.localStorage) {
      loadPromises.push(this.storageManager.loadStorageDataByType(STORAGE_TYPES.LOCAL))
    }

    if (!this.storageData?.sessionStorage) {
      loadPromises.push(this.storageManager.loadStorageDataByType(STORAGE_TYPES.SESSION))
    }

    if (!this.cookieManager.getCookieData()) {
      loadPromises.push(this.cookieManager.loadCookies())
    }

    // Wait for all data to load with error handling and timeout
    if (loadPromises.length > 0) {
      try {
        // Add timeout to prevent infinite waiting
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Dashboard loading timeout')), 5000)
        )

        const results = await Promise.race([
          Promise.allSettled(loadPromises),
          timeoutPromise
        ])

        // Process results if we got them (not timeout)
        if (Array.isArray(results)) {
          const successful = results.filter(r => r.status === 'fulfilled').length
          const failed = results.length - successful

          if (failed > 0) {
            console.log(`Dashboard loaded with ${successful}/${results.length} data sources`)
          }
        }
      } catch (error) {
        console.log('Dashboard loading encountered issues:', error.message)
        // Continue with whatever data we have
      }
    }

    // Load dashboard with available data (gracefully handle missing data)
    this.dashboardManager.loadDashboardProperties()
  }


  renderOrganizedProperties (organizedProperties, storageData, cookieData) {
    let html = ''
    let currentGroup = null

    for (const item of organizedProperties) {
      // Add group header if needed
      const groupName = this.getGroupName(item, this.organizationMode)
      if (groupName !== currentGroup && this.organizationMode !== ORGANIZATION_MODES.DEFAULT) {
        currentGroup = groupName
        html += `<div class="group-header">${groupName}</div>`
      }

      let value = 'Not found'
      let found = false

      console.log(`Looking for ${item.type}.${item.key}`)

      if (item.type === STORAGE_TYPES.LOCAL && storageData.localStorage) {
        value = storageData.localStorage[item.key]
        found = value !== undefined
        console.log(`localStorage[${item.key}] = ${value}, found: ${found}`)
      } else if (item.type === STORAGE_TYPES.SESSION && storageData.sessionStorage) {
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
             data-property-key="${escapeHtml(item.key)}"
             data-property-domain="${escapeHtml(item.domain || '')}">
          ${isDraggable ? '<div class="drag-handle">⋮⋮</div>' : ''}
          <div class="property-header">
            <span class="property-label">${escapeHtml(item.alias || item.key)}</span>
            <div class="property-meta">
              <span class="property-source">${this.getTypeDisplayName(item.type)}</span>
              ${item.domain ? `<span class="property-domain">${item.domain}</span>` : ''}
            </div>
          </div>
          <div class="property-value">${escapeHtml(this.formatValue(value))}</div>
        </div>
      `
    }

    return html
  }

  getGroupName (item, organizationMode) {
    switch (organizationMode) {
      case ORGANIZATION_MODES.TYPE:
        return this.getTypeDisplayName(item.type)
      case ORGANIZATION_MODES.DOMAIN:
        return item.domain || 'Unknown Domain'
      case ORGANIZATION_MODES.ALPHABETICAL:
        const firstLetter = (item.alias || item.key).charAt(0).toUpperCase()
        return firstLetter.match(/[A-Z]/) ? firstLetter : '#'
      default:
        return null
    }
  }



  async changeOrganizationMode (mode) {
    this.organizationMode = mode
    this.dashboardManager.setOrganizationMode(mode)
    await this.saveSettings()

    // Update the UI
    document.getElementById('organizationMode').value = mode

    // Reload dashboard with new organization
    await this.dashboardManager.loadDashboardProperties()
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