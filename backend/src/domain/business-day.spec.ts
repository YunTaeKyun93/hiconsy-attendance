import { describe, expect, it } from 'vitest';
import { seoulToInstant } from '../common/date-time.js';
import { RequestType } from '../database/enums.js';
import {
  canApprove,
  canCancel,
  isBusinessDay,
  isValidTargetDate,
  isWithinDeadline,
  previousBusinessDay,
  requestDeadline,
} from './business-day.js';

// DB 대신 테스트에서 직접 넣는 공휴일
const HOLIDAYS = new Set([
  '2026-09-24', // 추석
  '2026-09-25', // 추석
  '2026-09-26', // 추석(토)
  '2026-10-03', // 개천절(토)
  '2026-10-05', // 대체공휴일
  '2027-01-01', // 1월1일(금)
]);

describe('isBusinessDay', () => {
  it('주말과 공휴일은 영업일이 아니다', () => {
    expect(isBusinessDay('2026-09-23', HOLIDAYS)).toBe(true);
    expect(isBusinessDay('2026-09-24', HOLIDAYS)).toBe(false);
    expect(isBusinessDay('2026-09-27', HOLIDAYS)).toBe(false); // 일
    expect(isBusinessDay('2026-10-05', HOLIDAYS)).toBe(false);
  });
});

describe('신청 기한 (직전 영업일 17:00:00)', () => {
  it('2026-09-28(월)은 추석 연휴와 주말을 건너 2026-09-23(수) 17:00:00까지', () => {
    expect(previousBusinessDay('2026-09-28', HOLIDAYS)).toBe('2026-09-23');
    expect(requestDeadline('2026-09-28', HOLIDAYS).toISOString()).toBe('2026-09-23T08:00:00.000Z');
  });

  it('2027-01-04(월)은 1/1 공휴일·주말·연도 경계를 건너 2026-12-31 17:00:00까지', () => {
    expect(previousBusinessDay('2027-01-04', HOLIDAYS)).toBe('2026-12-31');
    expect(requestDeadline('2027-01-04', HOLIDAYS).toISOString()).toBe('2026-12-31T08:00:00.000Z');
  });

  it('평일 대상일은 전날 17:00', () => {
    expect(previousBusinessDay('2026-11-18', HOLIDAYS)).toBe('2026-11-17');
  });

  it('17:00:00은 기한 안, 17:00:01은 초과 (초 아래 버림)', () => {
    const at = (time: string) => seoulToInstant('2026-09-23', time);
    expect(isWithinDeadline(at('16:59:59'), '2026-09-28', HOLIDAYS)).toBe(true);
    expect(isWithinDeadline(at('17:00:00'), '2026-09-28', HOLIDAYS)).toBe(true);
    expect(isWithinDeadline(new Date(at('17:00:00').getTime() + 999), '2026-09-28', HOLIDAYS)).toBe(true);
    expect(isWithinDeadline(at('17:00:01'), '2026-09-28', HOLIDAYS)).toBe(false);
  });

  it('공휴일 목록이 없으면 결과가 달라진다(목록을 실제로 쓰는지)', () => {
    expect(previousBusinessDay('2026-09-28', new Set())).toBe('2026-09-25');
  });
});

describe('isValidTargetDate', () => {
  it('ANNUAL·REMOTE·OFF는 영업일만', () => {
    for (const type of [RequestType.ANNUAL, RequestType.REMOTE, RequestType.OFF]) {
      expect(isValidTargetDate(type, '2026-09-23', HOLIDAYS)).toBe(true);
      expect(isValidTargetDate(type, '2026-09-24', HOLIDAYS)).toBe(false);
      expect(isValidTargetDate(type, '2026-11-14', HOLIDAYS)).toBe(false);
    }
  });

  it('WEEKEND_WORK는 주말·공휴일만', () => {
    expect(isValidTargetDate(RequestType.WEEKEND_WORK, '2026-11-14', HOLIDAYS)).toBe(true);
    expect(isValidTargetDate(RequestType.WEEKEND_WORK, '2026-09-24', HOLIDAYS)).toBe(true);
    expect(isValidTargetDate(RequestType.WEEKEND_WORK, '2026-11-16', HOLIDAYS)).toBe(false);
  });
});

describe('canCancel (대상일 전날까지)', () => {
  it('전날 23:59:59까지 가능, 당일 0시부터 불가', () => {
    expect(canCancel(seoulToInstant('2026-11-17', '23:59:59'), '2026-11-18')).toBe(true);
    expect(canCancel(seoulToInstant('2026-11-18', '00:00:00'), '2026-11-18')).toBe(false);
  });
});

describe('canApprove (대상일 0시 KST 전까지)', () => {
  it('대상일 전날 23:59:59는 승인 가능', () => {
    expect(canApprove(seoulToInstant('2026-11-17', '23:59:59'), '2026-11-18')).toBe(true);
  });

  it('대상일 0시(KST)부터는 승인 불가 (UTC로는 아직 전날)', () => {
    const midnightKst = new Date('2026-11-17T15:00:00Z');
    expect(canApprove(midnightKst, '2026-11-18')).toBe(false);
  });

  it('대상일이 지난 뒤에도 불가', () => {
    expect(canApprove(seoulToInstant('2026-11-20', '09:00:00'), '2026-11-18')).toBe(false);
  });
});
