import { describe, expect, it } from 'vitest';
import { seoulToInstant } from '../common/date-time.js';
import { DayType } from './types.js';
import { isEarlyLeave, lunchDeductionSeconds, workSeconds } from './work-time.js';

const DAY = '2026-11-16';
const at = (time: string) => seoulToInstant(DAY, time);
const hm = (h: number, m = 0) => h * 3600 + m * 60;

describe('workSeconds (DESIGN.md 4-2 예시 표)', () => {
  it.each([
    ['09:00:00', '18:00:00', hm(8)],
    ['12:00:00', '16:00:00', hm(4)],
    ['08:00:00', '12:00:00', hm(4)],
    ['11:31:00', '20:00:00', hm(8, 29)],
    ['11:29:00', '20:00:00', hm(7, 31)],
  ])('%s ~ %s', (checkIn, checkOut, expected) => {
    expect(workSeconds(at(checkIn), at(checkOut))).toBe(expected);
  });

  it('퇴근이 출근보다 이르면 오류', () => {
    expect(() => workSeconds(at('10:00:00'), at('09:00:00'))).toThrow(RangeError);
  });
});

describe('lunchDeductionSeconds (초 단위 경계)', () => {
  it('출근 11:30:00·퇴근 12:30:00이면 차감', () => {
    expect(lunchDeductionSeconds(at('11:30:00'), at('12:30:00'))).toBe(3600);
  });

  it('출근 11:30:30이면 차감 없음', () => {
    expect(lunchDeductionSeconds(at('11:30:30'), at('18:00:00'))).toBe(0);
  });

  it('퇴근 12:29:59이면 차감 없음', () => {
    expect(lunchDeductionSeconds(at('09:00:00'), at('12:29:59'))).toBe(0);
  });
});

describe('isEarlyLeave (유형별)', () => {
  it('WORKDAY·REMOTE는 8시간 미만', () => {
    for (const t of [DayType.WORKDAY, DayType.REMOTE]) {
      expect(isEarlyLeave(t, hm(8) - 1)).toBe(true);
      expect(isEarlyLeave(t, hm(8))).toBe(false);
    }
  });

  it('HALF_OFF는 4시간 미만', () => {
    expect(isEarlyLeave(DayType.HALF_OFF, hm(4) - 1)).toBe(true);
    expect(isEarlyLeave(DayType.HALF_OFF, hm(4))).toBe(false);
  });

  it('WEEKEND_WORK는 판정 없음', () => {
    expect(isEarlyLeave(DayType.WEEKEND_WORK, hm(1))).toBeNull();
  });

  it('직접 입력 13:00 퇴근(09:00 출근)은 조퇴로 판정', () => {
    expect(isEarlyLeave(DayType.WORKDAY, workSeconds(at('09:00:00'), at('13:00:00')))).toBe(true);
  });
});
