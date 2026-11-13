import type { AttendanceRejectCode } from '../attendance/attendance-errors.js';
import type { RequestStatus, RequestType } from '../database/enums.js';
import type { RequestActionRefusal, SubmitRefusalCode } from '../requests/requests-errors.js';
import type { GrantRefusalCode } from '../annual-grants/annual-grants-errors.js';

// 행동별 이력 모양. action에 따라 payload 모양이 정해진다.
// 새 행동은 해당 Phase에서 이 유니언에 추가한다.

interface LoginSuccess {
  action: 'LOGIN_SUCCESS';
  userId: number;
  payload: Record<string, never>;
}

/** 비밀번호는 절대 넣지 않는다. 시도한 loginId까지만. */
interface LoginFailure {
  action: 'LOGIN_FAILURE';
  userId: null;
  payload: { loginId: string };
}

/** IP 가드 거절. 1단계는 사용자를 모르므로 userId가 null, 2단계는 로그인한(또는 로그인 시도한) 사용자. */
interface IpDenied {
  action: 'IP_DENIED';
  userId: number | null;
  payload: { stage: 1 | 2; method: string; path: string };
}

/** 역할 부족(리드 전용 경로). 상태 변경 요청만 남긴다. */
interface RoleDenied {
  action: 'ROLE_DENIED';
  userId: number;
  payload: { method: string; path: string };
}

/** 출근 버튼. 대상: attendances */
interface CheckIn {
  action: 'CHECK_IN';
  userId: number;
  payload: { workDate: string; checkInAt: string };
}

/** 퇴근 버튼. 대상: attendances */
interface CheckOut {
  action: 'CHECK_OUT';
  userId: number;
  payload: { workDate: string; checkOutAt: string };
}

/** 미기록 퇴근 직접 입력. 대상: attendances */
interface ManualCheckOut {
  action: 'MANUAL_CHECK_OUT';
  userId: number;
  payload: { workDate: string; checkOutAt: string };
}

export type AttendanceAttempt = 'CHECK_IN' | 'CHECK_OUT' | 'MANUAL_CHECK_OUT';

/** 출퇴근·직접 입력 거절. 입력 형식 오류(400)는 남기지 않는다. */
interface AttendanceRejected {
  action: 'ATTENDANCE_REJECTED';
  userId: number;
  payload: {
    attempt: AttendanceAttempt;
    reason: AttendanceRejectCode;
    workDate: string;
  };
}

/** 신청 제출. 대상: requests. 리드 본인 신청은 status가 APPROVED. */
interface RequestSubmitted {
  action: 'REQUEST_SUBMITTED';
  userId: number;
  payload: { type: RequestType; targetDate: string; status: RequestStatus; usedAttendanceId: number | null };
}

/** 제출 거절(행을 만들지 않음). 반려(REQUEST_REJECTED)와 구분한다. 입력 형식 오류(400)는 남기지 않는다. */
interface RequestSubmitRefused {
  action: 'REQUEST_SUBMIT_REFUSED';
  userId: number;
  payload: { type: RequestType; targetDate: string; reason: SubmitRefusalCode };
}

/** 본인 취소. 대상: requests */
interface RequestCanceled {
  action: 'REQUEST_CANCELED';
  userId: number;
  payload: { fromStatus: RequestStatus };
}

/** 리드 승인. 대상: requests */
interface RequestApproved {
  action: 'REQUEST_APPROVED';
  userId: number;
  payload: { requesterId: number };
}

/** 리드 반려. 대상: requests */
interface RequestRejected {
  action: 'REQUEST_REJECTED';
  userId: number;
  payload: { requesterId: number };
}

/** 취소·승인·반려 시도 거절. 대상: requests */
interface RequestActionRefused {
  action: 'REQUEST_ACTION_REFUSED';
  userId: number;
  payload: { attempt: 'CANCEL' | 'APPROVE' | 'REJECT'; reason: RequestActionRefusal };
}

/** 리드의 특별 연차 지급. 대상: annual_grants */
interface AnnualGranted {
  action: 'ANNUAL_GRANTED';
  userId: number;
  payload: { recipientId: number; days: number };
}

/** 특별 연차 취소. 대상: annual_grants */
interface AnnualGrantCanceled {
  action: 'ANNUAL_GRANT_CANCELED';
  userId: number;
  payload: { recipientId: number; days: number };
}

/** 특별 연차 지급·취소 거절. 입력 형식 오류(400)는 남기지 않는다. */
interface AnnualGrantActionRefused {
  action: 'ANNUAL_GRANT_ACTION_REFUSED';
  userId: number;
  payload: { attempt: 'GRANT' | 'CANCEL'; reason: GrantRefusalCode };
}

export type ActivityEntry =
  | LoginSuccess
  | LoginFailure
  | IpDenied
  | RoleDenied
  | CheckIn
  | CheckOut
  | ManualCheckOut
  | AttendanceRejected
  | RequestSubmitted
  | RequestSubmitRefused
  | RequestCanceled
  | RequestApproved
  | RequestRejected
  | RequestActionRefused
  | AnnualGranted
  | AnnualGrantCanceled
  | AnnualGrantActionRefused;

export type ActivityAction = ActivityEntry['action'];
export type ActivityPayload = ActivityEntry['payload'];

/** 모든 이력에 공통인 칸 */
export interface ActivityMeta {
  ip: string;
  targetType?: string;
  targetId?: number;
}
