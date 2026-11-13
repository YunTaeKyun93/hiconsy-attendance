import { seoulToInstant } from '../common/date-time.js';
import { summarizeAttendance } from './attendance-summary.js';
import { DayType } from './types.js';

const at = (time: string) => seoulToInstant('2026-11-16', time);

describe('summarizeAttendance', () => {
  it('퇴근 전: 지각만 판정', () => {
    expect(summarizeAttendance(DayType.WORKDAY, at('10:00:01'), null)).toEqual({
      late: true,
      workSeconds: null,
      earlyLeave: null,
    });
  });

  it('WORKDAY 09:00~18:00: 정상, 8시간', () => {
    expect(
      summarizeAttendance(DayType.WORKDAY, at('09:00:00'), at('18:00:00')),
    ).toEqual({
      late: false,
      workSeconds: 8 * 3600,
      earlyLeave: false,
    });
  });

  it('REMOTE 11:29~20:00: 지각, 7시간 31분이라 조퇴', () => {
    expect(
      summarizeAttendance(DayType.REMOTE, at('11:29:00'), at('20:00:00')),
    ).toEqual({
      late: true,
      workSeconds: 7 * 3600 + 31 * 60,
      earlyLeave: true,
    });
  });

  it('HALF_OFF 12:00~16:00: 지각 판정 없음, 4시간이라 정상', () => {
    expect(
      summarizeAttendance(DayType.HALF_OFF, at('12:00:00'), at('16:00:00')),
    ).toEqual({
      late: null,
      workSeconds: 4 * 3600,
      earlyLeave: false,
    });
  });

  it('WEEKEND_WORK: 지각·조퇴 판정 없음, 근무시간만', () => {
    expect(
      summarizeAttendance(DayType.WEEKEND_WORK, at('13:00:00'), at('15:00:00')),
    ).toEqual({
      late: null,
      workSeconds: 2 * 3600,
      earlyLeave: null,
    });
  });
});
