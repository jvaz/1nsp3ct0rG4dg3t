# 1nsp3ct0rG4dg3t Testing Documentation

This directory contains comprehensive automated tests for the 1nsp3ct0rG4dg3t Chrome extension using both Jest (unit tests) and Playwright (end-to-end tests).

## Test Structure

```
tests/
├── README.md                     # This file
├── extension.test.js             # Basic Jest unit tests
├── config/                       # Test configuration
│   ├── global-setup.js          # Playwright global setup
│   ├── global-teardown.js       # Playwright global teardown
│   └── test-sites.json          # Test website configurations
└── playwright/                   # Playwright E2E tests
    ├── extension/               # Extension core functionality tests
    │   └── setup.spec.js        # Extension initialization tests
    ├── integration/             # Cross-component integration tests
    ├── workflows/               # End-to-end user workflow tests
    ├── cross-site/              # Multi-website compatibility tests
    └── helpers/                 # Test utilities and page objects
        ├── extension-helper.js  # Extension loading utilities
        ├── page-objects/        # Page Object Models
        │   ├── extension-panel.js
        │   ├── dashboard-tab.js
        │   └── storage-tab.js
        └── test-data/           # Test data generators
            ├── storage-data.js
            └── cookie-data.js
```

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Chrome browser (version 88+, Chrome 114+ recommended)
- Extension built in `dist/` directory

### Installation

1. Install dependencies:
```bash
npm install
```

2. Build the extension:
```bash
npm run build
```

### Running Tests

#### Unit Tests (Jest)
```bash
# Run all unit tests
npm run test

# Run unit tests in watch mode
npm run test:watch
```

#### E2E Tests (Playwright)
```bash
# Run all Playwright tests
npm run test:e2e

# Run tests with UI (interactive mode)
npm run test:e2e:ui

# Run tests in headed mode (visible browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# Run all tests (Jest + Playwright)
npm run test:all
```

#### Specific Test Categories
```bash
# Run only extension setup tests
npx playwright test tests/playwright/extension/

# Run only integration tests
npx playwright test tests/playwright/integration/

# Run tests for specific browser
npx playwright test --project=extension-chromium
```

## Test Categories

### 1. Extension Core Tests (`extension/`)
- **setup.spec.js**: Extension loading, initialization, and basic functionality
- Tests extension installation, side panel opening, tab navigation
- Verifies theme switching, connection status, error handling

### 2. Integration Tests (`integration/`)
- Cross-component interactions
- Search functionality across tabs
- Pin/unpin workflows
- Theme and settings persistence

### 3. Workflow Tests (`workflows/`)
- Complete user scenarios
- Developer debugging workflows
- Data management workflows
- Multi-step operations

### 4. Cross-Site Tests (`cross-site/`)
- Extension compatibility across different websites
- Domain-specific functionality
- Cookie inheritance testing
- Storage access across sites

## Page Object Models

### ExtensionPanel
Main extension panel interactions:
```javascript
import { ExtensionPanel } from '../helpers/page-objects/extension-panel.js';

const panel = new ExtensionPanel(page);
await panel.waitForLoad();
await panel.navigateToTab('storage');
await panel.verifyConnected();
```

### DashboardTab
Dashboard-specific operations:
```javascript
import { DashboardTab } from '../helpers/page-objects/dashboard-tab.js';

const dashboard = new DashboardTab(page);
await dashboard.search('user-profile');
await dashboard.pinFromSearch(0);
await dashboard.verifyAlreadyPinned(0);
```

### StorageTab
Storage management operations:
```javascript
import { StorageTab } from '../helpers/page-objects/storage-tab.js';

const storage = new StorageTab(page);
await storage.addStorageItem('test-key', 'test-value');
await storage.verifyStorageItemExists('test-key');
await storage.editStorageItemByKey('test-key', 'new-key', 'new-value');
```

## Test Data Utilities

### StorageTestData
Generate various types of storage test data:
```javascript
import { StorageTestData } from '../helpers/test-data/storage-data.js';

// Simple key-value pairs
const simpleData = StorageTestData.getSimpleData();

// JSON objects
const jsonData = StorageTestData.getJsonData();

// Large datasets for performance testing
const largeData = StorageTestData.getLargeDataset(100);

// Edge cases and special characters
const edgeData = StorageTestData.getEdgeCaseData();
```

### CookieTestData
Generate cookie test scenarios:
```javascript
import { CookieTestData } from '../helpers/test-data/cookie-data.js';

// Basic cookies
const basicCookies = CookieTestData.getBasicCookies();

// Advanced cookies with all attributes
const advancedCookies = CookieTestData.getAdvancedCookies();

// Security test cases
const securityCookies = CookieTestData.getSecurityTestCookies();
```

## Extension Helper

The `ExtensionHelper` class provides utilities for Chrome extension testing:

```javascript
import { ExtensionHelper } from '../helpers/extension-helper.js';

const helper = new ExtensionHelper();
await helper.launchWithExtension();

// Create test page with data
const testPage = await helper.createTestPage({
  localStorage: { 'key1': 'value1' },
  cookies: { 'cookie1': 'value1' }
});

// Open extension panel
const extensionPage = await helper.openSidePanel();
```

## Configuration

### Test Sites
The `test-sites.json` file defines test websites and scenarios:
- **testSites**: Different types of websites for testing
- **testScenarios**: Grouped test scenarios
- **testData**: Predefined test data sets
- **performanceThresholds**: Performance benchmarks

### Playwright Config
`playwright.config.js` configures:
- Chrome extension loading
- Browser launch options
- Test reporters and artifacts
- Timeouts and retries

## Writing New Tests

### Basic Test Structure
```javascript
import { test, expect } from '@playwright/test';
import { ExtensionHelper } from '../helpers/extension-helper.js';
import { ExtensionPanel } from '../helpers/page-objects/extension-panel.js';

test.describe('Feature Name', () => {
  let extensionHelper;
  let extensionPage;
  let panel;

  test.beforeEach(async () => {
    extensionHelper = new ExtensionHelper();
    await extensionHelper.launchWithExtension();
    extensionPage = await extensionHelper.openSidePanel();
    panel = new ExtensionPanel(extensionPage);
    await panel.waitForLoad();
  });

  test.afterEach(async () => {
    await extensionHelper.cleanup();
  });

  test('should do something', async () => {
    // Test implementation
  });
});
```

### Test Data Usage
```javascript
import { StorageTestData } from '../helpers/test-data/storage-data.js';

test('should handle JSON data', async () => {
  const testData = StorageTestData.getJsonData();
  const testPage = await extensionHelper.createTestPage({
    localStorage: testData
  });

  // Test with the data
});
```

## Best Practices

### Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Follow the AAA pattern (Arrange, Act, Assert)

### Data Management
- Use test data utilities for consistent data
- Clean up test data between tests
- Use realistic data for better test coverage

### Error Handling
- Always clean up resources in `afterEach`
- Handle async operations properly
- Use appropriate timeouts

### Performance
- Don't test external sites extensively
- Use local test data when possible
- Run tests in parallel when appropriate

## Debugging

### Debug Mode
```bash
npm run test:e2e:debug
```

### Screenshots and Videos
- Screenshots taken on test failures
- Videos recorded for failed tests
- Artifacts saved in `test-results/`

### Browser DevTools
```javascript
await page.pause(); // Pauses execution for debugging
```

### Logging
Add debug logging to tests:
```javascript
console.log('Current URL:', await page.url());
await page.screenshot({ path: 'debug.png' });
```

## CI/CD Integration

The tests are configured for CI/CD with:
- GitHub Actions workflow support
- JUnit XML and JSON reporting
- Screenshot and video artifacts
- Parallel execution configuration

## Troubleshooting

### Common Issues

1. **Extension not loading**
   - Ensure `npm run build` was run
   - Check `dist/` directory exists
   - Verify manifest.json is valid

2. **Tests timing out**
   - Increase timeout in playwright.config.js
   - Check for infinite loading states
   - Verify page is actually loaded

3. **Flaky tests**
   - Add proper wait conditions
   - Use `waitFor` instead of `setTimeout`
   - Check for race conditions

### Getting Help

- Check test output for specific error messages
- Use `--headed` mode to see what's happening
- Add debugging statements to isolate issues
- Review page object implementations