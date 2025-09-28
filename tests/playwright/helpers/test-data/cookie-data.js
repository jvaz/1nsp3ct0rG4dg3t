// Test data for cookie operations
import { faker } from '@faker-js/faker';

/**
 * Generate test cookie data
 */
export class CookieTestData {
  /**
   * Basic cookies for testing
   */
  static getBasicCookies() {
    return {
      'session-id': 'abc123def456',
      'user-preference': 'dark-theme',
      'language': 'en-US',
      'last-visit': Date.now().toString(),
      'is-logged-in': 'true'
    };
  }

  /**
   * Cookies with various attributes for comprehensive testing
   */
  static getAdvancedCookies() {
    return [
      {
        name: 'secure-session',
        value: faker.string.alphanumeric(32),
        domain: '.example.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'Strict',
        expirationDate: Math.floor(Date.now() / 1000) + 86400 // 24 hours
      },
      {
        name: 'tracking-id',
        value: faker.string.uuid(),
        domain: 'subdomain.example.com',
        path: '/app',
        secure: false,
        httpOnly: false,
        sameSite: 'Lax',
        expirationDate: Math.floor(Date.now() / 1000) + (86400 * 7) // 7 days
      },
      {
        name: 'analytics',
        value: JSON.stringify({
          userId: faker.string.uuid(),
          sessionStart: Date.now(),
          pageViews: faker.number.int({ min: 1, max: 50 })
        }),
        domain: '.analytics.example.com',
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'None'
      },
      {
        name: 'temp-data',
        value: 'temporary-value',
        domain: 'example.com',
        path: '/temp',
        secure: false,
        httpOnly: false,
        // No expiration (session cookie)
      }
    ];
  }

  /**
   * Cookies for domain inheritance testing
   */
  static getDomainInheritanceCookies() {
    return [
      {
        name: 'parent-domain-cookie',
        value: 'parent-value',
        domain: '.example.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'Strict'
      },
      {
        name: 'subdomain-cookie',
        value: 'subdomain-value',
        domain: 'app.example.com',
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'Lax'
      },
      {
        name: 'another-subdomain-cookie',
        value: 'another-value',
        domain: 'api.example.com',
        path: '/v1',
        secure: true,
        httpOnly: true,
        sameSite: 'Strict'
      }
    ];
  }

  /**
   * Cookies with security issues for testing security analysis
   */
  static getInsecureCookies() {
    return [
      {
        name: 'insecure-session',
        value: 'session-token-12345',
        domain: 'example.com',
        path: '/',
        secure: false, // Security issue: not secure
        httpOnly: false, // Security issue: accessible via JavaScript
        sameSite: 'None' // Security issue: no SameSite protection
      },
      {
        name: 'auth-token',
        value: faker.string.alphanumeric(64),
        domain: 'example.com',
        path: '/',
        secure: false, // Security issue on HTTPS site
        httpOnly: false, // Security issue for auth token
        // Missing sameSite attribute
      },
      {
        name: 'user-data',
        value: JSON.stringify({
          email: faker.internet.email(),
          creditCard: '1234-5678-9012-3456' // Sensitive data
        }),
        domain: 'example.com',
        path: '/',
        secure: true,
        httpOnly: false, // Security issue: sensitive data accessible via JS
        sameSite: 'Lax'
      }
    ];
  }

  /**
   * Large dataset of cookies for performance testing
   */
  static getLargeCookieSet(count = 50) {
    const cookies = [];

    for (let i = 0; i < count; i++) {
      cookies.push({
        name: `cookie-${i.toString().padStart(3, '0')}`,
        value: faker.string.alphanumeric(faker.number.int({ min: 10, max: 100 })),
        domain: faker.helpers.arrayElement([
          'example.com',
          '.example.com',
          'app.example.com',
          'api.example.com'
        ]),
        path: faker.helpers.arrayElement(['/', '/app', '/api', '/admin']),
        secure: faker.datatype.boolean(),
        httpOnly: faker.datatype.boolean(),
        sameSite: faker.helpers.arrayElement(['Strict', 'Lax', 'None']),
        expirationDate: faker.datatype.boolean()
          ? Math.floor(Date.now() / 1000) + faker.number.int({ min: 3600, max: 86400 * 30 })
          : undefined
      });
    }

    return cookies;
  }

  /**
   * Cookies with edge case values
   */
  static getEdgeCaseCookies() {
    return [
      {
        name: 'empty-value',
        value: '',
        domain: 'example.com',
        path: '/'
      },
      {
        name: 'special-chars',
        value: encodeURIComponent('Hello! @#$%^&*()'),
        domain: 'example.com',
        path: '/'
      },
      {
        name: 'unicode-value',
        value: encodeURIComponent('🚀 Hello 世界 🌟'),
        domain: 'example.com',
        path: '/'
      },
      {
        name: 'very-long-name-that-exceeds-normal-cookie-name-lengths',
        value: 'test-value',
        domain: 'example.com',
        path: '/'
      },
      {
        name: 'long-value',
        value: 'x'.repeat(4000), // Near cookie size limit
        domain: 'example.com',
        path: '/'
      },
      {
        name: 'json-cookie',
        value: encodeURIComponent(JSON.stringify({
          user: { id: 123, name: 'Test User' },
          settings: { theme: 'dark', lang: 'en' }
        })),
        domain: 'example.com',
        path: '/',
        httpOnly: false
      }
    ];
  }

  /**
   * Generate realistic e-commerce cookies
   */
  static getEcommerceCookies() {
    return [
      {
        name: 'cart-id',
        value: faker.string.uuid(),
        domain: '.shop.example.com',
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'Lax',
        expirationDate: Math.floor(Date.now() / 1000) + (86400 * 30) // 30 days
      },
      {
        name: 'user-session',
        value: faker.string.alphanumeric(48),
        domain: '.shop.example.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'Strict',
        expirationDate: Math.floor(Date.now() / 1000) + 3600 // 1 hour
      },
      {
        name: 'currency',
        value: faker.helpers.arrayElement(['USD', 'EUR', 'GBP', 'JPY']),
        domain: '.shop.example.com',
        path: '/',
        secure: false,
        httpOnly: false,
        sameSite: 'Lax',
        expirationDate: Math.floor(Date.now() / 1000) + (86400 * 365) // 1 year
      },
      {
        name: 'recently-viewed',
        value: JSON.stringify([
          faker.string.uuid(),
          faker.string.uuid(),
          faker.string.uuid()
        ]),
        domain: '.shop.example.com',
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'Lax',
        expirationDate: Math.floor(Date.now() / 1000) + (86400 * 7) // 7 days
      },
      {
        name: 'affiliate-id',
        value: faker.string.alphanumeric(16),
        domain: '.shop.example.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'Strict',
        expirationDate: Math.floor(Date.now() / 1000) + (86400 * 90) // 90 days
      }
    ];
  }

  /**
   * Generate analytics/tracking cookies
   */
  static getAnalyticsCookies() {
    return [
      {
        name: '_ga',
        value: `GA1.2.${faker.number.int({ min: 1000000000, max: 9999999999 })}.${faker.number.int({ min: 1000000000, max: 9999999999 })}`,
        domain: '.example.com',
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'Lax',
        expirationDate: Math.floor(Date.now() / 1000) + (86400 * 730) // 2 years
      },
      {
        name: '_gtag',
        value: faker.string.alphanumeric(32),
        domain: '.example.com',
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'Lax',
        expirationDate: Math.floor(Date.now() / 1000) + (86400 * 90) // 90 days
      },
      {
        name: 'fbp',
        value: `fb.1.${Date.now()}.${faker.number.int({ min: 1000000000, max: 9999999999 })}`,
        domain: '.example.com',
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'Lax',
        expirationDate: Math.floor(Date.now() / 1000) + (86400 * 90) // 90 days
      }
    ];
  }

  /**
   * Get cookies that should trigger security warnings
   */
  static getSecurityTestCookies() {
    return {
      // Should warn: sensitive data without HttpOnly
      authToken: {
        name: 'auth-token',
        value: faker.string.alphanumeric(64),
        domain: 'example.com',
        path: '/',
        secure: true,
        httpOnly: false, // Issue: auth token accessible via JS
        sameSite: 'Strict'
      },

      // Should warn: not secure on HTTPS
      sessionInsecure: {
        name: 'session-id',
        value: faker.string.alphanumeric(32),
        domain: 'example.com',
        path: '/',
        secure: false, // Issue: not secure
        httpOnly: true,
        sameSite: 'Lax'
      },

      // Should warn: no SameSite protection
      trackingNoSameSite: {
        name: 'tracking',
        value: faker.string.uuid(),
        domain: 'example.com',
        path: '/',
        secure: true,
        httpOnly: false
        // Issue: missing sameSite
      },

      // Should warn: SameSite=None without Secure
      crossSiteInsecure: {
        name: 'cross-site',
        value: 'some-value',
        domain: 'example.com',
        path: '/',
        secure: false, // Issue: SameSite=None requires Secure
        httpOnly: false,
        sameSite: 'None'
      }
    };
  }
}