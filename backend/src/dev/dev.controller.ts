import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Inject, Post, Put } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import { Public } from '../auth/decorators.js';
import { CLOCK } from '../clock/clock.js';
import type { DevClock } from '../clock/dev-clock.js';

export interface DevClockView {
  now: string;
  offsetMs: number;
}

/**
 * 개발 모드 전용 도구. 운영 모드에서는 모듈 자체가 등록되지 않는다(404).
 * 로그인 전에도 쓸 수 있도록 공개 경로. IP 1단계 가드는 그대로 적용된다.
 */
@Public()
@Controller('dev')
export class DevController {
  constructor(
    @Inject(CLOCK) private readonly clock: DevClock,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Get('clock')
  getClock(): DevClockView {
    return this.view();
  }

  /** body: { now: ISO 8601 (예: '2026-11-16T09:59:59+09:00') } */
  @Put('clock')
  setClock(@Body() body: unknown): DevClockView {
    const raw = (body as { now?: unknown } | undefined)?.now;
    const target = typeof raw === 'string' ? new Date(raw) : null;
    if (!target || Number.isNaN(target.getTime())) {
      throw new BadRequestException({ statusCode: 400, code: 'INVALID_INPUT', message: 'now에 ISO 8601 시각을 입력하세요.' });
    }
    this.clock.set(target);
    return this.view();
  }

  @Delete('clock')
  resetClock(): DevClockView {
    this.clock.reset();
    return this.view();
  }

  /**
   * 테스트 데이터 초기화: 출퇴근·신청·특별 연차·이력을 비우고 시계를 실제 시각으로 되돌린다. 사용자·공휴일은 유지.
   * "행을 삭제하지 않는다"·"이력은 쓰기 전용" 규칙의 개발 모드 전용 예외(DESIGN.md 13장).
   */
  @Post('reset')
  @HttpCode(200)
  async reset(): Promise<DevClockView> {
    await this.dataSource.query(
      'TRUNCATE TABLE attendances, requests, annual_grants, activity_logs RESTART IDENTITY',
    );
    this.clock.reset();
    return this.view();
  }

  private view(): DevClockView {
    return { now: this.clock.now().toISOString(), offsetMs: this.clock.offset };
  }
}
