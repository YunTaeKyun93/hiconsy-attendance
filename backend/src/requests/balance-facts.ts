import { In, IsNull, Not, type EntityManager } from 'typeorm';
import { toSeoulDate, type DateStr } from '../common/date-time.js';
import { AnnualGrant } from '../database/entities/annual-grant.entity.js';
import { Attendance } from '../database/entities/attendance.entity.js';
import { WorkRequest } from '../database/entities/request.entity.js';
import { AnnualGrantStatus, RequestStatus, RequestType } from '../database/enums.js';
import type { AnnualGrantFact } from '../domain/annual-leave.js';
import { toOffGrants, type OffGrant } from '../domain/off.js';

const ACTIVE = In([RequestStatus.PENDING, RequestStatus.APPROVED]);

/** 잔여 계산에 필요한 사실. 잔여는 저장하지 않고 매번 이 값으로 계산한다. */
export interface BalanceFacts {
  activeRequests: WorkRequest[];
  activeAnnualCount: number;
  activeRemoteDates: DateStr[];
  offGrants: OffGrant[];
  offUsedIds: Set<number>;
  /** 특별 연차 지급분(취소된 것 포함, canceledOn으로 구분) */
  annualGrants: AnnualGrantFact[];
}

export function toAnnualGrantFacts(rows: readonly AnnualGrant[]): AnnualGrantFact[] {
  return rows.map((g) => ({
    days: g.days,
    grantDate: toSeoulDate(g.grantedAt),
    // 취소일이 없으면 유효. 상태와 취소 시각은 함께 바뀐다.
    canceledOn: g.status === AnnualGrantStatus.CANCELED && g.canceledAt ? toSeoulDate(g.canceledAt) : null,
  }));
}

export async function loadBalanceFacts(m: EntityManager, userId: number): Promise<BalanceFacts> {
  const [activeRequests, grantRows, annualGrantRows] = await Promise.all([
    m.find(WorkRequest, { where: { userId, status: ACTIVE } }),
    // OFF 지급 건: 주말 근무 신청과 대조되고 퇴근이 기록된 행
    m.find(Attendance, { where: { userId, requestId: Not(IsNull()), checkOutAt: Not(IsNull()) } }),
    m.find(AnnualGrant, { where: { userId } }),
  ]);
  return {
    activeRequests,
    activeAnnualCount: activeRequests.filter((r) => r.type === RequestType.ANNUAL).length,
    activeRemoteDates: activeRequests.filter((r) => r.type === RequestType.REMOTE).map((r) => r.targetDate),
    offGrants: toOffGrants(grantRows),
    offUsedIds: new Set(activeRequests.map((r) => r.usedAttendanceId).filter((id): id is number => id !== null)),
    annualGrants: toAnnualGrantFacts(annualGrantRows),
  };
}
