import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      build: {
        outDir: 'dist',  // Changed from 'src-tauri/frontend-dist'
        emptyOutDir: true,
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.API_KEY),
        'process.env.CURSEFORGE_API_KEY': JSON.stringify('$2a$10$cYkgVmyCtsZr3Shz.hBrfO1f6kuXlNtqhPgNLE1vN8vqcpttpdLIi'),
      },
      resolve: {
        alias: {
          '@': '/src',
        }
      },
      optimizeDeps: {
        exclude: [
          '@google/genai',
          '@tauri-apps/api',
          '@tauri-apps/plugin-dialog',
          '@tauri-apps/plugin-fs',
          '@tauri-apps/plugin-shell',
          '@tauri-apps/plugin-autostart',
          '@tauri-apps/plugin-notification',
          '@tauri-apps/plugin-updater',
          '@tauri-apps/plugin-process',
        ],
      },
    };
});
