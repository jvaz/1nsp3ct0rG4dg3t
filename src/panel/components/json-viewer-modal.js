// JSON Viewer Modal Component for 1nsp3ct0rG4dg3t Extension

import { showToast, escapeHtml } from '../utils/ui-helpers.js'
import { TOAST_TYPES } from '../utils/constants.js'

export class JsonViewerModal {
  constructor(modalManager) {
    this.modalManager = modalManager
    this.jsonData = null
    this.searchTerm = ''
    this.expandedPaths = new Set()
    this.currentPath = []
    this.searchTimeout = null
    this.searchListenersAttached = false
  }

  showJsonViewer(propertyKey, jsonValue) {
    console.log('showJsonViewer called with:', { propertyKey, valueType: typeof jsonValue, valueLength: jsonValue?.length })

    if (!jsonValue) {
      console.error('No JSON value provided')
      showToast('No JSON data to display', TOAST_TYPES.ERROR)
      return
    }

    try {
      // Parse JSON if it's a string
      let parsedData
      if (typeof jsonValue === 'string') {
        console.log('Parsing JSON string...')
        parsedData = JSON.parse(jsonValue)
      } else {
        console.log('Using direct object value...')
        parsedData = jsonValue
      }

      console.log('JSON parsed successfully:', typeof parsedData)

      this.jsonData = parsedData
      this.searchTerm = ''
      this.expandedPaths.clear()
      this.currentPath = []

      const viewerHtml = this.generateJsonViewerHtml(propertyKey)

      this.modalManager.showModal(`JSON Viewer - ${propertyKey}`, viewerHtml, null, {
        hideConfirm: true,
        cancelText: 'Close'
      })

      // Attach event listeners after modal is rendered
      setTimeout(() => {
        this.attachSearchListeners()
        this.attachContentListeners()
      }, 100)

      console.log('JSON viewer modal opened successfully')
    } catch (error) {
      console.error('Error parsing JSON:', error)
      console.error('JSON value that failed:', jsonValue)
      showToast(`Invalid JSON format: ${error.message}`, TOAST_TYPES.ERROR)
    }
  }

  generateJsonViewerHtml(propertyKey) {
    return `
      <div class="json-viewer-container">
        <div class="json-viewer-header">
          <div class="json-viewer-search">
            <input type="text" id="jsonSearch" class="json-search-input" placeholder="Search in JSON..." />
          </div>
          <div class="json-viewer-tools">
            <button id="expandAllBtn" class="btn btn-secondary">Expand All</button>
            <button id="collapseAllBtn" class="btn btn-secondary">Collapse All</button>
            <button id="copyAllBtn" class="btn btn-primary">📋 Copy All</button>
          </div>
        </div>
        <div class="json-viewer-content" id="jsonContent">
          ${this.renderJsonNode(this.jsonData, [])}
        </div>
        <div class="json-viewer-footer">
          <div class="json-path" id="jsonPath">
            <span class="path-label">Path:</span>
            <span class="path-value">Root</span>
          </div>
        </div>
      </div>
    `
  }

  renderJsonNode(node, path, isLast = true) {
    const pathString = path.join('.')
    const isExpanded = this.expandedPaths.has(pathString) || path.length === 0
    const nodeType = Array.isArray(node) ? 'array' : typeof node
    const isSearchMatch = this.isSearchMatch(node, path)

    if (nodeType === 'object' && node !== null) {
      return this.renderObjectNode(node, path, isExpanded, isSearchMatch)
    } else if (nodeType === 'array') {
      return this.renderArrayNode(node, path, isExpanded, isSearchMatch)
    } else {
      return this.renderPrimitiveNode(node, path, isSearchMatch)
    }
  }

  renderObjectNode(obj, path, isExpanded, isSearchMatch) {
    const pathString = path.join('.')
    const keys = Object.keys(obj)
    const className = `json-object ${isSearchMatch ? 'search-match' : ''}`

    let html = `<div class="${className}" data-path="${pathString}">`

    if (path.length > 0) {
      html += `
        <div class="json-node-header" data-path="${pathString}">
          <span class="json-toggle ${isExpanded ? 'expanded' : 'collapsed'}" data-path="${pathString}">
            ${isExpanded ? '▼' : '▶'}
          </span>
          <span class="json-key">"${escapeHtml(path[path.length - 1])}"</span>
          <span class="json-colon">:</span>
          <span class="json-bracket">{</span>
          <span class="json-count">${keys.length} ${keys.length === 1 ? 'property' : 'properties'}</span>
        </div>
      `
    } else {
      html += `<div class="json-root-header">
        <span class="json-bracket">{</span>
        <span class="json-count">${keys.length} ${keys.length === 1 ? 'property' : 'properties'}</span>
      </div>`
    }

    if (isExpanded) {
      html += '<div class="json-content">'
      keys.forEach((key, index) => {
        const newPath = [...path, key]
        const isLast = index === keys.length - 1
        html += `
          <div class="json-property">
            <span class="json-key">"${escapeHtml(key)}"</span>
            <span class="json-colon">:</span>
            ${this.renderJsonNode(obj[key], newPath, isLast)}
            ${!isLast ? '<span class="json-comma">,</span>' : ''}
          </div>
        `
      })
      html += '</div>'
    }

    html += path.length > 0 ? '<span class="json-bracket">}</span>' : '<div class="json-bracket">}</div>'
    html += '</div>'

    return html
  }

  renderArrayNode(arr, path, isExpanded, isSearchMatch) {
    const pathString = path.join('.')
    const className = `json-array ${isSearchMatch ? 'search-match' : ''}`

    let html = `<div class="${className}" data-path="${pathString}">`

    if (path.length > 0) {
      html += `
        <div class="json-node-header" data-path="${pathString}">
          <span class="json-toggle ${isExpanded ? 'expanded' : 'collapsed'}" data-path="${pathString}">
            ${isExpanded ? '▼' : '▶'}
          </span>
          <span class="json-key">"${escapeHtml(path[path.length - 1])}"</span>
          <span class="json-colon">:</span>
          <span class="json-bracket">[</span>
          <span class="json-count">${arr.length} ${arr.length === 1 ? 'item' : 'items'}</span>
        </div>
      `
    } else {
      html += `<div class="json-root-header">
        <span class="json-bracket">[</span>
        <span class="json-count">${arr.length} ${arr.length === 1 ? 'item' : 'items'}</span>
      </div>`
    }

    if (isExpanded) {
      html += '<div class="json-content">'
      arr.forEach((item, index) => {
        const newPath = [...path, index.toString()]
        const isLast = index === arr.length - 1
        html += `
          <div class="json-array-item">
            <span class="json-index">${index}:</span>
            ${this.renderJsonNode(item, newPath, isLast)}
            ${!isLast ? '<span class="json-comma">,</span>' : ''}
          </div>
        `
      })
      html += '</div>'
    }

    html += path.length > 0 ? '<span class="json-bracket">]</span>' : '<div class="json-bracket">]</div>'
    html += '</div>'

    return html
  }

  renderPrimitiveNode(value, path, isSearchMatch) {
    const pathString = path.join('.')
    const valueType = typeof value
    const className = `json-primitive json-${valueType} ${isSearchMatch ? 'search-match' : ''}`

    let displayValue
    if (valueType === 'string') {
      displayValue = `"${escapeHtml(value)}"`
    } else if (value === null) {
      displayValue = 'null'
    } else {
      displayValue = escapeHtml(String(value))
    }

    return `
      <span class="${className}" data-path="${pathString}" title="Click to copy: ${escapeHtml(String(value))}" style="cursor: pointer;" onclick="navigator.clipboard.writeText('${escapeHtml(String(value))}')">
        ${displayValue}
      </span>
    `
  }

  isSearchMatch(node, path) {
    if (!this.searchTerm) return false

    const searchLower = this.searchTerm.toLowerCase()
    const pathString = path.join('.').toLowerCase()

    // Check if path matches
    if (pathString.includes(searchLower)) return true

    // Check if value matches (for primitives)
    if (typeof node === 'string' && node.toLowerCase().includes(searchLower)) return true
    if (typeof node === 'number' && String(node).includes(searchLower)) return true

    return false
  }

  attachSearchListeners() {
    if (this.searchListenersAttached) return

    const searchInput = document.getElementById('jsonSearch')
    const expandAllBtn = document.getElementById('expandAllBtn')
    const collapseAllBtn = document.getElementById('collapseAllBtn')
    const copyAllBtn = document.getElementById('copyAllBtn')

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(this.searchTimeout)
        this.searchTimeout = setTimeout(() => {
          this.performSearch(e.target.value)
        }, 300)
      })
    }

    if (expandAllBtn) {
      expandAllBtn.addEventListener('click', () => this.expandAll())
    }

    if (collapseAllBtn) {
      collapseAllBtn.addEventListener('click', () => this.collapseAll())
    }

    if (copyAllBtn) {
      copyAllBtn.addEventListener('click', () => this.copyAll())
    }

    this.searchListenersAttached = true
  }

  attachContentListeners() {
    // Toggle functionality
    document.querySelectorAll('.json-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        const path = e.target.dataset.path
        this.toggleNode(path)
      })
    })

    // Copy buttons (reduced to only show on object/array headers)
    document.querySelectorAll('.json-copy-btn:not(.json-copy-value)').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const path = e.target.dataset.path
        this.copyValue(path)
      })
    })

    // Path display on hover
    document.querySelectorAll('[data-path]').forEach(element => {
      element.addEventListener('mouseenter', (e) => {
        const path = e.target.dataset.path || 'Root'
        this.updatePathDisplay(path)
      })
    })
  }

  performSearch(term) {
    this.searchTerm = term

    const contentElement = document.getElementById('jsonContent')
    if (contentElement) {
      contentElement.innerHTML = this.renderJsonNode(this.jsonData, [])
      this.attachContentListeners()
    }

    if (term) {
      this.expandSearchMatches()
    }
  }

  expandSearchMatches() {
    const expandPaths = this.findSearchMatchPaths(this.jsonData, [])
    expandPaths.forEach(path => {
      this.expandedPaths.add(path)
    })

    const contentElement = document.getElementById('jsonContent')
    if (contentElement) {
      contentElement.innerHTML = this.renderJsonNode(this.jsonData, [])
      this.attachContentListeners()
    }
  }

  findSearchMatchPaths(node, path) {
    const paths = []

    if (this.isSearchMatch(node, path)) {
      paths.push(path.join('.'))
      // Also expand parent path
      if (path.length > 0) {
        const parentPath = path.slice(0, -1).join('.')
        paths.push(parentPath)
      }
    }

    if (typeof node === 'object' && node !== null) {
      if (Array.isArray(node)) {
        node.forEach((item, index) => {
          paths.push(...this.findSearchMatchPaths(item, [...path, index.toString()]))
        })
      } else {
        Object.keys(node).forEach(key => {
          paths.push(...this.findSearchMatchPaths(node[key], [...path, key]))
        })
      }
    }

    return paths
  }

  toggleNode(path) {
    if (this.expandedPaths.has(path)) {
      this.expandedPaths.delete(path)
    } else {
      this.expandedPaths.add(path)
    }
    this.refreshViewer()
  }

  expandAll() {
    this.expandedPaths.clear()
    this.addAllPaths(this.jsonData, [])
    this.refreshViewer()
  }

  collapseAll() {
    this.expandedPaths.clear()
    this.refreshViewer()
  }

  addAllPaths(node, path) {
    const pathString = path.join('.')
    if (path.length > 0) {
      this.expandedPaths.add(pathString)
    }

    if (typeof node === 'object' && node !== null) {
      if (Array.isArray(node)) {
        node.forEach((item, index) => {
          this.addAllPaths(item, [...path, index.toString()])
        })
      } else {
        Object.keys(node).forEach(key => {
          this.addAllPaths(node[key], [...path, key])
        })
      }
    }
  }

  refreshViewer() {
    const contentElement = document.getElementById('jsonContent')
    if (contentElement) {
      contentElement.innerHTML = this.renderJsonNode(this.jsonData, [])
      this.attachContentListeners()
    }
  }

  updatePathDisplay(path) {
    const pathElement = document.querySelector('.path-value')
    if (pathElement) {
      pathElement.textContent = path || 'Root'
    }
  }

  getValueAtPath(path) {
    if (!path) return this.jsonData

    const pathArray = path.split('.')
    let current = this.jsonData

    for (const key of pathArray) {
      if (current && typeof current === 'object') {
        current = current[key]
      } else {
        return undefined
      }
    }

    return current
  }

  copyValue(path, directValue) {
    try {
      let valueToCopy

      if (directValue !== undefined) {
        valueToCopy = directValue
      } else {
        const value = this.getValueAtPath(path)
        valueToCopy = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
      }

      navigator.clipboard.writeText(valueToCopy).then(() => {
        showToast('Copied to clipboard', TOAST_TYPES.SUCCESS)
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = valueToCopy
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        showToast('Copied to clipboard', TOAST_TYPES.SUCCESS)
      })
    } catch (error) {
      console.error('Copy failed:', error)
      showToast('Copy failed', TOAST_TYPES.ERROR)
    }
  }

  copyAll() {
    try {
      const jsonString = JSON.stringify(this.jsonData, null, 2)
      this.copyValue('', jsonString)
    } catch (error) {
      console.error('Copy all failed:', error)
      showToast('Copy failed', TOAST_TYPES.ERROR)
    }
  }
}