import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function cspPlugin(): Plugin {
  return {
    name: 'strict-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const csp = [
          "default-src 'none'",
          "script-src 'self'",
          "style-src 'self'",
          "img-src 'self'",
          "font-src 'self'",
          "connect-src 'self'",
          "form-action 'none'",
          "base-uri 'self'",
          "frame-ancestors 'none'",
        ].join('; ');
        return html.replace(
          '<head>',
          `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`
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
  };
});
