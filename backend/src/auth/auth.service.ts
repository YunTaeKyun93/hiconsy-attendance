import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { ipNotAllowed } from '../access/access-errors.js';
import { ActivityLogService } from '../activity-log/activity-log.service.js';
import { CLOCK, type Clock } from '../clock/clock.js';
import { hashPassword, verifyPassword } from '../common/password.js';
import { env } from '../config/env.js';
import { User } from '../database/entities/user.entity.js';
import { evaluateStage2, type AccessContext } from '../domain/ip-access.js';
import type { JwtPayload } from './auth.constants.js';

export interface MeResponse {
  id: number;
  loginId: string;
  name: string;
  role: User['role'];
  hiredAt: string;
}

export interface LoginInput {
  loginId: string;
  password: string;
}

/** 아이디 없음과 비밀번호 틀림을 구분하지 않는다. */
const INVALID_CREDENTIALS = {
  statusCode: 401,
  code: 'INVALID_CREDENTIALS',
  message: '아이디 또는 비밀번호가 올바르지 않습니다.',
};

@Injectable()
export class AuthService {
  /** 없는 아이디도 해시 비교를 한 번 해서 응답 시간으로 아이디 존재를 알 수 없게 한다. */
  private readonly dummyHash = hashPassword('dummy-password-for-timing');

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly logs: ActivityLogService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  parseLoginBody(body: unknown): LoginInput {
    const { loginId, password } = (body ?? {}) as Record<string, unknown>;
    if (typeof loginId !== 'string' || typeof password !== 'string' || loginId === '' || password === '') {
      throw new BadRequestException({ statusCode: 400, code: 'INVALID_INPUT', message: '아이디와 비밀번호를 입력하세요.' });
    }
    return { loginId, password };
  }

  /** 성공하면 JWT와 사용자 정보를 돌려준다. access는 IP 1단계 결과, ip는 정규화된 클라이언트 IP. */
  async login(
    input: LoginInput,
    access: AccessContext,
    ip: string,
    path: string,
  ): Promise<{ token: string; user: MeResponse }> {
    const user = await this.users.findOne({ where: { loginId: input.loginId } });
    const ok = await verifyPassword(input.password, user?.passwordHash ?? (await this.dummyHash));

    if (!user || !ok) {
      await this.logs.write({ action: 'LOGIN_FAILURE', userId: null, payload: { loginId: input.loginId } }, { ip });
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    // 2단계를 로그인에도 적용한다. 통과 못 할 사용자에게 토큰을 주지 않는다.
    if (!evaluateStage2(access, user.id)) {
      await this.logs.write(
        { action: 'IP_DENIED', userId: user.id, payload: { stage: 2, method: 'POST', path } },
        { ip },
      );
      throw ipNotAllowed();
    }

    const iat = Math.floor(this.clock.now().getTime() / 1000);
    const payload: JwtPayload = { sub: user.id, role: user.role, iat, exp: iat + env.jwtExpiresHours * 3600 };
    const token = await this.jwt.signAsync(payload);

    await this.logs.write({ action: 'LOGIN_SUCCESS', userId: user.id, payload: {} }, { ip });
    return { token, user: toMe(user) };
  }

  async me(userId: number): Promise<MeResponse> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException({ statusCode: 404, code: 'USER_NOT_FOUND', message: '사용자가 없습니다.' });
    return toMe(user);
  }
}

function toMe(user: User): MeResponse {
  return { id: user.id, loginId: user.loginId, name: user.name, role: user.role, hiredAt: user.hiredAt };
}
