import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { networkInterfaces } from 'node:os'

export const API = 'http://localhost:5173/api'
export const PASSWORD = 'password1234'

/** 개발 모드 시계를 한국 시각으로 맞춘다. 예: setClock(request, '2026-11-16T09:30:00') */
export async function setClock(request: APIRequestContext, kst: string): Promise<void> {
  const res = await request.put(`${API}/dev/clock`, { data: { now: `${kst}+09:00` } })
  expect(res.ok(), '개발 모드 시계 API가 필요합니다(NODE_ENV=production 아님)').toBeTruthy()
}

/** 출퇴근·신청·특별 연차·이력을 비우고 시계를 실제 시각으로 */
export async function resetData(request: APIRequestContext): Promise<void> {
  const res = await request.post(`${API}/dev/reset`)
  expect(res.ok()).toBeTruthy()
}

export async function login(page: Page, loginId: string): Promise<void> {
  // 로그아웃 직후엔 이미 /login이다. 다시 이동하면 입력 도중 새로고침되어 값이 섞인다.
  if (!new URL(page.url(), 'http://x').pathname.endsWith('/login')) await page.goto('/login')
  // 아이디 칸 autofocus가 끝난 뒤 입력한다(먼저 입력하면 늦게 온 포커스가 비밀번호 입력을 가로챈다).
  const id = page.getByLabel('아이디', { exact: true })
  await expect(id).toBeFocused()
  await id.fill(loginId)
  await page.getByLabel('비밀번호', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: '로그인' }).click()
  await page.waitForURL('/')
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: '로그아웃' }).click()
  await page.waitForURL('/login')
}

/** 루프백이 아닌 내부망 IPv4. 이 주소로 접속하면 연구실 IP(LAB_IPS 기본 127.0.0.1, ::1)가 아니다. */
export function lanIp(): string | null {
  for (const list of Object.values(networkInterfaces())) {
    for (const a of list ?? []) {
      if (a.family === 'IPv4' && !a.internal) return a.address
    }
  }
  return null
}
