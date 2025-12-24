import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), '');
    return {
        base: process.env.BASE_URL || './',
        plugins: [react()],
        server: {
            port: parseInt(env.PORT || '5173'),
            strictPort: true,
        },
    };
});
