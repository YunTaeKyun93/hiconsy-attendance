import { buildRequestPdf, requestPdfFilename, requestPdfRows, type RequestPdfData } from './request-pdf.js';

const base: RequestPdfData = {
  id: 7,
  requesterName: '김근태',
  requesterLoginId: 'kim',
  type: 'ANNUAL',
  targetDate: '2026-11-18',
  status: 'APPROVED',
  reason: '개인 사정',
  allowedIp: null,
  startTime: null,
  endTime: null,
  offGrantWorkDate: null,
  createdAt: new Date('2026-11-13T01:00:00Z'),
  reviewerName: '리드',
  reviewedAt: new Date('2026-11-13T02:30:00Z'),
  rejectReason: null,
};

describe('requestPdfRows', () => {
  it('승인된 연차: 처리자·처리 일시(KST) 포함, IP·OFF 줄 없음', () => {
    expect(requestPdfRows(base)).toEqual([
      ['신청 번호', '7'],
      ['신청자', '김근태 (kim)'],
      ['유형', '연차'],
      ['대상일', '2026-11-18'],
      ['사유', '개인 사정'],
      ['신청 일시', '2026-11-13 10:00:00'],
      ['상태', '승인'],
      ['처리자', '리드'],
      ['처리 일시', '2026-11-13 11:30:00'],
    ]);
  });

  it('재택: IP와 시간대, 대기 중이면 처리자 없음', () => {
    const rows = requestPdfRows({
      ...base,
      type: 'REMOTE',
      status: 'PENDING',
      allowedIp: '192.168.0.5',
      startTime: '09:00:00',
      endTime: '18:00:00',
      reviewerName: null,
      reviewedAt: null,
    });
    expect(rows).toContainEqual(['접속 IP', '192.168.0.5']);
    expect(rows).toContainEqual(['시간대', '09:00:00 ~ 18:00:00']);
    expect(rows.map((r) => r[0])).not.toContain('처리자');
  });

  it('OFF: 사용한 지급 건과 만료일', () => {
    expect(requestPdfRows({ ...base, type: 'OFF', offGrantWorkDate: '2026-11-14' })).toContainEqual([
      '사용 OFF',
      '2026-11-14 근무분 (2026-12-14까지 사용 가능)',
    ]);
  });

  it('취소된 신청은 이전 승인자를 처리자로 적지 않는다', () => {
    expect(requestPdfRows({ ...base, status: 'CANCELED' }).map((r) => r[0])).not.toContain('처리자');
  });
});

describe('buildRequestPdf', () => {
  it('PDF를 만들고 생성 시각 메타데이터는 주입한 시각', async () => {
    const buf = await buildRequestPdf(base, new Date('2026-11-16T00:30:00Z'));
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buf.toString('latin1')).toContain('D:20261116003000Z');
  });
});

describe('반려 사유', () => {
  it('반려 건은 처리자 뒤에 반려 사유 줄', () => {
    const rows = requestPdfRows({ ...base, status: 'REJECTED', rejectReason: '마감 주간이라 어렵습니다' });
    expect(rows.slice(-3)).toEqual([
      ['처리자', '리드'],
      ['처리 일시', '2026-11-13 11:30:00'],
      ['반려 사유', '마감 주간이라 어렵습니다'],
    ]);
  });

  it('기능 도입 전에 반려된 건(사유 없음)은 -', () => {
    expect(requestPdfRows({ ...base, status: 'REJECTED' })).toContainEqual(['반려 사유', '-']);
  });

  it('반려가 아니면 반려 사유 줄 없음', () => {
    expect(requestPdfRows(base).map((r) => r[0])).not.toContain('반려 사유');
  });
});

describe('requestPdfFilename', () => {
  it('근태신청서_{이름}_{유형}_{대상일}.pdf', () => {
    expect(requestPdfFilename('김근태', 'ANNUAL', '2026-11-18')).toBe('근태신청서_김근태_연차_2026-11-18.pdf');
  });

  it('유형 이름의 공백은 _로', () => {
    expect(requestPdfFilename('김근태', 'OFF', '2026-11-18')).toBe('근태신청서_김근태_반일_OFF_2026-11-18.pdf');
    expect(requestPdfFilename('김근태', 'WEEKEND_WORK', '2026-11-21')).toBe('근태신청서_김근태_주말·공휴일_근무_2026-11-21.pdf');
  });
});
