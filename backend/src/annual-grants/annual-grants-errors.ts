import { ConflictException, NotFoundException, type HttpException } from '@nestjs/common';

export type GrantRefusalCode =
  | 'SELF_GRANT' // 리드 본인에게 지급
  | 'USER_NOT_FOUND'
  | 'NOT_FOUND' // 지급분 없음
  | 'ALREADY_CANCELED'
  | 'NEGATIVE_BALANCE'; // 취소하면 잔여가 음수

export function grantRefusal(code: GrantRefusalCode, extra: Record<string, unknown> = {}): HttpException {
  switch (code) {
    case 'SELF_GRANT':
      return new ConflictException({ statusCode: 409, code, message: '본인에게는 특별 연차를 지급할 수 없습니다.' });
    case 'USER_NOT_FOUND':
      return new NotFoundException({ statusCode: 404, code, message: '사용자가 없습니다.' });
    case 'NOT_FOUND':
      return new NotFoundException({ statusCode: 404, code, message: '특별 연차 지급 내역이 없습니다.' });
    case 'ALREADY_CANCELED':
      return new ConflictException({ statusCode: 409, code, message: '이미 취소된 지급분입니다.' });
    case 'NEGATIVE_BALANCE': {
      const { remainingNow, days, remainingAfter } = extra as {
        remainingNow: number;
        days: number;
        remainingAfter: number;
      };
      return new ConflictException({
        statusCode: 409,
        code,
        message:
          `취소하면 연차 잔여가 ${remainingAfter}일이 됩니다(현재 잔여 ${remainingNow}일, 지급 ${days}일). ` +
          '이미 이 연차를 신청에 사용했습니다. 먼저 해당 연차 신청을 취소하거나 반려하세요.',
        ...extra,
      });
    }
  }
}
