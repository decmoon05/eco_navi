export interface Location {
  lat: number;
  lng: number;
  name: string;
}

export type TransportMode = 
  | 'walking' 
  | 'bicycle' 
  | 'bus' 
  | 'subway' 
  | 'car' 
  | 'electric_car'
  | 'hybrid'
  | 'hydrogen'
  | 'motorcycle'
  | 'electric_motorcycle'
  | 'vehicle'; // RouteForm에서 사용하는 대표 타입

export interface RouteSegment {
  mode: TransportMode;
  distance: number; // km
  duration: number; // 분
  path: [number, number][];
  name?: string; // e.g., 버스 번호, 지하철 노선명
}

export interface PolylineSegment {
  coordinates: { latitude: number; longitude: number }[];
  color: string;
  mode?: TransportMode;
  dashed?: boolean;
}

export interface BikeStation {
  name: string;
  location: Location;
  availableCount: number;
}

export interface Route {
  origin: Location;
  destination: Location;
  distance: number; // km
  duration: number; // minutes
  transportMode: TransportMode;
  path?: [number, number][]; // [lat, lng] 경로 점 배열 (도로망)
  segments?: RouteSegment[];
  polylines?: PolylineSegment[]; // 지도 표시용 상세 경로 (색상 포함)
  bikeStations?: BikeStation[]; // 주변 공유 자전거 대여소
  transferPoints?: Location[]; // 환승 지점
  label?: string; // 추천/최단/유료회피 등 표시용
  tags?: string[]; // 추가 태그
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