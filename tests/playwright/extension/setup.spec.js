// Extension Setup and Initialization Tests
import { test, expect } from '@playwright/test';
import { ExtensionHelper } from '../helpers/extension-helper.js';
import { ExtensionPanel } from '../helpers/page-objects/extension-panel.js';

test.describe('Extension Setup and Initialization', () => {
  let extensionHelper;
  let extensionPage;
  let panel;

  test.beforeEach(async () => {
    extensionHelper = new ExtensionHelper();
    await extensionHelper.launchWithExtension();
    extensionPage = await extensionHelper.openSidePanel();
    panel = new ExtensionPanel(extensionPage);
  });

  test.afterEach(async () => {
    await extensionHelper.cleanup();
  });

  test('extension loads successfully', async () => {
    // Verify extension ID is obtained
    expect(extensionHelper.extensionId).toBeTruthy();
    expect(extensionHelper.extensionId).toMatch(/^[a-z]+$/);
  });

  test('side panel opens and displays correctly', async () => {
    // Verify panel loads
    await panel.waitForLoad();

    // Check main container is visible
    await expect(panel.container).toBeVisible();

    // Verify page title
    const title = await extensionPage.title();
    expect(title).toContain('1nsp3ct0rG4dg3t');
  });

  test('all tabs are present and accessible', async () => {
    await panel.waitForLoad();

    // Verify all tab buttons exist and are enabled
    await panel.verifyTabsPresent();

    // Test navigation to each tab
    await panel.navigateToTab('dashboard');
    expect(await panel.getActiveTab()).toBe('dashboard');
    await expect(panel.dashboardContent).toBeVisible();

    await panel.navigateToTab('storage');
    expect(await panel.getActiveTab()).toBe('storage');
    await expect(panel.storageContent).toBeVisible();

    await panel.navigateToTab('cookies');
    expect(await panel.getActiveTab()).toBe('cookies');
    await expect(panel.cookiesContent).toBeVisible();

    await panel.navigateToTab('application');
    expect(await panel.getActiveTab()).toBe('application');
    await expect(panel.applicationContent).toBeVisible();
  });

  test('connection status shows as connected', async () => {
    await panel.waitForLoad();
    await panel.verifyConnected();

    const statusText = await panel.connectionStatus.textContent();
    expect(statusText).toBe('Connected');
  });

  test('theme toggle works correctly', async () => {
    await panel.waitForLoad();

    // Get initial theme
    const initialTheme = await panel.getCurrentTheme();
    expect(['light', 'dark']).toContain(initialTheme);

    // Toggle theme
    await panel.toggleTheme();
    const newTheme = await panel.getCurrentTheme();

    // Verify theme changed
    expect(newTheme).not.toBe(initialTheme);

    // Toggle back
    await panel.toggleTheme();
    const finalTheme = await panel.getCurrentTheme();
    expect(finalTheme).toBe(initialTheme);
  });

  test('footer elements are present', async () => {
    await panel.waitForLoad();

    // Verify footer is visible
    await expect(panel.footer).toBeVisible();

    // Check footer links
    const links = panel.footer.locator('a');
    expect(await links.count()).toBeGreaterThan(0);

    // Verify about button exists
    await expect(panel.aboutButton).toBeVisible();
  });

  test('about modal opens and closes', async () => {
    await panel.waitForLoad();

    // Open about modal
    await panel.openAboutModal();
    await expect(panel.modal).toBeVisible();

    // Close modal
    await panel.closeModal();
    await expect(panel.modal).not.toBeVisible();
  });

  test('no error messages on initial load', async () => {
    await panel.waitForLoad();
    await panel.verifyNoErrors();
  });

  test('extension works with different website contexts', async () => {
    // Create a test page with some data
    const testPage = await extensionHelper.createTestPage({
      localStorage: {
        'test-key': 'test-value',
        'json-data': JSON.stringify({ name: 'test', value: 42 })
      },
      cookies: {
        'test-cookie': 'cookie-value'
      }
    });

    // Verify test page loaded
    await expect(testPage.locator('h1')).toHaveText('Test Page');

    // Open extension panel
    await panel.waitForLoad();

    // Navigate to storage tab to verify extension can access storage
    await panel.navigateToTab('storage');
    await panel.waitForLoadingComplete();

    // Navigate to cookies tab to verify extension can access cookies
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    await testPage.close();
  });

  test('extension maintains state across tab switches', async () => {
    await panel.waitForLoad();

    // Start on dashboard
    await panel.navigateToTab('dashboard');
    let activeTab = await panel.getActiveTab();
    expect(activeTab).toBe('dashboard');

    // Switch to storage
    await panel.navigateToTab('storage');
    activeTab = await panel.getActiveTab();
    expect(activeTab).toBe('storage');

    // Switch back to dashboard
    await panel.navigateToTab('dashboard');
    activeTab = await panel.getActiveTab();
    expect(activeTab).toBe('dashboard');
  });

  test('extension handles keyboard navigation', async () => {
    await panel.waitForLoad();

    // Test Escape key functionality (should close modals)
    await panel.openAboutModal();
    await extensionPage.keyboard.press('Escape');
    await expect(panel.modal).not.toBeVisible();

    // Test tab navigation with keyboard
    await panel.dashboardTab.focus();
    await extensionPage.keyboard.press('Enter');
    expect(await panel.getActiveTab()).toBe('dashboard');
  });

  test('extension responsive design works', async () => {
    await panel.waitForLoad();

    // Test different viewport sizes
    await extensionPage.setViewportSize({ width: 400, height: 600 });
    await expect(panel.container).toBeVisible();

    await extensionPage.setViewportSize({ width: 800, height: 1000 });
    await expect(panel.container).toBeVisible();

    // Verify tabs are still accessible in smaller viewport
    await panel.navigateToTab('storage');
    await expect(panel.storageContent).toBeVisible();
  });
});