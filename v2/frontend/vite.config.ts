import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const cspDirectives = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",
  "base-uri 'self'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'strict-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace(
          '<head>',
          `<head>\n    <meta http-equiv="Content-Security-Policy" content="${cspDirectives}" />`
        );
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: process.env.BASE_URL || './',
    plugins: [react(), cspPlugin()],
    server: {
      port: parseInt(env.PORT || '5173'),
      strictPort: true,
    },
    build: {
      // ExcelJS is dynamically imported (FileUpload.tsx), so its ~1 MB chunk
      // (~295 kB gzipped) loads only when a user drops a file — never on
      // first paint. See docs/2026-05-03-vite-chunk-size-warning.md.
      chunkSizeWarningLimit: 1100,
    },
  };
});
