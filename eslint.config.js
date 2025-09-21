import js from '@eslint/js'

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        chrome: 'readonly',
        browser: true,
        es2021: true,
        webextensions: true,
        jest: true,
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        navigator: 'readonly',
        URL: 'readonly'
      }
    },
    rules: {
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-unused-vars': 'error',
      'space-before-function-paren': ['error', 'always'],
      'comma-dangle': ['error', 'never']
    }
  }
]