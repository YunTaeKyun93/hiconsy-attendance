import { existsSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'

const TEST_TABLES = ['attendances', 'requests', 'annual_grants', 'activity_logs'] as const

/** 테스트가 지우게 될 테이블의 현재 행 수(루트 .env의 DB 설정 사용) */
export async function countTestRows(): Promise<Record<string, number>> {
  const envFile = join(import.meta.dirname, '..', '.env')
  if (existsSync(envFile)) process.loadEnvFile(envFile)
  const client = new pg.Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })
  await client.connect()
  try {
    const counts: Record<string, number> = {}
    for (const t of TEST_TABLES) {
      const r = await client.query<{ n: string }>(`SELECT count(*) AS n FROM ${t}`)
      counts[t] = Number(r.rows[0]?.n ?? 0)
    }
    return counts
  } finally {
    await client.end()
  }
}
