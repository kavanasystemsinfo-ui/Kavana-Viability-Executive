/**
 * Configuración flat de ESLint 9+/10 para el monorepo kavana-viability-executive.
 *
 * Migración desde eslintrc (legacy) a flat config, necesaria porque ESLint 10
 * eliminó el formato eslintrc. Se mantienen las reglas del estándar anterior:
 * no-explicit-any, no-unused-vars, consistent-type-imports y prettier.
 *
 * Decisión documentada: no se incluye el preset type-checked de typescript-eslint
 * porque con el código existente (que usa unknown/any en puntos concretos)
 * generaría ruido; se conservan las reglas clave del estándar del proyecto.
 * Tampoco se incluyen presets específicos de Angular (el config eslintrc
 * anterior tampoco los tenía); si se necesitan reglas de templates, se añadirán
 * con el metapaquete 'angular-eslint' en una tarea posterior.
 */
const tseslint = require('typescript-eslint');
const prettier = require('eslint-config-prettier');
const prettierPlugin = require('eslint-plugin-prettier');
const globals = require('globals');

module.exports = tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '.nx/**',
      '**/*.d.ts',
      // Archivos de configuración JS del monorepo (webpack, jest, eslint)
      '**/*.config.js',
      '**/*.config.cjs',
      '**/jest.config.js',
    ],
  },
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      // La web es isomórfica (SSR): node + browser comparten bundle.
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2021,
      },
      // Decisión documentada: lint sintáctico (preset recommended de
      // typescript-eslint) sin projectService, porque los tsconfigs del
      // monorepo por references hacen que el project service marque specs y
      // archivos de config como "not found".
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'prettier/prettier': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // TS cubre la detección de variables indefinidas con más precisión que
      // no-undef; esta regla solo añade falsos positivos con types de Jest.
      'no-undef': 'off',
    },
  },
  {
    // Los specs usan `any` con libertad para crear mocks.
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  prettier,
);