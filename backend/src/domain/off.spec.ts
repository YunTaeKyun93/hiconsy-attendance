import { describe, expect, it } from 'vitest';
import { seoulToInstant } from '../common/date-time.js';
import {
  offExpiry,
  offGrantsOn,
  offRemaining,
  offUnavailableMessage,
  selectOffGrant,
  toOffGrants,
  type OffGrant,
} from './off.js';

// DESIGN.md 5-4 예시: A(11/14 근무, ~12/14), B(12/5 근무, ~1/4)
const A: OffGrant = { attendanceId: 10, workDate: '2026-11-14' };
const B: OffGrant = { attendanceId: 20, workDate: '2026-12-05' };
const NONE = new Set<number>();

describe('offExpiry', () => {
  it('지급일 + 30일(당일 포함)', () => {
    expect(offExpiry('2026-11-14')).toBe('2026-12-14');
    expect(offExpiry('2026-12-05')).toBe('2027-01-04');
  });
});

describe('selectOffGrant (DESIGN.md 5-4 예시 표)', () => {
  it('12/10 사용 → A', () => {
    expect(selectOffGrant('2026-12-10', [A, B], NONE)).toBe(A.attendanceId);
  });

  it('12/20 사용 → B (A 만료)', () => {
    expect(selectOffGrant('2026-12-20', [A, B], NONE)).toBe(B.attendanceId);
  });

  it('입력 순서와 무관하게 가장 먼저 받은 것', () => {
    expect(selectOffGrant('2026-12-10', [B, A], NONE)).toBe(A.attendanceId);
  });

  it('11/14 근무는 12/14까지 사용 가능, 12/15부터 만료', () => {
    expect(selectOffGrant('2026-12-14', [A], NONE)).toBe(A.attendanceId);
    expect(selectOffGrant('2026-12-15', [A], NONE)).toBeNull();
  });

  it('다른 유효 신청이 가리키는 건은 건너뛴다', () => {
    expect(selectOffGrant('2026-12-10', [A, B], new Set([A.attendanceId]))).toBe(B.attendanceId);
    expect(selectOffGrant('2026-12-10', [A, B], new Set([A.attendanceId, B.attendanceId]))).toBeNull();
  });

  it('지급일 전에는 쓸 수 없다', () => {
    expect(selectOffGrant('2026-12-04', [B], NONE)).toBeNull();
  });
});

describe('offRemaining', () => {
  it('오늘 기준 만료되지 않았고 사용되지 않은 건 수', () => {
    expect(offRemaining('2026-12-10', [A, B], NONE)).toBe(2);
    expect(offRemaining('2026-12-15', [A, B], NONE)).toBe(1);
    expect(offRemaining('2026-12-10', [A, B], new Set([B.attendanceId]))).toBe(1);
    expect(offRemaining('2027-01-05', [A, B], NONE)).toBe(0);
  });

  it('취소·반려로 풀리면 다시 센다(usedIds에서 빠짐)', () => {
    expect(offRemaining('2026-12-10', [A], new Set([A.attendanceId]))).toBe(0);
    expect(offRemaining('2026-12-10', [A], NONE)).toBe(1);
  });
});

describe('toOffGrants', () => {
  it('주말 근무 대조가 있고 퇴근이 기록된 행만', () => {
    const out = seoulToInstant('2026-11-14', '15:00:00');
    const rows = [
      { id: 1, workDate: '2026-11-14', requestId: 5, checkOutAt: out },
      { id: 2, workDate: '2026-11-15', requestId: 6, checkOutAt: null },
      { id: 3, workDate: '2026-11-16', requestId: null, checkOutAt: out },
    ];
    expect(toOffGrants(rows)).toEqual([{ attendanceId: 1, workDate: '2026-11-14' }]);
  });
});

describe('offGrantsOn', () => {
  it('사용일 기준 상태를 지급일 순으로', () => {
    const C: OffGrant = { attendanceId: 30, workDate: '2026-12-26' };
    expect(offGrantsOn('2026-12-20', [C, B, A], new Set([20]))).toEqual([
      { attendanceId: 10, workDate: '2026-11-14', expiresOn: '2026-12-14', status: 'EXPIRED' },
      { attendanceId: 20, workDate: '2026-12-05', expiresOn: '2027-01-04', status: 'IN_USE' },
      { attendanceId: 30, workDate: '2026-12-26', expiresOn: '2027-01-25', status: 'NOT_YET' },
    ]);
  });
  it('만료일 당일은 USABLE', () => {
    expect(offGrantsOn('2026-12-14', [A], new Set())[0].status).toBe('USABLE');
  });
});

describe('offUnavailableMessage', () => {
  it('지급 건마다 사용일 기준 사유를 한 줄씩', () => {
    const items = offGrantsOn('2026-12-20', [A, B, { attendanceId: 30, workDate: '2026-12-26' }], new Set([20]));
    expect(offUnavailableMessage('2026-12-20', items)).toBe(
      [
        '2026-12-20에 쓸 수 있는 OFF가 없습니다.',
        '- 2026-11-14 근무분: 2026-12-14까지 사용 가능 (만료)',
        '- 2026-12-05 근무분: 다른 신청에 사용 중',
        '- 2026-12-26 근무분: 2026-12-26부터 사용 가능',
      ].join('\n'),
    );
  });
  it('보유 건이 없으면 한 줄', () => {
    expect(offUnavailableMessage('2026-12-20', [])).toBe('보유한 OFF가 없습니다.');
  });
});
