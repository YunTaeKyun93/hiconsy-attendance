import { describe, expect, it } from 'vitest';
import { canRequestRemote } from './remote.js';

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
