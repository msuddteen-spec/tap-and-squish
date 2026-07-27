import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png', 'sounds/*.mp3'],
      manifest: {
        name: 'Squishy Bread',
        short_name: 'Squishy Bread',
        description: 'Relaxing squishy bread tapping game',
        lang: 'th',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6e4c8',
        theme_color: '#d99a5b',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,mp3,txt}'],
        runtimeCaching: [
          {
            urlPattern: /\.(?:mp3)$/i,
            handler: 'CacheFirst',
            options: { cacheName: 'squishy-bread-audio', expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: /\.(?:png|ico|svg)$/i,
            handler: 'CacheFirst',
            options: { cacheName: 'squishy-bread-icons', expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
});
