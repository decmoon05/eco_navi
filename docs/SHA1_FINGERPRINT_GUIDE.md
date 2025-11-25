# 🔐 SHA-1 인증서 지문 확인 가이드

Google Maps API 키에 Android 앱 제한을 설정할 때 필요한 SHA-1 인증서 지문을 확인하는 방법입니다.

## 📋 필요한 정보

- **디버그 키스토어 SHA-1**: 개발 중 사용 (에뮬레이터, 디버그 빌드)
- **릴리즈 키스토어 SHA-1**: 프로덕션 앱 배포 시 사용 (Google Play Store)

## 방법 1: 디버그 키스토어 SHA-1 확인 (개발용)

### Windows (PowerShell)

```powershell
# 1. EcoNaviAR/android/app 폴더로 이동
cd EcoNaviAR\android\app

# 2. keytool 명령어 실행
keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**출력 예시:**
```
별칭 이름: androiddebugkey
생성 날짜: 2024-01-01
항목 유형: PrivateKeyEntry
인증서 체인 길이: 1
인증서[1]:
소유자: CN=Android Debug, O=Android, C=US
발행자: CN=Android Debug, O=Android, C=US
일련 번호: 1234567890abcdef
적합한 시작 날짜: Mon Jan 01 00:00:00 KST 2024
만료 날짜: Tue Jan 01 00:00:00 KST 2054
인증서 지문:
     SHA1: AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE
     SHA256: 11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:11:22
```

**SHA-1 지문 복사:** `AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE` 부분을 복사하세요.

### Linux/Mac

```bash
cd EcoNaviAR/android/app
keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android
```

## 방법 2: Gradle을 통한 자동 확인 (권장)

### Windows (PowerShell)

```powershell
cd EcoNaviAR\android
.\gradlew signingReport
```

### Linux/Mac

```bash
cd EcoNaviAR/android
./gradlew signingReport
```

이 명령어는 모든 빌드 타입(debug, release)의 SHA-1과 SHA-256 지문을 자동으로 출력합니다.

**출력 예시:**
```
Variant: debug
Config: debug
Store: C:\Users\...\debug.keystore
Alias: AndroidDebugKey
MD5: 11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:11
SHA1: AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE
SHA-256: 11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:11:22
Valid until: ...
```

## 방법 3: 릴리즈 키스토어 SHA-1 확인 (프로덕션용)

릴리즈 키스토어가 있는 경우:

```powershell
# 릴리즈 키스토어 파일 경로와 별칭, 비밀번호를 입력
keytool -list -v -keystore your-release-key.keystore -alias your-key-alias
```

**비밀번호 입력 요청 시:** 키스토어 생성 시 설정한 비밀번호를 입력하세요.

## 방법 4: 이미 설치된 앱에서 확인

앱이 이미 설치되어 있다면:

```powershell
# 앱 패키지명으로 확인
keytool -list -printcert -jarfile app.apk
```

또는:

```powershell
# ADB를 통해 확인 (디바이스 연결 필요)
adb shell pm list packages | findstr econaviar
adb shell dumpsys package com.econaviar | findstr "signatures"
```

## ⚠️ 주의사항

1. **디버그 키스토어 위치:**
   - Windows: `C:\Users\<사용자명>\.android\debug.keystore`
   - 또는 프로젝트 내: `EcoNaviAR/android/app/debug.keystore`

2. **디버그 키스토어가 없는 경우:**
   - React Native가 자동으로 생성합니다.
   - 또는 다음 명령어로 수동 생성:
   ```bash
   keytool -genkey -v -keystore debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000
   ```

3. **릴리즈 키스토어:**
   - Google Play Store에 앱을 배포할 때만 필요합니다.
   - 아직 없다면 나중에 생성해도 됩니다.
   - 릴리즈 키스토어 생성 방법은 [React Native 공식 문서](https://reactnative.dev/docs/signed-apk-android) 참고

## 📝 Google Cloud Console에 추가하는 방법

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택 > **API 및 서비스** > **사용자 인증 정보**
3. API 키 선택 > **애플리케이션 제한사항**
4. **Android 앱** 선택
5. **+ 항목 추가** 클릭
6. 다음 정보 입력:
   - **패키지 이름**: `com.econaviar`
   - **SHA-1 인증서 지문**: 위에서 복사한 SHA-1 지문 (콜론 포함)
7. **저장** 클릭

## 🔄 여러 SHA-1 지문 추가

개발과 프로덕션을 모두 지원하려면:
- 디버그 키스토어 SHA-1 추가
- 릴리즈 키스토어 SHA-1 추가

둘 다 추가하면 개발 중과 프로덕션 배포 시 모두 작동합니다.

## ✅ 확인 방법

SHA-1 지문을 추가한 후:
1. 앱 재빌드: `npx react-native run-android`
2. 지도가 정상적으로 표시되는지 확인
3. Google Cloud Console에서 API 사용량 모니터링

## 🆘 문제 해결

### keytool을 찾을 수 없는 경우

Java JDK가 설치되어 있지 않거나 PATH에 없는 경우:

```powershell
# Java 설치 확인
java -version

# JDK 경로 확인 (Windows)
where keytool

# 또는 JDK 경로를 직접 지정
"C:\Program Files\Java\jdk-17\bin\keytool.exe" -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### Gradle 명령어가 작동하지 않는 경우

```powershell
# Gradle Wrapper 권한 확인 (Linux/Mac)
chmod +x gradlew

# 또는 npm/yarn을 통해 실행
cd EcoNaviAR
npx react-native run-android --variant=debug
```

---

**추가 도움이 필요하시면 이슈를 생성해주세요!** 🚀

