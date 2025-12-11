import react from '@vitejs/plugin-react-swc';
import tailwindcss from 'tailwindcss';
import { defineConfig, loadEnv } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const allowedHosts = env.VITE_ALLOWED_HOSTS 
    ? env.VITE_ALLOWED_HOSTS.split(',') 
    : ["wezd.io.vn", "auth.wezd.io.vn", "pay.wezd.io.vn"];

  return {
    plugins: [react()],
    css: {
      postcss: {
        plugins: [tailwindcss],
      },
    },
    server: {
      allowedHosts,
      proxy: {
        '/auth': {
          target: env.VITE_DEV_AUTH_PROXY || 'http://localhost:8081',
          changeOrigin: true,
          secure: false,
        },
        '/ws': {
          target: env.VITE_DEV_WS_PROXY || 'ws://localhost:8082',
          changeOrigin: true,
          ws: true,
          secure: false,
        },
      },
    },
    define: {
      global: 'globalThis',
    },
    optimizeDeps: {
      include: ['sockjs-client']
    }
  };
})
    