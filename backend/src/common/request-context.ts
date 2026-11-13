import type { Request } from 'express';
import type { UserRole } from '../database/enums.js';
import { normalizeIp, type AccessContext } from '../domain/ip-access.js';

/** JWT에서 꺼낸 로그인 사용자 */
export interface AuthUser {
  id: number;
  role: UserRole;
}

/** 가드가 채워 넣는 칸을 더한 요청. 전역 Express 타입은 건드리지 않는다. */
export interface AppRequest extends Request {
  /** IP 1단계 결과 (IpStage1Guard) */
  access?: AccessContext;
  /** 로그인 사용자 (JwtAuthGuard) */
  authUser?: AuthUser;
}

/** 정규화한 클라이언트 IP. trust proxy = 'loopback'이라 루프백 프록시(Vite)가 붙인 X-Forwarded-For만 반영된다. */
export function clientIp(req: Request): string {
  return normalizeIp(req.ip ?? req.socket.remoteAddress ?? '');
}
