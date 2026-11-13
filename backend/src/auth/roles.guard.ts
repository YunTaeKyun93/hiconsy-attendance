import { ForbiddenException, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isStateChanging } from '../access/access-errors.js';
import { ActivityLogService } from '../activity-log/activity-log.service.js';
import { clientIp, type AppRequest } from '../common/request-context.js';
import type { UserRole } from '../database/enums.js';
import { ROLES } from './decorators.js';

/** @Roles()가 붙은 경로만 검사한다. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly logs: ActivityLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;
    const req = context.switchToHttp().getRequest<AppRequest>();
    const user = req.authUser;
    if (user && roles.includes(user.role)) return true;

    if (user && isStateChanging(req.method)) {
      await this.logs.write(
        { action: 'ROLE_DENIED', userId: user.id, payload: { method: req.method, path: req.originalUrl } },
        { ip: clientIp(req) },
      );
    }
    throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN_ROLE', message: '권한이 없습니다.' });
  }
}
