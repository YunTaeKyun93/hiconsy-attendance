import { describe, expect, it } from 'vitest';
import { RequestType } from '../database/enums.js';
import { classifyDay } from './day-type.js';
import { DayType } from './types.js';

const HOLIDAYS = new Set(['2026-12-25']);
const WEEKDAY = '2026-11-16'; // 월
const SATURDAY = '2026-11-14';
const HOLIDAY = '2026-12-25'; // 금

describe('classifyDay (DESIGN.md 3장)', () => {
  it('영업일', () => {
    expect(classifyDay(WEEKDAY, HOLIDAYS, null)).toBe(DayType.WORKDAY);
    expect(classifyDay(WEEKDAY, HOLIDAYS, RequestType.REMOTE)).toBe(DayType.REMOTE);
    expect(classifyDay(WEEKDAY, HOLIDAYS, RequestType.OFF)).toBe(DayType.HALF_OFF);
    expect(classifyDay(WEEKDAY, HOLIDAYS, RequestType.ANNUAL)).toBe(DayType.ANNUAL);
  });

  it('주말·공휴일', () => {
    expect(classifyDay(SATURDAY, HOLIDAYS, null)).toBe(DayType.NON_WORKDAY);
    expect(classifyDay(HOLIDAY, HOLIDAYS, null)).toBe(DayType.NON_WORKDAY);
    expect(classifyDay(SATURDAY, HOLIDAYS, RequestType.WEEKEND_WORK)).toBe(DayType.WEEKEND_WORK);
    expect(classifyDay(HOLIDAY, HOLIDAYS, RequestType.WEEKEND_WORK)).toBe(DayType.WEEKEND_WORK);
  });

  it('날짜와 맞지 않는 유형은 무시한다', () => {
    expect(classifyDay(WEEKDAY, HOLIDAYS, RequestType.WEEKEND_WORK)).toBe(DayType.WORKDAY);
    expect(classifyDay(SATURDAY, HOLIDAYS, RequestType.ANNUAL)).toBe(DayType.NON_WORKDAY);
  });
});
