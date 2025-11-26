# ☁️ 클라우드 배포 가이드

EcoNaviAR 서버를 클라우드에 배포하여 어디서나 접속 가능하도록 설정하는 방법입니다.

## 📋 목차

1. [배포 옵션 비교](#배포-옵션-비교)
2. [Railway 배포](#railway-배포-추천)
3. [Render 배포](#render-배포)
4. [Heroku 배포](#heroku-배포)
5. [앱 설정 변경](#앱-설정-변경)
6. [문제 해결](#문제-해결)

---

## 🎯 배포 옵션 비교

| 플랫폼 | 무료 티어 | 장점 | 단점 |
|--------|----------|------|------|
| **Railway** | ✅ $5 크레딧/월 | 간단한 설정, 자동 HTTPS | 크레딧 소진 시 유료 |
| **Render** | ✅ 제한적 | 무료 티어 제공, 자동 HTTPS | 15분 비활성 시 슬립 |
| **Heroku** | ❌ 유료만 | 안정적, 널리 사용됨 | 무료 티어 없음 |
| **Fly.io** | ✅ 제한적 | 빠른 배포, 글로벌 CDN | 설정 복잡 |
| **AWS/GCP** | ✅ 제한적 | 확장 가능, 강력함 | 설정 복잡, 비용 관리 필요 |

**추천:** Railway (가장 간단) 또는 Render (무료 티어)

---

## 🚂 Railway 배포 (추천)

### 1. Railway 계정 생성

1. [Railway](https://railway.app/) 접속
2. GitHub 계정으로 로그인
3. "New Project" 클릭

### 2. 프로젝트 배포

**방법 1: GitHub 연동 (추천)**

1. Railway 대시보드에서 "New Project" → "Deploy from GitHub repo"
2. `eco_navi` 저장소 선택
3. ⚠️ **중요:** "Settings" → "Source" 섹션에서 "Add Root Directory" 클릭
4. Root Directory에 `server` 입력
5. "Deploy" 클릭

**참고:** Railway가 루트 디렉토리를 배포하려고 하면 실패합니다. 반드시 Root Directory를 `server`로 설정해야 합니다.

**기존 서비스에 Root Directory 추가:**
1. Railway 대시보드에서 서비스 선택
2. "Settings" 탭 클릭
3. "Source" 섹션에서 "Add Root Directory" 클릭 (또는 기존 Root Directory 편집)
4. `server` 입력 후 저장
5. 재배포

**방법 2: Railway CLI 사용**

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 초기화
cd server
railway init

# 배포
railway up
```

### 3. 환경 변수 설정

Railway 대시보드에서 "Variables" 탭으로 이동하여 다음 변수 추가:

```env
PORT=3001
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this
```

**JWT_SECRET 생성:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. 데이터베이스 설정

Railway는 자동으로 SQLite 파일을 영구 저장소에 마운트합니다. 추가 설정 불필요.

### 5. 도메인 확인

배포 완료 후 Railway가 자동으로 생성한 도메인 확인:
- 예: `https://your-project-name.up.railway.app`
- 이 URL을 앱에서 사용

---

## 🎨 Render 배포

### 1. Render 계정 생성

1. [Render](https://render.com/) 접속
2. GitHub 계정으로 로그인

### 2. 새 Web Service 생성

1. Dashboard → "New +" → "Web Service"
2. GitHub 저장소 선택
3. 다음 설정 입력:
   - **Name:** `econavi-server`
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (또는 Starter)

### 3. 환경 변수 설정

"Environment" 섹션에서 다음 변수 추가:

```env
PORT=3001
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this
```

### 4. Persistent Disk 추가 (데이터베이스용)

1. "Disks" 섹션으로 이동
2. "Create Disk" 클릭
3. **Mount Path:** `/opt/render/project/src/data`
4. 서버 코드에서 데이터베이스 경로를 이 경로로 변경 필요

### 5. 도메인 확인

배포 완료 후 Render가 생성한 도메인 확인:
- 예: `https://econavi-server.onrender.com`
- 이 URL을 앱에서 사용

**참고:** Render 무료 티어는 15분간 요청이 없으면 슬립 모드로 전환됩니다. 첫 요청 시 깨어나는데 약 30초 걸릴 수 있습니다.

---

## 🟣 Heroku 배포

### 1. Heroku 계정 생성

1. [Heroku](https://www.heroku.com/) 접속
2. 계정 생성 (유료 플랜 필요)

### 2. Heroku CLI 설치

```bash
# macOS
brew tap heroku/brew && brew install heroku

# Windows
# https://devcenter.heroku.com/articles/heroku-cli 다운로드

# Linux
curl https://cli-assets.heroku.com/install.sh | sh
```

### 3. 로그인 및 앱 생성

```bash
heroku login
cd server
heroku create econavi-server
```

### 4. 환경 변수 설정

```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-super-secret-jwt-key-change-this
```

### 5. 배포

```bash
# Git 저장소에 Heroku remote 추가 (이미 자동 추가됨)
git push heroku main

# 또는 특정 브랜치
git push heroku feature/cloud-deployment:main
```

### 6. 데이터베이스 설정

Heroku는 파일 시스템이 임시이므로, PostgreSQL 사용 권장:

```bash
# PostgreSQL 추가
heroku addons:create heroku-postgresql:mini

# 환경 변수에 DATABASE_URL 자동 추가됨
```

서버 코드를 PostgreSQL로 변경 필요 (현재는 SQLite).

---

## 📱 앱 설정 변경

### 1. 서버 URL 업데이트

클라우드 배포 후 받은 URL을 앱에 설정:

**방법 1: 앱 내 설정 (권장)**

1. 앱 실행
2. 마이페이지 → "서버 설정"
3. 서버 URL 입력:
   - Railway: `https://your-project-name.up.railway.app`
   - Render: `https://econavi-server.onrender.com`
   - Heroku: `https://econavi-server.herokuapp.com`
4. "연결 테스트" 클릭
5. "저장" 클릭

**방법 2: 코드에서 기본값 변경**

`EcoNaviAR/src/config/api.ts` 파일 수정:

```typescript
// 개발 환경
const DEFAULT_API_URL = __DEV__ 
  ? 'http://10.0.2.2:3001'  // Android 에뮬레이터
  : 'https://your-cloud-url.com';  // 클라우드 URL
```

### 2. HTTPS 설정 확인

클라우드 플랫폼은 자동으로 HTTPS를 제공합니다. HTTP 대신 HTTPS를 사용하세요.

### 3. Android 네트워크 보안 설정

`EcoNaviAR/android/app/src/main/res/xml/network_security_config.xml`에서 HTTPS 도메인 허용 확인 (이미 설정되어 있음).

---

## 🔧 서버 코드 수정 사항

### 1. 포트 설정

서버는 `process.env.PORT`를 사용하므로 클라우드 플랫폼이 자동으로 설정합니다.

### 2. 데이터베이스 경로

**Railway/Render (Persistent Disk 사용 시):**

`server/database.js` 수정:

```javascript
const dbPath = process.env.DATABASE_PATH || './database.db';
const db = new sqlite3.Database(dbPath, (err) => {
  // ...
});
```

환경 변수에 `DATABASE_PATH=/data/database.db` 추가.

### 3. CORS 설정

프로덕션 환경에서는 특정 도메인만 허용:

`server/index.js` 수정:

```javascript
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://your-app-domain.com']  // 앱 도메인 (필요 시)
  : ['*'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
```

---

## 🐛 문제 해결

### 1. 배포 실패

**증상:** 배포가 실패하거나 빌드 에러

**해결:**
- `package.json`에 `engines` 필드 확인:
  ```json
  {
    "engines": {
      "node": ">=20",
      "npm": ">=9"
    }
  }
  ```
- 로그 확인: Railway/Render 대시보드의 "Logs" 탭

### 2. 데이터베이스 파일이 사라짐

**증상:** 재배포 후 데이터가 초기화됨

**해결:**
- Railway: 자동으로 영구 저장소에 마운트됨
- Render: Persistent Disk 추가 필요
- Heroku: PostgreSQL 사용 권장 (파일 시스템은 임시)

### 3. 연결 타임아웃

**증상:** 앱에서 서버 연결 실패

**해결:**
1. 서버 URL이 HTTPS인지 확인
2. 서버가 실행 중인지 확인 (Health check 엔드포인트 테스트)
3. Render 무료 티어는 첫 요청 시 깨어나는 시간 필요 (약 30초)

### 4. CORS 오류

**증상:** 브라우저에서 CORS 오류 발생

**해결:**
- `server/index.js`의 CORS 설정 확인
- 프로덕션에서는 특정 origin만 허용하도록 설정

### 5. 환경 변수 누락

**증상:** JWT_SECRET 오류 또는 기타 환경 변수 관련 오류

**해결:**
- 클라우드 플랫폼의 환경 변수 설정 확인
- `.env` 파일은 클라우드에 업로드되지 않음 (환경 변수로 직접 설정)

---

## 📊 모니터링

### Railway

- 대시보드에서 실시간 로그 확인
- 메트릭 (CPU, 메모리) 자동 수집
- 알림 설정 가능

### Render

- 대시보드에서 로그 확인
- 메트릭 (CPU, 메모리) 제공
- 알림 설정 가능

### Heroku

```bash
# 로그 확인
heroku logs --tail

# 메트릭 확인
heroku ps
```

---

## 💰 비용 예상

### Railway
- 무료: $5 크레딧/월 (제한적 사용 가능)
- 유료: $5/월부터 (사용량 기반)

### Render
- 무료: 제한적 (15분 슬립)
- 유료: $7/월부터 (Starter 플랜)

### Heroku
- 무료: 없음
- 유료: $7/월부터 (Eco Dyno)

---

## ✅ 체크리스트

배포 전 확인 사항:

- [ ] `server/package.json`에 `engines` 필드 추가
- [ ] 환경 변수 설정 (JWT_SECRET, NODE_ENV 등)
- [ ] 데이터베이스 경로 설정 (Persistent Disk 사용 시)
- [ ] CORS 설정 확인
- [ ] Health check 엔드포인트 테스트 (`/health`)
- [ ] 앱에서 서버 URL 업데이트
- [ ] HTTPS URL 사용 확인

---

## 🚀 다음 단계

1. **도메인 연결 (선택):**
   - Railway/Render에서 커스텀 도메인 설정 가능
   - 예: `api.econavi.com`

2. **모니터링 설정:**
   - 에러 추적 (Sentry 등)
   - 성능 모니터링

3. **백업 설정:**
   - 데이터베이스 정기 백업
   - Railway/Render는 자동 백업 제공

---

**추가 도움이 필요하시면 이슈를 생성해주세요!** ☁️🚀

