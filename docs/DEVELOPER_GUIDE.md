# 🔧 EcoNaviAR Developer Guide

**Version:** 1.0.0  
**Last Updated:** 2025-01-24  
**Target Audience:** Software Developers, System Architects, Technical Contributors

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Core Components Deep Dive](#core-components-deep-dive)
5. [API Specifications](#api-specifications)
6. [Database Schema](#database-schema)
7. [Key Algorithms](#key-algorithms)
8. [Development Environment Setup](#development-environment-setup)
9. [Build & Deployment](#build--deployment)
10. [Security Considerations](#security-considerations)
11. [Troubleshooting](#troubleshooting)
12. [Contributing Guidelines](#contributing-guidelines)

---

## 🏗️ Architecture Overview

### System Architecture

EcoNaviAR is a **client-server architecture** with the following components:

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile Application                        │
│                  (React Native - Android/iOS)                 │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   UI Layer   │  │  State Mgmt  │  │  API Client  │      │
│  │  (Pages/     │  │  (Contexts)  │  │  (Services)  │      │
│  │  Components) │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘             │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Backend API   │
                    │  (Node.js/     │
                    │   Express)     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   SQLite DB     │
                    │  (database.db)  │
                    └─────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼───────┐  ┌───────▼────────┐
│   Tmap API     │  │   ODsay API    │  │  Public Data   │
│  (Route/POI)   │  │  (Public       │  │  Portal API    │
│                │  │   Transit)     │  │  (Bus/Subway)  │
└────────────────┘  └────────────────┘  └────────────────┘
```

### Data Flow

1. **Route Search Flow:**
   ```
   User Input → RouteForm → MainPage → Tmap/ODsay API → Route Processing → 
   Carbon Calculation → RouteResultPage → Save to Server/Queue
   ```

2. **Authentication Flow:**
   ```
   Login → AuthContext → API Service → Backend (JWT) → Token Storage → 
   User Info Fetch → Context Update
   ```

3. **Offline Support Flow:**
   ```
   API Call → Network Error → Request Queue → AsyncStorage → 
   Network Recovery → Auto Retry → Server Sync
   ```

---

## 🛠️ Technology Stack

### Frontend (Mobile App)

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React Native** | 0.82.0 | Cross-platform mobile framework |
| **React** | 19.1.1 | UI library |
| **TypeScript** | 5.8.3 | Type safety and developer experience |
| **React Navigation** | 7.x | Navigation and routing |
| **React Native Paper** | 5.14.5 | Material Design components |
| **React Native Maps** | 1.26.18 | Map visualization |
| **Axios** | 1.12.2 | HTTP client |
| **AsyncStorage** | 2.2.0 | Local data persistence |
| **JWT Decode** | 4.0.0 | Token parsing |

### Backend (Server)

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | >=20 | Runtime environment |
| **Express.js** | 4.18.2 | Web framework |
| **SQLite3** | 5.1.6 | Database |
| **JWT** | 9.0.0 | Authentication tokens |
| **bcrypt** | 5.1.0 | Password hashing |
| **CORS** | 2.8.5 | Cross-origin resource sharing |
| **dotenv** | 16.0.3 | Environment variable management |

### External APIs

| API | Purpose | Documentation |
|-----|---------|---------------|
| **Tmap API** | Route search (car, walking, bicycle), POI search | [SK Open API](https://openapi.sk.com/) |
| **ODsay API** | Public transit route search | [ODsay API](https://www.odsay.com/) |
| **Public Data Portal** | Real-time bus/subway arrival info | [공공데이터포털](https://www.data.go.kr/) |

---

## 📁 Project Structure

### Root Directory

```
eco_navi/
├── EcoNaviAR/              # React Native mobile app (Git submodule)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Screen components
│   │   ├── services/       # API client services
│   │   ├── utils/          # Business logic & helpers
│   │   ├── contexts/       # Global state management
│   │   ├── types/          # TypeScript type definitions
│   │   ├── theme/          # Design system (colors, typography, etc.)
│   │   └── config/         # Configuration files
│   ├── android/            # Android native code
│   ├── ios/                # iOS native code
│   └── package.json
├── server/                 # Node.js backend
│   ├── index.js            # Main server file
│   ├── database.js         # Database schema & connection
│   ├── authMiddleware.js   # JWT authentication middleware
│   ├── adminMiddleware.js  # Admin role check middleware
│   ├── achievements.js     # Achievement logic
│   ├── quests.js          # Quest logic
│   └── package.json
├── docs/                   # Documentation
└── README.md
```

### Key Directories Explained

#### `EcoNaviAR/src/components/`

Reusable UI components following the **Single Responsibility Principle**:

- **`RouteForm.tsx`**: Handles origin/destination input, transport mode selection, search modal
- **`RouteMap.tsx`**: Renders route polylines on map with different colors per transport mode
- **`RouteResult.tsx`**: Displays route summary (distance, time, emission) and transit details
- **`ModeComparison.tsx`**: Compares carbon emissions across different transport modes
- **`AnimatedCard.tsx`**: Reusable card component with fade-in and slide-up animations
- **`FadeInView.tsx`**: Simple fade-in animation wrapper
- **`LoadingOverlay.tsx`**: Full-screen loading indicator with custom messages

#### `EcoNaviAR/src/pages/`

Screen-level components (one per route):

- **`MainPage.tsx`**: Main route search screen, orchestrates API calls and route processing
- **`RouteResultPage.tsx`**: Displays search results with map, comparison charts, and action buttons
- **`MyPage.tsx`**: User profile, statistics, settings, achievements
- **`AuthPage.tsx`**: Login and registration screen
- **`DeveloperSettingsPage.tsx`**: Admin dashboard (user management, statistics)

#### `EcoNaviAR/src/utils/`

Business logic and helper functions:

- **`carbonCalculator.ts`**: ⭐ **Core algorithm** - Carbon emission calculation with traffic adjustment, passenger count estimation, slope correction
- **`searchHistoryManager.ts`**: User-specific search history storage and retrieval
- **`requestQueue.ts`**: Offline request queue with automatic retry and priority
- **`syncManager.ts`**: Synchronizes pending trips when network is available
- **`tagoApi.ts`**: Public Data Portal API wrapper (bus/subway real-time info)
- **`apiWithQueue.ts`**: Wrapper to integrate API calls with request queue

#### `EcoNaviAR/src/services/`

API communication layer:

- **`api.ts`**: Centralized Axios client with interceptors, base URL management, and queue integration

#### `EcoNaviAR/src/contexts/`

Global state management:

- **`AuthContext.tsx`**: Manages authentication state, user info, token storage

#### `EcoNaviAR/src/theme/`

Design system:

- **`colors.ts`**: Color palette (primary, secondary, background, text, etc.)
- **`typography.ts`**: Font styles and sizes
- **`spacing.ts`**: Consistent spacing scale
- **`shadows.ts`**: Shadow definitions for elevation
- **`index.ts`**: Exports unified theme object

---

## 🔍 Core Components Deep Dive

### 1. Carbon Emission Calculator (`carbonCalculator.ts`)

**Purpose:** Calculate accurate carbon emissions based on transport mode, distance, traffic conditions, and route characteristics.

#### Key Functions:

##### `calculateTrafficAdjustedEmission(route: Route): CarbonEmission`

Main entry point for emission calculation. Handles:
- Speed-based emission factors (for vehicles)
- Passenger count estimation (for public transit)
- Slope correction (elevation data)
- Segment-based calculation (for multi-mode routes)

**Algorithm Flow:**
```
1. Check if route has segments (multi-mode route)
2. If segments exist:
   - Calculate emission for each segment
   - Sum all segment emissions
3. If no segments:
   - Apply speed-based factor (if vehicle)
   - Apply passenger count (if public transit)
   - Apply slope correction (if elevation data available)
4. Calculate saved emission (vs. car baseline)
```

##### `getEstimatedPassengerCount(mode: TransportMode, hour: number): number`

Estimates passenger count for public transit based on time of day:

```typescript
// Bus: Peak hours (7-9, 18-20) = 40 passengers, Off-peak = 5-20
// Subway: Peak hours = 1500 passengers, Off-peak = 500-800
// Train: Peak hours = 1200 passengers, Off-peak = 300-500
```

##### `calculateBusEmission(distance: number, passengerCount: number): number`

Calculates per-person bus emission:
```
Vehicle Total Emission = distance * BUS_EMISSION_FACTOR (600 gCO2/km)
Per Person Emission = Vehicle Total / Passenger Count
```

##### `getSlopeFactor(route: Route): number`

Applies elevation correction:
```
1. Calculate total ascent/descent from elevation data
2. Calculate average slope percentage
3. Apply vehicle-specific slope correction table
4. Return correction factor (1.0 = no change, >1.0 = increase)
```

#### Emission Factors:

| Transport Mode | Base Factor (gCO2/km) | Notes |
|----------------|----------------------|-------|
| Walking | 0 | No direct emissions |
| Bicycle | 0 | No direct emissions |
| Bus | 600 | Per vehicle, divided by passenger count |
| Subway | 10,000 | Per 10-car train, divided by passenger count |
| Train | 12,000 | Per 10-car train, divided by passenger count |
| Car | 170 | Average ICE vehicle |
| Electric Car | 50 | Grid electricity emissions |
| Hybrid | 95 | Combined ICE + electric |
| Hydrogen | 25 | Fuel cell emissions |
| Motorcycle | 90 | Small engine |
| Electric Motorcycle | 20 | Battery emissions |

### 2. Route Search Orchestration (`MainPage.tsx`)

**Purpose:** Coordinate multiple API calls to fetch route data from different sources and process them into a unified format.

#### Key Functions:

##### `fetchCarRouteData(origin, destination, searchOption, transportMode): Promise<RouteData>`

Fetches route from Tmap API:
- **searchOption**: 0 (fastest), 1 (shortest), 2 (free roads only)
- Handles different transport modes (car, walking, bicycle)
- Processes Tmap response into internal `Route` format
- Fetches elevation data if available

##### `fetchPublicTransitRouteData(origin, destination): Promise<RouteData>`

Fetches public transit route from ODsay API:
1. Call `searchPubTransPathT` for route overview
2. Call `loadLane` for detailed polyline data
3. Process segments (walking, bus, subway, train)
4. Map station IDs for real-time info lookup

#### Route Processing Pipeline:

```
1. User selects origin/destination
2. Determine effective transport mode
3. If public transit:
   - Fetch from ODsay API
   - Process segments
   - Add walking segments for transfers
4. If vehicle/walking/bicycle:
   - Fetch from Tmap API
   - Process coordinates
   - Fetch elevation data (optional)
5. Calculate carbon emissions
6. Store search history (user-specific)
7. Navigate to RouteResultPage
```

### 3. Offline Request Queue (`requestQueue.ts`)

**Purpose:** Store failed API requests locally and automatically retry when network is available.

#### Architecture:

```typescript
interface QueuedRequest {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  data?: any;
  headers?: Record<string, string>;
  priority: number; // 1-10, higher = more important
  retryCount: number;
  lastRetryAt: number;
  createdAt: number;
}
```

#### Key Functions:

##### `addToQueue(request, priority): Promise<void>`

Adds request to queue with:
- Unique ID generation
- Priority assignment
- AsyncStorage persistence

##### `processQueue(): Promise<void>`

Processes queued requests:
1. Sort by priority (descending)
2. Apply exponential backoff (retry delay increases with retry count)
3. Execute request
4. Remove on success, update retry count on failure
5. Remove if max retries exceeded

##### `startRequestQueueAutoSync()`

Starts automatic sync:
- Checks network status
- Processes queue every 30 seconds when online
- Uses `@react-native-community/netinfo` for network detection

### 4. Authentication System (`AuthContext.tsx`)

**Purpose:** Manage user authentication state globally across the app.

#### Flow:

```
1. App Start:
   - Check AsyncStorage for token
   - If token exists, fetch user info from /me endpoint
   - Update context state

2. Login:
   - Call /login API
   - Receive JWT token
   - Store token in AsyncStorage
   - Fetch user info
   - Update context

3. Logout:
   - Remove token from AsyncStorage
   - Clear context state
   - Navigate to AuthPage

4. Token Refresh:
   - Token expires after 1 hour
   - User must re-login (no automatic refresh implemented)
```

#### Token Storage:

- **Location:** `AsyncStorage` with key `'token'`
- **Format:** JWT string
- **Expiration:** 1 hour (configured in server)
- **Usage:** Included in `Authorization: Bearer <token>` header for all authenticated requests

### 5. Admin Dashboard (`DeveloperSettingsPage.tsx`)

**Purpose:** Provide admin users with user management and statistics viewing capabilities.

#### Features:

- **User Management Tab:**
  - List all users
  - View user details (carbon stats, trip count)
  - Change user passwords
  - Filter and search users

- **Statistics Tab:**
  - Total carbon saved (all users)
  - Total carbon emitted (all users)
  - Total distance traveled
  - Total trip count

#### Access Control:

- **Middleware:** `adminMiddleware.js` checks if `username === 'admin'`
- **Frontend:** Button only visible if `user.is_admin === true`
- **API Endpoints:** All `/admin/*` routes require admin middleware

---

## 📡 API Specifications

### Backend API Endpoints

#### Authentication

##### `POST /register`
Register a new user.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (201):**
```json
{
  "message": "회원가입이 성공적으로 완료되었습니다.",
  "userId": 1
}
```

**Errors:**
- `400`: Missing username or password
- `409`: Username already exists
- `500`: Server error

##### `POST /login`
Authenticate user and receive JWT token.

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "message": "로그인 성공!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Token Format:**
```json
{
  "id": 1,
  "username": "user123",
  "iat": 1234567890,
  "exp": 1234571490
}
```

#### User Management

##### `GET /me`
Get current user information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "username": "user123",
  "points": 5000,
  "monthly_goal": 10000,
  "vehicle_type": "car",
  "is_admin": 0
}
```

##### `POST /me/vehicle`
Update user's vehicle type.

**Request:**
```json
{
  "vehicleType": "electric_car"
}
```

**Valid Values:** `car`, `electric_car`, `hybrid`, `hydrogen`, `motorcycle`, `electric_motorcycle`

##### `POST /goal`
Set monthly carbon saving goal.

**Request:**
```json
{
  "monthly_goal": 15000
}
```

#### Trip Management

##### `POST /trips`
Save a trip record.

**Request:**
```json
{
  "route": {
    "origin": { "lat": 37.5665, "lng": 126.9780, "name": "서울시청" },
    "destination": { "lat": 37.5512, "lng": 127.0748, "name": "강남역" },
    "distance": 15.5,
    "duration": 30,
    "transportMode": "bus"
  },
  "emission": {
    "mode": "bus",
    "emissionPerKm": 15.0,
    "totalEmission": 232.5,
    "savedEmission": 2402.5
  }
}
```

**Response (201):**
```json
{
  "message": "이동 기록이 저장되었습니다.",
  "tripId": 123,
  "pointsEarned": 77
}
```

**Note:** This endpoint is integrated with the request queue for offline support.

##### `GET /trips`
Get user's trip history.

**Response (200):**
```json
[
  {
    "id": 1,
    "date": "2025-01-24T10:30:00Z",
    "origin_name": "서울시청",
    "destination_name": "강남역",
    "distance": 15.5,
    "duration": 30,
    "transport_mode": "bus",
    "total_emission": 232.5,
    "saved_emission": 2402.5
  }
]
```

#### Admin Endpoints

##### `GET /admin/users`
Get all users (admin only).

**Response (200):**
```json
[
  {
    "id": 1,
    "username": "user1",
    "points": 5000,
    "vehicle_type": "car",
    "is_admin": 0
  }
]
```

##### `GET /admin/users/:userId`
Get detailed user information including statistics.

**Response (200):**
```json
{
  "id": 1,
  "username": "user1",
  "points": 5000,
  "vehicle_type": "car",
  "is_admin": 0,
  "statistics": {
    "totalCarbonSaved": 50000,
    "totalCarbonEmitted": 100000,
    "totalDistance": 500,
    "tripCount": 50
  }
}
```

##### `POST /admin/users/:userId/password`
Change user's password (admin only).

**Request:**
```json
{
  "newPassword": "newpassword123"
}
```

**Validation:** Password must be at least 4 characters.

##### `GET /admin/statistics`
Get aggregate statistics for all users.

**Response (200):**
```json
{
  "totalCarbonSaved": 1000000,
  "totalCarbonEmitted": 2000000,
  "totalDistance": 10000,
  "totalTripCount": 1000,
  "userCount": 50
}
```

#### Quest System

##### `GET /quests`
Get user's quest list with progress.

**Response (200):**
```json
[
  {
    "id": "daily_walk_5km",
    "name": "하루 5km 걷기",
    "description": "하루에 5km 이상 도보로 이동하세요",
    "bonus": 100,
    "target": 5000,
    "progress": 3200,
    "status": "active"
  }
]
```

**Status Values:**
- `active`: Quest in progress
- `completed`: Quest completed, reward not claimed
- `rewarded`: Reward already claimed

##### `POST /quests/:questId/reward`
Claim quest reward.

**Response (200):**
```json
{
  "message": "보상을 수령했습니다.",
  "pointsEarned": 100
}
```

#### Store

##### `GET /products`
Get available products in store.

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "편의점 상품권 1,000원",
    "description": "전국 편의점에서 사용 가능한 모바일 상품권",
    "points_required": 1000,
    "icon": "🏪"
  }
]
```

##### `POST /products/:id/exchange`
Exchange points for product.

**Response (200):**
```json
{
  "message": "상품 교환이 완료되었습니다.",
  "remainingPoints": 4000
}
```

### External API Integration

#### Tmap API

**Base URL:** `https://apis.openapi.sk.com/tmap`

##### POI Search
```
GET /pois
Headers:
  appKey: <TMAP_API_KEY>

Query Parameters:
  searchKeyword: string
  searchType: "all" | "name" | "address"
  count: number (default: 20)
```

##### Route Search
```
POST /routes?version=1
Headers:
  appKey: <TMAP_API_KEY>
  Content-Type: application/json

Body:
{
  "startX": number,
  "startY": number,
  "endX": number,
  "endY": number,
  "reqCoordType": "WGS84GEO",
  "resCoordType": "WGS84GEO",
  "searchOption": number (0: fastest, 1: shortest, 2: free roads)
}
```

#### ODsay API

**Base URL:** `https://api.odsay.com/v1/api`

##### Public Transit Route Search
```
GET /searchPubTransPathT
Query Parameters:
  apiKey: <ODSAY_API_KEY>
  SX: number (start longitude)
  SY: number (start latitude)
  EX: number (end longitude)
  EY: number (end latitude)
```

##### Lane Detail (Polyline)
```
GET /loadLane
Query Parameters:
  apiKey: <ODSAY_API_KEY>
  mapObject: string (from searchPubTransPathT response)
```

#### Public Data Portal API

**Base URL:** `https://apis.data.go.kr/1613000`

##### Bus Arrival Info
```
GET /ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList
Query Parameters:
  serviceKey: <PUBLIC_DATA_API_KEY>
  cityCode: string (11: 서울, 26: 부산, etc.)
  nodeId: number (bus station ID)
  numOfRows: number
  pageNo: number
```

##### Subway Arrival Info
```
GET /SubwayInfoService/getSubwaySttnAcctoSchdulList
Query Parameters:
  serviceKey: <PUBLIC_DATA_API_KEY>
  subwayStationId: number
  subwayRouteId: number
  numOfRows: number
  pageNo: number
```

---

## 🗄️ Database Schema

### Tables

#### `users`

Stores user account information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique user ID |
| `username` | TEXT | UNIQUE, NOT NULL | Login username |
| `password` | TEXT | NOT NULL | bcrypt hashed password |
| `points` | INTEGER | DEFAULT 0 | User's ECO points |
| `monthly_goal` | INTEGER | DEFAULT 10000 | Monthly carbon saving goal (g) |
| `goal_achieved_month` | TEXT | NULL | Month when goal was achieved (YYYY-MM) |
| `vehicle_type` | TEXT | NULL | User's vehicle type |
| `is_admin` | INTEGER | DEFAULT 0 | Admin flag (1 = admin, 0 = user) |

**Indexes:**
- `username` (UNIQUE constraint)

**Initialization:**
- On first run, creates 'admin' user with password '3297' (hashed) and `is_admin = 1`

#### `trips`

Stores user trip records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique trip ID |
| `user_id` | INTEGER | NOT NULL, FOREIGN KEY | References `users.id` |
| `date` | TEXT | NOT NULL | Trip date (ISO 8601) |
| `origin_name` | TEXT | NOT NULL | Origin location name |
| `destination_name` | TEXT | NOT NULL | Destination location name |
| `distance` | REAL | NOT NULL | Distance in kilometers |
| `duration` | INTEGER | NOT NULL | Duration in minutes |
| `transport_mode` | TEXT | NOT NULL | Transport mode used |
| `total_emission` | REAL | NOT NULL | Total carbon emission (g) |
| `saved_emission` | REAL | NOT NULL | Saved emission vs. car (g) |

**Indexes:**
- `user_id` (for fast user trip queries)

#### `user_achievements`

Tracks user achievements/badges.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique record ID |
| `user_id` | INTEGER | NOT NULL, FOREIGN KEY | References `users.id` |
| `achievement_id` | TEXT | NOT NULL | Achievement identifier |
| `date` | TEXT | NOT NULL | Achievement date (ISO 8601) |

**Constraints:**
- UNIQUE(`user_id`, `achievement_id`) - Prevents duplicate achievements

#### `products`

Store products available for exchange.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Product ID |
| `name` | TEXT | NOT NULL | Product name |
| `description` | TEXT | NULL | Product description |
| `points_required` | INTEGER | NOT NULL | Points needed to exchange |
| `icon` | TEXT | NULL | Emoji or icon identifier |

**Sample Data:**
- 편의점 상품권 1,000원 (1000 points)
- 커피 기프티콘 (3000 points)
- 나무 한 그루 심기 (5000 points)

#### `user_products`

Records of product exchanges.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Exchange record ID |
| `user_id` | INTEGER | NOT NULL, FOREIGN KEY | References `users.id` |
| `product_id` | INTEGER | NOT NULL, FOREIGN KEY | References `products.id` |
| `exchange_date` | TEXT | NOT NULL | Exchange date (ISO 8601) |

#### `user_quests`

Tracks user quest progress.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Quest record ID |
| `user_id` | INTEGER | NOT NULL, FOREIGN KEY | References `users.id` |
| `quest_id` | TEXT | NOT NULL | Quest identifier |
| `progress` | INTEGER | DEFAULT 0 | Current progress value |
| `target` | INTEGER | NOT NULL | Target value to complete |
| `status` | TEXT | DEFAULT 'active' | Quest status |
| `last_updated` | TEXT | NOT NULL | Last update timestamp |

**Constraints:**
- UNIQUE(`user_id`, `quest_id`) - One quest record per user

**Status Values:**
- `active`: Quest in progress
- `completed`: Target reached, reward not claimed
- `rewarded`: Reward claimed

### Database Initialization

The database is initialized automatically when `database.js` is first loaded:

1. Creates `database.db` file if it doesn't exist
2. Creates all tables with `CREATE TABLE IF NOT EXISTS`
3. Adds columns with `ALTER TABLE` (ignores errors if column exists)
4. Inserts sample data (products, admin user) if tables are empty

**Location:** `./database.db` (relative to server directory)

**Note:** `database.db` is in `.gitignore` and should not be committed to version control.

---

## 🧮 Key Algorithms

### 1. Carbon Emission Calculation Algorithm

#### Overview

The carbon emission calculation is the **core algorithm** of EcoNaviAR. It must accurately reflect real-world emissions while being computationally efficient.

#### Step-by-Step Process

##### Step 1: Determine Base Emission Factor

```typescript
const baseFactor = CARBON_EMISSION_FACTORS[transportMode];
// Example: car = 170 gCO2/km, bus = 600 gCO2/km (per vehicle)
```

##### Step 2: Apply Speed-Based Correction (Vehicles Only)

For vehicles (car, electric_car, hybrid, motorcycle), speed affects fuel efficiency:

```typescript
const avgSpeed = distance / (duration / 60); // km/h
const speedFactor = lookupSpeedFactor(transportMode, avgSpeed);
// Uses SPEED_CO2_TABLE with linear interpolation
```

**Speed Factor Table Example (Car):**
- 0 km/h: 600 gCO2/km (idling)
- 30 km/h: 200 gCO2/km (city driving)
- 60 km/h: 140 gCO2/km (optimal)
- 120 km/h: 180 gCO2/km (highway, less efficient)

##### Step 3: Apply Passenger Count (Public Transit Only)

For public transit, divide vehicle emission by passenger count:

```typescript
const passengerCount = getEstimatedPassengerCount(mode, currentHour);
const perPersonEmission = (baseFactor * distance) / passengerCount;
```

**Passenger Count Estimation:**
- **Bus (Peak: 7-9, 18-20):** 40 passengers
- **Bus (Off-peak):** 5-20 passengers (varies by hour)
- **Subway (Peak):** 1500 passengers
- **Subway (Off-peak):** 500-800 passengers
- **Train (Peak):** 1200 passengers
- **Train (Off-peak):** 300-500 passengers

##### Step 4: Apply Slope Correction (If Elevation Data Available)

```typescript
const slopeFactor = getSlopeFactor(route);
// Calculates average slope from elevation data
// Applies vehicle-specific correction table
const correctedEmission = baseEmission * slopeFactor;
```

**Slope Correction Factors:**
- **Uphill (+5% slope):** Car = 1.3x, Electric = 1.5x
- **Downhill (-5% slope):** Car = 0.7x, Electric = 0.5x (regenerative braking)

##### Step 5: Calculate Saved Emission

```typescript
const carBaseline = CARBON_EMISSION_FACTORS.car * distance;
const savedEmission = Math.max(0, carBaseline - totalEmission);
```

#### Multi-Segment Route Handling

For routes with multiple segments (e.g., walk → bus → subway → walk):

```typescript
let totalEmission = 0;
for (const segment of route.segments) {
  const segmentEmission = calculateSegmentEmission(segment);
  totalEmission += segmentEmission;
}
```

Each segment is calculated independently with its own transport mode and characteristics.

### 2. Route Processing Algorithm

#### Tmap Route Processing

1. **API Call:** POST to `/routes?version=1`
2. **Response Parsing:**
   - Extract `features[0].geometry.coordinates` for polyline
   - Extract `properties.totalDistance` and `totalTime`
   - Convert coordinates to `[lat, lng]` format
3. **Elevation Data (Optional):**
   - Sample coordinates (max 100 points for API limit)
   - Call Open Elevation API
   - Interpolate to match original coordinate count
4. **Route Object Creation:**
   ```typescript
   {
     origin, destination,
     distance, duration,
     transportMode,
     path: coordinates,
     elevationData: elevations
   }
   ```

#### ODsay Route Processing

1. **Step 1 - Route Search:**
   - Call `searchPubTransPathT`
   - Extract `path[0]` (first recommended route)
   - Get `mapObj` ID for detailed data

2. **Step 2 - Segment Processing:**
   ```typescript
   for (const subPath of path[0].subPath) {
     if (subPath.trafficType === 1) { // Walking
       segments.push({ mode: 'walking', ... });
     } else if (subPath.trafficType === 2) { // Bus
       segments.push({ mode: 'bus', stationId, routeId, ... });
     } else if (subPath.trafficType === 3) { // Subway
       segments.push({ mode: 'subway', stationId, routeId, ... });
     } else if (subPath.trafficType === 4) { // Train
       segments.push({ mode: 'train', stationId, ... });
     }
   }
   ```

3. **Step 3 - Polyline Fetch:**
   - Call `loadLane` with `mapObj`
   - Extract `lane[]` array
   - Each lane has `section[]` with coordinates
   - Combine all sections into single polyline

4. **Step 4 - Walking Segments:**
   - Add walking segment from origin to first station
   - Add walking segments between transfers
   - Add walking segment from last station to destination

### 3. Offline Queue Algorithm

#### Queue Structure

```typescript
interface QueuedRequest {
  id: string;              // Unique identifier
  method: string;          // HTTP method
  url: string;            // API endpoint
  data?: any;             // Request body
  headers?: object;       // Request headers (includes auth token)
  priority: number;       // 1-10, higher = more important
  retryCount: number;     // Current retry attempt
  lastRetryAt: number;    // Timestamp of last retry
  createdAt: number;      // Timestamp of creation
}
```

#### Retry Strategy

**Exponential Backoff:**
```typescript
const baseDelay = 1000; // 1 second
const maxDelay = 300000; // 5 minutes
const delay = Math.min(
  baseDelay * Math.pow(2, retryCount),
  maxDelay
);
```

**Retry Conditions:**
- Network error (ERR_NETWORK)
- 5xx server errors
- 429 (Too Many Requests)

**Skip Retry:**
- 4xx client errors (except 429)
- Max retries exceeded (default: 3)

#### Priority System

| Priority | Use Case | Example |
|----------|----------|---------|
| 10 | Critical user actions | Login, registration |
| 8 | Important features | Quest rewards, trip saving |
| 5 | Standard operations | Trip history, statistics |
| 3 | Background sync | Search history, favorites |
| 1 | Low priority | Analytics, logging |

### 4. Search History Management

#### User-Specific Storage

**Key Format:**
```typescript
const key = `ecoNaviSearchHistory_${userId}`;
// Example: "ecoNaviSearchHistory_5"
```

**Storage Structure:**
```typescript
interface SearchHistoryEntry {
  id: number;              // Timestamp as ID
  searchTime: string;      // ISO 8601 timestamp
  origin: Location;
  destination: Location;
  transportMode: string;
}
```

**Note:** `routesData` is NOT stored (too large). User must re-search to see route details.

#### Deduplication Logic

```typescript
// Remove duplicate searches (same origin, destination, mode)
const filtered = history.filter(entry => 
  !(entry.origin.lat === origin.lat &&
    entry.origin.lng === origin.lng &&
    entry.destination.lat === destination.lat &&
    entry.destination.lng === destination.lng &&
    entry.transportMode === transportMode)
);
```

#### Size Management

- **Max Items:** 20 entries per user
- **Size Limit:** 1MB JSON string
- **Auto Trim:** If size exceeds limit, keep only newest 10 entries

---

## 🚀 Development Environment Setup

### Prerequisites

- **Node.js:** >= 20.0.0
- **npm** or **yarn**
- **React Native CLI:** `npm install -g react-native-cli`
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)
- **Git**

### Step 1: Clone Repository

```bash
git clone https://github.com/decmoon05/eco_navi.git
cd eco_navi
```

### Step 2: Initialize Submodule

```bash
git submodule update --init --recursive
```

### Step 3: Install Dependencies

#### Backend

```bash
cd server
npm install
```

#### Frontend

```bash
cd EcoNaviAR
npm install
# or
yarn install
```

### Step 4: Configure API Keys

#### Create API Keys File

```bash
cd EcoNaviAR/src/config
cp apiKeys.ts.example apiKeys.ts
```

#### Edit `apiKeys.ts`:

```typescript
export const API_KEYS = {
  TMAP_API_KEY: 'your-tmap-api-key',
  ODSAY_API_KEY: 'your-odsay-api-key',
  PUBLIC_DATA_API_KEY: 'your-public-data-api-key',
  GOOGLE_MAPS_API_KEY: 'your-google-maps-api-key', // Optional
};
```

**Note:** `apiKeys.ts` is in `.gitignore` and will not be committed.

### Step 5: Configure Backend Environment

#### Create `.env` File

```bash
cd server
touch .env
```

#### Edit `.env`:

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**Security Note:** Use a strong, random JWT secret in production. Generate with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 6: Initialize Database

The database is automatically created on first server start. No manual setup required.

### Step 7: Start Development Servers

#### Terminal 1: Backend Server

```bash
cd server
npm start
```

Server should start on `http://localhost:3001` (or `http://0.0.0.0:3001` for external access).

#### Terminal 2: Metro Bundler

```bash
cd EcoNaviAR
npm start
# or
yarn start
```

#### Terminal 3: Run App

**Android:**
```bash
cd EcoNaviAR
npm run android
```

**iOS (macOS only):**
```bash
cd EcoNaviAR
npm run ios
```

### Step 8: Verify Installation

1. **Backend Health Check:**
   ```bash
   curl http://localhost:3001/health
   ```
   Should return: `{"status":"ok","message":"서버가 정상적으로 실행 중입니다.",...}`

2. **Metro Bundler:**
   - Should show "Metro waiting on port 8081"
   - Open `http://localhost:8081` in browser to see Metro UI

3. **App:**
   - Should launch on emulator/device
   - Login screen should appear

---

## 🏗️ Build & Deployment

### Android Build

#### Development Build

```bash
cd EcoNaviAR/android
./gradlew assembleDebug
```

Output: `EcoNaviAR/android/app/build/outputs/apk/debug/app-debug.apk`

#### Production Build

1. **Generate Keystore:**
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configure `android/gradle.properties`:**
   ```properties
   MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
   MYAPP_RELEASE_KEY_ALIAS=my-key-alias
   MYAPP_RELEASE_STORE_PASSWORD=*****
   MYAPP_RELEASE_KEY_PASSWORD=*****
   ```

3. **Build:**
   ```bash
   cd EcoNaviAR/android
   ./gradlew assembleRelease
   ```

Output: `EcoNaviAR/android/app/build/outputs/apk/release/app-release.apk`

### iOS Build (macOS only)

```bash
cd EcoNaviAR/ios
pod install
cd ..
npm run ios -- --configuration Release
```

### Server Deployment

#### Production Environment Variables

```env
PORT=3001
NODE_ENV=production
JWT_SECRET=<strong-random-secret>
```

#### Process Manager (PM2)

```bash
npm install -g pm2
cd server
pm2 start index.js --name econavi-server
pm2 save
pm2 startup  # Auto-start on system boot
```

#### Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔒 Security Considerations

### Authentication & Authorization

1. **JWT Tokens:**
   - Tokens expire after 1 hour
   - Stored securely in AsyncStorage (encrypted on iOS, not on Android by default)
   - Include `id` and `username` in payload (no sensitive data)

2. **Password Security:**
   - Passwords hashed with bcrypt (10 salt rounds)
   - Never stored in plain text
   - Minimum length: 4 characters (consider increasing to 8+)

3. **Admin Access:**
   - Only `username === 'admin'` can access admin endpoints
   - Admin password should be changed from default '3297'
   - Consider implementing role-based access control (RBAC) for future

### API Security

1. **CORS:**
   - Currently allows all origins (`app.use(cors())`)
   - **Production:** Restrict to specific domains:
     ```javascript
     app.use(cors({
       origin: ['https://yourdomain.com'],
       credentials: true
     }));
     ```

2. **Rate Limiting:**
   - Not implemented (consider adding for production)
   - Recommended: Use `express-rate-limit` middleware

3. **Input Validation:**
   - Basic validation on required fields
   - **Improvement:** Use validation library (e.g., `joi`, `express-validator`)

4. **SQL Injection Prevention:**
   - Using parameterized queries (`?` placeholders)
   - SQLite3 driver handles escaping automatically

### Data Security

1. **API Keys:**
   - Stored in `.env` files (not committed)
   - `.gitignore` includes `**/config/apiKeys.ts`
   - **Never commit API keys to version control**

2. **Database:**
   - `database.db` in `.gitignore`
   - Contains user passwords (hashed) and personal data
   - **Backup regularly** in production

3. **Network Security:**
   - HTTP used for development (localhost)
   - **Production:** Use HTTPS with valid SSL certificate
   - Android `network_security_config.xml` allows cleartext for local IPs (development only)

### Best Practices

1. **Environment Variables:**
   - Use `.env` for all sensitive configuration
   - Never hardcode secrets in source code
   - Use different secrets for development/production

2. **Error Handling:**
   - Don't expose internal errors to clients
   - Log errors server-side for debugging
   - Return generic error messages to users

3. **Dependencies:**
   - Regularly update dependencies for security patches
   - Use `npm audit` to check for vulnerabilities
   - Review dependency licenses

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Metro Bundler Won't Start

**Symptoms:** `npm start` fails or hangs

**Solutions:**
```bash
# Clear Metro cache
cd EcoNaviAR
npm start -- --reset-cache

# Clear watchman (if installed)
watchman watch-del-all

# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

#### 2. Android Build Fails

**Symptoms:** `./gradlew assembleDebug` fails

**Common Causes:**
- **Gradle version mismatch:** Check `android/gradle/wrapper/gradle-wrapper.properties`
- **SDK not found:** Install Android SDK via Android Studio
- **Java version:** Requires Java 17+

**Solutions:**
```bash
# Clean build
cd EcoNaviAR/android
./gradlew clean

# Check Java version
java -version  # Should be 17+

# Rebuild
./gradlew assembleDebug
```

#### 3. Server Connection Failed (Physical Device)

**Symptoms:** App can't connect to server on physical device

**Solutions:**
1. **Check Server IP:**
   ```bash
   # On server machine
   ipconfig  # Windows
   ifconfig  # Linux/Mac
   ```
   Update `EcoNaviAR/src/config/api.ts` with correct IP

2. **Check Firewall:**
   - Allow port 3001 in Windows Firewall
   - Allow port 3001 in router settings

3. **Check Network:**
   - Device and server must be on same Wi-Fi network
   - Test with: `curl http://<server-ip>:3001/health`

4. **Android Network Security:**
   - Verify `network_security_config.xml` allows local IPs
   - Check `gradle.properties` has `usesCleartextTraffic=true`

#### 4. JWT Token Expired

**Symptoms:** API calls return 401 Unauthorized

**Solution:**
- User must re-login
- Consider implementing token refresh mechanism

#### 5. Database Locked Error

**Symptoms:** `SQLITE_BUSY` or `database is locked` errors

**Causes:**
- Multiple processes accessing database simultaneously
- Database file permissions issue

**Solutions:**
```javascript
// In database.js, add timeout
const db = new sqlite3.Database('./database.db', {
  timeout: 5000  // 5 second timeout
});
```

#### 6. Request Queue Not Syncing

**Symptoms:** Offline requests not retrying when online

**Solutions:**
1. Check network status detection:
   ```typescript
   import NetInfo from '@react-native-community/netinfo';
   const state = await NetInfo.fetch();
   console.log('Network state:', state.isConnected);
   ```

2. Verify `startRequestQueueAutoSync()` is called in `syncManager.ts`

3. Check AsyncStorage permissions (should be automatic)

### Debugging Tips

#### Enable Debug Logging

**Frontend:**
```typescript
// In any component
console.log('[ComponentName] Debug info:', data);
```

**Backend:**
```javascript
// In server/index.js
console.log('[API] Request:', req.method, req.path, req.body);
```

#### Network Debugging

**Use React Native Debugger:**
1. Install: `npm install -g react-native-debugger`
2. Open: `react-native-debugger`
3. Enable Network Inspector

**Use Chrome DevTools:**
1. Shake device/emulator
2. Select "Debug"
3. Open Chrome DevTools
4. Network tab shows all API calls

#### Database Inspection

**Use SQLite Browser:**
1. Download [DB Browser for SQLite](https://sqlitebrowser.org/)
2. Open `server/database.db`
3. Browse tables and run queries

---

## 🤝 Contributing Guidelines

### Code Style

- **TypeScript:** Use strict mode, avoid `any` types
- **Naming:** camelCase for variables/functions, PascalCase for components
- **Formatting:** Use Prettier (if configured)
- **Comments:** Document complex algorithms and business logic

### Git Workflow

1. **Create Feature Branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes:**
   - Write clear commit messages
   - Test thoroughly
   - Update documentation if needed

3. **Commit:**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

4. **Push and Create PR:**
   ```bash
   git push origin feature/your-feature-name
   # Create Pull Request on GitHub
   ```

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Maintenance tasks

**Example:**
```
feat: add user-specific search history

- Store search history per user ID
- Update searchHistoryManager to use userId in key
- Fix scroll issues in RouteForm
```

### Testing

**Current Status:** No automated tests (consider adding)

**Recommended:**
- Unit tests for `carbonCalculator.ts`
- Integration tests for API endpoints
- E2E tests for critical user flows

### Documentation Updates

When adding new features:
1. Update this developer guide
2. Update API specification if endpoints change
3. Update user guide if UI/UX changes
4. Add code comments for complex logic

---

## 📚 Additional Resources

### Official Documentation

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [React Native Paper](https://callstack.github.io/react-native-paper/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

### API Documentation

- [Tmap Open API](https://openapi.sk.com/)
- [ODsay API](https://www.odsay.com/)
- [Public Data Portal](https://www.data.go.kr/)

### Tools

- [React Native Debugger](https://github.com/jhen0409/react-native-debugger)
- [Flipper](https://fbflipper.com/) - Debugging platform
- [DB Browser for SQLite](https://sqlitebrowser.org/)

---

## 📝 Changelog

### Version 1.0.0 (2025-01-24)

**Features:**
- User-specific search history
- Admin dashboard with user management
- Offline request queue
- Improved UI/UX with theme system
- Real-time bus/subway arrival info
- Carbon emission calculation with traffic adjustment

**Fixes:**
- Server connection issues on physical devices
- Scroll issues in route search form
- Button styling and touch area improvements
- Reward claim functionality

---

**Last Updated:** 2025-01-24  
**Maintainer:** Development Team  
**License:** MIT


