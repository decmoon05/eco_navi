import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import Statistics from '../components/Statistics';
import History from '../components/History';
import { getTripsAPI, getMeAPI, setGoalAPI, getAchievementsAPI } from '../services/api';
import { HistoryEntry } from '../utils/historyManager';
import { formatEmission } from '../utils/carbonCalculator';

// --- Styled Components ---
const MyPageContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const LoadingText = styled.p`
  text-align: center;
  font-size: 1.2rem;
`;

const WalletContainer = styled.div`
  background: linear-gradient(135deg, #FF9800, #FFC107);
  color: white;
  padding: 25px;
  border-radius: 12px;
  text-align: center;
`;

const WalletTitle = styled.h2`
  margin: 0 0 10px 0;
  font-size: 1.5rem;
`;

const PointValue = styled.div`
  font-size: 3rem;
  font-weight: 700;
`;

const GoalContainer = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  color: #333;
`;

const GoalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
`;

const GoalTitle = styled.h3`
  margin: 0;
`;

const GoalProgressBar = styled.div`
  width: 100%;
  height: 20px;
  background-color: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
`;

const GoalProgress = styled.div<{ percentage: number }>`
  width: ${props => props.percentage}%;
  height: 100%;
  background-color: #4CAF50;
  transition: width 0.5s ease-in-out;
`;

const GoalStatus = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-top: 5px;
`;

const GoalInputContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 15px;
`;

const GoalInput = styled.input`
  flex-grow: 1;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const GoalButton = styled.button`
  padding: 8px 12px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
`;

const AchievementsContainer = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  color: #333;
`;

const AchievementGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 15px;
`;

const AchievementBadge = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const BadgeIcon = styled.div`
  font-size: 48px;
  filter: grayscale(0.5);
`;

const BadgeName = styled.div`
  font-size: 12px;
  font-weight: 600;
  margin-top: 5px;
`;

// --- Interfaces ---
interface User {
  id: number;
  username: string;
  points: number;
  monthly_goal: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  bonus: number;
  date: string;
}

// --- Component ---
const MyPage: React.FC = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGoal, setNewGoal] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tripsResponse, meResponse, achievementsResponse] = await Promise.all([
          getTripsAPI(),
          getMeAPI(),
          getAchievementsAPI(),
        ]);
        setHistory(tripsResponse.data);
        setUser(meResponse.data);
        setAchievements(achievementsResponse.data);
        setNewGoal(String(meResponse.data.monthly_goal / 1000)); // g to kg
      } catch (error) {
        console.error("Failed to fetch page data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const monthlySaved = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return history.reduce((total, entry) => {
      const entryDate = new Date(entry.date);
      if (entryDate.getFullYear() === currentYear && entryDate.getMonth() === currentMonth) {
        const savedEmission = (entry as any).saved_emission ?? 0;
        return total + savedEmission;
      }
      return total;
    }, 0);
  }, [history]);

  const handleSetGoal = async () => {
    const goalInGrams = Number(newGoal) * 1000;
    if (isNaN(goalInGrams) || goalInGrams < 0) {
      alert('올바른 목표 값을 입력하세요 (kg 단위).');
      return;
    }
    try {
      await setGoalAPI(goalInGrams);
      setUser(prev => prev ? { ...prev, monthly_goal: goalInGrams } : null);
      alert('목표가 성공적으로 설정되었습니다.');
    } catch (error) {
      alert('목표 설정 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return <LoadingText>데이터를 불러오는 중...</LoadingText>;
  }

  const goalPercentage = user ? Math.min(100, (monthlySaved / user.monthly_goal) * 100) : 0;

  return (
    <MyPageContainer>
      {user && (
        <WalletContainer>
          <WalletTitle>ECO 지갑</WalletTitle>
          <PointValue>{user.points.toLocaleString()} P</PointValue>
        </WalletContainer>
      )}

      {user && (
        <GoalContainer>
          <GoalHeader>
            <GoalTitle>이달의 목표</GoalTitle>
            <span>{goalPercentage.toFixed(1)}% 달성</span>
          </GoalHeader>
          <GoalProgressBar>
            <GoalProgress percentage={goalPercentage} />
          </GoalProgressBar>
          <GoalStatus>
            <span>{formatEmission(monthlySaved)}</span>
            <span>목표: {formatEmission(user.monthly_goal)}</span>
          </GoalStatus>
          <GoalInputContainer>
            <GoalInput 
              type="number"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              placeholder="목표 (kg)"
            />
            <GoalButton onClick={handleSetGoal}>목표 설정</GoalButton>
          </GoalInputContainer>
        </GoalContainer>
      )}

      <AchievementsContainer>
        <GoalTitle>나의 업적</GoalTitle>
        <AchievementGrid>
          {achievements.map(ach => (
            <AchievementBadge key={ach.id} title={`${ach.description} (+${ach.bonus}P)`}>
              <BadgeIcon>🏆</BadgeIcon>
              <BadgeName>{ach.name}</BadgeName>
            </AchievementBadge>
          ))}
          {achievements.length === 0 && <p>아직 달성한 업적이 없습니다.</p>}
        </AchievementGrid>
      </AchievementsContainer>

      <Statistics history={history} />
      <History history={history} />
    </MyPageContainer>
  );
};

export default MyPage;