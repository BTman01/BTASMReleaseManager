import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api/official-server-status': {
            target: 'https://cdn2.arkdedicated.com',
            changeOrigin: true,
            secure: false,
            rewrite: () => '/asa/officialserverstatus.ini',
          },
        },
      },
      build: {
        outDir: 'src-tauri/frontend-dist',
        emptyOutDir: true,
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
        'process.env.CURSEFORGE_API_KEY': JSON.stringify('$2a$10$cYkgVmyCtsZr3Shz.hBrfO1f6kuXlNtqhPgNLE1vN8vqcpttpdLIi'),
      },
      resolve: {
        alias: {
          '@': '/src',
        }
      },
    };
});