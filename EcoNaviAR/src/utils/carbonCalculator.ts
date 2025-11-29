import { TransportMode, CarbonEmission, Route } from '../types';
import { t } from '../i18n';

// 탄소 배출 계수 (gCO2/km) - 차량 1대(또는 1편성) 기준
const CARBON_EMISSION_FACTORS: Record<TransportMode, number> = {
  walking: 0,
  bicycle: 0,
  bus: 600, // 버스 1대당 평균 배출량 (디젤/CNG 혼합)
  subway: 10000, // 지하철 1편성(10량 기준)당 평균 배출량 (전력 기반)
  train: 12000, // 기차 1편성(10량 기준)당 평균 배출량 (전력 기반, 장거리)
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
  train: 7, // 기차는 장거리 대중교통으로 포인트 높게
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
  ],
  hybrid: [
    [0, 350], [10, 250], [30, 120], [60, 85], [80, 80], [100, 85], [120, 110], [140, 130],
  ],
  motorcycle: [
    [0, 200], [10, 150], [30, 100], [60, 90], [80, 95], [100, 100], [120, 110], [140, 120],
  ],
};

/**
 * C1: 경사 보정계수
 * 경사도에 따른 배출량 보정 (오르막: 증가, 내리막: 감소)
 * 
 * @param route - 경로 정보 (elevationData 포함)
 * @returns 경사 보정계수 (1.0 = 보정 없음, >1.0 = 증가, <1.0 = 감소)
 * 
 * 계산 방식:
 * - 경로의 고도 데이터를 분석하여 총 상승/하강 고도 계산
 * - 평균 경사도(%) = (총 상승 고도 / 총 거리) * 100
 * - 차종별 경사 보정계수 테이블을 사용하여 최종 보정계수 계산
 * 
 * 참고: 고도 데이터는 Open Elevation API를 통해 자동으로 수집됨
 */
const getSlopeFactor = (route: Route): number => {
  // 고도 데이터가 없으면 보정 없음
  if (!route.elevationData || route.elevationData.length < 2) {
    return 1.0;
  }

  const elevations = route.elevationData;
  let totalAscent = 0; // 총 상승 고도 (m)
  let totalDescent = 0; // 총 하강 고도 (m)
  
  // 연속된 고도 차이 계산
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) {
      totalAscent += diff;
    } else {
      totalDescent += Math.abs(diff);
    }
  }

  // 평균 경사도 계산 (상승률 + 하강률)
  const distanceM = route.distance * 1000; // km to m
  const avgAscentRate = distanceM > 0 ? (totalAscent / distanceM) * 100 : 0; // %
  const avgDescentRate = distanceM > 0 ? (totalDescent / distanceM) * 100 : 0; // %

  // 차종별 경사 보정계수 테이블
  const slopeFactorTable: Record<TransportMode, { ascent: number; descent: number }> = {
    car: { ascent: 0.15, descent: -0.08 }, // 오르막 1%당 15% 증가, 내리막 1%당 8% 감소
    electric_car: { ascent: 0.20, descent: -0.12 }, // 전기차는 오르막에서 더 많이 소비, 내리막에서 회생제동
    hybrid: { ascent: 0.18, descent: -0.10 },
    hydrogen: { ascent: 0.16, descent: -0.09 },
    motorcycle: { ascent: 0.12, descent: -0.06 }, // 경량화로 경사 영향 적음
    electric_motorcycle: { ascent: 0.18, descent: -0.11 },
    bus: { ascent: 0.25, descent: -0.10 }, // 대형 차량은 경사 영향 큼
    subway: { ascent: 0, descent: 0 }, // 지하철은 경사 영향 없음
    train: { ascent: 0, descent: 0 }, // 기차는 경사 영향 적음
    walking: { ascent: 0.30, descent: -0.15 }, // 도보는 경사 영향 큼
    bicycle: { ascent: 0.25, descent: -0.12 }, // 자전거는 경사 영향 큼
    vehicle: { ascent: 0.15, descent: -0.08 },
  };

  const factors = slopeFactorTable[route.transportMode] || slopeFactorTable.car;
  
  // 경사 보정계수 계산
  const ascentFactor = 1 + (avgAscentRate * factors.ascent);
  const descentFactor = 1 + (avgDescentRate * factors.descent);
  
  // 평균 보정계수 (상승과 하강의 평균)
  const slopeFactor = (ascentFactor + descentFactor) / 2;
  
  // 최소/최대 제한 (0.5 ~ 2.0)
  return Math.max(0.5, Math.min(2.0, slopeFactor));
};

// C2: 가감속 보정계수
const getAccelerationFactor = (route: Route): number => {
  const { distance, duration, transportMode } = route;

  if (transportMode === 'bus') {
    return 1.1; // 버스는 서울시내버스 평균 통행속도 기반 1.1 고정
  }
  if (transportMode === 'car' || transportMode === 'hybrid') {
    const hours = Math.max(0.001, duration / 60);
    const avgSpeed = distance / hours;
    // 평균 속도를 기준으로 혼잡도 추정 (간선도로 기준)
    if (avgSpeed > 70) return 1.05; // 원활
    if (avgSpeed > 30) return 1.10; // 서행
    return 1.15; // 정체
  }
  if (transportMode === 'motorcycle') {
    // 오토바이는 가감속이 더 빈번하지만, 경량화로 인해 영향이 상대적으로 작음
    const hours = Math.max(0.001, duration / 60);
    const avgSpeed = distance / hours;
    if (avgSpeed > 70) return 1.08; // 원활
    if (avgSpeed > 30) return 1.12; // 서행
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
  } else if (mode === 'subway') {
    if (isWeekend) {
        if (hour >= 11 && hour <= 19) passengerCount = 600;
        else passengerCount = 300;
    }
    else {
        if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) passengerCount = 1500; 
        else if (hour >= 9 && hour <= 21) passengerCount = 500;
        else passengerCount = 150;
    }
  } else if (mode === 'train') {
    // 기차는 장거리 이동이므로 탑승 인원이 더 많음
    if (isWeekend) {
        if (hour >= 10 && hour <= 18) passengerCount = 800;
        else passengerCount = 400;
    }
    else {
        if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) passengerCount = 1200; 
        else if (hour >= 9 && hour <= 21) passengerCount = 700;
        else passengerCount = 300;
    }
  }
  console.log(`[Debug] getEstimatedPassengerCount Mode: ${mode}, Hour: ${hour}, Count: ${passengerCount}`);
  return passengerCount;
};

// --- 전기차 관련 상수 ---
const EV_BASE_EFFICIENCY = 150; // Wh/km (전기차 평균 전력 소비율, 예: 테슬라 모델 3 기준 약 150 Wh/km)
const CHARGING_EFFICIENCY = 0.90; // 충전 효율 (90%, 충전 손실 고려)
const GRID_EMISSION_FACTOR = 478.1; // gCO2/kWh (한국 전력망 평균 탄소 배출 계수)

// --- 지하철 전용 계산 모델 ---
const ELECTRICITY_CO2_FACTOR = 478.1; // gCO2/kWh (GRID_EMISSION_FACTOR와 동일)
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

// 기차 전용 계산 모델
const calculateTrainEmission = (route: Route): CarbonEmission => {
  let totalDrivingEmission = 0;
  const passengerCount = Math.max(1, getEstimatedPassengerCount('train'));

  // 기차 전력 소비율 (kWh/km) - 지하철보다 약간 높음 (장거리 고속 운행)
  const TRAIN_ENERGY_RATE = 4.2; // kWh/km (기본값)

  if (route.segments) {
    for (const segment of route.segments) {
      if (segment.mode === 'train') {
        const segmentEmission = segment.distance * TRAIN_ENERGY_RATE * ELECTRICITY_CO2_FACTOR;
        totalDrivingEmission += segmentEmission;
      }
    }
  }

  if (totalDrivingEmission === 0) {
    totalDrivingEmission = CARBON_EMISSION_FACTORS.train * route.distance;
  }

  // 기차는 정차 시간이 길지만, 장거리 이동이므로 1인당 배출량이 매우 낮음
  const totalEmission = (totalDrivingEmission + STATION_FIXED_EMISSION) / passengerCount;
  const carComparable = CARBON_EMISSION_FACTORS.car * route.distance;
  const savedEmission = Math.max(0, carComparable - totalEmission);

  return {
    mode: 'train',
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
  const c1_slope = getSlopeFactor(route);
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
      // 하이브리드: 속도별 배출계수 테이블 사용 (전기 모드 비율이 속도에 따라 자동 반영됨)
      const table = SPEED_CO2_TABLE[transportMode];
      if (table) {
        let baseEmissionPerKm = CARBON_EMISSION_FACTORS[transportMode];
        // 속도 기반 배출계수 보정
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
      } else {
        // 테이블이 없을 경우 기존 로직 사용
        const EV_RATIO = 0.3; // 주행의 30%를 전기 모드로 가정
        const iceEmission = calculateVehicleEmission({ ...route, transportMode: 'car' }, isAcOn, temperature).totalEmission * (1 - EV_RATIO);
        const evEmission = calculateVehicleEmission({ ...route, transportMode: 'electric_car' }, isAcOn, temperature).totalEmission * EV_RATIO;
        totalEmission = iceEmission + evEmission;
      }
      break;
    }

    case 'hydrogen': {
      // 수소차: 그린수소/그레이수소 구분
      // 현재는 그레이수소 기준 (생산+운송 포함) 배출계수 사용
      // 그린수소: 약 5-10 gCO2/km, 그레이수소: 약 25-30 gCO2/km
      // 향후 그린수소 비율 증가 시 조정 필요
      const HYDROGEN_EMISSION_FACTOR = 25; // gCO2/km (그레이수소 기준, 생산+운송 포함)
      
      // 수소차는 전기차와 유사하게 효율적이지만, 수소 생산 과정의 배출량 포함
      // 속도에 따른 배출량 변화는 상대적으로 작음 (전기 모터 사용)
      const speedFactor = avgSpeed > 100 ? 1.05 : (avgSpeed > 60 ? 1.0 : 0.95);
      totalEmission = distance * HYDROGEN_EMISSION_FACTOR * speedFactor * getCarAcFactor(isAcOn);
      break;
    }

    case 'motorcycle': {
      // 오토바이: 속도별 배출계수 테이블 사용
      const table = SPEED_CO2_TABLE[transportMode];
      if (table) {
        let baseEmissionPerKm = CARBON_EMISSION_FACTORS[transportMode];
        // 속도 기반 배출계수 보정
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
        // 오토바이는 에어컨 없음, 기온 영향 적음
        const finalEmissionPerKm = baseEmissionPerKm * getSlopeFactor(route) * 1.1; // 가감속 보정만 적용
        totalEmission = finalEmissionPerKm * distance;
      } else {
        // 테이블이 없을 경우 기본값 사용
        totalEmission = distance * CARBON_EMISSION_FACTORS.motorcycle;
      }
      break;
    }

    case 'electric_motorcycle': {
      // 전기 오토바이: 전력 소비율 (Wh/km)
      const E_MOTORCYCLE_EFFICIENCY = 70; // Wh/km (전기차의 약 절반 수준, 경량화)
      
      // 속도에 따른 효율 변화 (저속에서 더 효율적)
      let speedEfficiencyFactor = 1.0;
      if (avgSpeed > 80) speedEfficiencyFactor = 1.15; // 고속에서 효율 저하
      else if (avgSpeed > 50) speedEfficiencyFactor = 1.05;
      else if (avgSpeed < 20) speedEfficiencyFactor = 0.95; // 저속에서 효율 향상
      
      const basePowerConsumption = distance * (E_MOTORCYCLE_EFFICIENCY / 1000) * speedEfficiencyFactor;
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
        case 'train':
          totalEmission += calculateTrainEmission(segmentRoute).totalEmission;
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
    case 'train':
      return calculateTrainEmission(route);
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
    walking: { name: t('transportModes.walking'), icon: '🚶', color: '#4CAF50' },
    bicycle: { name: t('transportModes.bicycle'), icon: '🚲', color: '#8BC34A' },
    bus: { name: t('transportModes.bus'), icon: '🚌', color: '#FF9800' },
    subway: { name: t('transportModes.subway'), icon: '🚇', color: '#2196F3' },
    train: { name: t('transportModes.train'), icon: '🚄', color: '#9C27B0' },
    car: { name: t('transportModes.car'), icon: '🚗', color: '#F44336' },
    electric_car: { name: t('transportModes.electric_car'), icon: '🔋', color: '#9C27B0' },
    hybrid: { name: t('transportModes.hybrid'), icon: '🌱', color: '#4DB6AC' },
    hydrogen: { name: t('transportModes.hydrogen'), icon: '💧', color: '#B2EBF2' },
    motorcycle: { name: t('transportModes.motorcycle'), icon: '🏍️', color: '#795548' },
    electric_motorcycle: { name: t('transportModes.electric_motorcycle'), icon: '⚡️', color: '#FFC107' },
    vehicle: { name: t('transportModes.vehicle'), icon: '🚗', color: '#F44336' },
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