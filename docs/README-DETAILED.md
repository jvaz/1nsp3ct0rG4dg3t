# 1nsp3ct0rG4dg3t - Chrome Extension

## Project Overview
**1nsp3ct0rG4dg3t** is a Chrome browser extension that provides developers with advanced debugging and manipulation capabilities for web pages, focusing on storage management, application inspection, and JavaScript injection. The name pays homage to the classic Inspector Gadget while embracing l33t speak culture that resonates with developers.

## 🎉 Current Implementation Status

**✅ FULLY FUNCTIONAL EXTENSION** - All core features are implemented and production-ready!

### ✅ Implemented Features
- **Custom Dashboard**: Pin localStorage, sessionStorage, and cookie values with drag-and-drop organization
- **Storage Management**: Complete CRUD operations for localStorage and sessionStorage with smart validation
- **Cookie Management**: Full cookie manipulation with security analysis and all attributes support
- **JavaScript Console**: Execute custom scripts with multiple timing modes and error handling
- **Application Inspector**: View page metadata, tab information, and performance metrics
- **Modern UI**: Responsive design with dark/light themes and tabbed interface
- **Smart Loading**: Handles all URL types with graceful error handling and content script validation

### 🚀 Quick Start
1. `npm install` - Install dependencies
2. `npm run build` - Build the extension
3. Load `dist/` folder in Chrome Developer Mode
4. Start debugging with advanced storage and cookie management!

### 📋 Ready for Chrome Web Store
The extension is production-ready with comprehensive error handling, security compliance, and user-friendly interface.

---

## Original Requirements & Future Vision

The following sections document the original requirements and future enhancement ideas:

## Core Features

### 1. Custom Dashboard (Personalized View)
- **Pinned Properties**: User-selected localStorage, sessionStorage, and cookie values displayed in one view
- **Custom Layouts**: Drag-and-drop interface to arrange pinned items
- **Quick Actions**: Inline editing of pinned properties without switching tabs  
- **Property Grouping**: Create custom groups/sections (e.g., "Auth Tokens", "User Preferences", "Debug Flags")
- **Dashboard Templates**: Save and load different dashboard configurations for different projects
- **Real-time Updates**: Automatic refresh of pinned values when they change
- **Export Dashboard**: Share dashboard configurations with team members
- **Conditional Highlighting**: Color-code properties based on values or conditions
- **Dashboard Config Mode**: Toggle between view and configuration modes
- **Property Aliases**: Give custom names to technical property keys for better readability

### 2. Local Storage Management
- **View Local Storage**: Display all key-value pairs stored in the current tab's localStorage
- **Edit Existing Entries**: Allow inline editing of existing localStorage values
- **Add New Entries**: Provide interface to create new localStorage key-value pairs
- **Delete Entries**: Enable removal of individual or multiple localStorage items
- **Export/Import**: Option to export localStorage data to JSON and import from file
- **Search & Filter**: Search functionality to quickly find specific keys or values
- **Type Detection**: Automatically detect and display data types (string, number, boolean, object)

### 3. Session Storage Management
- **View Session Storage**: Display all key-value pairs stored in the current tab's sessionStorage
- **Edit Existing Entries**: Allow inline editing of existing sessionStorage values
- **Add New Entries**: Provide interface to create new sessionStorage key-value pairs
- **Delete Entries**: Enable removal of individual or multiple sessionStorage items
- **Export/Import**: Option to export sessionStorage data to JSON and import from file
- **Search & Filter**: Search functionality to quickly find specific keys or values
- **Type Detection**: Automatically detect and display data types (string, number, boolean, object)

### 4. Cookie Management
- **View All Cookies**: Display all cookies associated with the current domain and subdomain
- **Cookie Details**: Show complete cookie properties (name, value, domain, path, expires, secure, httpOnly, sameSite)
- **Edit Cookie Values**: Allow inline editing of existing cookie values
- **Create New Cookies**: Interface to add new cookies with all properties
- **Delete Cookies**: Remove individual or multiple cookies
- **Cookie Search & Filter**: Search by name, value, domain, or other properties
- **Cookie Import/Export**: Export cookies to JSON/CSV format and import from files
- **Cookie Security Analysis**: Highlight security concerns (missing Secure flag, overly broad domains, etc.)
- **Cookie Expiration Tracking**: Visual indicators for expired, session, and long-lived cookies
- **Cross-Domain Cookies**: Show cookies from different domains accessible to the current page

### 5. Application Information Access
- **Page Metadata**: Display page title, URL, domain, protocol
- **Performance Metrics**: Show page load times, resource counts, memory usage
- **Browser Information**: Display browser version, user agent, viewport dimensions
- **Security Information**: Show HTTPS status, certificate details, CSP headers
- **Framework Detection**: Identify popular frameworks/libraries in use (React, Vue, Angular, jQuery, etc.)
- **API Endpoints**: Detect and list API calls made by the page
- **Console Logs**: Access and display recent console messages

### 6. JavaScript Injection
- **Code Editor**: Built-in syntax-highlighted JavaScript editor with auto-completion
- **Execute Scripts**: Run custom JavaScript code in the context of the current page
- **Script Library**: Save and organize frequently used scripts
- **Script Templates**: Pre-built templates for common debugging tasks
- **Live Console**: Interactive JavaScript console for real-time code execution
- **Error Handling**: Proper error reporting and debugging information
- **DOM Manipulation**: Easy access to DOM elements and manipulation methods
- **Event Listeners**: Ability to add/remove event listeners dynamically

## Technical Requirements

### Extension Architecture
- **Manifest Version**: Use Manifest V3 for Chrome extension
- **Permissions**: 
  - `activeTab` - Access current tab
  - `storage` - Extension's own storage
  - `scripting` - Inject scripts
  - `cookies` - Access cookies
  - `host_permissions` - Access to all websites
- **Content Scripts**: Inject scripts to interact with page storage and DOM
- **Background Service Worker**: Handle extension lifecycle and messaging
- **Popup Interface**: Main UI accessible from extension icon

### User Interface
- **Responsive Design**: Work across different screen sizes
- **Tabbed Interface**: Main tabs for Dashboard, Storage (localStorage/sessionStorage), Cookies, App Info, and JS Console
- **Dark/Light Theme**: Support both theme modes
- **Keyboard Shortcuts**: Common shortcuts for power users
- **Context Menus**: Right-click options for common actions

### Data Handling
- **Real-time Updates**: Automatically refresh data when storage changes
- **Data Validation**: Validate JSON and other data formats before saving
- **Backup/Restore**: Create backups before making changes
- **Undo/Redo**: Support for undoing recent changes
- **Data Encryption**: Option to encrypt sensitive stored data

### Performance
- **Minimal Resource Usage**: Optimize for low memory and CPU usage
- **Lazy Loading**: Load data only when needed
- **Caching**: Cache frequently accessed data
- **Debounced Updates**: Prevent excessive API calls during rapid changes

## Security Considerations
- **Content Security Policy**: Comply with CSP requirements
- **Cross-Origin Safety**: Handle cross-origin restrictions properly
- **Input Sanitization**: Sanitize all user inputs to prevent XSS
- **Permission Model**: Request minimal necessary permissions
- **Data Privacy**: Don't transmit user data to external servers

## User Experience Features
- **Onboarding**: Brief tutorial for first-time users
- **Help Documentation**: Built-in help and tooltips
- **Export Formats**: Support multiple export formats (JSON, CSV, etc.)
- **Keyboard Navigation**: Full keyboard accessibility
- **Error Messages**: Clear, actionable error messages
- **Loading States**: Visual feedback during operations

## Browser Compatibility
- **Primary Target**: Chrome/Chromium browsers
- **Version Support**: Support last 3 major Chrome versions
- **Future Compatibility**: Consider Edge and other Chromium-based browsers

## Development Requirements
- **Code Quality**: Follow ES6+ standards with proper linting
- **Testing**: Unit tests for core functionality
- **Documentation**: Comprehensive code documentation
- **Version Control**: Git-based development workflow
- **Build Process**: Automated build and packaging system

## Deployment
- **Chrome Web Store**: Publish **1nsp3ct0rG4dg3t** to official store
- **Auto-Updates**: Support automatic extension updates
- **Privacy Policy**: Comply with store requirements
- **Manifest Validation**: Ensure all permissions are justified

## Success Metrics
- **User Adoption**: Target active user base growth
- **Performance**: Page load impact < 5ms
- **Reliability**: 99.9% crash-free sessions
- **User Satisfaction**: 4+ star rating in Chrome Web Store

## Future Enhancements (Phase 2)
- **Network Monitoring**: Track and display network requests
- **Performance Profiling**: Built-in performance analysis tools
- **Screenshot/Recording**: Capture page states
- **Team Collaboration**: Share configurations with team members
- **API Integration**: Connect with popular development tools
- **Cookie Analytics**: Track cookie usage patterns and optimization suggestions
- **GDPR Compliance Tools**: Help identify and manage privacy-related cookies
- **Dashboard Themes**: Multiple visual themes for the custom dashboard
- **Property History**: Track changes to pinned properties over time
- **Smart Suggestions**: AI-powered suggestions for useful properties to pin based on usage patterns