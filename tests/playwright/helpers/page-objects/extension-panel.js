// Page Object Model for the main Extension Panel
export class ExtensionPanel {
  constructor(page) {
    this.page = page;

    // Main container and navigation
    this.container = page.locator('.app-container');
    this.tabNavigation = page.locator('.tab-nav');
    this.mainContent = page.locator('main');

    // Tab buttons
    this.dashboardTab = page.locator('.tab-btn[data-tab="dashboard"]');
    this.storageTab = page.locator('.tab-btn[data-tab="storage"]');
    this.cookiesTab = page.locator('.tab-btn[data-tab="cookies"]');
    this.applicationTab = page.locator('.tab-btn[data-tab="application"]');

    // Tab content areas
    this.dashboardContent = page.locator('#dashboard.tab-content');
    this.storageContent = page.locator('#storage.tab-content');
    this.cookiesContent = page.locator('#cookies.tab-content');
    this.applicationContent = page.locator('#application.tab-content');

    // Footer elements
    this.footer = page.locator('.status-bar');
    this.connectionStatus = page.locator('#connectionStatus');
    this.themeToggle = page.locator('.theme-toggle');
    this.aboutButton = page.locator('#aboutBtn');

    // Universal search (dashboard)
    this.dashboardSearch = page.locator('#dashboardSearch');
    this.searchResults = page.locator('.search-results');

    // Common modal elements
    this.modal = page.locator('.modal');
    this.modalOverlay = page.locator('.modal-overlay');
    this.modalClose = page.locator('.modal-close');
  }

  /**
   * Wait for the extension panel to be fully loaded
   */
  async waitForLoad() {
    await this.container.waitFor({ state: 'visible' });
    await this.connectionStatus.waitFor({ state: 'visible' });
    await this.page.waitForFunction(() => {
      const status = document.querySelector('#connectionStatus');
      return status && status.textContent.includes('Connected');
    });
  }

  /**
   * Navigate to a specific tab
   */
  async navigateToTab(tabName) {
    const tabMap = {
      'dashboard': this.dashboardTab,
      'storage': this.storageTab,
      'cookies': this.cookiesTab,
      'application': this.applicationTab
    };

    const tab = tabMap[tabName];
    if (!tab) {
      throw new Error(`Unknown tab: ${tabName}`);
    }

    await tab.click();
    await this.page.waitForTimeout(500); // Allow for tab transition
  }

  /**
   * Get the currently active tab
   */
  async getActiveTab() {
    const activeTab = await this.tabNavigation.locator('.tab-btn.active').getAttribute('data-tab');
    return activeTab;
  }

  /**
   * Verify all tabs are present and clickable
   */
  async verifyTabsPresent() {
    const tabs = [this.dashboardTab, this.storageTab, this.cookiesTab, this.applicationTab];

    for (const tab of tabs) {
      await tab.waitFor({ state: 'visible' });
      expect(await tab.isEnabled()).toBe(true);
    }
  }

  /**
   * Toggle theme (dark/light)
   */
  async toggleTheme() {
    await this.themeToggle.click();
    await this.page.waitForTimeout(200); // Allow for theme transition
  }

  /**
   * Get current theme
   */
  async getCurrentTheme() {
    const bodyClass = await this.page.locator('body').getAttribute('class');
    return bodyClass?.includes('dark-theme') ? 'dark' : 'light';
  }

  /**
   * Open the about modal
   */
  async openAboutModal() {
    await this.aboutButton.click();
    await this.modal.waitFor({ state: 'visible' });
  }

  /**
   * Close any open modal
   */
  async closeModal() {
    if (await this.modal.isVisible()) {
      await this.modalClose.click();
      await this.modal.waitFor({ state: 'hidden' });
    }
  }

  /**
   * Perform universal search from dashboard
   */
  async performUniversalSearch(query) {
    await this.navigateToTab('dashboard');
    await this.dashboardSearch.fill(query);
    await this.dashboardSearch.press('Enter');
    await this.page.waitForTimeout(500); // Allow for search results
  }

  /**
   * Clear universal search
   */
  async clearUniversalSearch() {
    await this.navigateToTab('dashboard');
    await this.dashboardSearch.fill('');
    await this.dashboardSearch.press('Escape');
  }

  /**
   * Get search results count
   */
  async getSearchResultsCount() {
    await this.navigateToTab('dashboard');
    const results = this.searchResults.locator('.search-result-item');
    return await results.count();
  }

  /**
   * Verify connection status
   */
  async verifyConnected() {
    const status = await this.connectionStatus.textContent();
    expect(status).toContain('Connected');
  }

  /**
   * Take screenshot of current state
   */
  async takeScreenshot(name) {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true
    });
  }

  /**
   * Wait for any loading states to complete
   */
  async waitForLoadingComplete() {
    // Wait for any loading indicators to disappear
    await this.page.waitForFunction(() => {
      const loadingElements = document.querySelectorAll('.loading');
      return Array.from(loadingElements).every(el =>
        el.style.display === 'none' || !el.offsetParent
      );
    }, { timeout: 10000 });
  }

  /**
   * Get error messages if any are displayed
   */
  async getErrorMessages() {
    const errorElements = this.page.locator('.error, .error-message, .toast.error');
    const errors = [];

    const count = await errorElements.count();
    for (let i = 0; i < count; i++) {
      const text = await errorElements.nth(i).textContent();
      errors.push(text);
    }

    return errors;
  }

  /**
   * Verify no error messages are displayed
   */
  async verifyNoErrors() {
    const errors = await this.getErrorMessages();
    expect(errors).toHaveLength(0);
  }
}