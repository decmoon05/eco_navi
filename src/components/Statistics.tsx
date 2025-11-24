import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { HistoryEntry } from '../utils/historyManager';
import { formatEmission, formatDistance, getTransportModeInfo } from '../utils/carbonCalculator';

interface StatisticsProps {
  history: HistoryEntry[];
}

const StatisticsContainer = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
`;

const Title = styled.h3`
  color: #333;
  margin-bottom: 20px;
  font-size: 1.3rem;
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
`;

const StatCard = styled.div`
  background: #f9f9f9;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
  border: 1px solid #eee;
  transition: all 0.2s ease-in-out;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.05);
  }
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #333;
  margin-bottom: 5px;
`;

const StatLabel = styled.div`
  font-size: 12px;
  color: #666;
`;

const Statistics: React.FC<StatisticsProps> = ({ history }) => {
  const { totalSavedCarbon, totalEcoDistance, mostUsedEcoMode } = useMemo(() => {
    let savedCarbon = 0;
    let ecoDistance = 0;
    const modeCounts: { [key: string]: number } = {};

    history.forEach(entry => {
      // 서버에서 받은 데이터는 emission 객체가 아니라 saved_emission 필드를 직접 가질 수 있음
      const savedEmission = entry.emission?.savedEmission ?? (entry as any).saved_emission ?? 0;
      const transportMode = entry.route?.transportMode ?? (entry as any).transport_mode;
      const distance = entry.route?.distance ?? (entry as any).distance ?? 0;

      savedCarbon += savedEmission;

      if (['walking', 'bicycle', 'bus', 'subway'].includes(transportMode)) {
        ecoDistance += distance;
        modeCounts[transportMode] = (modeCounts[transportMode] || 0) + 1;
      }
    });

    let mostUsed = '없음';
    let maxCount = 0;
    for (const mode in modeCounts) {
      if (modeCounts[mode] > maxCount) {
        maxCount = modeCounts[mode];
        mostUsed = getTransportModeInfo(mode as any).name;
      }
    }

    return {
      totalSavedCarbon: savedCarbon,
      totalEcoDistance: ecoDistance,
      mostUsedEcoMode: mostUsed,
    };
  }, [history]);

  return (
    <StatisticsContainer>
      <Title>나의 친환경 활동 통계</Title>
      <StatGrid>
        <StatCard>
          <StatValue>{formatEmission(totalSavedCarbon)}</StatValue>
          <StatLabel>총 절약한 탄소량</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{formatDistance(totalEcoDistance)}</StatValue>
          <StatLabel>총 친환경 이동 거리</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{mostUsedEcoMode}</StatValue>
          <StatLabel>가장 많이 이용한 수단</StatLabel>
        </StatCard>
      </StatGrid>
    </StatisticsContainer>
  );
};

export default Statistics;
