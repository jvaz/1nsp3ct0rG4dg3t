// Simplified global setup for testing Playwright without building
import { chromium } from '@playwright/test';

async function globalSetup() {
  console.log('🔧 Setting up basic Playwright test...');

  try {
    // Test browser launch without extension
    console.log('🚀 Testing basic browser launch...');
    const browser = await chromium.launch({
      headless: true
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Test basic navigation
    await page.goto('https://example.com');
    const title = await page.title();
    console.log('✅ Page title:', title);

    await browser.close();
    console.log('✅ Basic browser test successful');

  } catch (error) {
    console.error('❌ Global setup failed:', error.message);
    process.exit(1);
  }

  console.log('🎉 Basic setup completed successfully');
}

export default globalSetup;