import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonthsClamped,
  dayOfWeek,
  isValidDateStr,
  isValidMonthStr,
  isValidTimeStr,
  isWeekend,
  seoulToInstant,
  timeToSeconds,
  toSeoulDate,
  toSeoulDateTime,
  toSeoulTime,
  yearMonth,
} from './date-time.js';

describe('테스트 환경', () => {
  it('OS 시간대가 서울이 아닌 상태에서 돈다', () => {
    expect(process.env.TZ).toBe('America/Los_Angeles');
    expect(new Date('2026-07-01T00:00:00Z').getTimezoneOffset()).not.toBe(-540);
  });
});

describe('toSeoulDate / toSeoulTime', () => {
  it('한국 07:00(UTC 전날 22:00)은 그날 날짜다', () => {
    const instant = new Date('2026-11-15T22:00:00Z');
    expect(toSeoulDate(instant)).toBe('2026-11-16');
    expect(toSeoulTime(instant)).toBe('07:00:00');
  });

  it('한국 자정 직전과 직후', () => {
    expect(toSeoulDate(new Date('2026-11-16T14:59:59Z'))).toBe('2026-11-16');
    expect(toSeoulDate(new Date('2026-11-16T15:00:00Z'))).toBe('2026-11-17');
    expect(toSeoulTime(new Date('2026-11-16T15:00:00Z'))).toBe('00:00:00');
  });

  it('초 아래는 버린다', () => {
    expect(toSeoulTime(new Date('2026-11-16T01:00:00.999Z'))).toBe('10:00:00');
  });
});

describe('seoulToInstant (서울 날짜+시각 → 실제 순간)', () => {
  it('신청 기한 17:00:00', () => {
    expect(seoulToInstant('2026-09-23', '17:00:00').toISOString()).toBe('2026-09-23T08:00:00.000Z');
  });

  it('직접 입력 퇴근 23:59:59', () => {
    expect(seoulToInstant('2026-11-16', '23:59:59').toISOString()).toBe('2026-11-16T14:59:59.000Z');
  });

  it('한국 이른 아침은 UTC 전날이다', () => {
    expect(seoulToInstant('2026-11-16', '07:00:00').toISOString()).toBe('2026-11-15T22:00:00.000Z');
  });

  it('왕복 변환', () => {
    const instant = seoulToInstant('2027-01-01', '00:00:00');
    expect(toSeoulDate(instant)).toBe('2027-01-01');
    expect(toSeoulTime(instant)).toBe('00:00:00');
  });

  it('잘못된 입력은 거부', () => {
    expect(() => seoulToInstant('2026-02-30', '09:00:00')).toThrow(RangeError);
    expect(() => seoulToInstant('2026-11-16', '24:00:00')).toThrow(RangeError);
    expect(() => seoulToInstant('2026-11-16', '9:00')).toThrow(RangeError);
  });
});

describe('addDays', () => {
  it('월·연도 경계', () => {
    expect(addDays('2026-11-14', 30)).toBe('2026-12-14');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('addMonthsClamped', () => {
  it('1/31 + 1개월 = 2/28', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
  });

  it('윤년 2월은 29일', () => {
    expect(addMonthsClamped('2028-01-31', 1)).toBe('2028-02-29');
  });

  it('원래 날짜 기준으로 계산한다(말일 보정이 다음 달로 이어지지 않음)', () => {
    expect(addMonthsClamped('2026-01-31', 2)).toBe('2026-03-31');
    expect(addMonthsClamped('2026-01-31', 3)).toBe('2026-04-30');
  });

  it('연도 경계', () => {
    expect(addMonthsClamped('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonthsClamped('2026-02-12', 11)).toBe('2027-01-12');
  });
});

describe('요일·월', () => {
  it('dayOfWeek / isWeekend', () => {
    expect(dayOfWeek('2026-11-16')).toBe(1); // 월
    expect(isWeekend('2026-11-14')).toBe(true); // 토
    expect(isWeekend('2026-11-15')).toBe(true); // 일
    expect(isWeekend('2026-11-16')).toBe(false);
  });

  it('yearMonth', () => {
    expect(yearMonth('2026-12-01')).toBe('2026-12');
  });
});

describe('timeToSeconds / 형식 검사', () => {
  it('timeToSeconds', () => {
    expect(timeToSeconds('00:00:00')).toBe(0);
    expect(timeToSeconds('10:00:01')).toBe(36001);
    expect(timeToSeconds('23:59:59')).toBe(86399);
  });

  it('isValidDateStr', () => {
    expect(isValidDateStr('2026-02-28')).toBe(true);
    expect(isValidDateStr('2026-02-29')).toBe(false);
    expect(isValidDateStr('2026-2-1')).toBe(false);
    expect(isValidDateStr('2026-13-01')).toBe(false);
  });

  it('isValidTimeStr', () => {
    expect(isValidTimeStr('07:00:00')).toBe(true);
    expect(isValidTimeStr('24:00:00')).toBe(false);
    expect(isValidTimeStr('07:00')).toBe(false);
  });
});

describe('isValidMonthStr / toSeoulDateTime', () => {
  it('YYYY-MM만 허용', () => {
    expect(isValidMonthStr('2026-11')).toBe(true);
    expect(isValidMonthStr('2026-13')).toBe(false);
    expect(isValidMonthStr('2026-1')).toBe(false);
  });
  it('KST 날짜와 시각', () => {
    expect(toSeoulDateTime(new Date('2026-11-15T15:30:00Z'))).toBe('2026-11-16 00:30:00');
  });
});
