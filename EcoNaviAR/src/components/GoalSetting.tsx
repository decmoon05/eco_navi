import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, TextInput, Button, ProgressBar } from 'react-native-paper';
import { setGoalAPI } from '../services/api';
import { Theme } from '../theme';
import { useToast } from '../contexts/ToastContext';

interface GoalSettingProps {
  currentGoal: number; // gCO2
  currentSavedEmission: number; // gCO2
  onGoalUpdated: () => void;
}

const GoalSetting: React.FC<GoalSettingProps> = ({ currentGoal, currentSavedEmission, onGoalUpdated }) => {
  const { showError, showSuccess } = useToast();
  const [newGoal, setNewGoal] = useState(String(currentGoal / 1000)); // kg 단위로 표시
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setNewGoal(String(currentGoal / 1000));
  }, [currentGoal]);

  const handleSetGoal = async () => {
    const goalInGrams = parseFloat(newGoal) * 1000;
    if (isNaN(goalInGrams) || goalInGrams < 0) {
      showError('올바른 목표 값을 입력해주세요.');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await setGoalAPI(goalInGrams);
      showSuccess(response.data.message);
      onGoalUpdated(); // 목표 업데이트 후 부모 컴포넌트에 알림
    } catch (error: any) {
      showError(error.response?.data?.message || '목표 설정 중 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const progress = currentGoal > 0 ? Math.min(1, currentSavedEmission / currentGoal) : 0;

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.title}>월간 목표</Title>
        <Paragraph style={styles.currentGoal}>
          목표: {currentGoal / 1000} kg CO₂ 절감
        </Paragraph>
        <Paragraph style={styles.currentSaved}>
          현재: {(currentSavedEmission / 1000).toFixed(2)} kg CO₂ 절감
        </Paragraph>
        <ProgressBar progress={progress} color={Theme.colors.success} style={styles.progressBar} />
        <Text style={styles.progressText}>
          {(progress * 100).toFixed(0)}% 달성
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            label="새 목표 (kg CO₂)"
            value={newGoal}
            onChangeText={setNewGoal}
            keyboardType="numeric"
            mode="outlined"
            style={styles.goalInput}
            textColor={Theme.colors.text}
            activeOutlineColor={Theme.colors.primary}
            outlineColor={Theme.colors.border}
            contentStyle={styles.inputContent}
          />
          <Button
            mode="contained"
            onPress={handleSetGoal}
            loading={isUpdating}
            disabled={isUpdating}
            style={styles.setGoalButton}
            labelStyle={styles.buttonLabel}
          >
            목표 설정
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    backgroundColor: Theme.colors.info + '15', // Light blue background
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.info, // Dark blue
    textAlign: 'center',
    marginBottom: 8,
  },
  currentGoal: {
    ...Theme.typography.body1,
    color: Theme.colors.text,
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
  },
  currentSaved: {
    ...Theme.typography.body1,
    textAlign: 'center',
    marginBottom: Theme.spacing.sm,
    fontWeight: 'bold',
    color: Theme.colors.primary,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    marginBottom: Theme.spacing.sm,
  },
  progressText: {
    textAlign: 'right',
    ...Theme.typography.body2,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  goalInput: {
    flex: 1,
    marginRight: Theme.spacing.sm,
    height: 40,
    backgroundColor: Theme.colors.background,
  },
  inputContent: {
    color: Theme.colors.text,
  },
  setGoalButton: {
    height: 40,
    justifyContent: 'center',
    backgroundColor: Theme.colors.primary,
  },
  buttonLabel: {
    ...Theme.typography.body2,
    color: Theme.colors.backgroundLight,
  },
});

export default GoalSetting;
