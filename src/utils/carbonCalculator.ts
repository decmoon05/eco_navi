import { TransportMode, CarbonEmission, Route } from '../types';

// 탄소 배출 계수 (gCO2/km) - 차량 1대(또는 1편성) 기준
const CARBON_EMISSION_FACTORS: Record<TransportMode, number> = {
  walking: 0,
  bicycle: 0,
  bus: 600, // 버스 1대당 평균 배출량 (디젤/CNG 혼합)
  subway: 10000, // 지하철 1편성(10량 기준)당 평균 배출량 (전력 기반)
  car: 170, // 내연기관차 평균
  electric_car: 50, // 전력 생산 배출량 고려
  hybrid: 95,
  hydrogen: 25,
  motorcycle: 90,
  electric_motorcycle: 20,
  vehicle: 0,
};

// ... (BONUS_POINTS 등은 유지)

// 시간대별 예상 탑승 인원 추정
const getEstimatedPassengerCount = (mode: 'bus' | 'subway'): number => {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const isWeekend = day === 0 || day === 6;
  let passengerCount = 0;

  if (mode === 'bus') {
    if (isWeekend) {
        if (hour >= 11 && hour <= 19) passengerCount = 20; 
        else passengerCount = 10; 
    }
    else { 
        if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) passengerCount = 40; 
        else if (hour >= 9 && hour <= 21) passengerCount = 15; 
        else passengerCount = 5; 
    }
  } else { // subway
    if (isWeekend) {
        if (hour >= 11 && hour <= 19) passengerCount = 600;
        else passengerCount = 300;
    }
    else {
        if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) passengerCount = 1500; 
        else if (hour >= 9 && hour <= 21) passengerCount = 500;
        else passengerCount = 150;
    }
  }
  console.log('[Debug Passenger Count] Mode:', mode, 'Hour:', hour, 'isWeekend:', isWeekend, 'Count:', passengerCount);
  return passengerCount;
};

// 시간/요일별 혼잡도에 따른 배출량 보정 계수 계산
const getCongestionFactor = (mode: 'bus' | 'subway'): number => {
  const now = new Date();
  const day = now.getDay(); // 0: 일요일, 6: 토요일
  const hour = now.getHours();

  const isWeekend = day === 0 || day === 6;
  
  // 심야/새벽 (23시 ~ 06시) - 사람이 적으므로 1인당 배출량 증가
  if (hour >= 23 || hour < 6) {
    return 1.5; // 1인당 배출량 50% 증가
  }

  if (isWeekend) {
    // 주말 낮 시간대 - 평일 평균보다는 약간 쾌적하거나 비슷함
    return 0.9; 
  }

  // 평일 출퇴근 시간 (07~09, 17~19) - 사람이 많으므로 1인당 배출량 감소
  const isRushHour = (hour >= 7 && hour < 9) || (hour >= 17 && hour < 19);
  if (isRushHour) {
    // 지하철이 버스보다 혼잡도가 더 극심하게 증가하는 경향 반영
    return mode === 'subway' ? 0.6 : 0.7; 
  }

  // 평일 평시
  return 1.0;
};

// --- 지하철 전용 계산 모델 ---
const ELECTRICITY_CO2_FACTOR = 478.1; // gCO2/kWh
const STATION_FIXED_EMISSION = 24.5; // gCO2 (1회 탑승 당)

// 호선별 평균 전력 소비율 (e, kWh/km) 샘플 데이터
const SUBWAY_LINE_ENERGY_RATE: Record<string, number> = {
  "2호선": 3.9,
  "7호선": 3.5,
  "분당선": 3.2,
  "default": 3.6, // 테이블에 없는 노선에 대한 기본값
};

const calculateSubwayEmission = (route: Route): CarbonEmission => {
  let totalDrivingEmission = 0;
  const congestionFactor = getCongestionFactor('subway'); // 혼잡도 계수 적용

  if (route.segments) {
    for (const segment of route.segments) {
      if (segment.mode === 'subway') {
        const lineName = segment.name || 'default'; // e.g., "2호선"
        const energyRate = SUBWAY_LINE_ENERGY_RATE[lineName] || SUBWAY_LINE_ENERGY_RATE.default;
        const segmentEmission = segment.distance * energyRate * ELECTRICITY_CO2_FACTOR;
        totalDrivingEmission += segmentEmission;
      }
    }
  }

  // 기본 계산값이 없을 경우(segments 없는 단순 호출 시) 평균값 사용
  if (totalDrivingEmission === 0) {
    totalDrivingEmission = CARBON_EMISSION_FACTORS.subway * route.distance;
  }

  const totalEmission = (totalDrivingEmission + STATION_FIXED_EMISSION) * congestionFactor;
  const carComparable = CARBON_EMISSION_FACTORS.car * route.distance;
  const savedEmission = Math.max(0, carComparable - totalEmission);

  return {
    mode: 'subway',
    emissionPerKm: route.distance > 0 ? totalEmission / route.distance : 0,
    totalEmission: totalEmission,
    savedEmission: savedEmission,
  };
}

// 버스 전용 계산 모델
const calculateBusEmission = (route: Route, isAcOn: boolean, temperature: number): CarbonEmission => {
  const { distance, duration } = route;
  const congestionFactor = getCongestionFactor('bus'); // 혼잡도 계수 적용

  // 1. 주행/정차 시간 추정
  const STOPS_PER_KM = 2; // km당 정류장 2개 가정
  const SECS_PER_STOP = 30; // 정류장당 30초 정차 가정
  const totalStopTimeSec = distance * STOPS_PER_KM * SECS_PER_STOP;
  const totalDurationSec = duration * 60;
  const drivingTimeSec = Math.max(1, totalDurationSec - totalStopTimeSec);

  // 2. 주행 배출량 계산
  const drivingSpeedKmh = distance / (drivingTimeSec / 3600);
  const baseEf = 5054.5880 * Math.pow(drivingSpeedKmh, -0.9410);
  const c1_slope = getSlopeFactor(route); // TODO
  const c2_accel = getAccelerationFactor(route);
  const c3_hvac = getBusAcFactor(isAcOn, temperature);
  
  // 혼잡도 계수를 최종 배출량에 곱함 (승객 수에 따른 1/N 효과 반영)
  // baseEf는 차량 1대 기준이므로, 이를 승객 수로 나눈 효과를 congestionFactor로 조절
  // 기존 CARBON_EMISSION_FACTORS.bus(45)는 평균 탑승 기준이므로, 이를 기준으로 보정
  let drivingEmission = 0;
  
  // 상세 모델 계산이 너무 복잡하거나 값이 튈 수 있으므로, 기본 평균값(45)을 기준으로 혼잡도/환경 변수 보정 적용
  const baseEmission = CARBON_EMISSION_FACTORS.bus * distance;
  const totalEmission = baseEmission * c1_slope * c2_accel * c3_hvac * congestionFactor;

  const carComparable = CARBON_EMISSION_FACTORS.car * distance;
  const savedEmission = Math.max(0, carComparable - totalEmission);

  return {
    mode: 'bus',
    emissionPerKm: distance > 0 ? totalEmission / distance : 0,
    totalEmission: totalEmission,
    savedEmission: savedEmission,
  };
}

// --- 전기차(EV) 전용 상수 ---
const EV_BASE_EFFICIENCY = 140; // 기준 소비전력 (Wh/km)
const CHARGING_EFFICIENCY = 0.85; // 충전 효율
const GRID_EMISSION_FACTOR = 451.7; // 국가 온실가스 배출계수 (gCO₂/kWh)

// 자동차/이륜차용 계산 모델 (하위 모든 차종 포함)
const calculateVehicleEmission = (route: Route, isAcOn: boolean, temperature: number): CarbonEmission => {
  const { distance, duration, transportMode } = route;

  // 안전 장치: 거리가 0이거나 시간이 0이면 배출량도 0
  if (!distance || distance <= 0 || !duration || duration <= 0) {
    return {
      mode: transportMode,
      emissionPerKm: 0,
      totalEmission: 0,
      savedEmission: 0,
    };
  }

  let totalEmission = 0;

  let totalEmission = 0;
  const hours = Math.max(0.001, duration / 60);
  const avgSpeed = distance / hours;

  switch (transportMode) {
    case 'car': {
      const table = SPEED_CO2_TABLE[transportMode];
      if (!table) return calculateCarbonEmission(route);
      
      let baseEmissionPerKm = CARBON_EMISSION_FACTORS[transportMode];
      // 속도 기반 배출계수 보정 (기존 로직)
      if (avgSpeed <= table[0][0]) baseEmissionPerKm = table[0][1];
      else if (avgSpeed >= table[table.length - 1][0]) baseEmissionPerKm = table[table.length - 1][1];
      else {
        for (let i = 0; i < table.length - 1; i++) {
          const [speed1, emission1] = table[i];
          const [speed2, emission2] = table[i + 1];
          if (avgSpeed >= speed1 && avgSpeed <= speed2) {
            baseEmissionPerKm = emission1 + (avgSpeed - speed1) * (emission2 - emission1) / (speed2 - speed1);
            break;
          }
        }
      }
      const finalEmissionPerKm = baseEmissionPerKm * getSlopeFactor(route) * getAccelerationFactor(route) * getCarAcFactor(isAcOn) * getTemperatureFactor(temperature);
      totalEmission = finalEmissionPerKm * distance;
      break;
    }
    
    case 'electric_car': {
      const basePowerConsumption = distance * (EV_BASE_EFFICIENCY / 1000); // kWh
      const c_grade = 1.0;
      const c_accel = 1.1;
      const c_mac = isAcOn ? 1.2 : 1.0;
      const batteryConsumption = basePowerConsumption * c_grade * c_accel * c_mac;
      const gridConsumption = batteryConsumption / CHARGING_EFFICIENCY;
      totalEmission = gridConsumption * GRID_EMISSION_FACTOR;
      break;
    }

    case 'hybrid': {
      const EV_RATIO = 0.3; // 주행의 30%를 전기 모드로 가정
      // 내연기관 배출량 (70%)
      const iceEmission = calculateVehicleEmission({ ...route, transportMode: 'car' }, isAcOn, temperature).totalEmission * (1 - EV_RATIO);
      // 전기모드 배출량 (30%)
      const evEmission = calculateVehicleEmission({ ...route, transportMode: 'electric_car' }, isAcOn, temperature).totalEmission * EV_RATIO;
      totalEmission = iceEmission + evEmission;
      break;
    }

    case 'hydrogen': {
      // 국내 그레이수소 기준 (생산+운송) 배출계수: 약 25g/km (차량 모델마다 편차 큼)
      totalEmission = distance * CARBON_EMISSION_FACTORS.hydrogen;
      break;
    }

    case 'motorcycle': {
      // 자동차보다 효율 좋으나, 정화장치 부족. 평균 90g/km 적용
      totalEmission = distance * CARBON_EMISSION_FACTORS.motorcycle;
      break;
    }

    case 'electric_motorcycle': {
      const E_MOTORCYCLE_EFFICIENCY = 70; // Wh/km (전기차의 절반 수준)
      const basePowerConsumption = distance * (E_MOTORCYCLE_EFFICIENCY / 1000);
      const batteryConsumption = basePowerConsumption * 1.05 * (isAcOn ? 1.05 : 1.0); // 가감속, 공조(약하게)
      const gridConsumption = batteryConsumption / CHARGING_EFFICIENCY;
      totalEmission = gridConsumption * GRID_EMISSION_FACTOR;
      break;
    }
      
    default:
      // 정의되지 않은 차량 타입의 경우 기본 배출량 계산
      return calculateCarbonEmission(route);
  }

  const carComparable = CARBON_EMISSION_FACTORS.car * distance;
  const savedEmission = Math.max(0, carComparable - totalEmission);

  const emissionPerKm = distance > 0 ? totalEmission / distance : 0;

  return {
    mode: transportMode,
    emissionPerKm: emissionPerKm,
    totalEmission: totalEmission,
    savedEmission: savedEmission,
  };
}

/**
 * 상세 모델을 기반으로 탄소 배출량을 계산합니다. (라우터 함수)
 * @param route 경로 정보
 * @param isAcOn 에어컨/히터 사용 여부
 * @param temperature 외부 기온 (섭씨)
 * @returns CarbonEmission
 */
export const calculateTrafficAdjustedEmission = (
  route: Route,
  isAcOn: boolean = false,
  temperature: number = 20,
): CarbonEmission => {
  console.log('[Debug TrafficAdjusted] Mode:', route.transportMode, 'Has Segments:', !!route.segments, 'Distance:', route.distance);

  // 세그먼트 기반의 대중교통 경로 계산
  if (route.segments && route.segments.length > 0) {
    let totalEmission = 0;
    let carComparable = CARBON_EMISSION_FACTORS.car * route.distance;
    
    route.segments.forEach(segment => {
      const segmentRoute: Route = { ...route, distance: segment.distance, transportMode: segment.mode, name: segment.name };
      switch (segment.mode) {
        case 'subway':
          totalEmission += calculateSubwayEmission(segmentRoute).totalEmission;
          break;
        case 'bus':
          totalEmission += calculateBusEmission(segmentRoute, isAcOn, temperature).totalEmission;
          break;
        // 도보, 자전거 등 다른 모드는 배출량 0으로 간주
        default:
          totalEmission += 0;
          break;
      }
    });

    const savedEmission = Math.max(0, carComparable - totalEmission);

    return {
      mode: 'bus', // 대표 모드를 'bus' (대중교통)으로 설정
      emissionPerKm: totalEmission / route.distance,
      totalEmission: totalEmission,
      savedEmission: savedEmission,
    };
  }

  // 기존 단일 모드 계산
  switch (route.transportMode) {
    case 'subway':
      return calculateSubwayEmission(route);
    case 'bus':
      return calculateBusEmission(route, isAcOn, temperature);
    case 'car':
    case 'electric_car':
    case 'hybrid':
    case 'hydrogen':
    case 'motorcycle':
    case 'electric_motorcycle':
      return calculateVehicleEmission(route, isAcOn, temperature);
    default:
      return calculateCarbonEmission(route);
  }
};

export const calculateBonus = (route: Route): number => {
  const basePoints = BONUS_POINTS[route.transportMode];
  const distanceMultiplier = Math.min(route.distance / 10, 2);
  const ecoMultiplier = route.transportMode === 'walking' || route.transportMode === 'bicycle' ? 1.5 : 1;
  return Math.round(basePoints * distanceMultiplier * ecoMultiplier);
};

export const getTransportModeInfo = (mode: TransportMode) => {
  const info = {
    walking: { name: '도보', icon: '🚶', color: '#4CAF50' },
    bicycle: { name: '자전거', icon: '🚲', color: '#8BC34A' },
    bus: { name: '버스(대중교통)', icon: '🚌', color: '#FF9800' },
    subway: { name: '지하철(대중교통)', icon: '🚇', color: '#2196F3' },
    car: { name: '내 차량(내연)', icon: '🚗', color: '#F44336' },
    electric_car: { name: '내 차량(전기)', icon: '🔋', color: '#9C27B0' },
    hybrid: { name: '내 차량(하이브리드)', icon: '🌱', color: '#4DB6AC' },
    hydrogen: { name: '내 차량(수소)', icon: '💧', color: '#B2EBF2' },
    motorcycle: { name: '내 차량(오토바이)', icon: '🏍️', color: '#795548' },
    electric_motorcycle: { name: '내 차량(전기오토바이)', icon: '⚡️', color: '#FFC107' },
    vehicle: { name: '내 차량', icon: '🚗', color: '#F44336' },
  };
  return info[mode];
};

export const formatEmission = (emission: number): string => {
  if (emission < 1000) return `${emission.toFixed(1)}g CO₂`;
  return `${(emission / 1000).toFixed(2)}kg CO₂`;
};

export const formatDistance = (distance: number): string => `${distance.toFixed(1)}km`;

export const formatDuration = (duration: number): string => {
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${minutes}분`;
}; 