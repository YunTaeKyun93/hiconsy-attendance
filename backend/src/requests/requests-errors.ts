import {
  ConflictException,
  NotFoundException,
  type HttpException,
} from '@nestjs/common';
import type { SubmissionRefusal } from '../domain/request-submission.js';
import { offUnavailableMessage } from '../domain/off.js';
import type { DateStr } from '../common/date-time.js';

export type SubmitRefusalCode = SubmissionRefusal['reason'];

/** 취소·승인·반려 거절 사유 */
export type RequestActionRefusal =
  | 'NOT_FOUND'
  | 'INVALID_STATUS' // 이미 처리된 신청
  | 'CANCEL_DEADLINE_PASSED' // 대상일 당일부터 취소 불가
  | 'APPROVE_DEADLINE_PASSED'; // 대상일 0시가 지나 승인 불가(반려만 가능)

/** 제출 거절 응답. 409, 행을 만들지 않는다. */
export function submitRefusal(
  refusal: SubmissionRefusal,
  targetDate: DateStr,
): HttpException {
  const base = { statusCode: 409, code: refusal.reason };
  switch (refusal.reason) {
    case 'INVALID_DATE':
      return new ConflictException({
        ...base,
        message:
          '연차·재택·OFF는 영업일만, 주말 근무는 주말·공휴일만 신청할 수 있습니다.',
      });
    case 'DEADLINE_PASSED':
      return new ConflictException({
        ...base,
        message: '신청 기한(대상일 직전 영업일 17:00)이 지났습니다.',
        deadline: refusal.deadline.toISOString(),
      });
    case 'DUPLICATE_DATE':
      return new ConflictException({
        ...base,
        message: '이 날짜에 이미 대기 중이거나 승인된 신청이 있습니다.',
      });
    case 'INSUFFICIENT_ANNUAL':
      return new ConflictException({
        ...base,
        message: '남은 연차가 없습니다.',
        remaining: refusal.remaining,
      });
    case 'REMOTE_LIMIT':
      return new ConflictException({
        ...base,
        message: '재택은 한 달에 2회까지 신청할 수 있습니다.',
      });
    case 'NO_OFF_AVAILABLE':
      return new ConflictException({
        ...base,
        message: offUnavailableMessage(targetDate, refusal.grants),
        useDate: targetDate,
        grants: refusal.grants.map(({ workDate, expiresOn, status }) => ({
          workDate,
          expiresOn,
          status,
        })),
      });
  }
}

const ACTION_MESSAGES: Record<RequestActionRefusal, string> = {
  NOT_FOUND: '신청이 없습니다.',
  INVALID_STATUS: '이미 처리된 신청입니다.',
  CANCEL_DEADLINE_PASSED: '취소는 대상일 전날까지만 할 수 있습니다.',
  APPROVE_DEADLINE_PASSED:
    '대상일이 지나 승인할 수 없습니다. 반려만 가능합니다.',
};

export function actionRefusal(code: RequestActionRefusal): HttpException {
  const body = { code, message: ACTION_MESSAGES[code] };
  return code === 'NOT_FOUND'
    ? new NotFoundException({ statusCode: 404, ...body })
    : new ConflictException({ statusCode: 409, ...body });
}
