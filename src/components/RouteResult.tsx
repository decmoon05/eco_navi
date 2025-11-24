import React from 'react';
import styled from 'styled-components';
import { Route, CarbonEmission, Bonus, RouteSegment } from '../types';
import { 
  calculateTrafficAdjustedEmission, 
  calculateBonus, 
  getTransportModeInfo,
  formatEmission,
  formatDistance,
  formatDuration
} from '../utils/carbonCalculator';

interface RouteResultProps {
  route: Route;
  isAcOn: boolean;
}

const ResultContainer = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
`;

const ResultTitle = styled.h2`
  color: #333;
  margin-bottom: 20px;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const RouteInfo = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
`;

const InfoCard = styled.div`
  padding: 15px;
  border-radius: 8px;
  background: #f8f9fa;
  border-left: 4px solid #2196F3;
`;

const InfoLabel = styled.div`
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
  text-transform: uppercase;
  font-weight: 600;
`;

const InfoValue = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #333;
`;

const CarbonSection = styled.div`
  background: linear-gradient(135deg, #4CAF50, #8BC34A);
  color: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
`;

const CarbonTitle = styled.h3`
  margin-bottom: 15px;
  font-size: 1.2rem;
`;

const CarbonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
`;

const CarbonCard = styled.div`
  text-align: center;
  padding: 15px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
`;

const CarbonValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 5px;
`;

const CarbonLabel = styled.div`
  font-size: 12px;
  opacity: 0.9;
`;

const BonusSection = styled.div`
  background: linear-gradient(135deg, #FF9800, #FFC107);
  color: white;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
`;

const BonusTitle = styled.h3`
  margin-bottom: 10px;
  font-size: 1.2rem;
`;

const BonusPoints = styled.div`
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 10px;
`;

const BonusDescription = styled.div`
  font-size: 14px;
  opacity: 0.9;
`;

const SegmentsContainer = styled.div`
  margin-top: 20px;
  border-top: 1px solid #eee;
  padding-top: 20px;
`;

const SegmentsTitle = styled.h3`
  font-size: 1.2rem;
  color: #333;
  margin-bottom: 15px;
`;

const SegmentList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const SegmentItem = styled.li`
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
`;

const SegmentIcon = styled.span`
  font-size: 24px;
  margin-right: 15px;
`;

const SegmentInfo = styled.div`
  flex-grow: 1;
`;

const SegmentMode = styled.div`
  font-weight: 600;
`;

const SegmentDetail = styled.div`
  font-size: 14px;
  color: #666;
`;

const RouteResult: React.FC<RouteResultProps> = ({ route, isAcOn }) => {
  const carbonEmission = calculateTrafficAdjustedEmission(route, isAcOn);
  const bonusPoints = calculateBonus(route);
  const transportInfo = getTransportModeInfo(route.transportMode);

  const bonus: Bonus = {
    points: bonusPoints,
    description: `${route.tags?.includes('대중교통') ? '대중교통' : transportInfo.name}으로 이동하여 ${formatEmission(carbonEmission.savedEmission)}의 탄소를 절약했습니다!`,
    icon: transportInfo.icon,
  };

  return (
    <ResultContainer>
      <ResultTitle>
        <span>{transportInfo.icon}</span>
        경로 결과
      </ResultTitle>

      <RouteInfo>
        <InfoCard>
          <InfoLabel>이동 수단</InfoLabel>
          <InfoValue>{route.tags?.includes('대중교통') ? '대중교통' : transportInfo.name}</InfoValue>
        </InfoCard>
        <InfoCard>
          <InfoLabel>거리</InfoLabel>
          <InfoValue>{formatDistance(route.distance)}</InfoValue>
        </InfoCard>
        <InfoCard>
          <InfoLabel>소요 시간</InfoLabel>
          <InfoValue>{formatDuration(route.duration)}</InfoValue>
        </InfoCard>
      </RouteInfo>

      {route.segments && route.segments.length > 0 && (
        <SegmentsContainer>
          <SegmentsTitle>상세 경로</SegmentsTitle>
          <SegmentList>
            {route.segments.map((segment, index) => {
              const segmentTransportInfo = getTransportModeInfo(segment.mode);
              return (
                <SegmentItem key={index}>
                  <SegmentIcon>{segmentTransportInfo.icon}</SegmentIcon>
                  <SegmentInfo>
                    <SegmentMode>{segment.name ? `${segmentTransportInfo.name} (${segment.name})` : segmentTransportInfo.name}</SegmentMode>
                    <SegmentDetail>
                      {formatDuration(segment.duration)} | {formatDistance(segment.distance)}
                    </SegmentDetail>
                  </SegmentInfo>
                </SegmentItem>
              );
            })}
          </SegmentList>
        </SegmentsContainer>
      )}

      <CarbonSection>
        <CarbonTitle>🌱 탄소 배출량 분석</CarbonTitle>
        <CarbonGrid>
          <CarbonCard>
            <CarbonValue>{formatEmission(carbonEmission.totalEmission)}</CarbonValue>
            <CarbonLabel>총 탄소 배출량</CarbonLabel>
          </CarbonCard>
          <CarbonCard>
            <CarbonValue>{formatEmission(carbonEmission.emissionPerKm)}/km</CarbonValue>
            <CarbonLabel>km당 배출량</CarbonLabel>
          </CarbonCard>
          <CarbonCard>
            <CarbonValue>{formatEmission(carbonEmission.savedEmission)}</CarbonValue>
            <CarbonLabel>절약된 탄소량</CarbonLabel>
          </CarbonCard>
        </CarbonGrid>
      </CarbonSection>

      <BonusSection>
        <BonusTitle>🎁 친환경 보너스</BonusTitle>
        <BonusPoints>+{bonus.points} 포인트</BonusPoints>
        <BonusDescription>{bonus.description}</BonusDescription>
      </BonusSection>
    </ResultContainer>
  );
};

export default RouteResult;