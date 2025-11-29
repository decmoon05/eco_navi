import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, FlatList, Text, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput, Button, IconButton } from 'react-native-paper';
import debounce from 'lodash.debounce';
import axios from 'axios';
import MapView, { Marker } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { TransportMode, Location } from '../types';
import { API_KEYS } from '../config/apiKeys';
import { getSearchHistory, SearchHistoryEntry } from '../utils/searchHistoryManager';
import { useAuth } from '../contexts/AuthContext';
import { getTransportModeInfo } from '../utils/carbonCalculator';
import { 
  getFavoriteLocations, 
  saveFavoriteLocation, 
  deleteFavoriteLocation,
  updateFavoriteLastUsed,
  getHomeLocation,
  getWorkLocation,
  FavoriteLocation 
} from '../utils/favoriteLocationsManager';
import { Theme } from '../theme';
import { t } from '../i18n';

const TMAP_API_KEY = API_KEYS.TMAP_API_KEY;

interface Poi extends Location {
  address?: string;
}

interface RouteFormProps {
  onSearch: (origin: Location, destination: Location, transportMode: TransportMode) => void;
  isLoading: boolean;
}

const RouteForm: React.FC<RouteFormProps> = ({ onSearch, isLoading }) => {
  const { user } = useAuth();
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [transportMode, setTransportMode] = useState<TransportMode>('vehicle');
  
  // 모달 및 검색 관련 상태
  const [modalVisible, setModalVisible] = useState(false);
  const [searchType, setSearchType] = useState<'origin' | 'destination'>('origin');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<Poi[]>([]);
  
  const [activeInput, setActiveInput] = useState<'origin' | 'destination' | null>(null);
  const [lastUpdated, setLastUpdated] = useState<'origin' | 'destination' | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [homeLocation, setHomeLocation] = useState<FavoriteLocation | null>(null);
  const [workLocation, setWorkLocation] = useState<FavoriteLocation | null>(null);
  const [showFavoriteNameInput, setShowFavoriteNameInput] = useState(false);
  const [favoriteNameInput, setFavoriteNameInput] = useState('');
  const [pendingPoi, setPendingPoi] = useState<Poi | null>(null);
  const [pendingCategory, setPendingCategory] = useState<'home' | 'work' | 'favorite' | 'custom' | null>(null);
  
  const mapRef = useRef<MapView>(null);
  
  // 검색 기록 불러오기 (유저별로 분리)
  useEffect(() => {
    const loadSearchHistory = async () => {
      try {
        const userId = user?.id || null;
        const history = await getSearchHistory(userId);
        setSearchHistory(history);
      } catch (error) {
        console.error("Failed to load search history:", error);
        setSearchHistory([]); // 오류 발생 시 빈 배열로 설정
      }
    };
    loadSearchHistory();
  }, [user]);

  // 즐겨찾기 불러오기
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const favs = await getFavoriteLocations();
        setFavorites(favs);
        const home = await getHomeLocation();
        const work = await getWorkLocation();
        setHomeLocation(home);
        setWorkLocation(work);
      } catch (error) {
        console.error("Failed to load favorites:", error);
      }
    };
    loadFavorites();
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      let targetLocation = null;

      if (lastUpdated === 'origin' && origin) {
        targetLocation = { latitude: origin.lat, longitude: origin.lng };
      } else if (lastUpdated === 'destination' && destination) {
        targetLocation = { latitude: destination.lat, longitude: destination.lng };
      } else if (origin) { // 초기 상태 등
        targetLocation = { latitude: origin.lat, longitude: origin.lng };
      } else if (destination) {
        targetLocation = { latitude: destination.lat, longitude: destination.lng };
      }

      if (targetLocation) {
        mapRef.current.animateCamera({
          center: targetLocation,
          zoom: 15,
        }, { duration: 500 });
      }
    }
  }, [origin, destination, lastUpdated]);

  // 모달 상태 디버깅
  useEffect(() => {
    console.log('Modal visible state:', modalVisible);
  }, [modalVisible]);

  const fetchSuggestions = async (keyword: string) => {
    if (keyword.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const url = `https://apis.openapi.sk.com/tmap/pois?version=1&searchKeyword=${encodeURIComponent(keyword)}&count=20`; // 검색 개수 증가
      const response = await axios.get(url, { headers: { appKey: TMAP_API_KEY } });
      
      const pois = response.data.searchPoiInfo?.pois?.poi;
      if (pois) {
        const suggestions: Poi[] = pois.map((item: any) => {
          const address = [
            item.upperAddrName, 
            item.middleAddrName, 
            item.lowerAddrName, 
            item.detailAddrName,
            item.firstNo ? item.firstNo : '',
            item.secondNo && item.secondNo !== '0' ? '-' + item.secondNo : ''
          ].filter(Boolean).join(' ');

          return {
            name: item.name,
            lat: parseFloat(item.noorLat),
            lng: parseFloat(item.noorLon),
            address: address,
          };
        });
        setSearchResults(suggestions);
      }
    } catch (error) {
      console.error('POI 검색 오류:', error);
    }
  };

  const debouncedFetchSuggestions = useCallback(debounce(fetchSuggestions, 300), []);

  const handleSearchInputChange = (text: string) => {
    setSearchKeyword(text);
    debouncedFetchSuggestions(text);
  };

  const openSearchModal = (type: 'origin' | 'destination') => {
    console.log('openSearchModal called with type:', type);
    setSearchType(type);
    setSearchKeyword('');
    setSearchResults([]);
    setModalVisible(true);
    console.log('Modal state set to true');
  };

  const onPoiSelect = async (poi: Poi) => {
    if (searchType === 'origin') {
      setOrigin(poi);
      setLastUpdated('origin');
    } else {
      setDestination(poi);
      setLastUpdated('destination');
    }
    setModalVisible(false);
  };

  const handleSaveToFavorites = async (poi: Poi, category: 'home' | 'work' | 'favorite' | 'custom', customName?: string) => {
    try {
      const favoriteName = customName || poi.name;
      await saveFavoriteLocation({
        name: favoriteName,
        location: poi,
        category,
      });
      // 즐겨찾기 목록 새로고침
      const favs = await getFavoriteLocations();
      setFavorites(favs);
      const home = await getHomeLocation();
      const work = await getWorkLocation();
      setHomeLocation(home);
      setWorkLocation(work);
      Alert.alert(t('common.success'), t('routeForm.favoriteAdded'));
    } catch (error) {
      Alert.alert(t('common.error'), t('routeForm.favoriteError'));
    }
  };

  const handleFavoriteNameSubmit = () => {
    if (!pendingPoi || !pendingCategory) return;
    
    const name = favoriteNameInput.trim() || pendingPoi.name;
    handleSaveToFavorites(pendingPoi, pendingCategory, name);
    setShowFavoriteNameInput(false);
    setFavoriteNameInput('');
    setPendingPoi(null);
    setPendingCategory(null);
  };

  const handleSelectFavorite = async (favorite: FavoriteLocation, type: 'origin' | 'destination') => {
    if (type === 'origin') {
      setOrigin(favorite.location);
      setLastUpdated('origin');
    } else {
      setDestination(favorite.location);
      setLastUpdated('destination');
    }
    await updateFavoriteLastUsed(favorite.id);
    setShowFavorites(false);
  };

  const handleSearch = () => {
    if (!origin || !destination) {
      Alert.alert(t('routeForm.inputError'), t('routeForm.setOriginDestination'));
      return;
    }

    const latDiff = Math.abs(origin.lat - destination.lat);
    const lngDiff = Math.abs(origin.lng - destination.lng);
    if (latDiff < 0.0001 && lngDiff < 0.0001) {
      Alert.alert(t('routeForm.inputError'), t('routeForm.locationsTooClose'));
      return;
    }

    onSearch(origin, destination, transportMode);
  };

  const TransportModeButton = ({ mode, label, icon }: { mode: TransportMode, label: string, icon: string }) => (
    <TouchableOpacity 
      style={[styles.modeButton, transportMode === mode && styles.modeButtonActive]} 
      onPress={() => setTransportMode(mode)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t('routeForm.selectTransportModeLabel', { mode: label })}
      accessibilityHint={transportMode === mode ? t('routeForm.transportModeSelected', { mode: label }) : t('routeForm.selectTransportModeHint', { mode: label })}
      accessibilityState={{ selected: transportMode === mode }}
    >
      <Text style={[styles.modeButtonText, transportMode === mode && styles.modeButtonTextActive]}>
        {icon} {label}
      </Text>
    </TouchableOpacity>
  );

  const renderSearchItem = ({ item }: { item: Poi }) => {
    const isFavorite = favorites.some(f => 
      f.location.lat === item.lat && f.location.lng === item.lng
    );
    
    return (
    <TouchableOpacity style={styles.searchItem} onPress={() => onPoiSelect(item)}>
        <View style={{ flex: 1 }}>
          <View style={styles.searchItemHeader}>
        <Text style={styles.searchItemName}>{item.name}</Text>
            {isFavorite && <Icon name="star" size={16} color={Theme.colors.warning} />}
          </View>
        <Text style={styles.searchItemAddress}>{item.address}</Text>
      </View>
        <View style={styles.searchItemActions}>
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                t('routeForm.addToFavorites'),
                t('routeForm.selectCategory'),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('routeForm.home'), onPress: () => handleSaveToFavorites(item, 'home') },
                  { text: t('routeForm.work'), onPress: () => handleSaveToFavorites(item, 'work') },
                  { text: t('routeForm.custom'), onPress: () => handleSaveToFavorites(item, 'favorite') },
                ]
              );
            }}
            style={styles.favoriteButton}
          >
            <Icon name={isFavorite ? "star" : "star-outline"} size={20} color={isFavorite ? Theme.colors.warning : Theme.colors.textLight} />
          </TouchableOpacity>
      <Icon name="chevron-right" size={24} color={Theme.colors.textLight} />
        </View>
    </TouchableOpacity>
  );
  };

  return (
    <View style={styles.container}>
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={[styles.cardContent, styles.scrollContent]}
      showsVerticalScrollIndicator={true}
      nestedScrollEnabled={true}
    >
      {/* 출발지 입력 버튼 */}
      <TouchableOpacity 
        onPress={() => {
          console.log('출발지 버튼 클릭됨');
          openSearchModal('origin');
        }} 
        style={[styles.inputButton, origin && styles.inputButtonFilled]}
        activeOpacity={0.8}
      >
        <View style={[styles.inputIconContainer, origin && styles.inputIconContainerFilled]}>
          <Icon name="map-marker" size={20} color={origin ? Theme.colors.primaryLight : Theme.colors.textSecondary} />
        </View>
        <View style={styles.inputTextContainer}>
        <Text style={styles.inputLabel}>{t('routeForm.origin')}</Text>
          <Text style={[styles.inputValue, !origin && styles.placeholder]} numberOfLines={1}>
          {origin ? origin.name : t('routeForm.originPlaceholder')}
        </Text>
        </View>
        <Icon name="chevron-right" size={24} color={Theme.colors.textLight} />
      </TouchableOpacity>
      
      {/* 도착지 입력 버튼 */}
      <TouchableOpacity 
        onPress={() => {
          console.log('도착지 버튼 클릭됨');
          openSearchModal('destination');
        }} 
        style={[styles.inputButton, destination && styles.inputButtonFilled]}
        activeOpacity={0.8}
      >
        <View style={[styles.inputIconContainer, destination && styles.inputIconContainerFilled]}>
          <Icon name="map-marker-check" size={20} color={destination ? Theme.colors.primaryLight : Theme.colors.textSecondary} />
        </View>
        <View style={styles.inputTextContainer}>
        <Text style={styles.inputLabel}>{t('routeForm.destination')}</Text>
          <Text style={[styles.inputValue, !destination && styles.placeholder]} numberOfLines={1}>
          {destination ? destination.name : t('routeForm.destinationPlaceholder')}
        </Text>
        </View>
        <Icon name="chevron-right" size={24} color={Theme.colors.textLight} />
      </TouchableOpacity>

      {/* 빠른 선택: 집/회사 */}
      {(homeLocation || workLocation) && (
        <View style={styles.quickSelectContainer}>
          <Text style={styles.quickSelectTitle}>{t('common.quickSelect')}</Text>
          <View style={styles.quickSelectButtons}>
            {homeLocation && (
              <TouchableOpacity
                style={styles.quickSelectButton}
                onPress={() => {
                  setOrigin(homeLocation.location);
                  setLastUpdated('origin');
                  updateFavoriteLastUsed(homeLocation.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('routeForm.setHomeAsOrigin')}
                accessibilityHint={t('routeForm.setHomeAsOriginHint')}
              >
                <Icon name="home" size={20} color={Theme.colors.info} />
                <Text style={styles.quickSelectText}>{t('routeForm.home')}</Text>
              </TouchableOpacity>
            )}
            {workLocation && (
              <TouchableOpacity
                style={styles.quickSelectButton}
                onPress={() => {
                  setOrigin(workLocation.location);
                  setLastUpdated('origin');
                  updateFavoriteLastUsed(workLocation.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('routeForm.setWorkAsOrigin')}
                accessibilityHint={t('routeForm.setWorkAsOriginHint')}
              >
                <Icon name="briefcase" size={20} color={Theme.colors.warning} />
                <Text style={styles.quickSelectText}>{t('routeForm.work')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.quickSelectButton}
              onPress={() => setShowFavorites(true)}
              accessibilityRole="button"
              accessibilityLabel={t('routeForm.openFavorites')}
              accessibilityHint={t('routeForm.openFavoritesHint')}
            >
              <Icon name="star" size={20} color={Theme.colors.warning} />
              <Text style={styles.quickSelectText}>{t('routeForm.favorites')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 지도 미리보기 */}
      {(origin || destination) && (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
            pointerEvents="none"
            initialRegion={{
              latitude: origin?.lat || 37.5665,
              longitude: origin?.lng || 126.9780,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
          >
            {origin && <Marker coordinate={{ latitude: origin.lat, longitude: origin.lng }} title="출발" pinColor="blue" />}
            {destination && <Marker coordinate={{ latitude: destination.lat, longitude: destination.lng }} title="도착" pinColor="red" />}
          </MapView>
          {/* 지도 위 투명 오버레이로 터치 이벤트 완전 차단 */}
          <View style={styles.mapOverlay} pointerEvents="none" />
        </View>
      )}

      <View style={styles.modeSelectionContainer}>
        <Text style={styles.modeSelectionTitle}>{t('routeForm.selectTransportMode')}</Text>
        <View style={styles.modeButtonGrid}>
        <TransportModeButton mode="vehicle" label={t('transportModes.vehicle')} icon="🚗" />
        <TransportModeButton mode="bus" label={t('transportModes.bus')} icon="🚌" />
        <TransportModeButton mode="bicycle" label={t('transportModes.bicycle')} icon="🚲" />
        <TransportModeButton mode="walking" label={t('transportModes.walking')} icon="🚶" />
        </View>
      </View>

      {/* 하단 여백 추가 (버튼 공간 확보) */}
      <View style={styles.bottomSpacer} />

      {/* 검색 기록 섹션 */}
      {searchHistory.length > 0 && (
        <View style={styles.searchHistorySection}>
          <Text style={styles.searchHistoryTitle}>최근 검색 기록</Text>
          <FlatList
            data={searchHistory.slice(0, 5)} // 최근 5개만 표시
            renderItem={({ item }) => {
              const formatSearchTime = (isoString: string): string => {
                const date = new Date(isoString);
                const now = new Date();
                const diffMs = now.getTime() - date.getTime();
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMs / 3600000);
                const diffDays = Math.floor(diffMs / 86400000);

                if (diffMins < 1) return '방금 전';
                if (diffMins < 60) return `${diffMins}분 전`;
                if (diffHours < 24) return `${diffHours}시간 전`;
                if (diffDays < 7) return `${diffDays}일 전`;
                
                return date.toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
              };

              const modeInfo = getTransportModeInfo(item.transportMode as any);

              return (
                <TouchableOpacity
                  style={styles.searchHistoryItem}
                  onPress={() => {
                    setOrigin(item.origin);
                    setDestination(item.destination);
                    setTransportMode(item.transportMode as TransportMode);
                    // 검색 기록 선택 시 바로 검색 실행
                    onSearch(item.origin, item.destination, item.transportMode as TransportMode);
                  }}
                >
                  <View style={styles.searchHistoryItemContent}>
                    <Text style={styles.searchHistoryRouteText}>
                      {item.origin.name} → {item.destination.name}
                    </Text>
                    <View style={styles.searchHistoryDetails}>
                      <Text style={styles.searchHistoryModeText}>
                        {modeInfo.icon} {modeInfo.name}
                      </Text>
                      <Text style={styles.searchHistoryTimeText}>
                        {formatSearchTime(item.searchTime)}
                      </Text>
                    </View>
                  </View>
                  <Icon name="chevron-right" size={20} color={Theme.colors.textLight} />
                </TouchableOpacity>
              );
            }}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
          {searchHistory.length > 5 && (
            <TouchableOpacity
              style={styles.showMoreButton}
              onPress={() => setShowHistory(true)}
            >
              <Text style={styles.showMoreText}>전체 검색 기록 보기 ({searchHistory.length}개)</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 검색 모달 */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => {
          console.log('Modal onRequestClose called');
          setModalVisible(false);
        }}
        transparent={false}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <IconButton icon="arrow-left" onPress={() => setModalVisible(false)} />
            <TextInput
              style={styles.modalInput}
              placeholder={searchType === 'origin' ? t('routeForm.searchOrigin') : t('routeForm.searchDestination')}
              value={searchKeyword}
              onChangeText={handleSearchInputChange}
              autoFocus
              mode="flat"
              underlineColor="transparent"
            />
          </View>
          
          <FlatList
            data={searchResults}
            renderItem={renderSearchItem}
            keyExtractor={(item, index) => `${index}-${item.name}`}
            contentContainerStyle={styles.searchListContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </SafeAreaView>
      </Modal>

      {/* 검색 기록 모달 */}
      <Modal
        visible={showHistory}
        animationType="slide"
        onRequestClose={() => setShowHistory(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <IconButton icon="arrow-left" onPress={() => setShowHistory(false)} />
            <Text style={styles.modalTitle}>검색 기록</Text>
            <View style={{ width: 48 }} />
          </View>
          
          <FlatList
            data={searchHistory}
            renderItem={({ item }) => {
              const formatSearchTime = (isoString: string): string => {
                const date = new Date(isoString);
                const now = new Date();
                const diffMs = now.getTime() - date.getTime();
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMs / 3600000);
                const diffDays = Math.floor(diffMs / 86400000);

                if (diffMins < 1) return '방금 전';
                if (diffMins < 60) return `${diffMins}분 전`;
                if (diffHours < 24) return `${diffHours}시간 전`;
                if (diffDays < 7) return `${diffDays}일 전`;
                
                return date.toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
              };

              const modeInfo = getTransportModeInfo(item.transportMode as any);

              return (
                <TouchableOpacity
                  style={styles.historyItem}
                  onPress={() => {
                    setOrigin(item.origin);
                    setDestination(item.destination);
                    setTransportMode(item.transportMode as TransportMode);
                    setShowHistory(false);
                    // 검색 기록 선택 시 바로 검색 실행
                    onSearch(item.origin, item.destination, item.transportMode as TransportMode);
                  }}
                >
                  <View style={styles.historyItemContent}>
                    <Text style={styles.historyRouteText}>
                      {item.origin.name} → {item.destination.name}
                    </Text>
                    <View style={styles.historyDetails}>
                      <Text style={styles.historyModeText}>
                        {modeInfo.icon} {modeInfo.name}
                      </Text>
                      <Text style={styles.historyTimeText}>
                        {formatSearchTime(item.searchTime)}
                      </Text>
                    </View>
                  </View>
                  <Icon name="chevron-right" size={24} color={Theme.colors.textLight} />
                </TouchableOpacity>
              );
            }}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.searchListContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>검색 기록이 없습니다.</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>

      {/* 즐겨찾기 모달 */}
      <Modal
        visible={showFavorites}
        animationType="slide"
        onRequestClose={() => setShowFavorites(false)}
        transparent={false}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <IconButton icon="arrow-left" onPress={() => setShowFavorites(false)} />
            <Text style={styles.modalTitle}>{t('routeForm.favorites')}</Text>
            <View style={{ width: 48 }} />
          </View>
          
          <FlatList
            data={favorites}
            renderItem={({ item }) => {
              const getCategoryIcon = (category: string) => {
                switch (category) {
                  case 'home': return 'home';
                  case 'work': return 'briefcase';
                  default: return 'star';
                }
              };
              const getCategoryColor = (category: string) => {
                switch (category) {
                  case 'home': return '#2196F3';
                  case 'work': return '#FF9800';
                  default: return '#FFC107';
                }
              };

              return (
                <TouchableOpacity
                  style={styles.favoriteItem}
                  onPress={() => {
                    Alert.alert(
                      '위치 선택',
                      '출발지 또는 도착지로 설정하시겠습니까?',
                      [
                        { text: '취소', style: 'cancel' },
                        { text: '출발지', onPress: () => handleSelectFavorite(item, 'origin') },
                        { text: '도착지', onPress: () => handleSelectFavorite(item, 'destination') },
                      ]
                    );
                  }}
                >
                  <Icon 
                    name={getCategoryIcon(item.category)} 
                    size={24} 
                    color={getCategoryColor(item.category)} 
                    style={{ marginRight: 12 }}
                  />
                  <View style={styles.favoriteItemContent}>
                    <Text style={styles.favoriteItemName}>{item.name}</Text>
                    <Text style={styles.favoriteItemAddress}>{item.location.address || '주소 없음'}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        '즐겨찾기 삭제',
                        '이 즐겨찾기를 삭제하시겠습니까?',
                        [
                          { text: '취소', style: 'cancel' },
                          { 
                            text: '삭제', 
                            style: 'destructive',
                            onPress: async () => {
                              await deleteFavoriteLocation(item.id);
                              const favs = await getFavoriteLocations();
                              setFavorites(favs);
                              const home = await getHomeLocation();
                              const work = await getWorkLocation();
                              setHomeLocation(home);
                              setWorkLocation(work);
                            }
                          },
                        ]
                      );
                    }}
                  >
                    <Icon name="delete-outline" size={24} color="#f44336" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.searchListContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="star-outline" size={48} color={Theme.colors.textLight} />
                <Text style={styles.emptyText}>저장된 즐겨찾기가 없습니다.</Text>
                <Text style={[styles.emptyText, { fontSize: 14, marginTop: 8 }]}>
                  검색 결과에서 ⭐ 아이콘을 눌러 즐겨찾기에 추가하세요.
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>

      {/* 즐겨찾기 이름 입력 모달 */}
      <Modal
        visible={showFavoriteNameInput}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowFavoriteNameInput(false);
          setFavoriteNameInput('');
          setPendingPoi(null);
          setPendingCategory(null);
        }}
      >
        <View style={styles.nameInputModalOverlay}>
          <View style={styles.nameInputModalContent}>
            <Text style={styles.nameInputModalTitle}>
              {pendingCategory === 'home' ? '집' : pendingCategory === 'work' ? '회사' : '즐겨찾기'} 이름 지정
            </Text>
            <TextInput
              style={styles.nameInput}
              value={favoriteNameInput}
              onChangeText={setFavoriteNameInput}
              placeholder="이름을 입력하세요"
              autoFocus={true}
              maxLength={50}
            />
            <View style={styles.nameInputModalButtons}>
              <Button
                mode="outlined"
                onPress={() => {
                  setShowFavoriteNameInput(false);
                  setFavoriteNameInput('');
                  setPendingPoi(null);
                  setPendingCategory(null);
                }}
                style={styles.nameInputModalButton}
              >
                취소
              </Button>
              <Button
                mode="contained"
                onPress={handleFavoriteNameSubmit}
                style={[styles.nameInputModalButton, styles.nameInputModalButtonPrimary]}
                disabled={!favoriteNameInput.trim()}
              >
                저장
              </Button>
            </View>
          </View>
    </View>
      </Modal>
    </ScrollView>
    
    {/* 하단 고정 검색 버튼 */}
    <View style={styles.fixedButtonContainer}>
      <TouchableOpacity
        onPress={handleSearch}
        disabled={isLoading || !origin || !destination}
        style={[styles.fixedButton, (!origin || !destination) && styles.fixedButtonDisabled]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={isLoading ? t('routeForm.searching') : t('routeForm.searchRoute')}
        accessibilityHint={!origin || !destination ? t('routeForm.setOriginDestination') : t('routeForm.searchRouteHint')}
        accessibilityState={{ disabled: isLoading || !origin || !destination }}
      >
        {isLoading ? (
          <View style={styles.buttonLoadingContainer}>
            <ActivityIndicator size="small" color={Theme.colors.backgroundLight} />
            <Text style={[styles.fixedButtonLabel, styles.buttonLabelWithIcon]}>{t('common.search')}</Text>
          </View>
        ) : (
          <View style={styles.buttonContent}>
            <Icon name="magnify" size={20} color={Theme.colors.backgroundLight} />
            <Text style={[styles.fixedButtonLabel, styles.buttonLabelWithIcon]}>{t('routeForm.searchRoute')}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  cardContent: {
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.background,
  },
  scrollContent: {
    paddingBottom: 100, // 하단 고정 버튼 공간 확보
  },
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Theme.colors.divider,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    minHeight: 60,
    ...Theme.shadows.small,
  },
  inputButtonFilled: {
    borderColor: Theme.colors.secondary,
    backgroundColor: Theme.colors.primaryLight + '15',
  },
  inputIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.sm,
  },
  inputIconContainerFilled: {
    backgroundColor: Theme.colors.primaryLight + '20',
  },
  inputTextContainer: {
    flex: 1,
  },
  inputLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
    fontWeight: '500',
  },
  inputValue: {
    ...Theme.typography.body1,
    color: Theme.colors.text,
    fontWeight: '600',
  },
  placeholder: {
    color: Theme.colors.textLight,
    fontWeight: 'normal',
  },
  mapContainer: {
    height: 200,
    marginBottom: Theme.spacing.md,
    borderRadius: Theme.borderRadius.medium,
    overflow: 'hidden',
    ...Theme.shadows.small,
    backgroundColor: Theme.colors.background,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  modeSelectionContainer: {
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  modeSelectionTitle: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
    fontWeight: '600',
  },
  modeButtonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modeButton: {
    width: '48%',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: Theme.colors.divider,
    borderRadius: Theme.borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surface,
    marginBottom: Theme.spacing.sm,
    ...Theme.shadows.small,
  },
  modeButtonActive: {
    backgroundColor: Theme.colors.primaryLight + '15',
    borderColor: Theme.colors.secondary,
    borderWidth: 1.5,
  },
  modeButtonText: {
    ...Theme.typography.body2,
    color: Theme.colors.text,
  },
  modeButtonTextActive: {
    color: Theme.colors.primary,
    fontWeight: '600',
  },
  button: {
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    ...Theme.shadows.medium,
  },
  buttonDisabled: {
    backgroundColor: Theme.colors.textLight,
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
  },
  buttonLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
  },
  buttonLabel: {
    ...Theme.typography.h4,
    color: Theme.colors.backgroundLight,
    fontWeight: '700',
  },
  buttonLabelWithIcon: {
    fontSize: 16,
  },
  searchHistorySection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  searchHistoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 12,
  },
  searchHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Theme.colors.backgroundDark,
    borderRadius: 8,
    marginBottom: 8,
  },
  searchHistoryItemContent: {
    flex: 1,
  },
  searchHistoryRouteText: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.colors.text,
    marginBottom: 4,
  },
  searchHistoryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchHistoryModeText: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
  },
  searchHistoryTimeText: {
    fontSize: 12,
    color: Theme.colors.textLight,
  },
  showMoreButton: {
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  showMoreText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Theme.colors.backgroundDark,
    borderRadius: 8,
  },
  historyItemContent: {
    flex: 1,
  },
  historyRouteText: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text,
    marginBottom: 4,
  },
  historyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyModeText: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
  },
  historyTimeText: {
    fontSize: 12,
    color: Theme.colors.textLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Theme.colors.textLight,
  },
  // 모달 스타일
  modalContainer: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    paddingBottom: 8,
  },
  modalInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 18,
  },
  searchListContent: {
    padding: 16,
  },
  searchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  searchItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 4,
  },
  searchItemAddress: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: Theme.colors.backgroundDark,
  },
  quickSelectContainer: {
    marginBottom: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  quickSelectTitle: {
    ...Theme.typography.caption,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.sm,
  },
  quickSelectButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  quickSelectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.xs,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: Theme.colors.divider,
    ...Theme.shadows.small,
  },
  quickSelectText: {
    marginLeft: Theme.spacing.xs,
    ...Theme.typography.body2,
    color: Theme.colors.text,
    fontWeight: '500',
  },
  searchItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  favoriteButton: {
    padding: 4,
  },
  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Theme.colors.backgroundDark,
    borderRadius: 8,
  },
  favoriteItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  favoriteItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text,
    marginBottom: 4,
  },
  favoriteItemAddress: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
  },
  nameInputModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameInputModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  nameInputModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: Theme.colors.text,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: Theme.colors.backgroundDark,
  },
  nameInputModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  nameInputModalButton: {
    minWidth: 80,
  },
  nameInputModalButtonPrimary: {
    backgroundColor: Theme.colors.info,
  },
  bottomSpacer: {
    height: 20,
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    ...Theme.shadows.medium,
  },
  fixedButton: {
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    ...Theme.shadows.medium,
  },
  fixedButtonDisabled: {
    backgroundColor: Theme.colors.textLight,
    opacity: 0.5,
  },
  fixedButtonLabel: {
    ...Theme.typography.h4,
    color: Theme.colors.backgroundLight,
    fontWeight: '700',
  },
});

export default RouteForm;