# 📡 API 명세서 (API Specification)

이 문서는 EcoNaviAR 프로젝트에서 사용하는 외부 API와 자체 백엔드 API의 명세를 정리합니다.

---

## 1. 외부 API (External APIs)

### A. Tmap API

*   **역할:** 자동차, 도보, 자전거 등 대중교통을 제외한 경로 탐색 및 POI(장소) 검색 담당.
*   **API 키:** `EcoNaviAR/src/config/apiKeys.ts` 파일에서 설정 (⚠️ 보안: 실제 키는 Git에 커밋되지 않음)
*   **주요 사용 엔드포인트:**
    *   **POI 검색 (Geocoding):** `https://apis.openapi.sk.com/tmap/pois`
        *   `RouteForm.tsx`에서 장소 검색 자동완성에 사용.
    *   **자동차 경로 탐색:** `https://apis.openapi.sk.com/tmap/routes?version=1`
        *   `MainPage.tsx`에서 자동차, 도보, 자전거 경로 탐색에 사용. `searchOption` (0: 최단, 10: 무료)으로 경로 옵션 구분.

### B. ODsay API

*   **역할:** 대중교통(버스+지하철) 상세 경로 탐색 담당.
*   **API 키:** `EcoNaviAR/src/config/apiKeys.ts` 파일에서 설정 (⚠️ 보안: 실제 키는 Git에 커밋되지 않음)
*   **주요 사용 엔드포인트:**
    *   **대중교통 길찾기:** `https://api.odsay.com/v1/api/searchPubTransPathT`
        *   `MainPage.tsx`에서 대중교통 경로의 전체적인 정보(거리, 시간, 환승 정보)를 가져옴.
    *   **상세 경로 그래픽 데이터:** `https://api.odsay.com/v1/api/loadLane`
        *   위 길찾기 결과의 `mapObj` ID를 사용하여, 지도에 표시할 상세 좌표(Polyline)와 노선별 색상 정보를 가져옴.

### C. Google Maps API

*   **역할:** `react-native-maps`의 지도 타일 제공.
*   **API 키:** `EcoNaviAR/src/config/apiKeys.ts` 파일에서 설정 (⚠️ 보안: 실제 키는 Git에 커밋되지 않음)
*   **설정 위치:** 
    * 코드: `EcoNaviAR/src/config/apiKeys.ts`
    * Android: `EcoNaviAR/android/app/src/main/AndroidManifest.xml` (빌드 시 주입 필요)

---

## 2. 자체 백엔드 API (Backend API)

*   **Base URL:** `http://localhost:3001` (클라이언트에서는 `http://10.0.2.2:3001`로 접근)
*   **인증:** `/register`, `/login`을 제외한 대부분의 엔드포인트는 HTTP 헤더에 `Authorization: Bearer <JWT_TOKEN>` 필요.

### A. 인증 (Auth)

*   `POST /register`: 회원가입
    *   **Request Body:** `{ "username": "...", "password": "..." }`
*   `POST /login`: 로그인. 성공 시 JWT 토큰 반환.
    *   **Request Body:** `{ "username": "...", "password": "..." }`

### B. 사용자 정보 (User)

*   `GET /me`: 현재 로그인된 사용자 정보 조회.
    *   **Response:** `{ "id", "username", "points", "monthly_goal", "vehicle_type" }`
*   `POST /me/vehicle`: 사용자 차량 종류 설정.
    *   **Request Body:** `{ "vehicleType": "car" | "electric_car" | "hybrid" ... }`
*   `POST /goal`: 월간 탄소 절감 목표 설정.
    *   **Request Body:** `{ "monthly_goal": 10000 }`

### C. 활동 및 보상 (Activity & Reward)

*   `POST /trips`: 이동 기록 저장.
    *   **Request Body:** `{ "route": { ... }, "emission": { ... } }`
*   `GET /trips`: 내 이동 기록 목록 조회.
*   `GET /achievements`: 내가 달성한 업적 목록 조회.
*   `GET /ranking`: 전체 사용자 랭킹 조회.

### D. 상점 및 퀘스트 (Store & Quest)

*   `GET /products`: 상점 아이템 목록 조회.
*   `POST /products/:id/exchange`: 포인트로 아이템 교환.
*   `GET /quests`: 퀘스트 목록 및 내 진행 상황 조회.
*   `POST /quests/:id/reward`: 완료된 퀘스트 보상 수령.

### E. 통계 (Statistics)

*   `GET /reports/:year/:month`: 월간 리포트 데이터 조회.
