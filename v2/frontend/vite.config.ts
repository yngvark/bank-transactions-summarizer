import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/categories': 'http://localhost:3000',
      '/ai': 'http://localhost:3000',
      '/files': 'http://localhost:3000',
    },
  },
});
