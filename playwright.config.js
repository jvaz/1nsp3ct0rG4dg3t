// Playwright configuration for 1nsp3ct0rG4dg3t Chrome extension testing
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  // Test directory
  testDir: './tests/playwright',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],

  // Global test timeout
  timeout: 30000,

  // Expect timeout for assertions
  expect: {
    timeout: 10000
  },

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'chrome-extension://',

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

  // Configure projects for major browsers
  projects: [
    {
      name: 'extension-chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Chrome extension specific configuration
        channel: 'chrome',
        launchOptions: {
          args: [
            '--disable-extensions-except=' + path.resolve('./dist'),
            '--load-extension=' + path.resolve('./dist'),
            '--disable-web-security',
            '--allow-running-insecure-content',
            '--disable-features=VizDisplayCompositor'
          ]
        }
      },
    },

    // Uncomment for Edge testing
    // {
    //   name: 'extension-edge',
    //   use: {
    //     ...devices['Desktop Edge'],
    //     channel: 'msedge',
    //     launchOptions: {
    //       args: [
    //         '--disable-extensions-except=' + path.resolve('./dist'),
    //         '--load-extension=' + path.resolve('./dist'),
    //       ]
    //     }
    //   },
    // },
  ],

  // Folder for test artifacts
  outputDir: 'test-results/',

  // Global setup file
  globalSetup: './tests/config/global-setup.js',

  // Global teardown file
  globalTeardown: './tests/config/global-teardown.js',
});