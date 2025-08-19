import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true, // <--- THIS is the key
        environment: 'jsdom', // needed for React DOM APIs
        setupFiles: './src/setupTests.ts', // optional, for jest-dom
    },
});
