export default [
  {
    files: [
      'src/core/**/*.js',
      'src/application/**/*.js',
      'src/domain/**/*.js',
      'src/ui/**/*.js',
      'tools/**/*.js',
      'tools/**/*.mjs',
      '*.js',
    ],
    ignores: [
      'src/legacy-es/**',
      'src/legacy/**',
      'dist/**',
      'node_modules/**',
      'src/ui/input/inline-handler-sanitizer.js',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        globalThis: 'readonly',
        console: 'readonly',
        navigator: 'readonly',
        MutationObserver: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        MouseEvent: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        getIcon: 'readonly',
        t: 'readonly',
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_|^o$',
          varsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-undef': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-var': 'warn',
      'prefer-const': 'warn',
    },
  },
];

