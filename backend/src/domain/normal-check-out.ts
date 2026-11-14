import { seoulToInstant, toSeoulDate, truncateToSecond } from '../common/date-time.js';
import { judgeButtonCheckOut } from './attendance-rules.js';
import { DayType } from './types.js';
import { isEarlyLeave, requiredWorkSeconds, workSeconds } from './work-time.js';

const HOUR_MS = 3_600_000;

/**
 * 정상 퇴근 가능 시각: 이 시각 이후 그날 언제 퇴근 버튼을 눌러도 버튼 퇴근이 허용되고 조퇴가 아닌 가장 이른 시각.
 * 판정은 기존 함수(judgeButtonCheckOut의 16:00 제한, workSeconds의 점심 차감, isEarlyLeave의 기준)를 그대로 쓴다.
 *
 * 점심 차감 때문에 근무시간은 퇴근 12:30:00에서 1시간 줄어든다(그 앞뒤로는 늘어나기만 함).
 * 그래서 반일 OFF로 07:30 초과 08:30 미만에 출근하면 "처음 4시간이 되는 시각" 뒤에 다시 조퇴 구간이 생긴다.
 * 예: 08:00 출근 → 12:00~12:29:59 정상, 12:30~12:59:59 조퇴, 13:00부터 정상 → 13:00:00을 돌려준다.
 *
 * 판정이 없는 유형(주말 근무 등)이거나 그날(23:59:59) 안에 없으면 null.
 */
export function normalCheckOutFrom(dayType: DayType, checkInAt: Date): Date | null {
  const required = requiredWorkSeconds(dayType);
  if (required === null) return null;

  const date = toSeoulDate(checkInAt);
  const lunchBoundary = seoulToInstant(date, '12:30:00');
  const endOfDay = seoulToInstant(date, '23:59:59');
  const ok = (t: Date) =>
    t >= checkInAt &&
    t <= endOfDay &&
    judgeButtonCheckOut(dayType, t).ok &&
    isEarlyLeave(dayType, workSeconds(checkInAt, t)) === false;
  // 12:30 앞뒤 구간에서 근무시간은 각각 늘어나기만 하므로, t와 12:30이 모두 정상이면 t 이후 그날 내내 정상이다.
  const stable = (t: Date) => ok(t) && (t >= lunchBoundary || ok(lunchBoundary));

  // 답은 점심 없이 기준을 채우는 시각, 점심 포함해 채우는 시각, 버튼 퇴근이 열리는 시각 중 하나다.
  const start = truncateToSecond(checkInAt) + required * 1000;
  const candidates = [new Date(start), new Date(start + HOUR_MS), seoulToInstant(date, '16:00:00')].sort(
    (a, b) => a.getTime() - b.getTime(),
  );
  return candidates.find(stable) ?? null;
}
