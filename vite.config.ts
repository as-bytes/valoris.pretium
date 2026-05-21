import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const devApiTarget = process.env.DEV_API_TARGET ?? 'http://127.0.0.1:8788';

  return {
    plugins: [vue()],
    server: {
      proxy: mode === 'development' ? {
        '/api': {
          target: devApiTarget,
          changeOrigin: true
        }
      } : undefined
    }
  };
});
