# 📂 EcoNaviAR 코드 구조 및 파일 설명

이 문서는 EcoNaviAR 프로젝트의 주요 디렉토리와 파일들의 역할을 설명합니다. 개발 시 참고하여 각 파일의 책임을 이해하는 데 활용하세요.

## 📱 1. Client (EcoNaviAR)

React Native로 개발된 모바일 애플리케이션의 코드베이스입니다.

### `src/pages` (화면 단위 컴포넌트)
*   **`MainPage.tsx`**: 앱의 메인 화면입니다. 경로 검색 로직(Tmap, ODsay API 호출), 백그라운드 기준 데이터 확보, 폴백 로직 등이 구현되어 있습니다.
*   **`RouteResultPage.tsx`**: 경로 검색 결과를 보여주는 화면입니다. 지도, 상세 경로 안내, 탄소 배출량 비교 차트 등을 표시합니다.
*   **`MyPage.tsx`**: 사용자 정보, 포인트 지갑, 통계, 차량 종류 설정(`Picker`) 등이 있는 마이페이지입니다.
*   **`AuthPage.tsx`**: 로그인 및 회원가입을 처리하는 인증 화면입니다.
*   **`RankingPage.tsx`**: 사용자 랭킹을 보여주는 화면입니다.
*   **`StorePage.tsx`**: 포인트를 사용하여 상품을 교환하는 상점 화면입니다.
*   **`QuestPage.tsx`**, **`ReportPage.tsx`**: 퀘스트 및 월간 리포트 화면입니다.

### `src/components` (재사용 가능한 UI 컴포넌트)
*   **`RouteForm.tsx`**: 출발지/도착지 입력 및 검색, 교통수단 선택(버튼형), 지도 미리보기 기능을 담당하는 폼 컴포넌트입니다. 검색 모달이 포함되어 있습니다.
*   **`RouteMap.tsx`**: `react-native-maps`를 사용하여 경로를 지도에 그리는 컴포넌트입니다. 상세 경로(Polyline), 노선별 색상, 도보 점선, 자전거 대여소 마커 표시 등을 담당합니다.
*   **`RouteResult.tsx`**: 경로의 요약 정보(거리, 시간, 배출량)와 대중교통 상세 환승 정보를 리스트로 보여주는 카드 컴포넌트입니다.
*   **`ModeComparison.tsx`**: 현재 선택한 경로와 다른 이동수단(내 차량, 대중교통, 도보 등)의 탄소 배출량 및 시간을 비교하는 차트 컴포넌트입니다.
*   **`Wallet.tsx`**, **`Statistics.tsx`**, **`History.tsx`**, **`Achievements.tsx`**, **`GoalSetting.tsx`**: 마이페이지 등에서 사용되는 포인트, 통계, 기록, 업적, 목표 설정 관련 컴포넌트들입니다.

### `src/utils` (비즈니스 로직 및 헬퍼 함수)
*   **`carbonCalculator.ts` (⭐ 핵심)**: 탄소 배출량 계산의 모든 로직이 들어있습니다.
    *   `calculateVehicleEmission`: 차종별(하이브리드, 전기차 등) 상세 배출량 계산.
    *   `calculateBus/SubwayEmission`: 시간/요일별 혼잡도(`getEstimatedPassengerCount`)를 반영한 1인당 배출량 계산.
    *   `CARBON_EMISSION_FACTORS`: 각 수단별 배출 계수 정의.
*   **`historyManager.ts`**: 로컬 저장소(AsyncStorage)에 검색 기록 등을 저장하고 관리하는 유틸리티입니다.

### `src/services` (API 통신)
*   **`api.ts`**: 백엔드 서버(`server`)와 통신하는 모든 Axios 요청 함수들이 모여 있습니다. (로그인, 기록 저장, 랭킹 조회, 차량 정보 업데이트 등)

### `src/contexts` (전역 상태 관리)
*   **`AuthContext.tsx`**: 사용자 로그인 상태(Token)와 사용자 정보(차량 종류 포함)를 전역으로 관리하고 제공합니다.

### `src/types` (타입 정의)
*   **`index.ts`**: `Route`, `TransportMode`, `CarbonEmission`, `PolylineSegment` 등 앱 전반에서 사용되는 TypeScript 인터페이스와 타입들이 정의되어 있습니다.

---

## 🖥️ 2. Server (server)

Node.js와 Express로 구축된 백엔드 서버입니다.

*   **`index.js`**: 서버의 진입점입니다. API 라우팅(`/register`, `/login`, `/me/vehicle`, `/trips` 등)과 요청 처리 로직이 구현되어 있습니다.
*   **`database.js`**: SQLite 데이터베이스 연결 및 테이블 스키마(`users`, `trips` 등)를 정의하고 초기화합니다.
*   **`authMiddleware.js`**: JWT 토큰을 검증하여 인증된 사용자만 API를 사용할 수 있도록 하는 미들웨어입니다.
*   **`achievements.js`**, **`quests.js`**: 업적 및 퀘스트 달성 여부를 체크하는 비즈니스 로직이 분리되어 있습니다.

---

## ⚠️ 주의 사항 (Legacy)

*   **`src/` (Root Directory)**: 프로젝트 루트에 있는 `src` 폴더는 초기 웹 프로토타입용 레거시 코드이거나 미사용 코드입니다. **모바일 앱 개발 시에는 `EcoNaviAR/src` 내부의 파일만 수정해야 합니다.** 혼동하지 않도록 주의하세요.
