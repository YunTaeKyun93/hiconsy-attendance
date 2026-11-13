// npm run test:e2e(:force) / npm run screenshots 진입점. Windows에서도 환경 변수를 넘길 수 있게 Node로 실행한다.
import { spawnSync } from 'node:child_process'

const force = process.argv.includes('--force')
const screenshots = process.argv.includes('--screenshots')
// README 스크린샷은 저장소 파일을 바꾸므로 평소 E2E에서는 빼고, npm run screenshots로만 찍는다.
const filter = screenshots ? ['--grep', '@screenshots'] : ['--grep-invert', '@screenshots']
const result = spawnSync('npx', ['playwright', 'test', ...filter], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, ...(force ? { E2E_FORCE_RESET: '1' } : {}) },
})
process.exit(result.status ?? 1)
