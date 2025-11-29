import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Card, Title } from 'react-native-paper';
import { updateProfileAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ChangePassword from './ChangePassword';
import { Theme } from '../theme';

const ProfileSettings: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [loading, setLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  const handleUpdateProfile = async () => {
    if (!newUsername.trim()) {
      Alert.alert('입력 오류', '사용자 이름을 입력해주세요.');
      return;
    }

    if (newUsername.trim() === user?.username) {
      Alert.alert('알림', '변경된 내용이 없습니다.');
      return;
    }

    setLoading(true);
    try {
      const response = await updateProfileAPI(newUsername.trim());
      Alert.alert('성공', response.data.message);
      await refreshUser(); // 사용자 정보 새로고침
    } catch (error: any) {
      Alert.alert('오류', error.response?.data?.message || '프로필 업데이트 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>프로필 설정</Title>
          <TextInput
            label="사용자 이름"
            value={newUsername}
            onChangeText={setNewUsername}
            mode="outlined"
            style={styles.input}
            autoCapitalize="none"
            textColor={Theme.colors.text}
            activeOutlineColor={Theme.colors.primary}
            outlineColor={Theme.colors.border}
            contentStyle={styles.inputContent}
          />
          <Button
            mode="contained"
            onPress={handleUpdateProfile}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            프로필 업데이트
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Button
            mode="outlined"
            onPress={() => setShowPasswordChange(!showPasswordChange)}
            style={styles.button}
          >
            {showPasswordChange ? '비밀번호 변경 숨기기' : '비밀번호 변경'}
          </Button>
          {showPasswordChange && <ChangePassword />}
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    backgroundColor: Theme.colors.surface,
  },
  title: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  input: {
    marginBottom: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
  },
  inputContent: {
    color: Theme.colors.text,
  },
  button: {
    marginTop: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    backgroundColor: Theme.colors.primary,
  },
});

export default ProfileSettings;
