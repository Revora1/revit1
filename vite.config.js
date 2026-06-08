import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
    ],
    server: {
        host: '0.0.0.0',
        port: 3000
    },
    build: {
        outDir: 'dist',
        rollupOptions: {
            output: {
                manualChunks: function (id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('firebase')) {
                            return 'firebase-vendor';
                        }
                        if (id.includes('react') ||
                            id.includes('motion') ||
                            id.includes('lucide')) {
                            return 'vendor';
                        }
                    }
                }
            }
        },
        chunkSizeWarningLimit: 1000,
    }
});
