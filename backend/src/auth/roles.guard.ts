import { ForbiddenException, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AppRequest } from '../common/request-context.js';
import type { UserRole } from '../database/enums.js';
import { ROLES } from './decorators.js';

/** @Roles()가 붙은 경로만 검사한다. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;
    const user = context.switchToHttp().getRequest<AppRequest>().authUser;
    if (user && roles.includes(user.role)) return true;
    throw new ForbiddenException({ statusCode: 403, code: 'FORBIDDEN_ROLE', message: '권한이 없습니다.' });
  }
}
