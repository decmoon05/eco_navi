import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { getQuestsAPI, claimQuestRewardAPI } from '../services/api';

// --- Styled Components ---
const QuestContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h1`
  text-align: center;
  color: white;
  margin-bottom: 30px;
`;

const QuestList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const QuestCard = styled.div<{ status: string }>`
  background: white;
  color: #333;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  opacity: ${props => props.status === 'rewarded' ? 0.5 : 1};
`;

const QuestHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const QuestName = styled.h3`
  margin: 0;
`;

const QuestBonus = styled.span`
  font-weight: 700;
  color: #FFC107;
`;

const QuestDesc = styled.p`
  font-size: 14px;
  color: #666;
  margin: 0 0 15px 0;
`;

const QuestProgressContainer = styled.div``;

const ProgressBar = styled.div`
  width: 100%;
  height: 10px;
  background-color: #e0e0e0;
  border-radius: 5px;
  overflow: hidden;
`;

const Progress = styled.div<{ percentage: number }>`
  width: ${props => props.percentage}%;
  height: 100%;
  background-color: #2196F3;
`;

const ProgressLabel = styled.div`
  font-size: 12px;
  text-align: right;
  margin-top: 5px;
`;

const RewardButton = styled.button`
  width: 100%;
  padding: 10px;
  margin-top: 15px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

// --- Component ---
interface Quest {
  id: string;
  name: string;
  description: string;
  bonus: number;
  target: number;
  type: string;
  progress: number;
  status: string;
}

const QuestPage: React.FC = () => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuests = async () => {
    try {
      setLoading(true);
      const response = await getQuestsAPI();
      setQuests(response.data);
    } catch (error) {
      console.error("Failed to fetch quests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuests();
  }, []);

  const handleReward = async (questId: string) => {
    try {
      const response = await claimQuestRewardAPI(questId);
      alert(response.data.message);
      fetchQuests(); // 퀘스트 목록 새로고침
    } catch (error: any) {
      alert(error.response?.data?.message || '보상 수령 중 오류 발생');
    }
  };

  if (loading) {
    return <p style={{ color: 'white', textAlign: 'center' }}>퀘스트 목록을 불러오는 중...</p>;
  }

  return (
    <QuestContainer>
      <Title>오늘의 퀘스트</Title>
      <QuestList>
        {quests.map(quest => (
          <QuestCard key={quest.id} status={quest.status}>
            <QuestHeader>
              <QuestName>{quest.name}</QuestName>
              <QuestBonus>+{quest.bonus} P</QuestBonus>
            </QuestHeader>
            <QuestDesc>{quest.description}</QuestDesc>
            <QuestProgressContainer>
              <ProgressBar>
                <Progress percentage={Math.min(100, (quest.progress / quest.target) * 100)} />
              </ProgressBar>
              <ProgressLabel>{quest.progress} / {quest.target}</ProgressLabel>
            </QuestProgressContainer>
            {quest.status === 'completed' && (
              <RewardButton onClick={() => handleReward(quest.id)}>보상 받기</RewardButton>
            )}
          </QuestCard>
        ))}
      </QuestList>
    </QuestContainer>
  );
};

export default QuestPage;
