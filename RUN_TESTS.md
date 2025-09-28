# Running 1nsp3ct0rG4dg3t Playwright Tests

## Prerequisites

1. **Chrome/Chromium Browser** installed
2. **Node.js 16+** and npm
3. **GUI environment** (X11/Wayland for Linux, native for Windows/Mac)
4. **Extension built** in `dist/` directory

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Extension
```bash
npm run build
```

### 3. Install Playwright Browsers
```bash
npx playwright install chrome
npx playwright install-deps
```

### 4. Run All Tests
```bash
# Run complete test suite
npm run test:e2e

# Run with visible browser (headed mode)
npm run test:e2e:headed

# Run with interactive UI
npm run test:e2e:ui
```

## Running Specific Test Categories

### Integration Tests
```bash
# Dashboard-Storage integration
npx playwright test tests/playwright/integration/dashboard-storage.spec.js --project=extension-chromium

# Dashboard-Cookie integration
npx playwright test tests/playwright/integration/dashboard-cookie.spec.js --project=extension-chromium

# Storage-Cookie cross-component
npx playwright test tests/playwright/integration/storage-cookie.spec.js --project=extension-chromium
```

### Workflow Tests
```bash
# Developer debugging workflows
npx playwright test tests/playwright/workflows/developer-debugging.spec.js --project=extension-chromium

# Data management workflows
npx playwright test tests/playwright/workflows/data-management.spec.js --project=extension-chromium

# Multi-site workflows
npx playwright test tests/playwright/workflows/multi-site.spec.js --project=extension-chromium
```

### Cross-Site Tests
```bash
# Compatibility tests
npx playwright test tests/playwright/cross-site/compatibility.spec.js --project=extension-chromium

# Performance & security tests
npx playwright test tests/playwright/cross-site/performance-security.spec.js --project=extension-chromium
```

### Core Extension Tests
```bash
# Basic extension functionality
npx playwright test tests/playwright/extension/setup.spec.js --project=extension-chromium
```

## Running with Different Configurations

### Production Configuration (with extension)
```bash
npx playwright test --config=playwright.config.js --project=extension-chromium
```

### Extension-only Configuration (no build step)
```bash
npx playwright test --config=playwright-extension.config.js --project=extension-chromium
```

### Simplified Configuration (basic browser testing)
```bash
npx playwright test --config=playwright-simple.config.js
```

## Debugging Tests

### Run in Debug Mode
```bash
# Debug specific test
npx playwright test tests/playwright/integration/dashboard-storage.spec.js --debug

# Debug with headed browser
npx playwright test tests/playwright/integration/dashboard-storage.spec.js --headed --project=extension-chromium
```

### Generate Test Reports
```bash
# Run tests and generate HTML report
npx playwright test --reporter=html

# Open report
npx playwright show-report
```

### Screenshots and Videos
Tests automatically capture:
- Screenshots on failure
- Videos for failed tests
- Traces for debugging

View artifacts in `test-results/` directory.

## Performance Testing

### Large Dataset Tests
```bash
# Run performance tests with timing
npx playwright test tests/playwright/cross-site/performance-security.spec.js --project=extension-chromium --reporter=line
```

### Memory Usage Tests
```bash
# Run with memory monitoring
npx playwright test tests/playwright/cross-site/performance-security.spec.js::memory --project=extension-chromium
```

## Security Testing

### Run Security Validation
```bash
# Test sensitive data handling
npx playwright test tests/playwright/cross-site/performance-security.spec.js::security --project=extension-chromium
```

## Continuous Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npx playwright install --with-deps chrome
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Docker Testing

### Run in Docker Container
```bash
# Build container with GUI support
docker run --rm -it \
  -v $PWD:/workspace \
  -w /workspace \
  --shm-size=2gb \
  mcr.microsoft.com/playwright:v1.40.0-focal \
  bash -c "npm ci && npm run build && npm run test:e2e"
```

## Cloud Testing Services

### BrowserStack
```javascript
// playwright.config.js
export default defineConfig({
  use: {
    connectOptions: {
      wsEndpoint: 'wss://cdp.browserstack.com/playwright?caps=' +
        encodeURIComponent(JSON.stringify({
          'browser': 'chrome',
          'os': 'Windows',
          'os_version': '11'
        }))
    }
  }
});
```

### Sauce Labs
```javascript
// playwright.config.js
export default defineConfig({
  use: {
    connectOptions: {
      wsEndpoint: 'wss://ondemand.us-west-1.saucelabs.com/v1/playwright'
    }
  }
});
```

## Troubleshooting

### Common Issues

1. **Extension not loading**
   ```bash
   # Ensure extension is built
   npm run build
   ls -la dist/  # Should show manifest.json and other files
   ```

2. **Browser not found**
   ```bash
   # Install Chrome
   npx playwright install chrome
   ```

3. **Permission errors**
   ```bash
   # Fix permissions
   chmod +x node_modules/.bin/playwright
   ```

4. **Display issues (Linux)**
   ```bash
   # Install GUI support
   sudo apt-get install xvfb
   xvfb-run npx playwright test
   ```

### Environment Variables
```bash
# Set debug mode
export DEBUG=pw:*

# Set headless mode
export HEADLESS=true

# Set custom browser path
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chrome
```

## Test Results Analysis

### View HTML Report
```bash
npx playwright show-report
```

### View JSON Results
```bash
cat test-results/results.json | jq
```

### View JUnit XML
```bash
cat test-results/junit.xml
```

## Expected Test Results

- **60+ test scenarios** across all categories
- **~5-15 minutes** total execution time
- **Screenshots/videos** for any failures
- **Performance metrics** logged to console
- **Security warnings** highlighted in results

## Next Steps

After running tests successfully:
1. Review failed tests in HTML report
2. Check performance metrics in console output
3. Examine security warnings for sensitive data
4. Use traces to debug any issues
5. Add new test scenarios as needed