import React from 'react';
import styled from 'styled-components';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import MainPage from './pages/MainPage';
import AuthPage from './pages/AuthPage';
import MyPage from './pages/MyPage';
import RankingPage from './pages/RankingPage';
import StorePage from './pages/StorePage';
import ReportPage from './pages/ReportPage';
import QuestPage from './pages/QuestPage';

const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  color: white;
`;

const Header = styled.header`
  max-width: 1200px;
  margin: 0 auto 30px auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const AppTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
`;

const Nav = styled.nav`
  display: flex;
  gap: 20px;
`;

const StyledLink = styled(Link)`
  color: white;
  text-decoration: none;
  font-size: 1rem;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;

const LogoutButton = styled.button`
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
`;

// 로그인한 사용자만 접근 가능한 라우트
const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/" />;
};

function App() {
  const { user, logout } = useAuth();

  return (
    <Router>
      <AppContainer>
        <Header>
          <AppTitle>🌱 EcoNavi</AppTitle>
          {user && (
            <Nav>
              <StyledLink to="/main">메인</StyledLink>
              <StyledLink to="/mypage">마이페이지</StyledLink>
              <StyledLink to="/ranking">랭킹</StyledLink>
              <StyledLink to="/store">상점</StyledLink>
              <StyledLink to="/report">월간 리포트</StyledLink>
              <StyledLink to="/quests">퀘스트</StyledLink>
              <LogoutButton onClick={logout}>로그아웃</LogoutButton>
            </Nav>
          )}
        </Header>

        <Routes>
          <Route path="/" element={user ? <Navigate to="/main" /> : <AuthPage />} />
          <Route 
            path="/main" 
            element={<PrivateRoute><MainPage /></PrivateRoute>} 
          />
          <Route 
            path="/mypage" 
            element={<PrivateRoute><MyPage /></PrivateRoute>} 
          />
          <Route 
            path="/ranking" 
            element={<PrivateRoute><RankingPage /></PrivateRoute>} 
          />
          <Route 
            path="/store" 
            element={<PrivateRoute><StorePage /></PrivateRoute>} 
          />
          <Route 
            path="/report" 
            element={<PrivateRoute><ReportPage /></PrivateRoute>} 
          />
          <Route 
            path="/quests" 
            element={<PrivateRoute><QuestPage /></PrivateRoute>} 
          />
        </Routes>
      </AppContainer>
    </Router>
  );
}

export default App;
