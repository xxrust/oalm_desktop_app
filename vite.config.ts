import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  
  // 确保构建后的资源使用相对路径
  base: './',
  
  // 配置服务器端口，避免端口冲突
  server: {
    port: 5173,
    strictPort: false, // 设置为false允许端口自动切换
  },
  
  // 构建配置
  build: {
    // 输出目录
    outDir: 'dist',
    // 生成静态资源的存放路径
    assetsDir: 'assets',
    // 小于此阈值的导入或引用资源将内联为base64编码
    assetsInlineLimit: 4096
  }
})
