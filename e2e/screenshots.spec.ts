import { expect, request as apiRequest, test, type Browser, type Page } from '@playwright/test'
import { API, PASSWORD, login, setClock } from './helpers'

// README 주요 화면 스크린샷 → docs/screenshots/*.png  (npm run screenshots)
// 데이터는 API로 만들고, 시각은 개발 모드 시계로 2026-11-16(월) 오전에 맞춘다.
const OUT = 'docs/screenshots'

async function api(loginId: string) {
  const ctx = await apiRequest.newContext({ baseURL: API + '/' })
  const res = await ctx.post('auth/login', { data: { loginId, password: PASSWORD } })
  expect(res.ok()).toBeTruthy()
  const call = async (path: string, data?: unknown) => {
    const r = await ctx.post(path, data === undefined ? {} : { data })
    expect(r.ok(), `${loginId} ${path} → ${r.status()} ${await r.text()}`).toBeTruthy()
  }
  return { call, dispose: () => ctx.dispose() }
}

async function seed() {
  const clock = await apiRequest.newContext()
  const at = (kst: string) => setClock(clock, kst)

  await at('2026-11-12T09:05:00')
  const kim = await api('kim')
  await kim.call('attendance/check-in')
  await at('2026-11-12T18:10:00')
  await kim.call('attendance/check-out')
  await at('2026-11-13T10:12:00')
  await kim.call('attendance/check-in') // 지각, 퇴근 안 찍음 → 다음 영업일에 미기록

  await at('2026-11-13T09:00:00')
  const yeon = await api('yeon')
  await yeon.call('attendance/check-in')
  await at('2026-11-13T18:30:00')
  await yeon.call('attendance/check-out')

  await at('2026-11-13T10:00:00')
  const lim = await api('lim')
  const lead = await api('lead')
  await kim.call('requests', {
    type: 'REMOTE',
    targetDate: '2026-11-18',
    reason: '집중 작업',
    allowedIp: '192.168.0.5',
    startTime: '09:00:00',
    endTime: '18:00:00',
  })
  await kim.call('requests', { type: 'ANNUAL', targetDate: '2026-11-20', reason: '개인 사정' })
  await lim.call('requests', { type: 'ANNUAL', targetDate: '2026-11-17', reason: '병원 진료' })
  await lead.call('requests/3/approve')
  await lead.call('annual-grants', { userId: 4, days: 2, reason: '야간 실험 지원' })

  await at('2026-11-16T09:20:00')
  const lim2 = await api('lim')
  await lim2.call('attendance/check-in')
  await at('2026-11-16T10:05:00')
  const yeon2 = await api('yeon')
  await yeon2.call('attendance/check-in') // 지각

  await at('2026-11-16T11:00:00')
  for (const c of [kim, yeon, lim, lead, lim2, yeon2]) await c.dispose()
  await clock.dispose()
}

async function open(browser: Browser, theme: 'light' | 'dark'): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 }, locale: 'ko-KR', colorScheme: theme })
  await ctx.addInitScript((t) => localStorage.setItem('theme', t), theme)
  return ctx.newPage()
}

const shot = async (page: Page, name: string) => {
  await page.waitForTimeout(500)
  // 개발 서버의 Vue DevTools 떠 있는 버튼은 문서 이미지에서 숨긴다.
  await page.addStyleTag({ content: '#__vue-devtools-container__ { display: none !important; }' })
  await page.screenshot({ path: `${OUT}/${name}.png` })
}

test('README 스크린샷 @screenshots', async ({ browser }) => {
  await seed()

  const p = await open(browser, 'light')
  await p.goto('/login')
  await expect(p.getByRole('button', { name: '로그인' })).toBeVisible()
  await shot(p, '01-login')

  await login(p, 'lim')
  await expect(p.getByText('근무 중', { exact: true })).toBeVisible()
  await shot(p, '02-home')

  await p.getByRole('button', { name: '로그아웃' }).click()
  await login(p, 'kim')
  await expect(p.getByText('퇴근이 기록되지 않은 날이 있습니다').first()).toBeVisible()
  await shot(p, '03-unrecorded')
  await p.keyboard.press('Escape')

  await p.getByRole('link', { name: '신청' }).click()
  await expect(p.getByText('내 신청')).toBeVisible()
  await shot(p, '04-requests')

  await p.getByRole('button', { name: '로그아웃' }).click()
  await login(p, 'lead')
  await p.getByRole('link', { name: '팀 보드' }).click()
  await expect(p.getByText('임자율')).toBeVisible()
  await shot(p, '05-board')

  await p.getByRole('link', { name: '승인' }).click()
  await expect(p.getByRole('row', { name: /김근태.*2026-11-18/ })).toBeVisible()
  await shot(p, '06-approvals')

  await p.getByRole('link', { name: '월별 정산' }).click()
  await p.waitForURL('**/settlement')
  await p.getByRole('row', { name: /^김근태 \d/ }).click()
  await expect(p.getByText('김근태 · 2026-11 일별 상세')).toBeVisible()
  await shot(p, '07-settlement')
  await p.context().close()

  const d = await open(browser, 'dark')
  await login(d, 'lim')
  await expect(d.getByText('근무 중', { exact: true })).toBeVisible()
  await shot(d, '08-home-dark')
  await d.context().close()
})
