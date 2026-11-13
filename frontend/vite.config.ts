import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import vuetify from 'vite-plugin-vuetify'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true }), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // 재택 IP 테스트: localhost 대신 내부망 IP로 접속할 수 있게 모든 인터페이스에서 받는다.
    host: true,
    port: 5173,
    proxy: {
      // xfwd: 실제 클라이언트 IP를 X-Forwarded-For로 넘긴다. 백엔드는 trust proxy = 'loopback'으로 읽는다.
      '/api': { target: 'http://localhost:3000', xfwd: true },
    },
  },
})
