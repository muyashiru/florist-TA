import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    watch: {
      ignored: ['**/server/**', '**/.wwebjs_auth/**', '**/.baileys_auth/**', '**/public/images/uploads/**']
    },
    middlewares: [
      {
        name: 'heic-mime-type',
        apply: 'serve',
        handler: (req, res, next) => {
          // Serve HEIC files with correct MIME type
          if (req.url && (req.url.includes('.jpg')  && req.url.includes('/images/produk/'))) {
            // Check if it's actually a HEIC file by checking magic bytes
            res.setHeader('Content-Type', 'image/heic');
          }
          next();
        }
      }
    ]
  }
})
