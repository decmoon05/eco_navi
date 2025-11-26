# Metro 번들러 캐시 문제 해결 가이드

## 문제
`TypeError: Cannot read property 'TMAP_API_KEY' of undefined` 오류가 발생하는 경우, Metro 번들러의 캐시 문제일 수 있습니다.

## 해결 방법

### 방법 1: Metro 번들러 재시작 (캐시 지우기)

1. **Metro 번들러 종료**
   - Metro 번들러가 실행 중인 터미널에서 `Ctrl + C`로 종료

2. **캐시 지우기 및 재시작**
   ```bash
   cd EcoNaviAR
   npx react-native start --reset-cache
   ```

3. **앱 재빌드**
   - 다른 터미널에서:
   ```bash
   cd EcoNaviAR
   npx react-native run-android
   ```

### 방법 2: 완전 초기화 (방법 1이 안 될 경우)

1. **모든 캐시 삭제**
   ```bash
   cd EcoNaviAR
   
   # Metro 캐시 삭제
   rm -rf node_modules/.cache
   
   # Watchman 캐시 삭제 (설치되어 있는 경우)
   watchman watch-del-all
   
   # Android 빌드 캐시 삭제
   cd android
   ./gradlew clean
   cd ..
   ```

2. **node_modules 재설치 (선택사항)**
   ```bash
   rm -rf node_modules
   npm install
   # 또는
   yarn install
   ```

3. **Metro 번들러 재시작**
   ```bash
   npx react-native start --reset-cache
   ```

### 방법 3: 파일 확인

`EcoNaviAR/src/config/apiKeys.ts` 파일이 존재하고 다음 형식으로 되어 있는지 확인:

```typescript
export const API_KEYS = {
  TMAP_API_KEY: 'your_key_here',
  ODSAY_API_KEY: 'your_key_here',
  GOOGLE_MAPS_API_KEY: 'your_key_here',
} as const;
```

## 예방 방법

- 파일을 수정한 후 Metro 번들러를 재시작하는 습관을 가지세요
- `--reset-cache` 옵션을 사용하여 캐시 문제를 방지하세요



