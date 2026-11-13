import { describe, expect, it } from 'vitest';
import { seoulToInstant } from '../common/date-time.js';
import {
  findUnrecordedDates,
  isInRange,
  isLate,
  judgeButtonCheckOut,
  judgeCheckIn,
  manualCheckOutRange,
} from './attendance-rules.js';
import { DayType } from './types.js';

const DAY = '2026-11-16';
const at = (time: string, date = DAY) => seoulToInstant(date, time);
const WINDOW = { start: '10:00:00', end: '15:00:00' };

describe('judgeCheckIn', () => {
  it('한국 07:00(UTC 전날 22:00) 출근은 그날 출근으로 허용되고 지각이 아니다', () => {
    const now = new Date('2026-11-15T22:00:00Z');
    expect(judgeCheckIn(DayType.WORKDAY, now)).toEqual({ ok: true });
    expect(isLate(DayType.WORKDAY, now)).toBe(false);
  });

  it('WORKDAY·REMOTE·HALF_OFF는 07:00부터', () => {
    for (const t of [DayType.WORKDAY, DayType.REMOTE, DayType.HALF_OFF]) {
      expect(judgeCheckIn(t, at('06:59:59'))).toEqual({ ok: false, reason: 'TOO_EARLY' });
      expect(judgeCheckIn(t, at('07:00:00'))).toEqual({ ok: true });
    }
  });

  it('ANNUAL·NON_WORKDAY는 출근 거부', () => {
    expect(judgeCheckIn(DayType.ANNUAL, at('09:00:00'))).toEqual({ ok: false, reason: 'ANNUAL' });
    expect(judgeCheckIn(DayType.NON_WORKDAY, at('09:00:00'))).toEqual({ ok: false, reason: 'NON_WORKDAY' });
  });

  it('WEEKEND_WORK는 신청 시간대 안(양 끝 포함)', () => {
    expect(judgeCheckIn(DayType.WEEKEND_WORK, at('09:59:59'), WINDOW)).toEqual({ ok: false, reason: 'OUTSIDE_WINDOW' });
    expect(judgeCheckIn(DayType.WEEKEND_WORK, at('10:00:00'), WINDOW)).toEqual({ ok: true });
    expect(judgeCheckIn(DayType.WEEKEND_WORK, at('15:00:00'), WINDOW)).toEqual({ ok: true });
    expect(judgeCheckIn(DayType.WEEKEND_WORK, at('15:00:01'), WINDOW)).toEqual({ ok: false, reason: 'OUTSIDE_WINDOW' });
    expect(judgeCheckIn(DayType.WEEKEND_WORK, at('10:00:00'))).toEqual({ ok: false, reason: 'MISSING_WINDOW' });
  });
});

describe('isLate (지각 경계)', () => {
  it('10:00:00은 정상, 10:00:01은 지각', () => {
    expect(isLate(DayType.WORKDAY, at('10:00:00'))).toBe(false);
    expect(isLate(DayType.WORKDAY, at('10:00:01'))).toBe(true);
    expect(isLate(DayType.REMOTE, at('10:00:01'))).toBe(true);
  });

  it('초 아래는 버린다: 10:00:00.999는 정상', () => {
    expect(isLate(DayType.WORKDAY, new Date(at('10:00:00').getTime() + 999))).toBe(false);
  });

  it('HALF_OFF·WEEKEND_WORK는 판정 없음', () => {
    expect(isLate(DayType.HALF_OFF, at('13:00:00'))).toBeNull();
    expect(isLate(DayType.WEEKEND_WORK, at('13:00:00'))).toBeNull();
  });
});

describe('judgeButtonCheckOut', () => {
  it('WORKDAY·REMOTE는 16:00부터', () => {
    for (const t of [DayType.WORKDAY, DayType.REMOTE]) {
      expect(judgeButtonCheckOut(t, at('15:59:59'))).toEqual({ ok: false, reason: 'TOO_EARLY' });
      expect(judgeButtonCheckOut(t, at('16:00:00'))).toEqual({ ok: true });
    }
  });

  it('HALF_OFF는 제한 없음', () => {
    expect(judgeButtonCheckOut(DayType.HALF_OFF, at('11:00:00'))).toEqual({ ok: true });
  });

  it('WEEKEND_WORK는 신청 시간대 안', () => {
    expect(judgeButtonCheckOut(DayType.WEEKEND_WORK, at('14:00:00'), WINDOW)).toEqual({ ok: true });
    expect(judgeButtonCheckOut(DayType.WEEKEND_WORK, at('15:00:01'), WINDOW)).toEqual({ ok: false, reason: 'OUTSIDE_WINDOW' });
  });
});

describe('manualCheckOutRange (미기록 퇴근 직접 입력)', () => {
  it('출근 이후 ~ 그날 23:59:59, 16:00 제한 없음', () => {
    const checkIn = at('09:00:00');
    const range = manualCheckOutRange(DayType.WORKDAY, DAY, checkIn);
    expect(range.max.toISOString()).toBe('2026-11-16T14:59:59.000Z');
    expect(isInRange(at('08:59:59'), range)).toBe(false);
    expect(isInRange(at('09:00:00'), range)).toBe(true);
    expect(isInRange(at('13:00:00'), range)).toBe(true);
    expect(isInRange(at('23:59:59'), range)).toBe(true);
    expect(isInRange(at('00:00:00', '2026-11-17'), range)).toBe(false);
  });

  it('WEEKEND_WORK는 출근 이후 ~ 신청 종료 시각', () => {
    const range = manualCheckOutRange(DayType.WEEKEND_WORK, '2026-11-14', at('10:30:00', '2026-11-14'), WINDOW);
    expect(isInRange(at('15:00:00', '2026-11-14'), range)).toBe(true);
    expect(isInRange(at('15:00:01', '2026-11-14'), range)).toBe(false);
  });
});

describe('findUnrecordedDates', () => {
  it('퇴근이 빈 과거 날짜만, 오늘은 제외', () => {
    const rows = [
      { workDate: '2026-11-13', checkOutAt: null },
      { workDate: '2026-11-12', checkOutAt: at('18:00:00', '2026-11-12') },
      { workDate: '2026-11-10', checkOutAt: null },
      { workDate: '2026-11-16', checkOutAt: null },
    ];
    expect(findUnrecordedDates(rows, '2026-11-16')).toEqual(['2026-11-10', '2026-11-13']);
  });
});
