# 1nsp3ct0rG4dg3t Installation Guide

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build the extension**:
   ```bash
   npm run build
   ```

3. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Navigate to and select the `dist` folder in this project
   - The extension should now appear in your Chrome toolbar

## Troubleshooting

### Icon Loading Errors
If you get icon loading errors, the extension includes minimal placeholder PNG files. For better icons:
1. Convert `assets/icons/icon.svg` to PNG files using an online converter
2. Save as icon16.png, icon32.png, icon48.png, icon128.png in `assets/icons/`
3. Rebuild with `npm run build`

### Common Issues
- **"Could not load manifest"**: Make sure you selected the `dist` folder, not the project root
- **Extension not visible**: Check that it's enabled in chrome://extensions/
- **Panel not opening**: Right-click the extension icon and check for errors

## Development Mode

For active development:
```bash
npm run dev  # Watches for changes and rebuilds automatically
```

After making changes, click the refresh button on the extension in chrome://extensions/

## Testing the Extension

1. Navigate to any website
2. Click the 1nsp3ct0rG4dg3t extension icon to open the side panel
3. Try the different tabs:
   - **Dashboard**: Will show pinned properties (empty initially)
   - **Storage**: View/edit localStorage and sessionStorage
   - **Cookies**: Manage cookies for the current domain
   - **Console**: Execute JavaScript in the page context

## Next Steps

The extension is fully functional with all core features implemented. You can now:
- Pin storage values to the dashboard
- Edit localStorage/sessionStorage data
- Manage cookies with security analysis
- Execute custom JavaScript code