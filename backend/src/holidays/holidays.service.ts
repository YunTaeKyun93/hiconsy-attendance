import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import type { DateStr } from '../common/date-time.js';
import { Holiday } from '../database/entities/holiday.entity.js';
import type { HolidaySet } from '../domain/types.js';

/** holidays 테이블만 읽는다. 요청 처리 중 외부 API를 부르지 않는다. */
@Injectable()
export class HolidaysService {
  constructor(
    @InjectRepository(Holiday) private readonly repo: Repository<Holiday>,
  ) {}

  /** 주어진 날짜 중 공휴일인 것만 담은 집합 */
  async setFor(dates: readonly DateStr[]): Promise<HolidaySet> {
    if (dates.length === 0) return new Set();
    const rows = await this.repo.find({
      select: { date: true },
      where: { date: In([...new Set(dates)]) },
    });
    return new Set(rows.map((r) => r.date));
  }
}
