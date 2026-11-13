// 상태 색 정의. 모든 화면은 여기서만 색을 가져온다(라이트·다크 자동 전환되는 테마 토큰).
import type { DayType, Presence, RequestStatus, RequestType } from '@/api/types'

/** Vuetify 테마 색. 키를 color="..."로 쓴다. */
export const STATUS_PALETTE = {
  light: {
    'status-ok': '#2E7D32',
    'status-late': '#C62828',
    'status-early': '#E65100',
    'status-manual': '#1565C0',
    'status-unrecorded': '#C62828',
    'day-work': '#546E7A',
    'day-none': '#9E9E9E',
    'day-annual': '#3949AB',
    'day-remote': '#00897B',
    'day-off': '#8E24AA',
    'day-weekend': '#F9A825',
  },
  dark: {
    'status-ok': '#66BB6A',
    'status-late': '#EF5350',
    'status-early': '#FFA726',
    'status-manual': '#42A5F5',
    'status-unrecorded': '#EF5350',
    'day-work': '#90A4AE',
    'day-none': '#757575',
    'day-annual': '#7986CB',
    'day-remote': '#4DB6AC',
    'day-off': '#BA68C8',
    'day-weekend': '#FFD54F',
  },
} as const

export type StatusColor = keyof (typeof STATUS_PALETTE)['light']

export interface ChipSpec {
  label: string
  color: StatusColor
  /** 테두리만(미기록처럼 "비어 있음"을 뜻할 때) */
  outlined?: boolean
}

const DAY_TYPE: Record<DayType, ChipSpec> = {
  WORKDAY: { label: '근무일', color: 'day-work' },
  REMOTE: { label: '재택', color: 'day-remote' },
  HALF_OFF: { label: '반일 OFF', color: 'day-off' },
  ANNUAL: { label: '연차', color: 'day-annual' },
  WEEKEND_WORK: { label: '주말·공휴일 근무', color: 'day-weekend' },
  NON_WORKDAY: { label: '휴무', color: 'day-none' },
}

const PRESENCE: Record<Presence, ChipSpec> = {
  NONE: { label: '-', color: 'day-none' },
  NOT_CHECKED_IN: { label: '미출근', color: 'status-late', outlined: true },
  WORKING: { label: '근무 중', color: 'status-ok' },
  CHECKED_OUT: { label: '퇴근', color: 'day-work' },
}

const REQUEST_TYPE: Record<RequestType, ChipSpec> = {
  ANNUAL: { label: '연차', color: 'day-annual' },
  REMOTE: { label: '재택', color: 'day-remote' },
  OFF: { label: '반일 OFF', color: 'day-off' },
  WEEKEND_WORK: { label: '주말·공휴일 근무', color: 'day-weekend' },
}

const REQUEST_STATUS: Record<RequestStatus, ChipSpec> = {
  PENDING: { label: '대기', color: 'day-weekend' },
  APPROVED: { label: '승인', color: 'status-ok' },
  REJECTED: { label: '반려', color: 'status-late' },
  CANCELED: { label: '취소', color: 'day-none' },
}

/** 하루에 붙는 표시(정상 외의 상태) */
export const FLAG = {
  ok: { label: '정상', color: 'status-ok' },
  late: { label: '지각', color: 'status-late' },
  early: { label: '조퇴', color: 'status-early' },
  manual: { label: '직접 입력', color: 'status-manual' },
  unrecorded: { label: '미기록', color: 'status-unrecorded', outlined: true },
  absent: { label: '결근', color: 'status-late' },
} as const satisfies Record<string, ChipSpec>

export const dayTypeChip = (t: DayType): ChipSpec => DAY_TYPE[t]
export const presenceChip = (p: Presence): ChipSpec => PRESENCE[p]
export const requestTypeChip = (t: RequestType): ChipSpec => REQUEST_TYPE[t]
export const requestStatusChip = (s: RequestStatus): ChipSpec => REQUEST_STATUS[s]
