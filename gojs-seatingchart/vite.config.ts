import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import ui from '@nuxt/ui/vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';

// https://vite.dev/config/
export default defineConfig({
  base: './', // Path relative to project root, not website root
  build: {
    outDir: 'build',
    sourcemap: true
  },
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    ui({
      ui: {
        colors: {
          neutral: 'zinc',
          primary: 'sky',
          secondary: 'teal',
          success: 'emerald'
        }
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
});
