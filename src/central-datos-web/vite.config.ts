import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { designSystemIconsVitePlugin } from '@tuvsud/design-system/vite';

export default defineConfig({
  plugins: [
    react(),
    designSystemIconsVitePlugin({ minify: true }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5113',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
