import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { clientIp, type AppRequest, type AuthUser } from '../common/request-context.js';
import { AUTH_COOKIE, AUTH_COOKIE_OPTIONS } from './auth.constants.js';
import { AuthService, type MeResponse } from './auth.service.js';
import { CurrentUser, Public } from './decorators.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: unknown,
    @Req() req: AppRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeResponse> {
    const input = this.auth.parseLoginBody(body);
    // @Public이어도 IpStage1Guard는 실행되므로 access가 채워져 있다.
    const { token, user } = await this.auth.login(input, req.access!, clientIp(req), req.originalUrl);
    res.cookie(AUTH_COOKIE, token, AUTH_COOKIE_OPTIONS);
    return user;
  }

  /** 쿠키만 지운다. 토큰이 만료됐어도 로그아웃할 수 있게 공개 경로로 둔다. */
  @Public()
  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(AUTH_COOKIE, AUTH_COOKIE_OPTIONS);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<MeResponse> {
    return this.auth.me(user.id);
  }
}
