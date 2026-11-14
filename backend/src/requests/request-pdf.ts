import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import { toSeoulDateTime, type DateStr } from '../common/date-time.js';
import type { RequestStatus, RequestType } from '../database/enums.js';
import { offExpiry } from '../domain/off.js';

// 신청서 PDF (FR-REQ-03). 한글 표시를 위해 저장소의 나눔고딕(OFL)을 쓴다.
// src/requests, dist/requests 모두 backend/assets까지 두 단계 위다.
const FONT_DIR = join(import.meta.dirname, '..', '..', 'assets', 'fonts');
const FONT_REGULAR = join(FONT_DIR, 'NanumGothic-Regular.ttf');
const FONT_BOLD = join(FONT_DIR, 'NanumGothic-Bold.ttf');

const TYPE_LABEL: Record<RequestType, string> = {
  ANNUAL: '연차',
  REMOTE: '재택',
  OFF: '반일 OFF',
  WEEKEND_WORK: '주말·공휴일 근무',
};
const STATUS_LABEL: Record<RequestStatus, string> = {
  PENDING: '대기',
  APPROVED: '승인',
  REJECTED: '반려',
  CANCELED: '취소',
};

export interface RequestPdfData {
  id: number;
  requesterName: string;
  requesterLoginId: string;
  type: RequestType;
  targetDate: DateStr;
  status: RequestStatus;
  reason: string;
  allowedIp: string | null;
  startTime: string | null;
  endTime: string | null;
  offGrantWorkDate: DateStr | null;
  createdAt: Date;
  reviewerName: string | null;
  reviewedAt: Date | null;
  /** REJECTED만. 이 기능 전에 반려된 건은 null */
  rejectReason: string | null;
}

/** 다운로드 파일 이름: 근태신청서_{이름}_{유형}_{대상일}.pdf (파일 이름에 못 쓰는 문자는 '_'로) */
export function requestPdfFilename(name: string, type: RequestType, targetDate: DateStr): string {
  const safe = (s: string) => s.replace(/[\\/:*?"<>|\s]+/g, '_');
  return `근태신청서_${safe(name)}_${safe(TYPE_LABEL[type])}_${targetDate}.pdf`;
}

/** 표에 넣을 [항목, 값] 목록. 유형별로 필요한 줄만. */
export function requestPdfRows(d: RequestPdfData): [string, string][] {
  const rows: [string, string][] = [
    ['신청 번호', String(d.id)],
    ['신청자', `${d.requesterName} (${d.requesterLoginId})`],
    ['유형', TYPE_LABEL[d.type]],
    ['대상일', d.targetDate],
  ];
  if (d.allowedIp) {
    rows.push(['접속 IP', d.allowedIp]);
    rows.push(['시간대', `${d.startTime ?? ''} ~ ${d.endTime ?? ''}`]);
  }
  if (d.offGrantWorkDate) {
    rows.push(['사용 OFF', `${d.offGrantWorkDate} 근무분 (${offExpiry(d.offGrantWorkDate)}까지 사용 가능)`]);
  }
  rows.push(
    ['사유', d.reason],
    ['신청 일시', toSeoulDateTime(d.createdAt)],
    ['상태', STATUS_LABEL[d.status]],
  );
  // 취소는 본인이 한 것이라 처리자를 적지 않는다(reviewed_by는 이전 승인자일 수 있음).
  if (d.reviewedAt && d.status !== 'PENDING' && d.status !== 'CANCELED') {
    rows.push(['처리자', d.reviewerName ?? '-'], ['처리 일시', toSeoulDateTime(d.reviewedAt)]);
  }
  if (d.status === 'REJECTED') rows.push(['반려 사유', d.rejectReason ?? '-']);
  return rows;
}

/** printedAt은 주입한 시계 값. PDF 메타데이터의 생성 시각도 이 값으로 채운다(기본값은 실제 시계). */
export function buildRequestPdf(d: RequestPdfData, printedAt: Date): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 56,
    info: { Title: `근태 신청서 #${d.id}`, Author: '근태관리 시스템', CreationDate: printedAt, ModDate: printedAt },
  });
  doc.registerFont('regular', FONT_REGULAR);
  doc.registerFont('bold', FONT_BOLD);

  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const labelW = 110;

  doc.font('bold').fontSize(22).text('근태 신청서', { align: 'center' });
  doc.moveDown(1.5);

  let y = doc.y;
  doc.lineWidth(0.8).strokeColor('#444').moveTo(left, y).lineTo(left + width, y).stroke();
  for (const [label, value] of requestPdfRows(d)) {
    doc.font('regular').fontSize(11);
    const valueH = doc.heightOfString(value, { width: width - labelW - 20 });
    const rowH = Math.max(valueH, 14) + 16;
    doc.rect(left, y, labelW, rowH).fill('#f2f2f2');
    doc.fillColor('#000').font('bold').text(label, left + 10, y + 8, { width: labelW - 20 });
    doc.font('regular').text(value, left + labelW + 10, y + 8, { width: width - labelW - 20 });
    y += rowH;
    doc.strokeColor('#bbb').lineWidth(0.5).moveTo(left, y).lineTo(left + width, y).stroke();
  }
  doc.strokeColor('#444').lineWidth(0.8).moveTo(left, y).lineTo(left + width, y).stroke();

  doc
    .font('regular')
    .fontSize(9)
    .fillColor('#666')
    .text(`출력 일시: ${toSeoulDateTime(printedAt)} (KST)`, left, y + 24, { width, align: 'right' })
    .text('근태관리 시스템에서 출력한 문서입니다.', { width, align: 'right' });

  doc.end();
  return done;
}
