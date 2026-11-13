import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    /** 로그인 필요 */
    auth?: boolean
    /** 리드만 */
    lead?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    { path: '/blocked', name: 'blocked', component: () => import('@/views/BlockedView.vue') },
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { auth: true } },
    { path: '/requests', name: 'requests', component: () => import('@/views/RequestsView.vue'), meta: { auth: true } },
    {
      path: '/lead/board',
      name: 'board',
      component: () => import('@/views/LeadBoardView.vue'),
      meta: { auth: true, lead: true },
    },
    {
      path: '/lead/irregular',
      name: 'irregular',
      component: () => import('@/views/LeadIrregularView.vue'),
      meta: { auth: true, lead: true },
    },
    {
      path: '/lead/approvals',
      name: 'approvals',
      component: () => import('@/views/LeadApprovalsView.vue'),
      meta: { auth: true, lead: true },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  // 앱 시작 시 한 번: 접속 가능 여부(IP)와 로그인 상태 확인
  if (auth.access === 'unknown') await auth.check()

  if (auth.access === 'blocked') return to.name === 'blocked' ? true : { name: 'blocked' }
  if (to.name === 'blocked') return { name: 'home' }
  if (to.meta.auth && !auth.user) return { name: 'login' }
  if (to.name === 'login' && auth.user) return { name: 'home' }
  if (to.meta.lead && !auth.isLead) return { name: 'home' }
  return true
})

export default router
