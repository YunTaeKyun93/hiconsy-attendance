import { ForbiddenException } from '@nestjs/common';

/** 프론트가 차단 화면을 띄울 때 구분하는 코드 */
export const IP_NOT_ALLOWED = 'IP_NOT_ALLOWED';

export function ipNotAllowed(): ForbiddenException {
  return new ForbiddenException({ statusCode: 403, code: IP_NOT_ALLOWED, message: '등록된 IP가 아닙니다.' });
}

/** 9장: 상태 변경 요청의 거절만 이력에 남긴다. */
export function isStateChanging(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}
