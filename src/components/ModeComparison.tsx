import React, { useMemo } from 'react';
import styled from 'styled-components';
import { Location, Route, TransportMode } from '../types';
import { calculateTrafficAdjustedEmission, formatDistance, formatDuration, formatEmission, getTransportModeInfo } from '../utils/carbonCalculator';

interface Props {
  origin: Location;
  destination: Location;
  routesByMode: Partial<Record<TransportMode, Route>>;
  onFetchMode: (mode: TransportMode) => void;
  isAcOn: boolean;
}

const Container = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 15px;
`;

const Card = styled.div<{ best?: boolean; clickable?: boolean }>`
  background: #f9f9f9;
  padding: 20px;
  border-radius: 10px;
  border: 1px solid ${p => p.best ? '#764ba2' : '#eee'};
  cursor: ${p => p.clickable ? 'pointer' : 'default'};
  transition: all 0.2s ease-in-out;

  &:hover {
    transform: ${p => p.clickable ? 'translateY(-3px)' : 'none'};
    box-shadow: ${p => p.clickable ? '0 4px 8px rgba(0,0,0,0.05)' : 'none'};
  }
`;

const Title = styled.div`
  display: flex; align-items: center; gap: 8px; font-weight: 700; margin-bottom: 6px;
`;

const Row = styled.div`
  display: flex; justify-content: space-between; color: #333; font-size: 14px; margin: 2px 0;
`;

const Badge = styled.span`
  background: #4CAF50; color: white; padding: 2px 8px; border-radius: 10px; font-size: 12px; margin-left: 6px;
`;

const Placeholder = styled.div`
  text-align: center;
  color: #888;
  font-size: 14px;
  padding: 20px 0;
`;

const ModeComparison: React.FC<Props> = ({ origin, destination, routesByMode, onFetchMode, isAcOn }) => {
  const scored = useMemo(() => {
    const entries: Array<{ mode: TransportMode; route: Route; score: number; carbon: number; }> = [];
    for (const mode in routesByMode) {
      const route = routesByMode[mode as TransportMode];
      if (!route) continue;
      const carbon = calculateTrafficAdjustedEmission(route, isAcOn).totalEmission;
      const score = 0.7 * route.duration + 0.3 * (carbon / 100.0);
      entries.push({ mode: mode as TransportMode, route, score, carbon });
    }
    entries.sort((a,b) => a.score - b.score);
    return entries;
  }, [routesByMode, isAcOn]);

  const bestMode = scored[0]?.mode;
  const allModes: TransportMode[] = ['walking','bicycle','bus','subway','car','electric_car'];

  return (
    <Container>
      <h3 style={{ marginBottom: 10, color: '#333' }}>이동수단 비교</h3>
      <Grid>
        {allModes.map(mode => {
          const route = routesByMode[mode];
          const info = getTransportModeInfo(mode);
          const carbon = route ? calculateTrafficAdjustedEmission(route, isAcOn).totalEmission : 0;

          if (route) {
            return (
              <Card key={mode} best={bestMode === mode}>
                <Title>
                  <span style={{ fontSize: 18 }}>{info.icon}</span>
                  <span>{info.name}</span>
                  {bestMode === mode && <Badge>추천</Badge>}
                </Title>
                <Row>
                  <span>거리</span>
                  <span>{formatDistance(route.distance)}</span>
                </Row>
                <Row>
                  <span>시간</span>
                  <span>{formatDuration(route.duration)}</span>
                </Row>
                <Row>
                  <span>탄소</span>
                  <span>{formatEmission(carbon)}</span>
                </Row>
              </Card>
            );
          } else {
            return (
              <Card key={mode} clickable onClick={() => onFetchMode(mode)}>
                <Title>
                  <span style={{ fontSize: 18 }}>{info.icon}</span>
                  <span>{info.name}</span>
                </Title>
                <Placeholder>클릭해서 경로 확인</Placeholder>
              </Card>
            );
          }
        })}
      </Grid>
    </Container>
  );
};

export default ModeComparison;