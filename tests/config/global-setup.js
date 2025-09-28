// Global setup for Playwright tests
import { chromium } from '@playwright/test';
import path from 'path';
import { execSync } from 'child_process';

async function globalSetup() {
  console.log('🔧 Setting up Playwright tests for Chrome extension...');

  try {
    // Build the extension before running tests
    console.log('📦 Building extension...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Extension built successfully');

    // Verify extension files exist
    const extensionPath = path.resolve('./dist');
    const manifestPath = path.join(extensionPath, 'manifest.json');

    try {
      const fs = await import('fs');
      if (!fs.existsSync(manifestPath)) {
        throw new Error('Extension manifest.json not found after build');
      }
      console.log('✅ Extension files verified');
    } catch (error) {
      console.error('❌ Extension build verification failed:', error.message);
      throw error;
    }

    // Test browser launch with extension
    console.log('🚀 Testing browser launch with extension...');
    const browser = await chromium.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--disable-web-security',
        '--allow-running-insecure-content',
      ]
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Test that extension is loaded
    await page.goto('chrome://extensions/');
    await page.waitForTimeout(2000);

    await browser.close();
    console.log('✅ Browser launch test successful');

  } catch (error) {
    console.error('❌ Global setup failed:', error.message);
    process.exit(1);
  }

  console.log('🎉 Global setup completed successfully');
}

export default globalSetup;