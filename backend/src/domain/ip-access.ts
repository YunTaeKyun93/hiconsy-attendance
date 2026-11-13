import { toSeoulDate, toSeoulTime, type DateStr, type TimeStr } from '../common/date-time.js';

// DESIGN.md 6장 접속 제한. DB 없이 판정만 한다.

/** IPv4-mapped IPv6 접두사(`::ffff:`)를 떼고 소문자로 맞춘다. */
export function normalizeIp(ip: string): string {
  const trimmed = ip.trim().toLowerCase();
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(trimmed);
  return mapped ? mapped[1] : trimmed;
}

/** env LAB_IPS(쉼표 구분) → 정규화한 IP 집합 */
export function parseLabIps(raw: string | undefined): ReadonlySet<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '')
      .map(normalizeIp),
  );
}

/** 이 IP를 적은 APPROVED REMOTE·WEEKEND_WORK 신청에서 판정에 필요한 부분 */
export interface AccessGrant {
  userId: number;
  targetDate: DateStr;
  startTime: TimeStr;
  endTime: TimeStr;
}

/** 현재 시각이 신청 시간대 안인지. 한국 날짜가 대상일이고 start ≤ 현재(초 아래 버림) ≤ end. */
export function isWithinAccessWindow(now: Date, grant: AccessGrant): boolean {
  if (toSeoulDate(now) !== grant.targetDate) return false;
  const time = toSeoulTime(now);
  return grant.startTime <= time && time <= grant.endTime;
}

export type AccessContext = { lab: true } | { lab: false; ownerIds: readonly number[] };

/**
 * 1단계(모든 요청). 연구실 IP면 통과.
 * 아니면 시간대 안의 신청이 하나라도 있어야 통과하고, 그 신청자들을 2단계용으로 넘긴다.
 * 통과하지 못하면 null.
 */
export function evaluateStage1(
  ip: string,
  labIps: ReadonlySet<string>,
  grants: readonly AccessGrant[],
  now: Date,
): AccessContext | null {
  const normalized = normalizeIp(ip);
  if (labIps.has(normalized)) return { lab: true };
  const ownerIds = [...new Set(grants.filter((g) => isWithinAccessWindow(now, g)).map((g) => g.userId))];
  return ownerIds.length > 0 ? { lab: false, ownerIds } : null;
}

/** 2단계(인증 이후). 연구실 IP가 아니면 그 신청이 로그인한 본인 것이어야 한다. */
export function evaluateStage2(access: AccessContext, userId: number): boolean {
  return access.lab || access.ownerIds.includes(userId);
}
