# 🔧 로그인 화면 서버 URL 설정 수정 가이드

로그인 화면에서 서버 URL을 설정할 수 있도록 수정하는 방법입니다.

## 📋 수정할 파일

### 1. `EcoNaviAR/src/components/Login.tsx`

로그인 컴포넌트에 서버 설정 섹션을 추가합니다.

**주요 변경사항:**
- 서버 타입 선택 (로컬/클라우드)
- 서버 URL 입력 필드
- 연결 테스트 및 저장 기능
- 로그인 전 서버 URL 저장 및 즉시 반영

### 2. `EcoNaviAR/src/services/api.ts`

인터셉터에서 baseURL이 제대로 업데이트되도록 수정합니다.

**주요 변경사항:**
- 인터셉터에서 `apiClient.defaults.baseURL`도 함께 업데이트
- 매 요청마다 최신 baseURL 확인

## 🔍 문제 해결

### 문제: 서버 URL을 변경해도 여전히 이전 URL로 요청이 감

**원인:**
- `updateApiBaseURL()`이 호출되어도 인터셉터가 제대로 작동하지 않음
- `apiClient.defaults.baseURL`이 업데이트되지 않음

**해결:**
1. `Login.tsx`의 `handleSubmit`에서 로그인 전에 서버 URL 저장 및 업데이트
2. `api.ts`의 인터셉터에서 `apiClient.defaults.baseURL`도 함께 업데이트

## 📝 수정 코드

### Login.tsx - handleSubmit 수정

```typescript
const handleSubmit = async () => {
  // ... 기존 코드 ...
  
  setIsLoading(true);
  try {
    // 서버 URL 저장 및 즉시 반영
    const urlToSave = serverUrl.trim().replace(/\/$/, '');
    await setApiUrl(urlToSave);
    await updateApiBaseURL();
    
    // 저장된 URL 확인
    const currentUrl = await getApiUrl();
    console.log('[Login] 로그인 시도:', username);
    console.log('[Login] 서버 URL:', currentUrl);
    
    const response = await loginAPI(username, password);
    // ... 나머지 코드 ...
  }
}
```

### api.ts - 인터셉터 수정

```typescript
apiClient.interceptors.request.use(async (config) => {
  try {
    const currentBaseURL = await getApiUrl();
    
    // apiClient의 baseURL도 업데이트 (다음 요청을 위해)
    if (apiClient.defaults.baseURL !== currentBaseURL) {
      apiClient.defaults.baseURL = currentBaseURL;
      console.log('[API] Interceptor: Base URL updated to:', currentBaseURL);
    }
    
    // config.baseURL을 직접 설정하여 이 요청에 즉시 적용
    config.baseURL = currentBaseURL;
    // ... 나머지 코드 ...
  }
});
```

## ✅ 테스트 방법

1. 앱 실행
2. 로그인 화면에서 "서버 설정" 클릭
3. 클라우드 선택 → `https://econavi-production.up.railway.app` 입력
4. "연결 테스트" 클릭 → 성공 확인
5. "저장" 클릭
6. 사용자 이름/비밀번호 입력 후 로그인
7. 콘솔에서 `[Login] 서버 URL:` 로그 확인
8. `[API] Base URL updated to:` 로그 확인

## 🐛 디버깅

문제가 계속되면:

1. **AsyncStorage 확인:**
   ```typescript
   const url = await AsyncStorage.getItem('api_server_url');
   console.log('Saved URL:', url);
   ```

2. **인터셉터 로그 확인:**
   - `[API] Interceptor: Base URL updated to:` 메시지 확인
   - `[API] Base URL 동적 업데이트:` 메시지 확인

3. **요청 전 baseURL 확인:**
   ```typescript
   console.log('Request baseURL:', config.baseURL);
   console.log('Client default baseURL:', apiClient.defaults.baseURL);
   ```

---

**추가 도움이 필요하시면 이슈를 생성해주세요!** 🔧

