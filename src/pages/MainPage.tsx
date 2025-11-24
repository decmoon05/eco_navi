import React, { useState, useMemo, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import RouteForm from '../components/RouteForm';
import Map from '../components/Map';
import RouteResult from '../components/RouteResult';
import AlternativeRoutes from '../components/AlternativeRoutes';
import ModeComparison from '../components/ModeComparison';
import { Location, Route, TransportMode } from '../types';
import { resolveBestLocations, tmapRoute } from '../services/tmap';
import { saveTripAPI } from '../services/api';
import { calculateTrafficAdjustedEmission } from '../utils/carbonCalculator';

const MainLayout = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const MainPage: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickedOrigin, setPickedOrigin] = useState<Location | null>(null);
  const [pickedDestination, setPickedDestination] = useState<Location | null>(null);
  const [isAcOn, setIsAcOn] = useState(false);
  const [temperature, setTemperature] = useState(20); // 날씨 API 연동 전 임시 값

  const [routesByMode, setRoutesByMode] = useState<Partial<Record<TransportMode, Route[]>>>({});
  const [currentAlternatives, setCurrentAlternatives] = useState<Route[]>([]);

  useEffect(() => {
    const save = async () => {
      if (currentRoute) {
        try {
          const emission = calculateTrafficAdjustedEmission(currentRoute, isAcOn, temperature);
          const response = await saveTripAPI(currentRoute, emission);
          console.log('활동 기록이 서버에 저장되었습니다.');

          // 새로 달성한 업적이 있으면 알림 표시
          if (response.data.newlyAchieved && response.data.newlyAchieved.length > 0) {
            response.data.newlyAchieved.forEach((ach: any) => {
              alert(`축하합니다! "${ach.name}" 업적을 달성했습니다! (+${ach.bonus}P)`);
            });
          }

        } catch (error) {
          console.error('활동 기록 저장 중 오류 발생:', error);
        }
      }
    };
    save();
  }, [currentRoute, isAcOn, temperature]);

  const handleRouteSubmit = async (originInput: Location, destinationInput: Location, mode: TransportMode, isAcOn: boolean) => {
    setLoading(true);
    setError(null);
    setCurrentRoute(null);
    setCurrentAlternatives([]);
    setRoutesByMode({});

    try {
      let origin = originInput;
      let destination = destinationInput;

      if (process.env.REACT_APP_TMAP_APP_KEY && originInput.name && destinationInput.name) {
        const resolved = await resolveBestLocations(originInput.name, destinationInput.name);
        if (resolved) { 
          origin = resolved.origin; 
          destination = resolved.destination; 
        }
      }

      const mainRoutes = await tmapRoute(origin, destination, mode);

      if ((mode === 'bus' || mode === 'subway') && (!mainRoutes || mainRoutes.length === 0 || !mainRoutes[0].segments || mainRoutes[0].segments.length === 0)) {
        throw new Error('해당 구간의 대중교통 정보가 없습니다. 시내 대중교통만 이용 가능합니다.');
      }

      setCurrentRoute(mainRoutes[0] || null);
      setCurrentAlternatives(mainRoutes);
      setRoutesByMode({ [mode]: mainRoutes });

    } catch (e: any) {
      setError(e?.message || '경로 계산 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAlternative = (route: Route) => {
    setCurrentRoute(route);
  };
  
  const originForMap = currentRoute?.origin || pickedOrigin;
  const destinationForMap = currentRoute?.destination || pickedDestination;

  const handleFetchMode = useCallback(async (mode: TransportMode) => {
    if (!originForMap || !destinationForMap || routesByMode[mode]) return;

    try {
      const routes = await tmapRoute(originForMap, destinationForMap, mode);
      setRoutesByMode(prev => ({ ...prev, [mode]: routes }));
    } catch (e) {
      console.error(`Failed to fetch route for mode ${mode}:`, e);
      setRoutesByMode(prev => ({ ...prev, [mode]: [] }));
    }
  }, [originForMap, destinationForMap, routesByMode]);

  const comparisonRoutes = useMemo(() => {
    const result: Partial<Record<TransportMode, Route>> = {};
    for (const mode in routesByMode) {
      const routeArray = routesByMode[mode as TransportMode];
      if (routeArray && routeArray.length > 0) {
        result[mode as TransportMode] = routeArray[0];
      }
    }
    return result;
  }, [routesByMode]);

  return (
    <MainLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <RouteForm 
          onRouteSubmit={handleRouteSubmit}
          onPickOrigin={(loc) => setPickedOrigin(loc)}
          onPickDestination={(loc) => setPickedDestination(loc)}
          isAcOn={isAcOn}
          onAcChange={setIsAcOn}
        />
        {originForMap && destinationForMap && (
          <ModeComparison 
            origin={originForMap} 
            destination={destinationForMap} 
            routesByMode={comparisonRoutes} 
            onFetchMode={handleFetchMode}
            isAcOn={isAcOn}
          />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Map 
          origin={originForMap}
          destination={destinationForMap}
          route={currentRoute}
          alternatives={currentAlternatives.filter(r => r !== currentRoute)}
          isAcOn={isAcOn}
        />
        {currentRoute && (
          <>
            <RouteResult route={currentRoute} isAcOn={isAcOn} />
            {currentAlternatives.length > 1 && (
              <AlternativeRoutes 
                routes={currentAlternatives}
                onSelect={handleSelectAlternative}
                currentRoute={currentRoute}
              />
            )}
          </>
        )}
        {loading && <div style={{ color: '#fff', textAlign: 'center', padding: 20 }}>경로를 계산 중...</div>}
        {error && <div style={{ color: '#ffeb3b', textAlign: 'center', padding: 20 }}>{error}</div>}
      </div>
    </MainLayout>
  );
};

export default MainPage;