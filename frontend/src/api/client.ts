// fetch 래퍼. 인증은 httpOnly 쿠키라 토큰을 직접 다루지 않는다.

/** 서버 오류 응답 { statusCode, code, message, ...추가 정보 } */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly body: Record<string, unknown>,
  ) {
    super(message)
  }
}

type Handler = () => void
let onBlocked: Handler = () => {}
let onUnauthenticated: Handler = () => {}

/** IP 차단(403 IP_NOT_ALLOWED)과 로그인 만료(401) 때 할 일. main.ts에서 연결한다. */
export function setGlobalHandlers(handlers: { blocked: Handler; unauthenticated: Handler }): void {
  onBlocked = handlers.blocked
  onUnauthenticated = handlers.unauthenticated
}

export const IP_NOT_ALLOWED = 'IP_NOT_ALLOWED'

interface Options {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  /** 401을 전역 처리(로그인 화면 이동)하지 않는다. 로그인·부팅 확인용. */
  skipAuthRedirect?: boolean
}

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    credentials: 'same-origin',
    headers: options.body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (res.status === 204) return undefined as T
  const text = await res.text()
  const data = text ? (JSON.parse(text) as unknown) : undefined
  if (res.ok) return data as T

  const body = (data ?? {}) as Record<string, unknown>
  const code = typeof body.code === 'string' ? body.code : `HTTP_${res.status}`
  const raw = body.message
  const message = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw.join('\n') : '요청을 처리하지 못했습니다.'

  if (res.status === 403 && code === IP_NOT_ALLOWED) onBlocked()
  else if (res.status === 401 && !options.skipAuthRedirect) onUnauthenticated()

  throw new ApiError(res.status, code, message, body)
}

export function errorMessage(e: unknown): string {
  return e instanceof ApiError ? e.message : '서버에 연결하지 못했습니다.'
}
