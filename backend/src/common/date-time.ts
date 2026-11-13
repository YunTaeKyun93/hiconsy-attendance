// 날짜·시각 유틸 모음. 모든 판정은 Asia/Seoul 기준이며 서버 OS 시간대에 의존하지 않는다.
// Phase 1에서 이 모듈을 확장한다.

export const TIME_ZONE = 'Asia/Seoul';

const seoulDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** 시각 → 한국 날짜 'YYYY-MM-DD' */
export function toSeoulDate(instant: Date): string {
  return seoulDateFormatter.format(instant);
}
