// Cross-Site Compatibility Tests
import { test, expect } from '@playwright/test';
import { ExtensionHelper } from '../helpers/extension-helper.js';
import { ExtensionPanel } from '../helpers/page-objects/extension-panel.js';
import { DashboardTab } from '../helpers/page-objects/dashboard-tab.js';
import { StorageTab } from '../helpers/page-objects/storage-tab.js';
import { StorageTestData } from '../helpers/test-data/storage-data.js';
import { CookieTestData } from '../helpers/test-data/cookie-data.js';

test.describe('Cross-Site Compatibility', () => {
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

  test('extension compatibility with popular websites', async () => {
    // Test with GitHub-like site structure
    const githubLikePage = await extensionHelper.createTestPage({
      url: 'https://github.com/user/repo',
      localStorage: {
        'preferred_color_mode': 'dark',
        'tz': 'America/New_York',
        'saved_repos': JSON.stringify([
          { name: 'repo1', stars: 45, language: 'JavaScript' },
          { name: 'repo2', stars: 123, language: 'Python' }
        ]),
        'user_session': JSON.stringify({
          id: 'github_user_123',
          login: 'developer',
          avatar_url: 'https://avatars.githubusercontent.com/u/123'
        })
      },
      sessionStorage: {
        '__Host-user_session_same_site': 'session_token_123',
        'navigation_state': JSON.stringify({
          current_tab: 'repositories',
          breadcrumb: ['user', 'repositories']
        })
      },
      cookies: {
        '_gh_sess': 'session_value_123',
        'logged_in': 'yes',
        'tz': 'America/New_York',
        'color_mode': 'dark'
      }
    });

    // Verify extension can read GitHub-like data
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    const githubItems = await storage.getAllStorageKeys();
    expect(githubItems).toContain('preferred_color_mode');
    expect(githubItems).toContain('saved_repos');

    // Test JSON parsing for complex GitHub data
    const reposItem = await storage.getStorageItemByKey('saved_repos');
    expect(reposItem.isJson).toBeTruthy();

    await storage.pinStorageItem('saved_repos');
    await storage.pinStorageItem('user_session');

    // Check cookies
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    const ghSessionCookie = extensionPage.locator('[data-cookie-name="_gh_sess"]');
    if (await ghSessionCookie.count() > 0) {
      await expect(ghSessionCookie).toBeVisible();
    }

    // Test with Stack Overflow-like site
    const stackOverflowPage = await extensionHelper.createTestPage({
      url: 'https://stackoverflow.com/questions/12345',
      localStorage: {
        'so.cache.dropdowns': JSON.stringify({
          tags: ['javascript', 'python', 'react'],
          lastUpdated: Date.now()
        }),
        'so.settings': JSON.stringify({
          theme: 'light',
          editor: 'Monaco',
          notifications: true
        })
      },
      cookies: {
        'acct': 'user_account_token',
        'prov': 'provider_token',
        'usr': 'user_preferences'
      }
    });

    await stackOverflowPage.bringToFront();
    await extensionPage.bringToFront();

    await storage.navigate();
    await storage.waitForDataLoad();

    const soItems = await storage.getAllStorageKeys();
    expect(soItems.some(key => key.includes('so.'))).toBeTruthy();

    // Pin Stack Overflow data
    const cacheKey = soItems.find(key => key.includes('cache'));
    if (cacheKey) {
      await storage.pinStorageItem(cacheKey);
    }

    // Test dashboard with mixed site data
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const pinnedItems = await dashboard.getPinnedItems();
    const githubPinned = pinnedItems.filter(item =>
      ['saved_repos', 'user_session'].includes(item.key)
    );
    const soPinned = pinnedItems.filter(item =>
      item.key.includes('so.')
    );

    expect(githubPinned.length).toBe(2);
    expect(soPinned.length).toBeGreaterThan(0);

    await githubLikePage.close();
    await stackOverflowPage.close();
  });

  test('compatibility with different content security policies', async () => {
    // Test with strict CSP site
    const strictCSPPage = await extensionHelper.createTestPage({
      url: 'https://secure-bank.example.com/account',
      localStorage: {
        'security_token': 'encrypted_token_abc123',
        'user_preferences': JSON.stringify({
          twoFactorEnabled: true,
          loginNotifications: true,
          sessionTimeout: 900
        }),
        'account_summary': JSON.stringify({
          masked: true,
          lastLogin: Date.now(),
          securityLevel: 'high'
        })
      },
      cookies: CookieTestData.getSecurityTestCookies(),
      // Simulate strict CSP environment
      extraHeaders: {
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval'; object-src 'none';"
      }
    });

    // Extension should still work despite CSP restrictions
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    // Should be able to read storage even with CSP
    const bankItems = await storage.getAllStorageKeys();
    expect(bankItems).toContain('security_token');
    expect(bankItems).toContain('user_preferences');

    // Test cookie security analysis
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    // Look for security warnings on insecure cookies
    const securityWarnings = extensionPage.locator('.security-warning, .warning-icon');
    const warningCount = await securityWarnings.count();

    // Should detect insecure cookies from test data
    expect(warningCount).toBeGreaterThan(0);

    // Test with CSP that blocks inline scripts
    const noInlineCSPPage = await extensionHelper.createTestPage({
      url: 'https://corporate-app.example.com/dashboard',
      localStorage: {
        'app_config': JSON.stringify({
          cspMode: 'strict',
          allowInlineScripts: false,
          trustedSources: ['self', 'cdn.example.com']
        }),
        'user_data': JSON.stringify({
          role: 'employee',
          department: 'engineering',
          permissions: ['read', 'write']
        })
      },
      extraHeaders: {
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"
      }
    });

    await noInlineCSPPage.bringToFront();
    await extensionPage.bringToFront();

    // Extension should adapt to CSP restrictions
    await storage.navigate();
    await storage.waitForDataLoad();

    const corporateItems = await storage.getAllStorageKeys();
    expect(corporateItems).toContain('app_config');

    // Verify extension functionality isn't broken by CSP
    await storage.pinStorageItem('app_config');

    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const configItem = await dashboard.getPinnedItemByKey('app_config');
    expect(configItem).toBeTruthy();
    expect(configItem.value).toContain('cspMode');

    await strictCSPPage.close();
    await noInlineCSPPage.close();
  });

  test('compatibility with single page applications', async () => {
    // React-like SPA
    const reactSPAPage = await extensionHelper.createTestPage({
      url: 'https://react-app.example.com/dashboard',
      localStorage: {
        'react_devtools_highlight_updates': 'true',
        'redux_state': JSON.stringify({
          user: { id: 1, name: 'John' },
          ui: { loading: false, error: null },
          data: { items: [1, 2, 3] }
        }),
        'router_state': JSON.stringify({
          currentRoute: '/dashboard',
          history: ['/login', '/dashboard'],
          query: {}
        }),
        'component_cache': JSON.stringify({
          'Dashboard': { lastRender: Date.now(), props: {} },
          'UserProfile': { lastRender: Date.now() - 1000, props: { userId: 1 } }
        })
      },
      sessionStorage: {
        'react_hot_reload': 'enabled',
        'dev_tools': JSON.stringify({
          enabled: true,
          components: ['Redux DevTools', 'React DevTools']
        })
      }
    });

    // Test extension with React SPA data
    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    const reactItems = await storage.getAllStorageKeys();
    expect(reactItems.some(key => key.includes('react'))).toBeTruthy();
    expect(reactItems).toContain('redux_state');

    // Test complex Redux state JSON
    const reduxStateItem = await storage.getStorageItemByKey('redux_state');
    expect(reduxStateItem.isJson).toBeTruthy();

    await storage.openJsonViewer('redux_state');
    const reduxJson = await storage.getJsonViewerContent();
    expect(reduxJson).toContain('"user"');
    expect(reduxJson).toContain('"ui"');
    await storage.closeJsonViewer();

    // Pin SPA-related data
    await storage.pinStorageItem('redux_state');
    await storage.pinStorageItem('router_state');

    // Vue.js-like SPA
    const vueSPAPage = await extensionHelper.createTestPage({
      url: 'https://vue-app.example.com/profile',
      localStorage: {
        'vuex_store': JSON.stringify({
          modules: {
            user: { state: { authenticated: true } },
            cart: { state: { items: [], total: 0 } }
          }
        }),
        'vue_router': JSON.stringify({
          current: '/profile',
          matched: [{ path: '/profile', component: 'Profile' }]
        }),
        'vue_devtools': JSON.stringify({
          enabled: true,
          version: '6.0.0'
        })
      }
    });

    await vueSPAPage.bringToFront();
    await extensionPage.bringToFront();

    await storage.navigate();
    await storage.waitForDataLoad();

    const vueItems = await storage.getAllStorageKeys();
    expect(vueItems).toContain('vuex_store');
    expect(vueItems).toContain('vue_router');

    await storage.pinStorageItem('vuex_store');

    // Angular-like SPA
    const angularSPAPage = await extensionHelper.createTestPage({
      url: 'https://angular-app.example.com/home',
      localStorage: {
        'ng_storage': JSON.stringify({
          services: ['UserService', 'DataService'],
          components: ['HomeComponent', 'NavComponent']
        }),
        'angular_router': JSON.stringify({
          url: '/home',
          state: { data: {} },
          navigationId: 1
        }),
        'rxjs_state': JSON.stringify({
          subscriptions: 5,
          observables: ['user$', 'data$', 'error$']
        })
      }
    });

    await angularSPAPage.bringToFront();
    await extensionPage.bringToFront();

    await storage.navigate();
    await storage.waitForDataLoad();

    const angularItems = await storage.getAllStorageKeys();
    expect(angularItems).toContain('ng_storage');
    expect(angularItems).toContain('angular_router');

    // Test dashboard with all SPA frameworks
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const allPinnedItems = await dashboard.getPinnedItems();
    const spaItems = allPinnedItems.filter(item =>
      ['redux_state', 'router_state', 'vuex_store', 'ng_storage'].includes(item.key)
    );

    expect(spaItems.length).toBe(4);

    // Test framework-specific search
    await dashboard.search('router');
    const routerResults = await dashboard.getSearchResults();
    expect(routerResults.length).toBeGreaterThan(1); // Should find React and Vue router states

    await reactSPAPage.close();
    await vueSPAPage.close();
    await angularSPAPage.close();
  });

  test('compatibility with e-commerce platforms', async () => {
    // Shopify-like e-commerce site
    const shopifyPage = await extensionHelper.createTestPage({
      url: 'https://store.shopify.com/products/widget',
      localStorage: {
        'shopify_cart': JSON.stringify({
          items: [
            { id: 1, variant_id: 123, quantity: 2, price: 29.99 },
            { id: 2, variant_id: 456, quantity: 1, price: 59.99 }
          ],
          total: 119.97,
          currency: 'USD'
        }),
        'shopify_customer': JSON.stringify({
          id: 'customer_123',
          email: 'customer@example.com',
          tags: ['vip', 'returning'],
          total_spent: 599.99
        }),
        'recently_viewed': JSON.stringify([
          { id: 1, title: 'Widget A', price: 29.99 },
          { id: 2, title: 'Widget B', price: 59.99 }
        ])
      },
      cookies: CookieTestData.getEcommerceCookies()
    });

    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    const shopifyItems = await storage.getAllStorageKeys();
    expect(shopifyItems).toContain('shopify_cart');
    expect(shopifyItems).toContain('shopify_customer');

    // Test cart data structure
    const cartItem = await storage.getStorageItemByKey('shopify_cart');
    expect(cartItem.isJson).toBeTruthy();

    await storage.openJsonViewer('shopify_cart');
    const cartJson = await storage.getJsonViewerContent();
    expect(cartJson).toContain('119.97');
    expect(cartJson).toContain('USD');
    await storage.closeJsonViewer();

    await storage.pinStorageItem('shopify_cart');
    await storage.pinStorageItem('shopify_customer');

    // WooCommerce-like site
    const wooCommercePage = await extensionHelper.createTestPage({
      url: 'https://shop.example.com/checkout',
      localStorage: {
        'wc_cart_hash': 'abc123def456',
        'wc_fragments': JSON.stringify({
          'div.widget_shopping_cart_content': '<div>Cart content</div>',
          'span.cart-total': '$119.97'
        }),
        'wc_customer': JSON.stringify({
          billing: {
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com'
          },
          shipping: {
            country: 'US',
            state: 'CA'
          }
        })
      },
      sessionStorage: {
        'wc_checkout_state': JSON.stringify({
          step: 'payment',
          payment_method: 'stripe',
          terms_accepted: true
        })
      }
    });

    await wooCommercePage.bringToFront();
    await extensionPage.bringToFront();

    await storage.navigate();
    await storage.waitForDataLoad();

    const wooItems = await storage.getAllStorageKeys();
    expect(wooItems.some(key => key.includes('wc_'))).toBeTruthy();

    await storage.pinStorageItem('wc_customer');

    // Check sessionStorage for WooCommerce
    await storage.selectStorageType('sessionStorage');
    await storage.waitForDataLoad();

    const checkoutStateItem = await storage.getStorageItemByKey('wc_checkout_state');
    expect(checkoutStateItem.isJson).toBeTruthy();

    // Magento-like site
    const magentoPage = await extensionHelper.createTestPage({
      url: 'https://magento-store.example.com/catalog',
      localStorage: {
        'mage-cache-storage': JSON.stringify({
          'product-data-123': {
            name: 'Premium Widget',
            price: 99.99,
            categories: ['electronics', 'gadgets']
          }
        }),
        'customer-data': JSON.stringify({
          'customer': {
            firstname: 'Jane',
            lastname: 'Smith',
            group_id: 2
          },
          'cart': {
            summary_count: 3,
            subtotal: 179.97
          }
        })
      }
    });

    await magentoPage.bringToFront();
    await extensionPage.bringToFront();

    await storage.navigate();
    await storage.selectStorageType('localStorage');
    await storage.waitForDataLoad();

    const magentoItems = await storage.getAllStorageKeys();
    expect(magentoItems).toContain('customer-data');

    await storage.pinStorageItem('customer-data');

    // Test dashboard with all e-commerce platforms
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const ecommercePinned = await dashboard.getPinnedItems();
    const platforms = ecommercePinned.filter(item =>
      ['shopify_cart', 'shopify_customer', 'wc_customer', 'customer-data'].includes(item.key)
    );

    expect(platforms.length).toBe(4);

    // Test e-commerce specific search
    await dashboard.search('customer');
    const customerResults = await dashboard.getSearchResults();
    expect(customerResults.length).toBeGreaterThan(2); // Should find customer data from multiple platforms

    // Test cart analysis
    await dashboard.clearSearch();
    await dashboard.search('cart');
    const cartResults = await dashboard.getSearchResults();
    expect(cartResults.length).toBeGreaterThan(1);

    await shopifyPage.close();
    await wooCommercePage.close();
    await magentoPage.close();
  });

  test('compatibility with different domains and protocols', async () => {
    // HTTPS site
    const httpsPage = await extensionHelper.createTestPage({
      url: 'https://secure.example.com/app',
      localStorage: {
        'secure_data': JSON.stringify({
          protocol: 'https',
          encrypted: true,
          certificate: 'valid'
        }),
        'security_headers': JSON.stringify({
          hsts: true,
          csp: 'strict-dynamic',
          xframe: 'deny'
        })
      },
      cookies: {
        'secure_session': 'https_session_123',
        'security_level': 'high'
      }
    });

    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    const httpsItems = await storage.getAllStorageKeys();
    expect(httpsItems).toContain('secure_data');

    await storage.pinStorageItem('secure_data');

    // Subdomain site
    const subdomainPage = await extensionHelper.createTestPage({
      url: 'https://api.sub.example.com/v1/data',
      localStorage: {
        'subdomain_config': JSON.stringify({
          level: 'api',
          version: 'v1',
          parent_domain: 'example.com'
        }),
        'api_cache': JSON.stringify({
          endpoints: ['/users', '/products', '/orders'],
          lastSync: Date.now()
        })
      },
      cookies: {
        'api_key': 'api_key_456',
        'subdomain_session': 'sub_session_789'
      }
    });

    await subdomainPage.bringToFront();
    await extensionPage.bringToFront();

    await storage.navigate();
    await storage.waitForDataLoad();

    const subdomainItems = await storage.getAllStorageKeys();
    expect(subdomainItems).toContain('subdomain_config');

    await storage.pinStorageItem('subdomain_config');

    // Test cookies across different domains
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    // Should show subdomain cookies
    const apiKeyCookie = extensionPage.locator('[data-cookie-name="api_key"]');
    if (await apiKeyCookie.count() > 0) {
      await expect(apiKeyCookie).toBeVisible();
    }

    // Different port site
    const portPage = await extensionHelper.createTestPage({
      url: 'https://localhost:3000/dev-server',
      localStorage: {
        'dev_server': JSON.stringify({
          port: 3000,
          environment: 'development',
          hot_reload: true
        }),
        'webpack_cache': JSON.stringify({
          modules: ['react', 'webpack-dev-server'],
          hash: 'abc123'
        })
      }
    });

    await portPage.bringToFront();
    await extensionPage.bringToFront();

    await storage.navigate();
    await storage.waitForDataLoad();

    const devItems = await storage.getAllStorageKeys();
    expect(devItems).toContain('dev_server');

    // IP address site
    const ipPage = await extensionHelper.createTestPage({
      url: 'http://192.168.1.100:8080/admin',
      localStorage: {
        'local_network': JSON.stringify({
          ip: '192.168.1.100',
          type: 'internal',
          access_level: 'admin'
        }),
        'network_config': JSON.stringify({
          subnet: '192.168.1.0/24',
          gateway: '192.168.1.1'
        })
      }
    });

    await ipPage.bringToFront();
    await extensionPage.bringToFront();

    await storage.navigate();
    await storage.waitForDataLoad();

    const networkItems = await storage.getAllStorageKeys();
    expect(networkItems).toContain('local_network');

    await storage.pinStorageItem('local_network');

    // Test dashboard domain organization
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();
    await dashboard.setOrganizationMode('domain');

    const domainSections = await dashboard.getOrganizedSections();

    // Should have sections for different domain types
    expect(domainSections.length).toBeGreaterThan(3);
    expect(domainSections.some(section => section.includes('secure.example.com'))).toBeTruthy();
    expect(domainSections.some(section => section.includes('api.sub.example.com'))).toBeTruthy();

    // Test cross-domain data search
    await dashboard.search('config');
    const configResults = await dashboard.getSearchResults();
    expect(configResults.length).toBeGreaterThan(2); // Should find configs from multiple domains

    // Clean up
    await httpsPage.close();
    await subdomainPage.close();
    await portPage.close();
    await ipPage.close();
  });

  test('compatibility with browser extension conflicts', async () => {
    // Simulate page with other extensions' data
    const conflictPage = await extensionHelper.createTestPage({
      url: 'https://conflicted-site.example.com/page',
      localStorage: {
        // Our extension data
        'inspector_settings': JSON.stringify({
          theme: 'dark',
          autoRefresh: true
        }),

        // Other extension data that might conflict
        'chrome-extension_abc123_settings': JSON.stringify({
          extensionName: 'Other Extension',
          enabled: true
        }),
        'extension_data_xyz789': 'some other extension data',
        'adblock_settings': JSON.stringify({
          enabled: true,
          filters: ['ads', 'trackers']
        }),
        'password_manager_vault': JSON.stringify({
          encrypted: true,
          count: 15
        }),

        // Site's own data
        'site_preferences': JSON.stringify({
          language: 'en',
          region: 'US'
        })
      },
      cookies: {
        // Mixed cookies from different sources
        'site_session': 'site_session_123',
        'tracking_consent': 'accepted',
        'extension_abc_data': 'ext_data_456',
        'our_extension_setting': 'our_value_789'
      }
    });

    await panel.navigateToTab('storage');
    await storage.waitForDataLoad();

    const allItems = await storage.getAllStorageKeys();

    // Should see all storage items including conflicting ones
    expect(allItems).toContain('inspector_settings');
    expect(allItems).toContain('chrome-extension_abc123_settings');
    expect(allItems).toContain('site_preferences');

    // Test extension can handle conflicting data names
    await storage.search('extension');
    const extensionResults = await storage.getSearchResults();
    expect(extensionResults.length).toBeGreaterThan(2); // Should find multiple extension-related items

    // Pin our extension's data specifically
    await storage.clearSearch();
    await storage.pinStorageItem('inspector_settings');

    // Test filtering out other extensions' data
    await storage.search('chrome-extension');
    const chromeExtResults = await storage.getSearchResults();
    expect(chromeExtResults.length).toBeGreaterThan(0);

    // Test cookies with mixed sources
    await panel.navigateToTab('cookies');
    await panel.waitForLoadingComplete();

    const cookieItems = extensionPage.locator('.cookie-item');
    const cookieCount = await cookieItems.count();
    expect(cookieCount).toBeGreaterThan(3); // Should show cookies from multiple sources

    // Test dashboard can organize mixed data
    await panel.navigateToTab('dashboard');
    await dashboard.waitForDataLoad();

    const pinnedItems = await dashboard.getPinnedItems();
    const ourExtensionItem = pinnedItems.find(item => item.key === 'inspector_settings');
    expect(ourExtensionItem).toBeTruthy();

    // Test search across mixed data sources
    await dashboard.search('settings');
    const settingsResults = await dashboard.getSearchResults();
    expect(settingsResults.length).toBeGreaterThan(1); // Should find various settings

    // Verify we can distinguish our data from others
    const ourSettings = settingsResults.find(result =>
      result.key === 'inspector_settings'
    );
    expect(ourSettings).toBeTruthy();
    expect(ourSettings.value).toContain('autoRefresh');

    // Test with page that has naming conflicts
    const namingConflictPage = await extensionHelper.createTestPage({
      url: 'https://naming-conflict.example.com/app',
      localStorage: {
        // Exact name conflicts
        'user-profile': JSON.stringify({ source: 'site', name: 'Site User' }),
        'settings': JSON.stringify({ source: 'site', theme: 'light' }),
        'cache': JSON.stringify({ source: 'site', size: 1024 }),

        // Similar names that might cause confusion
        'user_profile': JSON.stringify({ source: 'alternative', name: 'Alt User' }),
        'user-preferences': JSON.stringify({ source: 'preferences', lang: 'es' }),
        'userProfile': JSON.stringify({ source: 'camelCase', id: 12345 })
      }
    });

    await namingConflictPage.bringToFront();
    await extensionPage.bringToFront();

    await storage.navigate();
    await storage.waitForDataLoad();

    const conflictItems = await storage.getAllStorageKeys();

    // Should handle all variations of similar names
    expect(conflictItems).toContain('user-profile');
    expect(conflictItems).toContain('user_profile');
    expect(conflictItems).toContain('user-preferences');
    expect(conflictItems).toContain('userProfile');

    // Test search can distinguish between similar names
    await storage.search('user');
    const userResults = await storage.getSearchResults();
    expect(userResults.length).toBe(4); // Should find all 4 user-related items

    // Test individual access to conflicted names
    const dashProfile = await storage.getStorageItemByKey('user-profile');
    const underscoreProfile = await storage.getStorageItemByKey('user_profile');
    const camelProfile = await storage.getStorageItemByKey('userProfile');

    expect(dashProfile.value).toContain('Site User');
    expect(underscoreProfile.value).toContain('Alt User');
    expect(camelProfile.value).toContain('12345');

    await conflictPage.close();
    await namingConflictPage.close();
  });
});