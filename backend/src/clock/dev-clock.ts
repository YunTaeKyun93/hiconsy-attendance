import type { Clock } from './clock.js';
import { SystemClock } from './system-clock.js';

/**
 * 개발 모드 시계 (DESIGN.md 8장, 13장). 실제 시각 + 오프셋이라 지정한 시각부터 계속 흐른다.
 * 설정은 메모리에만 있어 서버를 다시 켜면 실제 시각으로 돌아간다. 운영 모드에서는 쓰지 않는다.
 */
export class DevClock implements Clock {
  private offsetMs = 0;
  private readonly system = new SystemClock();

  now(): Date {
    return new Date(this.system.now().getTime() + this.offsetMs);
  }

  /** 지금이 target이 되도록 오프셋을 맞춘다. */
  set(target: Date): void {
    this.offsetMs = target.getTime() - this.system.now().getTime();
  }

  reset(): void {
    this.offsetMs = 0;
  }

  get offset(): number {
    return this.offsetMs;
  }
}
