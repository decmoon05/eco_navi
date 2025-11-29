export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Location {
  lat: number;
  lng: number;
  name: string;
}

export type TransportMode = 'walking' | 'bicycle' | 'bus' | 'subway' | 'train' | 'car' | 'electric_car';

export interface RouteSegment {
  mode: TransportMode;
  distance: number; // km
  duration: number; // 분
  path: [number, number][];
  name?: string; // e.g., 버스 번호, 지하철 노선명
  stationId?: string; // 정류장/역 ID (실시간 정보 조회용)
  stationName?: string; // 정류장/역 이름
  routeId?: string; // 노선 ID (버스/지하철)
}

export interface Route {
  origin: Location;
  destination: Location;
  distance: number; // km
  duration: number; // minutes
  transportMode: TransportMode;
  path?: [number, number][]; // [lat, lng] 경로 점 배열 (도로망)
  segments?: RouteSegment[];
  transferPoints?: Location[]; // 환승 지점
  label?: string; // 추천/최단/유료회피 등 표시용
  tags?: string[]; // 추가 태그
  elevationData?: number[]; // 고도 데이터 (m) - 경로의 각 지점별 고도
}

export interface CarbonEmission {
  mode: TransportMode;
  emissionPerKm: number; // gCO2/km
  totalEmission: number; // gCO2
  savedEmission: number; // gCO2 (compared to car)
}

export interface Bonus {
  points: number;
  description: string;
  icon: string;
}

export interface NavigationResult {
  route: Route;
  carbonEmission: CarbonEmission;
  bonus: Bonus;
  alternatives: Route[];
}  