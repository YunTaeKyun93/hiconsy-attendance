import type { DateStr } from '../common/date-time.js';
import { RequestType } from '../database/enums.js';
import { accruedAnnualLeave, annualRemaining } from './annual-leave.js';
import {
  isValidTargetDate,
  isWithinDeadline,
  requestDeadline,
} from './business-day.js';
import {
  offGrantsOn,
  selectOffGrant,
  type OffGrant,
  type OffGrantOnDate,
} from './off.js';
import { canRequestRemote } from './remote.js';
import type { HolidaySet } from './types.js';

/** 제출 판정에 필요한 사실. 서비스가 DB에서 모아 넘긴다. */
export interface SubmissionFacts {
  type: RequestType;
  targetDate: DateStr;
  now: Date;
  today: DateStr;
  /** 대상일과 직전 영업일 계산에 필요한 범위의 공휴일 */
  holidays: HolidaySet;
  /** 같은 날짜에 PENDING·APPROVED 신청이 이미 있는지 */
  hasActiveOnDate: boolean;
  hiredAt: DateStr;
  /** 오늘까지 받은 ACTIVE 특별 연차 일수 (DESIGN.md 14-3) */
  annualGrantedDays: number;
  /** PENDING·APPROVED 연차 수 */
  activeAnnualCount: number;
  /** PENDING·APPROVED 재택 대상일들 */
  activeRemoteDates: readonly DateStr[];
  offGrants: readonly OffGrant[];
  /** PENDING·APPROVED 신청이 가리키는 지급 건 */
  offUsedIds: ReadonlySet<number>;
}

export type SubmissionRefusal =
  | { reason: 'INVALID_DATE' }
  | { reason: 'DEADLINE_PASSED'; deadline: Date }
  | { reason: 'DUPLICATE_DATE' }
  | { reason: 'INSUFFICIENT_ANNUAL'; remaining: number }
  | { reason: 'REMOTE_LIMIT' }
  | { reason: 'NO_OFF_AVAILABLE'; grants: OffGrantOnDate[] };

export type SubmissionJudgement =
  | { ok: true; usedAttendanceId: number | null }
  | ({ ok: false } & SubmissionRefusal);

/**
 * 제출 판정 (DESIGN.md 5장). 거절이면 행을 만들지 않는다(반려와 구분).
 * 순서: 날짜 → 기한 → 같은 날 중복 → 잔여(유형별). 잔여는 PENDING·APPROVED를 모두 사용으로 센다.
 */
export function judgeSubmission(f: SubmissionFacts): SubmissionJudgement {
  if (!isValidTargetDate(f.type, f.targetDate, f.holidays))
    return { ok: false, reason: 'INVALID_DATE' };
  if (!isWithinDeadline(f.now, f.targetDate, f.holidays)) {
    return {
      ok: false,
      reason: 'DEADLINE_PASSED',
      deadline: requestDeadline(f.targetDate, f.holidays),
    };
  }
  if (f.hasActiveOnDate) return { ok: false, reason: 'DUPLICATE_DATE' };

  switch (f.type) {
    case RequestType.ANNUAL: {
      // 신청 시점(오늘) 잔여로 검사한다. 미래 날짜도 아직 생기지 않은 연차로는 못 쓴다.
      const remaining = annualRemaining(
        accruedAnnualLeave(f.hiredAt, f.today) + f.annualGrantedDays,
        f.activeAnnualCount,
      );
      return remaining >= 1
        ? { ok: true, usedAttendanceId: null }
        : { ok: false, reason: 'INSUFFICIENT_ANNUAL', remaining };
    }
    case RequestType.REMOTE:
      return canRequestRemote(f.targetDate, f.activeRemoteDates)
        ? { ok: true, usedAttendanceId: null }
        : { ok: false, reason: 'REMOTE_LIMIT' };
    case RequestType.OFF: {
      const picked = selectOffGrant(f.targetDate, f.offGrants, f.offUsedIds);
      return picked !== null
        ? { ok: true, usedAttendanceId: picked }
        : {
            ok: false,
            reason: 'NO_OFF_AVAILABLE',
            grants: offGrantsOn(f.targetDate, f.offGrants, f.offUsedIds),
          };
    }
    case RequestType.WEEKEND_WORK:
      return { ok: true, usedAttendanceId: null };
  }
}
