const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/api'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  resolve: {
    alias: {
      // La lib del workspace es TS puro (solo existe src/index.ts, sin build a
      // JS publicado) y debe ir DENTRO del bundle: el alias fuerza la
      // resolucion de webpack a la fuente TS en lugar del symlink de
      // node_modules (cuyo package.json apunta a un src/index.js inexistente).
      '@kavana-viability-executive/viability-engine': join(
        __dirname,
        '../../libs/viability-engine/src/index.ts'
      ),
    },
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
      sourceMap: true,
      // Lista cerrada de externalDependencies SIN la lib del workspace: solo se
      // externalizan estas deps npm reales de la API y viability-engine se
      // bundlea dentro de main.js (con target node y externalDependencies 'all'
      // por defecto, la lib caia en la externalizacion y Render fallaba en
      // runtime con MODULE_NOT_FOUND).
      externalDependencies: [
        '@clerk/clerk-sdk-node',
        '@nestjs/common',
        '@nestjs/config',
        '@nestjs/core',
        '@nestjs/jwt',
        '@nestjs/mongoose',
        '@nestjs/passport',
        '@nestjs/platform-express',
        'axios',
        'class-transformer',
        'class-validator',
        'express',
        'js-yaml',
        'mongoose',
        'passport',
        'passport-jwt',
        'reflect-metadata',
        'rxjs',
        'svix',
        'tslib',
      ],
    }),
  ],
};