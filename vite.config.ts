
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // FIX: Use API_KEY from environment variables and remove redundant definition, as per coding guidelines.
        'process.env.API_KEY': JSON.stringify(env.API_KEY),
        'process.env.CURSEFORGE_API_KEY': JSON.stringify('$2a$10$cYkgVmyCtsZr3Shz.hBrfO1f6kuXlNtqhPgNLE1vN8vqcpttpdLIi'),
      },
      resolve: {
        alias: {
          // Fix: `__dirname` is not available in ES modules. Use `import.meta.url` to get the current directory path.
          '@': fileURLToPath(new URL('.', import.meta.url)),
        }
      },
      // This is the key change to fix the dependency scan error.
      // We're telling Vite not to pre-bundle these packages because
      // they are provided by the importmap in index.html at runtime.
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