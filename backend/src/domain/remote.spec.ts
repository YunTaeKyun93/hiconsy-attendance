import { describe, expect, it } from 'vitest';
import { canRequestRemote, remoteUsage } from './remote.js';

describe('canRequestRemote (DESIGN.md 5-3)', () => {
  it('같은 달 0·1회면 가능, 2회면 불가', () => {
    expect(canRequestRemote('2026-11-20', [])).toBe(true);
    expect(canRequestRemote('2026-11-20', ['2026-11-05'])).toBe(true);
    expect(canRequestRemote('2026-11-20', ['2026-11-05', '2026-11-12'])).toBe(false);
  });

  it('신청일이 아니라 재택일의 달로 센다: 11월에 2회를 쓴 사람도 12/1 재택 가능', () => {
    expect(canRequestRemote('2026-12-01', ['2026-11-05', '2026-11-12'])).toBe(true);
  });

  it('연도가 다르면 같은 월이라도 따로 센다', () => {
    expect(canRequestRemote('2027-11-10', ['2026-11-05', '2026-11-12'])).toBe(true);
  });
});

describe('remoteUsage', () => {
  it('달별 사용·잔여(음수 없음)', () => {
    const dates = ['2026-11-03', '2026-11-10', '2026-12-01'];
    expect(remoteUsage('2026-11', dates)).toEqual({ month: '2026-11', used: 2, remaining: 0 });
    expect(remoteUsage('2026-12', dates)).toEqual({ month: '2026-12', used: 1, remaining: 1 });
    expect(remoteUsage('2027-01', dates)).toEqual({ month: '2027-01', used: 0, remaining: 2 });
  });
});
