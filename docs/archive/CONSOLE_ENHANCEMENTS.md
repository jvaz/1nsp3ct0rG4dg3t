# Console Tab Enhancement Plan

## Overview
Enhance the existing JavaScript Console tab to provide powerful code injection and web scraping capabilities for developers.

## Current Console Features ✅
- Basic textarea code editor
- Script execution (immediate, onload, persistent modes)
- Output display with error handling
- Save script functionality (basic)
- Clear console functionality

## Proposed Enhancements

### 1. Script Templates Library 🎯 **HIGH PRIORITY**

#### Injection Templates
```javascript
// Form Manipulation
templates.injection.fillForm = {
  name: "Auto-fill Form",
  description: "Automatically fill form fields with test data",
  code: `
const forms = document.querySelectorAll('form');
forms.forEach(form => {
  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    if (input.type === 'email') input.value = 'test@example.com';
    else if (input.type === 'password') input.value = 'password123';
    else if (input.type === 'text' && input.name.includes('name')) input.value = 'Test User';
    else if (input.type === 'number') input.value = '123';
    else if (input.tagName === 'SELECT') input.selectedIndex = 1;
  });
});
console.log('Forms auto-filled');`
};

// Event Listeners
templates.injection.addClickTracker = {
  name: "Track All Clicks",
  description: "Log all click events on the page",
  code: `
document.addEventListener('click', function(e) {
  console.log('Clicked:', e.target.tagName, e.target.className, e.target.textContent.substring(0, 50));
}, true);
console.log('Click tracking enabled');`
};

// API Interception
templates.injection.interceptFetch = {
  name: "Intercept Fetch Requests",
  description: "Monitor and log all fetch API calls",
  code: `
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('Fetch intercepted:', args[0]);
  return originalFetch.apply(this, arguments)
    .then(response => {
      console.log('Fetch response:', response.status, response.url);
      return response;
    });
};
console.log('Fetch interception enabled');`
};
```

#### Scraping Templates
```javascript
// Data Extraction
templates.scraping.extractTable = {
  name: "Extract Table Data",
  description: "Extract data from HTML tables",
  code: `
const tables = document.querySelectorAll('table');
const data = [];
tables.forEach(table => {
  const rows = Array.from(table.querySelectorAll('tr'));
  const tableData = rows.map(row =>
    Array.from(row.querySelectorAll('td, th')).map(cell => cell.textContent.trim())
  );
  data.push(tableData);
});
console.log('Extracted tables:', data);
return data;`
};

// Links and Media
templates.scraping.extractLinks = {
  name: "Extract All Links",
  description: "Get all links and their attributes",
  code: `
const links = Array.from(document.querySelectorAll('a')).map(link => ({
  text: link.textContent.trim(),
  href: link.href,
  target: link.target || '_self'
}));
console.log('Extracted links:', links.length);
return links;`
};

// Form Data
templates.scraping.extractForms = {
  name: "Extract Form Structure",
  description: "Analyze form fields and validation",
  code: `
const forms = Array.from(document.querySelectorAll('form')).map(form => ({
  action: form.action,
  method: form.method,
  fields: Array.from(form.elements).map(field => ({
    name: field.name,
    type: field.type,
    required: field.required,
    value: field.value
  }))
}));
console.log('Extracted forms:', forms);
return forms;`
};
```

### 2. Enhanced Code Editor 🎯 **HIGH PRIORITY**

#### Implementation Plan
```javascript
// Replace textarea with CodeMirror or Monaco Editor
const editorEnhancements = {
  syntaxHighlighting: {
    language: 'javascript',
    theme: 'vs-dark', // Matches extension theme
    features: ['autocompletion', 'error-highlighting', 'code-folding']
  },

  autocompletion: {
    domMethods: ['querySelector', 'querySelectorAll', 'getElementById', 'getElementsByClassName'],
    webAPIs: ['fetch', 'localStorage', 'sessionStorage', 'document.cookie'],
    extensionHelpers: ['extractTable()', 'extractLinks()', 'fillForm()', 'highlightElements()']
  },

  codeFormatting: {
    autoIndent: true,
    beautify: true,
    eslintIntegration: true
  }
};
```

### 3. DOM Selection Tools 🎯 **MEDIUM PRIORITY**

#### Visual Element Picker
```javascript
// Element selection overlay
const domPicker = {
  activateMode() {
    // Inject overlay for element picking
    const overlay = document.createElement('div');
    overlay.id = 'inspector-overlay';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,123,255,0.1); z-index: 999999; cursor: crosshair;
    `;

    overlay.addEventListener('mouseover', this.highlightElement);
    overlay.addEventListener('click', this.selectElement);
    document.body.appendChild(overlay);
  },

  highlightElement(e) {
    // Show element info tooltip
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (target && target !== e.target) {
      this.showElementInfo(target);
    }
  },

  selectElement(e) {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const selector = this.generateSelector(target);

    // Send selector back to console
    window.postMessage({
      type: 'ELEMENT_SELECTED',
      selector: selector,
      element: target.outerHTML.substring(0, 200)
    }, '*');

    this.deactivateMode();
  }
};
```

#### Selector Generators
```javascript
const selectorGenerator = {
  generateCSS(element) {
    // Generate unique CSS selector
    let path = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let selector = element.nodeName.toLowerCase();
      if (element.id) {
        selector += '#' + element.id;
        path.unshift(selector);
        break;
      }
      // Add class names, nth-child selectors, etc.
      path.unshift(selector);
      element = element.parentNode;
    }
    return path.join(' > ');
  },

  generateXPath(element) {
    // Generate XPath selector
    const path = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let index = 0;
      let hasFollowingSiblings = false;
      for (let sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === element.nodeName) {
          index++;
        }
      }
      const tagName = element.nodeName.toLowerCase();
      const pathIndex = index > 0 ? `[${index + 1}]` : '';
      path.unshift(tagName + pathIndex);
      element = element.parentNode;
    }
    return path.length ? '/' + path.join('/') : null;
  }
};
```

### 4. Advanced Output Display 🎯 **MEDIUM PRIORITY**

#### Enhanced Result Formatting
```javascript
const resultFormatter = {
  formatJSON(data) {
    return `<pre class="json-viewer">${JSON.stringify(data, null, 2)}</pre>`;
  },

  formatTable(arrayData) {
    if (!Array.isArray(arrayData) || arrayData.length === 0) return '';

    const headers = Object.keys(arrayData[0]);
    const rows = arrayData.map(row =>
      headers.map(header => row[header] || '').join('</td><td>')
    );

    return `
      <table class="result-table">
        <thead><tr><th>${headers.join('</th><th>')}</th></tr></thead>
        <tbody><tr><td>${rows.join('</td></tr><tr><td>')}</td></tr></tbody>
      </table>
    `;
  },

  formatHTML(htmlString) {
    return `<div class="html-preview">${htmlString}</div>`;
  }
};
```

#### Export Functionality
```javascript
const dataExporter = {
  exportJSON(data, filename = 'scraped-data.json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    this.downloadBlob(blob, filename);
  },

  exportCSV(arrayData, filename = 'scraped-data.csv') {
    if (!Array.isArray(arrayData) || arrayData.length === 0) return;

    const headers = Object.keys(arrayData[0]);
    const csvContent = [
      headers.join(','),
      ...arrayData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], {type: 'text/csv'});
    this.downloadBlob(blob, filename);
  },

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};
```

### 5. Script Management System 🎯 **LOW PRIORITY**

#### Save/Load Scripts
```javascript
const scriptLibrary = {
  categories: ['injection', 'scraping', 'debugging', 'automation', 'analysis'],

  async saveScript(name, code, category = 'custom') {
    const script = {
      id: Date.now(),
      name,
      code,
      category,
      created: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    };

    const stored = await chrome.storage.local.get(['savedScripts']);
    const scripts = stored.savedScripts || [];
    scripts.push(script);

    await chrome.storage.local.set({savedScripts: scripts});
    this.refreshScriptList();
  },

  async loadScript(scriptId) {
    const stored = await chrome.storage.local.get(['savedScripts']);
    const scripts = stored.savedScripts || [];
    const script = scripts.find(s => s.id === scriptId);

    if (script) {
      document.getElementById('codeEditor').value = script.code;
      script.lastUsed = new Date().toISOString();
      await chrome.storage.local.set({savedScripts: scripts});
    }
  }
};
```

## Implementation Roadmap

### Phase 1: Core Enhancements (Week 1)
1. ✅ **Script Templates Library**: Add pre-built injection and scraping templates
2. ✅ **Enhanced Code Editor**: Implement syntax highlighting and autocompletion
3. ✅ **Basic Export**: Add JSON/CSV export functionality

### Phase 2: Advanced Features (Week 2)
1. ✅ **DOM Selection Tools**: Visual element picker with selector generation
2. ✅ **Advanced Output**: Table view, JSON tree viewer, HTML preview
3. ✅ **Script Management**: Save/load custom scripts with categories

### Phase 3: Polish & Optimization (Week 3)
1. ✅ **Live Preview**: Real-time element highlighting during selection
2. ✅ **Safety Features**: Sandbox mode and rollback functionality
3. ✅ **Performance**: Optimize for large data sets and complex operations

## UI/UX Design Changes

### Console Layout Enhancement
```html
<!-- Enhanced Console Tab -->
<div class="console-enhanced">
  <div class="console-toolbar">
    <div class="template-selector">
      <select id="templateCategory">
        <option value="">Choose Template...</option>
        <option value="injection">Code Injection</option>
        <option value="scraping">Data Scraping</option>
        <option value="debugging">Debugging Tools</option>
      </select>
      <select id="templateScript" disabled>
        <option value="">Select Script...</option>
      </select>
      <button class="btn btn-small" id="loadTemplate">Load</button>
    </div>

    <div class="element-tools">
      <button class="btn btn-primary" id="selectElement">📌 Pick Element</button>
      <button class="btn btn-secondary" id="inspectMode">🔍 Inspect</button>
    </div>

    <div class="execution-controls">
      <select id="executionTiming">
        <option value="immediate">Execute Now</option>
        <option value="onload">On Page Load</option>
        <option value="persistent">Auto-execute</option>
      </select>
      <button class="btn btn-primary" id="executeScript">▶ Execute</button>
    </div>
  </div>

  <div class="console-main">
    <div class="editor-panel">
      <div class="editor-toolbar">
        <button class="btn btn-small" id="formatCode">🎨 Format</button>
        <button class="btn btn-small" id="clearEditor">🗑️ Clear</button>
        <button class="btn btn-small" id="saveScript">💾 Save</button>
      </div>
      <div id="codeEditor" class="code-editor-enhanced"></div>
    </div>

    <div class="output-panel">
      <div class="output-toolbar">
        <span class="output-title">Output:</span>
        <div class="output-controls">
          <select id="outputFormat">
            <option value="text">Text</option>
            <option value="json">JSON Tree</option>
            <option value="table">Table</option>
            <option value="html">HTML Preview</option>
          </select>
          <button class="btn btn-small" id="exportData">📤 Export</button>
          <button class="btn btn-small" id="clearOutput">🗑️ Clear</button>
        </div>
      </div>
      <div id="outputContent" class="output-enhanced"></div>
    </div>
  </div>
</div>
```

This enhancement plan transforms the Console tab into a powerful tool for both code injection and web scraping, providing developers with professional-grade capabilities while maintaining ease of use.