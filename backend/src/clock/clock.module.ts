import { Global, Module, type DynamicModule } from '@nestjs/common';
import { env } from '../config/env.js';
import { CLOCK } from './clock.js';
import { DevClock } from './dev-clock.js';
import { SystemClock } from './system-clock.js';

@Global()
@Module({})
export class ClockModule {
  /** 운영 모드: 실제 시계. 개발 모드: 조작 가능한 시계(/api/dev/clock은 DevModule). */
  static forRoot(): DynamicModule {
    return {
      module: ClockModule,
      providers: [{ provide: CLOCK, useClass: env.nodeEnv === 'production' ? SystemClock : DevClock }],
      exports: [CLOCK],
    };
  }
}
