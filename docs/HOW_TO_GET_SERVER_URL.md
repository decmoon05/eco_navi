# 🌐 서버 URL 확인 방법

Railway에 배포한 서버의 URL을 확인하는 방법입니다.

## 📍 Railway에서 URL 확인하기

### 방법 1: Networking 탭 (가장 쉬움)

1. Railway 대시보드에서 프로젝트 선택
2. 상단 네비게이션에서 **"Networking"** 탭 클릭
3. **"Public Networking"** 섹션에서:
   - **"Generate Service Domain"** 버튼 클릭
   - ⚠️ **중요:** "Target port"에 `3001` 입력 (기본값 8080이 아닌 3001!)
   - "Generate Domain" 버튼 클릭
4. 생성된 도메인 확인
   - 예: `https://eco-navi-production.up.railway.app`
   - 또는 `https://worthy-flexibility-production.up.railway.app`

**⚠️ 포트 설정 주의사항:**
- Railway는 기본적으로 8080 포트를 제안하지만
- 우리 서버는 **3001 포트**를 사용합니다
- 반드시 **Target port를 3001로 설정**해야 합니다!

### 방법 2: 서비스 카드에서

1. **Architecture** 탭에서 서비스 카드(eco_navi) 클릭
2. 오른쪽 패널이 열리면:
   - "Networking" 섹션 확인
   - 또는 "Settings" → "Networking" 확인
3. 도메인 확인 또는 생성

### 방법 3: Settings → Networking

1. 상단 네비게이션에서 **"Settings"** 탭 클릭
2. 왼쪽 메뉴에서 **"Networking"** 선택
3. "Domains" 섹션에서:
   - 기존 도메인 확인
   - 또는 "Generate Domain" 버튼 클릭

## 🔗 URL 형식

Railway가 생성하는 URL 형식:
```
https://[프로젝트명]-[환경명].up.railway.app
```

예시:
- `https://worthy-flexibility-production.up.railway.app`
- `https://eco-navi-production.up.railway.app`

## ✅ URL 테스트

URL을 받은 후 테스트:

1. **Health Check:**
   ```
   https://your-service.up.railway.app/health
   ```
   브라우저에서 접속하여 다음 응답 확인:
   ```json
   {
     "status": "ok",
     "message": "서버가 정상적으로 실행 중입니다.",
     "timestamp": "..."
   }
   ```

2. **루트 엔드포인트:**
   ```
   https://your-service.up.railway.app/
   ```
   "EcoNavi 백엔드 서버가 실행 중입니다." 메시지 확인

## 📱 앱에 URL 설정하기

서버 URL을 받은 후:

1. 앱 실행
2. **마이페이지** → **"서버 설정"** 섹션
3. 서버 URL 입력:
   - 예: `https://worthy-flexibility-production.up.railway.app`
   - ⚠️ **주의:** `http://`가 아닌 `https://` 사용
4. "연결 테스트" 버튼 클릭
5. 성공하면 "저장" 버튼 클릭

## 🔒 HTTPS 중요사항

- Railway는 자동으로 HTTPS를 제공합니다
- **반드시 `https://`로 시작하는 URL을 사용하세요**
- `http://`로 접속하면 연결이 실패할 수 있습니다

## 🌍 커스텀 도메인 (선택사항)

나중에 자신만의 도메인을 사용하고 싶다면:

1. Settings → Networking → "Custom Domain"
2. 도메인 입력 (예: `api.econavi.com`)
3. DNS 설정 안내에 따라 CNAME 레코드 추가
4. SSL 인증서 자동 발급 (Railway가 처리)

## ❓ 문제 해결

### URL이 보이지 않을 때

1. 배포가 완료되었는지 확인 (Deployments 탭)
2. 서비스가 실행 중인지 확인 (녹색 체크 표시)
3. Networking 탭에서 "Generate Domain" 클릭

### 연결이 안 될 때

1. URL이 `https://`로 시작하는지 확인
2. `/health` 엔드포인트로 테스트
3. 브라우저에서 직접 접속 테스트
4. 앱의 네트워크 보안 설정 확인

---

**추가 도움이 필요하시면 이슈를 생성해주세요!** 🌐

