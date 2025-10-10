import { defineConfig } from 'vite';
import { resolve } from 'path';

const isGhDeploy = process.env.DEPLOY_TARGET === 'gh-pages';
const ghOutDir = resolve(__dirname, '../analytics/screenpop-ts');

export default defineConfig({
  root: '.',
  base: isGhDeploy ? '/phone-call-intake-tracker/analytics/screenpop-ts/' : '/',
  build: {
    outDir: isGhDeploy ? ghOutDir : 'dist',
    emptyOutDir: true
  },
  server: {
    port: 5175,
    open: true
  }
});
