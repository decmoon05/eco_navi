# 🔄 데이터베이스 동기화 가이드

클라우드 서버와 로컬 서버 간 사용자 정보를 동기화하는 방법입니다.

## 📋 목차

1. [동기화 개요](#동기화-개요)
2. [동기화 스크립트 사용법](#동기화-스크립트-사용법)
3. [API를 통한 수동 동기화](#api를-통한-수동-동기화)
4. [주의사항](#주의사항)

---

## 1. 동기화 개요

데이터베이스 동기화는 한 서버의 데이터를 다른 서버로 복사하는 과정입니다.

**동기화 방향:**
- **로컬 → 클라우드**: 로컬에서 작업한 데이터를 클라우드에 업로드
- **클라우드 → 로컬**: 클라우드의 최신 데이터를 로컬로 다운로드

**동기화되는 데이터:**
- 사용자 정보 (users)
- 이동 기록 (trips)
- 업적 (user_achievements)
- 상품 정보 (products)
- 상품 교환 기록 (user_products)
- 퀘스트 진행 상황 (user_quests)

---

## 2. 동기화 스크립트 사용법

### 전제 조건

- Node.js가 설치되어 있어야 합니다
- 두 서버 모두 실행 중이어야 합니다
- admin 계정이 두 서버에 모두 존재해야 합니다

### 기본 사용법

```bash
cd server
node sync-database.js <source-url> <target-url> <admin-username> <admin-password>
```

### 예시

#### 로컬 → 클라우드 동기화

```bash
node sync-database.js \
  http://localhost:3001 \
  https://econavi-production.up.railway.app \
  admin \
  3297
```

#### 클라우드 → 로컬 동기화

```bash
node sync-database.js \
  https://econavi-production.up.railway.app \
  http://localhost:3001 \
  admin \
  3297
```

#### 핫스팟 IP 사용 시

```bash
node sync-database.js \
  http://10.223.145.79:3001 \
  https://econavi-production.up.railway.app \
  admin \
  3297
```

### 실행 결과

```
============================================================
데이터베이스 동기화 시작
소스: http://localhost:3001
대상: https://econavi-production.up.railway.app
============================================================
[http://localhost:3001] 로그인 중...
[http://localhost:3001] 데이터베이스 백업 중...
백업 완료: 6개 테이블
  - users: 3개 레코드
  - trips: 15개 레코드
  - user_achievements: 5개 레코드
  - products: 3개 레코드
  - user_products: 2개 레코드
  - user_quests: 8개 레코드
[https://econavi-production.up.railway.app] 로그인 중...
[https://econavi-production.up.railway.app] 데이터베이스 복원 중...
============================================================
✅ 데이터베이스 동기화 완료!
============================================================
```

---

## 3. API를 통한 수동 동기화

스크립트를 사용할 수 없는 경우, API를 직접 호출하여 수동으로 동기화할 수 있습니다.

### 3.1 백업 (소스 서버)

**요청:**
```bash
# 1. 로그인하여 토큰 받기
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"3297"}'

# 2. 백업 데이터 가져오기
curl -X GET http://localhost:3001/admin/backup \
  -H "Authorization: Bearer <token>" \
  > backup.json
```

**응답:**
```json
{
  "timestamp": "2025-01-24T10:30:00.000Z",
  "version": "1.0",
  "data": {
    "users": [...],
    "trips": [...],
    "user_achievements": [...],
    "products": [...],
    "user_products": [...],
    "user_quests": [...]
  }
}
```

### 3.2 복원 (대상 서버)

**요청:**
```bash
# 1. 로그인하여 토큰 받기
curl -X POST https://econavi-production.up.railway.app/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"3297"}'

# 2. 백업 데이터 복원
curl -X POST https://econavi-production.up.railway.app/admin/restore \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d @backup.json
```

---

## 4. 주의사항

### ⚠️ 데이터 덮어쓰기

**복원 작업은 대상 서버의 모든 데이터를 삭제하고 소스 서버의 데이터로 교체합니다.**

- 복원 전에 백업을 권장합니다
- 중요한 데이터가 있으면 미리 확인하세요

### 🔒 보안

- admin 계정 비밀번호를 스크립트에 하드코딩하지 마세요
- 환경 변수나 설정 파일을 사용하세요

**개선 예시:**
```bash
# .env 파일 사용
ADMIN_USERNAME=admin
ADMIN_PASSWORD=3297

# 스크립트 수정
const adminUsername = process.env.ADMIN_USERNAME || args[2];
const adminPassword = process.env.ADMIN_PASSWORD || args[3];
```

### 🔄 동기화 전략

**양방향 동기화는 충돌을 일으킬 수 있습니다.**

권장 방법:
1. **단방향 동기화**: 항상 한 방향으로만 동기화
   - 개발 중: 로컬 → 클라우드
   - 프로덕션: 클라우드 → 로컬 (읽기 전용)

2. **마지막 수정 시간 기반**: 각 레코드에 `updated_at` 필드를 추가하여 최신 데이터만 동기화 (향후 구현 가능)

### 📊 대용량 데이터

- 대용량 데이터베이스의 경우 동기화에 시간이 걸릴 수 있습니다
- 네트워크 연결이 불안정하면 실패할 수 있습니다
- 타임아웃 설정을 조정해야 할 수 있습니다

### 🧪 테스트

동기화 후 다음을 확인하세요:
1. 사용자 목록이 올바르게 복원되었는지
2. 이동 기록이 모두 있는지
3. 포인트와 업적이 정확한지

---

## 5. 자동화 (선택 사항)

### Windows 작업 스케줄러

매일 자동으로 동기화하려면:

1. `sync-daily.bat` 파일 생성:
```batch
@echo off
cd /d C:\Users\WannaGoHome\Desktop\eco_navi\server
node sync-database.js http://localhost:3001 https://econavi-production.up.railway.app admin 3297
```

2. 작업 스케줄러에서 매일 실행하도록 설정

### Linux/Mac Cron

```bash
# 매일 오전 3시에 동기화
0 3 * * * cd /path/to/eco_navi/server && node sync-database.js http://localhost:3001 https://econavi-production.up.railway.app admin 3297
```

---

**추가 도움이 필요하시면 이슈를 생성해주세요!** 🔄

