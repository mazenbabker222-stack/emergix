import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

import { brand } from './src/config/brand';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    'PORT environment variable is required but was not provided.',
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    'BASE_PATH environment variable is required but was not provided.',
  );
}


/** Fills %BRAND_*% placeholders in index.html from src/config/brand.ts (single source of truth). */
function brandHtmlPlugin(): Plugin {
  const values: Record<string, string> = {
    BRAND_NAME: brand.name,
    BRAND_TAGLINE: brand.tagline,
    BRAND_DESCRIPTION: brand.description,
    BRAND_THEME_COLOR: brand.themeColor,
  };
  return {
    name: 'brand-html',
    transformIndexHtml(html) {
      return html.replace(/%(BRAND_[A-Z_]+)%/g, (match, key: string) => values[key] ?? match);
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    brandHtmlPlugin(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    // Local dev/e2e: forward /api to the API server (on Replit the platform router does this).
    proxy: { '/api': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:5000' } },
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    proxy: { '/api': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:5000' } },
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
