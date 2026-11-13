// 행동별 이력 모양. action에 따라 payload 모양이 정해진다.
// 새 행동은 해당 Phase에서 이 유니언에 추가한다.

interface LoginSuccess {
  action: 'LOGIN_SUCCESS';
  userId: number;
  payload: Record<string, never>;
}

/** 비밀번호는 절대 넣지 않는다. 시도한 loginId까지만. */
interface LoginFailure {
  action: 'LOGIN_FAILURE';
  userId: null;
  payload: { loginId: string };
}

/** IP 가드 거절. 1단계는 사용자를 모르므로 userId가 null, 2단계는 로그인한(또는 로그인 시도한) 사용자. */
interface IpDenied {
  action: 'IP_DENIED';
  userId: number | null;
  payload: { stage: 1 | 2; method: string; path: string };
}

export type ActivityEntry = LoginSuccess | LoginFailure | IpDenied;

export type ActivityAction = ActivityEntry['action'];
export type ActivityPayload = ActivityEntry['payload'];

/** 모든 이력에 공통인 칸 */
export interface ActivityMeta {
  ip: string;
  targetType?: string;
  targetId?: number;
}
