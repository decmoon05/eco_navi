import axios from 'axios';
import { API_KEYS } from '../config/apiKeys';

/**
 * 국토교통부 TAGO API를 사용한 실시간 교통 정보 유틸리티
 */

const TAGO_BASE_URL = 'https://apis.data.go.kr/1613000';
// 버스 도착정보 서비스: ArvlInfoInqireService
// 버스 정류소정보 서비스: BusSttnInfoInqireService
// 지하철정보 서비스: SubwayInfoService

/**
 * 버스 정류소 정보 조회
 */
export const getBusStationInfo = async (stationName: string, cityCode: string = '11') => {
  try {
    const response = await axios.get(
      `${TAGO_BASE_URL}/BusSttnInfoInqireService/getSttnNoList`,
      {
        params: {
          serviceKey: API_KEYS.PUBLIC_DATA_API_KEY,
          cityCode,
          nodeNm: stationName,
          numOfRows: 10,
          pageNo: 1,
          _type: 'json',
        },
        timeout: 10000,
      }
    );

    if (response.data?.response?.body?.items?.item) {
      return Array.isArray(response.data.response.body.items.item)
        ? response.data.response.body.items.item
        : [response.data.response.body.items.item];
    }
  } catch (error: any) {
    console.error('버스 정류소 정보 조회 실패:', error.response?.data || error.message);
  }
  return [];
};

/**
 * 버스 노선 정보 조회
 */
export const getBusRouteInfo = async (routeName: string, cityCode: string = '11') => {
  try {
    const response = await axios.get(
      `${TAGO_BASE_URL}/BusRouteInfoInqireService/getRouteNoList`,
      {
        params: {
          serviceKey: API_KEYS.PUBLIC_DATA_API_KEY,
          cityCode,
          routeNo: routeName,
          numOfRows: 10,
          pageNo: 1,
          _type: 'json',
        },
        timeout: 10000,
      }
    );

    if (response.data?.response?.body?.items?.item) {
      return Array.isArray(response.data.response.body.items.item)
        ? response.data.response.body.items.item
        : [response.data.response.body.items.item];
    }
  } catch (error: any) {
    console.error('버스 노선 정보 조회 실패:', error.response?.data || error.message);
  }
  return [];
};

/**
 * 버스 도착 정보 조회 (정류소 기준)
 */
export const getBusArrivalByStation = async (stationId: string, cityCode: string = '11') => {
  try {
    // TAGO API는 serviceKey를 그대로 사용 (인코딩/디코딩된 키 사용)
    const serviceKey = API_KEYS.PUBLIC_DATA_API_KEY;
    
    // 정류소별도착예정정보 목록 조회
    // 엔드포인트: ArvlInfoInqireService
    // 상세기능 1: 정류소별도착예정정보 목록 조회
    // 메서드명: getSttnAcctoArvlPrearngeInfoList (문서 기준)
    const response = await axios.get(
      `${TAGO_BASE_URL}/ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList`,
      {
        params: {
          serviceKey: serviceKey, // 인코딩하지 않고 그대로 사용
          cityCode: cityCode,
          nodeId: stationId,
          numOfRows: 50,
          pageNo: 1,
          _type: 'json',
        },
        timeout: 10000,
      }
    );
    
    console.log('[TAGO Bus] API 호출 성공:', {
      url: `${TAGO_BASE_URL}/ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList`,
      cityCode,
      nodeId: stationId,
      status: response.status,
    });

    // 응답 구조 확인
    console.log('[TAGO Bus] 응답 구조:', {
      hasResponse: !!response.data?.response,
      hasBody: !!response.data?.response?.body,
      hasItems: !!response.data?.response?.body?.items,
      resultCode: response.data?.response?.header?.resultCode,
      resultMsg: response.data?.response?.header?.resultMsg,
      fullResponse: response.data ? JSON.stringify(response.data).substring(0, 1000) : 'No data',
    });

    // 에러 응답 처리
    if (response.data?.response?.header?.resultCode && response.data?.response?.header?.resultCode !== '00') {
      console.error('[TAGO Bus] API 에러:', response.data?.response?.header);
      return [];
    }

    if (response.data?.response?.body?.items?.item) {
      const items = Array.isArray(response.data.response.body.items.item)
        ? response.data.response.body.items.item
        : [response.data.response.body.items.item];

      return items.map((item: any) => ({
        routeId: item.routeid || item.busRouteId,
        routeName: item.routeno || item.routetp || item.busRouteNm,
        stationId: item.nodeid || stationId,
        stationName: item.nodenm || item.stationNm,
        arrivalTime: item.arrtime ? parseInt(item.arrtime) : 0, // 초 단위 (문서: 도착예정버스 도착예상시간[초])
        remainingStations: item.arrprevstationcnt || 0, // 문서: 도착예정버스 남은 정류장 수
        isLowFloor: item.vehicletp === '저상버스' || item.vehicletp === '1' || item.lowPlate === '1' || false, // 문서: 도착예정버스 차량유형
        vehicleNo: item.vehicleno || item.vehicleNo,
      }));
    }
  } catch (error: any) {
    console.error('버스 도착 정보 조회 실패:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url,
      params: error.config?.params,
    });
  }
  return [];
};

/**
 * 지하철 역 정보 조회
 */
export const getSubwayStationInfo = async (stationName: string) => {
  try {
    const response = await axios.get(
      `${TAGO_BASE_URL}/SubwayInfoService/getKwrdFndSubwaySttnList`,
      {
        params: {
          serviceKey: API_KEYS.PUBLIC_DATA_API_KEY,
          subwayStationName: stationName,
          numOfRows: 10,
          pageNo: 1,
          _type: 'json',
        },
        timeout: 10000,
      }
    );

    if (response.data?.response?.body?.items?.item) {
      return Array.isArray(response.data.response.body.items.item)
        ? response.data.response.body.items.item
        : [response.data.response.body.items.item];
    }
  } catch (error: any) {
    console.error('지하철 역 정보 조회 실패:', error.response?.data || error.message);
  }
  return [];
};

/**
 * 지하철 실시간 도착 정보 조회
 */
export const getSubwayArrivalInfo = async (stationId: string, subwayRouteId: string) => {
  try {
    // TAGO API는 serviceKey를 URL 인코딩하지 않고 그대로 사용해야 할 수도 있음
    const serviceKey = API_KEYS.PUBLIC_DATA_API_KEY;
    
    const response = await axios.get(
      `${TAGO_BASE_URL}/SubwayInfoService/getSubwaySttnAcctoSchdulList`,
      {
        params: {
          serviceKey: serviceKey, // 인코딩하지 않고 그대로 사용
          subwayStationId: stationId,
          subwayRouteId,
          dailyTypeCode: '01', // 평일
          upDownTypeCode: 'U', // 상행
          numOfRows: 10,
          pageNo: 1,
          _type: 'json',
        },
        timeout: 10000,
      }
    );
    
    console.log('[TAGO Subway] API 호출 성공:', {
      url: `${TAGO_BASE_URL}/SubwayInfoService/getSubwaySttnAcctoSchdulList`,
      subwayStationId: stationId,
      subwayRouteId,
      status: response.status,
    });

    // 응답 구조 확인
    console.log('[TAGO Subway] 응답 구조:', {
      hasResponse: !!response.data?.response,
      hasBody: !!response.data?.response?.body,
      hasItems: !!response.data?.response?.body?.items,
      resultCode: response.data?.response?.header?.resultCode,
      resultMsg: response.data?.response?.header?.resultMsg,
      fullResponse: response.data ? JSON.stringify(response.data).substring(0, 1000) : 'No data',
    });

    // 에러 응답 처리
    if (response.data?.response?.header?.resultCode && response.data?.response?.header?.resultCode !== '00') {
      console.error('[TAGO Subway] API 에러:', response.data?.response?.header);
      return [];
    }

    if (response.data?.response?.body?.items?.item) {
      const items = Array.isArray(response.data.response.body.items.item)
        ? response.data.response.body.items.item
        : [response.data.response.body.items.item];

      return items.map((item: any) => ({
        stationId: item.subwayStationId || stationId,
        stationName: item.subwayStationName,
        lineName: item.subwayRouteName,
        direction: item.upDownTypeCode === 'U' ? '상행' : '하행',
        arrivalTime: item.arrivetime ? parseInt(item.arrivetime) : 0,
        currentStation: item.currentStationName || '',
        remainingStations: 0,
      }));
    }
  } catch (error: any) {
    console.error('지하철 도착 정보 조회 실패:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url,
      params: error.config?.params,
    });
  }
  return [];
};

/**
 * 도시 코드 매핑
 */
export const CITY_CODES: Record<string, string> = {
  '서울': '11',
  '부산': '26',
  '대구': '27',
  '인천': '28',
  '광주': '29',
  '대전': '30',
  '울산': '31',
  '세종': '36',
  '경기': '41',
  '강원': '42',
  '충북': '43',
  '충남': '44',
  '전북': '45',
  '전남': '46',
  '경북': '47',
  '경남': '48',
  '제주': '50',
};

