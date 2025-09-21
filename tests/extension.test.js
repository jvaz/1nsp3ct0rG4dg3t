// Basic tests for 1nsp3ct0rG4dg3t extension

describe('Extension Configuration', () => {
  test('Chrome APIs are mocked correctly', () => {
    expect(chrome).toBeDefined()
    expect(chrome.runtime).toBeDefined()
    expect(chrome.storage).toBeDefined()
    expect(chrome.tabs).toBeDefined()
    expect(chrome.cookies).toBeDefined()
  })

  test('DOM APIs are available', () => {
    expect(window).toBeDefined()
    expect(document).toBeDefined()
    expect(localStorage).toBeDefined()
    expect(sessionStorage).toBeDefined()
  })
})

describe('Storage Utilities', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  test('localStorage operations work', () => {
    localStorage.setItem('test-key', 'test-value')
    expect(localStorage.getItem('test-key')).toBe('test-value')

    localStorage.removeItem('test-key')
    expect(localStorage.getItem('test-key')).toBeNull()
  })

  test('sessionStorage operations work', () => {
    sessionStorage.setItem('session-key', 'session-value')
    expect(sessionStorage.getItem('session-key')).toBe('session-value')

    sessionStorage.removeItem('session-key')
    expect(sessionStorage.getItem('session-key')).toBeNull()
  })
})

describe('Utility Functions', () => {
  test('JSON parsing and formatting', () => {
    const testObject = { key: 'value', number: 42 }
    const jsonString = JSON.stringify(testObject)
    const parsed = JSON.parse(jsonString)

    expect(parsed).toEqual(testObject)
  })

  test('HTML escaping (basic)', () => {
    const div = document.createElement('div')
    div.textContent = '<script>alert("xss")</script>'
    expect(div.innerHTML).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;')
  })
})