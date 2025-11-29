# 광고 이미지 폴더

이 폴더에는 광고 배너에 사용할 이미지 파일을 저장합니다.

## 이미지 파일 형식
- PNG 또는 JPG 형식 권장
- 권장 크기: 400x120px (가로x세로, 배너 형태)
- 파일명: 다음 3개의 파일이 필요합니다:
  1. `ad_recycling.png` - 분리수거 광고 ("작은 분리수거, 큰 변화의 시작!")
  2. `ad_eco_transport.png` - 친환경 이동 광고 ("친환경 이동, 지구를 살립니다.")
  3. `ad_forest.png` - 숲 보호 광고 ("우리의 선택이 숲을 지킵니다.")

## 이미지 추가 방법

1. 위의 3개 이미지 파일을 이 폴더(`EcoNaviAR/assets/ads/`)에 복사합니다.
2. 파일명이 정확히 일치하는지 확인합니다:
   - `ad_recycling.png`
   - `ad_eco_transport.png`
   - `ad_forest.png`

이미지 파일이 추가되면 `AdBanner` 컴포넌트가 자동으로 로드합니다.

## 참고사항

- 이미지 파일이 없으면 임시 placeholder 이미지가 표시됩니다.
- 이미지를 추가한 후 Metro 번들러를 재시작해야 할 수 있습니다.
- 이미지가 표시되지 않으면 `npx react-native start --reset-cache` 명령어로 캐시를 초기화하세요.

