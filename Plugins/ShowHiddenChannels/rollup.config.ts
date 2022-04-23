import { defineConfig, Plugin } from 'rollup';

import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import esbuild from 'rollup-plugin-esbuild';

import { writeFileSync } from 'fs';
import { basename } from 'path';

const name = basename(process.cwd());

export default defineConfig({
   input: 'src/index.tsx',
   output: [
      {
         file: `dist/${name
            }.js`,
         format: 'cjs',
         strict: false
      },
   ],
   plugins: [
      nodeResolve(),
      commonjs(),
      esbuild({ minify: true, target: 'ES2019' }),
      createPluginJson(),
   ]
});

function createPluginJson(options = {}): Plugin {
   return {
      name: 'plugin-info',
      writeBundle: () => {
         const info = require('./package.json');
         const data = {
            'name': name,
            'description': info?.description ?? 'No description was provided.',
            'author': info?.author?.name ?? 'Unknown',
            'version': info?.version ?? '1.0.0'
         };

         writeFileSync(`dist/${name}.json`, JSON.stringify(data, null, '\t'));
      }
   };
};