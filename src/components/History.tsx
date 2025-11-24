import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { HistoryEntry } from '../utils/historyManager';
import { formatEmission, getTransportModeInfo } from '../utils/carbonCalculator';

interface HistoryProps {
  history: HistoryEntry[];
}

const HistoryContainer = styled.div`
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

const HistoryList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 300px;
  overflow-y: auto;
`;

const HistoryItem = styled.li`
  padding: 15px 10px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:last-child {
    border-bottom: none;
  }
`;

const RouteInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const RoutePath = styled.span`
  font-weight: 600;
  color: #333;
  margin-bottom: 5px;
`;

const RouteMeta = styled.span`
  font-size: 12px;
  color: #666;
`;

const SavedEmission = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: #4CAF50;
`;

const NoHistory = styled.div`
  text-align: center;
  color: #888;
  padding: 20px;
`;

const History: React.FC<HistoryProps> = ({ history }) => {
  if (history.length === 0) {
    return (
      <HistoryContainer>
        <Title>최근 경로 기록</Title>
        <NoHistory>아직 경로 기록이 없습니다.</NoHistory>
      </HistoryContainer>
    );
  }

  return (
    <HistoryContainer>
      <Title>최근 경로 기록</Title>
      <HistoryList>
        {history.map((entry) => {
          // 서버에서 받은 데이터는 transport_mode, origin_name 등으로 스네이크 케이스일 수 있음
          const transportMode = entry.route?.transportMode ?? (entry as any).transport_mode;
          const originName = entry.originName ?? (entry as any).origin_name;
          const destinationName = entry.destinationName ?? (entry as any).destination_name;
          const savedEmission = entry.emission?.savedEmission ?? (entry as any).saved_emission ?? 0;

          const transportInfo = getTransportModeInfo(transportMode);
          return (
            <HistoryItem key={entry.id}>
              <RouteInfo>
                <RoutePath>
                  {transportInfo.icon} {originName} → {destinationName}
                </RoutePath>
                <RouteMeta>
                  {new Date(entry.date).toLocaleDateString('ko-KR')}
                </RouteMeta>
              </RouteInfo>
              <SavedEmission>
                {formatEmission(savedEmission)} 절약
              </SavedEmission>
            </HistoryItem>
          );
        })}
      </HistoryList>
    </HistoryContainer>
  );
};

export default History;
