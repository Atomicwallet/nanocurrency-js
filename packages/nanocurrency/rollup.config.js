import { readFileSync } from 'fs';
import * as path from 'path';

import autoExternal from 'rollup-plugin-auto-external';
import typescript from 'rollup-plugin-typescript2';
import resolve from 'rollup-plugin-node-resolve';
import replace from 'rollup-plugin-replace';
import commonjs from 'rollup-plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import license from 'rollup-plugin-license';

import pkg from './package.json';

const ENV = process.env.NODE_ENV;

const WASM_PATH = path.join(__dirname, 'tmp/production.wasm');
const WASM = readFileSync(WASM_PATH);
const WASM_BASE64 = Buffer.from(WASM).toString('base64');
const WASM_PLACEHOLDER = '%%%WASM_BASE64%%%';
const LICENSE_BANNER = `
/*!
* nanocurrency-js v${pkg.version}: A toolkit for the Nano cryptocurrency.
* Copyright (c) <%= moment().format('YYYY') %> Marvin ROGER <dev at marvinroger dot fr>
* Licensed under GPL-3.0 (https://git.io/vAZsK)
*/
`.trim();

const outputs = [
  {
    name: 'NanoCurrency',
    file: 'dist/nanocurrency.umd.js',
    format: 'umd',
  },
  { file: pkg.main, format: 'cjs' },
  { file: pkg.module, format: 'es' },
];

const configs = outputs.map((output, index) => {
  const config = {
    input: 'src/index.ts',
    output,
    plugins: [
      replace({
        delimiters: ['', ''],
        values: {
          [WASM_PLACEHOLDER]: WASM_BASE64,
        },
      }),
      resolve(),
      commonjs(),
      typescript({
        useTsconfigDeclarationDir: true,
        tsconfigOverride: { compilerOptions: { declaration: index === 0 } }, // only generate definitions once, otherwise crash
      }),
    ],
  };

  if (ENV === 'production' && output.format === 'umd') config.plugins.push(terser());
  if (ENV === 'production' && output.format !== 'umd') config.plugins.push(autoExternal({}));
  if (ENV === 'production') {
    config.plugins.push(
      license({
        banner: LICENSE_BANNER,
      })
    );
  }

  return config;
});

export default configs;
