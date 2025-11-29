# 🚂 Railway 배포 설정 가이드

Railway에서 EcoNaviAR 서버를 배포하는 단계별 가이드입니다.

## ⚠️ 중요: Root Directory 설정

Railway는 기본적으로 프로젝트 루트를 배포하려고 합니다. 하지만 우리는 `server` 디렉토리만 배포해야 합니다.

## 📋 설정 단계

### 1. Source 설정

**Settings → Source** 섹션에서:

1. **Source Repo:** `decmoon05/eco_navi` (이미 연결됨)
2. **Branch:** `feature/cloud-deployment` (또는 `main`)
3. **Root Directory:** ⚠️ **반드시 설정 필요**
   - "Add Root Directory" 클릭
   - `server` 입력
   - 저장

### 2. Build 설정

**Settings → Build** 섹션에서:

- **Builder:** Railpack (기본값 유지)
- **Custom Build Command:** 비워두기 (기본값 사용)
- **Watch Paths:** 비워두기

### 3. Deploy 설정

**Settings → Deploy** 섹션에서:

- **Custom Start Command:** `npm start` (또는 비워두기 - package.json의 start 스크립트 사용)
- **Healthcheck Path:** `/health` (선택사항)

### 4. 환경 변수 설정

**Variables** 탭에서 다음 변수 추가:

```
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=production
PORT=3001
```

**JWT_SECRET 생성 방법:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 5. 배포 확인 및 URL 확인

1. **Deployments** 탭에서 배포 상태 확인
2. **서버 URL 확인 방법:**
   
   **방법 1: Networking 탭 (권장)**
   - 상단 네비게이션에서 **"Networking"** 탭 클릭
   - "Domains" 섹션에서 생성된 URL 확인
   - 예: `https://eco-navi-production.up.railway.app`
   
   **방법 2: 서비스 카드에서**
   - Architecture 화면의 서비스 카드(eco_navi) 클릭
   - 상세 정보에서 "Generate Domain" 또는 기존 도메인 확인
   
   **방법 3: Settings → Networking**
   - Settings 탭 → Networking 섹션
   - "Generate Domain" 버튼 클릭하여 도메인 생성
   - 또는 기존 도메인 확인

3. URL로 `/health` 엔드포인트 테스트:
   ```
   https://your-service.up.railway.app/health
   ```
   브라우저에서 접속하여 `{"status":"ok",...}` 응답 확인

## 🔧 문제 해결

### Root Directory가 설정되지 않았을 때

**증상:**
- 배포가 실패함
- 빌드 로그에 `yarn run build` 또는 React 관련 에러 표시

**해결:**
1. Settings → Source로 이동
2. "Add Root Directory" 클릭
3. `server` 입력
4. 저장 후 재배포

### 환경 변수가 설정되지 않았을 때

**증상:**
- 서버가 시작되지 않음
- JWT_SECRET 관련 에러

**해결:**
1. Variables 탭으로 이동
2. 필요한 환경 변수 추가
3. 재배포

### 포트 관련 에러

Railway는 자동으로 `PORT` 환경 변수를 설정합니다. 서버 코드는 이미 `process.env.PORT`를 사용하므로 추가 설정 불필요합니다.

## 📝 체크리스트

배포 전 확인:

- [ ] Root Directory가 `server`로 설정됨
- [ ] Branch가 올바른 브랜치로 설정됨 (`feature/cloud-deployment` 또는 `main`)
- [ ] 환경 변수 `JWT_SECRET` 설정됨
- [ ] 환경 변수 `NODE_ENV=production` 설정됨
- [ ] Start Command가 `npm start` 또는 비어있음
- [ ] 배포 완료 후 `/health` 엔드포인트 테스트 성공

## 🚀 배포 후

배포가 완료되면:

1. **URL 확인:** Networking 탭에서 생성된 URL 복사
2. **앱 설정:** 앱의 서버 설정에서 이 URL 입력
3. **테스트:** 앱에서 연결 테스트

---

**추가 도움이 필요하시면 이슈를 생성해주세요!** 🚂

