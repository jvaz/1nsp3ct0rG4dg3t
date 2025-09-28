// Developer Debugging Workflow Tests
import { test, expect } from '@playwright/test';
import { ExtensionHelper } from '../helpers/extension-helper.js';
import { ExtensionPanel } from '../helpers/page-objects/extension-panel.js';
import { DashboardTab } from '../helpers/page-objects/dashboard-tab.js';
import { StorageTab } from '../helpers/page-objects/storage-tab.js';
import { StorageTestData } from '../helpers/test-data/storage-data.js';
import { CookieTestData } from '../helpers/test-data/cookie-data.js';

test.describe('Developer Debugging Workflow', () => {
  let extensionHelper;
  let extensionPage;
  let testPage;
  let panel;
  let dashboard;
  let storage;

  test.beforeEach(async () => {
    extensionHelper = new ExtensionHelper();
    await extensionHelper.launchWithExtension();

    // Create realistic debugging scenario with complex app data
    const appData = StorageTestData.getRealisticAppData();
    const userCookies = CookieTestData.getEcommerceCookies();

    testPage = await extensionHelper.createTestPage({
      localStorage: {
        ...appData,
        // Add debug-specific data
        'debug-session': JSON.stringify({
          enabled: true,
          level: 'verbose',
          startTime: Date.now(),
          userId: 'dev-12345'
        }),
        'feature-flags': JSON.stringify({
          newCheckout: true,
          betaFeatures: false,
          debugMode: true
        }),
        'cart-items': JSON.stringify([
          { id: 1, name: 'Product A', price: 29.99, quantity: 2 },
          { id: 2, name: 'Product B', price: 49.99, quantity: 1 }
        ])
      },
      sessionStorage: {
        'current-page': '/checkout',
        'navigation-history': JSON.stringify(['/home', '/products', '/cart', '/checkout']),
        'form-state': JSON.stringify({
          step: 2,
          completed: ['shipping', 'payment'],
          current: 'review'
        })
      },
      cookies: userCookies
    });

    extensionPage = await extensionHelper.openSidePanel();
    panel = new ExtensionPanel(extensionPage);
    dashboard = new DashboardTab(extensionPage);
    storage = new StorageTab(extensionPage);

    await panel.waitForLoad();
  });

  test.afterEach(async () => {
    await extensionHelper.cleanup();
  });

  test('complete debugging workflow: identify issue, pin relevant data, track changes', async () => {
    // Scenario: Debug checkout flow issue
    // Step 1: Open extension and get overview of current state
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    // Developer notices checkout is broken, needs to inspect state
    await dashboard.search('checkout');

    const checkoutResults = await dashboard.getSearchResults();
    expect(checkoutResults.length).toBeGreaterThan(0);

    // Step 2: Pin relevant checkout-related data
    const checkoutRelatedKeys = ['cart-items', 'form-state', 'current-page'];

    for (const key of checkoutRelatedKeys) {
      const resultIndex = checkoutResults.findIndex(result => result.key.includes(key.split('-')[0]));
      if (resultIndex >= 0) {
        await dashboard.pinFromSearch(resultIndex);
      }
    }

    // Navigate to storage tab to find additional relevant data
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    // Pin additional debugging data
    await storage.pinStorageItem('debug-session');
    await storage.pinStorageItem('feature-flags');

    // Step 3: Verify pinned data in dashboard
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const pinnedItems = await dashboard.getPinnedItems();
    const debuggingItems = pinnedItems.filter(item =>
      ['cart-items', 'form-state', 'debug-session', 'feature-flags'].includes(item.key)
    );

    expect(debuggingItems.length).toBeGreaterThan(3);

    // Step 4: Analyze the data - examine form state
    const formStateItem = await dashboard.getPinnedItemByKey('form-state');
    expect(formStateItem.isJson).toBeTruthy();

    await dashboard.openJsonViewer('form-state');
    const formStateJson = await dashboard.getJsonViewerContent();
    expect(formStateJson).toContain('"step": 2');
    expect(formStateJson).toContain('"current": "review"');
    await dashboard.closeJsonViewer();

    // Step 5: Examine cart items to verify data integrity
    const cartItemsItem = await dashboard.getPinnedItemByKey('cart-items');
    await dashboard.openJsonViewer('cart-items');
    const cartJson = await dashboard.getJsonViewerContent();
    expect(cartJson).toContain('Product A');
    expect(cartJson).toContain('29.99');
    await dashboard.closeJsonViewer();

    // Step 6: Check feature flags for potential issues
    const featureFlagsItem = await dashboard.getPinnedItemByKey('feature-flags');
    await dashboard.openJsonViewer('feature-flags');
    const flagsJson = await dashboard.getJsonViewerContent();
    expect(flagsJson).toContain('"newCheckout": true');
    expect(flagsJson).toContain('"debugMode": true');
    await dashboard.closeJsonViewer();

    // Step 7: Monitor session storage for navigation state
    await panel.navigateToTab('storage');
    await storage.selectStorageType('sessionStorage');
    await storage.waitForDataLoad();

    const currentPageItem = await storage.getStorageItemByKey('current-page');
    expect(currentPageItem.value).toBe('/checkout');

    const navHistoryItem = await storage.getStorageItemByKey('navigation-history');
    expect(navHistoryItem.isJson).toBeTruthy();

    // Pin navigation data for monitoring
    await storage.pinStorageItem('current-page');
    await storage.pinStorageItem('navigation-history');

    // Step 8: Return to dashboard and organize debugging data
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();
    await dashboard.setOrganizationMode('type');

    const organizedSections = await dashboard.getOrganizedSections();
    expect(organizedSections).toContain('localStorage');
    expect(organizedSections).toContain('sessionStorage');
  });

  test('performance debugging workflow: identify slow loading data', async () => {
    // Add large data that might cause performance issues
    const largeDataset = StorageTestData.getLargeDataset(100);
    for (const [key, value] of Object.entries(largeDataset)) {
      await testPage.evaluate(([k, v]) => {
        localStorage.setItem(k, v);
      }, [key, value]);
    }

    // Step 1: Monitor extension performance
    const startTime = Date.now();

    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    const loadTime = Date.now() - startTime;
    console.log(`Storage load time: ${loadTime}ms`);

    // Step 2: Identify potentially problematic items
    const searchStartTime = Date.now();
    await storage.search('json');
    const searchTime = Date.now() - searchStartTime;

    expect(searchTime).toBeLessThan(2000); // Search should be performant

    const searchResults = await storage.getSearchResults();
    const largeItems = [];

    // Step 3: Find and analyze large data items
    for (const result of searchResults) {
      if (result.value.length > 1000) { // Large values
        largeItems.push(result);
      }
    }

    // Pin large items for monitoring
    if (largeItems.length > 0) {
      for (let i = 0; i < Math.min(3, largeItems.length); i++) {
        await storage.pinStorageItem(largeItems[i].key);
      }
    }

    // Step 4: Check dashboard performance with large dataset
    const dashboardStartTime = Date.now();
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();
    const dashboardLoadTime = Date.now() - dashboardStartTime;

    expect(dashboardLoadTime).toBeLessThan(3000); // Dashboard should handle large datasets

    // Step 5: Test organization modes with large data
    const orgStartTime = Date.now();
    await dashboard.setOrganizationMode('alphabetical');
    await extensionPage.waitForTimeout(1000);
    const orgTime = Date.now() - orgStartTime;

    expect(orgTime).toBeLessThan(2000); // Organization should be fast

    // Step 6: Performance test - rapid tab switching
    const tabSwitchTimes = [];
    const tabs = ['storage', 'cookies', 'dashboard', 'application'];

    for (const tab of tabs) {
      const switchStartTime = Date.now();
      await panel.navigateToTab(tab);
      await panel.waitForLoadingComplete();
      const switchTime = Date.now() - switchStartTime;
      tabSwitchTimes.push(switchTime);
    }

    // All tab switches should be under 2 seconds
    for (const time of tabSwitchTimes) {
      expect(time).toBeLessThan(2000);
    }

    const avgSwitchTime = tabSwitchTimes.reduce((a, b) => a + b) / tabSwitchTimes.length;
    console.log(`Average tab switch time: ${avgSwitchTime}ms`);
  });

  test('security debugging workflow: identify security issues', async () => {
    // Add security-related data and cookies
    await testPage.evaluate(() => {
      // Potentially sensitive data
      localStorage.setItem('api-key', 'sk_live_1234567890abcdef');
      localStorage.setItem('user-token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
      localStorage.setItem('credit-card', JSON.stringify({
        number: '4111-1111-1111-1111',
        expiry: '12/25',
        cvv: '123'
      }));
      localStorage.setItem('session-data', JSON.stringify({
        userId: 'user123',
        role: 'admin',
        permissions: ['read', 'write', 'delete']
      }));
    });

    // Add insecure cookies
    const insecureCookies = CookieTestData.getInsecureCookies();
    await testPage.context().addCookies(Object.values(insecureCookies));

    // Step 1: Search for potentially sensitive data
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    const securityKeywords = ['token', 'key', 'password', 'credit', 'card'];
    const suspiciousItems = [];

    for (const keyword of securityKeywords) {
      await storage.search(keyword);
      const results = await storage.getSearchResults();

      for (const result of results) {
        if (result.key.toLowerCase().includes(keyword) ||
            result.value.toLowerCase().includes(keyword)) {
          suspiciousItems.push(result);
        }
      }

      await storage.clearSearch();
    }

    // Step 2: Pin security-sensitive items for review
    const uniqueItems = [...new Set(suspiciousItems.map(item => item.key))];
    for (const itemKey of uniqueItems.slice(0, 5)) { // Pin first 5 unique items
      try {
        await storage.pinStorageItem(itemKey);
      } catch (error) {
        // Item might not exist, continue
      }
    }

    // Step 3: Review cookies for security issues
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    // Look for security indicators or warnings
    const securityWarnings = extensionPage.locator('.security-warning, .warning');
    const warningCount = await securityWarnings.count();

    if (warningCount > 0) {
      // Extension should highlight security issues
      for (let i = 0; i < warningCount; i++) {
        const warning = securityWarnings.nth(i);
        const warningText = await warning.textContent();
        expect(warningText).toBeTruthy();
      }
    }

    // Step 4: Check dashboard for security overview
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const pinnedItems = await dashboard.getPinnedItems();
    const securityItems = pinnedItems.filter(item =>
      ['api-key', 'user-token', 'credit-card', 'session-data'].includes(item.key)
    );

    expect(securityItems.length).toBeGreaterThan(0);

    // Step 5: Analyze sensitive data structure
    if (securityItems.some(item => item.key === 'session-data')) {
      await dashboard.openJsonViewer('session-data');
      const sessionJson = await dashboard.getJsonViewerContent();
      expect(sessionJson).toContain('admin');
      expect(sessionJson).toContain('permissions');
      await dashboard.closeJsonViewer();
    }

    // Step 6: Document security findings
    // In a real scenario, developer would document these findings
    const securityFindings = {
      sensitiveLocalStorage: uniqueItems.length,
      insecureCookies: warningCount,
      adminPrivileges: securityItems.some(item => item.key === 'session-data')
    };

    expect(securityFindings.sensitiveLocalStorage).toBeGreaterThan(0);
  });

  test('feature flag debugging workflow: track feature state changes', async () => {
    // Step 1: Initial feature flag state inspection
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    await storage.search('feature');
    const flagResults = await storage.getSearchResults();
    expect(flagResults.length).toBeGreaterThan(0);

    // Pin feature flags for monitoring
    await storage.pinStorageItem('feature-flags');

    // Step 2: Monitor current flag state
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const featureFlagsItem = await dashboard.getPinnedItemByKey('feature-flags');
    await dashboard.openJsonViewer('feature-flags');
    const initialFlags = await dashboard.getJsonViewerContent();
    expect(initialFlags).toContain('"newCheckout": true');
    expect(initialFlags).toContain('"debugMode": true');
    await dashboard.closeJsonViewer();

    // Step 3: Simulate feature flag change (as would happen in app)
    await testPage.evaluate(() => {
      const flags = JSON.parse(localStorage.getItem('feature-flags'));
      flags.newCheckout = false; // Disable new checkout
      flags.betaFeatures = true; // Enable beta features
      localStorage.setItem('feature-flags', JSON.stringify(flags));
    });

    // Step 4: Refresh and verify changes are detected
    await dashboard.refresh();
    await dashboard.waitForDataLoad();

    const updatedFlagsItem = await dashboard.getPinnedItemByKey('feature-flags');
    await dashboard.openJsonViewer('feature-flags');
    const updatedFlags = await dashboard.getJsonViewerContent();
    expect(updatedFlags).toContain('"newCheckout": false');
    expect(updatedFlags).toContain('"betaFeatures": true');
    await dashboard.closeJsonViewer();

    // Step 5: Test interaction with debug session
    await storage.navigate();
    await storage.waitForDataLoad();

    const debugSessionItem = await storage.getStorageItemByKey('debug-session');
    expect(debugSessionItem.isJson).toBeTruthy();

    // Pin debug session to track correlation with feature flags
    if (!debugSessionItem.isPinned) {
      await storage.pinStorageItem('debug-session');
    }

    // Step 6: Verify debug and feature flag correlation in dashboard
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();
    await dashboard.setOrganizationMode('type');

    const localStorageItems = await dashboard.getVisibleItems();
    const debugRelatedItems = localStorageItems.filter(item =>
      ['feature-flags', 'debug-session'].includes(item.key)
    );

    expect(debugRelatedItems.length).toBe(2);

    // Step 7: Test feature flag impact on app behavior
    // Simulate checking if flags affect navigation or form state
    await testPage.evaluate(() => {
      const flags = JSON.parse(localStorage.getItem('feature-flags'));
      const formState = JSON.parse(sessionStorage.getItem('form-state'));

      // Simulate conditional behavior based on flags
      if (!flags.newCheckout) {
        formState.fallbackCheckout = true;
        sessionStorage.setItem('form-state', JSON.stringify(formState));
      }
    });

    // Verify the change propagated
    await panel.navigateToTab('storage');
    await storage.selectStorageType('sessionStorage');
    await storage.waitForDataLoad();

    const updatedFormState = await storage.getStorageItemByKey('form-state');
    expect(updatedFormState.value).toContain('fallbackCheckout');
  });

  test('cross-component debugging workflow: track data flow between storage and cookies', async () => {
    // Step 1: Identify data synchronization between storage and cookies
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    // Pin authentication-related storage
    await storage.pinStorageItem('auth-token');
    await storage.pinStorageItem('user-id');

    // Step 2: Check corresponding cookies
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    // Look for session cookies that might correspond to storage tokens
    const sessionCookies = extensionPage.locator('[data-cookie-name*="session"], [data-cookie-name*="auth"]');
    const sessionCookieCount = await sessionCookies.count();

    if (sessionCookieCount > 0) {
      // Pin first session cookie
      await sessionCookies.first().locator('.pin-btn').click();
    }

    // Step 3: Monitor data consistency in dashboard
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const pinnedItems = await dashboard.getPinnedItems();
    const authItems = pinnedItems.filter(item =>
      item.key.includes('auth') || item.key.includes('user') || item.key.includes('session')
    );

    expect(authItems.length).toBeGreaterThan(1);

    // Step 4: Test data modification and cross-component updates
    await testPage.evaluate(() => {
      // Simulate user logout - clear auth token
      localStorage.removeItem('auth-token');
      localStorage.setItem('user-id', 'anonymous');
    });

    // Step 5: Verify changes reflected in dashboard
    await dashboard.refresh();
    await dashboard.waitForDataLoad();

    // Auth token should be gone, user-id should be updated
    const authTokenAfter = await dashboard.getPinnedItemByKey('auth-token');
    expect(authTokenAfter).toBeFalsy(); // Should not exist

    const userIdAfter = await dashboard.getPinnedItemByKey('user-id');
    expect(userIdAfter.value).toBe('anonymous');

    // Step 6: Check if cookies were also affected (in real app scenario)
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    // In a real app, session cookies might be cleared when auth token is removed
    // This tests the extension's ability to track such changes
    const remainingCookies = extensionPage.locator('.cookie-item');
    const cookieCount = await remainingCookies.count();
    expect(cookieCount).toBeGreaterThan(0); // Still should have some cookies

    // Step 7: Document the debugging session
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    // Create a custom organization to group debugging findings
    await dashboard.setOrganizationMode('custom');

    // Drag related items together (if drag-and-drop is implemented)
    const debuggingItems = ['user-id', 'debug-session', 'feature-flags'];
    let itemIndex = 0;

    for (const itemKey of debuggingItems) {
      const item = await dashboard.getPinnedItemByKey(itemKey);
      if (item) {
        // In a real implementation, items would be dragged to group them
        expect(item).toBeTruthy();
        itemIndex++;
      }
    }

    expect(itemIndex).toBeGreaterThan(1); // At least 2 items should be available for grouping
  });
});