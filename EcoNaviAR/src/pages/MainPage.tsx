import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import RouteForm from '../components/RouteForm';
import LoadingOverlay from '../components/LoadingOverlay';
import FadeInView from '../components/FadeInView';
import AdBanner from '../components/AdBanner';
import { TransportMode, Location, Route, CarbonEmission, Coordinate, Segment, RouteData, PolylineSegment } from '../types';
import { calculateTrafficAdjustedEmission } from '../utils/carbonCalculator';
import { API_KEYS } from '../config/apiKeys';
import { saveSearchHistory } from '../utils/searchHistoryManager';
import { Theme } from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { t } from '../i18n';
import { getTransportModeInfo } from '../utils/carbonCalculator';

const TMAP_API_KEY = API_KEYS.TMAP_API_KEY;
const ODSAY_API_KEY = API_KEYS.ODSAY_API_KEY;

const MainPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | undefined>(undefined);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [searchError, setSearchError] = useState<{ message: string; type: 'network' | 'no_route' | 'server' | 'unknown' } | null>(null);
  const [lastSearchParams, setLastSearchParams] = useState<{ origin: Location; destination: Location; transportMode: TransportMode } | null>(null);
  const navigation = useNavigation();
  const { user } = useAuth();
  
  /**
   * 고도 정보를 가져오는 함수
   * Open Elevation API를 사용하여 경로의 각 좌표점의 고도를 조회
   * 
   * @param coordinates - 경로의 좌표 배열
   * @returns 각 좌표점의 고도 배열 (미터 단위)
   * 
   * 최적화:
   * - 너무 많은 좌표가 있는 경우 샘플링하여 API 호출 수 감소
   * - 샘플링된 고도 데이터를 원본 좌표 수에 맞게 보간
   * 
   * 실패 시:
   * - 고도 정보가 없어도 경로는 정상 작동 (경사 보정 없이 진행)
   */
  const fetchElevationData = async (coordinates: Coordinate[]): Promise<number[]> => {
    if (!coordinates || coordinates.length === 0) {
      return [];
    }

    // 너무 많은 좌표가 있으면 샘플링 (API 제한 고려)
    const maxPoints = 100;
    const step = Math.max(1, Math.floor(coordinates.length / maxPoints));
    const sampledCoordinates = coordinates.filter((_, index) => index % step === 0 || index === coordinates.length - 1);

    try {
      // Open Elevation API 사용 (무료, 제한 없음)
      const locations = sampledCoordinates.map(coord => `${coord.latitude},${coord.longitude}`).join('|');
      const response = await axios.get(`https://api.open-elevation.com/api/v1/lookup`, {
        params: {
          locations: locations,
        },
        timeout: 5000, // 5초 타임아웃
      });

      if (response.data && response.data.results) {
        const elevations = response.data.results.map((result: any) => result.elevation);
        
        // 샘플링된 고도 데이터를 원본 좌표 수에 맞게 보간
        if (elevations.length < coordinates.length) {
          const interpolated: number[] = [];
          for (let i = 0; i < coordinates.length; i++) {
            const ratio = i / (coordinates.length - 1);
            const index = Math.floor(ratio * (elevations.length - 1));
            const nextIndex = Math.min(index + 1, elevations.length - 1);
            const localRatio = (ratio * (elevations.length - 1)) - index;
            
            const elevation = elevations[index] + (elevations[nextIndex] - elevations[index]) * localRatio;
            interpolated.push(elevation);
          }
          return interpolated;
        }
        
        return elevations;
      }
    } catch (error) {
      console.warn('Open Elevation API failed, trying alternative...', error);
      
      // 대안: Google Elevation API (API 키 필요하지만 더 정확)
      // 또는 간단히 null 반환하여 경사 보정 없이 진행
    }

    return [];
  };
  
  const fetchCarRouteData = async (origin: Location, destination: Location, searchOption: number, transportMode: TransportMode): Promise<RouteData> => {
    const TMAP_ROUTE_URL = 'https://apis.openapi.sk.com/tmap/routes?version=1';
    try {
      // Tmap API searchOption 값:
      // 0: 최단 시간
      // 1: 최단 거리
      // 2: 무료 도로 우선 (유료 도로 회피)
      // 오토바이/전기 오토바이의 경우 고속도로 제외 옵션 적용
      let finalSearchOption = searchOption;
      if (transportMode === 'motorcycle' || transportMode === 'electric_motorcycle') {
        // 오토바이는 고속도로를 탈 수 없으므로 무료 도로 우선 옵션 사용
        finalSearchOption = 2; // 무료 도로 우선 (유료 도로 회피)
      }
      
      // 무료 도로 옵션인 경우 searchOption을 2로 설정 (10 대신 2 사용)
      if (searchOption === 10) {
        finalSearchOption = 2; // 무료 도로 우선
      }
      
      const requestBody: any = {
          startX: origin.lng,
          startY: origin.lat,
          endX: destination.lng,
          endY: destination.lat,
          reqCoordType: 'WGS84GEO',
          resCoordType: 'WGS84GEO',
        searchOption: finalSearchOption,
      };
      
      // 무료 도로 옵션인 경우 유료 도로 회피 설정
      // Tmap API의 avoid 파라미터 사용 (toll: 유료도로)
      if (finalSearchOption === 2 || searchOption === 10) {
        requestBody.avoid = 'toll'; // 유료 도로(고속도로) 회피
      }
      
      // Tmap API 호출 (재시도 로직 포함)
      let routeResponse;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          routeResponse = await axios.post(
            TMAP_ROUTE_URL,
            requestBody,
            { 
              headers: { appKey: TMAP_API_KEY, 'Content-Type': 'application/json' },
              timeout: 10000, // 10초 타임아웃
            }
      );
          break; // 성공 시 루프 종료
        } catch (error: any) {
          retryCount++;
          
          // 네트워크 에러나 타임아웃인 경우 재시도
          if ((error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') && retryCount <= maxRetries) {
            console.warn(`Tmap API 호출 실패 (재시도 ${retryCount}/${maxRetries}):`, error.message);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // 지수 백오프
            continue;
          }
          
          // API 에러 (403, 401 등)
          if (error.response) {
            const status = error.response.status;
            if (status === 403 || status === 401) {
              throw new Error('Tmap API 인증 오류가 발생했습니다. API 키를 확인해주세요.');
            } else if (status === 429) {
              throw new Error('API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
            } else if (status >= 500) {
              if (retryCount <= maxRetries) {
                console.warn(`Tmap API 서버 오류 (재시도 ${retryCount}/${maxRetries}):`, status);
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                continue;
              }
              throw new Error('Tmap API 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
            }
          }
          
          // 기타 에러
          throw error;
        }
      }

      if (!routeResponse || !routeResponse.data) {
        throw new Error('Tmap API 응답이 올바르지 않습니다.');
      }

      const features = routeResponse.data.features;
      if (!features || features.length === 0) {
        // 경로를 찾을 수 없는 경우, 다른 searchOption으로 재시도
        if (searchOption === 0) {
          console.warn('최단 시간 경로를 찾을 수 없어 무료 도로 옵션으로 재시도합니다.');
          return await fetchCarRouteData(origin, destination, 2, transportMode);
        }
        throw new Error(`경로를 찾을 수 없습니다 (옵션: ${searchOption}).`);
      }

      const coordinates = features.flatMap((feature: any) =>
        feature.geometry.type === 'LineString'
          ? feature.geometry.coordinates.map((coord: number[]) => ({
              longitude: coord[0],
              latitude: coord[1],
            }))
          : []
      );

      const properties = features[0].properties;
      const distanceKm = properties.totalDistance / 1000;
      const durationMinutes = Math.round(properties.totalTime / 60);

      // 고도 정보 가져오기 (경사 보정계수 계산용)
      let elevationData: number[] | undefined = undefined;
      try {
        elevationData = await fetchElevationData(coordinates);
      } catch (e) {
        console.warn('Failed to fetch elevation data:', e);
        // 고도 정보가 없어도 경로는 정상 작동
      }

      // path 생성: coordinates를 [lat, lng] 형식으로 변환
      const path: [number, number][] = coordinates.map(coord => [coord.latitude, coord.longitude]);

      const route: Route = { 
        origin, 
        destination, 
        distance: distanceKm, 
        duration: durationMinutes, 
        transportMode,
        path,
        elevationData,
      };
      const emission = calculateTrafficAdjustedEmission(route, false, 20);
      
      return { route, emission, coordinates };
    } catch (e: any) {
      console.error('fetchCarRouteData Error:', e.message);
      throw e;
    }
  };

  const fetchPublicTransitRouteData = async (origin: Location, destination: Location): Promise<RouteData> => {
    const ODSAY_URL = 'https://api.odsay.com/v1/api/searchPubTransPathT';
    const ODSAY_LANE_URL = 'https://api.odsay.com/v1/api/loadLane';

    // ODsay API 파라미터 설명:
    // OPT: 최적화 옵션 (0: 최소시간, 1: 최소환승, 2: 최소비용, 3: 최소거리, 4: 최소도보)
    // count: 반환할 경로 개수 (기본값: 1, 최대: 5)

    try {
      // ODsay API 호출 (재시도 로직 포함)
      let response;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          response = await axios.get(ODSAY_URL, {
          params: {
            apiKey: ODSAY_API_KEY,
            SX: origin.lng,
            SY: origin.lat,
            EX: destination.lng,
            EY: destination.lat,
              OPT: 0, // 최소시간
              count: 3, // 여러 경로 중 상세한 경로 선택
          },
            timeout: 10000, // 10초 타임아웃
      });
          break; // 성공 시 루프 종료
        } catch (error: any) {
          retryCount++;
          
          // 네트워크 에러나 타임아웃인 경우 재시도
          if ((error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') && retryCount <= maxRetries) {
            console.warn(`ODsay API 호출 실패 (재시도 ${retryCount}/${maxRetries}):`, error.message);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            continue;
          }
          
          // API 에러
          if (error.response) {
            const status = error.response.status;
            if (status === 403 || status === 401) {
              throw new Error('ODsay API 인증 오류가 발생했습니다. API 키를 확인해주세요.');
            } else if (status === 429) {
              throw new Error('ODsay API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
            } else if (status >= 500) {
              if (retryCount <= maxRetries) {
                console.warn(`ODsay API 서버 오류 (재시도 ${retryCount}/${maxRetries}):`, status);
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                continue;
              }
              throw new Error('ODsay API 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
            }
          }
          
          throw error;
        }
      }

      if (!response || !response.data) {
        throw new Error('ODsay API 응답이 올바르지 않습니다.');
      }

      if (!response.data.result) {
        console.error('[Debug] ODsay Error:', response.data.error);
        throw new Error('대중교통 경로를 찾을 수 없습니다.');
      }

      // 여러 경로 중 첫 번째 경로 선택 (더 나은 경로가 있을 수 있음)
      const paths = response.data.result.path || [];
      console.log('[ODsay] 전체 경로 개수:', paths.length);
      
      if (paths.length === 0) {
        throw new Error('대중교통 경로를 찾을 수 없습니다.');
      }
      
      // subPath가 가장 많은 경로 선택 (더 상세한 경로)
      let selectedPath = paths[0];
      for (const p of paths) {
        if (p.subPath && p.subPath.length > (selectedPath.subPath?.length || 0)) {
          selectedPath = p;
        }
      }
      
      const path = selectedPath;
      const info = path.info;
      const mapObj = info.mapObj;
      
      console.log('[ODsay] 선택된 경로:', {
        subPathCount: path.subPath?.length,
        totalDistance: info.totalDistance,
        totalTime: info.totalTime,
        firstStartStation: info.firstStartStation,
        lastEndStation: info.lastEndStation,
      });
      
      // 디버깅: 전체 응답 구조 확인
      console.log('[ODsay] 전체 path 구조:', {
        pathCount: response.data.result.path?.length,
        subPathCount: path.subPath?.length,
        info: {
          totalDistance: info.totalDistance,
          totalTime: info.totalTime,
          payment: info.payment,
          firstStartStation: info.firstStartStation,
          lastEndStation: info.lastEndStation,
        },
      });
      
      // 디버깅: subPath 구조 확인
      console.log('[ODsay] subPath 개수:', path.subPath?.length);
      path.subPath?.forEach((sub: any, index: number) => {
        console.log(`[ODsay] subPath[${index}]:`, {
          trafficType: sub.trafficType,
          distance: sub.distance,
          sectionTime: sub.sectionTime,
          startName: sub.startName,
          endName: sub.endName,
          startID: sub.startID,
          endID: sub.endID,
          fname: sub.fname,
          tname: sub.tname,
          startX: sub.startX,
          startY: sub.startY,
          endX: sub.endX,
          endY: sub.endY,
          lane: sub.lane ? (Array.isArray(sub.lane) ? sub.lane.map((l: any) => ({
            name: l.name,
            busNo: l.busNo,
            subwayCode: l.subwayCode,
            busRouteID: l.busRouteID,
          })) : [sub.lane]) : null,
        });
      });
      
      // 상세 경로(그래픽 데이터) 호출 및 파싱
      let polylines: PolylineSegment[] = [];
      let lanesData: any[] = [];

      try {
        const laneResponse = await axios.get(ODSAY_LANE_URL, {
            params: {
                apiKey: ODSAY_API_KEY,
                mapObject: '0:0@' + mapObj,
            },
            timeout: 10000, // 10초 타임아웃
        });
        if (laneResponse.data.result && laneResponse.data.result.lane) {
            lanesData = laneResponse.data.result.lane;
        }
      } catch (laneError) {
          console.error('ODsay loadLane Error:', laneError);
      }

      // subPath를 순회하며 순서대로 Polyline 생성
      path.subPath.forEach((sub: any) => {
        if (sub.trafficType === 3) { // 도보
            if (sub.startX && sub.startY && sub.endX && sub.endY) {
                polylines.push({
                    coordinates: [
                        { latitude: sub.startY, longitude: sub.startX },
                        { latitude: sub.endY, longitude: sub.endX }
                    ],
                    color: '#888',
                    mode: 'walking',
                    dashed: true,
                });
            }
        } else if (sub.trafficType === 1 || sub.trafficType === 2 || sub.trafficType === 4) { // 지하철, 버스, 기차
            // laneData에서 해당 구간 찾기 (간단히 class/type 매칭 또는 순서대로 매칭 시도)
            // ODsay laneData는 subPath의 대중교통 구간 순서와 일치할 가능성이 높음.
            // 정확한 매칭을 위해선 lane의 section 정보를 활용해야 하나 복잡하므로, 
            // 여기서는 단순하게 lanesData에서 하나씩 꺼내 쓰는 방식(shift)을 시도하거나,
            // 기존 로직대로 lanesData를 미리 파싱해두고 매칭하는 것이 좋음.
            
            // lanesData 구조: lane[i].section[0].graphPos
            // subPath의 대중교통 구간 하나당 lane 하나가 대응된다고 가정
            const matchedLane = lanesData.shift(); 
            
            if (matchedLane && matchedLane.section && matchedLane.section[0]) {
                const graphPos = matchedLane.section[0].graphPos;
                const coordinates = graphPos.flatMap((pos: any) => ({
                    latitude: pos.y,
                    longitude: pos.x
                }));

                let color = '#FF9800'; // 기본 버스
                let polylineMode: TransportMode = 'bus';
                
                if (sub.trafficType === 1) { // 지하철
                     const laneType = sub.lane[0].subwayCode; // subwayCode 활용
                     polylineMode = 'subway';
                     // 색상 매핑 (기존 로직 재활용)
                     switch (laneType) {
                        case 1: color = '#0052A4'; break; // 1호선
                        case 2: color = '#009D3E'; break; // 2호선
                        case 3: color = '#EF7C1C'; break; // 3호선
                        case 4: color = '#00A5DE'; break; // 4호선
                        case 5: color = '#996CAC'; break; // 5호선
                        case 6: color = '#CD7C2F'; break; // 6호선
                        case 7: color = '#747F00'; break; // 7호선
                        case 8: color = '#EA545D'; break; // 8호선
                        case 9: color = '#BDB092'; break; // 9호선
                        default: color = '#2196F3'; 
                     }
                } else if (sub.trafficType === 4) { // 기차
                    color = '#9C27B0'; // 기차 색상 (보라색)
                    polylineMode = 'train';
                } else { // 버스
                    polylineMode = 'bus';
                    const busType = sub.lane[0].type; // 버스 타입
                    switch (busType) {
                        case 1: color = '#00A0E9'; break; // 간선
                        case 2: color = '#53B332'; break; // 지선
                        case 3: color = '#E60012'; break; // 광역
                        case 4: color = '#FFFF00'; break; // 순환
                        case 11: color = '#00A0E9'; break; // 간선
                        case 12: color = '#53B332'; break; // 지선
                        default: color = '#FF9800';
                    }
                }

                polylines.push({ coordinates, color, mode: polylineMode });
            } else {
                // 상세 경로 매칭 실패 시 직선 연결
                if (sub.startX && sub.startY && sub.endX && sub.endY) {
                    let fallbackColor = '#FF9800';
                    let fallbackMode: TransportMode = 'bus';
                    if (sub.trafficType === 1) {
                        fallbackColor = '#2196F3';
                        fallbackMode = 'subway';
                    } else if (sub.trafficType === 4) {
                        fallbackColor = '#9C27B0';
                        fallbackMode = 'train';
                    }
                    polylines.push({
                        coordinates: [
                            { latitude: sub.startY, longitude: sub.startX },
                            { latitude: sub.endY, longitude: sub.endX }
                        ],
                        color: fallbackColor,
                        mode: fallbackMode
                    });
                }
            }
        }
      });

      const segments: Segment[] = path.subPath.map((sub: any, index: number) => {
        let mode: TransportMode = 'walking';
        let name = undefined;
        let stationId = undefined;
        let stationName = undefined;
        let routeId = undefined;
        let segmentPath: [number, number][] = [];

        // 경로 좌표 생성
        if (sub.startX && sub.startY && sub.endX && sub.endY) {
          segmentPath = [
            [sub.startY, sub.startX], // [lat, lng]
            [sub.endY, sub.endX]
          ];
        }

        // ODsay API 응답 구조에 맞게 데이터 추출
        if (sub.trafficType === 1) { 
          // 지하철
          mode = 'subway';
          if (sub.lane && sub.lane.length > 0) {
            name = sub.lane[0].name || sub.lane[0].subwayName;
            routeId = sub.lane[0].subwayCode || sub.lane[0].subwayID;
          }
          stationId = sub.startID || sub.startStationID || sub.fname;
          stationName = sub.startName || sub.startStationName || sub.fname;
        } else if (sub.trafficType === 2) { 
          // 버스
          mode = 'bus';
          if (sub.lane && sub.lane.length > 0) {
            name = sub.lane[0].busNo || sub.lane[0].routeNo;
            routeId = sub.lane[0].busRouteID || sub.lane[0].routeID;
          }
          stationId = sub.startID || sub.startStationID || sub.fname;
          stationName = sub.startName || sub.startStationName || sub.fname;
        } else if (sub.trafficType === 4) { 
          // 기차
          mode = 'train';
          if (sub.lane && sub.lane.length > 0) {
            name = sub.lane[0].name || sub.lane[0].subwayCode || '기차';
            routeId = sub.lane[0].subwayCode || sub.lane[0].routeID;
          } else {
            name = '기차';
          }
          stationId = sub.startID || sub.startStationID || sub.fname;
          stationName = sub.startName || sub.startStationName || sub.fname;
        } else if (sub.trafficType === 5) {
          // 시외버스/고속버스
          mode = 'bus';
          if (sub.lane && sub.lane.length > 0) {
            name = sub.lane[0].busNo || sub.lane[0].routeNo || sub.lane[0].name || '시외버스';
            routeId = sub.lane[0].busRouteID || sub.lane[0].routeID;
          } else {
            name = '시외버스';
          }
          stationId = sub.startID || sub.startStationID;
          stationName = sub.startName || sub.startStationName || sub.fname || sub.tname;
        } else if (sub.trafficType === 3) {
          // 도보 구간 (거리가 짧은 경우만)
          const distanceKm = sub.distance / 1000;
          if (distanceKm > 5) {
            // 5km 이상이면 버스로 처리 (ODsay가 도보로 잘못 분류한 경우)
            mode = 'bus';
            name = '버스';
            stationId = sub.startID || sub.startStationID;
            stationName = sub.startName || sub.startStationName || sub.fname || sub.tname;
          } else {
            mode = 'walking';
            name = '도보';
            stationName = sub.fname || sub.tname || sub.startName || sub.endName;
          }
        } else {
          // 알 수 없는 타입은 거리에 따라 판단
          const distanceKm = sub.distance / 1000;
          if (distanceKm > 5) {
            mode = 'bus';
            name = '버스';
            stationId = sub.startID || sub.startStationID;
            stationName = sub.startName || sub.startStationName || sub.fname || sub.tname;
          } else {
            mode = 'walking';
            name = '도보';
            stationName = sub.fname || sub.tname || sub.startName || sub.endName;
          }
        }

        const segment: Segment = {
          mode: mode,
          distance: sub.distance / 1000, 
          duration: Math.round((sub.sectionTime || 0) / 60), // 분 단위
          path: segmentPath,
          name: name,
          stationId: stationId,
          stationName: stationName,
          routeId: routeId,
        };

        console.log(`[ODsay] Segment[${index}] 생성:`, {
          trafficType: sub.trafficType,
          mode: segment.mode,
          name: segment.name,
          distance: segment.distance,
          duration: segment.duration,
          stationName: segment.stationName,
        });

        return segment;
      });
      
      console.log('[ODsay] 총 segments 개수:', segments.length, '모드:', segments.map(s => s.mode));

      // 출발지 → 시작역, 도착역 → 도착지 구간 추가
      const enhancedSegments: Segment[] = [];
      
      // 1. 출발지 → 첫 번째 segment 시작점까지의 경로 추가
      if (segments.length > 0) {
        const firstSegment = segments[0];
        const firstStationLocation: Location = {
          lat: path.subPath[0].startY,
          lng: path.subPath[0].startX,
          name: firstSegment.stationName || info.firstStartStation || '시작역',
        };
        
        // 출발지와 첫 번째 역이 다르면 경로 추가
        const distanceToFirstStation = Math.sqrt(
          Math.pow((origin.lat - firstStationLocation.lat) * 111, 2) +
          Math.pow((origin.lng - firstStationLocation.lng) * 111 * Math.cos(origin.lat * Math.PI / 180), 2)
        );
        
        if (distanceToFirstStation > 0.5) { // 500m 이상 떨어져 있으면
          console.log('[ODsay] 출발지 → 시작역 경로 추가 필요:', distanceToFirstStation, 'km');
          try {
            // ODsay로 출발지 → 시작역 경로 조회
            const toStationResponse = await axios.get(ODSAY_URL, {
              params: {
                apiKey: ODSAY_API_KEY,
                SX: origin.lng,
                SY: origin.lat,
                EX: firstStationLocation.lng,
                EY: firstStationLocation.lat,
                OPT: 0,
                count: 1,
              },
              timeout: 5000,
            });
            
            if (toStationResponse.data?.result?.path?.[0]?.subPath) {
              const toStationPath = toStationResponse.data.result.path[0];
              toStationPath.subPath.forEach((sub: any) => {
                let mode: TransportMode = 'walking';
                let name = undefined;
                
                if (sub.trafficType === 1) mode = 'subway';
                else if (sub.trafficType === 2 || sub.trafficType === 5) mode = 'bus';
                else if (sub.trafficType === 3 && sub.distance / 1000 > 5) mode = 'bus';
                else mode = 'walking';
                
                if (sub.lane && sub.lane.length > 0) {
                  if (mode === 'subway') name = sub.lane[0].name || sub.lane[0].subwayName;
                  else if (mode === 'bus') name = sub.lane[0].busNo || sub.lane[0].routeNo || '버스';
                }
                
                enhancedSegments.push({
                  mode,
                  distance: sub.distance / 1000,
                  duration: Math.round((sub.sectionTime || 0) / 60),
                  path: sub.startX && sub.startY && sub.endX && sub.endY ? [
                    [sub.startY, sub.startX],
                    [sub.endY, sub.endX]
                  ] : [],
                  name: name || (mode === 'walking' ? '도보' : '버스'),
                  stationId: sub.startID || sub.startStationID,
                  stationName: sub.startName || sub.startStationName,
                  routeId: sub.lane?.[0]?.busRouteID || sub.lane?.[0]?.routeID || sub.lane?.[0]?.subwayCode,
                });
              });
            }
          } catch (e) {
            console.warn('[ODsay] 출발지 → 시작역 경로 조회 실패:', e);
          }
        }
      }
      
      // 2. 기존 segments 추가
      enhancedSegments.push(...segments);
      
      // 3. 마지막 segment 도착점 → 도착지까지의 경로 추가
      if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1];
        const lastSubPath = path.subPath[path.subPath.length - 1];
        const lastStationLocation: Location = {
          lat: lastSubPath.endY,
          lng: lastSubPath.endX,
          name: lastSegment.stationName || info.lastEndStation || '도착역',
        };
        
        // 마지막 역과 도착지가 다르면 경로 추가
        const distanceFromLastStation = Math.sqrt(
          Math.pow((destination.lat - lastStationLocation.lat) * 111, 2) +
          Math.pow((destination.lng - lastStationLocation.lng) * 111 * Math.cos(destination.lat * Math.PI / 180), 2)
        );
        
        if (distanceFromLastStation > 0.5) { // 500m 이상 떨어져 있으면
          console.log('[ODsay] 도착역 → 도착지 경로 추가 필요:', distanceFromLastStation, 'km');
          try {
            // ODsay로 도착역 → 도착지 경로 조회
            const fromStationResponse = await axios.get(ODSAY_URL, {
              params: {
                apiKey: ODSAY_API_KEY,
                SX: lastStationLocation.lng,
                SY: lastStationLocation.lat,
                EX: destination.lng,
                EY: destination.lat,
                OPT: 0,
                count: 1,
              },
              timeout: 5000,
            });
            
            if (fromStationResponse.data?.result?.path?.[0]?.subPath) {
              const fromStationPath = fromStationResponse.data.result.path[0];
              fromStationPath.subPath.forEach((sub: any) => {
                let mode: TransportMode = 'walking';
                let name = undefined;
                
                if (sub.trafficType === 1) mode = 'subway';
                else if (sub.trafficType === 2 || sub.trafficType === 5) mode = 'bus';
                else if (sub.trafficType === 3 && sub.distance / 1000 > 5) mode = 'bus';
                else mode = 'walking';
                
                if (sub.lane && sub.lane.length > 0) {
                  if (mode === 'subway') name = sub.lane[0].name || sub.lane[0].subwayName;
                  else if (mode === 'bus') name = sub.lane[0].busNo || sub.lane[0].routeNo || '버스';
                }
                
                enhancedSegments.push({
                  mode,
                  distance: sub.distance / 1000,
                  duration: Math.round((sub.sectionTime || 0) / 60),
                  path: sub.startX && sub.startY && sub.endX && sub.endY ? [
                    [sub.startY, sub.startX],
                    [sub.endY, sub.endX]
                  ] : [],
                  name: name || (mode === 'walking' ? '도보' : '버스'),
                  stationId: sub.startID || sub.startStationID,
                  stationName: sub.startName || sub.startStationName,
                  routeId: sub.lane?.[0]?.busRouteID || sub.lane?.[0]?.routeID || sub.lane?.[0]?.subwayCode,
                });
              });
            }
          } catch (e) {
            console.warn('[ODsay] 도착역 → 도착지 경로 조회 실패:', e);
          }
        }
      }
      
      console.log('[ODsay] 최종 segments 개수:', enhancedSegments.length, '모드:', enhancedSegments.map(s => s.mode));

      const route: Route = {
          origin, destination,
          distance: info.totalDistance / 1000, 
          duration: info.totalTime, 
          transportMode: 'bus', 
          segments: enhancedSegments.length > 0 ? enhancedSegments : segments,
          polylines: polylines.length > 0 ? polylines : undefined,
      };
      
      const emission = calculateTrafficAdjustedEmission(route, false, 20);
      
      let coordinates: Coordinate[] = [];
      if (polylines.length > 0) {
          coordinates = polylines.flatMap(p => p.coordinates);
      } else {
          path.subPath.forEach((sub: any) => {
            if (sub.startX && sub.startY) coordinates.push({ longitude: sub.startX, latitude: sub.startY });
            if (sub.endX && sub.endY) coordinates.push({ longitude: sub.endX, latitude: sub.endY });
          });
      }

      return { route, emission, coordinates };
    } catch (e: any) {
      console.error('fetchPublicTransitRouteData Error:', e.message);
      try {
        const carRouteData = await fetchCarRouteData(origin, destination, 0, 'bus');
        const fallbackRoute: Route = { 
            ...carRouteData.route, 
            transportMode: 'bus',
            duration: Math.round(carRouteData.route.duration * 1.3)
        };
        const fallbackEmission = calculateTrafficAdjustedEmission(fallbackRoute, false, 20);
        return { ...carRouteData, route: fallbackRoute, emission: fallbackEmission };
      } catch (fallbackError) {
        throw e;
      }
    }
  };

  const handleSearch = async (origin: Location, destination: Location, transportMode: TransportMode) => {
    let effectiveTransportMode = transportMode;
    if (transportMode === 'vehicle') {
      if (!user?.vehicle_type) {
        Alert.alert(
          t('mainPage.vehicleSettingRequired'),
          t('mainPage.vehicleSettingMessage'),
          [
            { text: t('mainPage.later'), style: 'cancel' },
            { text: t('mainPage.goToSettings'), onPress: () => navigation.navigate('Settings' as never) },
          ]
        );
        return;
      }
      effectiveTransportMode = user.vehicle_type;
    }
    
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingMessage(t('mainPage.searchingRoute'));
    setSearchError(null);
    setLastSearchParams({ origin, destination, transportMode: effectiveTransportMode });
    
    try {
      const totalSteps = 4; // 전체 단계 수
      let currentStep = 0;
      
      // 1. 자동차 기준 경로 확보 (비교 및 절약량 계산용)
      currentStep++;
      setLoadingProgress(currentStep / totalSteps);
      setLoadingMessage(t('mainPage.searchingCarRoute') + ' (1/4)');
      
      let carReferenceData: RouteData | null = null;
      try {
        const [fastest, free] = await Promise.all([
          fetchCarRouteData(origin, destination, 0, user?.vehicle_type || 'car'),
          fetchCarRouteData(origin, destination, 10, user?.vehicle_type || 'car'),
        ]);
        
        if (free.route.duration <= fastest.route.duration * 1.3 && free.emission.totalEmission < fastest.emission.totalEmission) {
          carReferenceData = free;
        } else {
          carReferenceData = fastest;
        }
      } catch (e) {
        console.error('Failed to fetch reference car route:', e);
      }

      // 2. 대중교통 기준 경로 확보 (비교용)
      currentStep++;
      setLoadingProgress(currentStep / totalSteps);
      setLoadingMessage(t('mainPage.searchingPublicTransit') + ' (2/4)');
      
      let publicTransitReferenceData: RouteData | null = null;
      try {
        publicTransitReferenceData = await fetchPublicTransitRouteData(origin, destination);
      } catch (e) {
        console.error('Failed to fetch reference public transit route:', e);
      }

      let routesData: { [key: string]: RouteData } = {};

      if (carReferenceData) routesData.carReference = carReferenceData;
      if (publicTransitReferenceData) routesData.publicTransitReference = publicTransitReferenceData;

      // 3. 선택한 이동 수단에 따른 경로 검색
      currentStep++;
      setLoadingProgress(currentStep / totalSteps);
      
      const modeName = t(`transportModes.${effectiveTransportMode}`) || t('routeResult.routeType');
      setLoadingMessage(t('mainPage.searchingMode', { mode: modeName }) + ' (3/4)');

      if (['car', 'electric_car', 'hybrid', 'hydrogen', 'motorcycle', 'electric_motorcycle'].includes(effectiveTransportMode)) {
        // 차량 선택 시
        const [fastest, free] = await Promise.all([
          fetchCarRouteData(origin, destination, 0, effectiveTransportMode),
          fetchCarRouteData(origin, destination, 10, effectiveTransportMode),
        ]);
        
        let eco = fastest;
        if (free.route.duration <= fastest.route.duration * 1.3 && free.emission.totalEmission < fastest.emission.totalEmission) {
          eco = free;
        }
        routesData = { ...routesData, fastest, free, eco };

      } else if (effectiveTransportMode === 'bus') {
        // 대중교통 선택 시 (이미 위에서 가져왔지만, 명시적으로 할당)
        if (publicTransitReferenceData) {
            routesData = { ...routesData, fastest: publicTransitReferenceData, eco: publicTransitReferenceData };
        } else {
             // 폴백 로직 등이 fetchPublicTransitRouteData 안에 있으므로 다시 호출하거나 에러 처리
             const data = await fetchPublicTransitRouteData(origin, destination);
             routesData = { ...routesData, fastest: data, eco: data };
        }
      } else { // walking, bicycle
        const routeData = await fetchCarRouteData(origin, destination, 0, effectiveTransportMode);
        
        if (effectiveTransportMode === 'bicycle') {
            const mockStations = [
                {
                    name: '대여소 A',
                    location: { lat: origin.lat + 0.001, lng: origin.lng + 0.001, name: '대여소 A' },
                    availableCount: Math.floor(Math.random() * 10) + 1,
                },
                {
                    name: '대여소 B',
                    location: { lat: origin.lat - 0.001, lng: origin.lng + 0.002, name: '대여소 B' },
                    availableCount: Math.floor(Math.random() * 10) + 1,
                },
                {
                    name: '대여소 C',
                    location: { lat: origin.lat + 0.002, lng: origin.lng - 0.001, name: '대여소 C' },
                    availableCount: Math.floor(Math.random() * 10) + 1,
                },
            ];
            routeData.route.bikeStations = mockStations;
        }

        routesData = { ...routesData, fastest: routeData, eco: routeData };
      }
      
      // 4. 검색 기록 저장 및 완료
      currentStep++;
      setLoadingProgress(currentStep / totalSteps);
      setLoadingMessage(t('mainPage.organizingResults') + ' (4/4)');
      
      await saveSearchHistory(origin, destination, effectiveTransportMode, routesData, user?.id || null);
      
      setLoadingProgress(1);
      setLoadingMessage(t('common.complete'));
      
      // 약간의 지연 후 네비게이션 (사용자가 완료 메시지를 볼 수 있도록)
      await new Promise(resolve => setTimeout(resolve, 300));
      
      navigation.navigate('RouteResultPage', { routesData });

    } catch (error: any) {
      console.error("경로 검색 오류:", error);
      setLoadingProgress(0);
      
      // 에러 타입 분류
      let errorType: 'network' | 'no_route' | 'server' | 'unknown' = 'unknown';
      let errorMessage = '경로를 찾을 수 없거나 서버 오류입니다.';
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || error.message?.includes('Network request failed')) {
        errorType = 'network';
        errorMessage = '네트워크 연결에 실패했습니다.\n인터넷 연결을 확인해주세요.';
      } else if (error.message?.includes('경로를 찾을 수 없') || error.response?.status === 404) {
        errorType = 'no_route';
        errorMessage = '해당 경로를 찾을 수 없습니다.\n출발지와 도착지를 다시 확인해주세요.';
      } else if (error.response?.status >= 500) {
        errorType = 'server';
        errorMessage = '서버 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.';
      } else {
        errorMessage = error.response?.data?.message || error.message || errorMessage;
      }
      
      setSearchError({ message: errorMessage, type: errorType });
    } finally {
      setIsLoading(false);
      setLoadingMessage(undefined);
      setLoadingProgress(0);
    }
  };

  const handleRetrySearch = () => {
    if (lastSearchParams) {
      handleSearch(lastSearchParams.origin, lastSearchParams.destination, lastSearchParams.transportMode);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FadeInView>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Icon name="leaf" size={32} color={Theme.colors.primary} />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>{t('mainPage.title')}</Text>
              <Text style={styles.headerSubtitle}>{t('mainPage.subtitle')}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={styles.menuButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('common.openMenu')}
            accessibilityHint={t('common.menuHint')}
          >
            <Icon name="menu" size={28} color={Theme.colors.text} />
          </TouchableOpacity>
        </View>
      </FadeInView>
      
      {/* 광고 배너 - 헤더 아래, 출발지 입력 필드 위 */}
      <AdBanner rotationInterval={12000} />
      
      <RouteForm onSearch={handleSearch} isLoading={isLoading} />
      
      {/* 에러 상태 표시 */}
      {searchError && !isLoading && (
        <FadeInView>
          <View style={styles.errorContainer}>
            <View style={styles.errorContent}>
              <Icon 
                name={
                  searchError.type === 'network' ? 'wifi-off' :
                  searchError.type === 'no_route' ? 'map-marker-off' :
                  searchError.type === 'server' ? 'server-off' :
                  'alert-circle'
                } 
                size={32} 
                color={Theme.colors.error} 
              />
              <View style={styles.errorTextContainer}>
                <Text style={styles.errorTitle}>
                  {searchError.type === 'network' ? t('mainPage.networkError') :
                   searchError.type === 'no_route' ? t('mainPage.noRouteFound') :
                   searchError.type === 'server' ? t('mainPage.serverError') :
                   t('mainPage.searchError')}
                </Text>
                <Text style={styles.errorMessage}>{searchError.message}</Text>
              </View>
            </View>
            {lastSearchParams && (
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={handleRetrySearch}
                activeOpacity={0.7}
              >
                <Icon name="refresh" size={20} color={Theme.colors.backgroundLight} />
                <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </FadeInView>
      )}
      
      <LoadingOverlay visible={isLoading} message={loadingMessage} progress={loadingProgress} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    backgroundColor: Theme.colors.surface,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    ...Theme.shadows.small,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    padding: Theme.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: Theme.spacing.md,
    flex: 1,
  },
  headerTitle: {
    ...Theme.typography.h2,
    color: Theme.colors.text,
    fontWeight: 'bold',
    marginBottom: Theme.spacing.xs,
  },
  headerSubtitle: {
    ...Theme.typography.body2,
    color: Theme.colors.textSecondary,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    margin: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
    backgroundColor: Theme.colors.errorLight,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.error,
    ...Theme.shadows.small,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.sm,
  },
  errorTextContainer: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  errorTitle: {
    ...Theme.typography.h4,
    color: Theme.colors.error,
    fontWeight: '600',
    marginBottom: Theme.spacing.xs,
  },
  errorMessage: {
    ...Theme.typography.body2,
    color: Theme.colors.text,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.error,
    borderRadius: Theme.borderRadius.medium,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    gap: Theme.spacing.xs,
    marginTop: Theme.spacing.xs,
  },
  retryButtonText: {
    ...Theme.typography.button,
    color: Theme.colors.backgroundLight,
    fontWeight: '600',
  },
});

export default MainPage;