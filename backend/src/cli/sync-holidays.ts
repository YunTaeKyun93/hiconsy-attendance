// 공공데이터포털 한국천문연구원 특일 정보 API(getRestDeInfo)로 공휴일을 받아
// 시드 파일(backend/data/holidays.seed.json)을 갱신하고 DB에 upsert한다.
// 사용: npm run sync:holidays [-- 2026 2027]   (연도 생략 시 올해와 내년, Clock 기준 한국 날짜)
import { env } from '../config/env.js';
import { SystemClock } from '../clock/system-clock.js';
import { toSeoulDate } from '../common/date-time.js';
import { Holiday } from '../database/entities/holiday.entity.js';
import {
  HOLIDAY_SEED_PATH,
  readHolidaySeed,
  writeHolidaySeed,
  type HolidaySeedRow,
} from '../holidays/holiday-seed.js';

const ENDPOINT =
  'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo';

interface ApiItem {
  dateName: string;
  isHoliday: 'Y' | 'N';
  locdate: number;
}

interface ApiResponse {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { items?: { item?: ApiItem | ApiItem[] } | '' };
  };
}

function resolveYears(args: string[]): number[] {
  if (args.length > 0) {
    const years = args.map(Number);
    if (years.some((y) => !Number.isInteger(y) || y < 2000 || y > 2100)) {
      throw new Error(`연도 인자가 올바르지 않습니다: ${args.join(' ')}`);
    }
    return years;
  }
  const thisYear = Number(toSeoulDate(new SystemClock().now()).slice(0, 4));
  return [thisYear, thisYear + 1];
}

// 포털의 "Encoding" 키를 넣어도 이중 인코딩되지 않도록 한 번 풀어 둔다.
function normalizeKey(key: string): string {
  return key.includes('%') ? decodeURIComponent(key) : key;
}

async function fetchMonth(key: string, year: number, month: number): Promise<ApiItem[]> {
  const params = new URLSearchParams({
    serviceKey: key,
    solYear: String(year),
    solMonth: String(month).padStart(2, '0'),
    numOfRows: '100',
    _type: 'json',
  });
  const res = await fetch(`${ENDPOINT}?${params}`, { signal: AbortSignal.timeout(10_000) });
  const text = await res.text();

  let data: ApiResponse;
  try {
    data = JSON.parse(text) as ApiResponse;
  } catch {
    // 키 오류 등은 _type=json이어도 XML로 온다.
    throw new Error(`API 응답을 해석할 수 없습니다 (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }

  const header = data.response?.header;
  if (header?.resultCode !== '00') {
    throw new Error(`API 오류 ${header?.resultCode ?? '?'}: ${header?.resultMsg ?? text.slice(0, 300)}`);
  }

  const items = data.response?.body?.items;
  if (!items || !items.item) return [];
  return Array.isArray(items.item) ? items.item : [items.item];
}

function toRow(item: ApiItem): HolidaySeedRow {
  const s = String(item.locdate);
  return { date: `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`, name: item.dateName.trim() };
}

async function main() {
  if (!env.holidayApiKey) {
    console.log(
      [
        'HOLIDAY_API_KEY가 설정되지 않아 동기화를 건너뜁니다.',
        '1. 공공데이터포털에서 "한국천문연구원_특일 정보" 활용 신청 후 서비스 키를 받습니다.',
        '2. 루트 .env의 HOLIDAY_API_KEY에 키를 넣습니다.',
        '3. npm run sync:holidays를 다시 실행합니다.',
      ].join('\n'),
    );
    process.exitCode = 1;
    return;
  }

  const key = normalizeKey(env.holidayApiKey);
  const years = resolveYears(process.argv.slice(2));

  // 같은 날짜에 이름이 여러 개면 합친다.
  const fetched = new Map<string, string[]>();
  for (const year of years) {
    for (let month = 1; month <= 12; month++) {
      for (const item of await fetchMonth(key, year, month)) {
        if (item.isHoliday !== 'Y') continue;
        const row = toRow(item);
        const names = fetched.get(row.date) ?? [];
        if (!names.includes(row.name)) names.push(row.name);
        fetched.set(row.date, names);
      }
    }
    console.log(`${year}년 조회 완료`);
  }
  const rows: HolidaySeedRow[] = [...fetched].map(([date, names]) => ({ date, name: names.join(', ') }));

  // 시드 파일: 동기화한 연도는 새 결과로 바꾸고, 다른 연도는 그대로 둔다.
  const yearSet = new Set(years.map(String));
  const kept = (await readHolidaySeed()).filter((r) => !yearSet.has(r.date.slice(0, 4)));
  await writeHolidaySeed([...kept, ...rows]);
  console.log(`시드 파일 갱신: ${HOLIDAY_SEED_PATH} (${years.join(', ')}년 ${rows.length}건)`);

  // DB: upsert만 한다(행 삭제 없음).
  const { default: dataSource } = await import('../database/data-source.js');
  await dataSource.initialize();
  try {
    if (rows.length > 0) {
      await dataSource
        .createQueryBuilder()
        .insert()
        .into(Holiday)
        .values(rows)
        .orUpdate(['name'], ['date'])
        .execute();
    }
    console.log(`DB 반영: ${rows.length}건 upsert`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
