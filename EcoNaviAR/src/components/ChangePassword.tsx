import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Card, Title } from 'react-native-paper';
import { changePasswordAPI } from '../services/api';

const ChangePassword: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('입력 오류', '모든 필드를 입력해주세요.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('입력 오류', '새 비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('입력 오류', '새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      const response = await changePasswordAPI(currentPassword, newPassword);
      Alert.alert('성공', response.data.message);
      // 성공 시 입력 필드 초기화
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('오류', error.response?.data?.message || '비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.title}>비밀번호 변경</Title>
        <TextInput
          label="현재 비밀번호"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          mode="outlined"
          secureTextEntry
          style={styles.input}
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
          onPress={handleChangePassword}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          비밀번호 변경
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
});

export default ChangePassword;



