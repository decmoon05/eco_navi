# 🔐 API 키 보안 가이드

## ⚠️ 중요: API 키 노출 방지

**절대 API 키를 Git에 커밋하지 마세요!**

## 현재 설정 방법

### 1. React Native 앱 (EcoNaviAR)

모든 API 키는 `EcoNaviAR/src/config/apiKeys.ts` 파일에서 관리됩니다.

```typescript
export const API_KEYS = {
  TMAP_API_KEY: 'YOUR_TMAP_API_KEY',
  ODSAY_API_KEY: 'YOUR_ODSAY_API_KEY',
  GOOGLE_MAPS_API_KEY: 'YOUR_GOOGLE_MAPS_API_KEY',
};
```

⚠️ **이 파일은 `.gitignore`에 포함되어 있어 Git에 올라가지 않습니다.**

### 2. Android Manifest

Google Maps API 키는 AndroidManifest.xml에도 설정해야 합니다.

**현재 문제:** AndroidManifest.xml에 하드코딩되어 있어 Git에 노출될 수 있습니다.

**해결 방법:**
1. `gradle.properties`에 키 추가 (로컬 파일, Git 제외)
2. `build.gradle`에서 환경 변수 읽기
3. AndroidManifest.xml에서 변수 참조

## Google Cloud Platform 설정

### API 키 제한 설정 (필수)

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. **API 및 서비스** > **사용자 인증 정보** 이동
3. 노출된 API 키 선택
4. **API 키 제한사항** 설정:
   - **애플리케이션 제한사항:**
     - Android 앱: 패키지명과 SHA-1 인증서 지문 추가
   - **API 제한사항:**
     - Maps SDK for Android만 허용
     - Maps JavaScript API (필요한 경우만)

### 새 API 키 생성 (권장)

1. Google Cloud Console에서 **새 API 키 생성**
2. 위의 제한사항 설정
3. 기존 키 삭제 또는 비활성화
4. `apiKeys.ts` 파일에 새 키 입력

## 노출된 키 처리 방법

### 1. 즉시 조치

1. **기존 키 비활성화 또는 삭제**
   - Google Cloud Console > 사용자 인증 정보 > 해당 키 삭제/비활성화

2. **새 키 생성 및 제한 설정**
   - 위의 "새 API 키 생성" 절차 따르기

3. **코드 업데이트**
   - `apiKeys.ts`에 새 키 입력
   - AndroidManifest.xml 업데이트 (또는 빌드 시 주입)

### 2. Git 히스토리 정리 (선택사항)

만약 민감한 정보가 Git 히스토리에 남아있다면:

```bash
# Git 히스토리에서 파일 제거 (주의: 히스토리 재작성)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch docs/API_SPECIFICATION.md" \
  --prune-empty --tag-name-filter cat -- --all

# 또는 BFG Repo-Cleaner 사용
```

⚠️ **주의:** 히스토리 재작성 후 `git push --force`가 필요하며, 협업 중이라면 팀원들과 상의해야 합니다.

## 모범 사례

1. ✅ **환경 변수 사용**
   - `.env` 파일 또는 `apiKeys.ts` 같은 설정 파일 사용
   - `.gitignore`에 포함

2. ✅ **API 키 제한 설정**
   - 애플리케이션 제한 (패키지명, 도메인 등)
   - API 제한 (필요한 API만 허용)

3. ✅ **정기적인 키 로테이션**
   - 주기적으로 키 변경
   - 사용하지 않는 키 삭제

4. ✅ **모니터링**
   - Google Cloud Console에서 사용량 모니터링
   - 비정상적인 사용 패턴 감지

## 추가 리소스

- [Google Cloud API 키 보안 모범 사례](https://cloud.google.com/docs/authentication/api-keys)
- [보안 침해된 GCP 사용자 인증 정보 처리](https://cloud.google.com/iam/docs/security-best-practices)



