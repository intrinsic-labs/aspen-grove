import boundaries from 'eslint-plugin-boundaries';
import typescriptParser from '@typescript-eslint/parser';
import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin';

/** @type {import('eslint-plugin-boundaries').Config} */
export default [
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'android/**',
      'ios/**',
      'assets/**',
      'babel.config.js',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslintPlugin,
      boundaries,
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
      },
      // Define architectural layers as elements
      'boundaries/elements': [
        {
          type: 'domain',
          pattern: 'src/domain/**',
          mode: 'full',
        },
        {
          type: 'application',
          pattern: 'src/application/**',
          mode: 'full',
        },
        {
          type: 'infrastructure',
          pattern: 'src/infrastructure/**',
          mode: 'full',
        },
        {
          type: 'interface',
          pattern: 'src/interface/**',
          mode: 'full',
        },
        {
          // expo-router app directory is part of interface layer
          type: 'interface',
          pattern: 'src/app/**',
          mode: 'full',
        },
      ],
      // Ignore external dependencies
      'boundaries/ignore': ['node_modules/**'],
    },
    rules: {
      // Spread recommended rules
      ...boundaries.configs.recommended.rules,

      // Clean Architecture dependency rules
      'boundaries/element-types': [
        'error',
        {
          // Default: disallow all cross-layer imports
          default: 'disallow',
          rules: [
            // Domain layer: can only import from itself (pure, no external dependencies)
            {
              from: 'domain',
              allow: ['domain'],
            },
            {
              from: 'domain',
              disallow: ['application', 'infrastructure', 'interface'],
              message:
                'Domain layer must not depend on any other layer. It should be pure and self-contained.',
            },

            // Application layer: can import from Domain and itself
            {
              from: 'application',
              allow: ['domain', 'application'],
            },
            {
              from: 'application',
              disallow: ['infrastructure', 'interface'],
              message:
                'Application layer can only depend on Domain. Use dependency injection for infrastructure concerns.',
            },

            // Infrastructure layer: can import from Domain, Application, and itself
            {
              from: 'infrastructure',
              allow: ['domain', 'application', 'infrastructure'],
            },
            {
              from: 'infrastructure',
              disallow: ['interface'],
              message: 'Infrastructure layer cannot depend on Interface layer.',
            },

            // Interface layer: can import from all layers (outermost layer)
            {
              from: 'interface',
              allow: ['domain', 'application', 'infrastructure', 'interface'],
            },
          ],
        },
      ],

      // Prevent imports that bypass the layer structure
      'boundaries/no-unknown': ['error'],

      // Allow files to import from within their own element
      'boundaries/no-private': 'off',
    },
  },
];
