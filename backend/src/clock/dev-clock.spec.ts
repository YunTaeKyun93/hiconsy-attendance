import { DevClock } from './dev-clock.js';

describe('DevClock', () => {
  it('지정한 시각부터 실제 시간만큼 흐른다', () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 10, 13, 10, 0, 0) });
    const clock = new DevClock();
    clock.set(new Date('2026-11-16T09:59:59+09:00'));
    expect(clock.now().toISOString()).toBe('2026-11-16T00:59:59.000Z');
    vi.advanceTimersByTime(2000);
    expect(clock.now().toISOString()).toBe('2026-11-16T01:00:01.000Z');
    clock.reset();
    expect(clock.offset).toBe(0);
    vi.useRealTimers();
  });
});
