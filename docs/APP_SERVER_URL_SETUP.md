# 📱 앱에서 서버 URL 설정하기

Railway에 배포한 서버에 앱을 연결하는 방법입니다.

## 🎯 Railway 서버 URL

Railway에서 생성한 도메인:
```
https://econavi-production.up.railway.app
```

**⚠️ 중요:** 
- `http://`가 아닌 `https://`를 사용하세요
- 포트 번호(`:3001`)는 포함하지 않습니다 (Railway가 자동 처리)

## 📋 앱에서 설정하는 방법

### 방법 1: 앱 내 설정 (권장)

1. **앱 실행**
2. **마이페이지**로 이동
3. **"서버 설정"** 섹션 찾기
4. 서버 URL 입력:
   ```
   https://econavi-production.up.railway.app
   ```
5. **"연결 테스트"** 버튼 클릭
   - 성공 메시지가 나오면 정상 연결됨
6. **"저장"** 버튼 클릭
7. **앱 재시작** (필요 시)

### 방법 2: 코드에서 기본값 변경 (개발용)

`EcoNaviAR/src/config/api.ts` 파일 수정:

```typescript
const getDefaultApiUrl = (): string => {
  if (!__DEV__) {
    return 'https://econavi-production.up.railway.app';  // 프로덕션
  }
  
  // 개발 모드에서도 클라우드 서버 사용하려면:
  return 'https://econavi-production.up.railway.app';
  
  // 또는 로컬 서버 사용:
  // return 'http://192.168.0.2:3001';
};
```

## ✅ 연결 확인

### 1. 앱에서 확인

- "연결 테스트" 버튼 클릭
- "서버에 연결할 수 있습니다!" 메시지 확인

### 2. 브라우저에서 확인

브라우저에서 다음 URL 접속:
```
https://econavi-production.up.railway.app/health
```

정상 응답:
```json
{
  "status": "ok",
  "message": "서버가 정상적으로 실행 중입니다.",
  "timestamp": "..."
}
```

### 3. 로그인 테스트

앱에서 로그인 시도:
- 서버 연결 성공 시: 로그인 진행
- 서버 연결 실패 시: "Network Error" 메시지

## 🔧 문제 해결

### 연결이 안 될 때

1. **URL 확인:**
   - `https://`로 시작하는지 확인
   - 포트 번호(`:3001`)가 포함되지 않았는지 확인
   - 도메인 끝에 `/`가 없는지 확인

2. **Railway 서버 확인:**
   - Railway 대시보드에서 서버가 실행 중인지 확인
   - Deployments 탭에서 최신 배포 상태 확인

3. **네트워크 확인:**
   - 인터넷 연결 확인
   - 방화벽 설정 확인 (일반적으로 문제 없음)

4. **앱 재시작:**
   - 서버 URL 저장 후 앱 완전 종료 후 재시작

### 여전히 로컬 서버에 연결되는 경우

1. **AsyncStorage 확인:**
   - 앱 데이터 삭제 후 재설치
   - 또는 앱 설정에서 "앱 데이터 삭제"

2. **기본값 확인:**
   - `EcoNaviAR/src/config/api.ts`의 기본값 확인
   - 필요 시 코드에서 직접 변경

## 📝 URL 형식

### 올바른 형식

✅ **클라우드 (Railway):**
```
https://econavi-production.up.railway.app
```

✅ **로컬 개발:**
```
http://192.168.0.2:3001
```

### 잘못된 형식

❌ 포트 번호 포함:
```
https://econavi-production.up.railway.app:3001
```

❌ HTTP 사용 (HTTPS 필요):
```
http://econavi-production.up.railway.app
```

❌ 슬래시 포함:
```
https://econavi-production.up.railway.app/
```

## 🔄 서버 URL 변경 시

1. 마이페이지 → 서버 설정
2. 새 URL 입력
3. 연결 테스트
4. 저장
5. 앱 재시작 (필요 시)

---

**추가 도움이 필요하시면 이슈를 생성해주세요!** 📱

