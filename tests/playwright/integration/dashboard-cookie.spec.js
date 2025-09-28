// Dashboard-Cookie Integration Tests
import { test, expect } from '@playwright/test';
import { ExtensionHelper } from '../helpers/extension-helper.js';
import { ExtensionPanel } from '../helpers/page-objects/extension-panel.js';
import { DashboardTab } from '../helpers/page-objects/dashboard-tab.js';
import { CookieTestData } from '../helpers/test-data/cookie-data.js';

test.describe('Dashboard-Cookie Integration', () => {
  let extensionHelper;
  let extensionPage;
  let testPage;
  let panel;
  let dashboard;

  test.beforeEach(async () => {
    extensionHelper = new ExtensionHelper();
    await extensionHelper.launchWithExtension();

    // Create test page with sample cookies
    const testCookies = CookieTestData.getBasicCookies();
    testPage = await extensionHelper.createTestPage({
      cookies: testCookies
    });

    extensionPage = await extensionHelper.openSidePanel();
    panel = new ExtensionPanel(extensionPage);
    dashboard = new DashboardTab(extensionPage);

    await panel.waitForLoad();
  });

  test.afterEach(async () => {
    await extensionHelper.cleanup();
  });

  test('can pin cookie from cookies tab to dashboard', async () => {
    // Navigate to cookies tab and verify cookies load
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    // Pin a specific cookie
    const cookieName = 'session-id';
    await extensionPage.locator(`[data-cookie-name="${cookieName}"] .pin-btn`).click();

    // Navigate to dashboard and verify cookie appears in pinned section
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const pinnedItems = await dashboard.getPinnedItems();
    expect(pinnedItems.some(item => item.key === cookieName)).toBeTruthy();

    // Verify the pinned cookie shows correct value and type
    const pinnedCookie = await dashboard.getPinnedItemByKey(cookieName);
    expect(pinnedCookie.value).toBe('abc123def456');
    expect(pinnedCookie.type).toBe('cookie');
  });

  test('can unpin cookie from dashboard', async () => {
    // First pin a cookie from cookies tab
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();
    await extensionPage.locator('[data-cookie-name="user-preference"] .pin-btn').click();

    // Navigate to dashboard and verify cookie is pinned
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    let pinnedItems = await dashboard.getPinnedItems();
    expect(pinnedItems.some(item => item.key === 'user-preference')).toBeTruthy();

    // Unpin the cookie from dashboard
    await dashboard.unpinItem('user-preference');

    // Verify cookie is removed from pinned section
    pinnedItems = await dashboard.getPinnedItems();
    expect(pinnedItems.some(item => item.key === 'user-preference')).toBeFalsy();

    // Go back to cookies tab and verify pin button state is reset
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();
    const pinButton = extensionPage.locator('[data-cookie-name="user-preference"] .pin-btn');
    const isPinned = await pinButton.getAttribute('data-pinned');
    expect(isPinned).toBe('false');
  });

  test('dashboard shows cookie security warnings', async () => {
    // Add insecure cookies to test page
    const insecureCookies = CookieTestData.getInsecureCookies();
    await testPage.context().addCookies(Object.values(insecureCookies));

    // Pin an insecure cookie
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();
    await extensionPage.locator('[data-cookie-name="insecure-session"] .pin-btn').click();

    // Navigate to dashboard and verify security warning appears
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const pinnedCookie = await dashboard.getPinnedItemByKey('insecure-session');
    expect(pinnedCookie).toBeTruthy();

    // Check for security warning indicator
    const securityWarning = extensionPage.locator('[data-pinned-key="insecure-session"] .security-warning');
    await expect(securityWarning).toBeVisible();

    // Verify warning tooltip or modal
    await securityWarning.hover();
    const tooltip = extensionPage.locator('.security-tooltip');
    await expect(tooltip).toBeVisible();
    const tooltipText = await tooltip.textContent();
    expect(tooltipText).toContain('not secure');
  });

  test('cookie modifications reflect in dashboard real-time', async () => {
    // Pin a cookie to dashboard
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();
    await extensionPage.locator('[data-cookie-name="language"] .pin-btn').click();

    // Navigate to dashboard and verify initial value
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    let pinnedCookie = await dashboard.getPinnedItemByKey('language');
    expect(pinnedCookie.value).toBe('en-US');

    // Go back to cookies tab and modify the cookie
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    // Edit the cookie value
    const editButton = extensionPage.locator('[data-cookie-name="language"] .edit-btn');
    await editButton.click();

    const modal = extensionPage.locator('.cookie-edit-modal');
    await modal.waitFor({ state: 'visible' });

    const valueInput = modal.locator('#cookieValue');
    await valueInput.fill('es-ES');

    const saveButton = modal.locator('.save-btn');
    await saveButton.click();
    await modal.waitFor({ state: 'hidden' });

    // Return to dashboard and verify the update is reflected
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    pinnedCookie = await dashboard.getPinnedItemByKey('language');
    expect(pinnedCookie.value).toBe('es-ES');
  });

  test('search works across dashboard and cookies for cookie data', async () => {
    const searchTerm = 'session';

    // Search in dashboard tab
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();
    await dashboard.search(searchTerm);

    const dashboardResults = await dashboard.getSearchResults();
    const cookieResults = dashboardResults.filter(result => result.type === 'cookie');
    expect(cookieResults.length).toBeGreaterThan(0);
    expect(cookieResults.some(result => result.key.includes('session'))).toBeTruthy();

    // Navigate to cookies and perform same search
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    const cookieSearchInput = extensionPage.locator('#cookieSearch');
    await cookieSearchInput.fill(searchTerm);
    await extensionPage.waitForTimeout(500);

    const cookieSearchResults = extensionPage.locator('.cookie-item:visible');
    const cookieCount = await cookieSearchResults.count();
    expect(cookieCount).toBeGreaterThan(0);

    // Verify results consistency
    const firstCookieResult = cookieSearchResults.first();
    const cookieName = await firstCookieResult.locator('.cookie-name').textContent();
    expect(cookieName).toContain('session');
  });

  test('cookie security analysis appears in dashboard', async () => {
    // Add cookies with various security configurations
    const advancedCookies = CookieTestData.getAdvancedCookies();
    await testPage.context().addCookies(advancedCookies);

    // Pin cookies with different security levels
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    // Pin secure cookie
    await extensionPage.locator('[data-cookie-name="secure-session"] .pin-btn').click();

    // Pin tracking cookie
    await extensionPage.locator('[data-cookie-name="tracking-id"] .pin-btn').click();

    // Navigate to dashboard
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    // Verify secure cookie shows green security indicator
    const secureCookie = extensionPage.locator('[data-pinned-key="secure-session"]');
    const secureIndicator = secureCookie.locator('.security-indicator.secure');
    await expect(secureIndicator).toBeVisible();

    // Verify tracking cookie shows appropriate security status
    const trackingCookie = extensionPage.locator('[data-pinned-key="tracking-id"]');
    const trackingIndicator = trackingCookie.locator('.security-indicator');
    await expect(trackingIndicator).toBeVisible();

    // Check security score or rating display
    const securityScore = secureCookie.locator('.security-score');
    if (await securityScore.count() > 0) {
      const scoreText = await securityScore.textContent();
      expect(scoreText).toMatch(/\d+/); // Should contain a numeric score
    }
  });

  test('cookie domain filtering works with dashboard', async () => {
    // Add cookies from different domains
    const domainCookies = [
      { name: 'main-cookie', value: 'main-value', domain: testPage.url().split('/')[2] },
      { name: 'sub-cookie', value: 'sub-value', domain: 'sub.example.com' },
      { name: 'api-cookie', value: 'api-value', domain: 'api.example.com' }
    ];

    for (const cookie of domainCookies) {
      await testPage.context().addCookies([cookie]);
    }

    // Pin cookies from different domains
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    for (const cookie of domainCookies) {
      const pinButton = extensionPage.locator(`[data-cookie-name="${cookie.name}"] .pin-btn`);
      if (await pinButton.count() > 0) {
        await pinButton.click();
      }
    }

    // Navigate to dashboard and verify domain organization
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();
    await dashboard.setOrganizationMode('domain');

    const organizedSections = await dashboard.getOrganizedSections();
    expect(organizedSections.length).toBeGreaterThan(1);

    // Filter by current domain
    const currentDomain = testPage.url().split('/')[2];
    await dashboard.filterByDomain(currentDomain);

    const visibleItems = await dashboard.getVisibleItems();
    const currentDomainItems = visibleItems.filter(item =>
      item.domain === currentDomain || item.key === 'main-cookie'
    );
    expect(currentDomainItems.length).toBeGreaterThan(0);
  });

  test('cookie expiration warnings in dashboard', async () => {
    // Add cookies with different expiration dates
    const now = Date.now();
    const expiringCookies = [
      {
        name: 'expiring-soon',
        value: 'expires-soon',
        domain: testPage.url().split('/')[2],
        expirationDate: Math.floor(now / 1000) + 3600 // Expires in 1 hour
      },
      {
        name: 'expired-cookie',
        value: 'already-expired',
        domain: testPage.url().split('/')[2],
        expirationDate: Math.floor(now / 1000) - 3600 // Expired 1 hour ago
      }
    ];

    await testPage.context().addCookies(expiringCookies);

    // Pin the expiring cookie
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();
    await extensionPage.locator('[data-cookie-name="expiring-soon"] .pin-btn').click();

    // Navigate to dashboard and verify expiration warning
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const expiringCookie = extensionPage.locator('[data-pinned-key="expiring-soon"]');
    const expirationWarning = expiringCookie.locator('.expiration-warning');
    await expect(expirationWarning).toBeVisible();

    // Verify warning message
    await expirationWarning.hover();
    const warningTooltip = extensionPage.locator('.expiration-tooltip');
    const tooltipText = await warningTooltip.textContent();
    expect(tooltipText).toContain('expires');
  });

  test('bulk cookie operations from dashboard', async () => {
    // Pin multiple cookies
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    const cookiesToPin = ['session-id', 'user-preference', 'language'];
    for (const cookieName of cookiesToPin) {
      const pinButton = extensionPage.locator(`[data-cookie-name="${cookieName}"] .pin-btn`);
      if (await pinButton.count() > 0) {
        await pinButton.click();
      }
    }

    // Navigate to dashboard and verify all cookies are pinned
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const pinnedItems = await dashboard.getPinnedItems();
    for (const cookieName of cookiesToPin) {
      expect(pinnedItems.some(item => item.key === cookieName && item.type === 'cookie')).toBeTruthy();
    }

    // Select all cookie items in dashboard
    await dashboard.selectItemsByType('cookie');

    // Unpin selected cookies
    await dashboard.unpinSelectedItems();

    // Verify all cookies are unpinned
    const remainingItems = await dashboard.getPinnedItems();
    const remainingCookies = remainingItems.filter(item => item.type === 'cookie');
    expect(remainingCookies.length).toBe(0);

    // Go back to cookies tab and verify pin states are updated
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    for (const cookieName of cookiesToPin) {
      const pinButton = extensionPage.locator(`[data-cookie-name="${cookieName}"] .pin-btn`);
      if (await pinButton.count() > 0) {
        const isPinned = await pinButton.getAttribute('data-pinned');
        expect(isPinned).toBe('false');
      }
    }
  });
});