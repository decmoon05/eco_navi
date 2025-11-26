# 🔐 환경 변수 가이드

EcoNaviAR 서버를 클라우드에 배포할 때 필요한 환경 변수에 대한 설명입니다.

## 📋 필수 환경 변수

### 1. JWT_SECRET

**값:** 랜덤 문자열 (최소 32자, 권장 64자 이상)

**용도:** JWT 토큰을 암호화/복호화하는 데 사용하는 비밀 키

**생성 방법:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**기억할 필요가 있나요?**
- ❌ **기억할 필요 없습니다!**
- Railway/Render 등 클라우드 플랫폼에 저장되어 있으므로 따로 기록할 필요 없습니다
- 다만, **다른 서버로 이전하거나 백업이 필요할 때**를 위해 안전한 곳에 기록해두는 것을 권장합니다
- JWT_SECRET을 잃어버리면 기존 사용자들이 모두 로그아웃됩니다 (새로운 토큰이 생성되므로)

**보안 주의사항:**
- 절대 GitHub에 커밋하지 마세요
- 다른 사람과 공유하지 마세요
- 주기적으로 변경하는 것을 권장합니다 (변경 시 모든 사용자가 재로그인 필요)

### 2. NODE_ENV

**값:** `production`

**용도:** Node.js 애플리케이션의 실행 환경을 지정

**가능한 값:**
- `production`: 프로덕션 환경 (실제 서비스)
- `development`: 개발 환경 (로컬 개발)
- `test`: 테스트 환경

**설정 이유:**
- `production`으로 설정하면:
  - 에러 메시지가 간소화됨 (보안)
  - 성능 최적화 활성화
  - 일부 개발 도구 비활성화

**Railway/Render 배포 시:**
- 반드시 `production`으로 설정하세요

## 🔧 선택적 환경 변수

### 3. PORT

**값:** `3001` (또는 Railway가 자동 설정한 포트)

**용도:** 서버가 리스닝할 포트 번호

**Railway/Render:**
- 자동으로 `PORT` 환경 변수를 설정합니다
- 서버 코드에서 `process.env.PORT || 3001`을 사용하므로 별도 설정 불필요

### 4. DATABASE_PATH

**값:** `/data/database.db` (Persistent Disk 사용 시)

**용도:** SQLite 데이터베이스 파일의 저장 경로

**Persistent Disk란?**
- 클라우드 서비스에서 **데이터를 영구적으로 저장하는 디스크**
- 일반 컨테이너는 재시작/재배포 시 모든 데이터가 사라지지만
- Persistent Disk에 저장된 데이터는 **영구적으로 보존**됩니다

**언제 필요한가요?**

#### Railway
- ✅ **자동으로 제공됨** - 별도 설정 불필요
- Railway는 자동으로 영구 저장소를 마운트합니다
- `database.db` 파일이 자동으로 보존됩니다

#### Render
- ⚠️ **수동으로 추가 필요**
- Render는 Persistent Disk를 별도로 추가해야 합니다
- Disk 추가 후 `DATABASE_PATH=/opt/render/project/src/data/database.db` 설정

#### 물리 서버 (나중에)
- ❌ **필요 없음**
- 물리 서버는 자체 디스크가 있으므로 Persistent Disk 개념이 없습니다
- 일반 파일 경로 사용: `./database.db` 또는 `/var/app/database.db`

**요약:**
- **Railway:** Persistent Disk 자동 제공, DATABASE_PATH 설정 불필요
- **Render:** Persistent Disk 수동 추가 필요, DATABASE_PATH 설정 필요
- **물리 서버:** Persistent Disk 개념 없음, 일반 파일 경로 사용**

## 📝 환경 변수 설정 예시

### Railway

```
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
NODE_ENV=production
```

### Render

```
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
NODE_ENV=production
DATABASE_PATH=/opt/render/project/src/data/database.db
```

### 물리 서버 (로컬)

`.env` 파일:
```
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
NODE_ENV=production
PORT=3001
# DATABASE_PATH는 설정하지 않음 (기본값 ./database.db 사용)
```

## 🔄 환경 변수 변경 시

환경 변수를 변경하면:
1. Railway/Render: 자동으로 재배포됩니다
2. 물리 서버: 서버를 재시작해야 합니다

**주의:** JWT_SECRET을 변경하면 모든 사용자가 재로그인해야 합니다.

## 💾 백업 권장사항

중요한 환경 변수는 안전한 곳에 백업하세요:

1. **비밀 관리 도구 사용:**
   - 1Password, LastPass 등
   - 또는 암호화된 파일로 저장

2. **문서화:**
   - 팀 내부 문서에 기록 (접근 제한)
   - 절대 공개 저장소에 커밋하지 마세요

3. **백업 파일:**
   ```
   env-backup.txt (암호화)
   - JWT_SECRET: [값]
   - DATABASE_PATH: [값]
   - 기타 중요 변수
   ```

---

**추가 질문이 있으시면 이슈를 생성해주세요!** 🔐

