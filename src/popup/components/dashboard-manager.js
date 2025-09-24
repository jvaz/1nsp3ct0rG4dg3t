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

      // Refresh the displays
      this.loadPinnedProperties()
      this.loadDashboardProperties()
      if (this.inspector && this.inspector.updatePinButtonStates) {
        this.inspector.updatePinButtonStates()
      }

      console.log('Property pinned successfully:', type, key)
    } catch (error) {
      console.error('Error pinning property:', error)
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
        if (this.inspector && this.inspector.updatePinButtonStates) {
          this.inspector.updatePinButtonStates()
        }
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
        if (this.inspector && this.inspector.updatePinButtonStates) {
          this.inspector.updatePinButtonStates()
        }

        console.log('Property unpinned successfully:', type, key, currentDomain)
      } else {
        console.log('Property not found for unpinning:', type, key, currentDomain)
      }
    } catch (error) {
      console.error('Error unpinning property by key:', error)
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

  getPinnedProperties() {
    return this.pinnedProperties
  }
}