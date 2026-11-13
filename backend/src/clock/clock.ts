/** 현재 시각의 유일한 출처. 서비스는 이 인터페이스로만 현재 시각을 얻는다. */
export interface Clock {
  now(): Date;
}

export const CLOCK = Symbol('CLOCK');
