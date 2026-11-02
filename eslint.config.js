// Linter único del repo (app móvil, backoffice y backend). Antes había directivas
// `eslint-disable` en el código pero ningún linter instalado: no apagaban nada.
// Correr con `npm run lint`. Las reglas arrancan como advertencias para poder
// ir limpiando de a poco sin frenar el trabajo; `no-explicit-any` es error
// porque el proyecto prohíbe `any` (ver CLAUDE.md).
const tseslint = require('typescript-eslint');
const reactHooks = require('eslint-plugin-react-hooks');

module.exports = tseslint.config(
  {
    ignores: [
      '**/node_modules/**', '.claude/**', '**/dist/**', '**/build/**', '.expo/**', 'android/**', 'public/**',
      'backoffice/dist/**', 'backend/dist/**', 'docs/**', 'tools/**', 'patches/**', 'scripts/**',
      '*.config.js', '**/*.config.js', 'babel.config.js', 'metro.config.js', 'index.js',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}', 'backoffice/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // React Native referencia imágenes/sonidos con require('./asset.png'): no hay alternativa con import.
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
