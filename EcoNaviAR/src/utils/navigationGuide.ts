import { Route } from '../types';

export interface NavigationInstruction {
  type: 'turn' | 'straight' | 'arrive' | 'off-route';
  direction?: 'left' | 'right' | 'slight-left' | 'slight-right' | 'u-turn';
  distance: number; // 미터 단위
  streetName?: string;
  description: string;
}

export interface NavigationState {
  currentLocation: { latitude: number; longitude: number };
  currentInstruction: NavigationInstruction | null;
  nextInstruction: NavigationInstruction | null;
  distanceToDestination: number; // 미터 단위
  isOnRoute: boolean;
  progress: number; // 0-1 사이의 값
  currentSegmentIndex: number;
}

/**
 * 두 좌표 간의 거리를 계산합니다 (미터 단위)
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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
 * 경로에서 가장 가까운 지점을 찾습니다
 */
export const findNearestPointOnRoute = (
  currentLat: number,
  currentLng: number,
  routePath: [number, number][]
): { index: number; distance: number } => {
  if (!routePath || routePath.length === 0) {
    return { index: 0, distance: Infinity };
  }

  let minDistance = Infinity;
  let nearestIndex = 0;

  for (let i = 0; i < routePath.length; i++) {
    // Route.path는 [lat, lng] 형식이지만, 실제로는 [lng, lat]일 수도 있음
    // 두 형식 모두 시도
    const [coord1, coord2] = routePath[i];
    
    // 먼저 [lat, lng] 형식으로 시도
    let pathLat = coord1;
    let pathLng = coord2;
    let distance1 = calculateDistance(currentLat, currentLng, pathLat, pathLng);
    
    // [lng, lat] 형식으로도 시도
    let distance2 = calculateDistance(currentLat, currentLng, coord2, coord1);
    
    // 더 가까운 거리를 선택
    const distance = Math.min(distance1, distance2);
    if (distance === distance2) {
      pathLat = coord2;
      pathLng = coord1;
    }
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = i;
    }
  }

  return { index: nearestIndex, distance: minDistance };
};

/**
 * 경로에서 다음 턴을 찾습니다
 */
export const findNextTurn = (
  currentIndex: number,
  routePath: [number, number][],
  lookAheadDistance: number = 500 // 미터 단위
): { turnIndex: number; turnType: NavigationInstruction['type']; direction?: NavigationInstruction['direction'] } | null => {
  if (!routePath || routePath.length < 2 || currentIndex >= routePath.length - 1) {
    return null;
  }

  let accumulatedDistance = 0;
  let lastBearing: number | null = null;

  for (let i = currentIndex; i < routePath.length - 1; i++) {
    // Route.path는 [lat, lng] 형식으로 가정
    const [lat1, lng1] = routePath[i];
    const [lat2, lng2] = routePath[i + 1];
    
    const segmentDistance = calculateDistance(lat1, lng1, lat2, lng2);
    accumulatedDistance += segmentDistance;

    // 방향 계산 (베어링)
    const bearing = calculateBearing(lat1, lng1, lat2, lng2);

    // 방향이 크게 바뀌면 턴으로 간주
    if (lastBearing !== null) {
      const bearingDiff = Math.abs(bearing - lastBearing);
      const normalizedDiff = bearingDiff > 180 ? 360 - bearingDiff : bearingDiff;

      if (normalizedDiff > 30) { // 30도 이상 방향 변경
        let direction: NavigationInstruction['direction'] | undefined;
        
        if (normalizedDiff > 150) {
          direction = 'u-turn';
        } else if (bearing > lastBearing) {
          if (normalizedDiff > 90) {
            direction = 'right';
          } else {
            direction = 'slight-right';
          }
        } else {
          if (normalizedDiff > 90) {
            direction = 'left';
          } else {
            direction = 'slight-left';
          }
        }

        return {
          turnIndex: i + 1,
          turnType: 'turn',
          direction,
        };
      }
    }

    lastBearing = bearing;

    // 목표 거리까지 도달했으면 직진으로 반환
    if (accumulatedDistance >= lookAheadDistance) {
      return {
        turnIndex: i + 1,
        turnType: 'straight',
      };
    }
  }

  return null;
};

/**
 * 두 지점 간의 방향(베어링)을 계산합니다 (0-360도)
 */
const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  bearing = (bearing + 360) % 360;
  return bearing;
};

/**
 * 네비게이션 상태를 계산합니다
 */
export const calculateNavigationState = (
  route: Route,
  currentLocation: { latitude: number; longitude: number }
): NavigationState => {
  if (!route.path || route.path.length === 0) {
    return {
      currentLocation,
      currentInstruction: null,
      nextInstruction: null,
      distanceToDestination: 0,
      isOnRoute: false,
      progress: 0,
      currentSegmentIndex: 0,
    };
  }

  // 경로에서 가장 가까운 지점 찾기
  const nearest = findNearestPointOnRoute(currentLocation.latitude, currentLocation.longitude, route.path);
  const isOnRoute = nearest.distance < 50; // 50미터 이내면 경로 위로 간주

  // 목적지까지의 거리 계산
  const [destLat, destLng] = route.path[route.path.length - 1];
  const distanceToDestination = calculateDistance(
    currentLocation.latitude,
    currentLocation.longitude,
    destLat,
    destLng
  );

  // 진행률 계산 (간단한 버전)
  const totalDistance = route.distance * 1000; // km to meters
  const remainingDistance = distanceToDestination;
  const progress = totalDistance > 0 ? Math.max(0, Math.min(1, 1 - (remainingDistance / totalDistance))) : 0;

  // 다음 턴 찾기
  const nextTurn = findNextTurn(nearest.index, route.path, 300); // 300m 앞까지 확인

  let currentInstruction: NavigationInstruction | null = null;
  let nextInstruction: NavigationInstruction | null = null;

  if (!isOnRoute) {
    currentInstruction = {
      type: 'off-route',
      distance: nearest.distance,
      description: `경로에서 ${Math.round(nearest.distance)}m 이탈했습니다.`,
    };
  } else if (distanceToDestination < 50) {
    currentInstruction = {
      type: 'arrive',
      distance: distanceToDestination,
      description: '목적지에 도착했습니다.',
    };
  } else if (nextTurn) {
    const [turnLat, turnLng] = route.path[nextTurn.turnIndex];
    const distanceToTurn = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      turnLat,
      turnLng
    );

    let description = '';
    if (nextTurn.turnType === 'turn' && nextTurn.direction) {
      const directionNames: Record<string, string> = {
        'left': '좌회전',
        'right': '우회전',
        'slight-left': '약간 좌회전',
        'slight-right': '약간 우회전',
        'u-turn': '유턴',
      };
      description = `${Math.round(distanceToTurn)}m 후 ${directionNames[nextTurn.direction]}`;
    } else {
      description = `${Math.round(distanceToTurn)}m 후 직진`;
    }

    currentInstruction = {
      type: nextTurn.turnType,
      direction: nextTurn.direction,
      distance: distanceToTurn,
      description,
    };

    // 다음 다음 턴 찾기
    const nextNextTurn = findNextTurn(nextTurn.turnIndex, route.path, 500);
    if (nextNextTurn) {
      const [nextTurnLat, nextTurnLng] = route.path[nextNextTurn.turnIndex];
      const distanceToNextTurn = calculateDistance(
        turnLat,
        turnLng,
        nextTurnLat,
        nextTurnLng
      );

      if (nextNextTurn.turnType === 'turn' && nextNextTurn.direction) {
        const directionNames: Record<string, string> = {
          'left': '좌회전',
          'right': '우회전',
          'slight-left': '약간 좌회전',
          'slight-right': '약간 우회전',
          'u-turn': '유턴',
        };
        nextInstruction = {
          type: nextNextTurn.turnType,
          direction: nextNextTurn.direction,
          distance: distanceToNextTurn,
          description: `그 다음 ${Math.round(distanceToNextTurn)}m 후 ${directionNames[nextNextTurn.direction]}`,
        };
      }
    }
  } else {
    currentInstruction = {
      type: 'straight',
      distance: distanceToDestination,
      description: `목적지까지 ${Math.round(distanceToDestination / 100) / 10}km`,
    };
  }

  return {
    currentLocation,
    currentInstruction,
    nextInstruction,
    distanceToDestination,
    isOnRoute,
    progress,
    currentSegmentIndex: nearest.index,
  };
};

/**
 * 거리를 읽기 쉬운 형식으로 포맷합니다
 */
export const formatDistance = (distanceMeters: number): string => {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)}m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)}km`;
};

