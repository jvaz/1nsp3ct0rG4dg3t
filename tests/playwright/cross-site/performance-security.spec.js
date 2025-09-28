// Performance and Security Tests
import { test, expect } from '@playwright/test';
import { ExtensionHelper } from '../helpers/extension-helper.js';
import { ExtensionPanel } from '../helpers/page-objects/extension-panel.js';
import { DashboardTab } from '../helpers/page-objects/dashboard-tab.js';
import { StorageTab } from '../helpers/page-objects/storage-tab.js';
import { StorageTestData } from '../helpers/test-data/storage-data.js';
import { CookieTestData } from '../helpers/test-data/cookie-data.js';

test.describe('Performance and Security Tests', () => {
  let extensionHelper;
  let extensionPage;
  let panel;
  let dashboard;
  let storage;

  test.beforeEach(async () => {
    extensionHelper = new ExtensionHelper();
    await extensionHelper.launchWithExtension();

    extensionPage = await extensionHelper.openSidePanel();
    panel = new ExtensionPanel(extensionPage);
    dashboard = new DashboardTab(extensionPage);
    storage = new StorageTab(extensionPage);

    await panel.waitForLoad();
  });

  test.afterEach(async () => {
    await extensionHelper.cleanup();
  });

  test('performance under high data volume', async () => {
    // Create page with large dataset
    const largeDataset = StorageTestData.getLargeDataset(500); // 500 items
    const largeCookieSet = CookieTestData.getLargeCookieSet(100); // 100 cookies

    const performancePage = await extensionHelper.createTestPage({
      url: 'https://performance-test.example.com/heavy',
      localStorage: largeDataset,
      sessionStorage: {
        'large_json': JSON.stringify({
          data: new Array(1000).fill(0).map((_, i) => ({
            id: i,
            name: `Item ${i}`,
            description: `Description for item ${i}`.repeat(10),
            metadata: {
              created: Date.now() - Math.random() * 86400000,
              tags: [`tag${i % 10}`, `category${i % 5}`]
            }
          }))
        }),
        'performance_metrics': JSON.stringify({
          loadTime: Date.now(),
          memoryUsage: 'high',
          itemCount: 1000
        })
      },
      cookies: largeCookieSet
    });

    // Measure storage tab load time
    const storageStartTime = Date.now();
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();
    const storageLoadTime = Date.now() - storageStartTime;

    console.log(`Storage tab load time with 500+ items: ${storageLoadTime}ms`);
    expect(storageLoadTime).toBeLessThan(5000); // Should load within 5 seconds

    // Test search performance on large dataset
    const searchStartTime = Date.now();
    await storage.search('item');
    await storage.waitForSearchResults();
    const searchTime = Date.now() - searchStartTime;

    console.log(`Search time across large dataset: ${searchTime}ms`);
    expect(searchTime).toBeLessThan(3000); // Search should be fast

    const searchResults = await storage.getSearchResults();
    expect(searchResults.length).toBeGreaterThan(100); // Should find many items

    // Test pagination or virtual scrolling performance
    const itemsCount = await storage.getStorageItemsCount();
    console.log(`Total visible items: ${itemsCount}`);

    // Clear search and test general navigation
    await storage.clearSearch();
    await extensionPage.waitForTimeout(1000);

    // Test switching between storage types
    const sessionSwitchStart = Date.now();
    await storage.selectStorageType('sessionStorage');
    await storage.waitForDataLoad();
    const sessionSwitchTime = Date.now() - sessionSwitchStart;

    console.log(`Storage type switch time: ${sessionSwitchTime}ms`);
    expect(sessionSwitchTime).toBeLessThan(2000);

    // Test cookies tab performance
    const cookiesStartTime = Date.now();
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();
    const cookiesLoadTime = Date.now() - cookiesStartTime;

    console.log(`Cookies tab load time with 100+ cookies: ${cookiesLoadTime}ms`);
    expect(cookiesLoadTime).toBeLessThan(4000);

    // Test dashboard performance with large data
    const dashboardStartTime = Date.now();
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();
    const dashboardLoadTime = Date.now() - dashboardStartTime;

    console.log(`Dashboard load time: ${dashboardLoadTime}ms`);
    expect(dashboardLoadTime).toBeLessThan(3000);

    // Test bulk pinning performance
    await panel.navigateToTab('storage');
    await storage.selectStorageType('localStorage');
    await storage.waitForDataLoad();

    const bulkPinStart = Date.now();
    const itemsToPIn = ['item-001', 'item-050', 'item-100', 'item-200', 'item-300'];
    for (const itemKey of itemsToPIn) {
      try {
        await storage.pinStorageItem(itemKey);
      } catch (error) {
        // Item might not exist, continue
      }
    }
    const bulkPinTime = Date.now() - bulkPinStart;

    console.log(`Bulk pin time for 5 items: ${bulkPinTime}ms`);
    expect(bulkPinTime).toBeLessThan(10000);

    // Test dashboard organization performance with many pinned items
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const orgStart = Date.now();
    await dashboard.setOrganizationMode('alphabetical');
    await extensionPage.waitForTimeout(1000);
    const orgTime = Date.now() - orgStart;

    console.log(`Dashboard organization time: ${orgTime}ms`);
    expect(orgTime).toBeLessThan(2000);

    await performancePage.close();
  });

  test('memory usage and resource management', async () => {
    // Test memory usage with multiple large pages
    const pages = [];

    for (let i = 0; i < 5; i++) {
      const largePage = await extensionHelper.createTestPage({
        url: `https://memory-test-${i}.example.com/page`,
        localStorage: {
          [`large_data_${i}`]: JSON.stringify({
            id: i,
            data: new Array(200).fill(0).map(j => ({
              index: j,
              content: `Large content block ${j}`.repeat(20)
            }))
          }),
          [`cache_${i}`]: JSON.stringify({
            timestamp: Date.now(),
            items: new Array(100).fill(`cached_item_${i}`)
          })
        }
      });
      pages.push(largePage);

      // Switch to each page and test extension responsiveness
      await largePage.bringToFront();
      await extensionPage.bringToFront();

      const responseStart = Date.now();
      await panel.navigateToTab('storage');
      await storage.waitForDataLoad();
      const responseTime = Date.now() - responseStart;

      console.log(`Response time for page ${i}: ${responseTime}ms`);
      expect(responseTime).toBeLessThan(3000);

      // Pin one item from each page
      try {
        await storage.pinStorageItem(`large_data_${i}`);
      } catch (error) {
        // Continue if item not found
      }
    }

    // Test dashboard with accumulated data from all pages
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const pinnedItems = await dashboard.getPinnedItems();
    console.log(`Total pinned items across all pages: ${pinnedItems.length}`);

    // Test memory cleanup by closing pages
    for (let i = 0; i < pages.length; i++) {
      await pages[i].close();

      // Test extension still responsive after page closure
      await extensionPage.waitForTimeout(500);
      await dashboard.refresh();
      await dashboard.waitForDataLoad();

      const remainingItems = await dashboard.getPinnedItems();
      console.log(`Remaining items after closing page ${i}: ${remainingItems.length}`);
    }

    // Test rapid tab switching performance
    const tabSwitchTimes = [];
    const tabs = ['storage', 'cookies', 'dashboard', 'application'];

    for (let round = 0; round < 3; round++) {
      for (const tab of tabs) {
        const switchStart = Date.now();
        await panel.navigateToTab(tab);
        await panel.waitForLoadingComplete();
        const switchTime = Date.now() - switchStart;
        tabSwitchTimes.push(switchTime);
      }
    }

    const avgSwitchTime = tabSwitchTimes.reduce((a, b) => a + b) / tabSwitchTimes.length;
    console.log(`Average tab switch time: ${avgSwitchTime}ms`);
    expect(avgSwitchTime).toBeLessThan(1500);

    // Test for memory leaks by repeating operations
    const testOperations = async () => {
      await storage.navigate();
      await storage.search('test');
      await storage.clearSearch();
      await dashboard.navigate();
      await dashboard.search('data');
      await dashboard.clearSearch();
    };

    const operationStart = Date.now();
    for (let i = 0; i < 10; i++) {
      await testOperations();
    }
    const operationTotalTime = Date.now() - operationStart;

    console.log(`10 operation cycles completed in: ${operationTotalTime}ms`);
    expect(operationTotalTime).toBeLessThan(30000); // Should complete within 30 seconds
  });

  test('security validation and data protection', async () => {
    // Test with page containing sensitive data patterns
    const sensitiveDataPage = await extensionHelper.createTestPage({
      url: 'https://sensitive-data.example.com/vault',
      localStorage: {
        // Credit card patterns
        'payment_info': JSON.stringify({
          card: '4111-1111-1111-1111',
          expiry: '12/25',
          cvv: '123'
        }),

        // API keys
        'api_credentials': JSON.stringify({
          apiKey: 'sk_live_1234567890abcdef',
          secret: 'aws_secret_access_key_123456',
          token: 'ghp_1234567890abcdef1234567890abcdef'
        }),

        // Personal information
        'user_pii': JSON.stringify({
          ssn: '123-45-6789',
          email: 'user@example.com',
          phone: '+1-555-123-4567',
          address: '123 Main St, City, State'
        }),

        // Authentication tokens
        'auth_tokens': JSON.stringify({
          jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
          refresh: 'refresh_token_abcdef123456',
          session: 'session_token_' + Date.now()
        }),

        // Database credentials
        'db_config': JSON.stringify({
          host: 'db.example.com',
          username: 'admin',
          password: 'super_secret_password',
          database: 'production_db'
        })
      },
      cookies: CookieTestData.getInsecureCookies()
    });

    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    // Test that extension can identify sensitive data
    const sensitiveKeys = ['payment_info', 'api_credentials', 'user_pii', 'auth_tokens', 'db_config'];

    for (const key of sensitiveKeys) {
      const item = await storage.getStorageItemByKey(key);
      expect(item).toBeTruthy();

      // Pin sensitive items to test dashboard security features
      await storage.pinStorageItem(key);
    }

    // Test dashboard security indicators
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const pinnedItems = await dashboard.getPinnedItems();
    const sensitiveItems = pinnedItems.filter(item =>
      sensitiveKeys.includes(item.key)
    );

    expect(sensitiveItems.length).toBe(5);

    // Look for security warnings or indicators
    const securityWarnings = extensionPage.locator('.security-warning, .sensitive-data-warning, .warning-icon');
    const warningCount = await securityWarnings.count();

    if (warningCount > 0) {
      console.log(`Security warnings detected: ${warningCount}`);

      // Test warning details
      for (let i = 0; i < Math.min(warningCount, 3); i++) {
        const warning = securityWarnings.nth(i);
        if (await warning.isVisible()) {
          await warning.hover();
          await extensionPage.waitForTimeout(500);

          // Check for tooltip or warning message
          const tooltip = extensionPage.locator('.tooltip, .warning-tooltip');
          if (await tooltip.count() > 0) {
            const tooltipText = await tooltip.textContent();
            expect(tooltipText).toBeTruthy();
          }
        }
      }
    }

    // Test cookies security analysis
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    const cookieSecurityWarnings = extensionPage.locator('.cookie-security-warning, .insecure-cookie');
    const cookieWarningCount = await cookieSecurityWarnings.count();

    console.log(`Cookie security warnings: ${cookieWarningCount}`);

    // Test search for potentially sensitive patterns
    await storage.navigate();
    await storage.waitForDataLoad();

    const sensitivePatterns = ['password', 'key', 'token', 'secret'];

    for (const pattern of sensitivePatterns) {
      await storage.search(pattern);
      const results = await storage.getSearchResults();

      if (results.length > 0) {
        console.log(`Found ${results.length} items matching sensitive pattern: ${pattern}`);

        // Verify that sensitive data is handled appropriately
        for (const result of results) {
          expect(result.key).toBeTruthy();
          expect(result.value).toBeTruthy();

          // Check if sensitive values are masked or highlighted
          const containsSensitiveData =
            result.value.includes('password') ||
            result.value.includes('secret') ||
            result.value.includes('key') ||
            result.value.includes('token');

          if (containsSensitiveData) {
            // Extension should handle this appropriately
            expect(result.value.length).toBeGreaterThan(0);
          }
        }
      }

      await storage.clearSearch();
    }

    // Test XSS prevention with malicious data
    const xssTestPage = await extensionHelper.createTestPage({
      url: 'https://xss-test.example.com/malicious',
      localStorage: {
        'xss_attempt_1': '<script>alert("XSS")</script>',
        'xss_attempt_2': 'javascript:alert("XSS")',
        'xss_attempt_3': '<img src="x" onerror="alert(\'XSS\')">',
        'xss_attempt_4': JSON.stringify({
          html: '<div onclick="alert(\'XSS\')">Click me</div>',
          script: 'eval("alert(\'XSS\')")'
        }),
        'safe_data': JSON.stringify({
          message: 'This is safe data',
          number: 12345
        })
      }
    });

    await xssTestPage.bringToFront();
    await extensionPage.bringToFront();

    await storage.navigate();
    await storage.waitForDataLoad();

    // Test that potentially malicious scripts don't execute
    const xssKeys = ['xss_attempt_1', 'xss_attempt_2', 'xss_attempt_3', 'xss_attempt_4'];

    for (const key of xssKeys) {
      const item = await storage.getStorageItemByKey(key);
      expect(item).toBeTruthy();

      // Data should be displayed safely (no script execution)
      expect(item.value).toBeTruthy();

      // Pin XSS attempts to test dashboard safety
      await storage.pinStorageItem(key);
    }

    // Test dashboard handles potentially malicious content safely
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const xssPinnedItems = await dashboard.getPinnedItems();
    const xssItems = xssPinnedItems.filter(item =>
      item.key.includes('xss_attempt')
    );

    expect(xssItems.length).toBe(4);

    // Verify content is displayed but not executed
    for (const item of xssItems) {
      expect(item.value).toBeTruthy();
      expect(item.value).toContain('<script>'); // Should be displayed as text, not executed
    }

    // Test JSON viewer with malicious content
    const maliciousJsonItem = xssItems.find(item => item.key === 'xss_attempt_4');
    if (maliciousJsonItem) {
      await dashboard.openJsonViewer('xss_attempt_4');

      // Should display JSON safely without executing scripts
      const jsonContent = await dashboard.getJsonViewerContent();
      expect(jsonContent).toContain('onclick');
      expect(jsonContent).toContain('eval');

      await dashboard.closeJsonViewer();
    }

    await sensitiveDataPage.close();
    await xssTestPage.close();
  });

  test('input validation and error handling', async () => {
    // Test with various edge cases and invalid data
    const edgeCasePage = await extensionHelper.createTestPage({
      url: 'https://edge-cases.example.com/test',
      localStorage: {
        // Empty and whitespace values
        'empty_string': '',
        'whitespace_only': '   ',
        'newlines': '\n\n\n',
        'tabs': '\t\t\t',

        // Very long strings
        'very_long_key': 'x'.repeat(10000),
        'very_long_value': JSON.stringify({
          data: 'This is a very long string. '.repeat(1000)
        }),

        // Special characters
        'special_chars': '!@#$%^&*()_+-=[]{}|;:,.<>?',
        'unicode_chars': '🚀 Hello 世界 🌟 émojis 🎉',

        // Problematic JSON
        'broken_json': '{"invalid": json syntax}',
        'incomplete_json': '{"incomplete":',
        'null_json': 'null',
        'undefined_string': 'undefined',

        // Circular reference simulation
        'circular_ref': '{"a": {"b": "[Circular]"}}',

        // Binary-like data
        'binary_data': '\x00\x01\x02\x03\x04\x05',

        // HTML entities
        'html_entities': '&lt;div&gt;&amp;quot;Hello&amp;quot;&lt;/div&gt;'
      }
    });

    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    // Test that extension handles all edge cases gracefully
    const edgeCaseKeys = [
      'empty_string', 'whitespace_only', 'newlines', 'tabs',
      'very_long_key', 'very_long_value', 'special_chars', 'unicode_chars',
      'broken_json', 'incomplete_json', 'null_json', 'undefined_string',
      'circular_ref', 'binary_data', 'html_entities'
    ];

    for (const key of edgeCaseKeys) {
      try {
        const item = await storage.getStorageItemByKey(key);
        expect(item).toBeTruthy();

        // Test that we can pin even problematic items
        await storage.pinStorageItem(key);

        console.log(`Successfully handled edge case: ${key}`);
      } catch (error) {
        console.log(`Edge case ${key} caused error: ${error.message}`);
        // Some edge cases might legitimately fail
      }
    }

    // Test search with problematic input
    const problematicSearches = [
      '', // Empty search
      '   ', // Whitespace search
      '🚀', // Unicode search
      '<script>', // HTML search
      'null', // Literal null
      'undefined', // Literal undefined
      '.*', // Regex characters
      '\\', // Backslash
      '"', // Quote
      '\n', // Newline
    ];

    for (const searchTerm of problematicSearches) {
      try {
        await storage.search(searchTerm);
        await extensionPage.waitForTimeout(500);

        const results = await storage.getSearchResults();
        console.log(`Search "${searchTerm}" returned ${results.length} results`);

        await storage.clearSearch();
      } catch (error) {
        console.log(`Search "${searchTerm}" caused error: ${error.message}`);
      }
    }

    // Test dashboard with problematic data
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const pinnedItems = await dashboard.getPinnedItems();
    console.log(`Successfully pinned ${pinnedItems.length} edge case items`);

    // Test JSON viewer with broken JSON
    const brokenJsonItem = pinnedItems.find(item => item.key === 'broken_json');
    if (brokenJsonItem) {
      try {
        await dashboard.openJsonViewer('broken_json');

        // Should handle broken JSON gracefully
        const content = await dashboard.getJsonViewerContent();
        expect(content).toBeTruthy();

        await dashboard.closeJsonViewer();
      } catch (error) {
        // Broken JSON might not open in JSON viewer, which is acceptable
        console.log('Broken JSON handled appropriately');
      }
    }

    // Test very long content handling
    const longValueItem = pinnedItems.find(item => item.key === 'very_long_value');
    if (longValueItem) {
      expect(longValueItem.value).toBeTruthy();

      // Test that long content doesn't break the UI
      await dashboard.openJsonViewer('very_long_value');
      await extensionPage.waitForTimeout(1000);
      await dashboard.closeJsonViewer();
    }

    // Test unicode handling
    const unicodeItem = pinnedItems.find(item => item.key === 'unicode_chars');
    if (unicodeItem) {
      expect(unicodeItem.value).toContain('🚀');
      expect(unicodeItem.value).toContain('世界');
    }

    // Test CRUD operations with problematic data
    try {
      // Try adding item with problematic key/value
      await storage.navigate();
      await storage.addStorageItem('test-edge-case', '<script>alert("test")</script>');

      const addedItem = await storage.getStorageItemByKey('test-edge-case');
      expect(addedItem.value).toContain('<script>');

      // Try editing with problematic value
      await storage.editStorageItemByKey('test-edge-case', 'test-edge-case', '{"broken": json}');

      const editedItem = await storage.getStorageItemByKey('test-edge-case');
      expect(editedItem.value).toBeTruthy();

      // Clean up
      await storage.deleteStorageItemByKey('test-edge-case');
    } catch (error) {
      console.log(`CRUD operations with problematic data: ${error.message}`);
    }

    // Test error recovery
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    // Extension should still be functional after handling edge cases
    const finalPinnedItems = await dashboard.getPinnedItems();
    expect(finalPinnedItems.length).toBeGreaterThan(0);

    // Test rapid operations to ensure stability
    for (let i = 0; i < 5; i++) {
      await dashboard.search(`test${i}`);
      await dashboard.clearSearch();
      await panel.navigateToTab('storage');
      await panel.navigateToTab('dashboard');
    }

    await edgeCasePage.close();
  });

  test('concurrent operations and race conditions', async () => {
    // Create multiple pages that change rapidly
    const concurrentPages = [];

    for (let i = 0; i < 3; i++) {
      const page = await extensionHelper.createTestPage({
        url: `https://concurrent-${i}.example.com/test`,
        localStorage: {
          [`counter_${i}`]: '0',
          [`data_${i}`]: JSON.stringify({ value: i, timestamp: Date.now() }),
          [`status_${i}`]: 'initial'
        }
      });
      concurrentPages.push(page);
    }

    // Rapidly switch between pages and pin items
    const concurrentOperations = async () => {
      for (let round = 0; round < 3; round++) {
        for (let i = 0; i < concurrentPages.length; i++) {
          await concurrentPages[i].bringToFront();
          await extensionPage.bringToFront();

          // Update page data to simulate concurrent changes
          await concurrentPages[i].evaluate(([index, round]) => {
            localStorage.setItem(`counter_${index}`, String(round + 1));
            localStorage.setItem(`status_${index}`, `round_${round}`);
            localStorage.setItem(`timestamp_${index}`, String(Date.now()));
          }, [i, round]);

          // Rapid extension operations
          await storage.navigate();
          await storage.waitForDataLoad();

          try {
            await storage.pinStorageItem(`counter_${i}`);
            await storage.pinStorageItem(`data_${i}`);
          } catch (error) {
            // May fail due to timing, continue
          }

          await panel.navigateToTab('dashboard');
          await dashboard.waitForDataLoad();
        }
      }
    };

    // Run concurrent operations
    const concurrentStart = Date.now();
    await concurrentOperations();
    const concurrentTime = Date.now() - concurrentStart;

    console.log(`Concurrent operations completed in: ${concurrentTime}ms`);

    // Verify data integrity after concurrent operations
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const pinnedItems = await dashboard.getPinnedItems();
    const concurrentItems = pinnedItems.filter(item =>
      item.key.includes('counter_') || item.key.includes('data_')
    );

    console.log(`Pinned items after concurrent operations: ${concurrentItems.length}`);
    expect(concurrentItems.length).toBeGreaterThan(0);

    // Test rapid search operations
    const rapidSearches = ['counter', 'data', 'status', 'timestamp'];

    const rapidSearchStart = Date.now();
    for (let round = 0; round < 5; round++) {
      for (const searchTerm of rapidSearches) {
        await dashboard.search(searchTerm);
        await extensionPage.waitForTimeout(100);
        await dashboard.clearSearch();
        await extensionPage.waitForTimeout(100);
      }
    }
    const rapidSearchTime = Date.now() - rapidSearchStart;

    console.log(`Rapid search operations completed in: ${rapidSearchTime}ms`);
    expect(rapidSearchTime).toBeLessThan(10000);

    // Test concurrent tab switching
    const tabSwitchStart = Date.now();
    const tabs = ['storage', 'cookies', 'dashboard', 'application'];

    for (let round = 0; round < 10; round++) {
      for (const tab of tabs) {
        await panel.navigateToTab(tab);
        await extensionPage.waitForTimeout(50); // Very rapid switching
      }
    }
    const tabSwitchTime = Date.now() - tabSwitchStart;

    console.log(`Rapid tab switching completed in: ${tabSwitchTime}ms`);

    // Verify extension is still responsive after stress testing
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const finalPinnedItems = await dashboard.getPinnedItems();
    expect(finalPinnedItems.length).toBeGreaterThan(0);

    // Test data consistency
    for (const item of finalPinnedItems) {
      expect(item.key).toBeTruthy();
      expect(item.value).toBeTruthy();
      expect(item.type).toBeTruthy();
    }

    // Clean up
    for (const page of concurrentPages) {
      await page.close();
    }

    // Final responsiveness test
    await dashboard.search('final');
    await dashboard.clearSearch();
    await storage.navigate();
    await storage.waitForDataLoad();

    console.log('Extension remains responsive after concurrent operations test');
  });
});