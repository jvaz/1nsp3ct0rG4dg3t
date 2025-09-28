// Simple test to verify Playwright setup without Chrome extension
import { test, expect } from '@playwright/test';

test.describe('Basic Playwright Setup', () => {
  test('browser launches successfully', async ({ page }) => {
    await page.goto('https://example.com');
    await expect(page).toHaveTitle('Example Domain');
    const heading = page.locator('h1');
    await expect(heading).toHaveText('Example Domain');
  });

  test('basic page interaction works', async ({ page }) => {
    await page.goto('data:text/html,<h1>Test Page</h1><button>Click me</button>');
    await expect(page.locator('h1')).toHaveText('Test Page');
    await expect(page.locator('button')).toBeVisible();
  });
});