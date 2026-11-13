import type { DayType, Presence, RequestStatus, RequestType } from '@/api/types'

export const DAY_TYPE_LABEL: Record<DayType, string> = {
  WORKDAY: '근무일',
  REMOTE: '재택',
  HALF_OFF: '반일 OFF',
  ANNUAL: '연차',
  WEEKEND_WORK: '주말·공휴일 근무',
  NON_WORKDAY: '휴무',
}

export const DAY_TYPE_COLOR: Record<DayType, string> = {
  WORKDAY: 'default',
  REMOTE: 'teal',
  HALF_OFF: 'purple',
  ANNUAL: 'blue',
  WEEKEND_WORK: 'orange',
  NON_WORKDAY: 'grey',
}

export const PRESENCE_LABEL: Record<Presence, string> = {
  NONE: '-',
  NOT_CHECKED_IN: '미출근',
  WORKING: '근무 중',
  CHECKED_OUT: '퇴근',
}

export const PRESENCE_COLOR: Record<Presence, string> = {
  NONE: 'grey',
  NOT_CHECKED_IN: 'error',
  WORKING: 'success',
  CHECKED_OUT: 'default',
}

export const REQUEST_TYPE_LABEL: Record<RequestType, string> = {
  ANNUAL: '연차',
  REMOTE: '재택',
  OFF: '반일 OFF',
  WEEKEND_WORK: '주말·공휴일 근무',
}

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  PENDING: '대기',
  APPROVED: '승인',
  REJECTED: '반려',
  CANCELED: '취소',
}

export const REQUEST_STATUS_COLOR: Record<RequestStatus, string> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  CANCELED: 'grey',
}
