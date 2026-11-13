// npm run test:e2e(:force) 진입점. Windows에서도 환경 변수를 넘길 수 있게 Node로 실행한다.
import { spawnSync } from 'node:child_process'

const force = process.argv.includes('--force')
const result = spawnSync('npx', ['playwright', 'test'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, ...(force ? { E2E_FORCE_RESET: '1' } : {}) },
})
process.exit(result.status ?? 1)
