import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ActivityLogService } from '../activity-log/activity-log.service.js';
import { IS_PUBLIC } from '../auth/decorators.js';
import { clientIp, type AppRequest } from '../common/request-context.js';
import { evaluateStage2 } from '../domain/ip-access.js';
import { ipNotAllowed, isStateChanging } from './access-errors.js';

/** DESIGN.md 6장 2단계. 인증 이후, 연구실 밖이면 시간대 안 신청의 주인 본인이어야 한다. */
@Injectable()
export class IpStage2Guard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly logs: ActivityLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()])) {
      return true;
    }
    const req = context.switchToHttp().getRequest<AppRequest>();
    const { access, authUser } = req;
    if (!access || !authUser) throw new Error('IpStage2Guard는 IpStage1Guard, JwtAuthGuard 다음에 와야 합니다.');
    if (evaluateStage2(access, authUser.id)) return true;

    if (isStateChanging(req.method)) {
      await this.logs.write(
        { action: 'IP_DENIED', userId: authUser.id, payload: { stage: 2, method: req.method, path: req.originalUrl } },
        { ip: clientIp(req) },
      );
    }
    throw ipNotAllowed();
  }
}
