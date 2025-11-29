# 🔌 Railway 포트 설정 수정 가이드

Railway에서 서버가 8080 포트에서 실행되는 경우 설정 방법입니다.

## 🔍 문제

서버 로그를 보면:
```
백엔드 서버가 http://0.0.0.0:8080 에서 실행 중입니다.
```

Railway는 자동으로 `PORT` 환경 변수를 설정합니다. 일반적으로 **8080**을 사용합니다.

하지만 Railway Networking 설정에서 Target port를 **3001**로 설정했다면 연결이 실패합니다.

## ✅ 해결 방법

### 방법 1: Railway Networking에서 Target Port 변경 (권장)

1. Railway 대시보드 → **Networking** 탭
2. **Public Networking** 섹션에서 도메인 찾기
3. 도메인 옆의 **설정 아이콘** (또는 "Update" 버튼) 클릭
4. **Target port**를 **8080**으로 변경
5. **"Update"** 버튼 클릭

### 방법 2: 서버 코드 수정 (비권장)

서버가 항상 3001 포트를 사용하도록 하드코딩할 수 있지만, Railway의 자동 포트 할당을 무시하므로 권장하지 않습니다.

## 📋 확인 사항

### 1. 서버 로그 확인

Deploy Logs에서 다음 메시지 확인:
```
백엔드 서버가 http://0.0.0.0:8080 에서 실행 중입니다.
```

포트 번호를 확인하세요 (8080 또는 다른 값).

### 2. Railway Networking 설정 확인

**Target port**가 서버가 실제로 리스닝하는 포트와 일치해야 합니다:
- 서버가 8080에서 실행 → Target port: **8080**
- 서버가 3001에서 실행 → Target port: **3001**

## 🔄 Railway의 포트 동작

Railway는:
1. 자동으로 `PORT` 환경 변수를 설정 (일반적으로 8080)
2. 서버 코드에서 `process.env.PORT`를 읽어서 해당 포트로 리스닝
3. Networking에서 Target port를 설정하여 외부 요청을 해당 포트로 라우팅

**중요:** Target port는 서버가 실제로 리스닝하는 포트와 일치해야 합니다!

## ✅ 올바른 설정

### 현재 상황:
- 서버: 8080 포트에서 실행 중 ✅
- Railway Networking: Target port를 8080으로 설정 필요

### 설정 단계:

1. **Networking 탭** → Public Networking
2. 도메인 옆 **설정 아이콘** 클릭
3. **Target port: 8080** 입력
4. **Update** 클릭

### 확인:

배포 로그에서:
```
백엔드 서버가 http://0.0.0.0:8080 에서 실행 중입니다.
```

이면 Target port를 **8080**으로 설정하세요.

## 🧪 테스트

설정 후:
```
https://econavi-production.up.railway.app/health
```

브라우저에서 접속하여 정상 응답 확인:
```json
{
  "status": "ok",
  "message": "서버가 정상적으로 실행 중입니다."
}
```

## 💡 참고

### 포트를 3001로 고정하고 싶다면

`server/index.js` 수정:
```javascript
const port = process.env.PORT || 3001;
// Railway에서는 process.env.PORT를 우선 사용하므로
// Railway의 PORT 환경 변수를 3001로 설정하거나
// 위 코드를 다음과 같이 변경:
const port = process.env.PORT || process.env.SERVER_PORT || 3001;
```

하지만 Railway는 자동으로 PORT를 설정하므로, **Target port를 서버가 실제로 사용하는 포트로 맞추는 것이 더 간단**합니다.

---

**추가 도움이 필요하시면 이슈를 생성해주세요!** 🔌

