// Dashboard-Storage Integration Tests
import { test, expect } from '@playwright/test';
import { ExtensionHelper } from '../helpers/extension-helper.js';
import { ExtensionPanel } from '../helpers/page-objects/extension-panel.js';
import { DashboardTab } from '../helpers/page-objects/dashboard-tab.js';
import { StorageTab } from '../helpers/page-objects/storage-tab.js';
import { StorageTestData } from '../helpers/test-data/storage-data.js';

test.describe('Dashboard-Storage Integration', () => {
  let extensionHelper;
  let extensionPage;
  let testPage;
  let panel;
  let dashboard;
  let storage;

  test.beforeEach(async () => {
    extensionHelper = new ExtensionHelper();
    await extensionHelper.launchWithExtension();

    // Create test page with sample storage data
    const testData = StorageTestData.getSimpleData();
    testPage = await extensionHelper.createTestPage({
      localStorage: testData,
      sessionStorage: {
        'session-temp': 'temporary data',
        'session-id': 'abc123'
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

  test('can pin storage item from storage tab to dashboard', async () => {
    // Navigate to storage tab and verify data loads
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    // Find and pin a specific storage item
    const itemKey = 'user-name';
    await storage.pinStorageItem(itemKey);

    // Navigate to dashboard and verify item appears in pinned section
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const pinnedItems = await dashboard.getPinnedItems();
    expect(pinnedItems.some(item => item.key === itemKey)).toBeTruthy();

    // Verify the pinned item shows correct value
    const pinnedItem = await dashboard.getPinnedItemByKey(itemKey);
    expect(pinnedItem.value).toBe('John Doe');
    expect(pinnedItem.type).toBe('localStorage');
  });

  test('can unpin storage item from dashboard', async () => {
    // First pin an item from storage tab
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();
    await storage.pinStorageItem('theme');

    // Navigate to dashboard and verify item is pinned
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    let pinnedItems = await dashboard.getPinnedItems();
    expect(pinnedItems.some(item => item.key === 'theme')).toBeTruthy();

    // Unpin the item from dashboard
    await dashboard.unpinItem('theme');

    // Verify item is removed from pinned section
    pinnedItems = await dashboard.getPinnedItems();
    expect(pinnedItems.some(item => item.key === 'theme')).toBeFalsy();

    // Go back to storage tab and verify pin button state is reset
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();
    const isPinned = await storage.isItemPinned('theme');
    expect(isPinned).toBeFalsy();
  });

  test('search works across dashboard and storage tabs', async () => {
    const searchTerm = 'user';

    // Search in dashboard tab
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();
    await dashboard.search(searchTerm);

    const dashboardResults = await dashboard.getSearchResults();
    expect(dashboardResults.length).toBeGreaterThan(0);
    expect(dashboardResults.some(result => result.key.includes('user'))).toBeTruthy();

    // Navigate to storage and perform same search
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();
    await storage.search(searchTerm);

    const storageResults = await storage.getSearchResults();
    expect(storageResults.length).toBeGreaterThan(0);
    expect(storageResults.some(result => result.key.includes('user'))).toBeTruthy();

    // Results should be consistent between tabs
    const dashboardUserItem = dashboardResults.find(r => r.key === 'user-name');
    const storageUserItem = storageResults.find(r => r.key === 'user-name');

    if (dashboardUserItem && storageUserItem) {
      expect(dashboardUserItem.value).toBe(storageUserItem.value);
    }
  });

  test('organization mode persists between tabs', async () => {
    // Set organization mode in dashboard
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();
    await dashboard.setOrganizationMode('type');

    // Navigate to storage tab
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    // Navigate back to dashboard and verify organization mode persisted
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const currentMode = await dashboard.getOrganizationMode();
    expect(currentMode).toBe('type');

    // Verify items are organized by type
    const organizedSections = await dashboard.getOrganizedSections();
    expect(organizedSections).toContain('localStorage');
    expect(organizedSections).toContain('sessionStorage');
  });

  test('dashboard shows real-time updates when storage is modified', async () => {
    // Pin a storage item to dashboard
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();
    await storage.pinStorageItem('user-name');

    // Navigate to dashboard and verify item is visible
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    let pinnedItem = await dashboard.getPinnedItemByKey('user-name');
    expect(pinnedItem.value).toBe('John Doe');

    // Go back to storage and modify the item
    await panel.navigateToTab('storage');
    await storage.editStorageItemByKey('user-name', 'user-name', 'Jane Smith');

    // Return to dashboard and verify the update is reflected
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    pinnedItem = await dashboard.getPinnedItemByKey('user-name');
    expect(pinnedItem.value).toBe('Jane Smith');
  });

  test('storage type switching affects dashboard display', async () => {
    // Pin items from both localStorage and sessionStorage
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    // Pin localStorage item
    await storage.selectStorageType('localStorage');
    await storage.pinStorageItem('user-name');

    // Pin sessionStorage item
    await storage.selectStorageType('sessionStorage');
    await storage.pinStorageItem('session-temp');

    // Navigate to dashboard and verify both items are visible
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const pinnedItems = await dashboard.getPinnedItems();
    expect(pinnedItems.some(item => item.key === 'user-name' && item.type === 'localStorage')).toBeTruthy();
    expect(pinnedItems.some(item => item.key === 'session-temp' && item.type === 'sessionStorage')).toBeTruthy();

    // Filter dashboard by localStorage only
    await dashboard.filterByStorageType('localStorage');

    const filteredItems = await dashboard.getVisibleItems();
    expect(filteredItems.some(item => item.key === 'user-name')).toBeTruthy();
    expect(filteredItems.some(item => item.key === 'session-temp')).toBeFalsy();
  });

  test('bulk operations work between dashboard and storage', async () => {
    // Pin multiple items from storage
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    const itemsToPIn = ['user-name', 'theme', 'language'];
    for (const itemKey of itemsToPIn) {
      await storage.pinStorageItem(itemKey);
    }

    // Navigate to dashboard and verify all items are pinned
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const pinnedItems = await dashboard.getPinnedItems();
    for (const itemKey of itemsToPIn) {
      expect(pinnedItems.some(item => item.key === itemKey)).toBeTruthy();
    }

    // Select all pinned items and unpin them
    await dashboard.selectAllPinnedItems();
    await dashboard.unpinSelectedItems();

    // Verify all items are unpinned
    const remainingItems = await dashboard.getPinnedItems();
    for (const itemKey of itemsToPIn) {
      expect(remainingItems.some(item => item.key === itemKey)).toBeFalsy();
    }

    // Go back to storage and verify pin states are updated
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    for (const itemKey of itemsToPIn) {
      const isPinned = await storage.isItemPinned(itemKey);
      expect(isPinned).toBeFalsy();
    }
  });

  test('JSON data displays correctly in both dashboard and storage', async () => {
    // Add JSON data to test page
    await testPage.evaluate(() => {
      localStorage.setItem('user-profile', JSON.stringify({
        id: 12345,
        name: 'John Doe',
        email: 'john@example.com',
        preferences: { theme: 'dark', notifications: true }
      }));
    });

    // Pin the JSON item from storage
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();
    await storage.pinStorageItem('user-profile');

    // Navigate to dashboard and verify JSON is properly formatted
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const pinnedItem = await dashboard.getPinnedItemByKey('user-profile');
    expect(pinnedItem.isJson).toBeTruthy();

    // Open JSON viewer and verify content
    await dashboard.openJsonViewer('user-profile');
    const jsonContent = await dashboard.getJsonViewerContent();
    expect(jsonContent).toContain('"name": "John Doe"');
    expect(jsonContent).toContain('"email": "john@example.com"');

    await dashboard.closeJsonViewer();

    // Go to storage tab and verify JSON display is consistent
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    const storageItem = await storage.getStorageItemByKey('user-profile');
    expect(storageItem.isJson).toBeTruthy();

    await storage.openJsonViewer('user-profile');
    const storageJsonContent = await storage.getJsonViewerContent();
    expect(storageJsonContent).toBe(jsonContent);
  });

  test('drag and drop reordering works for pinned items', async () => {
    // Pin multiple items in a specific order
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    const itemsInOrder = ['user-name', 'theme', 'language', 'last-login'];
    for (const itemKey of itemsInOrder) {
      await storage.pinStorageItem(itemKey);
    }

    // Navigate to dashboard and verify initial order
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    let pinnedItems = await dashboard.getPinnedItems();
    for (let i = 0; i < itemsInOrder.length; i++) {
      expect(pinnedItems[i].key).toBe(itemsInOrder[i]);
    }

    // Drag the first item to the third position
    await dashboard.dragPinnedItem(0, 2);

    // Verify new order
    pinnedItems = await dashboard.getPinnedItems();
    expect(pinnedItems[0].key).toBe('theme');
    expect(pinnedItems[1].key).toBe('language');
    expect(pinnedItems[2].key).toBe('user-name');
    expect(pinnedItems[3].key).toBe('last-login');

    // Navigate away and back to verify order persisted
    await panel.navigateToTab('storage');
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    pinnedItems = await dashboard.getPinnedItems();
    expect(pinnedItems[0].key).toBe('theme');
    expect(pinnedItems[2].key).toBe('user-name');
  });
});