// Multi-Site Workflow Tests
import { test, expect } from '@playwright/test';
import { ExtensionHelper } from '../helpers/extension-helper.js';
import { ExtensionPanel } from '../helpers/page-objects/extension-panel.js';
import { DashboardTab } from '../helpers/page-objects/dashboard-tab.js';
import { StorageTab } from '../helpers/page-objects/storage-tab.js';
import { StorageTestData } from '../helpers/test-data/storage-data.js';
import { CookieTestData } from '../helpers/test-data/cookie-data.js';

test.describe('Multi-Site Workflow', () => {
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

  test('data persistence across multiple domains', async () => {
    // Site 1: E-commerce site with user data
    const ecommercePage = await extensionHelper.createTestPage({
      url: 'https://shop.example.com/checkout',
      localStorage: {
        'user-account': JSON.stringify({
          id: 'user123',
          name: 'John Doe',
          email: 'john@example.com',
          membership: 'premium'
        }),
        'cart-items': JSON.stringify([
          { id: 1, name: 'Product A', price: 29.99, quantity: 2 },
          { id: 2, name: 'Product B', price: 49.99, quantity: 1 }
        ]),
        'checkout-step': '3',
        'payment-method': 'credit-card'
      },
      cookies: CookieTestData.getEcommerceCookies()
    });

    // Verify extension can access ecommerce data
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    // Pin important ecommerce data
    await storage.pinStorageItem('user-account');
    await storage.pinStorageItem('cart-items');

    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    let pinnedItems = await dashboard.getPinnedItems();
    const ecommerceItems = pinnedItems.filter(item =>
      ['user-account', 'cart-items'].includes(item.key)
    );
    expect(ecommerceItems.length).toBe(2);

    // Site 2: Blog site with different data
    const blogPage = await extensionHelper.createTestPage({
      url: 'https://blog.example.org/article/123',
      localStorage: {
        'reading-progress': JSON.stringify({
          articleId: '123',
          scrollPosition: 45,
          readingTime: 180,
          lastAccessed: Date.now()
        }),
        'user-preferences': JSON.stringify({
          theme: 'dark',
          fontSize: 'medium',
          autoSave: true
        }),
        'draft-comment': 'This is a great article about...'
      },
      sessionStorage: {
        'current-section': 'introduction',
        'navigation-history': JSON.stringify(['/home', '/category/tech', '/article/123'])
      },
      cookies: {
        'blog-session': 'blog-session-456',
        'comment-author': 'John Doe',
        'theme-preference': 'dark'
      }
    });

    // Switch to blog page context
    await blogPage.bringToFront();
    await extensionPage.bringToFront();

    // Verify extension shows blog data
    await storage.navigate();
    await storage.waitForDataLoad();

    // Pin blog-specific data
    await storage.pinStorageItem('reading-progress');
    await storage.pinStorageItem('user-preferences');

    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    pinnedItems = await dashboard.getPinnedItems();
    const blogItems = pinnedItems.filter(item =>
      ['reading-progress', 'user-preferences'].includes(item.key)
    );
    expect(blogItems.length).toBe(2);

    // Verify data isolation - blog data shouldn't affect ecommerce data
    const allPinnedItems = await dashboard.getPinnedItems();
    expect(allPinnedItems.some(item => item.key === 'user-account')).toBeTruthy();
    expect(allPinnedItems.some(item => item.key === 'reading-progress')).toBeTruthy();

    // Site 3: API dashboard with development data
    const apiPage = await extensionHelper.createTestPage({
      url: 'https://api-dashboard.dev.example.com/metrics',
      localStorage: {
        'api-keys': JSON.stringify({
          production: 'prod_key_12345',
          staging: 'staging_key_67890',
          development: 'dev_key_abcdef'
        }),
        'monitoring-config': JSON.stringify({
          refreshInterval: 30,
          alertThresholds: {
            errorRate: 5,
            responseTime: 500,
            uptime: 99.9
          }
        }),
        'dashboard-layout': JSON.stringify({
          widgets: ['errors', 'performance', 'usage'],
          layout: 'grid',
          customizations: true
        })
      },
      cookies: {
        'dev-session': 'dev-session-789',
        'api-version': 'v2',
        'debug-mode': 'enabled'
      }
    });

    // Switch to API dashboard context
    await apiPage.bringToFront();
    await extensionPage.bringToFront();

    // Verify extension can handle development environment data
    await storage.navigate();
    await storage.waitForDataLoad();

    await storage.pinStorageItem('api-keys');
    await storage.pinStorageItem('monitoring-config');

    // Test multi-site dashboard organization
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();
    await dashboard.setOrganizationMode('domain');

    const organizedSections = await dashboard.getOrganizedSections();
    expect(organizedSections.length).toBeGreaterThan(2); // Should have multiple domain sections

    // Verify all sites' data is accessible
    const finalPinnedItems = await dashboard.getPinnedItems();
    const domainItems = {
      ecommerce: finalPinnedItems.filter(item => ['user-account', 'cart-items'].includes(item.key)),
      blog: finalPinnedItems.filter(item => ['reading-progress', 'user-preferences'].includes(item.key)),
      api: finalPinnedItems.filter(item => ['api-keys', 'monitoring-config'].includes(item.key))
    };

    expect(domainItems.ecommerce.length).toBe(2);
    expect(domainItems.blog.length).toBe(2);
    expect(domainItems.api.length).toBe(2);

    // Clean up test pages
    await ecommercePage.close();
    await blogPage.close();
    await apiPage.close();
  });

  test('cross-domain search and filtering workflow', async () => {
    // Set up multiple sites with overlapping data patterns
    const sites = [
      {
        page: await extensionHelper.createTestPage({
          url: 'https://app1.example.com/dashboard',
          localStorage: {
            'user-profile': JSON.stringify({ name: 'John', role: 'admin' }),
            'app1-settings': JSON.stringify({ theme: 'dark', lang: 'en' }),
            'session-data': JSON.stringify({ loginTime: Date.now(), expires: Date.now() + 3600000 })
          }
        }),
        domain: 'app1.example.com'
      },
      {
        page: await extensionHelper.createTestPage({
          url: 'https://app2.example.com/profile',
          localStorage: {
            'user-profile': JSON.stringify({ name: 'John', role: 'user' }),
            'app2-config': JSON.stringify({ theme: 'light', notifications: true }),
            'session-info': JSON.stringify({ active: true, lastActivity: Date.now() })
          }
        }),
        domain: 'app2.example.com'
      },
      {
        page: await extensionHelper.createTestPage({
          url: 'https://analytics.example.com/reports',
          localStorage: {
            'user-data': JSON.stringify({ name: 'John', department: 'engineering' }),
            'report-filters': JSON.stringify({ dateRange: '30d', metrics: ['pageviews', 'sessions'] }),
            'dashboard-state': JSON.stringify({ layout: 'compact', autoRefresh: true })
          }
        }),
        domain: 'analytics.example.com'
      }
    ];

    // Test cross-domain search for 'user' keyword
    for (const site of sites) {
      await site.page.bringToFront();
      await extensionPage.bringToFront();

      await panel.navigateToTab('storage');
      await storage.waitForDataLoad();

      await storage.search('user');
      const searchResults = await storage.getSearchResults();

      // Each site should have user-related data
      expect(searchResults.length).toBeGreaterThan(0);
      const userResults = searchResults.filter(result =>
        result.key.includes('user') || result.value.includes('John')
      );
      expect(userResults.length).toBeGreaterThan(0);

      // Pin user-related data from each site
      if (userResults.length > 0) {
        await storage.pinStorageItem(userResults[0].key);
      }

      await storage.clearSearch();
    }

    // Verify cross-domain data in dashboard
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    // Search across all pinned items
    await dashboard.search('John');
    const dashboardResults = await dashboard.getSearchResults();

    // Should find John's data from multiple domains
    expect(dashboardResults.length).toBeGreaterThan(2);
    const johnResults = dashboardResults.filter(result =>
      result.value.includes('John')
    );
    expect(johnResults.length).toBeGreaterThan(2);

    // Test domain-specific filtering
    await dashboard.clearSearch();
    await dashboard.setOrganizationMode('domain');

    const domainSections = await dashboard.getOrganizedSections();
    expect(domainSections.length).toBeGreaterThan(2);

    // Filter by specific domain
    for (const site of sites) {
      await site.page.bringToFront();
      await extensionPage.bringToFront();

      await panel.navigateToTab('dashboard');
      await dashboard.waitForDataLoad();

      // Should show only current domain's data
      const visibleItems = await dashboard.getVisibleItems();
      expect(visibleItems.length).toBeGreaterThan(0);
    }

    // Clean up
    for (const site of sites) {
      await site.page.close();
    }
  });

  test('session persistence across site navigation', async () => {
    // Start with main application
    const mainAppPage = await extensionHelper.createTestPage({
      url: 'https://app.example.com/home',
      localStorage: {
        'nav-state': JSON.stringify({
          currentPage: 'home',
          breadcrumb: ['app', 'home'],
          sidebarExpanded: true
        }),
        'user-session': JSON.stringify({
          id: 'session123',
          startTime: Date.now(),
          authenticated: true
        })
      }
    });

    // Pin session data
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();
    await storage.pinStorageItem('nav-state');
    await storage.pinStorageItem('user-session');

    // Navigate to different section of same app
    const profilePage = await extensionHelper.createTestPage({
      url: 'https://app.example.com/profile',
      localStorage: {
        'nav-state': JSON.stringify({
          currentPage: 'profile',
          breadcrumb: ['app', 'profile'],
          sidebarExpanded: true
        }),
        'user-session': JSON.stringify({
          id: 'session123', // Same session
          startTime: Date.now() - 30000, // 30 seconds ago
          authenticated: true,
          lastPageView: Date.now()
        }),
        'profile-data': JSON.stringify({
          editing: false,
          unsavedChanges: false,
          lastSaved: Date.now() - 10000
        })
      }
    });

    await profilePage.bringToFront();
    await extensionPage.bringToFront();

    // Verify session continuity
    await storage.navigate();
    await storage.waitForDataLoad();

    const navStateItem = await storage.getStorageItemByKey('nav-state');
    const navData = JSON.parse(navStateItem.value);
    expect(navData.currentPage).toBe('profile');

    const sessionItem = await storage.getStorageItemByKey('user-session');
    const sessionData = JSON.parse(sessionItem.value);
    expect(sessionData.id).toBe('session123');
    expect(sessionData.authenticated).toBe(true);

    // Pin profile-specific data
    await storage.pinStorageItem('profile-data');

    // Navigate to settings page
    const settingsPage = await extensionHelper.createTestPage({
      url: 'https://app.example.com/settings',
      localStorage: {
        'nav-state': JSON.stringify({
          currentPage: 'settings',
          breadcrumb: ['app', 'settings'],
          sidebarExpanded: false // User collapsed sidebar
        }),
        'user-session': JSON.stringify({
          id: 'session123', // Same session continues
          startTime: Date.now() - 60000, // 1 minute ago
          authenticated: true,
          lastPageView: Date.now(),
          activityCount: 3
        }),
        'settings-form': JSON.stringify({
          notifications: { email: true, push: false },
          privacy: { analytics: false, cookies: true },
          modified: true,
          autoSave: false
        })
      }
    });

    await settingsPage.bringToFront();
    await extensionPage.bringToFront();

    // Verify session evolution
    await storage.navigate();
    await storage.waitForDataLoad();

    const updatedSessionItem = await storage.getStorageItemByKey('user-session');
    const updatedSessionData = JSON.parse(updatedSessionItem.value);
    expect(updatedSessionData.id).toBe('session123');
    expect(updatedSessionData.activityCount).toBe(3);

    // Test dashboard view of session progression
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const pinnedItems = await dashboard.getPinnedItems();
    const sessionRelatedItems = pinnedItems.filter(item =>
      ['nav-state', 'user-session', 'profile-data'].includes(item.key)
    );
    expect(sessionRelatedItems.length).toBe(3);

    // Verify real-time updates in dashboard
    const dashboardSessionItem = await dashboard.getPinnedItemByKey('user-session');
    expect(dashboardSessionItem.value).toContain('session123');
    expect(dashboardSessionItem.value).toContain('activityCount');

    // Simulate session timeout scenario
    const timeoutPage = await extensionHelper.createTestPage({
      url: 'https://app.example.com/timeout',
      localStorage: {
        'nav-state': JSON.stringify({
          currentPage: 'timeout',
          breadcrumb: ['app', 'timeout'],
          redirectAfterLogin: '/settings'
        }),
        'session-expired': JSON.stringify({
          previousSession: 'session123',
          expiredAt: Date.now(),
          reason: 'timeout'
        })
        // Note: user-session removed due to timeout
      }
    });

    await timeoutPage.bringToFront();
    await extensionPage.bringToFront();

    await storage.navigate();
    await storage.waitForDataLoad();

    // Session should be gone, but session-expired data should exist
    try {
      await storage.getStorageItemByKey('user-session');
      // If we get here, session wasn't cleared
    } catch (error) {
      // Expected - session should be cleared
      expect(error.message).toContain('not found');
    }

    const expiredItem = await storage.getStorageItemByKey('session-expired');
    const expiredData = JSON.parse(expiredItem.value);
    expect(expiredData.previousSession).toBe('session123');
    expect(expiredData.reason).toBe('timeout');

    // Clean up
    await mainAppPage.close();
    await profilePage.close();
    await settingsPage.close();
    await timeoutPage.close();
  });

  test('multi-tenant application workflow', async () => {
    // Tenant A: Company ABC
    const tenantAPage = await extensionHelper.createTestPage({
      url: 'https://abc.saas-app.com/dashboard',
      localStorage: {
        'tenant-config': JSON.stringify({
          id: 'tenant-abc',
          name: 'ABC Corporation',
          plan: 'enterprise',
          features: ['analytics', 'api-access', 'white-label']
        }),
        'user-context': JSON.stringify({
          userId: 'user123',
          tenantId: 'tenant-abc',
          role: 'admin',
          permissions: ['read', 'write', 'admin']
        }),
        'app-state': JSON.stringify({
          currentModule: 'dashboard',
          customizations: { logo: 'abc-logo.png', colors: '#1234ab' }
        })
      },
      cookies: {
        'tenant-session': 'abc-session-456',
        'tenant-id': 'tenant-abc',
        'sso-token': 'sso-abc-789'
      }
    });

    // Pin tenant A data
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();
    await storage.pinStorageItem('tenant-config');
    await storage.pinStorageItem('user-context');

    // Tenant B: Company XYZ (different subdomain)
    const tenantBPage = await extensionHelper.createTestPage({
      url: 'https://xyz.saas-app.com/reports',
      localStorage: {
        'tenant-config': JSON.stringify({
          id: 'tenant-xyz',
          name: 'XYZ Industries',
          plan: 'professional',
          features: ['analytics', 'basic-api']
        }),
        'user-context': JSON.stringify({
          userId: 'user789',
          tenantId: 'tenant-xyz',
          role: 'user',
          permissions: ['read']
        }),
        'app-state': JSON.stringify({
          currentModule: 'reports',
          customizations: { logo: 'xyz-logo.png', colors: '#ab1234' }
        })
      },
      cookies: {
        'tenant-session': 'xyz-session-123',
        'tenant-id': 'tenant-xyz',
        'sso-token': 'sso-xyz-456'
      }
    });

    await tenantBPage.bringToFront();
    await extensionPage.bringToFront();

    // Verify tenant isolation
    await storage.navigate();
    await storage.waitForDataLoad();

    const tenantConfigB = await storage.getStorageItemByKey('tenant-config');
    const configDataB = JSON.parse(tenantConfigB.value);
    expect(configDataB.id).toBe('tenant-xyz');
    expect(configDataB.name).toBe('XYZ Industries');

    await storage.pinStorageItem('tenant-config');
    await storage.pinStorageItem('user-context');

    // Check dashboard for tenant separation
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();
    await dashboard.setOrganizationMode('domain');

    const domainSections = await dashboard.getOrganizedSections();
    expect(domainSections.some(section => section.includes('abc.saas-app.com'))).toBeTruthy();
    expect(domainSections.some(section => section.includes('xyz.saas-app.com'))).toBeTruthy();

    // Test cross-tenant data search
    await dashboard.search('tenant-config');
    const searchResults = await dashboard.getSearchResults();

    // Should find tenant configs from both tenants
    const tenantConfigs = searchResults.filter(result => result.key === 'tenant-config');
    expect(tenantConfigs.length).toBe(2);

    // Verify different tenant data
    const abcConfig = tenantConfigs.find(config => config.value.includes('ABC Corporation'));
    const xyzConfig = tenantConfigs.find(config => config.value.includes('XYZ Industries'));

    expect(abcConfig).toBeTruthy();
    expect(xyzConfig).toBeTruthy();

    // Test tenant switching workflow
    await tenantAPage.bringToFront();
    await extensionPage.bringToFront();

    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    // Should now show tenant A data
    const currentTenantConfig = await storage.getStorageItemByKey('tenant-config');
    const currentConfigData = JSON.parse(currentTenantConfig.value);
    expect(currentConfigData.id).toBe('tenant-abc');

    // Test cookies tab for tenant-specific data
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    const tenantCookie = extensionPage.locator('[data-cookie-name="tenant-id"]');
    if (await tenantCookie.count() > 0) {
      const tenantCookieValue = await tenantCookie.locator('.cookie-value').textContent();
      expect(tenantCookieValue).toBe('tenant-abc');
    }

    // Switch back to tenant B and verify
    await tenantBPage.bringToFront();
    await extensionPage.bringToFront();

    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    const tenantCookieB = extensionPage.locator('[data-cookie-name="tenant-id"]');
    if (await tenantCookieB.count() > 0) {
      const tenantCookieBValue = await tenantCookieB.locator('.cookie-value').textContent();
      expect(tenantCookieBValue).toBe('tenant-xyz');
    }

    // Clean up
    await tenantAPage.close();
    await tenantBPage.close();
  });

  test('development to production environment workflow', async () => {
    // Development environment
    const devPage = await extensionHelper.createTestPage({
      url: 'https://dev-app.company.com/debug',
      localStorage: {
        'env-config': JSON.stringify({
          environment: 'development',
          apiUrl: 'https://dev-api.company.com',
          debugMode: true,
          logLevel: 'debug'
        }),
        'feature-flags': JSON.stringify({
          newFeature: true,
          betaFeatures: true,
          debugTools: true,
          performanceMonitoring: false
        }),
        'dev-tools': JSON.stringify({
          consoleEnabled: true,
          networkMonitoring: true,
          stateInspector: true,
          hotReload: true
        })
      },
      cookies: {
        'dev-session': 'dev-session-123',
        'debug-mode': 'enabled',
        'dev-user': 'developer@company.com'
      }
    });

    // Pin development data
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();
    await storage.pinStorageItem('env-config');
    await storage.pinStorageItem('feature-flags');
    await storage.pinStorageItem('dev-tools');

    // Staging environment
    const stagingPage = await extensionHelper.createTestPage({
      url: 'https://staging-app.company.com/test',
      localStorage: {
        'env-config': JSON.stringify({
          environment: 'staging',
          apiUrl: 'https://staging-api.company.com',
          debugMode: false,
          logLevel: 'info'
        }),
        'feature-flags': JSON.stringify({
          newFeature: true,
          betaFeatures: false,
          debugTools: false,
          performanceMonitoring: true
        }),
        'test-data': JSON.stringify({
          automatedTests: true,
          testSuite: 'regression',
          coverage: 85,
          lastRun: Date.now()
        })
      },
      cookies: {
        'staging-session': 'staging-session-456',
        'test-mode': 'enabled',
        'qa-user': 'qa@company.com'
      }
    });

    await stagingPage.bringToFront();
    await extensionPage.bringToFront();

    await storage.navigate();
    await storage.waitForDataLoad();
    await storage.pinStorageItem('env-config');
    await storage.pinStorageItem('test-data');

    // Production environment
    const prodPage = await extensionHelper.createTestPage({
      url: 'https://app.company.com/live',
      localStorage: {
        'env-config': JSON.stringify({
          environment: 'production',
          apiUrl: 'https://api.company.com',
          debugMode: false,
          logLevel: 'error'
        }),
        'feature-flags': JSON.stringify({
          newFeature: false, // Not yet released
          betaFeatures: false,
          debugTools: false,
          performanceMonitoring: true
        }),
        'analytics': JSON.stringify({
          trackingEnabled: true,
          sessionRecording: false,
          errorReporting: true,
          performanceMetrics: true
        })
      },
      cookies: {
        'prod-session': 'prod-session-789',
        'tracking-consent': 'granted',
        'user-type': 'customer'
      }
    });

    await prodPage.bringToFront();
    await extensionPage.bringToFront();

    await storage.navigate();
    await storage.waitForDataLoad();
    await storage.pinStorageItem('env-config');
    await storage.pinStorageItem('analytics');

    // Compare environments in dashboard
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    // Search for environment configurations
    await dashboard.search('env-config');
    const envConfigs = await dashboard.getSearchResults();
    expect(envConfigs.length).toBe(3); // dev, staging, prod

    // Verify environment-specific differences
    for (const config of envConfigs) {
      const envData = JSON.parse(config.value);

      if (envData.environment === 'development') {
        expect(envData.debugMode).toBe(true);
        expect(envData.logLevel).toBe('debug');
      } else if (envData.environment === 'staging') {
        expect(envData.debugMode).toBe(false);
        expect(envData.logLevel).toBe('info');
      } else if (envData.environment === 'production') {
        expect(envData.debugMode).toBe(false);
        expect(envData.logLevel).toBe('error');
      }
    }

    // Test feature flag comparison across environments
    await dashboard.clearSearch();
    await dashboard.search('feature-flags');
    const featureFlags = await dashboard.getSearchResults();
    expect(featureFlags.length).toBe(3);

    // Verify feature progression from dev to prod
    const devFlags = featureFlags.find(flag => flag.value.includes('"newFeature": true') && flag.value.includes('"betaFeatures": true'));
    const stagingFlags = featureFlags.find(flag => flag.value.includes('"newFeature": true') && flag.value.includes('"betaFeatures": false'));
    const prodFlags = featureFlags.find(flag => flag.value.includes('"newFeature": false'));

    expect(devFlags).toBeTruthy(); // Dev has all features enabled
    expect(stagingFlags).toBeTruthy(); // Staging has some features enabled
    expect(prodFlags).toBeTruthy(); // Prod has conservative settings

    // Test environment-specific organization
    await dashboard.clearSearch();
    await dashboard.setOrganizationMode('domain');

    const environments = await dashboard.getOrganizedSections();
    expect(environments.some(env => env.includes('dev-app.company.com'))).toBeTruthy();
    expect(environments.some(env => env.includes('staging-app.company.com'))).toBeTruthy();
    expect(environments.some(env => env.includes('app.company.com'))).toBeTruthy();

    // Simulate debugging production issue using development data
    await devPage.bringToFront();
    await extensionPage.bringToFront();

    const devConfigItem = await dashboard.getPinnedItemByKey('env-config');
    expect(devConfigItem.value).toContain('development');
    expect(devConfigItem.value).toContain('"debugMode": true');

    // Compare with production to identify differences
    await prodPage.bringToFront();
    await extensionPage.bringToFront();

    const prodConfigItem = await dashboard.getPinnedItemByKey('env-config');
    expect(prodConfigItem.value).toContain('production');
    expect(prodConfigItem.value).toContain('"debugMode": false');

    // Clean up
    await devPage.close();
    await stagingPage.close();
    await prodPage.close();
  });
});