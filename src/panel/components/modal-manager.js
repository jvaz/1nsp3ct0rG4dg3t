// Modal Manager Component for 1nsp3ct0rG4dg3t Extension

import { showToast } from '../utils/ui-helpers.js'
import { isValidJSON } from '../utils/validation.js'
import { TOAST_TYPES } from '../utils/constants.js'

export class ModalManager {
  constructor() {
    this.setupEventListeners()
  }

  setupEventListeners() {
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
  }

  showModal(title, content, confirmCallback = null, options = {}) {
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

  showFormModal(title, formFields, submitCallback, options = {}) {
    const formHtml = this.generateFormHTML(formFields, options)

    this.showModal(title, formHtml, () => {
      return this.handleFormSubmit(formFields, submitCallback)
    }, {
      confirmText: options.submitText || 'Save',
      cancelText: 'Cancel'
    })

    // Set up real-time validation
    this.setupFormValidation(formFields)
  }

  generateFormHTML(formFields, options = {}) {
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

  setupFormValidation(formFields) {
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

  validateField(field, input, errorDiv) {
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
        if (!isValidJSON(value)) {
          isValid = false
          errorMessage = 'Invalid JSON format'
        }
      }
      // Plain text values are always valid
    }

    // Update UI
    if (isValid) {
      input.classList.remove('invalid')
      errorDiv.textContent = ''
      errorDiv.style.display = 'none'
    } else {
      input.classList.add('invalid')
      errorDiv.textContent = errorMessage
      errorDiv.style.display = 'block'
    }

    return isValid
  }

  handleFormSubmit(formFields, submitCallback) {
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
        showToast(`Error: ${error.message}`, TOAST_TYPES.ERROR)
        return false
      }
    }

    return true // Close modal
  }

  hideModal() {
    document.getElementById('modalOverlay').classList.remove('active')
  }
}