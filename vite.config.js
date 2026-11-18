/**
 * FILE: vite.config.js
 * PURPOSE: Build + test config. Tests run in jsdom (see src/test/setup.js).
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // NEXT_PUBLIC_* too: Vercel's Supabase integration names the (public) URL + anon key that way. Never put secrets in either prefix.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  test: { environment: 'jsdom', setupFiles: './src/test/setup.js', globals: true, include: ['src/**/*.test.*', 'api/**/*.test.*', 'supabase/**/*.test.*'] },
});
