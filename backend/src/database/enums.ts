export const UserRole = { MEMBER: 'MEMBER', LEAD: 'LEAD' } as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const CheckOutSource = { BUTTON: 'BUTTON', MANUAL: 'MANUAL' } as const;
export type CheckOutSource = (typeof CheckOutSource)[keyof typeof CheckOutSource];

export const RequestType = {
  ANNUAL: 'ANNUAL',
  REMOTE: 'REMOTE',
  OFF: 'OFF',
  WEEKEND_WORK: 'WEEKEND_WORK',
} as const;
export type RequestType = (typeof RequestType)[keyof typeof RequestType];

export const RequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELED: 'CANCELED',
} as const;
export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];
