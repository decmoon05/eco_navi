# 🌐 외부 접속 설정 가이드

EcoNaviAR 앱을 실제 휴대폰에서 사용하거나, 집 밖에서도 접속할 수 있도록 설정하는 방법입니다.

## 📋 목차

1. [로컬 네트워크 접속 (집 내부)](#로컬-네트워크-접속-집-내부)
2. [외부 네트워크 접속 (집 밖)](#외부-네트워크-접속-집-밖)
3. [서버 설정 방법](#서버-설정-방법)
4. [문제 해결](#문제-해결)

---

## 🏠 로컬 네트워크 접속 (집 내부)

### 시나리오
- 미니PC에서 서버 실행
- 노트북/휴대폰이 같은 Wi-Fi 네트워크에 연결
- 집 안에서만 사용

### 1. 미니PC에서 서버 실행

```bash
cd /path/to/eco_navi/server
npm install  # 최초 1회만
node index.js
```

서버는 기본적으로 `0.0.0.0:3001`에서 실행되어 모든 네트워크 인터페이스에서 접속 가능합니다.

### 2. 미니PC의 로컬 IP 주소 확인

미니PC(리눅스)에서 다음 명령어 실행:

```bash
# 방법 1: ip 명령어
ip addr show | grep "inet " | grep -v 127.0.0.1

# 방법 2: ifconfig (설치 필요 시: sudo apt install net-tools)
ifconfig | grep "inet " | grep -v 127.0.0.1

# 방법 3: hostname 명령어
hostname -I
```

예시 출력:
```
inet 192.168.0.100/24
```

**미니PC의 IP 주소: `192.168.0.100`** (예시)

### 3. 앱에서 서버 주소 설정

1. 앱 실행 후 **마이페이지**로 이동
2. **"서버 설정"** 섹션 찾기
3. 서버 URL 입력: `http://192.168.0.100:3001` (실제 IP 주소로 변경)
4. **"연결 테스트"** 버튼으로 연결 확인
5. **"저장"** 버튼 클릭
6. 앱 재시작

### 4. 노트북에서 테스트 (에뮬레이터)

에뮬레이터를 사용하는 경우, 기본값(`http://10.0.2.2:3001`)이 자동으로 적용되어 **별도 설정 없이** 기존처럼 작동합니다.

---

## 🌍 외부 네트워크 접속 (집 밖)

### 시나리오
- 미니PC에서 서버 실행
- 집 밖 어디서나 접속 가능
- 공인 IP 주소 또는 도메인 필요

### 1. 공인 IP 주소 확인

미니PC에서 다음 명령어로 공인 IP 확인:

```bash
curl ifconfig.me
# 또는
curl ipinfo.io/ip
```

또는 브라우저에서 https://whatismyipaddress.com/ 접속

### 2. 라우터 포트 포워딩 설정

**중요:** 라우터 관리 페이지에서 포트 포워딩을 설정해야 합니다.

1. 라우터 관리 페이지 접속 (보통 `192.168.0.1` 또는 `192.168.1.1`)
2. **포트 포워딩** 또는 **Virtual Server** 메뉴 찾기
3. 다음 설정 추가:
   - **외부 포트:** 3001 (또는 원하는 포트)
   - **내부 IP:** 미니PC의 로컬 IP (예: 192.168.0.100)
   - **내부 포트:** 3001
   - **프로토콜:** TCP

### 3. 방화벽 설정 (리눅스)

미니PC에서 방화벽 포트 열기:

```bash
# UFW 사용 시
sudo ufw allow 3001/tcp

# firewalld 사용 시
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload

# iptables 사용 시
sudo iptables -A INPUT -p tcp --dport 3001 -j ACCEPT
```

### 4. 앱에서 서버 주소 설정

1. 앱 실행 후 **마이페이지**로 이동
2. **"서버 설정"** 섹션 찾기
3. 서버 URL 입력: `http://[공인IP]:3001` (예: `http://123.45.67.89:3001`)
4. **"연결 테스트"** 버튼으로 연결 확인
5. **"저장"** 버튼 클릭
6. 앱 재시작

### 5. (선택) 도메인 사용

더 편리한 접속을 위해 DDNS 서비스를 사용할 수 있습니다:

- **무료 DDNS 서비스:** No-IP, DuckDNS 등
- 도메인 예: `yourname.ddns.net`
- 앱에서 설정: `http://yourname.ddns.net:3001`

---

## ⚙️ 서버 설정 방법

### 환경 변수 설정 (선택사항)

`server/.env` 파일 생성 (없는 경우):

```bash
cd server
nano .env  # 또는 vi .env
```

내용:
```env
JWT_SECRET=your_secret_key_here_change_this_to_a_random_string
PORT=3001
HOST=0.0.0.0
```

### 서버 자동 시작 설정 (systemd)

미니PC 재부팅 시 자동으로 서버가 시작되도록 설정:

```bash
# 서비스 파일 생성
sudo nano /etc/systemd/system/econavi.service
```

내용:
```ini
[Unit]
Description=EcoNavi Backend Server
After=network.target

[Service]
Type=simple
User=your_username
WorkingDirectory=/path/to/eco_navi/server
ExecStart=/usr/bin/node index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

서비스 활성화:
```bash
sudo systemctl daemon-reload
sudo systemctl enable econavi
sudo systemctl start econavi
```

서비스 상태 확인:
```bash
sudo systemctl status econavi
```

---

## 🔧 문제 해결

### 연결이 안 될 때

1. **서버가 실행 중인지 확인**
   ```bash
   # 미니PC에서
   ps aux | grep node
   # 또는
   netstat -tulpn | grep 3001
   ```

2. **방화벽 확인**
   ```bash
   # 리눅스에서
   sudo ufw status
   # 또는
   sudo firewall-cmd --list-all
   ```

3. **라우터 포트 포워딩 확인**
   - 라우터 관리 페이지에서 설정 확인
   - 외부에서 포트 열림 확인: https://www.yougetsignal.com/tools/open-ports/

4. **IP 주소 확인**
   - 로컬 네트워크: 같은 Wi-Fi에 연결되어 있는지 확인
   - 외부 네트워크: 공인 IP가 변경되지 않았는지 확인 (동적 IP인 경우)

5. **앱에서 연결 테스트**
   - 마이페이지 > 서버 설정 > "연결 테스트" 버튼 사용
   - 오류 메시지 확인

### 보안 고려사항

⚠️ **중요:** 현재 HTTP를 사용하고 있습니다. 프로덕션 환경에서는 HTTPS를 사용하는 것을 강력히 권장합니다.

HTTPS 설정 방법:
1. Let's Encrypt로 무료 SSL 인증서 발급
2. Nginx를 리버스 프록시로 사용
3. 서버 포트를 443으로 변경

---

## 📝 요약

### 노트북에서 에뮬레이터 사용 (기존 방식)
- ✅ **별도 설정 불필요**
- 기본값 `http://10.0.2.2:3001` 자동 적용

### 실제 휴대폰 사용 (로컬 네트워크)
1. 미니PC IP 확인
2. 앱 > 마이페이지 > 서버 설정에서 IP 입력
3. 연결 테스트 후 저장

### 외부 접속 (집 밖)
1. 공인 IP 확인 또는 DDNS 설정
2. 라우터 포트 포워딩 설정
3. 방화벽 포트 열기
4. 앱에서 공인 IP 또는 도메인 입력

---

**추가 도움이 필요하시면 이슈를 생성해주세요!** 🚀






