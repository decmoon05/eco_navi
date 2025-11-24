import React from 'react';
import styled from 'styled-components';
import { Route } from '../types';
import { getTransportModeInfo, formatDuration, formatDistance } from '../utils/carbonCalculator';

interface AlternativeRoutesProps {
  routes: Route[];
  currentRoute: Route;
  onSelect: (route: Route) => void;
}

const Container = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h3`
  color: #333;
  margin-bottom: 20px;
  font-size: 1.3rem;
`;

const RoutesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
`;

const RouteCard = styled.div<{ isCurrent: boolean }>`
  padding: 15px;
  border-radius: 8px;
  border: 2px solid ${props => props.isCurrent ? '#2196F3' : '#e0e0e0'};
  background: ${props => props.isCurrent ? '#f0f8ff' : '#f8f9fa'};
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    border-color: #2196F3;
    background: #f0f8ff;
  }
`;

const RouteHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const TransportInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #333;
`;

const TransportIcon = styled.span`
  font-size: 20px;
`;

const CurrentBadge = styled.span`
  background: #2196F3;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
`;

const RouteDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
`;

const DetailItem = styled.div`
  text-align: center;
`;

const DetailLabel = styled.div`
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
`;

const DetailValue = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #333;
`;

const AlternativeRoutes: React.FC<AlternativeRoutesProps> = ({ routes, currentRoute, onSelect }) => {
  return (
    <Container>
      <Title>🚌 대중교통 대안 경로</Title>
      <RoutesGrid>
        {routes.map((route, index) => {
          const transportInfo = getTransportModeInfo(route.transportMode);
          const isCurrent = route === currentRoute;
          const transfers = route.segments ? route.segments.filter(s => s.mode === 'bus' || s.mode === 'subway').length - 1 : 0;
          const totalWalk = route.segments ? route.segments.filter(s => s.mode === 'walking').reduce((sum, s) => sum + s.duration, 0) : 0;

          return (
            <RouteCard key={index} isCurrent={isCurrent} onClick={() => onSelect(route)}>
              <RouteHeader>
                <TransportInfo>
                  <TransportIcon>{transportInfo.icon}</TransportIcon>
                  <span>{route.label || `대안 ${index + 1}`}</span>
                </TransportInfo>
                {isCurrent && <CurrentBadge>현재 선택</CurrentBadge>}
              </RouteHeader>

              <RouteDetails>
                <DetailItem>
                  <DetailLabel>총 시간</DetailLabel>
                  <DetailValue>{formatDuration(route.duration)}</DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>총 도보</DetailLabel>
                  <DetailValue>{formatDuration(totalWalk)}</DetailValue>
                </DetailItem>
                <DetailItem>
                  <DetailLabel>환승</DetailLabel>
                  <DetailValue>{transfers > 0 ? `${transfers}회` : '-'}</DetailValue>
                </DetailItem>
              </RouteDetails>
            </RouteCard>
          );
        })}
      </RoutesGrid>
    </Container>
  );
};

export default AlternativeRoutes;