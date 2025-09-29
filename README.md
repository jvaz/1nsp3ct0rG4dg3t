# 1nsp3ct0rG4dg3t - Chrome Extension

**Advanced Chrome Extension for Web Debugging and Storage Management**

A powerful developer tool that helps you view, pin, and explore storage values and cookies at a glance, with comprehensive application inspection capabilities.

## ✨ Core Features

- **📊 Dashboard**: Pin and organize localStorage, sessionStorage, and cookie values with drag-and-drop
- **💾 Storage Management**: Complete CRUD operations for localStorage and sessionStorage with validation
- **🍪 Cookie Management**: Full cookie manipulation with security analysis and all attributes support
- **📱 Application Inspector**: Page metadata, performance metrics, security analysis, and framework detection
- **🎨 Modern UI**: Responsive 4-tab interface with dark/light themes

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Load dist/ folder in Chrome Developer Mode
```

**Load Extension:**
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → Select `dist/` folder
4. Extension appears in toolbar - click to open side panel

## 📋 Status

**✅ Production Ready** - All core features implemented and Chrome Web Store ready!

### What's Working
- ✅ Complete storage management (localStorage/sessionStorage CRUD)
- ✅ Full cookie management with security analysis
- ✅ Dashboard with pinned properties and organization modes
- ✅ Application inspector with performance and security metrics
- ✅ Framework detection (React, Vue, Angular, jQuery, etc.)
- ✅ Error-free operation across all URL types

## 📚 Documentation

- [📖 Features Overview](docs/FEATURES.md) - Detailed feature descriptions and capabilities
- [🛠️ Development Guide](docs/DEVELOPMENT.md) - Setup, architecture, and contribution guidelines
- [📥 Installation Guide](docs/INSTALLATION.md) - Installation and usage instructions
- [🏗️ Architecture](docs/ARCHITECTURE.md) - Technical architecture and component details
- [🔧 Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions

## 🛠️ Tech Stack

- **Manifest V3** Chrome Extension API
- **Vanilla JavaScript** with modern ES6+ features
- **Webpack** for build optimization
- **ESLint + Jest** for code quality
- **Chrome Side Panel API** for modern UI integration

## 📦 Build Commands

```bash
npm run dev        # Development build with watch mode
npm run build      # Production build
npm run test       # Run tests
npm run lint       # Check code quality
npm run clean      # Clean build directory
```

## 📄 License

MIT License - Created by João Vaz

---

**🎉 Ready for Chrome Web Store publication**

Links: [Personal Website](https://jvaz.github.io/) • [GitHub](https://github.com/jvaz/1nsp3ct0rG4dg3t) • [Buy me a coffee](https://www.buymeacoffee.com/jvaz)