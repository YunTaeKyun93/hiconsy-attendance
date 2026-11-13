import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api, ApiError, IP_NOT_ALLOWED } from '@/api/client'
import type { Me } from '@/api/types'

/** unknown: 아직 확인 전 / ready: 접속 가능(로그인 여부는 user로) / blocked: 등록되지 않은 IP */
export type AccessState = 'unknown' | 'ready' | 'blocked'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<Me | null>(null)
  const access = ref<AccessState>('unknown')
  const isLead = computed(() => user.value?.role === 'LEAD')

  /** 앱 시작 시 접속 가능 여부와 로그인 상태를 함께 확인한다. IP 1단계 가드가 인증보다 먼저라 403이 먼저 온다. */
  async function check(): Promise<void> {
    try {
      user.value = await api<Me>('/auth/me', { skipAuthRedirect: true })
      access.value = 'ready'
    } catch (e) {
      user.value = null
      if (e instanceof ApiError && e.status === 403 && e.code === IP_NOT_ALLOWED) access.value = 'blocked'
      else if (e instanceof ApiError && e.status === 401) access.value = 'ready'
      else throw e
    }
  }

  async function login(loginId: string, password: string): Promise<void> {
    user.value = await api<Me>('/auth/login', { method: 'POST', body: { loginId, password }, skipAuthRedirect: true })
  }

  async function logout(): Promise<void> {
    await api<void>('/auth/logout', { method: 'POST' })
    user.value = null
  }

  return { user, access, isLead, check, login, logout }
})
