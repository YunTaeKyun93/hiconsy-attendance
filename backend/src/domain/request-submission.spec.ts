import { seoulToInstant } from '../common/date-time.js';
import { RequestType } from '../database/enums.js';
import { judgeSubmission, type SubmissionFacts } from './request-submission.js';

const HOLIDAYS = new Set(['2026-09-24', '2026-09-25', '2026-09-26']);

/** 기본: 임자율(02-12 입사), 2026-11-12 10:00에 11-16(월) 신청, 아무것도 안 씀 */
const facts = (over: Partial<SubmissionFacts> = {}): SubmissionFacts => ({
  type: RequestType.ANNUAL,
  targetDate: '2026-11-16',
  now: seoulToInstant('2026-11-12', '10:00:00'),
  today: '2026-11-12',
  holidays: HOLIDAYS,
  hasActiveOnDate: false,
  hiredAt: '2026-02-12',
  annualGrantedDays: 0,
  activeAnnualCount: 0,
  activeRemoteDates: [],
  offGrants: [],
  offUsedIds: new Set(),
  ...over,
});

describe('judgeSubmission: 날짜·기한', () => {
  it('ANNUAL·REMOTE·OFF는 영업일만, WEEKEND_WORK는 주말·공휴일만', () => {
    expect(judgeSubmission(facts({ targetDate: '2026-11-14' }))).toMatchObject({
      ok: false,
      reason: 'INVALID_DATE',
    });
    expect(
      judgeSubmission(facts({ type: RequestType.WEEKEND_WORK })),
    ).toMatchObject({
      ok: false,
      reason: 'INVALID_DATE',
    });
    expect(
      judgeSubmission(
        facts({ type: RequestType.WEEKEND_WORK, targetDate: '2026-11-14' }),
      ),
    ).toEqual({
      ok: true,
      usedAttendanceId: null,
    });
  });

  it('DESIGN 5-1 예: 2026-09-28(월) 신청은 2026-09-23(수) 17:00:00까지', () => {
    const base = {
      targetDate: '2026-09-28',
      today: '2026-09-23',
      hiredAt: '2026-01-01',
    };
    expect(
      judgeSubmission(
        facts({ ...base, now: seoulToInstant('2026-09-23', '17:00:00') }),
      ).ok,
    ).toBe(true);
    expect(
      judgeSubmission(
        facts({ ...base, now: seoulToInstant('2026-09-23', '17:00:01') }),
      ),
    ).toEqual({
      ok: false,
      reason: 'DEADLINE_PASSED',
      deadline: seoulToInstant('2026-09-23', '17:00:00'),
    });
  });

  it('같은 날짜에 유효 신청이 있으면 거절', () => {
    expect(judgeSubmission(facts({ hasActiveOnDate: true }))).toEqual({
      ok: false,
      reason: 'DUPLICATE_DATE',
    });
  });

  it('날짜 오류가 기한·잔여보다 먼저', () => {
    expect(
      judgeSubmission(
        facts({
          targetDate: '2026-11-14',
          now: seoulToInstant('2026-11-14', '12:00:00'),
        }),
      ),
    ).toMatchObject({ reason: 'INVALID_DATE' });
  });
});

describe('judgeSubmission: 연차', () => {
  it('신청 시점 잔여 ≥ 1이면 통과 (임자율 11-12 적립 9)', () => {
    expect(judgeSubmission(facts({ activeAnnualCount: 8 })).ok).toBe(true);
    expect(judgeSubmission(facts({ activeAnnualCount: 9 }))).toEqual({
      ok: false,
      reason: 'INSUFFICIENT_ANNUAL',
      remaining: 0,
    });
  });

  it('특별 지급 일수를 적립에 더한다', () => {
    expect(judgeSubmission(facts({ activeAnnualCount: 9, annualGrantedDays: 1 })).ok).toBe(true);
    expect(judgeSubmission(facts({ activeAnnualCount: 10, annualGrantedDays: 1 }))).toMatchObject({
      reason: 'INSUFFICIENT_ANNUAL',
      remaining: 0,
    });
  });

  it('미래 날짜라도 아직 적립되지 않은 연차로는 못 쓴다', () => {
    // 임자율 03-11 기준 적립 0 → 4월 날짜도 거절
    expect(
      judgeSubmission(
        facts({
          today: '2026-03-11',
          now: seoulToInstant('2026-03-11', '10:00:00'),
          targetDate: '2026-04-15',
        }),
      ),
    ).toMatchObject({ reason: 'INSUFFICIENT_ANNUAL', remaining: 0 });
  });
});

describe('judgeSubmission: 재택', () => {
  const remote = { type: RequestType.REMOTE, targetDate: '2026-12-01' };
  it('재택일이 속한 달로 센다: 11월 2회를 써도 12/1 가능', () => {
    expect(
      judgeSubmission(
        facts({ ...remote, activeRemoteDates: ['2026-11-03', '2026-11-10'] }),
      ).ok,
    ).toBe(true);
  });
  it('같은 달 2회면 거절', () => {
    expect(
      judgeSubmission(
        facts({ ...remote, activeRemoteDates: ['2026-12-02', '2026-12-03'] }),
      ),
    ).toEqual({
      ok: false,
      reason: 'REMOTE_LIMIT',
    });
  });
});

describe('judgeSubmission: OFF (DESIGN 5-4 예시 표)', () => {
  const grants = [
    { attendanceId: 1, workDate: '2026-11-14' },
    { attendanceId: 2, workDate: '2026-12-05' },
  ];
  const off = (targetDate: string) =>
    facts({
      type: RequestType.OFF,
      targetDate,
      today: '2026-12-07',
      now: seoulToInstant('2026-12-07', '10:00:00'),
      offGrants: grants,
    });

  it('12/10 사용 → A', () => {
    expect(judgeSubmission(off('2026-12-10'))).toEqual({
      ok: true,
      usedAttendanceId: 1,
    });
  });
  // 표의 12/20은 일요일이라 OFF 날짜 검증에 걸린다. 같은 의미의 다음 영업일 12/21로 검사한다.
  it('12/21 사용 → B (A 만료)', () => {
    expect(judgeSubmission(off('2026-12-21'))).toEqual({
      ok: true,
      usedAttendanceId: 2,
    });
  });
  it('고를 건이 없으면 지급 건별 상태와 함께 거절', () => {
    expect(
      judgeSubmission({ ...off('2026-12-21'), offUsedIds: new Set([2]) }),
    ).toEqual({
      ok: false,
      reason: 'NO_OFF_AVAILABLE',
      grants: [
        {
          attendanceId: 1,
          workDate: '2026-11-14',
          expiresOn: '2026-12-14',
          status: 'EXPIRED',
        },
        {
          attendanceId: 2,
          workDate: '2026-12-05',
          expiresOn: '2027-01-04',
          status: 'IN_USE',
        },
      ],
    });
  });
});
