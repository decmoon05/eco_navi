import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Card, Title } from 'react-native-paper';
import { requestPasswordResetAPI, resetPasswordAPI } from '../services/api';

interface PasswordResetProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PasswordReset: React.FC<PasswordResetProps> = ({ onSuccess, onCancel }) => {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [username, setUsername] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async () => {
    if (!username.trim()) {
      Alert.alert('입력 오류', '사용자 이름을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await requestPasswordResetAPI(username);
      // 개발 환경에서는 토큰을 받아서 바로 사용
      if (response.data.resetToken) {
        setResetToken(response.data.resetToken);
        setStep('reset');
        Alert.alert('성공', '비밀번호 재설정 토큰을 받았습니다. 새 비밀번호를 입력해주세요.');
      } else {
        Alert.alert('성공', response.data.message);
      }
    } catch (error: any) {
      Alert.alert('오류', error.response?.data?.message || '비밀번호 재설정 요청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetToken || !newPassword || !confirmPassword) {
      Alert.alert('입력 오류', '모든 필드를 입력해주세요.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('입력 오류', '비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('입력 오류', '새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      const response = await resetPasswordAPI(resetToken, newPassword);
      Alert.alert('성공', response.data.message, [
        { text: 'OK', onPress: () => {
          if (onSuccess) onSuccess();
        }},
      ]);
    } catch (error: any) {
      Alert.alert('오류', error.response?.data?.message || '비밀번호 재설정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'request') {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>비밀번호 재설정</Title>
          <TextInput
            label="사용자 이름"
            value={username}
            onChangeText={setUsername}
            mode="outlined"
            style={styles.input}
            autoCapitalize="none"
          />
          <Button
            mode="contained"
            onPress={handleRequestReset}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            재설정 요청
          </Button>
          {onCancel && (
            <Button
              mode="text"
              onPress={onCancel}
              style={styles.cancelButton}
            >
              취소
            </Button>
          )}
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.title}>새 비밀번호 설정</Title>
        <TextInput
          label="재설정 토큰"
          value={resetToken}
          onChangeText={setResetToken}
          mode="outlined"
          style={styles.input}
          placeholder="이메일로 받은 토큰을 입력하세요"
        />
        <TextInput
          label="새 비밀번호"
          value={newPassword}
          onChangeText={setNewPassword}
          mode="outlined"
          secureTextEntry
          style={styles.input}
          placeholder="최소 6자 이상"
        />
        <TextInput
          label="비밀번호 확인"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          mode="outlined"
          secureTextEntry
          style={styles.input}
        />
        <Button
          mode="contained"
          onPress={handleResetPassword}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          비밀번호 재설정
        </Button>
        <Button
          mode="text"
          onPress={() => setStep('request')}
          style={styles.cancelButton}
        >
          뒤로 가기
        </Button>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
    paddingVertical: 4,
  },
  cancelButton: {
    marginTop: 8,
  },
});

export default PasswordReset;
