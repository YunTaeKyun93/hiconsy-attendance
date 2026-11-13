import { BadRequestException, Body, Controller, Delete, Get, Inject, Put } from '@nestjs/common';
import { Public } from '../auth/decorators.js';
import { CLOCK } from './clock.js';
import type { DevClock } from './dev-clock.js';

export interface DevClockView {
  now: string;
  offsetMs: number;
}

/**
 * 개발 모드에서만 등록된다(운영 모드는 404). 로그인 전에도 쓸 수 있도록 공개 경로.
 * IP 1단계 가드는 그대로 적용된다.
 */
@Public()
@Controller('dev/clock')
export class DevClockController {
  constructor(@Inject(CLOCK) private readonly clock: DevClock) {}

  @Get()
  get(): DevClockView {
    return this.view();
  }

  /** body: { now: ISO 8601 (예: '2026-11-16T09:59:59+09:00') } */
  @Put()
  set(@Body() body: unknown): DevClockView {
    const raw = (body as { now?: unknown } | undefined)?.now;
    const target = typeof raw === 'string' ? new Date(raw) : null;
    if (!target || Number.isNaN(target.getTime())) {
      throw new BadRequestException({ statusCode: 400, code: 'INVALID_INPUT', message: 'now에 ISO 8601 시각을 입력하세요.' });
    }
    this.clock.set(target);
    return this.view();
  }

  @Delete()
  reset(): DevClockView {
    this.clock.reset();
    return this.view();
  }

  private view(): DevClockView {
    return { now: this.clock.now().toISOString(), offsetMs: this.clock.offset };
  }
}
