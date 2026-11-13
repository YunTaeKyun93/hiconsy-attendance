import { Inject, Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { CLOCK, type Clock } from '../clock/clock.js';
import type { AppRequest } from '../common/request-context.js';
import { AUTH_COOKIE, type JwtPayload } from './auth.constants.js';
import { IS_PUBLIC } from './decorators.js';

/** 쿠키의 JWT를 검증한다. 만료 판정 기준 시각은 주입한 시계. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()])) {
      return true;
    }
    const req = context.switchToHttp().getRequest<AppRequest>();
    const token: unknown = req.cookies?.[AUTH_COOKIE];
    if (typeof token !== 'string' || token === '') throw unauthenticated();

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        algorithms: ['HS256'],
        clockTimestamp: Math.floor(this.clock.now().getTime() / 1000),
      });
      req.authUser = { id: payload.sub, role: payload.role };
      return true;
    } catch {
      throw unauthenticated();
    }
  }
}

function unauthenticated(): UnauthorizedException {
  return new UnauthorizedException({ statusCode: 401, code: 'UNAUTHENTICATED', message: '로그인이 필요합니다.' });
}
