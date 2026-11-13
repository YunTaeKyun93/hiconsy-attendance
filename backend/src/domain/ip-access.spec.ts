import { seoulToInstant } from '../common/date-time.js';
import {
  evaluateStage1,
  evaluateStage2,
  isWithinAccessWindow,
  normalizeIp,
  parseLabIps,
  type AccessGrant,
} from './ip-access.js';

describe('normalizeIp', () => {
  it.each([
    ['::ffff:192.168.0.5', '192.168.0.5'],
    ['::FFFF:10.0.0.1', '10.0.0.1'],
    ['192.168.0.5', '192.168.0.5'],
    [' 192.168.0.5 ', '192.168.0.5'],
    ['::1', '::1'],
    ['FE80::1', 'fe80::1'],
    // IPv4가 아닌 꼬리는 IPv4-mapped가 아니므로 그대로 둔다
    ['::ffff:abcd', '::ffff:abcd'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeIp(input)).toBe(expected);
  });
});

describe('parseLabIps', () => {
  it('쉼표로 나누고 공백·빈 항목을 버리며 정규화한다', () => {
    expect([...parseLabIps(' 127.0.0.1, ::1,,::ffff:10.0.0.7 ')]).toEqual(['127.0.0.1', '::1', '10.0.0.7']);
  });
  it('비어 있으면 빈 집합', () => {
    expect(parseLabIps(undefined).size).toBe(0);
    expect(parseLabIps('').size).toBe(0);
  });
});

const grant = (userId: number, over: Partial<AccessGrant> = {}): AccessGrant => ({
  userId,
  targetDate: '2026-11-16',
  startTime: '09:00:00',
  endTime: '18:00:00',
  ...over,
});
const at = (date: string, time: string) => seoulToInstant(date, time);

describe('isWithinAccessWindow', () => {
  it.each([
    ['08:59:59', false],
    ['09:00:00', true],
    ['12:00:00', true],
    ['18:00:00', true],
    ['18:00:01', false],
  ])('2026-11-16 %s → %s (양 끝 포함)', (time, expected) => {
    expect(isWithinAccessWindow(at('2026-11-16', time), grant(1))).toBe(expected);
  });

  it('초 아래는 버린다: 18:00:00.999는 시간대 안', () => {
    const now = new Date(at('2026-11-16', '18:00:00').getTime() + 999);
    expect(isWithinAccessWindow(now, grant(1))).toBe(true);
  });

  it('대상일이 아니면 시각이 맞아도 밖', () => {
    expect(isWithinAccessWindow(at('2026-11-17', '12:00:00'), grant(1))).toBe(false);
  });

  it('한국 날짜 기준: UTC로는 전날인 KST 오전도 대상일로 본다', () => {
    // 2026-11-16 08:30 KST = 2026-11-15 23:30 UTC
    expect(isWithinAccessWindow(at('2026-11-16', '08:30:00'), grant(1, { startTime: '08:00:00' }))).toBe(true);
  });
});

describe('evaluateStage1', () => {
  const lab = parseLabIps('127.0.0.1,10.0.0.7');
  const noon = at('2026-11-16', '12:00:00');

  it('연구실 IP면 신청 없이 통과', () => {
    expect(evaluateStage1('10.0.0.7', lab, [], noon)).toEqual({ lab: true });
  });

  it('::ffff: 접두사를 떼고 연구실 IP와 비교', () => {
    expect(evaluateStage1('::ffff:127.0.0.1', lab, [], noon)).toEqual({ lab: true });
  });

  it('연구실 밖이고 시간대 안 신청이 없으면 거절', () => {
    expect(evaluateStage1('192.168.0.5', lab, [], noon)).toBeNull();
    expect(evaluateStage1('192.168.0.5', lab, [grant(2)], at('2026-11-16', '19:00:00'))).toBeNull();
  });

  it('시간대 안 신청이 있으면 통과하고 신청자 목록을 넘긴다(중복 제거)', () => {
    const grants = [grant(2), grant(3), grant(2), grant(4, { startTime: '13:00:00' })];
    expect(evaluateStage1('192.168.0.5', lab, grants, noon)).toEqual({ lab: false, ownerIds: [2, 3] });
  });
});

describe('evaluateStage2', () => {
  it('연구실이면 누구든 통과', () => {
    expect(evaluateStage2({ lab: true }, 9)).toBe(true);
  });
  it('연구실 밖이면 신청자 본인만 통과', () => {
    expect(evaluateStage2({ lab: false, ownerIds: [2, 3] }, 3)).toBe(true);
    expect(evaluateStage2({ lab: false, ownerIds: [2, 3] }, 4)).toBe(false);
  });
});
