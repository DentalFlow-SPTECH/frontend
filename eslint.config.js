import globals from 'globals';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['node_modules/**', 'dist/**', 'playwright-report/**', 'test-results/**'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } }, globals: { ...globals.browser, ...globals.node } },
    plugins: { react, 'react-hooks': hooks },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      'no-unreachable': 'error',
      'no-constant-condition': 'error',
      'react/jsx-uses-vars': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    files: ['src/feature/*/model/*.js'],
    rules: {
      'no-restricted-globals': ['error', 'document', 'window', 'localStorage'],
      'no-restricted-imports': ['error', { patterns: [{ group: ['react', 'react-dom', 'react-dom/**', 'react-router-dom', '**/view/**', '**/view_model/**', '**/repository/**', '**/data/**'], message: 'Model deve ser independente da interface e da persistência.' }] }],
    },
  },
  {
    files: ['src/feature/*/view_model/*.js'],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: false } } },
    rules: {
      'no-restricted-globals': ['error', 'document', 'window', 'localStorage'],
      'no-restricted-imports': ['error', { patterns: [{ group: ['**/view/**', '**/*.module.css', '**/data/local/**'], message: 'ViewModel deve expor estado e comandos sem acessar a apresentação ou o armazenamento local.' }] }],
    },
  },
  {
    files: ['src/feature/*/repository/*.js'],
    rules: {
      'no-restricted-globals': ['error', 'document', 'window', 'localStorage'],
      'no-restricted-imports': ['error', { patterns: [{ group: ['react', 'react-dom', 'react-dom/**', 'react-router-dom', '**/view/**', '**/view_model/**'], message: 'Repository recebe a sessão de dados e permanece independente da interface.' }] }],
    },
  },
  {
    files: ['src/feature/*/view/*.jsx'],
    rules: {
      'no-restricted-globals': ['error', 'localStorage'],
      'no-restricted-imports': ['error', { patterns: [{ group: ['**/repository/**', '**/data/**', '**/demo/store*', '**/app/app_provider*'], message: 'View deve obter dados e comandos pelo ViewModel.' }] }],
    },
  },
];
