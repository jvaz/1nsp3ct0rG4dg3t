// Page Object Model for Dashboard Tab
export class DashboardTab {
  constructor(page) {
    this.page = page;

    // Main dashboard elements
    this.container = page.locator('#dashboard');
    this.searchInput = page.locator('#dashboardSearch');
    this.searchClearButton = page.locator('#dashboardSearchClear');
    this.pinnedPropertiesContainer = page.locator('.pinned-properties');

    // Organization controls
    this.organizationSelect = page.locator('#organizationMode');
    this.refreshButton = page.locator('#refreshDashboard');

    // Search results
    this.searchResults = page.locator('.search-results');
    this.searchResultItems = page.locator('.search-result-item');
    this.searchPinButtons = page.locator('.search-pin-btn');
    this.alreadyPinnedIndicators = page.locator('.btn.btn-success.disabled');

    // Pinned property items
    this.pinnedItems = page.locator('.pinned-property-item');
    this.pinButtons = page.locator('.pin-btn');
    this.unpinButtons = page.locator('.unpin-btn');

    // Empty states
    this.emptyState = page.locator('.empty-state');
    this.noPinnedMessage = page.locator('text=No properties pinned yet');
    this.noSearchResults = page.locator('text=No results found');
  }

  /**
   * Navigate to dashboard tab and wait for load
   */
  async navigate() {
    await this.page.locator('.tab-btn[data-tab="dashboard"]').click();
    await this.container.waitFor({ state: 'visible' });
    await this.page.waitForTimeout(500);
  }

  /**
   * Perform search operation
   */
  async search(query) {
    await this.navigate();
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForTimeout(1000); // Allow search to complete
  }

  /**
   * Clear search input
   */
  async clearSearch() {
    await this.navigate();
    await this.searchClearButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Clear search using Escape key
   */
  async clearSearchWithEscape() {
    await this.navigate();
    await this.searchInput.press('Escape');
    await this.page.waitForTimeout(500);
  }

  /**
   * Get search results count
   */
  async getSearchResultsCount() {
    await this.page.waitForTimeout(500); // Ensure results are loaded
    return await this.searchResultItems.count();
  }

  /**
   * Get search result by index
   */
  async getSearchResult(index) {
    const item = this.searchResultItems.nth(index);
    return {
      type: await item.locator('.search-result-type').textContent(),
      domain: await item.locator('.search-result-domain').textContent(),
      key: await item.locator('.search-result-key').textContent(),
      value: await item.locator('.search-result-value').textContent(),
      isPinned: await item.locator('.btn-success.disabled').count() > 0
    };
  }

  /**
   * Pin a property from search results
   */
  async pinFromSearch(index) {
    const pinButton = this.searchResultItems.nth(index).locator('.search-pin-btn');
    await pinButton.click();
    await this.page.waitForTimeout(1000); // Allow pin operation to complete
  }

  /**
   * Verify property is already pinned in search results
   */
  async verifyAlreadyPinned(index) {
    const item = this.searchResultItems.nth(index);
    const alreadyPinned = item.locator('.btn-success.disabled:has-text("Already Pinned")');
    await alreadyPinned.waitFor({ state: 'visible' });
  }

  /**
   * Get count of pinned properties
   */
  async getPinnedPropertiesCount() {
    await this.navigate();
    await this.page.waitForTimeout(500);
    return await this.pinnedItems.count();
  }

  /**
   * Get pinned property by index
   */
  async getPinnedProperty(index) {
    const item = this.pinnedItems.nth(index);
    return {
      type: await item.locator('.property-type').textContent(),
      key: await item.locator('.property-key').textContent(),
      value: await item.locator('.property-value').textContent(),
      domain: await item.locator('.property-domain').textContent()
    };
  }

  /**
   * Unpin a property
   */
  async unpinProperty(index) {
    const unpinButton = this.pinnedItems.nth(index).locator('.unpin-btn');
    await unpinButton.click();
    await this.page.waitForTimeout(1000); // Allow unpin operation to complete
  }

  /**
   * Change organization mode
   */
  async setOrganizationMode(mode) {
    await this.navigate();
    await this.organizationSelect.selectOption(mode);
    await this.page.waitForTimeout(1000); // Allow reorganization
  }

  /**
   * Get current organization mode
   */
  async getCurrentOrganizationMode() {
    await this.navigate();
    return await this.organizationSelect.inputValue();
  }

  /**
   * Refresh dashboard
   */
  async refresh() {
    await this.navigate();
    await this.refreshButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Verify empty state is displayed
   */
  async verifyEmptyState() {
    await this.navigate();
    await this.noPinnedMessage.waitFor({ state: 'visible' });
  }

  /**
   * Verify no search results message
   */
  async verifyNoSearchResults() {
    await this.noSearchResults.waitFor({ state: 'visible' });
  }

  /**
   * Drag and drop to reorder (for custom organization mode)
   */
  async dragAndDropProperty(fromIndex, toIndex) {
    const fromItem = this.pinnedItems.nth(fromIndex);
    const toItem = this.pinnedItems.nth(toIndex);

    await fromItem.dragTo(toItem);
    await this.page.waitForTimeout(500);
  }

  /**
   * Search for specific property type
   */
  async searchByType(type, key) {
    const query = `${type}:${key}`;
    await this.search(query);
  }

  /**
   * Search by domain
   */
  async searchByDomain(domain) {
    await this.search(`@${domain}`);
  }

  /**
   * Get all visible search result types
   */
  async getSearchResultTypes() {
    const count = await this.getSearchResultsCount();
    const types = [];

    for (let i = 0; i < count; i++) {
      const result = await this.getSearchResult(i);
      types.push(result.type);
    }

    return types;
  }

  /**
   * Verify search result contains expected data
   */
  async verifySearchResult(index, expected) {
    const result = await this.getSearchResult(index);

    if (expected.type) {
      expect(result.type).toContain(expected.type);
    }
    if (expected.key) {
      expect(result.key).toContain(expected.key);
    }
    if (expected.domain) {
      expect(result.domain).toContain(expected.domain);
    }
    if (expected.isPinned !== undefined) {
      expect(result.isPinned).toBe(expected.isPinned);
    }
  }

  /**
   * Wait for search results to load
   */
  async waitForSearchResults() {
    await this.page.waitForFunction(() => {
      const searchResults = document.querySelector('.search-results');
      return searchResults && !searchResults.classList.contains('loading');
    }, { timeout: 5000 });
  }

  /**
   * Get search suggestions or autocomplete if available
   */
  async getSearchSuggestions() {
    const suggestions = this.page.locator('.search-suggestions .suggestion-item');
    const count = await suggestions.count();
    const suggestionTexts = [];

    for (let i = 0; i < count; i++) {
      const text = await suggestions.nth(i).textContent();
      suggestionTexts.push(text);
    }

    return suggestionTexts;
  }

  // Integration test support methods

  /**
   * Wait for dashboard data to load
   */
  async waitForDataLoad() {
    await this.page.waitForTimeout(1000);
    await this.page.waitForFunction(() => {
      return !document.querySelector('.loading') &&
             document.querySelector('#dashboard');
    }, { timeout: 10000 });
  }

  /**
   * Get all pinned items
   */
  async getPinnedItems() {
    await this.waitForDataLoad();
    const count = await this.pinnedItems.count();
    const items = [];

    for (let i = 0; i < count; i++) {
      const item = this.pinnedItems.nth(i);
      items.push({
        key: await item.locator('.property-key').textContent(),
        value: await item.locator('.property-value').textContent(),
        type: await item.locator('.property-type').textContent(),
        domain: await item.locator('.property-domain').textContent()
      });
    }

    return items;
  }

  /**
   * Get pinned item by key
   */
  async getPinnedItemByKey(key) {
    const items = await this.getPinnedItems();
    return items.find(item => item.key === key);
  }

  /**
   * Unpin item by key
   */
  async unpinItem(key) {
    const count = await this.pinnedItems.count();

    for (let i = 0; i < count; i++) {
      const item = this.pinnedItems.nth(i);
      const itemKey = await item.locator('.property-key').textContent();

      if (itemKey === key) {
        await item.locator('.unpin-btn').click();
        await this.page.waitForTimeout(500);
        break;
      }
    }
  }

  /**
   * Get search results
   */
  async getSearchResults() {
    await this.waitForSearchResults();
    const count = await this.searchResultItems.count();
    const results = [];

    for (let i = 0; i < count; i++) {
      const result = await this.getSearchResult(i);
      results.push(result);
    }

    return results;
  }

  /**
   * Set organization mode
   */
  async setOrganizationMode(mode) {
    await this.organizationSelect.selectOption(mode);
    await this.page.waitForTimeout(1000);
  }

  /**
   * Get organization mode
   */
  async getOrganizationMode() {
    return await this.organizationSelect.inputValue();
  }

  /**
   * Get organized sections (when organized by type)
   */
  async getOrganizedSections() {
    const sections = this.page.locator('.dashboard-section h3');
    const count = await sections.count();
    const sectionTitles = [];

    for (let i = 0; i < count; i++) {
      const title = await sections.nth(i).textContent();
      sectionTitles.push(title);
    }

    return sectionTitles;
  }

  /**
   * Filter by storage type
   */
  async filterByStorageType(type) {
    const filterButton = this.page.locator(`[data-filter="${type}"]`);
    await filterButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Get visible items (after filtering)
   */
  async getVisibleItems() {
    const visibleItems = this.page.locator('.pinned-property-item:visible');
    const count = await visibleItems.count();
    const items = [];

    for (let i = 0; i < count; i++) {
      const item = visibleItems.nth(i);
      items.push({
        key: await item.locator('.property-key').textContent(),
        type: await item.locator('.property-type').textContent()
      });
    }

    return items;
  }

  /**
   * Select all pinned items
   */
  async selectAllPinnedItems() {
    const selectAllButton = this.page.locator('.select-all-btn');
    await selectAllButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Unpin selected items
   */
  async unpinSelectedItems() {
    const unpinSelectedButton = this.page.locator('.unpin-selected-btn');
    await unpinSelectedButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * Open JSON viewer for item
   */
  async openJsonViewer(key) {
    const items = this.pinnedItems;
    const count = await items.count();

    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      const itemKey = await item.locator('.property-key').textContent();

      if (itemKey === key) {
        await item.locator('.json-viewer-btn').click();
        await this.page.waitForTimeout(500);
        break;
      }
    }
  }

  /**
   * Get JSON viewer content
   */
  async getJsonViewerContent() {
    const modal = this.page.locator('.json-viewer-modal');
    await modal.waitFor({ state: 'visible' });
    return await modal.locator('.json-content').textContent();
  }

  /**
   * Close JSON viewer
   */
  async closeJsonViewer() {
    const closeButton = this.page.locator('.json-viewer-modal .close-btn');
    await closeButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Drag pinned item from one position to another
   */
  async dragPinnedItem(fromIndex, toIndex) {
    const fromItem = this.pinnedItems.nth(fromIndex);
    const toItem = this.pinnedItems.nth(toIndex);

    await fromItem.dragTo(toItem);
    await this.page.waitForTimeout(1000);
  }
}