// 사용자 4명과 공휴일 시드. 여러 번 실행해도 안전하다(이미 있으면 건너뜀).
import dataSource from '../database/data-source.js';
import { User } from '../database/entities/user.entity.js';
import { UserRole } from '../database/enums.js';
import { hashPassword } from '../common/password.js';
import { insertHolidaySeed } from '../holidays/holiday-seed.js';

const SEED_PASSWORD = 'password1234';

// DESIGN.md 1장
const USERS = [
  { loginId: 'lead', name: '리드', role: UserRole.LEAD, hiredAt: '2026-01-01' },
  { loginId: 'kim', name: '김근태', role: UserRole.MEMBER, hiredAt: '2026-01-01' },
  { loginId: 'yeon', name: '연차원', role: UserRole.MEMBER, hiredAt: '2026-01-15' },
  { loginId: 'lim', name: '임자율', role: UserRole.MEMBER, hiredAt: '2026-02-12' },
];

async function main() {
  await dataSource.initialize();
  try {
    const passwordHash = await hashPassword(SEED_PASSWORD);
    const result = await dataSource
      .createQueryBuilder()
      .insert()
      .into(User)
      .values(USERS.map((u) => ({ ...u, passwordHash })))
      .orIgnore()
      .returning(['loginId'])
      .execute();
    console.log(`사용자: ${result.raw.length}명 추가 (기존 계정은 건너뜀)`);

    const holidays = await insertHolidaySeed(dataSource.manager);
    console.log(
      holidays === 0
        ? '공휴일: 시드 파일이 비어 있어 건너뜀 (npm run sync:holidays로 채우세요)'
        : `공휴일: 시드 파일 ${holidays}건 반영 (기존 날짜는 건너뜀)`,
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
