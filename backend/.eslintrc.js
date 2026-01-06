module.exports = {
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Possible Errors
    'no-console': 'off', // We use Winston, but console.log for debugging is fine
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    
    // Best Practices
    'eqeqeq': ['error', 'always'],
    'no-return-await': 'error',
    'require-await': 'error',
    
    // Style (minimal - let Prettier handle most of this if you add it)
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'comma-dangle': ['error', 'always-multiline'],
  },
};
