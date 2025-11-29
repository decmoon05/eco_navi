import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { 
  getApiUrl, 
  setApiUrl, 
  validateApiUrl,
  getServerPresets,
  getCurrentPresetId,
  setCurrentPresetId,
  setApiUrlFromPreset,
  type ServerPreset
} from '../config/api';
import { updateApiBaseURL, backupDatabaseAPI, restoreDatabaseAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Theme } from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const ServerSettings = () => {
  const [serverUrl, setServerUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [presets, setPresets] = useState<ServerPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const url = await getApiUrl();
    setServerUrl(url);
    
    const loadedPresets = await getServerPresets();
    setPresets(loadedPresets);
    
    const currentPresetId = await getCurrentPresetId();
    setSelectedPresetId(currentPresetId);
  };

  const handlePresetSelect = async (preset: ServerPreset) => {
    setSelectedPresetId(preset.id);
    setServerUrl(preset.url);
    // 프리셋 선택 시 자동으로 저장하지 않음 (사용자가 저장 버튼을 눌러야 함)
  };

  const handleSave = async () => {
    if (!serverUrl.trim()) {
      Alert.alert('오류', '서버 URL을 입력해주세요.');
      return;
    }

    // URL 형식 검증
    if (!validateApiUrl(serverUrl.trim())) {
      Alert.alert('오류', '올바른 URL 형식이 아닙니다.\n예: http://192.168.0.100:3001 또는 https://your-service.up.railway.app');
      return;
    }

    setIsLoading(true);
    try {
      const urlToSave = serverUrl.trim();
      
      // 선택된 프리셋이 있고, 그 프리셋의 URL과 일치하면 프리셋으로 저장
      if (selectedPresetId) {
        const preset = presets.find(p => p.id === selectedPresetId);
        if (preset && preset.url === urlToSave) {
          await setApiUrlFromPreset(selectedPresetId);
        } else {
          await setApiUrl(urlToSave);
          await setCurrentPresetId(null);
        }
      } else {
        await setApiUrl(urlToSave);
      }
      
      await updateApiBaseURL();
      Alert.alert('성공', '서버 URL이 변경되었습니다.\n앱을 재시작하면 적용됩니다.');
    } catch (error) {
      Alert.alert('오류', '서버 URL 저장에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    if (!serverUrl.trim() || !validateApiUrl(serverUrl.trim())) {
      Alert.alert('오류', '올바른 URL을 입력한 후 테스트해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const testUrl = serverUrl.trim();
      const response = await fetch(`${testUrl}/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        Alert.alert('성공', '서버에 연결할 수 있습니다!');
      } else {
        Alert.alert('경고', `서버 응답: ${response.status}\n서버는 실행 중이지만 응답이 예상과 다릅니다.`);
      }
    } catch (error: any) {
      Alert.alert(
        '연결 실패',
        `서버에 연결할 수 없습니다.\n\n확인 사항:\n1. 서버가 실행 중인지 확인\n2. IP 주소가 올바른지 확인\n3. 포트 번호가 올바른지 확인\n4. 방화벽 설정 확인\n\n오류: ${error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    // admin 계정 확인
    if (!user || !user.is_admin) {
      Alert.alert('권한 없음', '데이터베이스 동기화는 관리자만 사용할 수 있습니다.');
      return;
    }

    // 현재 서버 URL 확인
    const currentUrl = serverUrl.trim();
    if (!currentUrl || !validateApiUrl(currentUrl)) {
      Alert.alert('오류', '올바른 서버 URL을 설정해주세요.');
      return;
    }

    // 일방향 동기화 정책: 클라우드 → 로컬만 허용
    const cloudPreset = presets.find(p => p.id === 'cloud');
    const localPresets = presets.filter(p => p.id === 'home_wifi' || p.id === 'hotspot');
    
    // 클라우드에서 로컬로만 동기화 가능
    if (!currentUrl.startsWith('https://')) {
      Alert.alert(
        '동기화 방향 제한',
        '일방향 동기화 정책에 따라 클라우드에서 로컬로만 동기화할 수 있습니다.\n\n현재 서버가 로컬 서버입니다. 클라우드 서버로 변경한 후 동기화를 시도해주세요.'
      );
      return;
    }

    // 클라우드 → 로컬 동기화
    if (localPresets.length === 0) {
      Alert.alert('오류', '로컬 서버 프리셋(집 WiFi 또는 핫스팟)이 설정되어 있지 않습니다.');
      return;
    }
    
    const sourceUrl = currentUrl; // 클라우드
    const targetUrl = localPresets[0].url; // 로컬
    const targetName = localPresets[0].name;

    Alert.alert(
      '데이터베이스 동기화 (클라우드 → 로컬)',
      `클라우드 서버의 데이터를 ${targetName} (${targetUrl})로 동기화하시겠습니까?\n\n⚠️ 주의: 로컬 서버의 모든 데이터가 삭제되고 클라우드 서버의 데이터로 교체됩니다.\n\n📌 일방향 동기화: 클라우드 → 로컬만 가능합니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '동기화',
          style: 'destructive',
          onPress: async () => {
            setIsSyncing(true);
            try {
              // 1. 현재 서버에서 백업
              await updateApiBaseURL();
              const backupResponse = await backupDatabaseAPI();
              const backupData = backupResponse.data;

              // 2. 대상 서버에 복원
              // 임시로 baseURL 변경
              const originalBaseURL = await getApiUrl();
              await setApiUrl(targetUrl);
              await updateApiBaseURL();
              
              try {
                await restoreDatabaseAPI(backupData.data);
                
                // 원래 서버 URL로 복원
                await setApiUrl(originalBaseURL);
                await updateApiBaseURL();
                
                Alert.alert('성공', `데이터베이스가 성공적으로 동기화되었습니다!\n\n${currentUrl} → ${targetUrl}`);
              } catch (restoreError: any) {
                // 원래 서버 URL로 복원
                await setApiUrl(originalBaseURL);
                await updateApiBaseURL();
                throw restoreError;
              }
            } catch (error: any) {
              console.error('동기화 오류:', error);
              Alert.alert(
                '동기화 실패',
                `데이터베이스 동기화 중 오류가 발생했습니다.\n\n오류: ${error.response?.data?.message || error.message || '알 수 없는 오류'}\n\n확인 사항:\n1. 두 서버 모두 실행 중인지 확인\n2. admin 계정으로 로그인되어 있는지 확인\n3. 네트워크 연결 상태 확인`
              );
            } finally {
              setIsSyncing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Icon name="server" size={24} color={Theme.colors.primary} />
        <Text style={styles.cardTitle}>서버 설정</Text>
      </View>
      <Text style={styles.description}>
        백엔드 서버의 주소를 설정합니다.
      </Text>
      
      {/* 프리셋 선택 버튼들 */}
      <View style={styles.presetContainer}>
        <Text style={styles.presetLabel}>빠른 선택:</Text>
        <View style={styles.presetButtons}>
          {presets.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              style={[
                styles.presetButton,
                selectedPresetId === preset.id && styles.presetButtonActive
              ]}
              onPress={() => handlePresetSelect(preset)}
              disabled={isLoading}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  selectedPresetId === preset.id && styles.presetButtonTextActive
                ]}
              >
                {preset.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TextInput
        style={styles.input}
        placeholder="서버 URL을 입력하거나 위에서 선택하세요"
        value={serverUrl}
        onChangeText={(text) => {
          setServerUrl(text);
          // 수동 입력 시 프리셋 선택 해제
          if (selectedPresetId) {
            const preset = presets.find(p => p.id === selectedPresetId);
            if (preset && preset.url !== text) {
              setSelectedPresetId(null);
            }
          }
        }}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        editable={!isLoading}
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.testButton]}
          onPress={handleTest}
          disabled={isLoading || isSyncing}
        >
          <Text style={styles.buttonText}>연결 테스트</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}
          disabled={isLoading || isSyncing}
        >
          <Text style={styles.buttonText}>저장</Text>
        </TouchableOpacity>
      </View>

      {/* 동기화 버튼 (관리자만 표시) */}
      {user?.is_admin && (
        <TouchableOpacity
          style={[styles.syncButton, (isLoading || isSyncing) && styles.syncButtonDisabled]}
          onPress={handleSync}
          disabled={isLoading || isSyncing}
        >
          {isSyncing ? (
            <View style={styles.syncButtonContent}>
              <ActivityIndicator size="small" color={Theme.colors.backgroundLight} />
              <Text style={styles.syncButtonText}>동기화 중...</Text>
            </View>
          ) : (
            <View style={styles.syncButtonContent}>
              <Icon name="sync" size={20} color={Theme.colors.backgroundLight} />
              <Text style={styles.syncButtonText}>데이터베이스 동기화</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.lg,
    gap: Theme.spacing.xs,
  },
  cardTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.text,
    fontWeight: '700',
  },
  description: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.md,
    lineHeight: 18,
  },
  presetContainer: {
    marginBottom: Theme.spacing.md,
  },
  presetLabel: {
    ...Theme.typography.body2,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.sm,
    fontWeight: '600',
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  presetButton: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.small,
    borderWidth: 1.5,
    borderColor: Theme.colors.divider,
    backgroundColor: Theme.colors.surface,
    ...Theme.shadows.small,
  },
  presetButtonActive: {
    backgroundColor: Theme.colors.secondary + '15',
    borderColor: Theme.colors.secondary,
  },
  presetButtonText: {
    ...Theme.typography.body2,
    color: Theme.colors.text,
    fontWeight: '500',
  },
  presetButtonTextActive: {
    color: Theme.colors.primary,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1.5,
    borderColor: Theme.colors.divider,
    borderRadius: Theme.borderRadius.small,
    padding: Theme.spacing.md,
    ...Theme.typography.body1,
    marginBottom: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    color: Theme.colors.text,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  button: {
    flex: 1,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButton: {
    backgroundColor: Theme.colors.primary,
  },
  saveButton: {
    backgroundColor: Theme.colors.secondary,
  },
  buttonText: {
    ...Theme.typography.button,
    color: Theme.colors.backgroundLight,
    fontWeight: '700',
  },
  syncButton: {
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.small,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.medium,
  },
  syncButtonDisabled: {
    backgroundColor: Theme.colors.textLight,
    opacity: 0.6,
  },
  syncButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  syncButtonText: {
    ...Theme.typography.button,
    color: Theme.colors.backgroundLight,
    fontWeight: '700',
  },
});

export default ServerSettings;




