// Dashboard Manager Component for 1nsp3ct0rG4dg3t Extension

import { showToast, escapeHtml } from '../utils/ui-helpers.js'
import { TABS, STORAGE_TYPES, TOAST_TYPES, ORGANIZATION_MODES } from '../utils/constants.js'
import { getDomainFromTab } from '../utils/url-helpers.js'
import { JsonViewerModal } from './json-viewer-modal.js'

export class DashboardManager {
  constructor(messageHandler, modalManager, storageManager, cookieManager, inspector) {
    this.messageHandler = messageHandler
    this.modalManager = modalManager
    this.storageManager = storageManager
    this.cookieManager = cookieManager
    this.inspector = inspector
    this.pinnedProperties = []
    this.organizationMode = ORGANIZATION_MODES.DEFAULT
    this.draggedElement = null // For drag and drop functionality
    this.tabInfo = null
    this.jsonViewerModal = new JsonViewerModal(modalManager)
    this.jsonValues = [] // Store JSON values to avoid HTML escaping issues
  }

  setTabInfo(tabInfo) {
    this.tabInfo = tabInfo
  }

  isValidJSON(value) {
    try {
      const parsed = JSON.parse(value)
      // Consider objects and arrays as valid JSON for the viewer
      // Also include complex nested structures that would benefit from pretty viewing
      return (typeof parsed === 'object' && parsed !== null) ||
             (typeof value === 'string' && value.length > 20 && (value.startsWith('{') || value.startsWith('[')))
    } catch {
      return false
    }
  }

  async loadDashboardProperties() {
    try {
      // Clear JSON values array for fresh rendering
      this.jsonValues = []

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
      const currentTab = await this.messageHandler.getCurrentTab()
      const currentDomain = getDomainFromTab(currentTab)

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
      console.log('Available cached cookie data:', this.cookieManager.getCookieData())

      // Construct unified data structure from StorageManager and cached data with fallbacks
      const storageManagerData = this.storageManager.getStorageData()
      const storageData = {
        localStorage: storageManagerData?.localStorage || {},
        sessionStorage: storageManagerData?.sessionStorage || {}
      }

      const cookieData = { cookies: this.cookieManager.getCookieData() || [] }

      console.log('Final storage data:', storageData)
      console.log('Final cookie data:', cookieData)

      // Apply organization mode
      const organizedProperties = this.organizeProperties(relevantProperties)

      // Render all properties with enhanced grid layout
      let html = '<div class="enhanced-dashboard-grid">'
      organizedProperties.forEach((property, index) => {
        html += this.renderDashboardProperty(property, index, storageData, cookieData)
      })
      html += '</div>'

      container.innerHTML = html

      console.log('JSON values stored:', this.jsonValues.length)

      // Add event listeners for unpin buttons
      container.querySelectorAll('.btn-unpin').forEach(button => {
        button.addEventListener('click', () => {
          const index = parseInt(button.dataset.index)
          this.unpinProperty(index)
        })
      })

      // Add event listeners for copy buttons
      container.querySelectorAll('.btn-copy').forEach(button => {
        button.addEventListener('click', async (e) => {
          const value = button.dataset.value
          try {
            await navigator.clipboard.writeText(value)
            // Visual feedback
            const originalIcon = button.textContent
            button.textContent = '✅'
            button.style.color = 'var(--success-color)'
            setTimeout(() => {
              button.textContent = originalIcon
              button.style.color = ''
            }, 1000)
          } catch (error) {
            console.error('Failed to copy to clipboard:', error)
            // Fallback visual feedback
            const originalIcon = button.textContent
            button.textContent = '❌'
            button.style.color = 'var(--danger-color)'
            setTimeout(() => {
              button.textContent = originalIcon
              button.style.color = ''
            }, 1000)
          }
        })
      })

      // Add event listeners for JSON viewer buttons
      const jsonButtons = container.querySelectorAll('.btn-view-json')
      console.log('Found JSON viewer buttons:', jsonButtons.length)

      jsonButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          const key = button.dataset.key
          const jsonIndex = parseInt(button.dataset.jsonIndex)

          console.log('JSON button clicked:', { key, jsonIndex })

          if (jsonIndex >= 0 && jsonIndex < this.jsonValues.length) {
            const jsonValue = this.jsonValues[jsonIndex]
            console.log('Showing JSON viewer for:', key, 'with value length:', jsonValue?.length)
            this.jsonViewerModal.showJsonViewer(key, jsonValue)
          } else {
            console.error('Invalid JSON index:', jsonIndex, 'Available values:', this.jsonValues.length)
          }
        })
      })

      // Set up drag & drop if in custom mode
      this.setupDragAndDrop()
    } catch (error) {
      console.error('Error loading dashboard properties:', error)
    }
  }

  organizeProperties(properties) {
    switch (this.organizationMode) {
      case ORGANIZATION_MODES.TYPE:
        return [...properties].sort((a, b) => a.type.localeCompare(b.type))
      case ORGANIZATION_MODES.DOMAIN:
        return [...properties].sort((a, b) => (a.domain || '').localeCompare(b.domain || ''))
      case ORGANIZATION_MODES.ALPHABETICAL:
        return [...properties].sort((a, b) => a.key.localeCompare(b.key))
      case ORGANIZATION_MODES.CUSTOM:
        // Future: implement drag-and-drop ordering
        return properties
      default:
        return properties
    }
  }

  renderDashboardProperty(property, index, storageData, cookieData) {
    const { type, key, alias, domain } = property
    let value = 'undefined'
    let displayClass = 'property-undefined'
    let found = false

    try {
      if (type === 'cookie') {
        const cookie = cookieData.cookies?.find(c => c.name === key)
        if (cookie) {
          value = cookie.value || ''
          displayClass = 'property-found'
          found = true
        }
      } else if (type === STORAGE_TYPES.LOCAL || type === STORAGE_TYPES.SESSION) {
        const storage = storageData[type]
        if (storage && storage.hasOwnProperty(key)) {
          value = storage[key]
          displayClass = 'property-found'
          found = true

          // Format the value for display
          if (typeof value === 'object') {
            value = JSON.stringify(value, null, 2)
          } else {
            value = String(value)
          }
        }
      }
    } catch (error) {
      console.error('Error getting property value:', error)
      value = 'error'
      displayClass = 'property-error'
    }

    // Truncate long values for display but keep original for copy functionality
    let displayValue = value
    const isLongValue = displayValue.length > 150
    if (isLongValue) {
      displayValue = displayValue.substring(0, 150) + '...'
    }

    // Check if the value is valid JSON
    const isJSON = typeof value === 'string' && this.isValidJSON(value)
    let jsonIndex = -1

    // Store JSON value in array to avoid HTML escaping issues
    if (isJSON) {
      jsonIndex = this.jsonValues.length
      this.jsonValues.push(value)
      console.log('JSON detected for property:', key, 'stored at index:', jsonIndex)
    }

    // Determine the type display name
    const typeDisplayName = type === 'localStorage' ? 'Local Storage' :
                           type === 'sessionStorage' ? 'Session Storage' :
                           type === 'cookie' ? 'Cookie' : type

    // Check if we're in custom mode for drag & drop
    const isCustomMode = this.organizationMode === ORGANIZATION_MODES.CUSTOM
    const draggableAttribute = isCustomMode ? 'draggable="true"' : ''

    return `
      <div class="enhanced-pinned-property ${found ? '' : 'not-found'}"
           ${draggableAttribute}
           data-property-index="${index}"
           data-property-type="${type}"
           data-property-key="${escapeHtml(key)}"
           data-property-domain="${escapeHtml(domain || '')}">
        ${isCustomMode ? '<div class="drag-handle" title="Drag to reorder">⋮⋮</div>' : ''}
        <div class="unified-item-header">
          <div class="unified-item-name" title="${escapeHtml(alias || key)}">
            ${escapeHtml(alias || key)}
          </div>
          <div class="unified-item-actions">
            ${isJSON ? `<button class="unified-btn-icon btn-view-json" data-index="${index}" data-json-index="${jsonIndex}" data-key="${escapeHtml(key)}" title="View JSON">🔍</button>` : ''}
            <button class="unified-btn-icon btn-copy" data-index="${index}" title="Copy value" data-value="${escapeHtml(value)}">📋</button>
            <button class="unified-btn-icon btn-unpin" data-index="${index}" title="Unpin property">📌</button>
          </div>
        </div>

        ${value && value !== 'undefined' ? `<div class="unified-item-value">${escapeHtml(displayValue)}</div>` : ''}

        <div class="unified-item-metadata">
          <span class="unified-metadata-tag type-${type}">${typeDisplayName}</span>
          ${domain ? `<span class="unified-metadata-tag">${escapeHtml(domain)}</span>` : ''}
          ${isJSON ? `<span class="unified-metadata-tag" style="color: var(--primary-color);">JSON</span>` : ''}
          ${isLongValue ? `<span class="unified-metadata-tag">${value.length} chars</span>` : ''}
          ${!found ? `<span class="unified-metadata-tag" style="color: var(--danger-color);">Not found</span>` : ''}
        </div>
      </div>
    `
  }

  async pinProperty(type, key) {
    try {
      const result = await chrome.storage.local.get(['pinnedProperties'])
      const pinnedProperties = result.pinnedProperties || []

      // Check if already pinned for this domain
      const currentTab = await this.messageHandler.getCurrentTab()
      const domain = getDomainFromTab(currentTab)

      const exists = pinnedProperties.some(item =>
        item.type === type &&
        item.key === key &&
        item.domain === domain
      )
      if (exists) {
        console.log('Property already pinned for this domain:', type, key, domain)
        return
      }

      console.log('✅ Pinning new property:', type, key, domain)

      // Add to pinned properties with tab/domain information
      const newPin = {
        type,
        key,
        alias: key,
        domain: domain,
        url: currentTab?.url || '',
        tabId: currentTab?.id || null
      }

      console.log('📌 Adding to storage:', newPin)
      pinnedProperties.push(newPin)
      await chrome.storage.local.set({ pinnedProperties })

      // Provide immediate feedback
      showToast(`${key} pinned to dashboard`, TOAST_TYPES.SUCCESS)

      // Refresh the displays and update states
      await Promise.all([
        this.loadPinnedProperties(),
        this.loadDashboardProperties()
      ])

      // Update pin button states immediately
      await this.updatePinButtonStates()

      console.log('Property pinned successfully:', type, key, domain)
    } catch (error) {
      console.error('Error pinning property:', error)
      showToast(`Failed to pin ${key}`, TOAST_TYPES.ERROR)
    }
  }

  async unpinProperty(index) {
    try {
      const result = await chrome.storage.local.get(['pinnedProperties'])
      const pinnedProperties = result.pinnedProperties || []

      if (index >= 0 && index < pinnedProperties.length) {
        pinnedProperties.splice(index, 1)
        await chrome.storage.local.set({ pinnedProperties })

        // Refresh the displays
        this.loadPinnedProperties()
        this.loadDashboardProperties()
        // Update pin button states
        this.updatePinButtonStates()
      }
    } catch (error) {
      console.error('Error unpinning property:', error)
    }
  }

  async unpinPropertyByKey(type, key) {
    try {
      const result = await chrome.storage.local.get(['pinnedProperties'])
      const pinnedProperties = result.pinnedProperties || []

      const currentTab = await this.messageHandler.getCurrentTab()
      const currentDomain = getDomainFromTab(currentTab)

      console.log('Attempting to unpin:', { type, key, currentDomain, totalPinned: pinnedProperties.length })

      // Find the index of the property to unpin (matching type, key, and domain)
      const index = pinnedProperties.findIndex(item =>
        item.type === type &&
        item.key === key &&
        item.domain === currentDomain
      )

      if (index >= 0) {
        const removed = pinnedProperties.splice(index, 1)
        await chrome.storage.local.set({ pinnedProperties })

        // Provide immediate feedback
        showToast(`${key} unpinned from dashboard`, TOAST_TYPES.SUCCESS)

        // Refresh the displays and update states
        await Promise.all([
          this.loadPinnedProperties(),
          this.loadDashboardProperties()
        ])

        // Update pin button states immediately
        await this.updatePinButtonStates()

        console.log('Property unpinned successfully:', removed[0])
      } else {
        console.warn('Property not found for unpinning:', {
          type,
          key,
          currentDomain,
          availableProperties: pinnedProperties.map(p => ({ type: p.type, key: p.key, domain: p.domain }))
        })
        showToast(`${key} not found in pinned items`, TOAST_TYPES.WARNING)
      }
    } catch (error) {
      console.error('Error unpinning property by key:', error)
      showToast(`Failed to unpin ${key}`, TOAST_TYPES.ERROR)
    }
  }

  async refreshDashboard() {
    console.log('Refreshing dashboard data...')

    // Show loading state immediately
    const container = document.getElementById('pinnedProperties')
    container.innerHTML = '<div class="loading">Refreshing dashboard...</div>'

    try {
      // Refresh cookies first (always works - background script)
      const cookiePromise = this.cookieManager.loadCookies()

      // For storage, we need to handle content script dependency
      const storagePromises = []

      if (this.tabInfo && this.messageHandler.isContentScriptSupported &&
          this.messageHandler.isContentScriptSupported(this.tabInfo.url)) {

        // Only attempt storage loading if content scripts are supported
        if (this.storageManager.loadStorageDataByType) {
          console.log('Loading storage data for dashboard...')

          // Load with timeout to prevent hanging
          const loadStorageWithTimeout = (type) => {
            return Promise.race([
              this.storageManager.loadStorageDataByType(type),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`${type} loading timeout`)), 5000)
              )
            ])
          }

          storagePromises.push(
            loadStorageWithTimeout(STORAGE_TYPES.LOCAL).catch(err => {
              console.warn('Local storage loading failed for dashboard:', err.message)
              return null
            }),
            loadStorageWithTimeout(STORAGE_TYPES.SESSION).catch(err => {
              console.warn('Session storage loading failed for dashboard:', err.message)
              return null
            })
          )
        }
      } else {
        console.log('Content scripts not supported, skipping storage data for dashboard')
      }

      // Wait for all promises (cookies + storage)
      await Promise.allSettled([cookiePromise, ...storagePromises])
      console.log('Dashboard data refresh completed')

      // Reload dashboard with available data
      this.loadDashboardProperties()

    } catch (error) {
      console.error('Error refreshing dashboard:', error)
      container.innerHTML = '<div class="empty-state"><p>Error refreshing dashboard data</p><button class="btn btn-primary" onclick="this.closest(\'.dashboard-container\').querySelector(\'#refreshDashboard\').click()">Retry</button></div>'
    }
  }

  setOrganizationMode(mode) {
    this.organizationMode = mode
  }

  getOrganizationMode() {
    return this.organizationMode
  }

  async loadPinnedProperties() {
    try {
      const result = await chrome.storage.local.get(['pinnedProperties'])
      this.pinnedProperties = result.pinnedProperties || []

      console.log('📥 Loaded pinned properties from storage:', this.pinnedProperties.length, 'items')
      this.pinnedProperties.forEach((item, index) => {
        console.log(`  ${index}: ${item.type}:${item.key}@${item.domain}`)
      })

      // Update UI if needed (for config interface)
      const container = document.getElementById('pinnedPropertiesList')
      if (container) {
        // Use the new card-based rendering for configuration interface
        this.renderPinnedPropertiesAsCards(container)
      }
    } catch (error) {
      console.error('Error loading pinned properties:', error)
    }
  }



  renderPinnedPropertiesAsCards(container) {
    if (this.pinnedProperties.length === 0) {
      container.innerHTML = `
        <div class="config-empty-state">
          <h4>No pinned properties</h4>
          <p>Pin properties from the available list to see them here</p>
        </div>
      `
      return
    }

    let html = ''
    this.pinnedProperties.forEach((item, index) => {
      html += `
        <div class="property-card" data-index="${index}">
          <div class="property-info">
            <div class="property-name">${escapeHtml(item.alias || item.key)}</div>
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
        this.unpinProperty(parseInt(btn.dataset.index))
      })
    })
  }

  getTypeDisplayName(type) {
    switch (type) {
      case STORAGE_TYPES.LOCAL:
        return 'Local Storage'
      case STORAGE_TYPES.SESSION:
        return 'Session Storage'
      case 'cookie':
        return 'Cookies'
      default:
        return type
    }
  }

  async updatePinButtonStates() {
    try {
      const result = await chrome.storage.local.get(['pinnedProperties'])
      const pinnedProperties = result.pinnedProperties || []

      const currentTab = await this.messageHandler.getCurrentTab()
      const currentDomain = getDomainFromTab(currentTab)

      console.log('Updating pin button states:', {
        currentDomain,
        totalPinned: pinnedProperties.length,
        pinnedForDomain: pinnedProperties.filter(p => p.domain === currentDomain).length
      })

      let storageButtonsUpdated = 0
      let cookieButtonsUpdated = 0

      // Update storage item pin buttons
      document.querySelectorAll('.storage-item').forEach(item => {
        const key = item.dataset.key
        const storageType = this.storageManager.getCurrentStorage() || STORAGE_TYPES.LOCAL
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
          storageButtonsUpdated++
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
          cookieButtonsUpdated++
        }
      })

      console.log('Pin button states updated:', {
        storageButtonsUpdated,
        cookieButtonsUpdated,
        currentStorageType: this.storageManager.getCurrentStorage()
      })

    } catch (error) {
      console.error('Error updating pin button states:', error)
    }
  }

  getCurrentDomain() {
    if (this.inspector && this.inspector.tabInfo) {
      return getDomainFromTab(this.inspector.tabInfo)
    }
    return 'unknown'
  }

  truncateValue(value, maxLength) {
    const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
    return strValue.length > maxLength ? strValue.substring(0, maxLength) + '...' : strValue
  }

  async loadAvailablePropertiesNew() {
    try {
      const container = document.getElementById('availablePropertiesList')
      container.innerHTML = '<div class="loading">Loading properties...</div>'

      // Get cached data from StorageManager and CookieManager
      const storageManagerData = this.storageManager.getStorageData()
      const storageData = {
        localStorage: storageManagerData?.localStorage || {},
        sessionStorage: storageManagerData?.sessionStorage || {}
      }

      let cookieData = this.cookieManager.getCookieData()

      // If no data is available, try to load fresh data
      if (Object.keys(storageData.localStorage).length === 0 &&
          Object.keys(storageData.sessionStorage).length === 0 &&
          (!cookieData || cookieData.length === 0)) {

        // Load storage data (non-blocking)
        if (this.storageManager.loadStorageDataSmart) {
          this.storageManager.loadStorageDataSmart()
        }

        // Load cookies
        await this.cookieManager.loadCookies()

        // Get fresh data
        const freshStorageData = this.storageManager.getStorageData()
        storageData.localStorage = freshStorageData?.localStorage || {}
        storageData.sessionStorage = freshStorageData?.sessionStorage || {}
        cookieData = this.cookieManager.getCookieData()
      }

      // Build property cards with modern design
      let html = ''
      const allProperties = []

      // Add localStorage properties
      if (storageData?.localStorage) {
        Object.entries(storageData.localStorage).forEach(([key, value]) => {
          allProperties.push({
            type: STORAGE_TYPES.LOCAL,
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
            type: STORAGE_TYPES.SESSION,
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
            <div class="property-card" data-type="${prop.type}" data-key="${escapeHtml(prop.key)}">
              <div class="property-info">
                <div class="property-name">${escapeHtml(prop.key)}</div>
                <div class="property-details">
                  <span class="property-type ${prop.type}">${this.getTypeDisplayName(prop.type)}</span>
                  <span class="property-domain">${prop.domain}</span>
                  <span class="property-value-preview">${escapeHtml(valuePreview)}</span>
                </div>
              </div>
              <div class="property-actions">
                <button class="pin-btn" data-type="${prop.type}" data-key="${escapeHtml(prop.key)}">Pin</button>
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
          this.pinProperty(btn.dataset.type, btn.dataset.key)
        })
      })

    } catch (error) {
      console.error('Error loading available properties:', error)
      document.getElementById('availablePropertiesList').innerHTML =
        '<div class="config-empty-state"><h4>Error</h4><p>Failed to load properties</p></div>'
    }
  }

  setupDragAndDrop() {
    // Only set up drag & drop in custom mode
    if (this.organizationMode !== ORGANIZATION_MODES.CUSTOM) {
      return
    }

    const draggableItems = document.querySelectorAll('.enhanced-pinned-property[draggable="true"]')

    draggableItems.forEach(item => {
      item.addEventListener('dragstart', this.handleDragStart.bind(this))
      item.addEventListener('dragend', this.handleDragEnd.bind(this))
      item.addEventListener('dragover', this.handleDragOver.bind(this))
      item.addEventListener('drop', this.handleDrop.bind(this))
      item.addEventListener('dragenter', this.handleDragEnter.bind(this))
      item.addEventListener('dragleave', this.handleDragLeave.bind(this))
    })

    console.log(`Drag & Drop initialized for ${draggableItems.length} items`)
  }

  handleDragStart(e) {
    // Find the draggable container (enhanced-pinned-property)
    const draggableElement = e.target.closest('.enhanced-pinned-property[draggable="true"]')
    if (!draggableElement) return

    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', draggableElement.outerHTML)
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: draggableElement.dataset.propertyType,
      key: draggableElement.dataset.propertyKey,
      domain: draggableElement.dataset.propertyDomain
    }))

    draggableElement.classList.add('dragging')
    this.draggedElement = draggableElement

    // Change cursor to grabbing for better UX
    document.body.style.cursor = 'grabbing'
  }

  handleDragEnd(e) {
    // Find the draggable container
    const draggableElement = e.target.closest('.enhanced-pinned-property[draggable="true"]') || this.draggedElement
    if (draggableElement) {
      draggableElement.classList.remove('dragging')
    }
    this.draggedElement = null

    // Reset cursor
    document.body.style.cursor = ''

    // Remove all drag visual indicators
    document.querySelectorAll('.enhanced-pinned-property').forEach(item => {
      item.classList.remove('drag-over')
    })
  }

  handleDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault()
    }
    e.dataTransfer.dropEffect = 'move'
    return false
  }

  handleDragEnter(e) {
    const targetElement = e.target.closest('.enhanced-pinned-property[draggable="true"]')
    if (targetElement && targetElement !== this.draggedElement) {
      targetElement.classList.add('drag-over')
    }
  }

  handleDragLeave(e) {
    const targetElement = e.target.closest('.enhanced-pinned-property[draggable="true"]')
    if (targetElement) {
      targetElement.classList.remove('drag-over')
    }
  }

  async handleDrop(e) {
    if (e.stopPropagation) {
      e.stopPropagation()
    }

    const targetElement = e.target.closest('.enhanced-pinned-property[draggable="true"]')
    if (targetElement) {
      targetElement.classList.remove('drag-over')
    }

    if (this.draggedElement && targetElement && this.draggedElement !== targetElement) {
      await this.reorderProperties(this.draggedElement, targetElement)
    }

    return false
  }

  async reorderProperties(draggedElement, targetElement) {
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

        // Update chrome storage
        await chrome.storage.local.set({ pinnedProperties })

        // Update the instance variable - delegate to inspector if available
        if (this.inspector && this.inspector.pinnedProperties) {
          this.inspector.pinnedProperties = pinnedProperties
          if (this.inspector.saveSettings) {
            await this.inspector.saveSettings()
          }
        }

        // Reload the dashboard
        await this.loadDashboardProperties()
      }
    } catch (error) {
      console.error('Error reordering properties:', error)
    }
  }

  filterConfigProperties(query) {
    if (!this.allAvailableProperties) return

    const cards = document.querySelectorAll('#availablePropertiesList .property-card')
    cards.forEach(card => {
      const key = card.dataset.key.toLowerCase()
      const type = card.dataset.type.toLowerCase()
      const matches = key.includes(query.toLowerCase()) || type.includes(query.toLowerCase())
      card.style.display = matches ? 'flex' : 'none'
    })
  }

  filterPropertiesByType(filter) {
    if (!this.allAvailableProperties) return

    const cards = document.querySelectorAll('#availablePropertiesList .property-card')
    cards.forEach(card => {
      const type = card.dataset.type
      const shouldShow = filter === 'all' || type === filter
      card.style.display = shouldShow ? 'flex' : 'none'
    })
  }

  getPinnedProperties() {
    return this.pinnedProperties
  }

  normalizeDomain(domain) {
    console.log(`🔧 normalizeDomain called with: "${domain}" (type: ${typeof domain})`)

    if (!domain || typeof domain !== 'string') {
      console.log(`🔧 returning empty string (invalid input)`)
      return ''
    }

    let normalized = domain.toLowerCase().trim()
    console.log(`🔧 after toLowerCase/trim: "${normalized}"`)

    // Handle cookie domain patterns
    // Remove leading dot for comparison (cookies can have .example.com)
    if (normalized.startsWith('.')) {
      console.log(`🔧 removing leading dot from: "${normalized}"`)
      normalized = normalized.substring(1)
      console.log(`🔧 after removing dot: "${normalized}"`)
    } else {
      console.log(`🔧 no leading dot to remove`)
    }

    console.log(`🔧 final normalized result: "${normalized}"`)
    return normalized
  }

  isAlreadyPinned(type, key, domain) {
    if (!this.pinnedProperties) {
      console.log('❌ No pinnedProperties array available')
      return false
    }

    console.log(`🔍 Checking if pinned: ${type}:${key}@${domain}`)
    console.log(`📋 Total pinned properties: ${this.pinnedProperties.length}`)

    // Detailed domain analysis for search domain
    console.log('🔎 Search domain analysis:')
    console.log('  Value:', JSON.stringify(domain))
    console.log('  Length:', domain.length)
    console.log('  Char codes:', Array.from(domain).map(c => c.charCodeAt(0)))

    // Log all pinned properties for comparison
    this.pinnedProperties.forEach((item, index) => {
      const typeMatch = item.type === type
      const keyMatch = item.key === key
      const domainMatch = item.domain === domain
      console.log(`  ${index}: ${item.type}:${item.key}@${item.domain}`)
      console.log(`     Type match: ${typeMatch}, Key match: ${keyMatch}, Domain match: ${domainMatch}`)

      // Detailed analysis for matching type+key items
      if (typeMatch && keyMatch) {
        console.log(`📌 Stored domain analysis (item ${index}):`)
        console.log('    Value:', JSON.stringify(item.domain))
        console.log('    Length:', item.domain.length)
        console.log('    Char codes:', Array.from(item.domain).map(c => c.charCodeAt(0)))
        console.log('    Strict equality:', domain === item.domain)
        console.log('    Trimmed equality:', domain.trim() === item.domain.trim())
        console.log('    Lowercase equality:', domain.toLowerCase() === item.domain.toLowerCase())
      }
    })

    // Direct domain comparison with inline normalization
    console.log(`🔄 Using direct domain normalization approach`)

    const result = this.pinnedProperties.some(item => {
      const typeMatch = item.type === type
      const keyMatch = item.key === key

      // Enhanced domain normalization for comparison
      let searchDomain = domain.toLowerCase().trim()
      let storedDomain = item.domain.toLowerCase().trim()

      console.log(`🔄 Before normalization: search="${searchDomain}", stored="${storedDomain}"`)

      // Remove leading dots for comparison
      const searchHadDot = searchDomain.startsWith('.')
      const storedHadDot = storedDomain.startsWith('.')

      if (searchHadDot) {
        searchDomain = searchDomain.substring(1)
        console.log(`🔄 Removed leading dot from search: "${searchDomain}"`)
      }
      if (storedHadDot) {
        storedDomain = storedDomain.substring(1)
        console.log(`🔄 Removed leading dot from stored: "${storedDomain}"`)
      }

      // Cookie domain matching logic:
      // 1. Exact match
      // 2. If search domain had leading dot, it's a parent domain - check if stored is subdomain
      // 3. If stored domain had leading dot, it's a parent domain - check if search is subdomain
      let domainMatch = searchDomain === storedDomain

      if (!domainMatch && searchHadDot && !storedHadDot) {
        // Search is parent domain (.example.com), stored is specific (sub.example.com)
        domainMatch = storedDomain.endsWith('.' + searchDomain) || storedDomain === searchDomain
        if (domainMatch) {
          console.log(`🔄 Parent domain match: "${searchDomain}" matches subdomain "${storedDomain}"`)
        }
      }

      if (!domainMatch && storedHadDot && !searchHadDot) {
        // Stored is parent domain (.example.com), search is specific (sub.example.com)
        domainMatch = searchDomain.endsWith('.' + storedDomain) || searchDomain === storedDomain
        if (domainMatch) {
          console.log(`🔄 Parent domain match: "${storedDomain}" matches subdomain "${searchDomain}"`)
        }
      }

      console.log(`🔄 Domain comparison result: "${searchDomain}" vs "${storedDomain}" = ${domainMatch}`)

      return typeMatch && keyMatch && domainMatch
    })

    console.log(`🎯 Pin check result: ${result}`)
    console.log(`   Original search domain: "${domain}"`)


    return result
  }

  async searchAllData(query) {
    if (!query || query.length < 2) {
      this.hideSearchResults()
      return
    }

    try {
      // Ensure we have the latest pinned properties
      await this.loadPinnedProperties()

      const results = []
      const lowerQuery = query.toLowerCase()

      // Get current domain for filtering
      const currentTab = await this.messageHandler.getCurrentTab()
      const currentDomain = getDomainFromTab(currentTab)

      // Search localStorage
      const localStorageData = this.storageManager.getStorageData()?.localStorage || {}
      Object.entries(localStorageData).forEach(([key, value]) => {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
        if (key.toLowerCase().includes(lowerQuery) || stringValue.toLowerCase().includes(lowerQuery)) {
          results.push({
            type: 'localStorage',
            key,
            value: stringValue,
            domain: currentDomain
          })
        }
      })

      // Search sessionStorage
      const sessionStorageData = this.storageManager.getStorageData()?.sessionStorage || {}
      Object.entries(sessionStorageData).forEach(([key, value]) => {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
        if (key.toLowerCase().includes(lowerQuery) || stringValue.toLowerCase().includes(lowerQuery)) {
          results.push({
            type: 'sessionStorage',
            key,
            value: stringValue,
            domain: currentDomain
          })
        }
      })

      // Search cookies
      const cookieData = this.cookieManager.getCookieData() || []
      cookieData.forEach(cookie => {
        if (cookie.name.toLowerCase().includes(lowerQuery) ||
            String(cookie.value).toLowerCase().includes(lowerQuery)) {
          results.push({
            type: 'cookie',
            key: cookie.name,
            value: cookie.value,
            domain: cookie.domain
          })
        }
      })

      this.displaySearchResults(results, query)
    } catch (error) {
      console.error('Search error:', error)
      this.hideSearchResults()
    }
  }

  displaySearchResults(results, query) {
    const searchContainer = document.getElementById('searchResults')
    const pinnedContainer = document.getElementById('pinnedProperties')
    const titleElement = document.getElementById('searchResultsTitle')
    const countElement = document.getElementById('searchResultsCount')
    const listElement = document.getElementById('searchResultsList')

    // Show search results, hide pinned properties
    searchContainer.style.display = 'block'
    pinnedContainer.style.display = 'none'

    // Update header
    titleElement.textContent = `Search Results for "${query}"`
    countElement.textContent = `${results.length} items found`

    // Render results
    if (results.length === 0) {
      listElement.innerHTML = `
        <div class="empty-state">
          <p>No items found matching "${escapeHtml(query)}"</p>
          <p class="empty-state-subtitle">Try a different search term</p>
        </div>
      `
      return
    }

    listElement.innerHTML = results.map((result, index) => this.renderSearchResult(result, index)).join('')

    // Add event listeners for pin buttons
    listElement.querySelectorAll('.search-pin-btn').forEach(button => {
      button.addEventListener('click', () => {
        const type = button.dataset.type
        const key = button.dataset.key
        this.pinFromSearch(type, key)
      })
    })
  }

  renderSearchResult(result, index) {
    const { type, key, value, domain } = result

    // Determine type display and color
    const typeDisplay = type === 'localStorage' ? 'Local Storage' :
                       type === 'sessionStorage' ? 'Session Storage' : 'Cookie'
    const typeClass = `type-${type}`

    // Truncate long values
    const displayValue = value.length > 100 ? value.substring(0, 100) + '...' : value

    // Check if already pinned
    console.log(`🔎 Search result: ${type}:${key}@${domain}`)
    const isPinned = this.isAlreadyPinned(type, key, domain)

    return `
      <div class="search-result-item" data-index="${index}">
        <div class="search-result-header">
          <span class="search-result-type ${typeClass}">${typeDisplay}</span>
          <span class="search-result-domain">${escapeHtml(domain)}</span>
        </div>
        <div class="search-result-content">
          <div class="search-result-key">${escapeHtml(key)}</div>
          <div class="search-result-value">${escapeHtml(displayValue)}</div>
        </div>
        <div class="search-result-actions">
          ${isPinned
            ? `<span class="btn btn-success disabled">✅ Already Pinned</span>`
            : `<button class="btn btn-secondary search-pin-btn" data-type="${type}" data-key="${escapeHtml(key)}">📌 Pin to Dashboard</button>`
          }
        </div>
      </div>
    `
  }

  async pinFromSearch(type, key) {
    try {
      // Prevent multiple simultaneous pin attempts
      const pinButtonKey = `${type}:${key}`
      if (this.pinningInProgress && this.pinningInProgress.has(pinButtonKey)) {
        console.log('Pin already in progress for:', pinButtonKey)
        return
      }

      if (!this.pinningInProgress) {
        this.pinningInProgress = new Set()
      }
      this.pinningInProgress.add(pinButtonKey)

      await this.pinProperty(type, key)
      // Ensure we have the latest pinned properties data before refreshing search
      await this.loadPinnedProperties()

      // Small delay to ensure storage write is complete
      await new Promise(resolve => setTimeout(resolve, 100))

      // Force refresh search results with updated pin status
      const searchInput = document.getElementById('dashboardSearch')
      if (searchInput && searchInput.value) {
        console.log('🔄 Refreshing search results after pin operation')
        await this.searchAllData(searchInput.value)

        // Also update other pin button states
        this.updatePinButtonStates()
      }

      this.pinningInProgress.delete(pinButtonKey)
    } catch (error) {
      console.error('Error pinning from search:', error)
      if (this.pinningInProgress) {
        this.pinningInProgress.delete(`${type}:${key}`)
      }
    }
  }

  hideSearchResults() {
    const searchContainer = document.getElementById('searchResults')
    const pinnedContainer = document.getElementById('pinnedProperties')

    if (searchContainer) {
      searchContainer.style.display = 'none'
    }
    if (pinnedContainer) {
      pinnedContainer.style.display = 'block'
    }
  }
}