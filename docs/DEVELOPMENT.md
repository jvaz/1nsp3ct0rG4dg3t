# 1nsp3ct0rG4dg3t Development Guide

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- Chrome browser for testing (version 88+, Chrome 114+ recommended)
- Basic knowledge of Chrome extension development

### Installation
1. Clone or download the project
2. Install dependencies:
   ```bash
   npm install
   ```

### Development Workflow

#### Building the Extension
```bash
# Development build with watch mode
npm run dev

# Production build
npm run build

# Clean build directory
npm run clean
```

#### Code Quality
```bash
# Run ESLint
npm run lint

# Fix ESLint issues automatically
npm run lint:fix

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch
```

### Loading the Extension in Chrome

1. Build the extension:
   ```bash
   npm run build
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in top right)

4. Click "Load unpacked" and select the `dist` folder

5. The extension should now appear in your Chrome toolbar

## Project Structure

```
1nsp3ct0rG4dg3t/
├── src/                    # Source code
│   ├── panel/             # Panel UI (HTML, CSS, JS)
│   │   ├── components/    # Component modules
│   │   ├── services/      # Service layer
│   │   └── utils/         # Utility functions
│   ├── background.js      # Service worker
│   └── content-script.js  # Content script for page access
├── assets/               # Icons and static assets
├── docs/                 # Documentation
├── tests/                # Test files
├── dist/                 # Built extension (generated)
├── manifest.json         # Extension manifest
├── package.json          # Project dependencies
└── webpack.config.cjs    # Build configuration
```

### Source Code Structure

```
src/panel/
├── panel.html              # Main UI template
├── panel.css               # Styling with theme support
├── panel.js                # Main application controller
├── components/             # Modular components
│   ├── dashboard-manager.js    # Dashboard and pinned properties
│   ├── storage-manager.js      # localStorage/sessionStorage
│   ├── cookie-manager.js       # Cookie management
│   ├── modal-manager.js        # Modal system
│   └── json-viewer-modal.js    # JSON viewer component
├── services/
│   └── message-handler.js      # Chrome API communication
└── utils/
    ├── constants.js            # Application constants
    ├── ui-helpers.js           # UI utility functions
    ├── url-helpers.js          # URL validation and parsing
    └── validation.js           # Data validation utilities
```

## Current Implementation Status

### ✅ Production-Ready Features

**4-Tab Interface**:
- **Dashboard**: Pinned properties with organization modes and search
- **Storage**: Complete localStorage/sessionStorage CRUD operations
- **Cookies**: Full cookie management with security analysis
- **Application**: Page inspection with performance and security metrics

**Dashboard System**:
- Domain-specific property filtering
- Multiple organization modes (default, type, domain, alphabetical, custom)
- Drag-and-drop reordering in custom mode
- Universal search across all storage types
- Real-time property updates

**Storage Management**:
- Complete CRUD operations with validation
- JSON detection and pretty-print viewing
- Search and filtering capabilities
- Type detection and proper formatting
- Error handling with user-friendly messages

**Cookie Management**:
- Full cookie CRUD with all attributes support
- Security analysis (Secure, HttpOnly, SameSite warnings)
- Domain-specific filtering
- Chrome Cookies API integration via background script

**Application Inspector**:
- Page metadata (title, URL, protocol, charset, user agent)
- Performance metrics (DOM timing, paint metrics, memory usage)
- Security analysis (HTTPS status, mixed content, CSP detection)
- Framework detection (React, Vue, Angular, jQuery, etc.)

## Architecture Overview

### Chrome Extension Components

**1. Manifest V3 Configuration**:
- Service worker background script
- Content script injection with URL validation
- Chrome Side Panel API integration
- Minimal required permissions

**2. Background Script (background.js)**:
- Chrome API interactions (cookies, tabs, storage)
- Message routing between UI and content scripts
- Service worker lifecycle management
- Tab management and URL validation

**3. Content Script (content-script.js)**:
- Page storage access (localStorage/sessionStorage)
- Application metadata collection
- Performance metrics gathering
- Real-time storage change monitoring

**4. Side Panel UI (src/panel/)**:
- Modern Chrome Side Panel integration
- Component-based architecture
- Message-driven communication
- Dark/light theme support

### Component Architecture

**Main Controller (panel.js)**:
```javascript
class Inspector {
  constructor() {
    this.messageHandler = new MessageHandler()
    this.modalManager = new ModalManager()
    this.storageManager = new StorageManager(...)
    this.cookieManager = new CookieManager(...)
    this.dashboardManager = new DashboardManager(...)
  }
}
```

**Communication Pattern**:
```
Panel UI → MessageHandler → Background Script → Content Script → Web Page
   ↑                                                               │
   └─────────────── Response Flow ←──────────────────────────────┘
```

### Key Implementation Patterns

**Error Handling**:
```javascript
async function safeOperation(operation) {
  try {
    return await operation()
  } catch (error) {
    console.warn('Operation failed:', error.message)
    showToast(error.message, TOAST_TYPES.ERROR)
    return { error: error.message, data: null }
  }
}
```

**Smart URL Validation**:
```javascript
function isValidUrl(url) {
  return url && (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('file://')
  )
}
```

**Real-time Updates**:
```javascript
// Storage change monitoring
window.addEventListener('storage', (e) => {
  this.refreshStorageData()
})
```

## Development Guidelines

### Code Style

**JavaScript Standards**:
- ES6+ modules with import/export
- Modern async/await patterns
- Consistent error handling
- JSDoc comments for complex functions

**Component Structure**:
```javascript
export class ComponentManager {
  constructor(dependencies) {
    this.dependency = dependency
    this.initialize()
  }

  async initialize() {
    // Setup component
  }

  // Public methods
  async publicMethod() {}

  // Private methods
  #privateMethod() {}
}
```

**Naming Conventions**:
- Classes: PascalCase (`DashboardManager`)
- Methods: camelCase (`loadStorageData`)
- Constants: UPPER_SNAKE_CASE (`TOAST_TYPES`)
- Files: kebab-case (`dashboard-manager.js`)

### Security Best Practices

**Input Sanitization**:
```javascript
import { escapeHtml } from '../utils/ui-helpers.js'

function displayUserContent(content) {
  return escapeHtml(content)
}
```

**Safe JSON Handling**:
```javascript
function safeJsonParse(jsonString) {
  try {
    return JSON.parse(jsonString)
  } catch (error) {
    return null
  }
}
```

**CSP Compliance**:
- No inline scripts or eval()
- External resources loaded securely
- Dynamic content properly escaped

### Performance Optimization

**Lazy Loading**:
```javascript
switchTab(tabName) {
  if (tabName === 'cookies' && !this.cookiesLoaded) {
    this.cookieManager.loadCookies()
    this.cookiesLoaded = true
  }
}
```

**Debounced Operations**:
```javascript
const debouncedSearch = debounce((query) => {
  this.performSearch(query)
}, 300)
```

**Memory Management**:
- Event listener cleanup in component destruction
- Proper disposal of large data structures
- Efficient DOM manipulation

## Testing Strategy

### Unit Testing

**Framework**: Jest with jsdom environment

**Test Structure**:
```javascript
describe('StorageManager', () => {
  let storageManager

  beforeEach(() => {
    storageManager = new StorageManager(mockMessageHandler)
  })

  test('should parse JSON values correctly', () => {
    const result = storageManager.parseStorageValue('{"key": "value"}')
    expect(result).toEqual({ key: 'value' })
  })
})
```

**Chrome API Mocking**:
```javascript
// tests/setup.js
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  runtime: {
    sendMessage: jest.fn()
  }
}
```

### Manual Testing

**Development Testing Checklist**:
1. ✅ Extension loads without errors
2. ✅ All 4 tabs function properly
3. ✅ Storage CRUD operations work
4. ✅ Cookie management functions
5. ✅ Dashboard pinning/unpinning
6. ✅ Search functionality across tabs
7. ✅ Theme switching persists
8. ✅ Cross-tab synchronization

**Browser Compatibility Testing**:
- Chrome 88+ (minimum supported)
- Chrome 114+ (optimal experience with Side Panel)
- Different operating systems (Windows, macOS, Linux)
- Various screen sizes and zoom levels

## Debugging

### Development Tools

**Extension Debugging**:
1. **Side Panel Inspector**: Right-click extension icon → "Inspect side panel"
2. **Background Script**: `chrome://extensions/` → Extension details → "Inspect background script"
3. **Content Script**: Use browser DevTools on target page

**Console Debugging**:
```javascript
// Enable debug mode in development
const DEBUG = process.env.NODE_ENV === 'development'

function debugLog(message, data) {
  if (DEBUG) {
    console.log(`[1nsp3ct0rG4dg3t] ${message}`, data)
  }
}
```

### Common Issues & Solutions

**Build Issues**:
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

**Extension Loading Issues**:
- Verify `dist/` folder selected (not project root)
- Check manifest.json syntax
- Ensure Chrome version compatibility

**Runtime Issues**:
- Check browser console for errors
- Verify content script injection on target pages
- Test on different websites for compatibility

## Deployment

### Build Process

**Production Build**:
```bash
npm run build
```

**Build Output Verification**:
- Check `dist/` folder contains all necessary files
- Verify icon files are properly sized
- Test built extension in clean Chrome profile

### Chrome Web Store Preparation

**Manifest Validation**:
- All permissions justified and documented
- Proper version numbering
- Accurate description and metadata

**Asset Requirements**:
- PNG icons in required sizes (16, 32, 48, 128px)
- Screenshots for store listing
- Promotional images if needed

**Quality Assurance**:
- No console errors in production build
- All features working across different websites
- Performance validation on various devices

## Contributing

### Development Workflow

1. **Fork & Clone**: Create your own fork of the repository
2. **Branch**: Create feature branch from `main`
3. **Develop**: Implement changes with tests
4. **Test**: Run linting and tests
5. **Document**: Update relevant documentation
6. **Submit**: Create pull request with clear description

### Code Review Checklist

- ✅ Code follows established patterns
- ✅ New features include tests
- ✅ Documentation updated
- ✅ No console errors or warnings
- ✅ Performance impact considered
- ✅ Security implications reviewed

### Commit Guidelines

```
type(scope): brief description

- feat: new feature
- fix: bug fix
- docs: documentation changes
- style: code style changes
- refactor: code refactoring
- test: test additions/changes
- chore: maintenance tasks
```

## Resources

### Chrome Extension Documentation
- [Chrome Extension Overview](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Chrome APIs Reference](https://developer.chrome.com/docs/extensions/reference/)
- [Side Panel API](https://developer.chrome.com/docs/extensions/reference/sidePanel/)

### Project Documentation
- [Features Overview](./FEATURES.md)
- [Architecture Details](./ARCHITECTURE.md)
- [Installation Guide](./INSTALLATION.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

---

**Current Status**: The extension is production-ready with all core features implemented and thoroughly tested. Development focus is now on optimization and potential future enhancements.