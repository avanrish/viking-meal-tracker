import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { cpSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const entries = {
  content: {
    input: resolve(__dirname, 'content/content.js'),
    fileName: 'content/content.js',
  },
  popup: {
    input: resolve(__dirname, 'popup/popup.js'),
    fileName: 'popup/popup.js',
  },
};

export default defineConfig(({ mode }) => {
  const entry = entries[mode];

  return {
    build: {
      rollupOptions: {
        input: entry.input,
        output: {
          format: 'iife',
          entryFileNames: entry.fileName,
        },
      },
      outDir: 'dist',
      emptyOutDir: mode === 'content',
    },
    plugins: mode === 'popup'
      ? [{
          name: 'copy-static',
          closeBundle() {
            cpSync('lib', 'dist/lib', { recursive: true });
            cpSync('content/content.css', 'dist/content/content.css');
            cpSync('popup/popup.html', 'dist/popup/popup.html');
            cpSync('popup/popup.css', 'dist/popup/popup.css');
            cpSync('assets', 'dist/assets', { recursive: true });
            cpSync('manifest.json', 'dist/manifest.json');
          },
        }]
      : [],
  };
});
