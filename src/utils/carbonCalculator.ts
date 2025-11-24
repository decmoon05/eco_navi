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

// 보너스 포인트 계산
const BONUS_POINTS: Record<TransportMode, number> = {
  walking: 10,
  bicycle: 8,
  bus: 5,
  subway: 6,
  car: 0,
  electric_car: 3,
  hybrid: 2,
  hydrogen: 4,
  motorcycle: 1,
  electric_motorcycle: 5,
  vehicle: 0,
};

export const calculateCarbonEmission = (route: Route): CarbonEmission => {
  const { distance, transportMode } = route;
  const emissionPerKm = CARBON_EMISSION_FACTORS[transportMode];
  const totalEmission = emissionPerKm * distance;
  const carEmission = CARBON_EMISSION_FACTORS.car * distance;
  const savedEmission = Math.max(0, carEmission - totalEmission);
  return { mode: transportMode, emissionPerKm, totalEmission, savedEmission };
};

// --- 상세 모델 기반 배출량 계산 ---

// 2단계: 속도대별 CO2 배출계수 테이블 구현 (자동차용)
const SPEED_CO2_TABLE: Partial<Record<TransportMode, [number, number][]>> = {
  car: [
    [0, 600], [10, 400], [30, 200], [60, 140], [80, 130], [100, 140], [120, 180], [140, 220],
  ],
  electric_car: [
    [0, 100], [20, 40], [80, 50], [120, 70], [140, 90],
  ]
};

// C1: 경사 보정계수 (Placeholder)
const getSlopeFactor = (route: Route): number => {
  // TODO: 4단계 - Tmap 고도 정보 연동 (차종별 다른 테이블 필요)
  return 1.0;
};

// C2: 가감속 보정계수
const getAccelerationFactor = (route: Route): number => {
  const { distance, duration, transportMode } = route;

  if (transportMode === 'bus') {
    return 1.1; // 버스는 서울시내버스 평균 통행속도 기반 1.1 고정
  }
  if (transportMode === 'car') {
    const hours = Math.max(0.001, duration / 60);
    const avgSpeed = distance / hours;
    // 평균 속도를 기준으로 혼잡도 추정 (간선도로 기준)
    if (avgSpeed > 70) return 1.05; // 원활
    if (avgSpeed > 30) return 1.10; // 서행
    return 1.15; // 정체
  }
  return 1.0;
};

// C3: 에어컨/히터 보정계수
const getCarAcFactor = (isAcOn: boolean): number => {
  return isAcOn ? 1.08 : 1.0;
};

const getBusAcFactor = (isAcOn: boolean, temperature: number): number => {
  if (!isAcOn) return 1.0;
  const INDOOR_TEMP = 22; // 실내 목표 온도 가정
  const deltaT = Math.abs(temperature - INDOOR_TEMP);
  if (deltaT <= 5) return 1.05;
  if (deltaT <= 10) return 1.15;
  if (deltaT <= 15) return 1.3;
  return 1.4;
};

// C4: 외부 기온 보정계수
const TEMPERATURE_FACTOR_TABLE: [number, number][] = [
  [-10, 1.057], [0, 1.036], [20, 1.0], [35, 0.97],
];

const getTemperatureFactor = (temperature: number): number => {
  const table = TEMPERATURE_FACTOR_TABLE;
  if (temperature <= table[0][0]) return table[0][1];
  if (temperature >= table[table.length - 1][0]) return table[table.length - 1][1];
  for (let i = 0; i < table.length - 1; i++) {
    const [temp1, factor1] = table[i];
    const [temp2, factor2] = table[i + 1];
    if (temperature >= temp1 && temperature <= temp2) {
      return factor1 + (temperature - temp1) * (factor2 - factor1) / (temp2 - temp1);
    }
  }
  return 1.0;
};

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
  console.log(`[Debug] getEstimatedPassengerCount Mode: ${mode}, Hour: ${hour}, Count: ${passengerCount}`);
  return passengerCount;
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
  const passengerCount = Math.max(1, getEstimatedPassengerCount('subway'));

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

  if (totalDrivingEmission === 0) {
    totalDrivingEmission = CARBON_EMISSION_FACTORS.subway * route.distance;
  }

  const totalEmission = (totalDrivingEmission + STATION_FIXED_EMISSION) / passengerCount;
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
  const passengerCount = Math.max(1, getEstimatedPassengerCount('bus'));

  console.log(`[Debug] calculateBusEmission - Distance: ${distance}, PassengerCount: ${passengerCount}`);

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
  
  // 1대당 기본 배출량 (복잡한 모델 대신 평균값 600 사용하거나 baseEf 사용 선택. 여기서는 평균값 기준)
  const baseEmission = CARBON_EMISSION_FACTORS.bus * distance;
  
  // 1대당 총 배출량
  const vehicleTotalEmission = baseEmission * c1_slope * c2_accel * c3_hvac;

  // 1인당 배출량 = 1대당 배출량 / 승객 수
  const totalEmission = vehicleTotalEmission / passengerCount;

  console.log(`[Debug] calculateBusEmission - VehicleTotal: ${vehicleTotalEmission}, FinalPerPerson: ${totalEmission}`);

  const carComparable = CARBON_EMISSION_FACTORS.car * distance;
  const savedEmission = Math.max(0, carComparable - totalEmission);

  return {
    mode: 'bus',
    emissionPerKm: distance > 0 ? totalEmission / distance : 0,
    totalEmission: totalEmission,
    savedEmission: savedEmission,
  };
}

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