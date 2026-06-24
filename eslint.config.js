import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        globalThis: 'readonly'
      }
    },
    rules: {
      'indent': ['warn', 2],
      'quotes': 'off',
      'semi': ['warn', 'always'],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-constant-condition': ['error', { checkLoops: false }],
      'prefer-const': 'warn'
    }
  }
];
