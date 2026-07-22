const eslint = require('@eslint/js');
const angular = require('angular-eslint');
const eslintConfigPrettier = require('eslint-config-prettier');
const typescriptEslint = require('typescript-eslint');

module.exports = typescriptEslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...typescriptEslint.configs.recommended,
      ...angular.configs.tsRecommended,
      eslintConfigPrettier,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@angular-eslint/no-output-native': 'off',
      '@angular-eslint/prefer-inject': 'off',
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
    },
  },
  {
    files: ['src/app/core/**/*.ts'],
    ignores: ['src/app/core/**/*.spec.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['@features/*'] }],
    },
  },
  {
    files: ['src/app/shared/**/*.ts'],
    ignores: ['src/app/shared/**/*.spec.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['@core/*', '@features/*'] }],
    },
  },
  {
    files: ['src/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    files: ['src/**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
      eslintConfigPrettier,
    ],
    rules: {
      '@angular-eslint/template/label-has-associated-control': 'off',
    },
  },
);
