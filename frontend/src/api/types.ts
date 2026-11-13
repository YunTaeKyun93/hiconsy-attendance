// 백엔드 응답 모양. 계산 값(잔여, 지각, 근무시간 등)은 서버가 계산해서 내려준다.

export type UserRole = 'MEMBER' | 'LEAD'
export type DayType = 'WORKDAY' | 'REMOTE' | 'HALF_OFF' | 'ANNUAL' | 'WEEKEND_WORK' | 'NON_WORKDAY'
export type RequestType = 'ANNUAL' | 'REMOTE' | 'OFF' | 'WEEKEND_WORK'
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED'
export type Presence = 'NONE' | 'NOT_CHECKED_IN' | 'WORKING' | 'CHECKED_OUT'

export interface Me {
  id: number
  loginId: string
  name: string
  role: UserRole
  hiredAt: string
}

export interface AttendanceView {
  id: number
  workDate: string
  dayType: DayType
  checkInAt: string
  checkOutAt: string | null
  checkOutSource: 'BUTTON' | 'MANUAL' | null
  late: boolean | null
  workSeconds: number | null
  earlyLeave: boolean | null
}

export interface UnrecordedView {
  workDate: string
  checkInAt: string
  min: string
  max: string
}

export interface MyAttendance {
  today: string
  todayType: DayType
  attendance: AttendanceView | null
  unrecorded: UnrecordedView[]
}

export interface BalanceView {
  today: string
  annual: { accrued: number; used: number; remaining: number }
  remote: { month: string; used: number; remaining: number }[]
  off: {
    remaining: number
    grants: { workDate: string; expiresOn: string; status: 'USABLE' | 'EXPIRED' | 'IN_USE' }[]
  }
}

export interface RequestView {
  id: number
  userId: number
  userName: string
  type: RequestType
  targetDate: string
  status: RequestStatus
  reason: string
  allowedIp: string | null
  startTime: string | null
  endTime: string | null
  offGrantWorkDate: string | null
  reviewedBy: number | null
  reviewedAt: string | null
  createdAt: string
  cancelable: boolean
  approvable: boolean
}

export interface BoardRow {
  userId: number
  name: string
  dayType: DayType
  presence: Presence
  attendance: AttendanceView | null
}

export interface BoardView {
  today: string
  rows: BoardRow[]
}

export interface IrregularRow extends AttendanceView {
  userId: number
  name: string
  kind: 'UNRECORDED' | 'MANUAL'
}

export interface DevClockView {
  now: string
  offsetMs: number
}

export interface SubmitRequestBody {
  type: RequestType
  targetDate: string
  reason: string
  allowedIp?: string
  startTime?: string
  endTime?: string
}
