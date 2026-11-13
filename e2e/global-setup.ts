import { request } from '@playwright/test'
import { countTestRows } from './db'
import { API } from './helpers'

/**
 * E2E는 테스트 데이터 초기화 API로 출퇴근·신청·특별 연차·이력을 지운다.
 * CLAUDE.md 규칙대로 지우기 전에 행을 확인하고, 이미 데이터가 있으면 멈춘다(npm run test:e2e:force로만 진행).
 */
export default async function globalSetup(): Promise<void> {
  const counts = await countTestRows()
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  if (total > 0 && process.env.E2E_FORCE_RESET !== '1') {
    throw new Error(
      `DB에 기존 데이터가 있어 E2E를 멈춥니다: ${JSON.stringify(counts)}\n` +
        'E2E는 출퇴근·신청·특별 연차·이력을 모두 지웁니다. 지워도 되면 npm run test:e2e:force로 실행하세요.',
    )
  }
  const ctx = await request.newContext()
  const res = await ctx.post(`${API}/dev/reset`)
  if (!res.ok()) throw new Error(`테스트 데이터 초기화 실패(${res.status()}). 개발 모드로 앱이 떠 있어야 합니다.`)
  await ctx.dispose()
  // 정리(teardown)는 여기까지 온 경우에만 한다. 위에서 멈췄을 때 기존 데이터를 지우지 않도록.
  process.env.E2E_SETUP_DONE = '1'
}
