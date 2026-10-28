import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O backend não tem CORS: em desenvolvimento e na prévia, /dentalflow-api é repassado para a API.
const apiTarget = process.env.DENTAL_FLOW_API ?? 'http://localhost:8080';
const proxy = { '/dentalflow-api': { target: apiTarget, changeOrigin: true } };

export default defineConfig({ plugins: [react()], base: '/', build: { outDir: 'dist' }, server: { proxy }, preview: { proxy } });
