// Test data for storage operations
import { faker } from '@faker-js/faker';

/**
 * Generate test storage data
 */
export class StorageTestData {
  /**
   * Simple key-value pairs
   */
  static getSimpleData() {
    return {
      'user-name': 'John Doe',
      'session-id': '12345',
      'theme': 'dark',
      'language': 'en-US',
      'last-login': '2024-01-15T10:30:00Z'
    };
  }

  /**
   * JSON object data
   */
  static getJsonData() {
    return {
      'user-profile': JSON.stringify({
        id: 12345,
        name: 'John Doe',
        email: 'john@example.com',
        preferences: {
          theme: 'dark',
          notifications: true,
          language: 'en'
        },
        lastLogin: '2024-01-15T10:30:00Z'
      }),
      'shopping-cart': JSON.stringify([
        { id: 1, name: 'Product A', price: 29.99, quantity: 2 },
        { id: 2, name: 'Product B', price: 49.99, quantity: 1 }
      ]),
      'app-config': JSON.stringify({
        apiUrl: 'https://api.example.com',
        version: '1.0.0',
        features: {
          analytics: true,
          darkMode: true,
          notifications: false
        }
      })
    };
  }

  /**
   * Large dataset for performance testing
   */
  static getLargeDataset(count = 100) {
    const data = {};

    for (let i = 0; i < count; i++) {
      const key = `item-${i.toString().padStart(3, '0')}`;
      const value = faker.lorem.sentence();
      data[key] = value;
    }

    // Add some JSON objects
    for (let i = 0; i < Math.min(10, count / 10); i++) {
      const key = `json-object-${i}`;
      const value = JSON.stringify({
        id: faker.number.int({ min: 1000, max: 9999 }),
        name: faker.person.fullName(),
        email: faker.internet.email(),
        address: {
          street: faker.location.streetAddress(),
          city: faker.location.city(),
          country: faker.location.country()
        },
        metadata: {
          created: faker.date.past().toISOString(),
          updated: faker.date.recent().toISOString(),
          version: faker.system.semver()
        }
      });
      data[key] = value;
    }

    return data;
  }

  /**
   * Data with special characters and edge cases
   */
  static getEdgeCaseData() {
    return {
      'empty-string': '',
      'whitespace': '   ',
      'special-chars': '!@#$%^&*()_+-=[]{}|;:,.<>?',
      'unicode': '🚀 Hello 世界 🌟',
      'html-content': '<script>alert("test")</script>',
      'json-string': '{"nested": {"value": "test"}}',
      'number-string': '12345',
      'boolean-string': 'true',
      'null-string': 'null',
      'very-long-key': 'a'.repeat(200),
      'very-long-value': 'This is a very long value. '.repeat(100)
    };
  }

  /**
   * Data that should cause validation errors
   */
  static getInvalidData() {
    return {
      // These would be used to test validation
      'null-key': null,
      'undefined-key': undefined,
      'empty-key': '',
      'too-long-key': 'a'.repeat(1000),
    };
  }

  /**
   * Generate realistic application data
   */
  static getRealisticAppData() {
    return {
      // Authentication related
      'auth-token': faker.string.alphanumeric(64),
      'refresh-token': faker.string.alphanumeric(32),
      'user-id': faker.string.uuid(),

      // User preferences
      'user-preferences': JSON.stringify({
        theme: faker.helpers.arrayElement(['light', 'dark', 'auto']),
        language: faker.helpers.arrayElement(['en', 'es', 'fr', 'de']),
        timezone: faker.location.timeZone(),
        notifications: {
          email: faker.datatype.boolean(),
          push: faker.datatype.boolean(),
          sms: faker.datatype.boolean()
        }
      }),

      // Application state
      'current-route': '/dashboard',
      'sidebar-collapsed': 'false',
      'recent-searches': JSON.stringify([
        faker.lorem.word(),
        faker.lorem.word(),
        faker.lorem.word()
      ]),

      // Temporary data
      'form-draft': JSON.stringify({
        title: faker.lorem.sentence(),
        content: faker.lorem.paragraphs(3),
        tags: faker.lorem.words(3).split(' '),
        lastSaved: faker.date.recent().toISOString()
      })
    };
  }

  /**
   * Generate random data with faker
   */
  static generateRandomData(count = 10) {
    const data = {};

    for (let i = 0; i < count; i++) {
      const keyType = faker.helpers.arrayElement(['word', 'slug', 'phrase']);
      let key;

      switch (keyType) {
        case 'word':
          key = faker.lorem.word();
          break;
        case 'slug':
          key = faker.lorem.slug();
          break;
        case 'phrase':
          key = faker.lorem.words(2).replace(' ', '-');
          break;
      }

      const valueType = faker.helpers.arrayElement(['string', 'number', 'boolean', 'json']);
      let value;

      switch (valueType) {
        case 'string':
          value = faker.lorem.sentence();
          break;
        case 'number':
          value = faker.number.int({ min: 1, max: 10000 }).toString();
          break;
        case 'boolean':
          value = faker.datatype.boolean().toString();
          break;
        case 'json':
          value = JSON.stringify({
            id: faker.string.uuid(),
            name: faker.person.fullName(),
            value: faker.number.int({ min: 1, max: 100 })
          });
          break;
      }

      data[key] = value;
    }

    return data;
  }

  /**
   * Get data organized by type for testing organization modes
   */
  static getOrganizedData() {
    return {
      localStorage: {
        'user-profile': JSON.stringify({ name: 'John', age: 30 }),
        'app-settings': JSON.stringify({ theme: 'dark' }),
        'simple-string': 'Hello World'
      },
      sessionStorage: {
        'temp-data': 'temporary',
        'form-state': JSON.stringify({ field1: 'value1' }),
        'session-id': '123456'
      }
    };
  }

  /**
   * Get domain-specific data for testing domain filtering
   */
  static getDomainSpecificData() {
    return {
      'github.com': {
        'github-token': faker.string.alphanumeric(40),
        'last-repo': 'user/repository',
        'notifications': JSON.stringify({ enabled: true, count: 5 })
      },
      'example.com': {
        'user-id': faker.string.uuid(),
        'preferences': JSON.stringify({ lang: 'en' }),
        'cache-key': faker.string.alphanumeric(16)
      }
    };
  }
}