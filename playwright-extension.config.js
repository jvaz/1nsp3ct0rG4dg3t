// Playwright configuration for Chrome extension testing (without build step)
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  // Test directory
  testDir: './tests/playwright',

  // Run tests in files in parallel
  fullyParallel: false, // Disable parallel for extension tests

  // Retry configuration
  retries: 1,

  // Use single worker for extension tests
  workers: 1,

  // Reporter to use
  reporter: [
    ['line'],
    ['html', { outputFile: 'test-results/extension-report.html' }]
  ],

  // Global test timeout
  timeout: 60000, // Longer timeout for extension tests

  // Expect timeout for assertions
  expect: {
    timeout: 10000
  },

  // Shared settings
  use: {
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Record video on failures
    video: 'retain-on-failure',

    // Take screenshot on failures
    screenshot: 'only-on-failure',

    // Browser context options
    viewport: { width: 1280, height: 720 },

    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
  },

  // Configure project for Chrome extension
  projects: [
    {
      name: 'extension-chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use standard chromium instead of chrome channel
        launchOptions: {
          args: [
            '--disable-extensions-except=' + path.resolve('./dist'),
            '--load-extension=' + path.resolve('./dist'),
            '--disable-web-security',
            '--allow-running-insecure-content',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox',
            '--disable-setuid-sandbox'
          ],
          headless: false // Extension tests need headed mode
        }
      },
    }
  ],

  // Folder for test artifacts
  outputDir: 'test-results/',

  // No global setup to avoid build issues
  // globalSetup: './tests/config/global-setup-simple.js',
});