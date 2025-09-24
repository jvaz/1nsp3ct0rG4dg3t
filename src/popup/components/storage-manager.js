// Storage Manager Component for 1nsp3ct0rG4dg3t Extension

import { showToast, escapeHtml } from '../utils/ui-helpers.js'
import { isValidStorageKey } from '../utils/validation.js'
import { STORAGE_TYPES, TOAST_TYPES } from '../utils/constants.js'

export class StorageManager {
  constructor(messageHandler, modalManager, inspector) {
    this.messageHandler = messageHandler
    this.modalManager = modalManager
    this.inspector = inspector
    this.currentStorage = STORAGE_TYPES.LOCAL
    this.storageData = {}
    this.tabInfo = null
  }

  setTabInfo(tabInfo) {
    this.tabInfo = tabInfo
  }

  setCurrentStorage(storageType) {
    this.currentStorage = storageType
  }

  switchStorageType(storageType) {
    document.querySelectorAll('.storage-tab-btn').forEach(btn => {
      btn.classList.remove('active')
    })
    document.querySelector(`[data-storage="${storageType}"]`).classList.add('active')

    this.currentStorage = storageType
    this.loadStorageDataSmart()
  }

  loadStorageDataSmart() {
    const container = document.getElementById('storageItems')

    // Check if current tab supports content scripts
    if (!this.tabInfo || !this.messageHandler.isContentScriptSupported(this.tabInfo.url)) {
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

  async loadStorageDataInBackground() {
    const container = document.getElementById('storageItems')

    try {
      // Try to load storage data with reduced retry attempts
      const response = await this.messageHandler.sendMessageWithRetry('getStorageData', {
        storageType: this.currentStorage
      }, 2) // Only 2 retries instead of 3

      if (response && response.success) {
        this.updateStorageData(this.currentStorage, response.data)
        this.displayStorageData(response.data)
      } else {
        throw new Error(response?.error || 'Failed to load storage data')
      }
    } catch (error) {
      console.log('Storage data loading pending:', error.message)

      // Show user-friendly message with retry option
      container.innerHTML = `
        <div class="empty-state">
          <p>Storage data loading...</p>
          <p class="empty-state-subtitle">If this page just loaded, storage access may still be initializing</p>
          <button id="storageRetryBtn" class="btn btn-primary">Retry Loading</button>
        </div>
      `

      const retryBtn = document.getElementById('storageRetryBtn')
      if (retryBtn) {
        retryBtn.addEventListener('click', () => this.loadStorageDataSmart())
      }

      // Auto-retry after 3 seconds if not manual
      setTimeout(() => {
        if (container.textContent.includes('Storage data loading...')) {
          this.loadStorageDataInBackground()
        }
      }, 3000)
    }
  }

  async loadStorageDataByType(storageType) {
    // Check if current tab supports content scripts
    if (!this.tabInfo || !this.messageHandler.isContentScriptSupported(this.tabInfo.url)) {
      console.log(`Cannot load ${storageType} data: page type not supported`)
      return null
    }

    try {
      // Use the new retry logic with reduced attempts
      const response = await this.messageHandler.sendMessageWithRetry('getStorageData', {
        storageType: storageType
      }, 2) // Only 2 retries

      if (response && response.success) {
        this.updateStorageData(storageType, response.data)
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

  async loadStorageData() {
    const container = document.getElementById('storageItems')

    try {
      const response = await this.messageHandler.sendMessage('getStorageData', {
        storageType: this.currentStorage
      })

      if (response && response.success) {
        this.updateStorageData(this.currentStorage, response.data)
        this.displayStorageData(response.data)
      } else {
        // Show error state with retry button
        container.innerHTML = `
          <div class="empty-state">
            <p>Unable to load storage data</p>
            <p class="empty-state-subtitle">${response?.error || 'Unknown error occurred'}</p>
            <button id="storageRetryBtn" class="btn btn-primary">Retry</button>
          </div>
        `

        const retryBtn = document.getElementById('storageRetryBtn')
        if (retryBtn) {
          retryBtn.addEventListener('click', () => this.loadStorageDataSmart())
        }
      }
    } catch (error) {
      console.error('Error loading storage data:', error)
      container.innerHTML = `
        <div class="empty-state">
          <p>Storage connection error</p>
          <p class="empty-state-subtitle">${error.message}</p>
          <button id="storageRetryBtn" class="btn btn-primary">Retry</button>
        </div>
      `

      const retryBtn = document.getElementById('storageRetryBtn')
      if (retryBtn) {
        retryBtn.addEventListener('click', () => this.loadStorageDataSmart())
      }
    }
  }

  displayStorageData(data) {
    const container = document.getElementById('storageItems')

    if (!data || Object.keys(data).length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No ${this.currentStorage === STORAGE_TYPES.LOCAL ? 'local' : 'session'} storage items</p>
          <p class="empty-state-subtitle">Items you add will appear here</p>
        </div>
      `
      return
    }

    let html = '<div class="storage-list">'
    for (const [key, value] of Object.entries(data)) {
      html += this.renderStorageItem(key, value)
    }
    html += '</div>'

    container.innerHTML = html

    // Use our own method for full pin/edit/delete functionality
    this.attachStorageItemListeners()
  }

  renderStorageItem(key, value) {
    const displayValue = this.formatValue(value)

    return `
      <div class="storage-item" data-key="${escapeHtml(key)}">
        <div class="storage-item-header">
          <span class="storage-key">${escapeHtml(key)}</span>
          <div class="storage-actions">
            <button class="btn-icon pin-btn" title="Pin to Dashboard">●</button>
            <button class="btn-icon edit-btn" title="Edit">✏️</button>
            <button class="btn-icon delete-btn" title="Delete">🗑️</button>
          </div>
        </div>
        <div class="storage-value">${escapeHtml(displayValue)}</div>
      </div>
    `
  }

  formatValue(value) {
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

  showAddStorageModal() {
    const formFields = [
      {
        id: 'storageKey',
        label: 'Key',
        type: 'text',
        required: true,
        placeholder: 'Enter storage key...',
        help: 'The key name for the storage item',
        validate: isValidStorageKey
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
        value: this.currentStorage || STORAGE_TYPES.LOCAL,
        required: true,
        options: [
          { value: STORAGE_TYPES.LOCAL, label: 'Local Storage' },
          { value: STORAGE_TYPES.SESSION, label: 'Session Storage' }
        ]
      }
    ]

    this.modalManager.showFormModal(
      'Add Storage Item',
      formFields,
      (formData) => this.handleAddStorageItem(formData),
      { submitText: 'Add Item' }
    )
  }

  async handleAddStorageItem(formData) {
    try {
      const { storageKey, storageValue, storageType } = formData

      // Try to parse JSON value, otherwise use as string
      let parsedValue = storageValue
      try {
        parsedValue = JSON.parse(storageValue)
      } catch (e) {
        // Keep as string if JSON parsing fails
      }

      const response = await this.messageHandler.sendMessage('setStorageData', {
        storageType,
        key: storageKey,
        value: parsedValue
      })

      if (response && response.success) {
        showToast(`${storageKey} added to ${storageType}`, TOAST_TYPES.SUCCESS)

        // Update the current storage display if it matches
        if (storageType === this.currentStorage) {
          this.loadStorageDataSmart()
        }
      } else {
        throw new Error(response?.error || 'Failed to add storage item')
      }
    } catch (error) {
      console.error('Error adding storage item:', error)
      throw error // Re-throw to prevent modal from closing
    }
  }

  showEditStorageModal(key) {
    const currentValue = this.storageData[this.currentStorage]?.[key]
    const displayValue = typeof currentValue === 'object'
      ? JSON.stringify(currentValue, null, 2)
      : String(currentValue || '')

    const formFields = [
      {
        id: 'storageKey',
        label: 'Key',
        type: 'text',
        value: key,
        required: true,
        validate: isValidStorageKey
      },
      {
        id: 'storageValue',
        label: 'Value',
        type: 'textarea',
        value: displayValue,
        required: true,
        rows: 6,
        validateJSON: true
      },
      {
        id: 'storageType',
        label: 'Storage Type',
        type: 'select',
        value: this.currentStorage,
        required: true,
        options: [
          { value: STORAGE_TYPES.LOCAL, label: 'Local Storage' },
          { value: STORAGE_TYPES.SESSION, label: 'Session Storage' }
        ]
      }
    ]

    this.modalManager.showFormModal(
      'Edit Storage Item',
      formFields,
      (formData) => this.handleEditStorageItem(key, formData),
      { submitText: 'Update Item' }
    )
  }

  async handleEditStorageItem(originalKey, formData) {
    try {
      const { storageKey, storageValue, storageType } = formData
      const originalStorageType = this.currentStorage || STORAGE_TYPES.LOCAL

      // Try to parse JSON value, otherwise use as string
      let parsedValue = storageValue
      try {
        parsedValue = JSON.parse(storageValue)
      } catch (e) {
        // Keep as string if JSON parsing fails
      }

      // If key or storage type changed, delete the old entry first
      if (originalKey !== storageKey || originalStorageType !== storageType) {
        const deleteResponse = await this.messageHandler.sendMessage('removeStorageData', {
          storageType: originalStorageType,
          key: originalKey
        })

        if (!deleteResponse || !deleteResponse.success) {
          throw new Error('Failed to remove old storage item')
        }
      }

      // Set the new/updated value
      const response = await this.messageHandler.sendMessage('setStorageData', {
        storageType,
        key: storageKey,
        value: parsedValue
      })

      if (response && response.success) {
        showToast(`${storageKey} updated in ${storageType}`, TOAST_TYPES.SUCCESS)

        // Refresh display for affected storage types
        if (storageType === this.currentStorage || originalStorageType === this.currentStorage) {
          this.loadStorageDataSmart()
        }
      } else {
        throw new Error(response?.error || 'Failed to update storage item')
      }
    } catch (error) {
      console.error('Error updating storage item:', error)
      throw error // Re-throw to prevent modal from closing
    }
  }

  showDeleteStorageModal(key) {
    this.modalManager.showModal(
      'Delete Storage Item',
      `<p>Are you sure you want to delete the storage item with key "<strong>${escapeHtml(key)}</strong>"?</p>
       <p class="text-danger">This action cannot be undone.</p>`,
      async () => {
        try {
          const response = await this.messageHandler.sendMessage('removeStorageData', {
            storageType: this.currentStorage,
            key: key
          })

          if (response && response.success) {
            showToast(`${key} deleted from ${this.currentStorage}`, TOAST_TYPES.SUCCESS)
            this.loadStorageDataSmart()
          } else {
            throw new Error(response?.error || 'Failed to delete storage item')
          }
        } catch (error) {
          console.error('Error deleting storage item:', error)
          showToast(`Error: ${error.message}`, TOAST_TYPES.ERROR)
        }
      },
      {
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    )
  }

  filterStorage(query) {
    const items = document.querySelectorAll('.storage-item')
    const searchQuery = query.toLowerCase()

    items.forEach(item => {
      const key = item.dataset.key?.toLowerCase() || ''
      const valueText = item.querySelector('.storage-value')?.textContent?.toLowerCase() || ''
      const matches = key.includes(searchQuery) || valueText.includes(searchQuery)
      item.style.display = matches ? 'block' : 'none'
    })
  }

  getStorageData() {
    return this.storageData
  }

  getCurrentStorage() {
    return this.currentStorage
  }

  updateStorageData(storageType, data) {
    this.storageData[storageType] = data
    // Notify Inspector to refresh dashboard if it has pinned properties
    if (this.inspector && this.inspector.loadDashboardProperties) {
      setTimeout(() => this.inspector.loadDashboardProperties(), 100)
    }
  }

  attachStorageItemListeners() {
    // Update pin button states first - delegate to dashboard manager
    if (this.inspector && this.inspector.dashboardManager && this.inspector.dashboardManager.updatePinButtonStates) {
      this.inspector.dashboardManager.updatePinButtonStates()
    }

    // Add pin button listeners
    document.querySelectorAll('.storage-item .pin-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const storageItem = e.target.closest('.storage-item')
        const key = storageItem.dataset.key
        const storageType = this.getCurrentStorage() || STORAGE_TYPES.LOCAL

        if (button.classList.contains('pinned')) {
          // If already pinned, unpin it
          if (this.inspector && this.inspector.dashboardManager) {
            this.inspector.dashboardManager.unpinPropertyByKey(storageType, key)
          }
        } else {
          // If not pinned, pin it
          if (this.inspector && this.inspector.dashboardManager) {
            this.inspector.dashboardManager.pinProperty(storageType, key)
          }
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
        this.showDeleteStorageModal(key)
      })
    })
  }

  getCurrentStorageData() {
    return this.storageData[this.currentStorage] || {}
  }
}