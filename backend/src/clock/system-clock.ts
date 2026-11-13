import { Injectable } from '@nestjs/common';
import type { Clock } from './clock.js';

/** 실제 시계. 프로젝트에서 인자 없는 new Date()가 허용되는 유일한 곳이다. */
@Injectable()
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
