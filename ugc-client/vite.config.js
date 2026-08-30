import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        host: true, // listen on all interfaces (0.0.0.0) — required for a tunnel to reach this dev server
        allowedHosts: true, // accept the Host header a tunnel domain sends (Cloudflare/ngrok/localtunnel)
        proxy: {
            '/api': {
                target: 'http://localhost:80',
                changeOrigin: true
            }
        }
    }
});