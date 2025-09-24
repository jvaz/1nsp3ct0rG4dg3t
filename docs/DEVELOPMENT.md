# 1nsp3ct0rG4dg3t Development Guide

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- Chrome browser for testing
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

### Project Structure

```
1nsp3ct0rG4dg3t/
├── src/                    # Source code
│   ├── panel/             # Panel UI (HTML, CSS, JS)
│   │   └── components/    # Panel component modules
│   ├── background.js      # Service worker
│   ├── content-script.js  # Content script for page access
│   └── utils/            # Utility functions (future)
├── assets/               # Icons and static assets
├── tests/                # Test files
├── dist/                 # Built extension (generated)
├── manifest.json         # Extension manifest
├── package.json          # Project dependencies
├── webpack.config.js     # Build configuration
├── jest.config.js        # Test configuration
└── .eslintrc.js         # Linting configuration
```

## Current Implementation Status

### ✅ Fully Implemented Features

**Dashboard System**:
- Pinned properties with domain-specific filtering
- Drag-and-drop reordering (custom organization mode)
- Multiple organization modes: default, type, domain, alphabetical, custom
- Real-time property updates and automatic refresh
- Property aliasing for better readability

**Storage Management**:
- Complete CRUD operations for localStorage and sessionStorage
- Add/Edit/Delete functionality with comprehensive form validation
- Smart JSON validation with plain-text fallback
- Search and filtering capabilities
- Type detection and proper data formatting

**Cookie Management**:
- Full cookie CRUD with all attributes (secure, httpOnly, sameSite, etc.)
- Security analysis with warnings for insecure configurations
- Domain-specific cookie filtering
- Complete Chrome Cookies API integration

**JavaScript Console**:
- Script execution in page context with CSP bypass
- Multiple execution modes: immediate, onload, persistent
- Error handling and result formatting
- Output display with proper type formatting

**Technical Infrastructure**:
- Content script readiness handling with URL validation
- Smart loading system that handles all URL types
- Non-blocking initialization preventing startup delays
- Comprehensive error handling with user-friendly messages
- Robust message passing between panel, background, and content scripts

### Recent Major Fixes

1. **Content Script Error Elimination**: Fixed all "Content script not ready" errors by implementing smart URL validation and non-blocking loading patterns

2. **Universal URL Support**: Extension now properly handles chrome://, extension://, and file:// URLs with appropriate messaging

3. **CRUD Operation Stability**: All Add/Edit/Delete operations now work reliably with proper form validation and error recovery

4. **Cookie API Integration**: Fixed background script cookie operations with proper tabId handling and sameSite validation

5. **Dashboard Loading**: Resolved initialization issues where pinned items wouldn't display when extension opened on existing tabs

## Core Architecture

### Extension Components

1. **Manifest (manifest.json)**
   - Defines extension permissions and configuration
   - Uses Manifest V3 for modern Chrome compatibility

2. **Background Script (background.js)**
   - Service worker handling extension lifecycle
   - Manages communication between components
   - Handles Chrome API calls (cookies, tabs, etc.)

3. **Content Script (content-script.js)**
   - Runs in web page context
   - Provides access to page storage and DOM
   - Monitors storage changes in real-time

4. **Panel UI (src/panel/)**
   - Main user interface using Chrome Side Panel API
   - Tabbed interface for different features
   - Responsive design with dark/light themes

### Communication Flow

```
Panel UI ←→ Background Script ←→ Content Script ←→ Web Page
```

- Panel sends messages to background script
- Background script coordinates with content scripts
- Content scripts access page storage and execute scripts
- Real-time updates flow back through the chain

### Key Features Implementation

#### Storage Management
- **localStorage/sessionStorage**: Direct access via content script
- **Real-time monitoring**: Storage change listeners
- **CRUD operations**: Get, set, delete, clear storage items

#### Cookie Management
- **Chrome Cookies API**: Full access via background script
- **Security analysis**: Detect insecure cookie configurations
- **Cross-domain cookies**: Access cookies for current domain

#### Dashboard System
- **Pinned properties**: Save frequently accessed values
- **Custom layouts**: Drag-and-drop interface (planned)
- **Templates**: Save/load dashboard configurations

#### JavaScript Console
- **Script execution**: Run code in page context
- **Error handling**: Proper error reporting
- **Script library**: Save frequently used scripts (planned)

## Testing

### Unit Tests
- Jest framework with jsdom environment
- Chrome API mocking in test setup
- Test files should be named `*.test.js`

### Manual Testing
1. Load extension in Chrome
2. Navigate to test websites
3. Test storage operations
4. Verify cookie management
5. Test JavaScript execution

### Test Scenarios
**✅ All Currently Working**:
- localStorage/sessionStorage CRUD operations (Add/Edit/Delete)
- Cookie creation, modification, deletion with all attributes
- Script execution with immediate/onload/persistent modes
- Theme switching (dark/light)
- Tab navigation and content loading
- Search and filtering for storage items
- Dashboard pinning/unpinning and organization modes
- Content script handling across different URL types
- Error recovery and user-friendly messaging

## Development Tips

### Debugging
1. **Extension console**: Right-click extension icon → "Inspect side panel"
2. **Background script**: Go to `chrome://extensions/` → Extension details → "Inspect background script"
3. **Content script**: Use browser DevTools on any page
4. **Console messages**: Check browser console for errors

### Chrome Extension Gotchas
- **Manifest V3**: Uses service workers instead of background pages
- **CSP restrictions**: Limited inline scripts and eval()
- **CORS limitations**: Some APIs require host permissions
- **Storage quotas**: Chrome storage has size limits

### Performance Considerations
- **Lazy loading**: Load data only when needed
- **Debounced updates**: Prevent excessive API calls
- **Memory management**: Clean up listeners and references

## Security Guidelines

### Input Sanitization
- Always escape HTML content from user input
- Validate data before storage operations
- Use proper JSON parsing with error handling

### Permissions
- Request minimal necessary permissions
- Document why each permission is needed
- Avoid overly broad host permissions when possible

### Content Security Policy
- Follow CSP best practices
- No inline scripts or eval()
- Use nonces or hashes for dynamic content

## Contributing

### Code Style
- Follow ESLint configuration
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

### Commit Guidelines
- Use descriptive commit messages
- Keep commits atomic (one feature/fix per commit)
- Test changes before committing

### Pull Request Process
1. Create feature branch from main
2. Implement changes with tests
3. Run linting and tests
4. Submit PR with clear description

## Future Enhancements

### Phase 2 Features
- Network monitoring and request interception
- Performance profiling tools
- Screenshot and recording capabilities
- Team collaboration features
- Advanced dashboard customization

### Technical Improvements
- TypeScript migration
- Component-based architecture
- Advanced testing coverage
- Performance optimization
- Accessibility improvements

## Troubleshooting

### ✅ Previously Fixed Issues

**~~Content script not ready errors~~**: ✅ **FIXED**
- Implemented smart URL validation and non-blocking loading
- Added graceful fallbacks for unsupported page types
- Eliminated console error spam with proper retry logic

**~~Storage operations failing~~**: ✅ **FIXED**
- All CRUD operations now work reliably
- Added comprehensive form validation
- Proper error handling with user-friendly messages

**~~Cookie operations failing~~**: ✅ **FIXED**
- Fixed background script tabId handling
- Added proper sameSite validation
- Complete Chrome Cookies API integration

### Remaining Common Issues

**Extension not loading:**
- Check manifest.json syntax
- Verify file paths in manifest
- Ensure you're loading the `dist/` folder, not project root
- Check browser console for errors

**Build failures:**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check webpack configuration
- Verify file paths and imports
- Ensure all dependencies are installed

**Icon loading errors:**
- Convert `assets/icons/icon.svg` to PNG files
- Save as icon16.png, icon32.png, icon48.png, icon128.png
- See `assets/ICONS_README.md` for conversion instructions

### Support Resources
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Chrome Extension Samples](https://github.com/GoogleChrome/chrome-extensions-samples)

## Icons and Assets

The extension requires PNG icons in multiple sizes. Currently, there's an SVG template at `assets/icons/icon.svg` that needs to be converted to PNG format:

- icon16.png (16x16) - Toolbar
- icon32.png (32x32) - Windows
- icon48.png (48x48) - Extension management
- icon128.png (128x128) - Chrome Web Store

See `assets/ICONS_README.md` for conversion instructions.