/**
 * Vite Configuration
 * --------------------------------------------------------
 * - React + TailwindCSS setup
 * - Environment variable injection
 * - Path aliases
 * - Optimized build chunking
 */

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  /**
   * Load environment variables based on the current mode
   * (development / production / etc.)
   *
   * Empty prefix ('') allows loading all env vars explicitly.
   */
  const env = loadEnv(mode, process.cwd(), '');

  return {
    /* ----------------------------------
     * Plugins
     * ---------------------------------- */
    plugins: [
      react(),        // Enables React Fast Refresh & JSX
      tailwindcss(),  // TailwindCSS Vite integration
    ],

    /* ----------------------------------
     * Global Constants
     * ----------------------------------
     * Injects environment variables at build time.
     * Using JSON.stringify ensures safe string replacement.
     */
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
        env.VITE_SUPABASE_ANON_KEY
      ),
    },

    /* ----------------------------------
     * Module Resolution
     * ---------------------------------- */
    resolve: {
      alias: {
        /**
         * Allows imports like:
         * import Button from '@/components/Button'
         */
        '@': path.resolve(__dirname, '.'),
      },
    },

    /* ----------------------------------
     * Dev Server Configuration
     * ---------------------------------- */
    server: {
      /**
       * HMR is conditionally disabled for AI Studio environments.
       * File watching is disabled to prevent UI flickering
       * during automated agent edits.
       *
       * ⚠️ Do not modify unless necessary.
       */
      hmr: process.env.DISABLE_HMR !== 'true',
    },

    /* ----------------------------------
     * Build Optimization
     * ---------------------------------- */
    build: {
      /**
       * Increase warning limit for large chunks
       * (useful for dashboards & analytics-heavy apps)
       */
      chunkSizeWarningLimit: 1000,

      rollupOptions: {
        output: {
          /**
           * Manual chunk splitting for better caching
           * and faster initial page loads.
           */
          manualChunks: {
            'vendor-react': [
              'react',
              'react-dom',
              'react-router-dom',
            ],
            'vendor-ui': [
              'motion',
              'lucide-react',
              'recharts',
            ],
            'vendor-supabase': [
              '@supabase/supabase-js',
            ],
            'vendor-utils': [
              'clsx',
              'tailwind-merge',
            ],
          },
        },
      },
    },
  };
});