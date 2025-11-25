# 🚨 API 키 교체 가이드 (긴급)

Google Cloud Platform에서 API 키 노출 경고를 받으셨습니다. 다음 단계를 따라 즉시 조치하세요.

## ⚠️ 즉시 조치 사항

### 1단계: Google Cloud Console에서 기존 키 처리

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 `econavi (id: econavi-478417)` 선택
3. **API 및 서비스** > **사용자 인증 정보** 이동
4. 노출된 키 `AIzaSyB9h3q9QSL5MLz_x7HSFkMyX3vv2SoGpz0` 찾기
5. **즉시 삭제 또는 비활성화**

### 2단계: 새 API 키 생성

1. **사용자 인증 정보** 페이지에서 **+ 사용자 인증 정보 만들기** > **API 키**
2. 새 키 생성 후 복사

### 3단계: API 키 제한 설정 (필수!)

1. 생성한 새 키 클릭
2. **API 키 제한사항** 섹션에서:

   **애플리케이션 제한사항:**
   - **Android 앱** 선택
   - 패키지명: `com.econaviar`
   - SHA-1 인증서 지문 추가:
     ```bash
     # 디버그 키스토어의 SHA-1 확인
     keytool -list -v -keystore EcoNaviAR/android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```

   **API 제한사항:**
   - **키 제한** 선택
   - 다음 API만 허용:
     - Maps SDK for Android
     - Maps JavaScript API (필요한 경우만)

3. **저장** 클릭

### 4단계: 로컬 파일에 새 키 설정

#### A. React Native 코드 (apiKeys.ts)

```bash
# EcoNaviAR/src/config/apiKeys.ts 파일 열기
# GOOGLE_MAPS_API_KEY 값을 새 키로 변경
```

```typescript
export const API_KEYS = {
  TMAP_API_KEY: 'fEvgaR4L3J7T40jZZaiA47xaWzybYo0qaWJvNFHm',
  ODSAY_API_KEY: 'wIhoG7xGvLs1u2XeQuqme9/vKhoPBsaDJx/cLskyf2s',
  GOOGLE_MAPS_API_KEY: 'YOUR_NEW_GOOGLE_MAPS_API_KEY_HERE', // ← 여기 변경
};
```

#### B. Android 빌드 설정 (gradle.properties)

```bash
# EcoNaviAR/android/gradle.properties 파일 생성 또는 수정
# (이 파일은 .gitignore에 포함되어 Git에 올라가지 않습니다)
```

```properties
# 기존 gradle.properties 내용...

# Google Maps API 키 추가
GOOGLE_MAPS_API_KEY=YOUR_NEW_GOOGLE_MAPS_API_KEY_HERE
```

**gradle.properties 파일이 없다면:**
```bash
cd EcoNaviAR/android
copy gradle.properties.example gradle.properties
# 그 다음 gradle.properties 파일을 열어 GOOGLE_MAPS_API_KEY 값 입력
```

### 5단계: 앱 재빌드

```bash
cd EcoNaviAR
npx react-native run-android
```

## ✅ 확인 사항

- [ ] Google Cloud Console에서 기존 키 삭제/비활성화 완료
- [ ] 새 API 키 생성 완료
- [ ] API 키 제한 설정 완료 (Android 앱 + API 제한)
- [ ] apiKeys.ts에 새 키 입력 완료
- [ ] gradle.properties에 새 키 입력 완료
- [ ] 앱 재빌드 및 정상 작동 확인

## 📝 참고사항

- **apiKeys.ts**와 **gradle.properties**는 `.gitignore`에 포함되어 있어 Git에 올라가지 않습니다.
- 새 키를 생성한 후에는 **반드시 제한 설정**을 해야 합니다.
- SHA-1 인증서 지문은 디버그와 릴리즈 키스토어가 다를 수 있습니다. 둘 다 추가하는 것을 권장합니다.

## 🔗 관련 문서

- [API 키 보안 가이드](./API_KEY_SECURITY.md)
- [Google Cloud API 키 보안 모범 사례](https://cloud.google.com/docs/authentication/api-keys)

