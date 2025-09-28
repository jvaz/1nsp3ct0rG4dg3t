// Page Object Model for Storage Tab
export class StorageTab {
  constructor(page) {
    this.page = page;

    // Main storage elements
    this.container = page.locator('#storage');
    this.storageTypeSelector = page.locator('#storageType');
    this.searchInput = page.locator('#storageSearch');
    this.searchClearButton = page.locator('#storageSearchClear');
    this.addButton = page.locator('#addStorageItem');
    this.refreshButton = page.locator('#refreshStorage');

    // Storage items
    this.storageItems = page.locator('.storage-item');
    this.storageKeys = page.locator('.storage-key');
    this.storageValues = page.locator('.storage-value');

    // Item action buttons
    this.pinButtons = page.locator('.storage-item .pin-btn');
    this.editButtons = page.locator('.storage-item .edit-btn');
    this.deleteButtons = page.locator('.storage-item .delete-btn');

    // Modal elements
    this.modal = page.locator('.modal');
    this.modalTitle = page.locator('.modal-title');
    this.modalForm = page.locator('.modal-form');

    // Form fields
    this.keyInput = page.locator('#storageKey');
    this.valueInput = page.locator('#storageValue');
    this.typeSelect = page.locator('#storageType');
    this.saveButton = page.locator('.modal-submit');
    this.cancelButton = page.locator('.modal-cancel');

    // JSON viewer
    this.jsonViewButton = page.locator('.view-json-btn');
    this.jsonModal = page.locator('.json-viewer-modal');
    this.jsonContent = page.locator('.json-content');

    // Empty states and messages
    this.emptyState = page.locator('.empty-state');
    this.loadingState = page.locator('.loading');
    this.errorMessage = page.locator('.error-message');
  }

  /**
   * Navigate to storage tab and wait for load
   */
  async navigate() {
    await this.page.locator('.tab-btn[data-tab="storage"]').click();
    await this.container.waitFor({ state: 'visible' });
    await this.page.waitForTimeout(500);
  }

  /**
   * Switch between localStorage and sessionStorage
   */
  async selectStorageType(type) {
    await this.navigate();
    await this.storageTypeSelector.selectOption(type);
    await this.page.waitForTimeout(1000); // Allow data to load
  }

  /**
   * Get current storage type
   */
  async getCurrentStorageType() {
    return await this.storageTypeSelector.inputValue();
  }

  /**
   * Search for storage items
   */
  async search(query) {
    await this.navigate();
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Allow search to filter
  }

  /**
   * Clear search
   */
  async clearSearch() {
    await this.searchClearButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Get count of visible storage items
   */
  async getStorageItemsCount() {
    await this.page.waitForTimeout(500);
    return await this.storageItems.count();
  }

  /**
   * Get storage item by index
   */
  async getStorageItem(index) {
    const item = this.storageItems.nth(index);
    return {
      key: await item.locator('.storage-key').textContent(),
      value: await item.locator('.storage-value').textContent(),
      isPinned: (await item.locator('.pin-btn').getAttribute('title'))?.includes('Unpin')
    };
  }

  /**
   * Find storage item by key
   */
  async findStorageItemByKey(key) {
    const count = await this.getStorageItemsCount();

    for (let i = 0; i < count; i++) {
      const item = await this.getStorageItem(i);
      if (item.key === key) {
        return { ...item, index: i };
      }
    }

    return null;
  }

  /**
   * Add new storage item
   */
  async addStorageItem(key, value, storageType = 'localStorage') {
    await this.navigate();
    await this.addButton.click();
    await this.modal.waitFor({ state: 'visible' });

    await this.keyInput.fill(key);
    await this.valueInput.fill(value);
    await this.typeSelect.selectOption(storageType);

    await this.saveButton.click();
    await this.modal.waitFor({ state: 'hidden' });
    await this.page.waitForTimeout(1000); // Allow item to be added
  }

  /**
   * Edit storage item
   */
  async editStorageItem(index, newKey, newValue) {
    const editButton = this.storageItems.nth(index).locator('.edit-btn');
    await editButton.click();
    await this.modal.waitFor({ state: 'visible' });

    if (newKey !== undefined) {
      await this.keyInput.fill(newKey);
    }
    if (newValue !== undefined) {
      await this.valueInput.fill(newValue);
    }

    await this.saveButton.click();
    await this.modal.waitFor({ state: 'hidden' });
    await this.page.waitForTimeout(1000);
  }

  /**
   * Edit storage item by key
   */
  async editStorageItemByKey(key, newKey, newValue) {
    const item = await this.findStorageItemByKey(key);
    if (!item) {
      throw new Error(`Storage item with key "${key}" not found`);
    }
    await this.editStorageItem(item.index, newKey, newValue);
  }

  /**
   * Delete storage item
   */
  async deleteStorageItem(index) {
    const deleteButton = this.storageItems.nth(index).locator('.delete-btn');
    await deleteButton.click();
    await this.page.waitForTimeout(1000); // Allow deletion
  }

  /**
   * Delete storage item by key
   */
  async deleteStorageItemByKey(key) {
    const item = await this.findStorageItemByKey(key);
    if (!item) {
      throw new Error(`Storage item with key "${key}" not found`);
    }
    await this.deleteStorageItem(item.index);
  }

  /**
   * Pin/unpin storage item
   */
  async togglePin(index) {
    const pinButton = this.storageItems.nth(index).locator('.pin-btn');
    await pinButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Pin storage item by key
   */
  async pinStorageItemByKey(key) {
    const item = await this.findStorageItemByKey(key);
    if (!item) {
      throw new Error(`Storage item with key "${key}" not found`);
    }
    if (!item.isPinned) {
      await this.togglePin(item.index);
    }
  }

  /**
   * View JSON for a storage item
   */
  async viewJson(index) {
    const jsonButton = this.storageItems.nth(index).locator('.view-json-btn');
    if (await jsonButton.count() > 0) {
      await jsonButton.click();
      await this.jsonModal.waitFor({ state: 'visible' });
      return await this.jsonContent.textContent();
    }
    return null;
  }

  /**
   * Close JSON viewer
   */
  async closeJsonViewer() {
    if (await this.jsonModal.isVisible()) {
      await this.page.keyboard.press('Escape');
      await this.jsonModal.waitFor({ state: 'hidden' });
    }
  }

  /**
   * Refresh storage data
   */
  async refresh() {
    await this.refreshButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Cancel modal operation
   */
  async cancelModal() {
    await this.cancelButton.click();
    await this.modal.waitFor({ state: 'hidden' });
  }

  /**
   * Verify empty state
   */
  async verifyEmptyState() {
    await this.emptyState.waitFor({ state: 'visible' });
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingComplete() {
    await this.page.waitForFunction(() => {
      const loading = document.querySelector('#storage .loading');
      return !loading || loading.style.display === 'none';
    }, { timeout: 10000 });
  }

  /**
   * Verify storage item exists
   */
  async verifyStorageItemExists(key, value = null) {
    const item = await this.findStorageItemByKey(key);
    expect(item).not.toBeNull();

    if (value !== null) {
      expect(item.value).toContain(value);
    }
  }

  /**
   * Verify storage item does not exist
   */
  async verifyStorageItemNotExists(key) {
    const item = await this.findStorageItemByKey(key);
    expect(item).toBeNull();
  }

  /**
   * Get all storage keys
   */
  async getAllStorageKeys() {
    const count = await this.getStorageItemsCount();
    const keys = [];

    for (let i = 0; i < count; i++) {
      const item = await this.getStorageItem(i);
      keys.push(item.key);
    }

    return keys;
  }

  /**
   * Verify JSON formatting in storage value
   */
  async verifyJsonFormatting(index) {
    const item = this.storageItems.nth(index);
    const value = await item.locator('.storage-value').textContent();

    // Check if value appears to be formatted JSON (contains newlines and indentation)
    const isFormatted = value.includes('\n') && value.includes('  ');
    return isFormatted;
  }

  /**
   * Add JSON object to storage
   */
  async addJsonObject(key, jsonObject, storageType = 'localStorage') {
    const jsonString = JSON.stringify(jsonObject, null, 2);
    await this.addStorageItem(key, jsonString, storageType);
  }

  /**
   * Verify form validation error
   */
  async verifyValidationError(expectedMessage) {
    const errorElement = this.modal.locator('.error, .validation-error');
    await errorElement.waitFor({ state: 'visible' });
    const errorText = await errorElement.textContent();
    expect(errorText).toContain(expectedMessage);
  }

  // Integration test support methods

  /**
   * Wait for storage data to load
   */
  async waitForDataLoad() {
    await this.page.waitForTimeout(1000);
    await this.page.waitForFunction(() => {
      return !document.querySelector('#storage .loading') &&
             document.querySelector('#storage');
    }, { timeout: 10000 });
  }

  /**
   * Pin storage item by key (integration helper)
   */
  async pinStorageItem(key) {
    const item = await this.findStorageItemByKey(key);
    if (!item) {
      throw new Error(`Storage item with key "${key}" not found`);
    }
    if (!item.isPinned) {
      await this.togglePin(item.index);
    }
  }

  /**
   * Check if item is pinned
   */
  async isItemPinned(key) {
    const item = await this.findStorageItemByKey(key);
    return item ? item.isPinned : false;
  }

  /**
   * Get search results after filtering
   */
  async getSearchResults() {
    await this.page.waitForTimeout(500);
    const count = await this.storageItems.count();
    const results = [];

    for (let i = 0; i < count; i++) {
      const item = await this.getStorageItem(i);
      results.push(item);
    }

    return results;
  }

  /**
   * Get storage item by key
   */
  async getStorageItemByKey(key) {
    const item = await this.findStorageItemByKey(key);
    if (!item) {
      throw new Error(`Storage item with key "${key}" not found`);
    }
    return {
      key: item.key,
      value: item.value,
      isJson: this.isJsonValue(item.value),
      isPinned: item.isPinned
    };
  }

  /**
   * Check if value is JSON
   */
  isJsonValue(value) {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Open JSON viewer for item by key
   */
  async openJsonViewer(key) {
    const item = await this.findStorageItemByKey(key);
    if (!item) {
      throw new Error(`Storage item with key "${key}" not found`);
    }

    const jsonButton = this.storageItems.nth(item.index).locator('.view-json-btn');
    if (await jsonButton.count() > 0) {
      await jsonButton.click();
      await this.jsonModal.waitFor({ state: 'visible' });
    }
  }

  /**
   * Get JSON viewer content
   */
  async getJsonViewerContent() {
    await this.jsonModal.waitFor({ state: 'visible' });
    return await this.jsonContent.textContent();
  }
}