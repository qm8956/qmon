import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      // 外部化处理那些你不想打包进库的依赖
      external: ['vue', 'ant-design-vue', 'lodash-es'],
      output: {
        // 在 UMD 或 IIFE 构建模式下为这些外部化的依赖提供一个全局变量
        globals: {
          vue: 'Vue',
          'ant-design-vue': 'antdv',
          'lodash-es': '_'
        }
      }
    },
    lib: {
      entry: './hooks/index.ts',
      name: 'utils',
      fileName: 'index',
      formats: ['es', 'umd'],
    }
  }
})
