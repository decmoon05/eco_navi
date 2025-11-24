import React, { useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';

const RegisterContainer = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
`;

const Title = styled.h3`
  color: #333;
  margin-bottom: 20px;
  font-size: 1.3rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
`;

const Button = styled.button`
  padding: 12px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
`;

const Message = styled.p<{ isError?: boolean }>`
  font-size: 14px;
  color: ${props => props.isError ? '#F44336' : '#4CAF50'};
  text-align: center;
`;

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);

    if (!username || !password) {
      setMessage('사용자 이름과 비밀번호를 모두 입력해주세요.');
      setIsError(true);
      return;
    }

    try {
      const response = await axios.post('http://localhost:3001/register', {
        username,
        password,
      });
      setMessage(response.data.message);
      setIsError(false);
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        setMessage(error.response.data.message);
      } else {
        setMessage('알 수 없는 오류가 발생했습니다.');
      }
      setIsError(true);
    }
  };

  return (
    <RegisterContainer>
      <Title>회원가입</Title>
      <Form onSubmit={handleSubmit}>
        <Input 
          type="text" 
          placeholder="사용자 이름" 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Input 
          type="password" 
          placeholder="비밀번호" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit">가입하기</Button>
      </Form>
      {message && <Message isError={isError}>{message}</Message>}
    </RegisterContainer>
  );
};

export default Register;
