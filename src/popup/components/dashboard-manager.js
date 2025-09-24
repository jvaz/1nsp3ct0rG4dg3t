// Dashboard Manager Component for 1nsp3ct0rG4dg3t Extension

import { showToast, escapeHtml } from '../utils/ui-helpers.js'
import { TABS, STORAGE_TYPES, TOAST_TYPES, ORGANIZATION_MODES } from '../utils/constants.js'

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
  }

  async loadDashboardProperties() {
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
      const currentTab = await this.messageHandler.getCurrentTab()
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

      // Render all properties
      let html = '<div class="pinned-properties-list">'
      organizedProperties.forEach((property, index) => {
        html += this.renderDashboardProperty(property, index, storageData, cookieData)
      })
      html += '</div>'

      container.innerHTML = html

      // Add event listeners for unpin buttons
      container.querySelectorAll('.btn-unpin').forEach(button => {
        button.addEventListener('click', () => {
          const index = parseInt(button.dataset.index)
          this.unpinProperty(index)
        })
      })
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

    try {
      if (type === 'cookie') {
        const cookie = cookieData.cookies?.find(c => c.name === key)
        if (cookie) {
          value = cookie.value || ''
          displayClass = 'property-found'
        }
      } else if (type === STORAGE_TYPES.LOCAL || type === STORAGE_TYPES.SESSION) {
        const storage = storageData[type]
        if (storage && storage.hasOwnProperty(key)) {
          value = storage[key]
          displayClass = 'property-found'

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

    // Truncate long values for display
    let displayValue = value
    if (displayValue.length > 100) {
      displayValue = displayValue.substring(0, 100) + '...'
    }

    return `
      <div class="pinned-property ${displayClass}">
        <div class="property-header">
          <span class="property-type">${type}</span>
          <span class="property-name">${escapeHtml(alias || key)}</span>
          <button class="btn-icon btn-unpin" data-index="${index}" title="Unpin property">×</button>
        </div>
        <div class="property-value">${escapeHtml(displayValue)}</div>
        <div class="property-meta">
          <span class="property-domain">${escapeHtml(domain || 'unknown')}</span>
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
      const currentDomain = currentTab ? new URL(currentTab.url).hostname : 'unknown'

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

    // Force reload both storage types and cookies for dashboard
    const refreshPromises = [
      this.storageManager.loadStorageDataByType ? this.storageManager.loadStorageDataByType(STORAGE_TYPES.LOCAL) : null,
      this.storageManager.loadStorageDataByType ? this.storageManager.loadStorageDataByType(STORAGE_TYPES.SESSION) : null,
      this.cookieManager.loadCookies()
    ].filter(Boolean)

    try {
      await Promise.allSettled(refreshPromises)
      console.log('All dashboard data refresh promises completed')

      // Now reload dashboard with fresh data
      this.loadDashboardProperties()
    } catch (error) {
      console.error('Error refreshing dashboard:', error)
      container.innerHTML = '<div class="empty-state"><p>Error refreshing dashboard data</p></div>'
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
      const currentDomain = currentTab ? new URL(currentTab.url).hostname : 'unknown'

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
      return new URL(this.inspector.tabInfo.url).hostname
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

  handleDragStart(e) {
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

  handleDragEnd(e) {
    e.target.classList.remove('dragging')
    this.draggedElement = null

    // Remove all drag visual indicators
    document.querySelectorAll('.dashboard-property').forEach(item => {
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
    e.target.classList.add('drag-over')
  }

  handleDragLeave(e) {
    e.target.classList.remove('drag-over')
  }

  async handleDrop(e) {
    if (e.stopPropagation) {
      e.stopPropagation()
    }

    e.target.classList.remove('drag-over')

    if (this.draggedElement !== e.target) {
      await this.reorderProperties(this.draggedElement, e.target)
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
}