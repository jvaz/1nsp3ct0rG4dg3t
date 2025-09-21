// Jest setup file for Chrome extension testing

// Mock Chrome APIs
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    getURL: jest.fn(path => `chrome-extension://test/${path}`)
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    executeScript: jest.fn(),
    sendMessage: jest.fn()
  },
  cookies: {
    getAll: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn()
  },
  scripting: {
    executeScript: jest.fn(),
    insertCSS: jest.fn()
  }
}

// Mock DOM APIs with working storage
const createStorage = () => {
  const storage = {}
  return {
    getItem: jest.fn((key) => storage[key] || null),
    setItem: jest.fn((key, value) => { storage[key] = value }),
    removeItem: jest.fn((key) => { delete storage[key] }),
    clear: jest.fn(() => { Object.keys(storage).forEach(key => delete storage[key]) }),
    key: jest.fn((index) => Object.keys(storage)[index] || null),
    get length() { return Object.keys(storage).length }
  }
}

Object.defineProperty(window, 'localStorage', {
  value: createStorage(),
  writable: true
})

Object.defineProperty(window, 'sessionStorage', {
  value: createStorage(),
  writable: true
})