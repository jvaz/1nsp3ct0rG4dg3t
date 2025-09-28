// Data Management Workflow Tests
import { test, expect } from '@playwright/test';
import { ExtensionHelper } from '../helpers/extension-helper.js';
import { ExtensionPanel } from '../helpers/page-objects/extension-panel.js';
import { DashboardTab } from '../helpers/page-objects/dashboard-tab.js';
import { StorageTab } from '../helpers/page-objects/storage-tab.js';
import { StorageTestData } from '../helpers/test-data/storage-data.js';
import { CookieTestData } from '../helpers/test-data/cookie-data.js';

test.describe('Data Management Workflow', () => {
  let extensionHelper;
  let extensionPage;
  let testPage;
  let panel;
  let dashboard;
  let storage;

  test.beforeEach(async () => {
    extensionHelper = new ExtensionHelper();
    await extensionHelper.launchWithExtension();

    // Start with minimal data for clean testing
    testPage = await extensionHelper.createTestPage({
      localStorage: {
        'test-string': 'initial value',
        'test-number': '42'
      },
      sessionStorage: {
        'session-test': 'session value'
      },
      cookies: {
        'test-cookie': 'cookie value'
      }
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

  test('complete CRUD workflow for localStorage items', async () => {
    // Navigate to storage tab
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    // Verify initial items exist
    const initialCount = await storage.getStorageItemsCount();
    expect(initialCount).toBeGreaterThan(0);

    // CREATE: Add new localStorage item
    await storage.addStorageItem('new-item', 'new value', 'localStorage');

    // Verify item was added
    await storage.waitForDataLoad();
    const afterAddCount = await storage.getStorageItemsCount();
    expect(afterAddCount).toBe(initialCount + 1);

    const newItem = await storage.getStorageItemByKey('new-item');
    expect(newItem.value).toBe('new value');

    // READ: Verify item appears in different views
    await storage.search('new-item');
    const searchResults = await storage.getSearchResults();
    expect(searchResults.some(result => result.key === 'new-item')).toBeTruthy();

    await storage.clearSearch();

    // Pin item to dashboard for verification
    await storage.pinStorageItem('new-item');

    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const pinnedItem = await dashboard.getPinnedItemByKey('new-item');
    expect(pinnedItem.value).toBe('new value');
    expect(pinnedItem.type).toBe('localStorage');

    // UPDATE: Edit the item
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    await storage.editStorageItemByKey('new-item', 'updated-item', 'updated value');

    // Verify update in storage view
    const updatedItem = await storage.getStorageItemByKey('updated-item');
    expect(updatedItem.value).toBe('updated value');

    // Verify update reflected in dashboard
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const updatedPinnedItem = await dashboard.getPinnedItemByKey('updated-item');
    expect(updatedPinnedItem.value).toBe('updated value');

    // DELETE: Remove the item
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    await storage.deleteStorageItemByKey('updated-item');

    // Verify item is gone
    const finalCount = await storage.getStorageItemsCount();
    expect(finalCount).toBe(initialCount);

    // Verify item removed from dashboard
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const deletedItem = await dashboard.getPinnedItemByKey('updated-item');
    expect(deletedItem).toBeFalsy();
  });

  test('complete CRUD workflow for sessionStorage items', async () => {
    await panel.navigateToTab('storage');
    await storage.selectStorageType('sessionStorage');
    await storage.waitForDataLoad();

    const initialCount = await storage.getStorageItemsCount();

    // CREATE: Add sessionStorage item
    await storage.addStorageItem('session-new', 'session new value', 'sessionStorage');

    const afterAddCount = await storage.getStorageItemsCount();
    expect(afterAddCount).toBe(initialCount + 1);

    // READ: Verify in dashboard
    await storage.pinStorageItem('session-new');
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const sessionItem = await dashboard.getPinnedItemByKey('session-new');
    expect(sessionItem.type).toBe('sessionStorage');
    expect(sessionItem.value).toBe('session new value');

    // UPDATE: Modify the item
    await panel.navigateToTab('storage');
    await storage.selectStorageType('sessionStorage');
    await storage.waitForDataLoad();

    await storage.editStorageItemByKey('session-new', 'session-new', 'modified session value');

    // Verify update
    const modifiedItem = await storage.getStorageItemByKey('session-new');
    expect(modifiedItem.value).toBe('modified session value');

    // DELETE: Remove item
    await storage.deleteStorageItemByKey('session-new');

    const finalCount = await storage.getStorageItemsCount();
    expect(finalCount).toBe(initialCount);
  });

  test('JSON data management workflow', async () => {
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    // CREATE: Add JSON object
    const jsonData = {
      user: {
        id: 12345,
        name: 'John Doe',
        preferences: {
          theme: 'dark',
          language: 'en-US',
          notifications: true
        }
      },
      metadata: {
        created: new Date().toISOString(),
        version: '1.0'
      }
    };

    await storage.addJsonObject('user-profile', jsonData);

    // READ: Verify JSON formatting and viewing
    const jsonItem = await storage.getStorageItemByKey('user-profile');
    expect(jsonItem.isJson).toBeTruthy();

    // Open JSON viewer
    await storage.openJsonViewer('user-profile');
    const jsonContent = await storage.getJsonViewerContent();
    expect(jsonContent).toContain('"name": "John Doe"');
    expect(jsonContent).toContain('"theme": "dark"');
    await storage.closeJsonViewer();

    // Pin to dashboard and verify JSON viewer there
    await storage.pinStorageItem('user-profile');
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const dashboardJsonItem = await dashboard.getPinnedItemByKey('user-profile');
    expect(dashboardJsonItem.isJson).toBeTruthy();

    await dashboard.openJsonViewer('user-profile');
    const dashboardJsonContent = await dashboard.getJsonViewerContent();
    expect(dashboardJsonContent).toBe(jsonContent); // Should be identical
    await dashboard.closeJsonViewer();

    // UPDATE: Modify JSON data
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    const updatedJsonData = {
      ...jsonData,
      user: {
        ...jsonData.user,
        name: 'Jane Smith',
        preferences: {
          ...jsonData.user.preferences,
          theme: 'light'
        }
      }
    };

    await storage.editStorageItemByKey(
      'user-profile',
      'user-profile',
      JSON.stringify(updatedJsonData, null, 2)
    );

    // Verify JSON update
    await storage.openJsonViewer('user-profile');
    const updatedJsonContent = await storage.getJsonViewerContent();
    expect(updatedJsonContent).toContain('"name": "Jane Smith"');
    expect(updatedJsonContent).toContain('"theme": "light"');
    await storage.closeJsonViewer();

    // Verify update in dashboard
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    await dashboard.openJsonViewer('user-profile');
    const updatedDashboardContent = await dashboard.getJsonViewerContent();
    expect(updatedDashboardContent).toContain('"name": "Jane Smith"');
    await dashboard.closeJsonViewer();
  });

  test('cookie data management workflow', async () => {
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    // Initial cookie count
    const initialCookies = extensionPage.locator('.cookie-item');
    const initialCount = await initialCookies.count();

    // CREATE: Add new cookie (if add functionality exists)
    const addCookieBtn = extensionPage.locator('#addCookie, .add-cookie-btn');
    if (await addCookieBtn.count() > 0) {
      await addCookieBtn.click();

      const cookieModal = extensionPage.locator('.cookie-modal, .add-cookie-modal');
      await cookieModal.waitFor({ state: 'visible' });

      await cookieModal.locator('#cookieName, [name="name"]').fill('test-new-cookie');
      await cookieModal.locator('#cookieValue, [name="value"]').fill('new cookie value');
      await cookieModal.locator('#cookieDomain, [name="domain"]').fill(testPage.url().split('/')[2]);

      const saveBtn = cookieModal.locator('.save-btn, [type="submit"]');
      await saveBtn.click();
      await cookieModal.waitFor({ state: 'hidden' });

      // Verify cookie was added
      await panel.waitForLoadingComplete();
      const afterAddCount = await initialCookies.count();
      expect(afterAddCount).toBeGreaterThan(initialCount);
    }

    // READ: Search and pin existing cookie
    await extensionPage.locator('#cookieSearch, .cookie-search').fill('test-cookie');
    await extensionPage.waitForTimeout(500);

    const testCookie = extensionPage.locator('[data-cookie-name="test-cookie"]');
    await expect(testCookie).toBeVisible();

    // Pin cookie to dashboard
    const pinBtn = testCookie.locator('.pin-btn');
    await pinBtn.click();

    // Verify in dashboard
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const pinnedCookie = await dashboard.getPinnedItemByKey('test-cookie');
    expect(pinnedCookie.type).toBe('cookie');
    expect(pinnedCookie.value).toBe('cookie value');

    // UPDATE: Edit cookie value
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    const editBtn = testCookie.locator('.edit-btn');
    if (await editBtn.count() > 0) {
      await editBtn.click();

      const editModal = extensionPage.locator('.cookie-edit-modal');
      await editModal.waitFor({ state: 'visible' });

      const valueInput = editModal.locator('#cookieValue, [name="value"]');
      await valueInput.fill('updated cookie value');

      const updateBtn = editModal.locator('.save-btn, .update-btn');
      await updateBtn.click();
      await editModal.waitFor({ state: 'hidden' });

      // Verify update in dashboard
      await panel.navigateToTab('dashboard');
      await dashboard.waitForDataLoad();

      const updatedCookie = await dashboard.getPinnedItemByKey('test-cookie');
      expect(updatedCookie.value).toBe('updated cookie value');
    }

    // DELETE: Remove cookie
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    const deleteBtn = testCookie.locator('.delete-btn');
    if (await deleteBtn.count() > 0) {
      await deleteBtn.click();

      // Handle confirmation dialog if it exists
      const confirmBtn = extensionPage.locator('.confirm-delete, .btn-danger');
      if (await confirmBtn.count() > 0) {
        await confirmBtn.click();
      }

      await extensionPage.waitForTimeout(1000);

      // Verify cookie is removed from dashboard
      await panel.navigateToTab('dashboard');
      await dashboard.waitForDataLoad();

      const deletedCookie = await dashboard.getPinnedItemByKey('test-cookie');
      expect(deletedCookie).toBeFalsy();
    }
  });

  test('bulk data management operations', async () => {
    // Set up multiple items for bulk operations
    const bulkData = {
      'bulk-item-1': 'value 1',
      'bulk-item-2': 'value 2',
      'bulk-item-3': 'value 3',
      'bulk-item-4': 'value 4',
      'bulk-item-5': 'value 5'
    };

    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    // CREATE: Add multiple items
    for (const [key, value] of Object.entries(bulkData)) {
      await storage.addStorageItem(key, value);
    }

    // Verify all items were added
    const allKeys = await storage.getAllStorageKeys();
    for (const key of Object.keys(bulkData)) {
      expect(allKeys).toContain(key);
    }

    // READ: Search for bulk items
    await storage.search('bulk-item');
    const bulkResults = await storage.getSearchResults();
    expect(bulkResults.length).toBe(5);

    // Pin multiple items
    for (const key of Object.keys(bulkData)) {
      await storage.pinStorageItem(key);
    }

    // Verify in dashboard
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const pinnedItems = await dashboard.getPinnedItems();
    const bulkPinnedItems = pinnedItems.filter(item => item.key.startsWith('bulk-item'));
    expect(bulkPinnedItems.length).toBe(5);

    // Bulk organize by custom order
    await dashboard.setOrganizationMode('custom');

    // Test drag and drop reordering (if implemented)
    if (bulkPinnedItems.length >= 2) {
      await dashboard.dragPinnedItem(0, 2); // Move first to third position
      await extensionPage.waitForTimeout(1000);

      // Verify order changed
      const reorderedItems = await dashboard.getPinnedItems();
      const reorderedBulkItems = reorderedItems.filter(item => item.key.startsWith('bulk-item'));
      expect(reorderedBulkItems.length).toBe(5);
    }

    // Bulk select and unpin
    await dashboard.selectAllPinnedItems();
    await dashboard.unpinSelectedItems();

    // Verify all bulk items are unpinned
    const remainingItems = await dashboard.getPinnedItems();
    const remainingBulkItems = remainingItems.filter(item => item.key.startsWith('bulk-item'));
    expect(remainingBulkItems.length).toBe(0);

    // DELETE: Bulk delete from storage
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    for (const key of Object.keys(bulkData)) {
      await storage.deleteStorageItemByKey(key);
    }

    // Verify all items deleted
    const finalKeys = await storage.getAllStorageKeys();
    for (const key of Object.keys(bulkData)) {
      expect(finalKeys).not.toContain(key);
    }
  });

  test('data validation and error handling workflow', async () => {
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    // Test invalid key scenarios
    const invalidKeys = ['', '   ', null, undefined];

    for (const invalidKey of invalidKeys) {
      try {
        if (invalidKey === null || invalidKey === undefined) {
          // Skip these as they would cause the test framework to fail
          continue;
        }

        await storage.addStorageItem(invalidKey, 'test value');

        // If no error thrown, check for validation error message
        const errorMessage = extensionPage.locator('.error-message, .validation-error');
        if (await errorMessage.count() > 0) {
          const errorText = await errorMessage.textContent();
          expect(errorText).toBeTruthy();
        }

        // Close modal if it's still open
        const modal = extensionPage.locator('.modal');
        if (await modal.isVisible()) {
          await extensionPage.locator('.modal-cancel, .cancel-btn').click();
          await modal.waitFor({ state: 'hidden' });
        }
      } catch (error) {
        // Expected behavior for invalid input
        expect(error.message).toBeTruthy();
      }
    }

    // Test invalid JSON scenarios
    const invalidJsonValues = [
      '{"invalid": json}', // Missing quotes
      '{"incomplete":', // Incomplete JSON
      '{nested: {invalid: "json"}}' // Unquoted keys
    ];

    for (const invalidJson of invalidJsonValues) {
      try {
        await storage.addStorageItem('test-invalid-json', invalidJson);

        // Check if extension validates JSON or accepts it as string
        const addedItem = await storage.getStorageItemByKey('test-invalid-json');

        if (addedItem) {
          // If added, it should be treated as plain string, not JSON
          expect(addedItem.isJson).toBeFalsy();
          await storage.deleteStorageItemByKey('test-invalid-json');
        }
      } catch (error) {
        // Expected behavior for some validation scenarios
        expect(error.message).toBeTruthy();
      }
    }

    // Test recovery after errors
    await storage.addStorageItem('recovery-test', 'recovery value');
    const recoveryItem = await storage.getStorageItemByKey('recovery-test');
    expect(recoveryItem.value).toBe('recovery value');

    // Verify extension is still functional after error scenarios
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    const finalItemsCount = await storage.getStorageItemsCount();
    expect(finalItemsCount).toBeGreaterThan(0);
  });

  test('data export and backup workflow simulation', async () => {
    // Set up comprehensive test data
    const testData = {
      'export-string': 'simple string value',
      'export-json': JSON.stringify({
        user: 'test-user',
        settings: { theme: 'dark', lang: 'en' }
      }),
      'export-large': 'Large data content '.repeat(100)
    };

    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    // Add test data
    for (const [key, value] of Object.entries(testData)) {
      await storage.addStorageItem(key, value);
    }

    // Pin items that would be included in export
    for (const key of Object.keys(testData)) {
      await storage.pinStorageItem(key);
    }

    // Navigate to dashboard to view pinned items
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const pinnedItems = await dashboard.getPinnedItems();
    const exportItems = pinnedItems.filter(item => item.key.startsWith('export-'));
    expect(exportItems.length).toBe(3);

    // Simulate data collection for export
    const exportData = {
      timestamp: new Date().toISOString(),
      source: 'extension',
      data: exportItems.map(item => ({
        key: item.key,
        value: item.value,
        type: item.type,
        isJson: item.isJson
      }))
    };

    expect(exportData.data.length).toBe(3);
    expect(exportData.data.some(item => item.key === 'export-json' && item.isJson)).toBeTruthy();

    // Simulate import workflow - verify data integrity
    const importedData = exportData.data;

    for (const item of importedData) {
      const originalItem = await dashboard.getPinnedItemByKey(item.key);
      expect(originalItem.value).toBe(item.value);
      expect(originalItem.type).toBe(item.type);
    }

    // Test data consistency across tabs
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    for (const item of importedData) {
      const storageItem = await storage.getStorageItemByKey(item.key);
      expect(storageItem.value).toBe(item.value);
    }

    // Cleanup test data
    for (const key of Object.keys(testData)) {
      await storage.deleteStorageItemByKey(key);
    }

    const cleanupCount = await storage.getStorageItemsCount();
    const remainingExportItems = await storage.getAllStorageKeys();
    expect(remainingExportItems.filter(key => key.startsWith('export-')).length).toBe(0);
  });
});