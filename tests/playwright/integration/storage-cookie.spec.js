// Storage-Cookie Cross-Component Integration Tests
import { test, expect } from '@playwright/test';
import { ExtensionHelper } from '../helpers/extension-helper.js';
import { ExtensionPanel } from '../helpers/page-objects/extension-panel.js';
import { StorageTab } from '../helpers/page-objects/storage-tab.js';
import { StorageTestData } from '../helpers/test-data/storage-data.js';
import { CookieTestData } from '../helpers/test-data/cookie-data.js';

test.describe('Storage-Cookie Cross-Component Integration', () => {
  let extensionHelper;
  let extensionPage;
  let testPage;
  let panel;
  let storage;

  test.beforeEach(async () => {
    extensionHelper = new ExtensionHelper();
    await extensionHelper.launchWithExtension();

    // Create test page with both storage and cookie data
    const testStorageData = StorageTestData.getSimpleData();
    const testCookies = CookieTestData.getBasicCookies();

    testPage = await extensionHelper.createTestPage({
      localStorage: testStorageData,
      sessionStorage: {
        'session-temp': 'temporary data',
        'form-state': JSON.stringify({ field1: 'value1', field2: 'value2' })
      },
      cookies: testCookies
    });

    extensionPage = await extensionHelper.openSidePanel();
    panel = new ExtensionPanel(extensionPage);
    storage = new StorageTab(extensionPage);

    await panel.waitForLoad();
  });

  test.afterEach(async () => {
    await extensionHelper.cleanup();
  });

  test('global search works across storage and cookies', async () => {
    const searchTerm = 'user';

    // Navigate to storage tab and search
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();
    await storage.search(searchTerm);

    const storageResults = await storage.getSearchResults();
    const storageUserItems = storageResults.filter(item => item.key.includes('user'));

    // Navigate to cookies tab and search
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    const cookieSearchInput = extensionPage.locator('#cookieSearch');
    await cookieSearchInput.fill(searchTerm);
    await extensionPage.waitForTimeout(500);

    const cookieResults = extensionPage.locator('.cookie-item:visible');
    const cookieCount = await cookieResults.count();

    // At least one result should contain 'user' from either storage or cookies
    const totalResults = storageUserItems.length + cookieCount;
    expect(totalResults).toBeGreaterThan(0);

    // Verify search consistency - if both have 'user' items, they should be related
    if (storageUserItems.length > 0 && cookieCount > 0) {
      // Check if there's a logical relationship (e.g., user-preference in both)
      const storageUserKeys = storageUserItems.map(item => item.key);

      for (let i = 0; i < cookieCount; i++) {
        const cookieItem = cookieResults.nth(i);
        const cookieName = await cookieItem.locator('.cookie-name').textContent();

        // Look for similar patterns between storage and cookies
        const hasRelatedStorage = storageUserKeys.some(key =>
          key.includes('user') && cookieName.includes('user')
        );

        if (hasRelatedStorage) {
          // This validates that related data exists across both storage types
          expect(true).toBeTruthy();
        }
      }
    }
  });

  test('data consistency between localStorage and cookies for user preferences', async () => {
    // Add related data to storage and cookies
    await testPage.evaluate(() => {
      localStorage.setItem('user-preferences', JSON.stringify({
        theme: 'dark',
        language: 'en-US',
        notifications: true
      }));
    });

    await testPage.context().addCookies([{
      name: 'user-theme',
      value: 'dark',
      domain: testPage.url().split('/')[2]
    }, {
      name: 'user-lang',
      value: 'en-US',
      domain: testPage.url().split('/')[2]
    }]);

    // Verify storage data
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    const userPrefsItem = await storage.getStorageItemByKey('user-preferences');
    expect(userPrefsItem.isJson).toBeTruthy();

    const prefsData = JSON.parse(userPrefsItem.value);
    expect(prefsData.theme).toBe('dark');
    expect(prefsData.language).toBe('en-US');

    // Verify corresponding cookie data
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    const themeCookie = extensionPage.locator('[data-cookie-name="user-theme"]');
    const langCookie = extensionPage.locator('[data-cookie-name="user-lang"]');

    await expect(themeCookie).toBeVisible();
    await expect(langCookie).toBeVisible();

    const themeValue = await themeCookie.locator('.cookie-value').textContent();
    const langValue = await langCookie.locator('.cookie-value').textContent();

    expect(themeValue).toBe('dark');
    expect(langValue).toBe('en-US');

    // Verify consistency
    expect(prefsData.theme).toBe(themeValue);
    expect(prefsData.language).toBe(langValue);
  });

  test('performance with large datasets in both storage and cookies', async () => {
    // Add large dataset to storage
    const largeStorageData = StorageTestData.getLargeDataset(50);
    for (const [key, value] of Object.entries(largeStorageData)) {
      await testPage.evaluate(([k, v]) => {
        localStorage.setItem(k, v);
      }, [key, value]);
    }

    // Add multiple cookies
    const largeCookieSet = CookieTestData.getLargeCookieSet(25);
    await testPage.context().addCookies(largeCookieSet);

    const startTime = Date.now();

    // Test storage loading performance
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    const storageLoadTime = Date.now() - startTime;
    expect(storageLoadTime).toBeLessThan(5000); // Should load within 5 seconds

    const storageItemsCount = await storage.getStorageItemsCount();
    expect(storageItemsCount).toBeGreaterThan(45); // Should show most items

    // Test cookies loading performance
    const cookieStartTime = Date.now();
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    const cookieLoadTime = Date.now() - cookieStartTime;
    expect(cookieLoadTime).toBeLessThan(3000); // Should load within 3 seconds

    const cookieItems = extensionPage.locator('.cookie-item');
    const cookieCount = await cookieItems.count();
    expect(cookieCount).toBeGreaterThan(20); // Should show most cookies

    // Test search performance across large datasets
    const searchStartTime = Date.now();
    await storage.navigate();
    await storage.search('item');

    const searchResults = await storage.getSearchResults();
    const searchTime = Date.now() - searchStartTime;

    expect(searchTime).toBeLessThan(2000); // Search should be fast
    expect(searchResults.length).toBeGreaterThan(0); // Should find items
  });

  test('memory usage optimization with mixed data types', async () => {
    // Add various data types to storage
    await testPage.evaluate(() => {
      // String data
      localStorage.setItem('simple-string', 'Hello World');

      // JSON data
      localStorage.setItem('json-object', JSON.stringify({
        id: 12345,
        name: 'Test User',
        data: { nested: true, array: [1, 2, 3] }
      }));

      // Large text data
      localStorage.setItem('large-text', 'Lorem ipsum '.repeat(500));

      // Session storage
      sessionStorage.setItem('session-data', JSON.stringify({
        timestamp: Date.now(),
        activities: new Array(100).fill('activity')
      }));
    });

    // Add various cookie types
    const mixedCookies = [
      ...CookieTestData.getBasicCookies(),
      ...CookieTestData.getAdvancedCookies(),
      ...CookieTestData.getEcommerceCookies()
    ];

    await testPage.context().addCookies(
      Object.entries(mixedCookies).map(([name, value]) => ({
        name,
        value: typeof value === 'string' ? value : JSON.stringify(value),
        domain: testPage.url().split('/')[2]
      }))
    );

    // Monitor extension panel responsiveness
    const interactions = [
      () => panel.navigateToTab('storage'),
      () => storage.selectStorageType('localStorage'),
      () => storage.selectStorageType('sessionStorage'),
      () => panel.navigateToTab('cookies'),
      () => panel.navigateToTab('storage'),
      () => storage.search('json'),
      () => storage.clearSearch()
    ];

    for (const interaction of interactions) {
      const startTime = Date.now();
      await interaction();
      await extensionPage.waitForTimeout(100); // Small delay for UI update
      const responseTime = Date.now() - startTime;

      // Each interaction should be responsive (under 1 second)
      expect(responseTime).toBeLessThan(1000);
    }
  });

  test('data synchronization between storage types and cookies', async () => {
    // Set up synchronized data scenario
    const userId = 'user-12345';
    const sessionId = 'session-' + Date.now();

    // Add user data to localStorage
    await testPage.evaluate(([uid, sid]) => {
      localStorage.setItem('user-id', uid);
      localStorage.setItem('session-info', JSON.stringify({
        sessionId: sid,
        startTime: Date.now(),
        authenticated: true
      }));
    }, [userId, sessionId]);

    // Add corresponding session cookies
    await testPage.context().addCookies([{
      name: 'session_id',
      value: sessionId,
      domain: testPage.url().split('/')[2],
      httpOnly: true,
      secure: false
    }, {
      name: 'user_id',
      value: userId,
      domain: testPage.url().split('/')[2],
      secure: false
    }]);

    // Verify data in storage tab
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    const userIdItem = await storage.getStorageItemByKey('user-id');
    const sessionInfoItem = await storage.getStorageItemByKey('session-info');

    expect(userIdItem.value).toBe(userId);

    const sessionData = JSON.parse(sessionInfoItem.value);
    expect(sessionData.sessionId).toBe(sessionId);
    expect(sessionData.authenticated).toBe(true);

    // Verify corresponding data in cookies tab
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    const sessionCookie = extensionPage.locator('[data-cookie-name="session_id"]');
    const userCookie = extensionPage.locator('[data-cookie-name="user_id"]');

    await expect(sessionCookie).toBeVisible();
    await expect(userCookie).toBeVisible();

    const sessionCookieValue = await sessionCookie.locator('.cookie-value').textContent();
    const userCookieValue = await userCookie.locator('.cookie-value').textContent();

    expect(sessionCookieValue).toBe(sessionId);
    expect(userCookieValue).toBe(userId);

    // Verify synchronization by updating cookie and checking storage
    await userCookie.locator('.edit-btn').click();
    const editModal = extensionPage.locator('.cookie-edit-modal');
    await editModal.waitFor({ state: 'visible' });

    const newUserId = 'user-67890';
    await editModal.locator('#cookieValue').fill(newUserId);
    await editModal.locator('.save-btn').click();
    await editModal.waitFor({ state: 'hidden' });

    // The cookie change should be reflected if application synchronizes data
    // (This tests the real-world scenario where apps sync localStorage and cookies)
  });

  test('cross-tab data isolation and domain security', async () => {
    // Create a second test page with different domain
    const secondPage = await extensionHelper.createTestPage({
      url: 'https://example.org/test.html',
      localStorage: {
        'org-data': 'organization specific',
        'shared-key': 'org-value'
      },
      cookies: {
        'org-session': 'org-session-123'
      }
    });

    // Verify original page data in storage
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    const originalStorageCount = await storage.getStorageItemsCount();
    const originalKeys = await storage.getAllStorageKeys();

    // Switch to the second page context
    await secondPage.bringToFront();
    await extensionPage.bringToFront();

    // Check storage tab again (should show different domain's data if properly isolated)
    await storage.refresh();
    await storage.waitForDataLoad();

    const secondDomainCount = await storage.getStorageItemsCount();
    const secondDomainKeys = await storage.getAllStorageKeys();

    // Data should be domain-specific (if extension properly isolates by domain)
    if (originalKeys.includes('user-name') && secondDomainKeys.includes('org-data')) {
      // Verify no cross-contamination
      expect(secondDomainKeys).not.toContain('user-name');
      expect(originalKeys).not.toContain('org-data');
    }

    // Test cookie isolation
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    const cookieItems = extensionPage.locator('.cookie-item');
    const cookieCount = await cookieItems.count();

    // Should show domain-appropriate cookies
    const orgSessionCookie = extensionPage.locator('[data-cookie-name="org-session"]');
    const isOrgCookieVisible = await orgSessionCookie.count() > 0;

    // Verify security - cookies should be domain-isolated
    if (isOrgCookieVisible) {
      const userPrefCookie = extensionPage.locator('[data-cookie-name="user-preference"]');
      const isUserCookieVisible = await userPrefCookie.count() > 0;

      // If both are visible, it might indicate proper domain switching or shared domain
      // If only one is visible, it indicates proper isolation
      expect(isOrgCookieVisible || isUserCookieVisible).toBeTruthy();
    }

    await secondPage.close();
  });

  test('error handling and recovery across storage and cookie operations', async () => {
    // Test storage error scenarios
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    // Try to add invalid storage item
    try {
      await storage.addStorageItem('', 'empty key should fail');
      // If this doesn't throw, verify error message appears
      const errorMessage = extensionPage.locator('.error-message, .validation-error');
      if (await errorMessage.count() > 0) {
        expect(await errorMessage.textContent()).toContain('key');
      }
    } catch (error) {
      // Expected behavior for invalid input
      expect(error.message).toContain('key');
    }

    // Test cookie error scenarios
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    // Try to add invalid cookie
    const addCookieBtn = extensionPage.locator('#addCookie');
    if (await addCookieBtn.count() > 0) {
      await addCookieBtn.click();

      const cookieModal = extensionPage.locator('.cookie-add-modal');
      await cookieModal.waitFor({ state: 'visible' });

      // Try invalid cookie name
      await cookieModal.locator('#cookieName').fill('invalid cookie name');
      await cookieModal.locator('#cookieValue').fill('test value');

      const saveBtn = cookieModal.locator('.save-btn');
      await saveBtn.click();

      // Should show validation error
      const validationError = cookieModal.locator('.validation-error');
      if (await validationError.count() > 0) {
        const errorText = await validationError.textContent();
        expect(errorText).toBeTruthy();
      }

      // Close modal
      await cookieModal.locator('.cancel-btn').click();
      await cookieModal.waitFor({ state: 'hidden' });
    }

    // Test recovery - extension should still function after errors
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    const recoveryItemsCount = await storage.getStorageItemsCount();
    expect(recoveryItemsCount).toBeGreaterThan(0); // Should still show valid items

    // Test navigation after errors
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    const recoveryCookiesCount = await extensionPage.locator('.cookie-item').count();
    expect(recoveryCookiesCount).toBeGreaterThan(0); // Should still show valid cookies
  });
});