# 1nsp3ct0rG4dg3t Architecture

This document provides a detailed technical overview of the 1nsp3ct0rG4dg3t Chrome extension architecture.

## High-Level Architecture

```
┌─────────────────┐    ┌────────────────────┐    ┌─────────────────┐
│   Side Panel    │◄──►│  Background Script │◄──►│ Content Script  │
│     (UI)        │    │  (Service Worker)  │    │  (Page Context) │
└─────────────────┘    └────────────────────┘    └─────────────────┘
        │                         │                        │
        ▼                         ▼                        ▼
┌─────────────────┐    ┌────────────────────┐    ┌─────────────────┐
│  Panel HTML     │    │   Chrome APIs      │    │   Web Page      │
│  Panel CSS      │    │   - storage        │    │   - localStorage│
│  Panel JS       │    │   - cookies        │    │   - sessionStorage│
│  Components     │    │   - tabs           │    │   - DOM         │
└─────────────────┘    │   - scripting      │    │   - Window APIs │
                       └────────────────────┘    └─────────────────┘
```

## Chrome Extension Components

### 1. Manifest (manifest.json)

**Purpose**: Defines extension configuration, permissions, and entry points.

**Key Configuration**:
```json
{
  "manifest_version": 3,
  "permissions": [
    "activeTab",     // Access current tab
    "storage",       // Extension storage API
    "scripting",     // Script injection
    "cookies",       // Cookie management
    "sidePanel"      // Side panel API
  ],
  "host_permissions": ["http://*/*", "https://*/*"],
  "background": {
    "service_worker": "background.js"
  },
  "side_panel": {
    "default_path": "panel.html"
  }
}
```

### 2. Background Script (src/background.js)

**Purpose**: Service worker that handles extension lifecycle and Chrome API interactions.

**Key Responsibilities**:
- Message routing between UI and content scripts
- Chrome API calls (cookies, tabs, storage)
- Tab management and URL validation
- Service worker lifecycle management

**Architecture Pattern**:
```javascript
// Message routing system
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_COOKIES':
      return handleCookieRequest(message, sendResponse);
    case 'SET_COOKIE':
      return handleCookieSet(message, sendResponse);
    // ... other message types
  }
});
```

**Key Functions**:
- `getCurrentTab()`: Get active tab information
- `getCookies(domain)`: Retrieve cookies for domain
- `setCookie(cookieDetails)`: Create/update cookies
- `executeContentScript(tabId)`: Inject content script

### 3. Content Script (src/content-script.js)

**Purpose**: Runs in web page context to access page storage and DOM.

**Key Responsibilities**:
- localStorage/sessionStorage access
- Page metadata collection
- Performance metrics gathering
- Framework detection
- Real-time storage monitoring

**Injection Strategy**:
```javascript
// Smart URL validation before injection
const isValidUrl = (url) => {
  return url && (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('file://')
  );
};
```

**Storage Access Pattern**:
```javascript
// Safe storage access with error handling
function getStorageData(storageType) {
  try {
    const storage = window[storageType];
    if (!storage) return {};

    const data = {};
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      data[key] = storage.getItem(key);
    }
    return data;
  } catch (error) {
    console.warn(`Storage access failed: ${error.message}`);
    return {};
  }
}
```

### 4. Side Panel UI (src/panel/)

**Purpose**: Modern Chrome side panel interface for user interaction.

**Component Structure**:
```
src/panel/
├── panel.html          # Main UI template
├── panel.css           # Styling with theme support
├── panel.js            # Main application controller
├── components/         # Modular components
│   ├── dashboard-manager.js
│   ├── storage-manager.js
│   ├── cookie-manager.js
│   ├── modal-manager.js
│   └── json-viewer-modal.js
├── services/
│   └── message-handler.js
└── utils/
    ├── constants.js
    ├── ui-helpers.js
    ├── url-helpers.js
    └── validation.js
```

## Component Architecture

### Panel Component System

**Main Controller (panel.js)**:
```javascript
class Inspector {
  constructor() {
    // Initialize managers
    this.messageHandler = new MessageHandler();
    this.modalManager = new ModalManager();
    this.storageManager = new StorageManager(...);
    this.cookieManager = new CookieManager(...);
    this.dashboardManager = new DashboardManager(...);
  }
}
```

**Component Communication**:
- **Event-driven**: Components communicate via custom events
- **Shared State**: Common data through message handler
- **Cross-references**: Components can access each other when needed

### Manager Classes

**1. DashboardManager**:
- Handles pinned properties
- Manages organization modes
- Implements search functionality
- Coordinates with other managers

**2. StorageManager**:
- localStorage/sessionStorage CRUD
- Real-time storage monitoring
- Search and filtering
- JSON validation

**3. CookieManager**:
- Cookie CRUD operations
- Security analysis
- Domain filtering
- Chrome Cookies API integration

**4. ModalManager**:
- Centralized modal system
- Dynamic content injection
- Event handling
- Responsive modal sizing

**5. JsonViewerModal**:
- JSON pretty-printing
- Search within JSON
- Copy functionality
- Syntax highlighting

## Message Passing System

### Communication Flow

```
Panel UI → MessageHandler → Background Script → Content Script → Web Page
   ↑                                                                  │
   └──────────────── Response Flow ←─────────────────────────────────┘
```

### Message Types and Handlers

**Storage Operations**:
```javascript
// Panel → Content Script
{
  type: 'GET_STORAGE_DATA',
  storageType: 'localStorage' | 'sessionStorage'
}

// Content Script → Panel
{
  type: 'STORAGE_DATA_RESPONSE',
  data: { key1: 'value1', key2: 'value2' },
  error: null
}
```

**Cookie Operations**:
```javascript
// Panel → Background Script
{
  type: 'GET_COOKIES',
  domain: 'example.com'
}

// Background Script → Panel
{
  type: 'COOKIES_RESPONSE',
  cookies: [...],
  error: null
}
```

### Error Handling Strategy

**Graceful Degradation**:
```javascript
async function safeOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    console.warn('Operation failed:', error.message);
    return { error: error.message, data: null };
  }
}
```

## Data Management

### Chrome Storage Integration

**Extension Settings**:
```javascript
// Store pinned properties
chrome.storage.local.set({
  pinnedProperties: [
    { type: 'localStorage', key: 'authToken', domain: 'example.com' },
    { type: 'cookie', key: 'session', domain: '.example.com' }
  ]
});
```

**Real-time Sync**:
```javascript
// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.pinnedProperties) {
    this.refreshDashboard();
  }
});
```

### State Management

**Component State**:
- Each manager maintains its own state
- Shared state through MessageHandler
- Event-driven updates between components

**Data Flow**:
```
User Action → Component → MessageHandler → Chrome API → Response → UI Update
```

## Build System Architecture

### Webpack Configuration

**Entry Points**:
```javascript
{
  background: './src/background.js',
  'content-script': './src/content-script.js',
  panel: './src/panel/panel.js'
}
```

**Module Resolution**:
```javascript
resolve: {
  alias: {
    '@': path.resolve(__dirname, 'src')
  }
}
```

**Asset Handling**:
- HTML/CSS copying via CopyWebpackPlugin
- Icon assets copied to dist/assets/
- Source maps for development

### Build Targets

**Development**:
- Watch mode for rapid iteration
- Source maps for debugging
- Non-minified code

**Production**:
- Minified and optimized code
- Asset optimization
- Chrome Web Store ready

## Security Architecture

### Content Security Policy

**Extension Pages**:
```
script-src 'self'; object-src 'self'
```

**Security Measures**:
- No inline scripts or eval()
- Input sanitization for all user data
- Proper JSON parsing with error handling
- XSS prevention through HTML escaping

### Permission Model

**Minimal Permissions**:
- `activeTab`: Only current tab access
- `storage`: Extension storage only
- `cookies`: Cookie management
- `scripting`: Content script injection
- `sidePanel`: Modern UI integration

**Host Permissions**:
- `http://*/*` and `https://*/*` for universal compatibility
- No sensitive site exclusions needed

## Performance Considerations

### Optimization Strategies

**Lazy Loading**:
```javascript
// Load data only when tab becomes active
switchTab(tabName) {
  if (tabName === 'cookies' && !this.cookiesLoaded) {
    this.cookieManager.loadCookies();
    this.cookiesLoaded = true;
  }
}
```

**Debounced Operations**:
```javascript
// Prevent excessive API calls
const debouncedSearch = debounce((query) => {
  this.performSearch(query);
}, 300);
```

**Memory Management**:
- Event listener cleanup
- Proper component disposal
- Efficient DOM manipulation

### Scalability

**Large Datasets**:
- Virtual scrolling for large lists (ready to implement)
- Pagination for extensive cookie lists
- Search optimization with indexing

**Real-time Updates**:
- Efficient change detection
- Minimal DOM updates
- Background refresh without UI blocking

## Error Handling & Recovery

### Error Boundaries

**Component Level**:
```javascript
try {
  await this.performOperation();
} catch (error) {
  this.handleError(error);
  this.showUserFriendlyMessage();
}
```

**System Level**:
- Service worker restart handling
- Content script injection failures
- Permission denial graceful handling

### Logging Strategy

**Development**:
- Detailed console logging
- Error stack traces
- Performance timing logs

**Production**:
- User-friendly error messages
- Critical error logging only
- No sensitive data in logs

## Testing Architecture

### Unit Testing

**Framework**: Jest with jsdom environment
**Coverage**: Core utility functions and data processing
**Mocking**: Chrome APIs mocked in test environment

### Integration Testing

**Manual Testing Scenarios**:
- Extension loading and initialization
- Cross-tab communication
- Storage operations across different sites
- Theme switching and persistence

### End-to-End Testing

**Browser Testing**:
- Multiple Chrome versions
- Different operating systems
- Various website types and CSP configurations

## Deployment Architecture

### Chrome Web Store Preparation

**Manifest Validation**:
- All permissions justified
- Proper icon sizes and formats
- CSP compliance verification

**Asset Optimization**:
- Icon file size optimization
- Code minification
- Bundle size analysis

**Quality Assurance**:
- No console errors in production
- Proper error handling for edge cases
- Performance validation

---

This architecture provides a robust, scalable foundation for the 1nsp3ct0rG4dg3t extension while maintaining Chrome extension best practices and security standards.