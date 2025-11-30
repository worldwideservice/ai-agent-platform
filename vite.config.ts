import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: env.VITE_API_URL || 'http://localhost:3001',
            changeOrigin: true,
            secure: false,
          },
        },
        // Fix HMR issues with iCloud Drive
        watch: {
          usePolling: true,
          interval: 1000,
        },
        hmr: {
          overlay: true,
          timeout: 5000,
        },
      },
      // Also handle preview mode
      preview: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react({ fastRefresh: false })],
      define: {
        // Only expose safe environment variables to client
        'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'http://localhost:3001'),
        'import.meta.env.VITE_APP_NAME': JSON.stringify(env.VITE_APP_NAME || 'AI Agent Platform'),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        sourcemap: mode === 'development',
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              charts: ['recharts'],
              i18n: ['i18next', 'react-i18next'],
            },
          },
        },
      },
    };
});
