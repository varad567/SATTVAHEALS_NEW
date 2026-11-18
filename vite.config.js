/**
 * FILE: vite.config.js
 * PURPOSE: Build + test config. Tests run in jsdom (see src/test/setup.js).
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', setupFiles: './src/test/setup.js', globals: true },
});
