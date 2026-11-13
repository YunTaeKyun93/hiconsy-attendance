import { expect, test } from '@playwright/test'
import { lanIp, login, logout, setClock } from './helpers'

// 핵심 흐름: 로그인 → 출근 → 퇴근 → 신청 → 리드 승인 → IP 차단 화면
// 날짜는 시드 공휴일과 겹치지 않는 2026-11-16(월). 시각은 개발 모드 시계 API로 맞춘다.
test.describe.configure({ mode: 'serial' })

test('팀원 출퇴근과 신청, 리드 승인', async ({ page, request }) => {
  await setClock(request, '2026-11-16T09:30:00')

  await test.step('로그인', async () => {
    await login(page, 'kim')
    await expect(page.getByText('아직 출근 전입니다')).toBeVisible()
  })

  await test.step('출근(09:30, 지각 아님)', async () => {
    await page.getByRole('button', { name: '출근하기' }).click()
    await expect(page.getByText('출근을 등록했습니다')).toBeVisible()
    await expect(page.getByText('근무 중', { exact: true })).toBeVisible()
    await expect(page.getByText(/^09:30:\d\d$/)).toBeVisible()
    await expect(page.getByText('지각', { exact: true })).toHaveCount(0)
  })

  await test.step('퇴근(18:00, 점심 1시간 차감)', async () => {
    await setClock(request, '2026-11-16T18:00:00')
    await page.reload()
    await page.getByRole('button', { name: '퇴근하기' }).click()
    await expect(page.getByText('퇴근을 등록했습니다')).toBeVisible()
    await expect(page.getByText('오늘 근무를 마쳤습니다')).toBeVisible()
    // 09:30:0x ~ 18:00:0x − 점심 1시간 (시계가 흐르므로 29분 또는 30분)
    await expect(page.getByText(/^7시간 (29|30)분$/)).toBeVisible()
  })

  await test.step('연차 신청(대기)', async () => {
    await page.getByRole('link', { name: '신청' }).click()
    await page.getByLabel('대상일').fill('2026-11-18')
    await page.getByLabel('사유').fill('E2E 개인 사정')
    await page.getByRole('button', { name: '신청', exact: true }).click()
    await expect(page.getByText('대기 상태로 접수되었습니다')).toBeVisible()
    await expect(page.getByRole('row', { name: /2026-11-18.*연차.*대기/ })).toBeVisible()
    await logout(page)
  })

  await test.step('리드 승인', async () => {
    await login(page, 'lead')
    await page.getByRole('link', { name: '승인' }).click()
    const row = page.getByRole('row', { name: /김근태.*2026-11-18/ })
    await row.getByRole('button', { name: '승인' }).click()
    await expect(page.getByText('승인했습니다')).toBeVisible()
    await expect(page.getByText('대기 중인 신청이 없습니다.')).toBeVisible()
    await logout(page)
  })

  await test.step('팀원 화면에서 승인 확인', async () => {
    await login(page, 'kim')
    await page.getByRole('link', { name: '신청' }).click()
    await expect(page.getByRole('row', { name: /2026-11-18.*연차.*승인/ })).toBeVisible()
  })
})

test('연구실 IP가 아니면 차단 화면', async ({ browser }) => {
  const ip = lanIp()
  test.skip(!ip, '루프백이 아닌 내부망 IPv4가 없어 건너뜀')
  // 같은 앱을 내부망 IP로 연다. LAB_IPS(기본 127.0.0.1, ::1)에 없고 승인된 재택 신청도 없으므로 1단계에서 막힌다.
  const page = await browser.newPage()
  await page.goto(`http://${ip}:5173/`)
  await expect(page).toHaveURL(/\/blocked$/)
  await expect(page.getByText('등록된 IP가 아닙니다')).toBeVisible()
  await page.close()
})
