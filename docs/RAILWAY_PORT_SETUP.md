# 🔌 Railway 포트 설정 가이드

Railway에서 서버 도메인을 생성할 때 포트 설정 방법입니다.

## ⚠️ 중요: 포트 설정

EcoNaviAR 서버는 **3001 포트**를 사용합니다.

Railway의 "Generate Service Domain" 화면에서:
- **Target port:** `3001` 입력
- 기본값 `8080`이 아닌 `3001`을 입력해야 합니다!

## 📋 단계별 설정

### 1. Networking 탭 이동

1. Railway 대시보드에서 프로젝트 선택
2. 상단 네비게이션에서 **"Networking"** 탭 클릭

### 2. Public Networking 설정

1. **"Public Networking"** 섹션 찾기
2. **"Generate Service Domain"** 버튼 클릭

### 3. 포트 설정

**Target port 입력 필드:**
- 기본값: `8080` (이것을 변경해야 함!)
- **올바른 값:** `3001` 입력

### 4. 도메인 생성

1. Target port에 `3001` 입력 확인
2. **"Generate Domain"** 버튼 클릭
3. Railway가 자동으로 도메인 생성
   - 예: `https://worthy-flexibility-production.up.railway.app`

## 🔍 포트 확인 방법

서버 코드에서 포트 확인:
```javascript
// server/index.js
const port = process.env.PORT || 3001;
```

Railway는 자동으로 `PORT` 환경 변수를 설정하지만, 도메인 생성 시에는 명시적으로 `3001`을 입력해야 합니다.

## ❓ 왜 3001인가요?

- 서버 코드에서 기본 포트가 3001로 설정되어 있습니다
- Railway는 자동으로 `PORT` 환경 변수를 설정하지만
- 도메인 생성 시에는 서버가 실제로 리스닝하는 포트를 지정해야 합니다
- Railway의 `PORT` 환경 변수와 도메인의 Target port는 다를 수 있습니다

## ✅ 확인 방법

도메인 생성 후 테스트:

1. 브라우저에서 접속:
   ```
   https://your-service.up.railway.app/health
   ```

2. 정상 응답 확인:
   ```json
   {
     "status": "ok",
     "message": "서버가 정상적으로 실행 중입니다."
   }
   ```

3. 연결 실패 시:
   - Target port가 3001로 설정되었는지 확인
   - 서버가 정상적으로 실행 중인지 확인 (Deployments 탭)
   - 재배포 필요할 수 있음

## 🔄 포트 변경 방법

이미 도메인을 생성했는데 포트가 잘못되었다면:

1. Networking 탭 → Public Networking
2. 기존 도메인 옆의 설정 아이콘 클릭
3. Target port를 `3001`로 변경
4. 저장

또는 도메인을 삭제하고 다시 생성할 수 있습니다.

---

**추가 도움이 필요하시면 이슈를 생성해주세요!** 🔌

