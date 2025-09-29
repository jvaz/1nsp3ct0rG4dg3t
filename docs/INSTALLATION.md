# 1nsp3ct0rG4dg3t Installation Guide

## System Requirements

- **Chrome Browser**: Version 88+ (Chrome 114+ recommended for optimal experience)
- **Operating System**: Windows, macOS, or Linux
- **Development**: Node.js 16+ and npm (for building from source)

## Quick Installation

### Option 1: Build from Source (Recommended)

1. **Download or Clone**:
   ```bash
   git clone https://github.com/jvaz/1nsp3ct0rG4dg3t.git
   cd 1nsp3ct0rG4dg3t
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Build the Extension**:
   ```bash
   npm run build
   ```

4. **Load in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right corner)
   - Click "Load unpacked"
   - Navigate to and select the `dist` folder in this project
   - The extension should appear in your Chrome toolbar

### Option 2: Pre-built Release (If Available)

1. Download the latest release ZIP from the GitHub releases page
2. Extract the ZIP file
3. Follow step 4 from Option 1 above

## Initial Setup

### Extension Activation

1. **Find the Extension**: Look for the 1nsp3ct0rG4dg3t icon in your Chrome toolbar
2. **Pin Extension** (Optional): Click the puzzle piece icon → Pin 1nsp3ct0rG4dg3t for easy access
3. **Open Side Panel**: Click the extension icon to open the side panel

### Keyboard Shortcut (Optional)

Set up the keyboard shortcut for quick access:
- **Default**: `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Shift+I` (Mac)
- **Customize**: Go to `chrome://extensions/shortcuts` to modify

## First Use Guide

### 1. Dashboard Tab
- **Purpose**: Central view of your most important storage values
- **First Visit**: Will show "No properties pinned yet"
- **Getting Started**: Switch to Storage or Cookies tabs to pin items

### 2. Storage Tab
- **Purpose**: Manage localStorage and sessionStorage
- **Test It**:
  - Visit any website (e.g., GitHub, Twitter, etc.)
  - Switch between localStorage and sessionStorage tabs
  - Try adding, editing, or deleting storage items

### 3. Cookies Tab
- **Purpose**: Comprehensive cookie management
- **Test It**:
  - Visit a website with cookies
  - View all cookies for the domain
  - Try creating, editing, or deleting cookies

### 4. Application Tab
- **Purpose**: Page analysis and application inspection
- **Information Shown**:
  - Page metadata and performance metrics
  - Security analysis
  - Framework detection
  - Browser and system information

## Verification Steps

### ✅ Installation Success Checklist

1. **Extension Loaded**: Visible in `chrome://extensions/` with no errors
2. **Icon Present**: Extension icon appears in Chrome toolbar
3. **Panel Opens**: Clicking icon opens side panel interface
4. **All Tabs Work**: Can navigate between Dashboard, Storage, Cookies, Application
5. **Basic Functionality**: Can view storage/cookies on test websites

### Test Websites

Try the extension on these types of sites:

- **E-commerce**: Amazon, eBay (lots of storage data)
- **Social Media**: Twitter, Facebook (various cookies)
- **Developer Sites**: GitHub, Stack Overflow (localStorage usage)
- **News Sites**: Any major news website (basic functionality)

## Troubleshooting Installation

### "Could not load manifest" Error

**Cause**: Wrong folder selected or build issues

**Solutions**:
1. **Verify Folder**: Make sure you selected the `dist` folder, not the project root
2. **Rebuild Extension**:
   ```bash
   npm run clean
   npm run build
   ```
3. **Check Dependencies**:
   ```bash
   npm install
   npm run build
   ```

### Extension Not Visible in Toolbar

**Cause**: Extension loaded but not visible

**Solutions**:
1. **Check Extensions Page**: Go to `chrome://extensions/` and verify it's enabled
2. **Pin Extension**: Click the puzzle piece icon in toolbar → Pin 1nsp3ct0rG4dg3t
3. **Refresh Browser**: Restart Chrome if issues persist

### Side Panel Not Opening

**Cause**: Chrome version or extension errors

**Solutions**:
1. **Check Chrome Version**: Requires Chrome 88+, optimal with 114+
2. **Inspect for Errors**: Right-click extension icon → "Inspect side panel"
3. **Reload Extension**: Go to `chrome://extensions/` → Click refresh on the extension

### Icon Display Issues

**Cause**: Missing or corrupted icon files

**Current Status**: Extension includes working placeholder PNG files

**For Better Icons** (Optional):
1. Convert `assets/icons/icon.svg` using an online SVG to PNG converter
2. Create files: `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
3. Save in `assets/icons/` directory
4. Rebuild: `npm run build`

### Build Failures

**Common Issues & Solutions**:

1. **Node.js Version**:
   ```bash
   node --version  # Should be 16.0.0 or higher
   ```

2. **Clear Dependencies**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

3. **Permission Issues** (Linux/Mac):
   ```bash
   sudo chown -R $(whoami) ~/.npm
   ```

## Development Mode

### For Active Development

If you plan to modify the extension:

1. **Watch Mode**:
   ```bash
   npm run dev  # Automatically rebuilds on file changes
   ```

2. **After Changes**:
   - Go to `chrome://extensions/`
   - Click the refresh button on the 1nsp3ct0rG4dg3t extension
   - Test your changes

3. **Debugging**:
   - **Side Panel**: Right-click extension icon → "Inspect side panel"
   - **Background Script**: Extension details → "Inspect background script"
   - **Content Script**: Use browser DevTools on any webpage

## Configuration Options

### Theme Preference
- **Auto-detect**: Follows your system theme by default
- **Manual Toggle**: Click the moon/sun icon in the extension header
- **Persistence**: Theme choice is saved across browser sessions

### Chrome Settings
- **Side Panel**: Extension uses modern Chrome Side Panel API (Chrome 114+)
- **Permissions**: Extension only requests minimal necessary permissions
- **Privacy**: All data stays local - no external servers contacted

## Uninstallation

### To Remove the Extension

1. **Via Extensions Page**:
   - Go to `chrome://extensions/`
   - Find 1nsp3ct0rG4dg3t
   - Click "Remove"

2. **Data Cleanup** (Optional):
   - Extension data is automatically removed
   - No manual cleanup required

### To Keep Extension Data

If reinstalling, your pinned dashboard properties will be preserved automatically.

## Getting Help

### If You Experience Issues

1. **Check Documentation**:
   - [Troubleshooting Guide](./TROUBLESHOOTING.md)
   - [Development Guide](./DEVELOPMENT.md)

2. **Browser Console**:
   - Press F12 on any webpage
   - Check Console tab for error messages
   - Include any error messages when seeking help

3. **Extension Console**:
   - Right-click extension icon → "Inspect side panel"
   - Check Console for extension-specific errors

4. **Report Issues**:
   - GitHub Issues: [Create Bug Report](https://github.com/jvaz/1nsp3ct0rG4dg3t/issues)
   - Include: Chrome version, OS, steps to reproduce, error messages

## Next Steps

### Explore Features

Once installed, explore the extension capabilities:

1. **Pin Frequently Used Values**: Use the Dashboard to pin important storage items
2. **Organize by Domain**: Notice how data automatically filters by current domain
3. **Use Search**: Try the search functionality across all tabs
4. **Inspect Applications**: Check out the Application tab for page analysis
5. **Try Different Sites**: Test on various websites to see different data

### Advanced Usage

- **JSON Viewer**: Click "View JSON" on complex storage values
- **Cookie Security**: Pay attention to security warnings on cookies
- **Performance Metrics**: Use Application tab to analyze page performance
- **Theme Switching**: Toggle between dark and light themes

---

**Installation Complete!** 🎉 The extension is now ready to help you debug and inspect web applications more effectively.