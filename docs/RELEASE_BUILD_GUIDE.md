# 📱 릴리즈 빌드 가이드

개발 중 USB 연결 없이 앱을 사용하려면 릴리즈 빌드를 만들어야 합니다.

## 🔍 문제

개발 모드에서는 Metro Bundler에 연결되어 있어야 합니다:
- USB 연결 필요
- 또는 같은 Wi-Fi 네트워크 필요

**클라우드 서버를 사용해도 Metro Bundler 연결은 여전히 필요합니다!**

## ✅ 해결 방법: 릴리즈 빌드

릴리즈 빌드는 JavaScript 번들이 앱에 포함되어 있어서 Metro Bundler 연결이 필요 없습니다.

### 1. Android 릴리즈 빌드

#### 1.1 키스토어 생성 (최초 1회)

```bash
cd EcoNaviAR/android/app
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

**입력 정보:**
- 비밀번호: 원하는 비밀번호 입력 (기억해두세요!)
- 이름, 조직 등: 원하는 정보 입력

#### 1.2 gradle.properties 설정

`EcoNaviAR/android/gradle.properties` 파일에 추가:

```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=your-keystore-password
MYAPP_RELEASE_KEY_PASSWORD=your-key-password
```

**보안 주의:** `gradle.properties`는 Git에 커밋하지 마세요! `.gitignore`에 추가되어 있는지 확인하세요.

#### 1.3 build.gradle 설정 확인

`EcoNaviAR/android/app/build.gradle` 파일에 다음이 있는지 확인:

```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

#### 1.4 릴리즈 빌드 생성

```bash
cd EcoNaviAR/android
./gradlew assembleRelease
```

**Windows:**
```bash
cd EcoNaviAR/android
gradlew.bat assembleRelease
```

#### 1.5 APK 설치

빌드된 APK 파일 위치:
```
EcoNaviAR/android/app/build/outputs/apk/release/app-release.apk
```

이 파일을 휴대폰으로 전송하여 설치하세요.

### 2. 개발용 vs 릴리즈 빌드

| 항목 | 개발 빌드 (Debug) | 릴리즈 빌드 (Release) |
|------|------------------|---------------------|
| Metro Bundler 필요 | ✅ 필요 | ❌ 불필요 |
| USB 연결 필요 | ✅ 필요 | ❌ 불필요 |
| Wi-Fi 연결 필요 | ✅ 필요 (개발 시) | ❌ 불필요 |
| JavaScript 번들 | Metro에서 로드 | APK에 포함 |
| 크기 | 작음 | 큼 |
| 디버깅 | 가능 | 제한적 |
| 성능 | 느림 | 빠름 |

### 3. 클라우드 서버 사용 시

**중요:** 클라우드 서버를 사용해도 개발 빌드는 Metro Bundler 연결이 필요합니다!

**해결책:**
1. **릴리즈 빌드 사용** (권장)
   - Metro Bundler 연결 불필요
   - 클라우드 서버만 연결하면 됨
   - 실제 사용 환경과 유사

2. **개발 중에는 USB 연결 유지**
   - 개발 빌드 사용
   - USB 디버깅 활성화
   - `adb reverse tcp:8081 tcp:8081` 실행

### 4. 빠른 테스트용 빌드 (서명 없이)

서명 없이 빠르게 테스트하려면:

```bash
cd EcoNaviAR/android
./gradlew assembleRelease
```

그리고 `build.gradle`에서 서명 설정을 제거하면 됩니다 (Google Play에 배포할 수 없지만 테스트는 가능).

### 5. 자동화 스크립트

빌드를 자동화하려면 `build-release.bat` (Windows) 또는 `build-release.sh` (Linux/Mac) 파일을 만들 수 있습니다:

**Windows (`build-release.bat`):**
```batch
@echo off
echo Building release APK...
cd EcoNaviAR\android
call gradlew.bat assembleRelease
echo.
echo Build complete! APK location:
echo EcoNaviAR\android\app\build\outputs\apk\release\app-release.apk
pause
```

**Linux/Mac (`build-release.sh`):**
```bash
#!/bin/bash
echo "Building release APK..."
cd EcoNaviAR/android
./gradlew assembleRelease
echo ""
echo "Build complete! APK location:"
echo "EcoNaviAR/android/app/build/outputs/apk/release/app-release.apk"
```

## 🔄 개발 워크플로우

### 개발 중
1. 개발 빌드 사용 (`npm run android`)
2. USB 연결 또는 같은 Wi-Fi
3. Metro Bundler 실행
4. 빠른 핫 리로드

### 테스트/배포
1. 릴리즈 빌드 생성
2. APK 설치
3. 클라우드 서버 연결
4. USB 연결 없이 사용 가능!

## ⚠️ 주의사항

1. **키스토어 비밀번호 분실 주의**
   - 키스토어 비밀번호를 잃어버리면 업데이트 불가능
   - 안전한 곳에 백업하세요

2. **gradle.properties 보안**
   - Git에 커밋하지 마세요
   - `.gitignore`에 포함되어 있는지 확인

3. **릴리즈 빌드 업데이트**
   - 코드 변경 후 다시 빌드해야 반영됩니다
   - 개발 중에는 개발 빌드 사용 권장

## 📝 요약

**클라우드 서버를 사용해도 개발 빌드는 Metro Bundler 연결이 필요합니다.**

**해결책:**
- ✅ 릴리즈 빌드 생성 → USB 연결 없이 사용 가능
- ✅ 클라우드 서버 설정 → 어디서든 접근 가능
- ✅ 완전히 독립적인 앱 사용 가능!

---

**추가 도움이 필요하시면 이슈를 생성해주세요!** 📱

