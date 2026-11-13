import type { CookieOptions } from 'express';
import { env } from '../config/env.js';

export const AUTH_COOKIE = 'access_token';

/**
 * maxAge 없는 세션 쿠키. 만료는 JWT exp(주입한 시계 기준)로만 판정한다.
 * 브라우저는 실제 시계를 쓰므로 쿠키 만료를 두면 개발 모드 시계 조작과 어긋난다.
 */
export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: env.nodeEnv === 'production',
  path: '/',
};

/** JWT 본문. iat·exp는 jsonwebtoken이 Date.now()를 쓰지 않도록 직접 채운다. */
export interface JwtPayload {
  sub: number;
  role: 'MEMBER' | 'LEAD';
  iat: number;
  exp: number;
}
