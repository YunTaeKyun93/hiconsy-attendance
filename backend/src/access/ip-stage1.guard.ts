import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { ActivityLogService } from '../activity-log/activity-log.service.js';
import { clientIp, type AppRequest } from '../common/request-context.js';
import { ipNotAllowed, isStateChanging } from './access-errors.js';
import { IpAccessService } from './ip-access.service.js';

/** DESIGN.md 6장 1단계. 모든 요청(로그인 전, @Public 포함)에 적용한다. */
@Injectable()
export class IpStage1Guard implements CanActivate {
  constructor(
    private readonly ipAccess: IpAccessService,
    private readonly logs: ActivityLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AppRequest>();
    const ip = clientIp(req);
    const access = await this.ipAccess.evaluate(ip);
    if (access) {
      req.access = access;
      return true;
    }
    if (isStateChanging(req.method)) {
      await this.logs.write(
        { action: 'IP_DENIED', userId: null, payload: { stage: 1, method: req.method, path: req.originalUrl } },
        { ip },
      );
    }
    throw ipNotAllowed();
  }
}
