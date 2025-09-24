// Script Console Manager Component for 1nsp3ct0rG4dg3t Extension

import { showToast, escapeHtml } from '../utils/ui-helpers.js'
import { EXECUTION_TIMING, OUTPUT_FORMATS, TOAST_TYPES } from '../utils/constants.js'

export class ScriptConsoleManager {
  constructor(messageHandler, modalManager) {
    this.messageHandler = messageHandler
    this.modalManager = modalManager
    this.lastScriptResult = null
    this.scriptTemplates = this.initializeTemplates()
    this.activeEventListeners = new Map() // Track active event listeners
    this.setupEventHandlers()
  }

  setupEventHandlers() {
    // Handle execution timing changes to show/hide event options
    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('executionTiming')?.addEventListener('change', (e) => {
        this.handleExecutionTimingChange(e.target.value)
      })

      // Handle event target changes to show/hide custom selector
      document.getElementById('eventTarget')?.addEventListener('change', (e) => {
        this.handleEventTargetChange(e.target.value)
      })

      // Handle file upload
      document.getElementById('uploadScript')?.addEventListener('click', () => {
        this.handleScriptUpload()
      })

      // Handle file input change
      document.getElementById('scriptFileInput')?.addEventListener('change', (e) => {
        this.processUploadedFiles(e.target.files)
      })

      // Handle event management
      document.getElementById('clearAllEvents')?.addEventListener('click', () => {
        this.clearAllEventListeners()
      })

      document.getElementById('refreshEvents')?.addEventListener('click', () => {
        this.refreshEventList()
      })
    })
  }

  handleExecutionTimingChange(timing) {
    const eventOptions = document.getElementById('eventOptions')
    const eventManagement = document.getElementById('eventManagement')

    if (timing === 'onevent') {
      if (eventOptions) eventOptions.style.display = 'flex'
      if (eventManagement) eventManagement.style.display = 'block'
    } else {
      if (eventOptions) eventOptions.style.display = 'none'
      if (eventManagement) eventManagement.style.display = 'none'
    }
  }

  handleEventTargetChange(target) {
    const customSelector = document.getElementById('customSelector')
    if (target === 'custom') {
      if (customSelector) {
        customSelector.style.display = 'block'
        customSelector.focus()
      }
    } else {
      if (customSelector) customSelector.style.display = 'none'
    }
  }

  handleScriptUpload() {
    const fileInput = document.getElementById('scriptFileInput')
    if (fileInput) fileInput.click()
  }

  async processUploadedFiles(files) {
    if (!files || files.length === 0) return

    const results = []
    for (const file of files) {
      try {
        const content = await this.readFileContent(file)
        const scriptInfo = this.parseScriptMetadata(content, file.name)
        results.push({ ...scriptInfo, content, file })
      } catch (error) {
        console.error(`Error reading file ${file.name}:`, error)
        results.push({ error: error.message, file })
      }
    }

    this.showUploadResults(results)
  }

  readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target.result)
      reader.onerror = e => reject(new Error(`Failed to read file: ${e.target.error}`))
      reader.readAsText(file)
    })
  }

  parseScriptMetadata(content, filename) {
    const metadata = {
      name: filename.replace(/\.(js|txt)$/i, ''),
      description: '',
      category: 'Uploaded',
      author: ''
    }

    // Look for metadata in comments
    const metadataRegex = /\/\*\*?([\s\S]*?)\*\//
    const match = content.match(metadataRegex)

    if (match) {
      const comment = match[1]

      // Extract @name
      const nameMatch = comment.match(/@name\s+(.+)/i)
      if (nameMatch) metadata.name = nameMatch[1].trim()

      // Extract @description
      const descMatch = comment.match(/@description\s+([\s\S]*?)(?=@|$)/i)
      if (descMatch) metadata.description = descMatch[1].trim().replace(/\n\s*\*\s*/g, ' ')

      // Extract @category
      const catMatch = comment.match(/@category\s+(.+)/i)
      if (catMatch) metadata.category = catMatch[1].trim()

      // Extract @author
      const authorMatch = comment.match(/@author\s+(.+)/i)
      if (authorMatch) metadata.author = authorMatch[1].trim()
    }

    return metadata
  }

  showUploadResults(results) {
    const successfulUploads = results.filter(r => !r.error)
    const failedUploads = results.filter(r => r.error)

    let html = '<h4>Script Upload Results</h4>'

    if (successfulUploads.length > 0) {
      html += `<div class="upload-success">
        <h5>✅ Successfully loaded ${successfulUploads.length} script(s):</h5>
        <ul>`

      successfulUploads.forEach(script => {
        html += `<li>
          <strong>${escapeHtml(script.name)}</strong>
          ${script.description ? `<br><small>${escapeHtml(script.description)}</small>` : ''}
          <br><small>Category: ${escapeHtml(script.category)}</small>
        </li>`
      })

      html += '</ul></div>'
    }

    if (failedUploads.length > 0) {
      html += `<div class="upload-error">
        <h5>❌ Failed to load ${failedUploads.length} script(s):</h5>
        <ul>`

      failedUploads.forEach(result => {
        html += `<li>${escapeHtml(result.file.name)}: ${escapeHtml(result.error)}</li>`
      })

      html += '</ul></div>'
    }

    this.modalManager.showModal(
      'Script Upload Results',
      html,
      successfulUploads.length > 0 ? () => this.saveUploadedScripts(successfulUploads) : null,
      {
        confirmText: successfulUploads.length > 0 ? 'Save Scripts' : 'Close',
        cancelText: successfulUploads.length > 0 ? 'Cancel' : null,
        hideConfirm: successfulUploads.length === 0
      }
    )
  }

  async saveUploadedScripts(scripts) {
    try {
      const result = await chrome.storage.local.get(['savedScripts'])
      const savedScripts = result.savedScripts || []

      scripts.forEach(scriptInfo => {
        const script = {
          id: 'script_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11),
          name: scriptInfo.name,
          description: scriptInfo.description,
          category: scriptInfo.category,
          author: scriptInfo.author,
          code: scriptInfo.content,
          created: Date.now(),
          lastUsed: null,
          useCount: 0,
          source: 'uploaded'
        }
        savedScripts.push(script)
      })

      await chrome.storage.local.set({ savedScripts })

      showToast(`${scripts.length} script(s) saved successfully!`, TOAST_TYPES.SUCCESS)
      this.refreshScriptLibrary()

      // Show success in console
      this.addOutput(`📁 Uploaded and saved ${scripts.length} script(s)`, TOAST_TYPES.INFO)
    } catch (error) {
      console.error('Error saving uploaded scripts:', error)
      showToast(`Error saving scripts: ${error.message}`, TOAST_TYPES.ERROR)
    }
  }

  async setupEventBasedExecution(code) {
    try {
      const eventType = document.getElementById('eventType').value
      const eventTarget = document.getElementById('eventTarget').value
      let targetSelector = eventTarget

      if (eventTarget === 'custom') {
        const customSelector = document.getElementById('customSelector').value.trim()
        if (!customSelector) {
          throw new Error('Custom selector is required when using custom target')
        }
        targetSelector = customSelector
      }

      const eventId = 'event_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8)
      const eventListener = {
        id: eventId,
        eventType: eventType,
        target: targetSelector,
        script: code,
        created: Date.now(),
        active: true
      }

      // Send to content script to set up the actual event listener
      const response = await this.messageHandler.sendMessage('addEventListener', {
        eventListener
      })

      if (response && response.success) {
        // Store in local tracking
        this.activeEventListeners.set(eventId, eventListener)

        // Update UI
        this.addOutput(`🎯 Event listener set up: ${eventType} on ${targetSelector}`, TOAST_TYPES.INFO)
        this.refreshEventList()
        showToast(`Event listener created for ${eventType} events`, TOAST_TYPES.SUCCESS)
      } else {
        throw new Error(response?.error || 'Failed to set up event listener')
      }
    } catch (error) {
      console.error('Error setting up event-based execution:', error)
      this.addOutput(`Error setting up event listener: ${error.message}`, TOAST_TYPES.ERROR)
      showToast(`Error: ${error.message}`, TOAST_TYPES.ERROR)
    }
  }

  async clearAllEventListeners() {
    try {
      const response = await this.messageHandler.sendMessage('clearAllEventListeners')

      if (response && response.success) {
        this.activeEventListeners.clear()
        this.refreshEventList()
        this.addOutput('🗑️ All event listeners cleared', TOAST_TYPES.INFO)
        showToast('All event listeners removed', TOAST_TYPES.SUCCESS)
      } else {
        throw new Error(response?.error || 'Failed to clear event listeners')
      }
    } catch (error) {
      console.error('Error clearing event listeners:', error)
      showToast(`Error: ${error.message}`, TOAST_TYPES.ERROR)
    }
  }

  async refreshEventList() {
    try {
      // Get current event listeners from content script
      const response = await this.messageHandler.sendMessage('getEventListeners')

      if (response && response.success) {
        const eventList = document.getElementById('eventList')
        const listeners = response.listeners || []

        if (listeners.length === 0) {
          eventList.innerHTML = '<div class="event-empty">No active event listeners. Set up event-based script execution to see them here.</div>'
          return
        }

        let html = ''
        listeners.forEach(listener => {
          html += `
            <div class="event-listener-item" data-id="${listener.id}">
              <div class="event-info">
                <div class="event-title">
                  <strong>${listener.eventType}</strong> on <code>${listener.target}</code>
                  <span class="event-status ${listener.active ? 'active' : 'inactive'}">${listener.active ? 'Active' : 'Inactive'}</span>
                </div>
                <div class="event-script-preview">${this.truncateScript(listener.script)}</div>
                <div class="event-meta">Created: ${new Date(listener.created).toLocaleString()}</div>
              </div>
              <div class="event-actions">
                <button class="btn btn-tiny event-toggle" data-id="${listener.id}" title="${listener.active ? 'Disable' : 'Enable'} Event Listener">
                  ${listener.active ? '⏸️' : '▶️'}
                </button>
                <button class="btn btn-tiny event-remove" data-id="${listener.id}" title="Remove Event Listener">🗑️</button>
              </div>
            </div>
          `
        })

        eventList.innerHTML = html

        // Add event handlers for the buttons
        this.attachEventListenerHandlers()
      }
    } catch (error) {
      console.error('Error refreshing event list:', error)
      const eventList = document.getElementById('eventList')
      eventList.innerHTML = '<div class="event-error">Error loading event listeners</div>'
    }
  }

  truncateScript(script, maxLength = 100) {
    if (script.length <= maxLength) return script
    return script.substring(0, maxLength) + '...'
  }

  attachEventListenerHandlers() {
    // Toggle event listener
    document.querySelectorAll('.event-toggle').forEach(button => {
      button.addEventListener('click', async (e) => {
        const listenerId = e.target.dataset.id
        await this.toggleEventListener(listenerId)
      })
    })

    // Remove event listener
    document.querySelectorAll('.event-remove').forEach(button => {
      button.addEventListener('click', async (e) => {
        const listenerId = e.target.dataset.id
        await this.removeEventListener(listenerId)
      })
    })
  }

  async toggleEventListener(listenerId) {
    try {
      const response = await this.messageHandler.sendMessage('toggleEventListener', {
        listenerId
      })

      if (response && response.success) {
        this.refreshEventList()
        showToast('Event listener toggled', TOAST_TYPES.SUCCESS)
      } else {
        throw new Error(response?.error || 'Failed to toggle event listener')
      }
    } catch (error) {
      console.error('Error toggling event listener:', error)
      showToast(`Error: ${error.message}`, TOAST_TYPES.ERROR)
    }
  }

  async removeEventListener(listenerId) {
    try {
      const response = await this.messageHandler.sendMessage('removeEventListener', {
        listenerId
      })

      if (response && response.success) {
        this.activeEventListeners.delete(listenerId)
        this.refreshEventList()
        this.addOutput(`🗑️ Event listener removed`, TOAST_TYPES.INFO)
        showToast('Event listener removed', TOAST_TYPES.SUCCESS)
      } else {
        throw new Error(response?.error || 'Failed to remove event listener')
      }
    } catch (error) {
      console.error('Error removing event listener:', error)
      showToast(`Error: ${error.message}`, TOAST_TYPES.ERROR)
    }
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
      },
      'injection': {
        'formAutoFill': {
          name: 'Auto-Fill Forms',
          description: 'Automatically fill forms with test data',
          code: `// Auto-fill all forms on the page with test data
const forms = document.querySelectorAll('form');
const testData = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  address: '123 Main St',
  city: 'New York',
  zip: '10001',
  company: 'Test Company'
};

forms.forEach(form => {
  const inputs = form.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    const type = input.type?.toLowerCase();
    const name = input.name?.toLowerCase();
    const placeholder = input.placeholder?.toLowerCase();

    if (type === 'text' || type === 'email' || !type) {
      if (name?.includes('email') || placeholder?.includes('email')) {
        input.value = testData.email;
      } else if (name?.includes('phone') || placeholder?.includes('phone')) {
        input.value = testData.phone;
      } else if (name?.includes('name')) {
        input.value = testData.name;
      } else {
        input.value = testData.name;
      }
    } else if (type === 'tel') {
      input.value = testData.phone;
    } else if (type === 'email') {
      input.value = testData.email;
    }
  });
});

console.log(\`Filled \${forms.length} forms with test data\`);`
        },
        'styleInjector': {
          name: 'CSS Style Injector',
          description: 'Inject custom CSS styles into the page',
          code: `// Inject custom CSS styles
const styles = \`
  .inspector-highlight {
    border: 2px solid #ff0000 !important;
    background-color: rgba(255, 0, 0, 0.1) !important;
  }

  .inspector-debug {
    outline: 1px dashed #00ff00 !important;
  }

  .inspector-hidden {
    display: none !important;
  }
\`;

// Remove existing style if it exists
const existingStyle = document.getElementById('inspector-custom-styles');
if (existingStyle) {
  existingStyle.remove();
}

// Create and inject new style
const styleElement = document.createElement('style');
styleElement.id = 'inspector-custom-styles';
styleElement.textContent = styles;
document.head.appendChild(styleElement);

console.log('Custom styles injected successfully');`
        },
        'elementModifier': {
          name: 'Element Modifier',
          description: 'Modify elements on the page',
          code: `// Example: Hide all ads and promotional content
const adSelectors = [
  '[class*="ad-"]',
  '[id*="ad-"]',
  '[class*="advertisement"]',
  '[class*="promo"]',
  '.banner',
  '.popup',
  '[class*="modal"]'
];

let hiddenCount = 0;
adSelectors.forEach(selector => {
  const elements = document.querySelectorAll(selector);
  elements.forEach(el => {
    el.style.display = 'none';
    hiddenCount++;
  });
});

// Also hide elements with ad-related text
const textElements = document.querySelectorAll('div, span, p');
textElements.forEach(el => {
  const text = el.textContent?.toLowerCase();
  if (text?.includes('advertisement') || text?.includes('sponsored')) {
    el.style.display = 'none';
    hiddenCount++;
  }
});

console.log(\`Hidden \${hiddenCount} promotional elements\`);`
        }
      },
      'automation': {
        'autoClicker': {
          name: 'Auto-Clicker',
          description: 'Automatically click elements at intervals',
          code: `// Auto-clicker - modify selector and interval as needed
const selector = 'button'; // Change to target specific buttons
const intervalMs = 2000; // 2 seconds
let clickCount = 0;
let maxClicks = 10; // Safety limit

const clickInterval = setInterval(() => {
  const elements = document.querySelectorAll(selector);
  if (elements.length > 0 && clickCount < maxClicks) {
    elements[0].click();
    clickCount++;
    console.log(\`Auto-clicked \${clickCount}/\${maxClicks}\`);
  } else {
    clearInterval(clickInterval);
    console.log('Auto-clicking stopped');
  }
}, intervalMs);

// To stop early: clearInterval(clickInterval);
console.log(\`Started auto-clicking \${selector} every \${intervalMs}ms\`);`
        },
        'formSubmitter': {
          name: 'Auto Form Submitter',
          description: 'Automatically submit forms after filling',
          code: `// Auto-submit forms (be careful with this!)
const forms = document.querySelectorAll('form');
let submittedCount = 0;

forms.forEach((form, index) => {
  setTimeout(() => {
    // Only submit if form has some filled inputs
    const filledInputs = form.querySelectorAll('input[value], textarea:not(:empty), select option:checked');

    if (filledInputs.length > 0) {
      console.log(\`Submitting form \${index + 1}\`);
      form.submit();
      submittedCount++;
    }
  }, index * 1000); // 1 second delay between submissions
});

console.log(\`Scheduled \${forms.length} forms for submission\`);`
        },
        'pageNavigator': {
          name: 'Page Navigator',
          description: 'Navigate through paginated content',
          code: `// Navigate through paginated content
const nextSelectors = [
  'a[href*="next"]',
  'button[class*="next"]',
  '.pagination .next',
  '[aria-label*="next" i]',
  'a:contains("Next")',
  'a:contains(">")'
];

let currentPage = 1;
const maxPages = 5; // Safety limit

function navigateNext() {
  if (currentPage >= maxPages) {
    console.log(\`Reached max page limit (\${maxPages})\`);
    return;
  }

  let nextButton = null;
  for (const selector of nextSelectors) {
    nextButton = document.querySelector(selector);
    if (nextButton) break;
  }

  if (nextButton && !nextButton.disabled) {
    console.log(\`Navigating to page \${currentPage + 1}\`);
    nextButton.click();
    currentPage++;

    // Wait for page load then continue
    setTimeout(navigateNext, 3000);
  } else {
    console.log('No more pages to navigate');
  }
}

// Start navigation
console.log('Starting automatic page navigation...');
navigateNext();`
        }
      },
      'debugging': {
        'eventLogger': {
          name: 'Event Logger',
          description: 'Log all events on selected elements',
          code: `// Log all events on elements (useful for debugging)
const targetSelector = '*'; // Change to specific selector
const eventsToLog = ['click', 'mouseenter', 'mouseleave', 'focus', 'blur', 'input', 'change'];

const elements = document.querySelectorAll(targetSelector);
const eventLog = [];

elements.forEach((element, index) => {
  eventsToLog.forEach(eventType => {
    element.addEventListener(eventType, (event) => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        event: eventType,
        element: element.tagName,
        id: element.id || null,
        className: element.className || null,
        target: event.target.tagName
      };

      eventLog.push(logEntry);
      console.log('Event:', logEntry);
    }, { passive: true });
  });
});

console.log(\`Event logging set up on \${elements.length} elements\`);
console.log('Use window.eventLog to access logged events');
window.eventLog = eventLog;`
        },
        'performanceMonitor': {
          name: 'Performance Monitor',
          description: 'Monitor page performance metrics',
          code: `// Monitor page performance
const observer = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  entries.forEach(entry => {
    console.log(\`Performance entry: \${entry.name} - \${entry.duration}ms\`);
  });
});

observer.observe({entryTypes: ['measure', 'navigation', 'resource', 'paint']});

// Get current performance metrics
const perfData = {
  navigation: performance.getEntriesByType('navigation')[0],
  paint: performance.getEntriesByType('paint'),
  resources: performance.getEntriesByType('resource').length,
  memory: performance.memory ? {
    used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
    total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
    limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
  } : null,
  timing: {
    loadTime: performance.now(),
    domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
    pageLoad: performance.timing.loadEventEnd - performance.timing.navigationStart
  }
};

console.log('Performance Monitor Started');
console.table(perfData);
window.perfData = perfData;`
        },
        'errorTracker': {
          name: 'Error Tracker',
          description: 'Track and log JavaScript errors',
          code: `// Track all JavaScript errors
const errors = [];
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Override console methods
console.error = function(...args) {
  const errorInfo = {
    type: 'console.error',
    message: args.join(' '),
    timestamp: new Date().toISOString(),
    stack: (new Error()).stack
  };
  errors.push(errorInfo);
  originalConsoleError.apply(console, args);
};

console.warn = function(...args) {
  const warningInfo = {
    type: 'console.warn',
    message: args.join(' '),
    timestamp: new Date().toISOString(),
    stack: (new Error()).stack
  };
  errors.push(warningInfo);
  originalConsoleWarn.apply(console, args);
};

// Track uncaught errors
window.addEventListener('error', (event) => {
  const errorInfo = {
    type: 'uncaught',
    message: event.message,
    filename: event.filename,
    line: event.lineno,
    column: event.colno,
    timestamp: new Date().toISOString(),
    stack: event.error?.stack
  };
  errors.push(errorInfo);
  console.log('Uncaught error tracked:', errorInfo);
});

// Track unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  const errorInfo = {
    type: 'unhandled-promise',
    message: event.reason?.message || event.reason,
    timestamp: new Date().toISOString(),
    stack: event.reason?.stack
  };
  errors.push(errorInfo);
  console.log('Unhandled promise rejection tracked:', errorInfo);
});

console.log('Error tracking started. Use window.errorLog to view errors.');
window.errorLog = errors;`
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
      } else if (timing === 'onevent') {
        // Set up event-based execution
        await this.setupEventBasedExecution(code)
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
        id: 'script_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11),
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