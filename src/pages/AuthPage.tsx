import React from 'react';
import styled from 'styled-components';
import Login from '../components/Login';
import Register from '../components/Register';

const AuthContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
`;

const AuthLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  width: 100%;
  max-width: 800px;
`;

const AuthPage: React.FC = () => {
  return (
    <AuthContainer>
      <AuthLayout>
        <Register />
        <Login />
      </AuthLayout>
    </AuthContainer>
  );
};

export default AuthPage;