// Script Console Manager Component for 1nsp3ct0rG4dg3t Extension

import { showToast, escapeHtml } from '../utils/ui-helpers.js'
import { EXECUTION_TIMING, OUTPUT_FORMATS, TOAST_TYPES } from '../utils/constants.js'

export class ScriptConsoleManager {
  constructor(messageHandler, modalManager) {
    this.messageHandler = messageHandler
    this.modalManager = modalManager
    this.lastScriptResult = null
    this.scriptTemplates = this.initializeTemplates()
  }

  initializeTemplates() {
    return {
      'dom': {
        'getAllElements': {
          name: 'Get All Elements',
          description: 'Get all DOM elements',
          code: `// Get all elements with their tag names
const elements = Array.from(document.querySelectorAll('*'));
const elementInfo = elements.map(el => ({
  tag: el.tagName.toLowerCase(),
  id: el.id || null,
  className: el.className || null,
  textContent: el.textContent?.substring(0, 50) || null
}));
console.log('Total elements found:', elements.length);
elementInfo.slice(0, 10); // Show first 10`
        },
        'getElementsByTag': {
          name: 'Get Elements by Tag',
          description: 'Find elements by tag name',
          code: `// Replace 'div' with desired tag name
const tagName = 'div';
const elements = document.getElementsByTagName(tagName);
Array.from(elements).map(el => ({
  id: el.id,
  className: el.className,
  textContent: el.textContent?.substring(0, 50)
}));`
        },
        'findByText': {
          name: 'Find Elements by Text',
          description: 'Find elements containing specific text',
          code: `// Replace 'search text' with your target text
const searchText = 'search text';
const allElements = document.querySelectorAll('*');
const matchingElements = Array.from(allElements).filter(el =>
  el.textContent?.toLowerCase().includes(searchText.toLowerCase())
);
matchingElements.map(el => ({
  tag: el.tagName.toLowerCase(),
  text: el.textContent?.substring(0, 100),
  id: el.id,
  className: el.className
}));`
        }
      },
      'data': {
        'extractTables': {
          name: 'Extract Table Data',
          description: 'Extract data from HTML tables',
          code: `// Extract data from all tables on the page
const tables = document.querySelectorAll('table');
const tableData = Array.from(tables).map((table, index) => {
  const rows = Array.from(table.querySelectorAll('tr'));
  const data = rows.map(row =>
    Array.from(row.querySelectorAll('td, th')).map(cell => cell.textContent.trim())
  );
  return { tableIndex: index, rows: data };
});
tableData;`
        },
        'extractLinks': {
          name: 'Extract All Links',
          description: 'Get all links from the page',
          code: `// Extract all links with their text and URLs
const links = document.querySelectorAll('a[href]');
Array.from(links).map(link => ({
  text: link.textContent.trim(),
  href: link.href,
  target: link.target || '_self'
}));`
        },
        'extractImages': {
          name: 'Extract Image Information',
          description: 'Get all images with their properties',
          code: `// Extract all images with their properties
const images = document.querySelectorAll('img');
Array.from(images).map(img => ({
  src: img.src,
  alt: img.alt,
  width: img.naturalWidth,
  height: img.naturalHeight,
  loaded: img.complete
}));`
        }
      },
      'analysis': {
        'pageStats': {
          name: 'Page Statistics',
          description: 'Get comprehensive page statistics',
          code: `// Comprehensive page analysis
const stats = {
  title: document.title,
  url: window.location.href,
  domain: window.location.hostname,
  elements: document.querySelectorAll('*').length,
  links: document.querySelectorAll('a').length,
  images: document.querySelectorAll('img').length,
  forms: document.querySelectorAll('form').length,
  scripts: document.querySelectorAll('script').length,
  stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length,
  viewport: {
    width: window.innerWidth,
    height: window.innerHeight
  },
  scrollPosition: {
    x: window.scrollX,
    y: window.scrollY
  }
};
stats;`
        },
        'findForms': {
          name: 'Analyze Forms',
          description: 'Get detailed form information',
          code: `// Analyze all forms on the page
const forms = document.querySelectorAll('form');
Array.from(forms).map(form => ({
  action: form.action,
  method: form.method,
  name: form.name,
  id: form.id,
  fields: Array.from(form.querySelectorAll('input, select, textarea')).map(field => ({
    name: field.name,
    type: field.type,
    value: field.value,
    required: field.required
  }))
}));`
        }
      }
    }
  }

  async executeScript() {
    const code = document.getElementById('codeEditor').value.trim()
    if (!code) return

    const timing = document.getElementById('executionTiming').value

    try {
      if (timing === EXECUTION_TIMING.IMMEDIATE) {
        // Execute immediately in current page
        const response = await this.messageHandler.sendMessage('executeScript', { script: code })

        if (response && response.success) {
          // Store the result for formatting and export
          this.lastScriptResult = response.result
          this.addOutput(response.result)

          // Enable export button if there's a result
          const exportBtn = document.getElementById('exportOutput')
          if (exportBtn) exportBtn.disabled = false
        } else {
          this.addOutput(`Error: ${response.error}`, TOAST_TYPES.ERROR)
        }
      } else if (timing === 'onload') {
        // Store script to execute on next page load
        await this.saveScriptForLater(code, 'onload')
        this.addOutput('Script saved to execute on next page load', TOAST_TYPES.INFO)
      } else if (timing === EXECUTION_TIMING.PERSISTENT) {
        // Store script to auto-execute on tab switch
        await this.saveScriptForLater(code, EXECUTION_TIMING.PERSISTENT)
        this.addOutput('Script saved for auto-execution on tab switch', TOAST_TYPES.INFO)
      }
    } catch (error) {
      this.addOutput(`Error: ${error.message}`, TOAST_TYPES.ERROR)
    }
  }

  async saveScriptForLater(script, timing) {
    try {
      const key = timing === 'onload' ? 'onloadScript' : 'persistentScript'
      await chrome.storage.local.set({ [key]: script })
    } catch (error) {
      console.error('Error saving script:', error)
      throw error
    }
  }

  async executePersistentScript() {
    try {
      const result = await chrome.storage.local.get(['persistentScript'])
      if (result.persistentScript) {
        const response = await this.messageHandler.sendMessage('executeScript', { script: result.persistentScript })
        if (response && response.success) {
          // Store the result for formatting and export
          this.lastScriptResult = response.result
          this.addOutput(`Auto-executed: ${response.result}`, TOAST_TYPES.INFO)

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

  addOutput(content, type = 'log') {
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

  clearConsole() {
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
        if (scriptsByCategory[category].length > 0) {
          const optgroup = document.createElement('optgroup')
          optgroup.label = category
          scriptSelect.appendChild(optgroup)

          scriptsByCategory[category]
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(script => {
              const option = document.createElement('option')
              option.value = script.id
              option.textContent = `${script.name} (${script.useCount} uses)`
              option.title = script.description
              optgroup.appendChild(option)
            })
        }
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
    const category = document.getElementById('templateCategory').value
    const scriptKey = document.getElementById('templateScript').value

    if (!category || !scriptKey) {
      showToast('Please select a category and script', TOAST_TYPES.ERROR)
      return
    }

    const codeEditor = document.getElementById('codeEditor')

    try {
      if (category === 'saved') {
        // Load saved script by ID
        await this.loadSavedScript(scriptKey, codeEditor)
      } else if (this.scriptTemplates[category] && this.scriptTemplates[category][scriptKey]) {
        // Load built-in template
        const template = this.scriptTemplates[category][scriptKey]
        codeEditor.value = template.code

        // Show template info in console
        this.addOutput(`📝 Loaded template: ${template.name}`, TOAST_TYPES.INFO)
        this.addOutput(`Description: ${template.description}`, TOAST_TYPES.INFO)

        showToast(`Template "${template.name}" loaded`, TOAST_TYPES.SUCCESS)
      } else {
        throw new Error('Template not found')
      }
    } catch (error) {
      console.error('Error loading template:', error)
      showToast(`Error loading template: ${error.message}`, TOAST_TYPES.ERROR)
    }
  }

  async loadSavedScript(scriptId, codeEditor) {
    try {
      const result = await chrome.storage.local.get(['savedScripts'])
      const savedScripts = result.savedScripts || []
      const script = savedScripts.find(s => s.id === scriptId)

      if (!script) {
        throw new Error('Saved script not found')
      }

      // Load script code
      codeEditor.value = script.code

      // Update use count
      script.useCount = (script.useCount || 0) + 1
      script.lastUsed = Date.now()
      await chrome.storage.local.set({ savedScripts })

      // Show script info in console
      this.addOutput(`📚 Loaded saved script: ${script.name}`, TOAST_TYPES.INFO)
      if (script.description) {
        this.addOutput(`Description: ${script.description}`, TOAST_TYPES.INFO)
      }
      this.addOutput(`Category: ${script.category} | Uses: ${script.useCount} | Created: ${new Date(script.created).toLocaleDateString()}`, TOAST_TYPES.INFO)

      showToast(`Script "${script.name}" loaded`, TOAST_TYPES.SUCCESS)
    } catch (error) {
      console.error('Error loading saved script:', error)
      throw new Error('Failed to load saved script')
    }
  }

  saveScript() {
    const code = document.getElementById('codeEditor').value.trim()
    if (!code) {
      showToast('No code to save', TOAST_TYPES.ERROR)
      return
    }

    this.showSaveScriptModal()
  }

  showSaveScriptModal() {
    const formFields = [
      {
        id: 'scriptName',
        label: 'Script Name',
        type: 'text',
        required: true,
        placeholder: 'Enter script name...',
        help: 'A descriptive name for your script'
      },
      {
        id: 'scriptDescription',
        label: 'Description',
        type: 'textarea',
        placeholder: 'What does this script do?',
        rows: 3,
        help: 'Optional description of the script\'s purpose'
      },
      {
        id: 'scriptCategory',
        label: 'Category',
        type: 'text',
        value: 'Custom',
        required: true,
        placeholder: 'e.g., DOM, Data, Analysis...',
        help: 'Category for organizing scripts'
      }
    ]

    this.modalManager.showFormModal(
      'Save Script',
      formFields,
      (formData) => {
        const code = document.getElementById('codeEditor').value.trim()
        this.handleSaveScript(formData, code)
      },
      { submitText: 'Save Script' }
    )
  }

  async handleSaveScript(formData, code) {
    try {
      const { scriptName, scriptDescription, scriptCategory } = formData

      // Get existing saved scripts
      const result = await chrome.storage.local.get(['savedScripts'])
      const savedScripts = result.savedScripts || []

      // Create new script object
      const script = {
        id: 'script_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name: scriptName,
        description: scriptDescription || '',
        category: scriptCategory,
        code: code,
        created: Date.now(),
        lastUsed: null,
        useCount: 0
      }

      // Add to saved scripts
      savedScripts.push(script)
      await chrome.storage.local.set({ savedScripts })

      // Show success message
      this.addOutput(`💾 Script "${script.name}" saved successfully!`, TOAST_TYPES.INFO)
      showToast(`Script "${script.name}" saved!`, TOAST_TYPES.SUCCESS)

      // Refresh the script library if we're on saved category
      this.refreshScriptLibrary()
    } catch (error) {
      console.error('Error saving script:', error)
      throw error // Re-throw to prevent modal from closing
    }
  }

  async refreshScriptLibrary() {
    // Refresh saved scripts in the template selector if "saved" category is selected
    const categorySelect = document.getElementById('templateCategory')
    const scriptSelect = document.getElementById('templateScript')

    if (categorySelect.value === 'saved') {
      await this.loadSavedScriptsToSelector(scriptSelect)
    }
  }

  handleOutputFormatChange(format) {
    const outputContent = document.getElementById('outputContent')

    if (!this.lastScriptResult) {
      outputContent.innerHTML = '<div class="output-empty">No data to format. Execute a script first.</div>'
      return
    }

    try {
      switch (format) {
        case OUTPUT_FORMATS.JSON:
          this.formatAsJSON(this.lastScriptResult, outputContent)
          break
        case OUTPUT_FORMATS.TABLE:
          this.formatAsTable(this.lastScriptResult, outputContent)
          break
        case OUTPUT_FORMATS.HTML:
          this.formatAsHTML(this.lastScriptResult, outputContent)
          break
        case OUTPUT_FORMATS.TEXT:
        default:
          this.formatAsText(this.lastScriptResult, outputContent)
          break
      }
    } catch (error) {
      outputContent.innerHTML = `<div class="error">Error formatting output: ${error.message}</div>`
    }

    // Enable export button if there's content
    document.getElementById('exportOutput').disabled = false
  }

  formatAsJSON(data, container) {
    try {
      const jsonString = JSON.stringify(data, null, 2)
      container.innerHTML = `<pre class="json-output">${escapeHtml(jsonString)}</pre>`
    } catch (error) {
      container.innerHTML = `<div class="error">Error formatting as JSON: ${error.message}</div>`
    }
  }

  formatAsTable(data, container) {
    try {
      if (!Array.isArray(data)) {
        // Convert single object to array
        data = [data]
      }

      if (data.length === 0) {
        container.innerHTML = '<div class="empty">No data to display</div>'
        return
      }

      // Get all unique keys from all objects
      const allKeys = [...new Set(data.flatMap(item =>
        typeof item === 'object' && item !== null ? Object.keys(item) : ['value']
      ))]

      let html = '<table class="data-table"><thead><tr>'
      allKeys.forEach(key => {
        html += `<th>${escapeHtml(String(key))}</th>`
      })
      html += '</tr></thead><tbody>'

      data.forEach(item => {
        html += '<tr>'
        allKeys.forEach(key => {
          const value = typeof item === 'object' && item !== null ? item[key] : item
          html += `<td>${escapeHtml(String(value ?? ''))}</td>`
        })
        html += '</tr>'
      })

      html += '</tbody></table>'
      container.innerHTML = html
    } catch (error) {
      container.innerHTML = `<div class="error">Error formatting as table: ${error.message}</div>`
    }
  }

  formatAsHTML(data, container) {
    try {
      const htmlString = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
      container.innerHTML = `<div class="html-preview">${htmlString}</div>`
    } catch (error) {
      container.innerHTML = `<div class="error">Error formatting as HTML: ${error.message}</div>`
    }
  }

  formatAsText(data, container) {
    const textContent = typeof data === 'object' ?
      JSON.stringify(data, null, 2) : String(data)
    container.innerHTML = `<pre class="text-output">${escapeHtml(textContent)}</pre>`
  }

  async exportOutputData() {
    try {
      if (!this.lastScriptResult) {
        showToast('No data to export', TOAST_TYPES.ERROR)
        return
      }

      const format = document.getElementById('outputFormat').value
      let exportData
      let filename
      let mimeType

      switch (format) {
        case OUTPUT_FORMATS.JSON:
          exportData = JSON.stringify(this.lastScriptResult, null, 2)
          filename = `script-output-${Date.now()}.json`
          mimeType = 'application/json'
          break

        case OUTPUT_FORMATS.TABLE:
          if (Array.isArray(this.lastScriptResult)) {
            exportData = this.arrayToCSV(this.lastScriptResult)
            filename = `script-output-${Date.now()}.csv`
            mimeType = 'text/csv'
          } else {
            // Convert single object to CSV
            const arrayData = [this.lastScriptResult]
            exportData = this.arrayToCSV(arrayData)
            filename = `script-output-${Date.now()}.csv`
            mimeType = 'text/csv'
          }
          break

        case OUTPUT_FORMATS.HTML:
          const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Script Output Export</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
    .timestamp { color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Script Output Export</h1>
  <div class="timestamp">Exported: ${new Date().toLocaleString()}</div>
  <h2>Data:</h2>
  <pre>${escapeHtml(JSON.stringify(this.lastScriptResult, null, 2))}</pre>
</body>
</html>`
          exportData = htmlContent
          filename = `script-output-${Date.now()}.html`
          mimeType = 'text/html'
          break

        case OUTPUT_FORMATS.TEXT:
        default:
          exportData = typeof this.lastScriptResult === 'object' ?
            JSON.stringify(this.lastScriptResult, null, 2) : String(this.lastScriptResult)
          filename = `script-output-${Date.now()}.txt`
          mimeType = 'text/plain'
          break
      }

      // Create and download file
      const blob = new Blob([exportData], { type: mimeType })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      showToast(`Data exported as ${filename}`, TOAST_TYPES.SUCCESS)
    } catch (error) {
      console.error('Export error:', error)
      showToast(`Export failed: ${error.message}`, 'error')
    }
  }

  arrayToCSV(arrayData) {
    if (!Array.isArray(arrayData) || arrayData.length === 0) {
      return 'No data'
    }

    // Get all unique keys from all objects
    const allKeys = [...new Set(arrayData.flatMap(item =>
      typeof item === 'object' && item !== null ? Object.keys(item) : ['value']
    ))]

    // Create header row
    const csvRows = [allKeys.map(key => `"${String(key).replace(/"/g, '""')}"`).join(',')]

    // Create data rows
    arrayData.forEach(item => {
      const row = allKeys.map(key => {
        const value = typeof item === 'object' && item !== null ? item[key] : item
        const stringValue = String(value ?? '')
        return `"${stringValue.replace(/"/g, '""')}"`
      })
      csvRows.push(row.join(','))
    })

    return csvRows.join('\n')
  }

  getScriptTemplates() {
    return this.scriptTemplates
  }

  getLastScriptResult() {
    return this.lastScriptResult
  }
}