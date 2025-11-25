# 🔒 보안 가이드 (Security Guide)

EcoNaviAR 프로젝트의 보안 설정 및 모범 사례를 안내합니다.

## ⚠️ 중요 보안 사항

### 1. API 키 관리

**절대 하드코딩하지 마세요!** 모든 API 키는 환경 변수나 설정 파일로 관리해야 합니다.

#### 현재 구조

```
EcoNaviAR/src/config/
  ├── apiKeys.ts          # 실제 API 키 (Git에 올라가지 않음)
  └── apiKeys.ts.example  # 예시 파일 (Git에 포함됨)
```

#### 설정 방법

1. **초기 설정:**
   ```bash
   cd EcoNaviAR/src/config
   cp apiKeys.ts.example apiKeys.ts
   # apiKeys.ts 파일을 열어 실제 API 키 입력
   ```

2. **API 키 입력:**
   ```typescript
   export const API_KEYS = {
     TMAP_API_KEY: '실제_TMAP_API_키',
     ODSAY_API_KEY: '실제_ODSAY_API_키',
     GOOGLE_MAPS_API_KEY: '실제_GOOGLE_MAPS_API_키',
   };
   ```

3. **확인:**
   - `apiKeys.ts` 파일이 `.gitignore`에 포함되어 있는지 확인
   - Git에 커밋되지 않는지 확인: `git status`

### 2. 서버 환경 변수

#### 설정 파일 생성

```bash
cd server
cp .env.example .env
nano .env  # 또는 vi .env
```

#### 필수 설정

```env
# JWT_SECRET은 반드시 강력한 랜덤 문자열로 변경하세요
JWT_SECRET=your_very_long_random_secret_key_here

# 서버 포트 (기본값: 3001)
PORT=3001

# 서버 호스트 (0.0.0.0 = 모든 네트워크 인터페이스)
HOST=0.0.0.0
```

#### JWT_SECRET 생성 방법

```bash
# Linux/Mac
openssl rand -base64 32

# 또는
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. 데이터베이스 파일

- `database.db` 파일은 개인 데이터를 포함하므로 **절대 Git에 올리지 마세요**
- `.gitignore`에 `*.db`, `*.sqlite` 등이 포함되어 있는지 확인

### 4. GitHub에 올리기 전 체크리스트

- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지
- [ ] `apiKeys.ts` 파일이 `.gitignore`에 포함되어 있는지
- [ ] `database.db` 파일이 `.gitignore`에 포함되어 있는지
- [ ] 하드코딩된 API 키가 코드에 없는지
- [ ] JWT_SECRET이 코드에 없는지
- [ ] `git status`로 민감한 파일이 추적되지 않는지 확인

```bash
# 확인 명령어
git status
git check-ignore -v .env server/.env EcoNaviAR/src/config/apiKeys.ts database.db
```

### 5. 프로덕션 배포 시 주의사항

#### React Native 앱

- **문제:** React Native는 번들링 시점에 모든 코드가 포함되므로, `apiKeys.ts`의 내용이 APK에 포함됩니다.
- **해결책:**
  1. API 키를 서버로 이동 (백엔드에서 프록시)
  2. 또는 환경별 빌드 설정 사용
  3. API 키 제한 설정 (Google Maps Console에서 앱 패키지명 제한)

#### 서버

- HTTPS 사용 (Let's Encrypt 무료 인증서)
- 방화벽 설정
- 정기적인 보안 업데이트
- 로그 모니터링

### 6. API 키 제한 설정

#### Google Maps API

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. API 및 서비스 > 사용자 인증 정보
3. API 키 선택
4. 애플리케이션 제한사항 설정:
   - Android 앱: 패키지명과 SHA-1 인증서 지문 추가
   - HTTP 리퍼러: 특정 도메인만 허용

#### Tmap API

- Tmap 개발자 포털에서 IP 제한 설정
- 사용량 모니터링

#### ODsay API

- ODsay 개발자 포털에서 사용량 제한 설정

### 7. 비밀값 검색

코드베이스에서 하드코딩된 비밀값이 있는지 확인:

```bash
# API 키 패턴 검색
grep -r "api.*key" --include="*.ts" --include="*.tsx" --include="*.js" EcoNaviAR/src
grep -r "API_KEY" --include="*.ts" --include="*.tsx" --include="*.js" EcoNaviAR/src

# 비밀값 패턴 검색
grep -r "secret" --include="*.ts" --include="*.tsx" --include="*.js" -i server/
```

### 8. Git 히스토리에서 민감한 정보 제거

만약 실수로 민감한 정보를 커밋했다면:

```bash
# Git 히스토리에서 파일 제거 (주의: 히스토리 재작성)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch EcoNaviAR/src/config/apiKeys.ts" \
  --prune-empty --tag-name-filter cat -- --all

# 또는 BFG Repo-Cleaner 사용 (더 빠름)
# https://rtyley.github.io/bfg-repo-cleaner/
```

**⚠️ 주의:** 히스토리 재작성 후 `git push --force`가 필요하며, 협업 중이라면 팀원들과 상의해야 합니다.

### 9. 보안 모범 사례

1. **정기적인 키 로테이션**
   - 주기적으로 API 키 변경
   - 사용하지 않는 키 삭제

2. **최소 권한 원칙**
   - API 키에 필요한 최소한의 권한만 부여
   - 사용하지 않는 API 비활성화

3. **모니터링**
   - API 사용량 모니터링
   - 비정상적인 사용 패턴 감지

4. **백업**
   - `.env` 파일과 `apiKeys.ts`는 안전한 곳에 백업
   - 비밀번호 관리자 사용 권장

### 10. 문제 발생 시

#### API 키 유출 시

1. 즉시 해당 API 키 비활성화
2. 새 API 키 발급
3. 모든 환경에서 새 키로 업데이트
4. 사용량 확인 및 비정상 활동 점검

#### JWT_SECRET 유출 시

1. 즉시 새 JWT_SECRET 생성
2. 모든 사용자 재로그인 요구 (토큰 무효화)
3. 서버 재시작

---

## 📝 요약

✅ **해야 할 것:**
- API 키를 `apiKeys.ts` 파일로 관리
- `.env` 파일로 서버 비밀값 관리
- `.gitignore`에 민감한 파일 추가
- GitHub에 올리기 전 `git status` 확인

❌ **하지 말아야 할 것:**
- API 키를 코드에 하드코딩
- `.env` 파일을 Git에 커밋
- `database.db` 파일을 Git에 커밋
- 공개 저장소에 비밀값 노출

---

**추가 보안 관련 문의는 이슈를 생성해주세요!** 🔐

