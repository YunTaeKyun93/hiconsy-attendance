# CLAUDE.md

채용 과제: 팀 내부 근태관리 시스템. 마감 2026-11-16 23:59:59 (KST).
스펙은 `docs/DESIGN.md`가 기준이다. 구현 전에 반드시 읽는다.

## 작업 규칙

- DESIGN.md와 다르게 구현해야 할 이유가 생기면 **코드를 쓰기 전에 멈추고 사용자에게 묻는다.** 임의로 규칙을 바꾸지 않는다.
- DESIGN.md "13. 미정" 항목은 해당 단계에 들어가기 전에 사용자에게 선택지를 제시하고 결정을 받는다.
- 한 단계(Phase)를 끝내면 변경 파일 목록과 확인 방법을 요약하고 멈춘다. 다음 단계는 사용자 승인 후 진행한다.
- 관련된 변경은 한 번에 끝낸다. 파일을 나눠 여러 차례에 걸쳐 고치지 않는다.
- 요구사항(FR) 표에 없는 기능을 추가하지 않는다.
- DB 데이터를 지우기 전에 현재 행을 확인하고, 내가 만들지 않은 데이터가 있으면 묻는다.

## 스택

- 백엔드: NestJS, TypeORM, PostgreSQL
- 프론트: Vue 3, Vite, TypeScript, Pinia, Vue Router, Vuetify
- 실행: PostgreSQL만 Docker, 앱은 로컬 실행. 루트 `package.json`에서 `concurrently`로 동시 실행
- Node 24 이상 (`.nvmrc`, 루트 `package.json` engines)
- 개발 환경: Windows + WSL2(Ubuntu). 브라우저는 Windows, 서버는 WSL에서 실행.
  재택 IP 테스트는 WSL 미러 네트워크 모드에서 내부망 IP로 접속해 확인한다.

```
repo/
├── package.json        setup, dev 스크립트
├── docker-compose.yml  PostgreSQL만
├── .env.example
├── backend/
├── frontend/
├── docs/
└── README.md
```

목표 명령어: `npm run setup` (설치, DB 실행, 마이그레이션, 시드) → `npm run dev`. 평가자가 Windows일 수 있으므로 bash 전용 문법을 쓰지 않는다.

## 반드시 지킬 것

### 시간
- 현재 시각은 Clock provider에서만 얻는다. `new Date()`(인자 없이), `Date.now()`, SQL `now()` / `DEFAULT now()` 금지.
- `@CreateDateColumn`, `@UpdateDateColumn` 금지. 시각 칸은 서비스에서 Clock 값으로 채운다.
- 날짜와 시각 판정은 Asia/Seoul 기준. 서버 OS 시간대에 의존하지 않는다.
- `date` 칸(`work_date`, `target_date`, `hired_at`, `holidays.date`)은 `'YYYY-MM-DD'` 문자열로 다룬다. `Date` 객체로 바꾸지 않는다.
- 날짜·시각 유틸은 한 모듈에 모은다.

### DB
- `synchronize: true` 금지. 마이그레이션으로 관리한다.
- 부분 UNIQUE 인덱스는 DESIGN.md 2장대로 `@Index({ unique: true, where: ... })`로 건다.
- 행을 삭제하지 않는다. 취소·반려는 상태 변경.
- 잔여, 적립, OFF 지급, 지각·조퇴 여부를 저장하는 칸을 만들지 않는다.

### 로그
- `activity_logs`는 쓰기 전용. 어떤 비즈니스 로직도 읽지 않는다.
- 행동별 `payload` 타입은 TypeScript 유니언 타입으로 정의한다.

### 보안
- `trust proxy`는 `'loopback'`. `true` 금지.
- IP 비교 전 `::ffff:` 접두사 제거.
- 연구실 IP는 env `LAB_IPS`(쉼표 구분). DB에 두지 않는다.
- 미기록 퇴근 강제, 잔여 검사, 기한 검사, IP 검사는 전부 서버에서 한다. 프론트 검사는 보조.
- 비밀번호는 해시로 저장.

### 공휴일
- 요청 처리 중 외부 API를 호출하지 않는다. `holidays` 테이블만 읽는다.
- 동기화는 CLI(`npm run sync:holidays`)로만. 키가 없으면 안내 후 종료.

## 테스트

- 판정·계산 로직은 DB 없는 순수 함수로 만들고 단위 테스트를 단다.
- DESIGN.md의 예시 표는 전부 테스트 케이스로 옮긴다.
- 최소 대상: 지각 경계, 점심 차감, 근무시간·조퇴(유형별), 연차 적립, 재택 월 횟수, OFF 만료·선입선출, 직전 영업일·신청 기한, IP 정규화.

## 구현 순서

1. **Phase 0 세팅**: 루트 스크립트, docker-compose, NestJS·Vue 초기화, TypeORM 연결, 엔티티 5개와 첫 마이그레이션, 사용자·공휴일 시드, 공휴일 동기화 CLI, Clock provider
2. **Phase 1 도메인 함수 + 테스트**: 날짜 유틸, 영업일·기한, 날짜 유형, 출퇴근 판정, 근무시간, 연차 적립, 재택 횟수, OFF 선택
3. **Phase 2 인증·IP·로그**: 로그인, 역할, IP 2단계 가드, 이력 기록
4. **Phase 3 출퇴근 API**: 출근, 퇴근, 미기록 퇴근 직접 입력, 주말 근무 대조
5. **Phase 4 신청 API**: 신청, 취소, 승인·반려, 잔여 조회
6. **Phase 5 화면**: 로그인, 내 카드, 출퇴근, 미기록 모달, 신청서, 팀 보드, 미기록 목록, 승인 화면, 개발 모드 시계 조작
7. **Phase 6 선택 기능**: 월별 정산 → PDF → (여유 시) 특별 연차 지급
8. **Phase 7 README**: 실행 방법, 시드 계정, 제도 해석 규칙(DESIGN.md 4~7장), 한계(12장), 확장 아이디어
