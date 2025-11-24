import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { getRankingAPI } from '../services/api';
import { formatEmission } from '../utils/carbonCalculator';

const RankingContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  color: #333;
`;

const Title = styled.h1`
  text-align: center;
  color: white;
  margin-bottom: 30px;
`;

const RankingList = styled.ol`
  list-style: none;
  padding: 0;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
`;

const RankingItem = styled.li<{ rank: number }>`
  display: flex;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }

  background: ${props => props.rank === 1 ? '#fffbe6' : (props.rank === 2 ? '#f0f8ff' : (props.rank === 3 ? '#fff0e6' : 'white'))};
`;

const Rank = styled.span`
  font-size: 1.5rem;
  font-weight: 700;
  width: 50px;
  text-align: center;
  color: ${props => props.color || '#333'};
`;

const Username = styled.span`
  font-weight: 600;
  flex-grow: 1;
`;

const SavedEmission = styled.span`
  font-weight: 700;
  color: #4CAF50;
`;

interface RankingData {
  username: string;
  total_saved_emission: number;
}

const RankingPage: React.FC = () => {
  const [ranking, setRanking] = useState<RankingData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        setLoading(true);
        const response = await getRankingAPI();
        setRanking(response.data);
      } catch (error) {
        console.error("Failed to fetch ranking:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRanking();
  }, []);

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return '#333';
  };

  if (loading) {
    return <p style={{ color: 'white', textAlign: 'center' }}>랭킹을 불러오는 중...</p>;
  }

  return (
    <RankingContainer>
      <Title>🏆 명예의 전당</Title>
      <RankingList>
        {ranking.map((item, index) => (
          <RankingItem key={index} rank={index + 1}>
            <Rank color={getRankColor(index + 1)}>{index + 1}</Rank>
            <Username>{item.username}</Username>
            <SavedEmission>{formatEmission(item.total_saved_emission)} 절약</SavedEmission>
          </RankingItem>
        ))}
        {ranking.length === 0 && <p style={{ textAlign: 'center', padding: '20px' }}>아직 랭킹 데이터가 없습니다.</p>}
      </RankingList>
    </RankingContainer>
  );
};

export default RankingPage;
