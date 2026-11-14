import { expect, test, type Browser } from '@playwright/test'
import { lanIp, login, logout, PASSWORD, setClock } from './helpers'

// 재택 흐름: 연구실(localhost)에서 재택 신청 → 리드 승인 → 내부망 IP로 접속해 출근 → 다른 팀원 거부 → 시간대 밖 차단.
// localhost는 연구실 IP(LAB_IPS 기본 127.0.0.1, ::1)이고, 내부망 IP는 연구실이 아니므로 집 접속 역할을 한다.
// 재택일은 2026-11-17(화). 신청 기한(직전 영업일 17:00:00)을 통과하도록 전날 시계로 신청한다.
const REMOTE_DAY = '2026-11-17'

async function lanPage(browser: Browser, ip: string) {
  const context = await browser.newContext({
    baseURL: `http://${ip}:5173`,
    locale: 'ko-KR',
    viewport: { width: 1366, height: 860 },
  })
  return { context, page: await context.newPage() }
}

test('재택 승인 IP로 본인만 시간대 안에 접속', async ({ page, request, browser }) => {
  const ip = lanIp()
  test.skip(!ip, '루프백이 아닌 내부망 IPv4가 없어 건너뜀')
  if (!ip) return

  await test.step('연구실에서 재택 신청(전날 10:00)', async () => {
    await setClock(request, '2026-11-16T10:00:00')
    await login(page, 'kim')
    await page.getByRole('link', { name: '신청' }).click()
    await page.locator('.v-select').filter({ hasText: '유형' }).click()
    await page.getByRole('option', { name: '재택' }).click()
    await page.getByLabel('대상일').fill(REMOTE_DAY)
    await page.getByLabel('접속 IP').fill(ip)
    // 시간대는 넉넉히 08:00 ~ 20:00
    await page.getByLabel('시작').fill('0800')
    await page.getByLabel('종료').fill('2000')
    await page.getByLabel('사유').fill('E2E 재택')
    await page.getByRole('button', { name: '신청', exact: true }).click()
    await expect(page.getByText('대기 상태로 접수되었습니다')).toBeVisible()
    await expect(page.getByRole('row', { name: new RegExp(`${REMOTE_DAY}.*재택.*대기`) })).toBeVisible()
    await logout(page)
  })

  await test.step('리드 승인', async () => {
    await login(page, 'lead')
    await page.getByRole('link', { name: '승인' }).click()
    const row = page.getByRole('row', { name: new RegExp(`김근태.*${REMOTE_DAY}`) })
    await row.getByRole('button', { name: '승인' }).click()
    await expect(page.getByText('승인했습니다')).toBeVisible()
    await logout(page)
  })

  // 재택일 근무 시간
  await setClock(request, `${REMOTE_DAY}T10:00:00`)
  const kim = await lanPage(browser, ip)
  const lim = await lanPage(browser, ip)

  try {
    await test.step('내부망 IP에서 kim 로그인·출근', async () => {
      await login(kim.page, 'kim')
      await expect(kim.page.getByText('아직 출근 전입니다')).toBeVisible()
      await kim.page.getByRole('button', { name: '출근하기' }).click()
      await expect(kim.page.getByText('출근을 등록했습니다')).toBeVisible()
      await expect(kim.page.getByText('근무 중', { exact: true })).toBeVisible()
    })

    await test.step('같은 주소에서 lim 로그인은 거부', async () => {
      // 1단계는 kim의 승인 신청으로 통과하지만, 2단계에서 본인 신청이 아니라 토큰 없이 403
      await lim.page.goto('/login')
      await lim.page.getByLabel('아이디', { exact: true }).fill('lim')
      await lim.page.getByLabel('비밀번호', { exact: true }).fill(PASSWORD)
      await lim.page.getByRole('button', { name: '로그인' }).click()
      await expect(lim.page).toHaveURL(/\/blocked$/)
      await expect(lim.page.getByText('등록된 IP가 아닙니다')).toBeVisible()
    })

    await test.step('시간대 밖(20:00:01)이면 kim도 차단', async () => {
      await setClock(request, `${REMOTE_DAY}T20:00:01`)
      await kim.page.reload()
      await expect(kim.page).toHaveURL(/\/blocked$/)
      await expect(kim.page.getByText('등록된 IP가 아닙니다')).toBeVisible()
    })
  } finally {
    await kim.context.close()
    await lim.context.close()
  }
})
