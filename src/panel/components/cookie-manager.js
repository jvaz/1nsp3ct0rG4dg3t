// Cookie Manager Component for 1nsp3ct0rG4dg3t Extension

import { showToast, escapeHtml } from '../utils/ui-helpers.js'
import { TOAST_TYPES } from '../utils/constants.js'
import { getDomainFromTab } from '../utils/url-helpers.js'
import { isValidCookieName, isValidCookieValue } from '../utils/validation.js'

export class CookieManager {
  constructor(messageHandler, modalManager, inspector) {
    this.messageHandler = messageHandler
    this.modalManager = modalManager
    this.inspector = inspector
    this.dashboardManager = null // Will be set after DashboardManager is created
    this.cookieData = []
    this.tabInfo = null
  }

  setDashboardManager(dashboardManager) {
    this.dashboardManager = dashboardManager
  }

  setTabInfo(tabInfo) {
    this.tabInfo = tabInfo
  }

  async loadCookies() {
    const container = document.getElementById('cookiesList')
    container.innerHTML = '<div class="loading">Loading cookies...</div>'

    try {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        container.innerHTML = '<div class="empty-state">Extension context invalidated. Please reload the extension.</div>'
        return
      }

      // Get cookies via background script since content scripts can't access cookies directly
      const tab = await this.messageHandler.getCurrentTab()
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

  displayCookies(cookies) {
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
          <span class="cookie-name">${escapeHtml(cookie.name)}</span>
          <div class="cookie-actions">
            <button class="btn-icon pin-btn" title="Pin to Dashboard">●</button>
            <button class="btn-icon edit-btn" title="Edit">✏️</button>
            <button class="btn-icon delete-btn" title="Delete">🗑️</button>
          </div>
        </div>
        <div class="cookie-value">${escapeHtml(cookie.value)}</div>
        <div class="cookie-details">
          <span class="cookie-domain">Domain: ${cookie.domain}</span>
          <span class="cookie-path">Path: ${cookie.path}</span>
          ${cookie.secure ? '<span class="cookie-secure">Secure</span>' : ''}
          ${cookie.httpOnly ? '<span class="cookie-httponly">HttpOnly</span>' : ''}
        </div>
      </div>
    `).join('')

    container.innerHTML = html

    // Use our own method for full pin/edit/delete functionality
    this.attachCookieItemListeners()
  }

  filterCookies(query) {
    const items = document.querySelectorAll('.cookie-item')
    const searchQuery = query.toLowerCase()

    items.forEach(item => {
      const name = item.dataset.name?.toLowerCase() || ''
      const valueText = item.querySelector('.cookie-value')?.textContent?.toLowerCase() || ''
      const domainText = item.querySelector('.cookie-domain')?.textContent?.toLowerCase() || ''
      const matches = name.includes(searchQuery) || valueText.includes(searchQuery) || domainText.includes(searchQuery)
      item.style.display = matches ? 'block' : 'none'
    })
  }

  async showAddCookieModal() {
    // Ensure tab info is available for form defaults
    const currentTab = await this.ensureTabInfo()
    const domain = getDomainFromTab(currentTab, '')
    const isSecure = currentTab ? currentTab.url.startsWith('https:') : false

    const formFields = [
      {
        id: 'cookieName',
        label: 'Name',
        type: 'text',
        required: true,
        placeholder: 'Enter cookie name...',
        help: 'The name of the cookie',
        validate: this.validateCookieName
      },
      {
        id: 'cookieValue',
        label: 'Value',
        type: 'textarea',
        required: true,
        placeholder: 'Enter cookie value...',
        rows: 3,
        help: 'The value of the cookie',
        validate: this.validateCookieValue
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
        checkboxLabel: 'Secure (requires HTTPS)'
      },
      {
        id: 'cookieHttpOnly',
        label: '',
        type: 'checkbox',
        checkboxLabel: 'HttpOnly (not accessible via JavaScript)'
      },
      {
        id: 'cookieSameSite',
        label: 'SameSite',
        type: 'select',
        value: 'Lax',
        options: [
          { value: 'None', label: 'None' },
          { value: 'Lax', label: 'Lax' },
          { value: 'Strict', label: 'Strict' }
        ],
        help: 'Controls when cookies are sent with cross-site requests'
      }
    ]

    this.modalManager.showFormModal(
      'Add Cookie',
      formFields,
      (formData) => this.handleAddCookieItem(formData),
      { submitText: 'Add Cookie' }
    )
  }

  validateCookieName(value) {
    return isValidCookieName(value)
  }

  validateCookieValue(value) {
    return isValidCookieValue(value)
  }

  async ensureTabInfo() {
    if (!this.tabInfo) {
      this.tabInfo = await this.messageHandler.getCurrentTab()
    }
    return this.tabInfo
  }

  async handleAddCookieItem(formData) {
    try {
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

      // Validate SameSite=None requires Secure
      if (cookieSameSite === 'None' && !cookieSecure) {
        throw new Error('SameSite=None requires the Secure attribute')
      }

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

      // Set URL for the cookie
      const tab = await this.ensureTabInfo()
      if (!tab || !tab.id) {
        throw new Error('No tab ID provided')
      }

      cookieData.url = tab.url

      const response = await chrome.runtime.sendMessage({
        action: 'setCookie',
        cookieData: cookieData,
        tabId: tab.id
      })

      if (response && response.success) {
        showToast(`Cookie "${cookieName}" added successfully`, TOAST_TYPES.SUCCESS)
        // Refresh cookies with a small delay to ensure it's set
        setTimeout(() => this.loadCookies(), 500)
      } else {
        throw new Error(response?.error || 'Failed to add cookie')
      }
    } catch (error) {
      console.error('Error adding cookie:', error)
      throw error // Re-throw to prevent modal from closing
    }
  }

  async showEditCookieModal(cookieName) {
    // Find the cookie in our cached data
    const cookie = this.cookieData?.find(c => c.name === cookieName)

    if (!cookie) {
      showToast(`Cookie "${cookieName}" not found`, 'error')
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
        validate: this.validateCookieName
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
        validate: this.validateCookieValue
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

    this.modalManager.showFormModal(
      `Edit Cookie: ${cookieName}`,
      formFields,
      (formData) => this.handleEditCookie(cookie, formData),
      { submitText: 'Update Cookie' }
    )
  }

  async handleEditCookie(originalCookie, formData) {
    try {
      // Ensure tab info is available
      const tabInfo = await this.ensureTabInfo()

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
        showToast(`Cookie "${cookieName}" updated successfully`, TOAST_TYPES.SUCCESS)

        // Refresh cookies with a small delay
        setTimeout(() => this.loadCookies(), 500)

        // Update dashboard if needed
        if (this.inspector && this.inspector.updateDashboardIfNeeded) {
          this.inspector.updateDashboardIfNeeded('cookie', cookieName)
          if (nameChanged) {
            this.inspector.updateDashboardIfNeeded('cookie', originalCookie.name)
          }
        }
      } else {
        throw new Error(response?.error || 'Failed to update cookie')
      }
    } catch (error) {
      console.error('Error editing cookie:', error)
      throw error // Re-throw to prevent modal from closing
    }
  }

  showDeleteCookieConfirmation(cookieName) {
    // Find the cookie in our cached data
    const cookie = this.cookieData?.find(c => c.name === cookieName)

    if (!cookie) {
      showToast(`Cookie "${cookieName}" not found`, 'error')
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
          <strong>Name:</strong> <code>${escapeHtml(cookie.name)}</code><br>
          <strong>Value:</strong> <code>${escapeHtml(displayValue)}</code><br>
          <strong>Domain:</strong> <code>${escapeHtml(cookie.domain || 'Current domain')}</code><br>
          <strong>Path:</strong> <code>${escapeHtml(cookie.path || '/')}</code><br>
          <strong>Expires:</strong> ${escapeHtml(expiresText)}<br>
          ${securityFlags.length > 0 ? `<strong>Flags:</strong> ${escapeHtml(securityFlags.join(', '))}<br>` : ''}
        </div>
        <p style="color: var(--danger-color); font-size: 12px; margin-top: 16px;">
          This action cannot be undone.
        </p>
      </div>
    `

    this.modalManager.showModal(
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

  async handleDeleteCookie(cookie) {
    try {
      // Ensure tab info is available
      const tabInfo = await this.ensureTabInfo()

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
        showToast(`Cookie "${cookie.name}" deleted successfully`, TOAST_TYPES.SUCCESS)

        // Refresh cookies with a small delay
        setTimeout(() => this.loadCookies(), 500)

        // Update dashboard if this cookie was pinned
        if (this.inspector && this.inspector.updateDashboardIfNeeded) {
          this.inspector.updateDashboardIfNeeded('cookie', cookie.name)
        }
      } else {
        throw new Error(response?.error || 'Failed to delete cookie')
      }
    } catch (error) {
      console.error('Error deleting cookie:', error)
      showToast(`Error: ${error.message}`, TOAST_TYPES.ERROR)
      throw error // Re-throw to prevent modal from closing
    }
  }

  attachCookieItemListeners() {
    // Update pin button states first - delegate to dashboard manager
    if (this.dashboardManager && this.dashboardManager.updatePinButtonStates) {
      this.dashboardManager.updatePinButtonStates()
    }

    // Add pin button listeners
    document.querySelectorAll('.cookie-item .pin-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const cookieItem = e.target.closest('.cookie-item')
        const key = cookieItem.dataset.name

        if (button.classList.contains('pinned')) {
          // If already pinned, unpin it
          if (this.dashboardManager) {
            this.dashboardManager.unpinPropertyByKey('cookie', key)
          }
        } else {
          // If not pinned, pin it
          if (this.dashboardManager) {
            this.dashboardManager.pinProperty('cookie', key)
          }
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
          showToast(`Error: ${error.message}`, TOAST_TYPES.ERROR)
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

  getCookieData() {
    return this.cookieData
  }
}