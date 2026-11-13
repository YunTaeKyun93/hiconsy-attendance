import { buildRequestPdf, requestPdfRows, type RequestPdfData } from './request-pdf.js';

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
