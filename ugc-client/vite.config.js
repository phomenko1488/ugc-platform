import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        host: true, // слушать на всех интерфейсах (0.0.0.0)
        allowedHosts: true, // разрешить подключение с любых туннельных доменов
        proxy: {
            '/api': {
                target: 'http://localhost:80',
                changeOrigin: true
            }
        }
    }
});