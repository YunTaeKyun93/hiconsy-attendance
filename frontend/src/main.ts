import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { ApiError, IP_NOT_ALLOWED, setGlobalHandlers } from './api/client'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify)

const auth = useAuthStore()
setGlobalHandlers({
  // 사용 중에 시간대가 끝나는 등으로 IP가 막히면 차단 화면으로
  blocked: () => {
    auth.access = 'blocked'
    auth.user = null
    void router.replace({ name: 'blocked' })
  },
  // 로그인 만료(JWT exp)
  unauthenticated: () => {
    auth.user = null
    void router.replace({ name: 'login' })
  },
})

// 화면 로딩 중 401·IP 차단은 위 핸들러가 이미 화면을 옮겼으므로 조용히 넘긴다.
app.config.errorHandler = (err) => {
  if (err instanceof ApiError && (err.status === 401 || err.code === IP_NOT_ALLOWED)) return
  console.error(err)
}

app.mount('#app')
