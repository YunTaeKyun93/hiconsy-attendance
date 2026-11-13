import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { EntityManager } from 'typeorm';
import { Holiday } from '../database/entities/holiday.entity.js';

export interface HolidaySeedRow {
  date: string;
  name: string;
}

// backend/data/holidays.seed.json. src/holidays 와 dist/holidays 모두 두 단계 위가 backend다.
export const HOLIDAY_SEED_PATH = join(import.meta.dirname, '..', '..', 'data', 'holidays.seed.json');

export async function readHolidaySeed(): Promise<HolidaySeedRow[]> {
  return JSON.parse(await readFile(HOLIDAY_SEED_PATH, 'utf8')) as HolidaySeedRow[];
}

export async function writeHolidaySeed(rows: HolidaySeedRow[]): Promise<void> {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  await writeFile(HOLIDAY_SEED_PATH, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
}

/** 시드 파일의 공휴일을 넣는다. 이미 있는 날짜는 건너뛴다. 넣은 시드 행 수를 돌려준다. */
export async function insertHolidaySeed(manager: EntityManager): Promise<number> {
  const rows = await readHolidaySeed();
  if (rows.length === 0) return 0;
  await manager.createQueryBuilder().insert().into(Holiday).values(rows).orIgnore().execute();
  return rows.length;
}
