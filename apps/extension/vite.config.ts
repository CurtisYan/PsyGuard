import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync, readdirSync } from 'fs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest',
      writeBundle() {
        // 复制 manifest.json
        copyFileSync('manifest.json', 'dist/manifest.json')
        
        // 创建 icons 目录并复制图标（如果存在）
        if (!existsSync('dist/icons')) {
          mkdirSync('dist/icons', { recursive: true })
        }
        
        // 如果有图标文件，复制它们
        if (existsSync('public/icons')) {
          const files = readdirSync('public/icons')
          files.forEach((file: string) => {
            copyFileSync(`public/icons/${file}`, `dist/icons/${file}`)
          })
        }
      }
    }
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
})
