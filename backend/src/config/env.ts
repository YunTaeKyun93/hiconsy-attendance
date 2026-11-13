import { existsSync } from 'node:fs';
import { join } from 'node:path';

// 루트 .env 하나를 docker-compose와 백엔드가 함께 쓴다.
// src/config 와 dist/config 모두 저장소 루트까지 세 단계 위다.
const ROOT_ENV = join(import.meta.dirname, '..', '..', '..', '.env');

if (existsSync(ROOT_ENV)) {
  process.loadEnvFile(ROOT_ENV);
}

function required(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`환경 변수 ${key}가 비어 있습니다. 루트 .env를 확인하세요.`);
  }
  return value;
}

function optional(key: string): string | undefined {
  const value = process.env[key];
  return value === undefined || value === '' ? undefined : value;
}

export const env = {
  db: {
    host: required('DB_HOST'),
    port: Number(required('DB_PORT')),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    name: required('DB_NAME'),
  },
  port: Number(optional('PORT') ?? 3000),
  nodeEnv: optional('NODE_ENV') ?? 'development',
  holidayApiKey: optional('HOLIDAY_API_KEY'),
  // 아래 값은 API 서버만 쓴다. 시드·동기화 CLI가 이 값 없이도 돌도록 읽을 때 검사한다.
  get labIps(): string {
    return required('LAB_IPS');
  },
  get jwtSecret(): string {
    return required('JWT_SECRET');
  },
  jwtExpiresHours: Number(optional('JWT_EXPIRES_HOURS') ?? 12),
} as const;
