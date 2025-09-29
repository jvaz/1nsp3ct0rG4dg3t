# 1nsp3ct0rG4dg3t Troubleshooting

This document provides solutions to common issues you might encounter with the 1nsp3ct0rG4dg3t Chrome extension.

## Quick Diagnostics

If you're experiencing issues, try these quick checks first:

1. **Extension Loaded**: Go to `chrome://extensions/` and verify the extension is enabled
2. **Correct Folder**: Ensure you loaded the `dist/` folder, not the project root
3. **Build Status**: Run `npm run build` to ensure you have the latest build
4. **Chrome Version**: Requires Chrome 88+ (Chrome 114+ for optimal experience)
5. **Console Errors**: Check browser console (F12) for any error messages

## Installation Issues

### "Could not load manifest" Error

**Symptoms**: Chrome shows manifest loading error when trying to load the extension.

**Causes & Solutions**:

1. **Wrong Folder Selected**:
   - ❌ Selected project root folder
   - ✅ Select the `dist/` folder specifically

2. **Build Not Created**:
   ```bash
   # Run build command first
   npm run build
   # Then load the dist/ folder
   ```

3. **Corrupt Build**:
   ```bash
   # Clean and rebuild
   npm run clean
   npm run build
   ```

### Extension Not Visible in Toolbar

**Symptoms**: Extension loads successfully but doesn't appear in Chrome toolbar.

**Solutions**:
1. **Check Extensions Page**: Go to `chrome://extensions/` and verify it's enabled
2. **Pin Extension**: Click the puzzle piece icon in toolbar → Pin 1nsp3ct0rG4dg3t
3. **Refresh Extension**: Click refresh button on the extension card in `chrome://extensions/`

### Icons Not Displaying

**Symptoms**: Extension works but shows generic icons or no icons.

**Cause**: PNG icon files are missing or corrupted.

**Solution**:
The extension includes placeholder PNG files, but for better icons:
1. Convert `assets/icons/icon.svg` to PNG files using an online converter
2. Save as `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png` in `assets/icons/`
3. Run `npm run build` to copy new icons

## Build & Development Issues

### npm install Failures

**Symptoms**: Dependencies fail to install.

**Solutions**:

1. **Clear npm cache**:
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Node.js Version**: Ensure you're using Node.js 16 or higher:
   ```bash
   node --version  # Should be 16.0.0 or higher
   ```

3. **Permission Issues** (Linux/Mac):
   ```bash
   sudo npm install -g npm@latest
   ```

### Build Failures

**Symptoms**: `npm run build` fails with errors.

**Common Solutions**:

1. **Missing Dependencies**:
   ```bash
   npm install
   npm run build
   ```

2. **Path Issues**:
   - Ensure file paths in imports use forward slashes
   - Check that all imported files exist

3. **Webpack Errors**:
   ```bash
   # Clear webpack cache
   rm -rf node_modules/.cache
   npm run build
   ```

### Development Mode Issues

**Symptoms**: `npm run dev` doesn't work or changes aren't reflected.

**Solutions**:
1. **Restart Watch Mode**:
   ```bash
   # Stop current process (Ctrl+C)
   npm run dev
   ```

2. **Manual Refresh**: After changes, go to `chrome://extensions/` and click refresh on the extension

3. **Hard Refresh**: Remove and re-add the extension if changes aren't reflected

## Runtime Issues

### Side Panel Not Opening

**Symptoms**: Clicking extension icon doesn't open the side panel.

**Solutions**:

1. **Check Chrome Version**: Side Panel API requires Chrome 114+
   - For older Chrome versions, the extension will attempt to open a popup

2. **Inspect for Errors**:
   - Right-click extension icon → "Inspect side panel"
   - Check console for errors

3. **Reset Extension**:
   ```bash
   # Rebuild and reload
   npm run build
   ```
   Then refresh the extension in `chrome://extensions/`

### "Content Script Not Ready" Errors

**Symptoms**: Operations fail with content script errors.

**Status**: ✅ **FIXED** in current version

**Current Behavior**: The extension now handles these gracefully:
- Smart URL validation prevents injection on unsupported pages
- Non-blocking initialization prevents startup delays
- Graceful fallback messages for unsupported page types

**If Still Occurring**:
1. Refresh the web page
2. Reload the extension
3. Check if you're on a supported page type (http://, https://)

### Storage Operations Failing

**Symptoms**: Can't add, edit, or delete localStorage/sessionStorage items.

**Status**: ✅ **All CRUD operations working**

**If Still Occurring**:
1. **Check Page Type**: Ensure you're on a standard web page (not chrome:// pages)
2. **Refresh Page**: Some sites may have changed their storage configuration
3. **Check Permissions**: Verify the site allows storage access

### Cookie Operations Failing

**Symptoms**: Can't view, create, or modify cookies.

**Status**: ✅ **Full cookie management working**

**If Still Occurring**:
1. **Check Domain**: Ensure you're on the correct domain for the cookies
2. **Security Flags**: Some cookie operations may fail due to Secure/HttpOnly flags
3. **Third-party Cookies**: Check Chrome's cookie settings for third-party restrictions

## UI & Display Issues

### Theme Not Switching

**Symptoms**: Dark/light theme toggle doesn't work.

**Solutions**:
1. **System Theme**: Extension follows system theme by default
2. **Manual Toggle**: Click the moon/sun icon in the header
3. **Reset Theme**: Refresh the extension to reset theme state

### Layout Issues

**Symptoms**: UI elements overlap or don't display correctly.

**Solutions**:
1. **Resize Panel**: Try adjusting the side panel width
2. **Zoom Level**: Reset browser zoom to 100%
3. **Clear Cache**: Hard refresh the extension (Ctrl+Shift+R in side panel)

### Search Not Working

**Symptoms**: Search functionality doesn't return results.

**Solutions**:
1. **Clear Search**: Click the × button or press Escape
2. **Check Spelling**: Verify search terms are correct
3. **Data Refresh**: Click refresh button in respective tab

## Page Compatibility Issues

### Extension Not Working on Specific Sites

**Symptoms**: Extension loads but doesn't show data for certain websites.

**Expected Behavior**: Some sites may have restrictions:

1. **CSP Restrictions**: Sites with strict Content Security Policies may limit extension functionality
2. **CORS Issues**: Some sites block cross-origin requests
3. **Frame Restrictions**: Sites in iframes may have limited access

**Supported Page Types**:
- ✅ Standard HTTP/HTTPS web pages
- ✅ Local files (file://) with proper permissions
- ❌ Chrome internal pages (chrome://, chrome-extension://)
- ❌ Browser new tab pages
- ❌ PDF files and other non-HTML content

### Performance Issues

**Symptoms**: Extension slows down browsing or uses too much memory.

**Solutions**:
1. **Close Unused Tabs**: Extension monitors all tabs, reduce open tabs
2. **Refresh Extension**: Restart the extension if memory usage seems high
3. **Check Large Storage**: Sites with very large localStorage may impact performance

## Data Issues

### Pinned Properties Not Showing

**Symptoms**: Dashboard shows "No properties pinned yet" even though you've pinned items.

**Solutions**:
1. **Domain Mismatch**: Pinned properties are domain-specific, check if you're on the right domain
2. **Clear and Re-pin**: Clear all pinned properties and pin them again
3. **Storage Reset**:
   ```javascript
   // In browser console:
   chrome.storage.local.clear()
   ```

### Search Results Incorrect

**Symptoms**: Search shows "Already Pinned" for items that aren't pinned.

**Status**: ✅ **FIXED** in current version with improved domain matching

**If Still Occurring**:
1. Clear extension storage and re-pin items
2. Check if items are pinned under different domain variations (e.g., with/without www)

## Advanced Debugging

### Enable Debug Mode

For detailed logging, you can enable debug mode:

1. **Open Side Panel Inspector**: Right-click extension icon → "Inspect side panel"
2. **Check Console**: Look for error messages and warnings
3. **Network Tab**: Check for failed API calls

### Manual Testing Steps

1. **Basic Functionality**:
   - Open extension on a test website
   - Check all 4 tabs load properly
   - Try adding/editing storage items
   - Test cookie operations

2. **Cross-tab Testing**:
   - Open same site in multiple tabs
   - Verify changes sync across tabs
   - Test pinned properties visibility

3. **Theme Testing**:
   - Toggle between dark and light themes
   - Verify theme persists across sessions

### Log Analysis

**Common Error Patterns**:

1. **"Storage is null"**: Page doesn't support localStorage/sessionStorage
2. **"Permission denied"**: Extension lacks necessary permissions
3. **"Tab not found"**: Background script can't access tab information

### Getting Help

If you continue experiencing issues:

1. **Check GitHub Issues**: [https://github.com/jvaz/1nsp3ct0rG4dg3t/issues](https://github.com/jvaz/1nsp3ct0rG4dg3t/issues)
2. **Create Bug Report**: Include:
   - Chrome version
   - Extension version
   - Steps to reproduce
   - Console error messages
   - Screenshots if relevant

3. **Include System Information**:
   ```bash
   # Browser info
   chrome://version/

   # Extension info
   chrome://extensions/
   ```

## Known Limitations

**By Design**:
- ✅ **No JavaScript Console**: Removed due to Chrome CSP restrictions
- ✅ **Domain-specific Data**: Pinned properties and cookies are domain-filtered
- ✅ **Chrome Extensions Only**: Not compatible with Firefox or other browsers
- ✅ **Local Data Only**: No cloud sync or external server integration

**Future Considerations**:
- Network request monitoring (planned)
- Advanced performance profiling (planned)
- Cross-browser compatibility (under consideration)

---

**Most Issues Are Resolved**: The current version has addressed the majority of common issues. If you encounter problems not covered here, they're likely related to specific site configurations or unusual Chrome setups.