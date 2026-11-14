import { describe, expect, it } from 'vitest';
import { seoulToInstant, toSeoulTime } from '../common/date-time.js';
import { summarizeAttendance } from './attendance-summary.js';
import { normalCheckOutFrom } from './normal-check-out.js';
import { DayType } from './types.js';

const DAY = '2026-11-16';
const at = (time: string) => seoulToInstant(DAY, time);
const from = (dayType: DayType, checkIn: string) => {
  const r = normalCheckOutFrom(dayType, at(checkIn));
  return r && toSeoulTime(r);
};

describe('normalCheckOutFrom (정상 퇴근 가능 시각)', () => {
  it.each([
    // 경계 사례
    [DayType.WORKDAY, '09:59:34', '18:59:34'], // 8시간 + 점심 1시간
    [DayType.WORKDAY, '11:31:00', '19:31:00'], // 11:30 넘어 출근하면 점심 차감 없음
    [DayType.HALF_OFF, '08:00:00', '13:00:00'], // 12:00에 4시간이지만 12:30~13:00은 점심 차감으로 조퇴
    // 그 밖의 사례
    [DayType.WORKDAY, '09:00:00', '18:00:00'],
    [DayType.WORKDAY, '11:30:00', '20:30:00'], // 11:30:00은 점심 차감 대상
    [DayType.WORKDAY, '07:00:00', '16:00:00'], // 8시간+점심은 16:00, 16:00 제한과 같음
    [DayType.REMOTE, '09:59:34', '18:59:34'], // 재택도 일반과 같음
    [DayType.HALF_OFF, '07:00:00', '11:00:00'], // 12:30 퇴근도 5시간 30분 − 점심 = 4시간 30분이라 정상
    [DayType.HALF_OFF, '07:30:00', '11:30:00'], // 12:30 퇴근이 딱 4시간 → 정상
    [DayType.HALF_OFF, '07:30:01', '12:30:01'], // 12:30:00 퇴근은 3시간 59분 59초 → 조퇴
    [DayType.HALF_OFF, '08:30:00', '13:30:00'],
    [DayType.HALF_OFF, '09:00:00', '14:00:00'],
    [DayType.HALF_OFF, '11:31:00', '15:31:00'], // 점심 차감 없음, 16:00 제한 없음
  ])('%s %s 출근 → %s', (dayType, checkIn, expected) => {
    expect(from(dayType, checkIn)).toBe(expected);
  });

  it('초 아래는 버린다', () => {
    const r = normalCheckOutFrom(DayType.WORKDAY, new Date(at('09:59:34').getTime() + 700));
    expect(r && toSeoulTime(r)).toBe('18:59:34');
  });

  it('주말 근무·연차·휴무는 표시하지 않음(null)', () => {
    expect(from(DayType.WEEKEND_WORK, '09:00:00')).toBeNull();
    expect(from(DayType.ANNUAL, '09:00:00')).toBeNull();
    expect(from(DayType.NON_WORKDAY, '09:00:00')).toBeNull();
  });

  it('그날 안에 8시간을 채울 수 없으면 null', () => {
    expect(from(DayType.WORKDAY, '16:00:01')).toBeNull();
    expect(from(DayType.WORKDAY, '15:59:59')).toBe('23:59:59');
  });

  // 기존 판정(summarizeAttendance)과 어긋나지 않는지: 돌려준 시각부터 그날 끝까지 1분 간격으로 조퇴 없음, 1초 전은 조퇴
  it.each([
    [DayType.WORKDAY, '09:59:34'],
    [DayType.WORKDAY, '11:31:00'],
    [DayType.REMOTE, '10:20:00'],
    [DayType.HALF_OFF, '07:00:00'],
    [DayType.HALF_OFF, '08:00:00'],
    [DayType.HALF_OFF, '10:00:00'],
    [DayType.HALF_OFF, '11:31:00'],
  ])('%s %s: 기존 조퇴 판정과 일치', (dayType, checkIn) => {
    const checkInAt = at(checkIn);
    const t = normalCheckOutFrom(dayType, checkInAt);
    if (!t) throw new Error('null');
    const early = (out: Date) => summarizeAttendance(dayType, checkInAt, out).earlyLeave;
    for (let ms = t.getTime(); ms <= at('23:59:59').getTime(); ms += 60_000) expect(early(new Date(ms))).toBe(false);
    if (dayType === DayType.HALF_OFF) expect(early(new Date(t.getTime() - 1000))).toBe(true);
  });
});
