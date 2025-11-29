import axios from 'axios';

/**
 * 서울시 지하철 실시간 도착 정보 API
 * TAGO API는 시간표만 제공하므로, 서울시 공공데이터 API 사용
 */

const SEOUL_SUBWAY_API_URL = 'http://swopenAPI.seoul.go.kr/api/subway';
// TODO: 서울시 공공데이터 API 키 필요 (현재는 TAGO API 키 사용 불가)

/**
 * 서울시 지하철 실시간 도착 정보 조회
 * @param stationName 지하철 역 이름
 * @param lineNum 호선 번호 (선택사항)
 */
export const getSeoulSubwayArrivalInfo = async (
  stationName: string,
  lineNum?: string
): Promise<{
  stationName: string;
  lineNum: string;
  trainLineNm: string;
  arvlMsg2: string;
  arvlMsg3: string;
  barvlDt: string;
}[]> => {
  try {
    // 서울시 지하철 실시간 도착 정보 API
    // API URL 형식: /json/realtimeStationArrival/0/5/역이름
    // 0: 시작 인덱스, 5: 조회 개수
    const url = `${SEOUL_SUBWAY_API_URL}/sample/json/realtimeStationArrival/0/5/${encodeURIComponent(stationName)}`;
    
    const response = await axios.get(url, { 
      timeout: 5000,
    });

    const items = response.data.realtimeArrivalList;
    if (!items) {
      console.log(`[Seoul Subway] No arrival info for station ${stationName}`);
      return [];
    }

    const arrivalList = Array.isArray(items) ? items : [items];

    return arrivalList
      .filter((item: any) => !lineNum || item.subwayId === lineNum) // 특정 호선 필터링
      .map((item: any) => ({
        stationName: item.stnNm,
        lineNum: item.subwayId,
        trainLineNm: item.trainLineNm,
        arvlMsg2: item.arvlMsg2,
        arvlMsg3: item.arvlMsg3,
        barvlDt: item.barvlDt,
      }));
  } catch (error: any) {
    console.error(`[Seoul Subway] Failed to fetch subway arrival info for station ${stationName}:`, error);
    return [];
  }
};



