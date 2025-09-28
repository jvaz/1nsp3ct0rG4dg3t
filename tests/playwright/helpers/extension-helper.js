// Extension helper utilities for Playwright tests
import { chromium } from '@playwright/test';
import path from 'path';

/**
 * Extension helper class for managing Chrome extension testing
 */
export class ExtensionHelper {
  constructor() {
    this.extensionPath = path.resolve('./dist');
    this.browser = null;
    this.context = null;
    this.extensionId = null;
  }

  /**
   * Launch browser with extension loaded
   */
  async launchWithExtension() {
    this.browser = await chromium.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${this.extensionPath}`,
        `--load-extension=${this.extensionPath}`,
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    this.context = await this.browser.newContext();

    // Get extension ID
    this.extensionId = await this.getExtensionId();

    return {
      browser: this.browser,
      context: this.context,
      extensionId: this.extensionId
    };
  }

  /**
   * Get the extension ID from chrome://extensions
   */
  async getExtensionId() {
    const page = await this.context.newPage();

    try {
      await page.goto('chrome://extensions/');
      await page.waitForTimeout(2000);

      // Look for the extension by name
      const extensionCard = page.locator('.extension-list-item').filter({
        hasText: '1nsp3ct0rG4dg3t'
      }).first();

      if (await extensionCard.count() === 0) {
        throw new Error('Extension not found in chrome://extensions');
      }

      // Extract extension ID from the URL or element
      const extensionId = await extensionCard.getAttribute('id');

      if (!extensionId) {
        // Alternative method: extract from inspect link
        const inspectLink = extensionCard.locator('text=inspect');
        const href = await inspectLink.getAttribute('href');
        const match = href?.match(/chrome-extension:\/\/([a-z]+)\//);
        if (match) {
          return match[1];
        }
        throw new Error('Could not extract extension ID');
      }

      return extensionId.replace('extension-', '');
    } finally {
      await page.close();
    }
  }

  /**
   * Open the extension side panel
   */
  async openSidePanel() {
    if (!this.extensionId) {
      throw new Error('Extension ID not available. Call launchWithExtension() first.');
    }

    const page = await this.context.newPage();
    const panelUrl = `chrome-extension://${this.extensionId}/panel.html`;

    await page.goto(panelUrl);
    await page.waitForLoadState('domcontentloaded');

    return page;
  }

  /**
   * Wait for extension to be ready
   */
  async waitForExtensionReady(page) {
    // Wait for the main container to be visible
    await page.waitForSelector('.app-container', { timeout: 10000 });

    // Wait for connection status to show "Connected"
    await page.waitForSelector('#connectionStatus:has-text("Connected")', { timeout: 10000 });

    // Wait for tab navigation to be ready
    await page.waitForSelector('.tab-nav', { timeout: 5000 });
  }

  /**
   * Create a test website page with specific storage/cookie data
   */
  async createTestPage(data = {}) {
    const page = await this.context.newPage();

    // Navigate to a test page (using data URL for control)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test Page for Extension</title>
      </head>
      <body>
        <h1>Test Page</h1>
        <p>This page is used for testing the 1nsp3ct0rG4dg3t extension.</p>
        <script>
          // Set up test data
          ${data.localStorage ? this.generateStorageScript('localStorage', data.localStorage) : ''}
          ${data.sessionStorage ? this.generateStorageScript('sessionStorage', data.sessionStorage) : ''}
          ${data.cookies ? this.generateCookieScript(data.cookies) : ''}
        </script>
      </body>
      </html>
    `;

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
    await page.goto(dataUrl);
    await page.waitForLoadState('domcontentloaded');

    return page;
  }

  /**
   * Generate JavaScript for setting storage data
   */
  generateStorageScript(storageType, data) {
    const scripts = [];
    for (const [key, value] of Object.entries(data)) {
      const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
      scripts.push(`${storageType}.setItem('${key}', '${valueStr}');`);
    }
    return scripts.join('\n');
  }

  /**
   * Generate JavaScript for setting cookies
   */
  generateCookieScript(cookies) {
    const scripts = [];
    for (const [name, value] of Object.entries(cookies)) {
      scripts.push(`document.cookie = '${name}=${value}; path=/';`);
    }
    return scripts.join('\n');
  }

  /**
   * Navigate to a real website for testing
   */
  async navigateToTestSite(url) {
    const page = await this.context.newPage();
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    return page;
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }
}

/**
 * Fixture for Playwright tests
 */
export const extensionFixture = {
  extensionHelper: async ({}, use) => {
    const helper = new ExtensionHelper();
    await helper.launchWithExtension();
    await use(helper);
    await helper.cleanup();
  },

  extensionPage: async ({ extensionHelper }, use) => {
    const page = await extensionHelper.openSidePanel();
    await extensionHelper.waitForExtensionReady(page);
    await use(page);
    await page.close();
  }
};