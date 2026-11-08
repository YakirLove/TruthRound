import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { localAI } from './server/ai'
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const middleware = localAI(
    env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY,
  )
  return {
    plugins: [
      react(),
      {
        name: 'truthround-local-ai',
        configureServer(server) {
          server.middlewares.use(middleware)
        },
        configurePreviewServer(server) {
          server.middlewares.use(middleware)
        },
      },
    ],
    server: { host: '127.0.0.1', port: 5183, strictPort: true },
    preview: { host: '127.0.0.1', port: 4183, strictPort: true },
  }
})
