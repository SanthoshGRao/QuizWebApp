import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/quizzes.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'quiz-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
            },
          },
        ],
      },
      manifest: {
        name: 'Quiz App',
        short_name: 'QuizApp',
        description: 'Quiz and LMS Application',
        theme_color: '#1e293b',
        background_color: '#0f172a',
        display: 'standalone',
      },
    }),
  ],
  server: {
    port: 5173,
  },
});

