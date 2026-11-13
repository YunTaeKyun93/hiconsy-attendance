import {
  ConflictException,
  NotFoundException,
  type HttpException,
} from '@nestjs/common';
import type { AttendanceRejectReason } from '../domain/attendance-rules.js';

/** 출퇴근 거절 사유. 응답의 code와 이력의 reason에 같은 값을 쓴다. */
export type AttendanceRejectCode =
  | Exclude<AttendanceRejectReason, 'MISSING_WINDOW'>
  | 'UNRECORDED_CHECKOUT' // 퇴근 미기록 과거 날짜가 있어 출근 불가
  | 'ALREADY_CHECKED_IN'
  | 'NOT_CHECKED_IN'
  | 'ALREADY_CHECKED_OUT'
  | 'IP_MISMATCH' // 주말 근무 버튼 출퇴근인데 신청 IP와 다름
  | 'NOT_FOUND' // 직접 입력할 출퇴근 행 없음
  | 'NOT_PAST' // 오늘 기록은 직접 입력이 아니라 퇴근 버튼으로
  | 'OUT_OF_RANGE'; // 직접 입력 허용 범위 밖

const MESSAGES: Record<AttendanceRejectCode, string> = {
  NON_WORKDAY:
    '주말·공휴일에는 승인된 주말 근무 신청이 있어야 출퇴근할 수 있습니다.',
  ANNUAL: '연차일에는 출근할 수 없습니다.',
  TOO_EARLY: '아직 등록할 수 있는 시각이 아닙니다.',
  OUTSIDE_WINDOW: '주말 근무 신청 시간대가 아닙니다.',
  UNRECORDED_CHECKOUT:
    '퇴근이 기록되지 않은 날이 있습니다. 먼저 퇴근 시각을 입력하세요.',
  ALREADY_CHECKED_IN: '오늘은 이미 출근했습니다.',
  NOT_CHECKED_IN: '오늘 출근 기록이 없습니다.',
  ALREADY_CHECKED_OUT: '이미 퇴근이 기록되었습니다.',
  IP_MISMATCH: '주말 근무 신청에 적은 IP에서만 출퇴근할 수 있습니다.',
  NOT_FOUND: '해당 날짜의 출근 기록이 없습니다.',
  NOT_PAST: '오늘 퇴근은 퇴근 버튼으로 등록하세요.',
  OUT_OF_RANGE: '입력할 수 있는 범위를 벗어난 시각입니다.',
};

export function attendanceRejection(
  code: AttendanceRejectCode,
  extra: Record<string, unknown> = {},
): HttpException {
  const body = { code, message: MESSAGES[code], ...extra };
  return code === 'NOT_FOUND'
    ? new NotFoundException({ statusCode: 404, ...body })
    : new ConflictException({ statusCode: 409, ...body });
}
