import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
            output: {
                entryFileNames: 'assets/social-hub-[name].js',
                chunkFileNames: 'assets/social-hub-[name].js',
                assetFileNames: 'assets/social-hub-[name].[ext]'
            }
        }
    },
    server: {
        port: 3000
    }
});
