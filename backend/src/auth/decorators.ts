import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { UserRole } from '../database/enums.js';
import type { AppRequest, AuthUser } from '../common/request-context.js';

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';

/** 로그인 없이 부를 수 있는 경로. IP 1단계는 그래도 적용된다. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** 이 역할만 부를 수 있는 경로 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES, roles);

/** 로그인 사용자. JwtAuthGuard를 거친 경로에서만 쓴다. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const user = ctx.switchToHttp().getRequest<AppRequest>().authUser;
  if (!user) throw new Error('CurrentUser는 인증이 필요한 경로에서만 쓸 수 있습니다.');
  return user;
});
