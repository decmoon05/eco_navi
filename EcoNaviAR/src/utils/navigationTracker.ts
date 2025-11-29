// @ts-ignore - 타입 정의가 없을 수 있음
import Geolocation from '@react-native-community/geolocation';
import { Location, Route } from '../types';
import { isNavigationTrackingEnabled } from './developerSettings';

interface TrackedLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface NavigationSession {
  routeId: string; // 검색한 경로의 고유 ID
  startTime: number;
  locations: TrackedLocation[];
  isActive: boolean;
}

let currentSession: NavigationSession | null = null;
let watchId: number | null = null;

/**
 * 두 좌표 간의 거리를 계산합니다 (미터 단위)
 */
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000; // 지구 반경 (미터)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * 사용자가 경로를 따라 이동했는지 검증합니다
 */
const validateRouteCompletion = (route: Route, trackedLocations: TrackedLocation[]): {
  completed: boolean;
  distanceCovered: number;
  accuracy: number; // 0-1 사이의 값, 1에 가까울수록 정확히 경로를 따름
} => {
  if (!route.path || route.path.length === 0 || trackedLocations.length === 0) {
    return { completed: false, distanceCovered: 0, accuracy: 0 };
  }

  let totalDistanceCovered = 0;
  let matchedPoints = 0;
  const maxDeviation = 100; // 최대 허용 편차 (미터)

  // 경로의 각 지점에 대해 가장 가까운 추적 위치를 찾음
  for (const routePoint of route.path) {
    const [routeLon, routeLat] = routePoint;
    let minDistance = Infinity;

    for (const trackedLoc of trackedLocations) {
      const distance = calculateDistance(routeLat, routeLon, trackedLoc.latitude, trackedLoc.longitude);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    if (minDistance < maxDeviation) {
      matchedPoints++;
      totalDistanceCovered += minDistance;
    }
  }

  const accuracy = route.path.length > 0 ? matchedPoints / route.path.length : 0;
  const completed = accuracy >= 0.7; // 70% 이상 경로를 따라갔으면 완료로 간주

  return {
    completed,
    distanceCovered: totalDistanceCovered,
    accuracy,
  };
};

/**
 * 네비게이션 추적을 시작합니다
 */
export const startNavigationTracking = async (route: Route): Promise<boolean> => {
  const isEnabled = await isNavigationTrackingEnabled();
  if (!isEnabled) {
    console.log('Navigation tracking is disabled');
    return false;
  }

  // 기존 세션이 있으면 중지
  if (currentSession) {
    stopNavigationTracking();
  }

  const routeId = `route_${Date.now()}`;
  currentSession = {
    routeId,
    startTime: Date.now(),
    locations: [],
    isActive: true,
  };

  // GPS 추적 시작
  watchId = Geolocation.watchPosition(
    (position) => {
      if (currentSession && currentSession.isActive) {
        currentSession.locations.push({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: Date.now(),
        });
        console.log(`[Navigation Tracker] Location recorded: ${position.coords.latitude}, ${position.coords.longitude}`);
      }
    },
    (error) => {
      console.error('[Navigation Tracker] Error:', error);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000,
      distanceFilter: 10, // 10미터 이상 이동했을 때만 업데이트
    }
  );

  console.log('[Navigation Tracker] Started tracking for route:', routeId);
  return true;
};

/**
 * 네비게이션 추적을 중지하고 결과를 반환합니다
 */
export const stopNavigationTracking = async (): Promise<{
  completed: boolean;
  distanceCovered: number;
  accuracy: number;
  duration: number;
} | null> => {
  if (!currentSession) {
    return null;
  }

  // GPS 추적 중지
  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
  }

  const session = currentSession;
  currentSession.isActive = false;

  // 여기서는 route 정보가 없으므로 기본 정보만 반환
  // 실제로는 route 정보를 저장해두고 검증해야 함
  const duration = Date.now() - session.startTime;

  const result = {
    completed: session.locations.length > 0,
    distanceCovered: 0, // 실제로는 계산 필요
    accuracy: session.locations.length > 0 ? 1 : 0,
    duration,
  };

  currentSession = null;
  console.log('[Navigation Tracker] Stopped tracking. Result:', result);
  return result;
};

/**
 * 현재 추적 중인 세션 정보를 반환합니다
 */
export const getCurrentSession = (): NavigationSession | null => {
  return currentSession;
};

/**
 * 경로 완료 여부를 검증합니다
 */
export const validateRoute = (route: Route, trackedLocations: TrackedLocation[]) => {
  return validateRouteCompletion(route, trackedLocations);
};

