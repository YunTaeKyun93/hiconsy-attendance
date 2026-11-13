import { request } from '@playwright/test'
import { API } from './helpers'

/** 테스트가 만든 데이터를 지우고 시계를 실제 시각으로 되돌린다(준비 단계를 통과한 경우만). */
export default async function globalTeardown(): Promise<void> {
  // 준비 단계가 기존 데이터 때문에 멈췄으면 아무것도 지우지 않는다.
  if (process.env.E2E_SETUP_DONE !== '1') return
  const ctx = await request.newContext()
  await ctx.post(`${API}/dev/reset`)
  await ctx.dispose()
}
