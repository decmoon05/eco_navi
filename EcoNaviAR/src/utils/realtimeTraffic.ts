import axios from 'axios';
import { API_KEYS } from '../config/apiKeys';
import { 
  getBusArrivalByStation, 
  getSubwayArrivalInfo as getTagoSubwayArrival,
  getBusStationInfo,
  getSubwayStationInfo,
  CITY_CODES 
} from './tagoApi';

export interface BusArrivalInfo {
  stationId: string;
  stationName: string;
  routeId: string;
  routeName: string;
  arrivalTime: number; // 초 단위
  remainingStations: number;
  isLowFloor: boolean; // 저상버스 여부
}

export interface SubwayArrivalInfo {
  stationId: string;
  stationName: string;
  lineName: string;
  direction: string;
  arrivalTime: number; // 초 단위
  currentStation: string;
  remainingStations: number;
}

export interface TrafficCongestion {
  level: 'smooth' | 'normal' | 'congested' | 'very-congested';
  speed: number; // km/h
  description: string;
}

/**
 * 버스 정류장의 실시간 도착 정보를 가져옵니다
 * 국토교통부 TAGO API 사용
 */
export const getBusArrivalInfo = async (
  stationId: string,
  routeId?: string,
  cityCode: string = '11' // 기본값: 서울
): Promise<BusArrivalInfo[]> => {
  try {
    // TAGO API를 사용하여 버스 도착 정보 조회
    const arrivalData = await getBusArrivalByStation(stationId, cityCode);
    
    // routeId가 지정된 경우 필터링
    const filteredData = routeId 
      ? arrivalData.filter(item => item.routeId === routeId)
      : arrivalData;

    return filteredData.map((item: any) => ({
      stationId: item.stationId || stationId,
      stationName: item.stationName || '',
      routeId: item.routeId || routeId || '',
      routeName: item.routeName || '',
      arrivalTime: item.arrivalTime || 0, // 초 단위
      remainingStations: item.remainingStations || 0,
      isLowFloor: item.isLowFloor || false,
    }));
  } catch (error: any) {
    console.error('버스 도착 정보 조회 실패:', error.response?.data || error.message);
  }

  return [];
};

/**
 * 지하철 역의 실시간 도착 정보를 가져옵니다
 * 국토교통부 TAGO API 사용
 */
export const getSubwayArrivalInfo = async (
  stationId: string,
  lineNumber: string
): Promise<SubwayArrivalInfo[]> => {
  try {
    // 먼저 역 정보를 조회하여 subwayStationId와 subwayRouteId를 얻음
    const stationInfo = await getSubwayStationInfo(stationId);
    
    if (stationInfo.length === 0) {
      return [];
    }

    const station = stationInfo[0];
    const subwayStationId = station.subwayStationId;
    const subwayRouteId = station.subwayRouteId || lineNumber;

    // 실시간 도착 정보 조회
    const arrivalData = await getTagoSubwayArrival(subwayStationId, subwayRouteId);

    return arrivalData.map((item: any) => ({
      stationId: item.stationId || subwayStationId || stationId,
      stationName: item.stationName || station.subwayStationName || stationId,
      lineName: item.lineName || station.subwayRouteName || lineNumber,
      direction: item.direction || '',
      arrivalTime: item.arrivalTime || 0, // 초 단위
      currentStation: item.currentStation || '',
      remainingStations: item.remainingStations || 0,
    }));
  } catch (error: any) {
    console.error('지하철 도착 정보 조회 실패:', error.response?.data || error.message);
  }

  return [];
};

/**
 * ODsay API를 사용하여 대중교통 경로의 실시간 정보를 가져옵니다
 */
export const getODsayRealtimeInfo = async (
  stationId: string,
  stationName: string,
  routeId?: string
): Promise<{
  bus?: BusArrivalInfo[];
  subway?: SubwayArrivalInfo[];
}> => {
  // ODsay API는 실시간 정보를 직접 제공하지 않으므로
  // 서울시 공공데이터 API를 사용해야 합니다
  // 여기서는 기본 구조만 제공
  return {
    bus: routeId ? await getBusArrivalInfo(stationId, routeId) : undefined,
    subway: await getSubwayArrivalInfo(stationId, ''),
  };
};

/**
 * 교통 혼잡도를 계산합니다 (간단한 버전)
 */
export const calculateTrafficCongestion = (
  averageSpeed: number,
  maxSpeed: number = 60
): TrafficCongestion => {
  const speedRatio = averageSpeed / maxSpeed;

  if (speedRatio >= 0.8) {
    return {
      level: 'smooth',
      speed: averageSpeed,
      description: '원활',
    };
  } else if (speedRatio >= 0.5) {
    return {
      level: 'normal',
      speed: averageSpeed,
      description: '보통',
    };
  } else if (speedRatio >= 0.3) {
    return {
      level: 'congested',
      speed: averageSpeed,
      description: '혼잡',
    };
  } else {
    return {
      level: 'very-congested',
      speed: averageSpeed,
      description: '매우 혼잡',
    };
  }
};

/**
 * 시간을 읽기 쉬운 형식으로 포맷합니다
 */
export const formatArrivalTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}초`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}분`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}시간 ${minutes}분`;
  }
};

