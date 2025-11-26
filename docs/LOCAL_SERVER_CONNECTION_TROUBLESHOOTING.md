# 🔧 로컬 서버 연결 문제 해결 가이드

클라우드 서버는 연결되지만 로컬 서버에 연결되지 않는 경우 해결 방법입니다.

## 🔍 문제 진단

### 현재 상황
- ✅ 클라우드 서버: 연결 성공
- ❌ 로컬 서버 (`http://192.168.0.2:3001`): 연결 실패

### 로그 분석
```
[API] Base URL updated to: http://192.168.0.2:3001
[API] 서버 연결 확인 실패 (서버가 실행 중이지 않을 수 있습니다)
[Login] 로그인 오류: Network Error
```

## 🔧 해결 방법

### 1. PC의 실제 IP 주소 확인

**Windows:**
```powershell
ipconfig
```

**확인할 항목:**
- "무선 LAN 어댑터 Wi-Fi" 또는 "이더넷 어댑터" 섹션
- **IPv4 주소** 확인 (예: `192.168.0.2`)

**주의:** IP 주소가 변경되었을 수 있습니다!

### 2. 서버가 실제로 실행 중인지 확인

**터미널에서 확인:**
```bash
# 서버가 실행 중인지 확인
netstat -an | findstr :3001
```

**또는 브라우저에서:**
```
http://localhost:3001/health
```

정상 응답이 나오면 서버는 실행 중입니다.

### 3. 네트워크 연결 확인

**앱이 실행되는 기기와 PC가 같은 Wi-Fi에 연결되어 있는지 확인:**

1. **PC의 Wi-Fi 이름 확인**
2. **앱이 실행되는 기기의 Wi-Fi 이름 확인**
3. **같은 네트워크인지 확인**

### 4. 방화벽 설정 확인

**Windows 방화벽에서 포트 3001 허용:**

1. Windows 설정 → 방화벽 및 네트워크 보호
2. "고급 설정" 클릭
3. "인바운드 규칙" → "새 규칙"
4. "포트" 선택
5. TCP, 포트 3001 입력
6. "연결 허용" 선택
7. 모든 프로필에 적용
8. 이름: "EcoNavi Server"

**또는 PowerShell에서:**
```powershell
New-NetFirewallRule -DisplayName "EcoNavi Server" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

### 5. Android 네트워크 보안 설정 확인

**파일:** `EcoNaviAR/android/app/src/main/res/xml/network_security_config.xml`

다음 내용이 있는지 확인:
```xml
<domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">192.168.0.2</domain>
    <domain includeSubdomains="true">192.168.x.x</domain>
</domain-config>
```

**수정 필요 시:**
- 실제 PC IP 주소를 추가
- 예: `<domain includeSubdomains="true">192.168.0.100</domain>`

### 6. IP 주소 변경 확인

**PC의 IP 주소가 변경되었을 수 있습니다:**

1. `ipconfig`로 현재 IP 확인
2. 앱의 서버 설정에서 IP 주소 업데이트
3. 또는 `EcoNaviAR/src/config/api.ts`에서 기본값 변경

### 7. 서버가 0.0.0.0에서 리스닝하는지 확인

**서버 로그:**
```
백엔드 서버가 http://0.0.0.0:3001 에서 실행 중입니다.
```

이것은 정상입니다. `0.0.0.0`은 모든 네트워크 인터페이스에서 리스닝한다는 의미입니다.

## 🧪 테스트 방법

### 1. PC에서 테스트

**같은 PC의 브라우저에서:**
```
http://localhost:3001/health
```

정상 응답이 나오면 서버는 정상 작동 중입니다.

### 2. 다른 기기에서 테스트

**같은 Wi-Fi에 연결된 다른 기기(스마트폰, 노트북)에서:**
```
http://192.168.0.2:3001/health
```

**성공:** 서버는 정상, 앱 설정 문제
**실패:** 네트워크/방화벽 문제

### 3. 앱에서 연결 테스트

1. 로그인 화면 → "서버 설정"
2. 로컬 개발 선택
3. IP 주소 입력: `http://192.168.0.2:3001` (실제 IP로 변경)
4. "연결 테스트" 클릭

## 🔍 단계별 확인

### Step 1: IP 주소 확인
```powershell
ipconfig
```
→ IPv4 주소 확인 (예: `192.168.0.2`)

### Step 2: 서버 실행 확인
```bash
node server/index.js
```
→ "백엔드 서버가 ... 실행 중입니다" 메시지 확인

### Step 3: 로컬 테스트
브라우저에서 `http://localhost:3001/health` 접속
→ 정상 응답 확인

### Step 4: 네트워크 테스트
다른 기기에서 `http://[PC-IP]:3001/health` 접속
→ 정상 응답 확인

### Step 5: 앱 설정
앱에서 서버 URL을 실제 PC IP로 설정
→ 연결 테스트

## 💡 빠른 해결

### 방법 1: IP 주소 재확인 및 업데이트

1. PC에서 `ipconfig` 실행
2. IPv4 주소 확인
3. 앱의 서버 설정에서 IP 주소 업데이트
4. 연결 테스트

### 방법 2: 클라우드 서버 사용

로컬 서버 대신 클라우드 서버 사용:
- 앱에서 "클라우드" 선택
- `https://econavi-production.up.railway.app` 입력
- 저장 후 사용

### 방법 3: Android 에뮬레이터 사용

에뮬레이터를 사용하는 경우:
- 서버 URL: `http://10.0.2.2:3001`
- 별도 네트워크 설정 불필요

## ❓ 자주 묻는 질문

### Q: 왜 클라우드 서버는 되는데 로컬 서버는 안 되나요?

**A:** 클라우드 서버는 인터넷을 통해 접근하므로 네트워크 설정이 필요 없습니다. 로컬 서버는:
- 같은 Wi-Fi 네트워크 필요
- 방화벽 설정 필요
- 정확한 IP 주소 필요

### Q: IP 주소가 계속 바뀌어요

**A:** 
- 라우터에서 고정 IP 설정 (DHCP 예약)
- 또는 매번 `ipconfig`로 확인 후 앱에 입력

### Q: 방화벽을 열었는데도 안 돼요

**A:**
- Windows Defender 방화벽과 타사 방화벽 모두 확인
- 공용/사설 네트워크 프로필 모두 허용
- 서버 재시작

---

**추가 도움이 필요하시면 이슈를 생성해주세요!** 🔧

