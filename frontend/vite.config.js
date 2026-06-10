import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  return {
    base: mode === 'production' ? '/SMART-HOSTEL-ELECTRICITY-USAGE-MONITORING/' : '/',
    build: {
      outDir: 'dist',
    }
  };
});
