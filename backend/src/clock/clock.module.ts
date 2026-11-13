import { Global, Module, type DynamicModule } from '@nestjs/common';
import { env } from '../config/env.js';
import { CLOCK } from './clock.js';
import { DevClockController } from './dev-clock.controller.js';
import { DevClock } from './dev-clock.js';
import { SystemClock } from './system-clock.js';

@Global()
@Module({})
export class ClockModule {
  /** 운영 모드: 실제 시계만. 개발 모드: 조작 가능한 시계와 /api/dev/clock. */
  static forRoot(): DynamicModule {
    const production = env.nodeEnv === 'production';
    return {
      module: ClockModule,
      controllers: production ? [] : [DevClockController],
      providers: [{ provide: CLOCK, useClass: production ? SystemClock : DevClock }],
      exports: [CLOCK],
    };
  }
}
