# 🔒 보안 감사 보고서 (Security Audit Report)

**작성일:** 2025년 1월  
**프로젝트:** EcoNaviAR  
**감사 범위:** 전체 코드베이스

## 📋 요약

전체 프로젝트를 검토한 결과, **1개의 심각한 보안 취약점**과 여러 개선 권장사항을 발견했습니다.

---

## 🚨 심각한 보안 취약점

### 1. server/.env 파일이 Git에 추적됨 (CRITICAL)

**위험도:** 🔴 **CRITICAL**

**문제:**
- `server/.env` 파일이 Git 저장소에 커밋되어 있음
- JWT_SECRET 등 민감한 정보가 노출될 수 있음

**확인 방법:**
```bash
git ls-files | grep "\.env$"
# 결과: server/.env
```

**영향:**
- GitHub에 민감한 정보가 공개됨
- JWT_SECRET이 노출되면 토큰 위조 가능
- 데이터베이스 접근 정보 노출 가능

**해결 방법:**
1. 즉시 `.env` 파일 내용 확인 및 새 JWT_SECRET 생성
2. Git 히스토리에서 `.env` 파일 제거
3. `.gitignore`에 이미 포함되어 있지만, 히스토리 정리 필요

```bash
# 1. Git 히스토리에서 제거
git rm --cached server/.env
git commit -m "security: Remove .env file from Git tracking"

# 2. .env 파일 내용 확인 후 새 JWT_SECRET 생성
# 3. 서버 재시작
```

---

## ⚠️ 중간 위험도 취약점

### 2. CORS 설정이 제한 없음

**위험도:** 🟡 **MEDIUM**

**문제:**
```javascript
// server/index.js:12
app.use(cors()); // 모든 출처에서 접근 허용
```

**영향:**
- 모든 도메인에서 API 접근 가능
- CSRF 공격 위험 증가

**권장 해결책:**
```javascript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
```

### 3. 디버그 키스토어 비밀번호 하드코딩

**위험도:** 🟡 **MEDIUM** (개발 환경이므로 낮음)

**문제:**
```gradle
// EcoNaviAR/android/app/build.gradle:96-97
storePassword 'android'
keyPassword 'android'
```

**영향:**
- 디버그 빌드의 키스토어 비밀번호가 공개됨
- 프로덕션 빌드에는 영향 없음

**권장 해결책:**
- 디버그 키스토어는 기본값 사용이 일반적이므로 문제 없음
- 프로덕션 키스토어는 반드시 강력한 비밀번호 사용

---

## 📝 개선 권장사항

### 4. HTTP 사용 (HTTPS 권장)

**위험도:** 🟡 **MEDIUM** (프로덕션 환경)

**현재 상태:**
- 서버가 HTTP로 실행됨
- 앱에서 HTTP 통신 사용

**권장 해결책:**
- 프로덕션 환경에서는 HTTPS 사용
- Let's Encrypt 무료 SSL 인증서 사용
- Nginx 리버스 프록시 설정

### 5. API 키 제한 설정 필요

**위험도:** 🟡 **MEDIUM**

**현재 상태:**
- Google Maps API 키: 새로 생성했으나 제한 설정 필요
- Tmap API 키: 제한 설정 확인 필요
- ODsay API 키: 제한 설정 확인 필요

**권장 해결책:**
- 각 API 키에 애플리케이션 제한 설정
- API 제한 설정 (필요한 API만 허용)
- 사용량 모니터링 활성화

### 6. 환경 변수 기본값 확인

**위험도:** 🟢 **LOW**

**문제:**
```javascript
// server/index.js:69
const secret = process.env.JWT_SECRET;
if (!secret) {
  return res.status(500).json({ message: '서버 설정 오류: JWT 비밀 키가 없습니다.' });
}
```

**현재 상태:**
- JWT_SECRET이 없으면 에러 반환 (좋음)
- 하지만 기본값이 설정되어 있을 수 있음

**권장 해결책:**
- `.env` 파일이 없으면 서버 시작 실패하도록 강제
- 환경 변수 검증 로직 추가

---

## ✅ 보안이 잘 설정된 부분

1. **API 키 관리**
   - `apiKeys.ts`가 `.gitignore`에 포함됨 ✅
   - `gradle.properties`가 `.gitignore`에 포함됨 ✅
   - 예시 파일(`.example`)만 Git에 포함됨 ✅

2. **데이터베이스 파일**
   - `database.db`가 `.gitignore`에 포함됨 ✅

3. **비밀번호 암호화**
   - bcrypt 사용 (salt rounds = 10) ✅
   - 평문 비밀번호 저장 안 함 ✅

4. **JWT 토큰 관리**
   - 환경 변수에서 JWT_SECRET 읽기 ✅
   - 토큰 만료 시간 설정 (1시간) ✅

---

## 🔧 즉시 조치 사항

### 우선순위 1 (즉시)

1. ✅ **server/.env 파일 Git에서 제거**
   ```bash
   git rm --cached server/.env
   git commit -m "security: Remove .env from Git tracking"
   ```

2. ✅ **JWT_SECRET 확인 및 재생성**
   - 현재 `.env` 파일의 JWT_SECRET 확인
   - 새 랜덤 문자열로 변경
   - 모든 사용자 재로그인 요구 (토큰 무효화)

3. ✅ **Git 히스토리 정리** (선택사항)
   ```bash
   # .env 파일이 히스토리에 있다면 제거
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch server/.env" \
     --prune-empty --tag-name-filter cat -- --all
   ```

### 우선순위 2 (1주일 내)

4. **CORS 설정 제한**
   - 허용된 출처만 지정
   - 프로덕션 도메인 추가

5. **API 키 제한 설정**
   - Google Maps API 키 제한 설정 완료
   - Tmap, ODsay API 키 제한 설정 확인

### 우선순위 3 (프로덕션 배포 전)

6. **HTTPS 설정**
   - SSL 인증서 발급
   - Nginx 리버스 프록시 설정

7. **환경 변수 검증 강화**
   - 서버 시작 시 필수 환경 변수 확인
   - 누락 시 즉시 종료

---

## 📊 보안 점수

| 항목 | 점수 | 상태 |
|------|------|------|
| API 키 관리 | 8/10 | 양호 |
| 환경 변수 관리 | 4/10 | ⚠️ 개선 필요 |
| 인증/인가 | 7/10 | 양호 |
| 네트워크 보안 | 5/10 | ⚠️ 개선 필요 |
| 데이터 보호 | 8/10 | 양호 |

**종합 점수: 6.4/10** 🟡

---

## 📚 참고 자료

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js 보안 모범 사례](https://nodejs.org/en/docs/guides/security/)
- [React Native 보안 가이드](https://reactnative.dev/docs/security)

---

**다음 감사 예정일:** 프로덕션 배포 전

