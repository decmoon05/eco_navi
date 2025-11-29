# 📁 프로젝트 경로 이동 가이드

Windows에서 경로가 너무 길어 빌드가 실패하는 경우, 프로젝트를 짧은 경로로 이동해야 합니다.

## 🔍 문제

현재 경로: `C:\Users\WannaGoHome\Desktop\eco_navi`
- 경로가 너무 길어서 CMake 빌드 시 오류 발생 가능
- Windows 경로 길이 제한: 260자 (MAX_PATH)

## ✅ 해결 방법: 프로젝트 이동

### 1. 새 경로 선택

**권장 경로:**
- `C:\eco_navi` (가장 짧음)
- `C:\dev\eco_navi`
- `C:\projects\eco_navi`

### 2. 프로젝트 이동

#### 방법 1: 파일 탐색기 사용 (권장)

1. **현재 프로젝트 폴더 닫기**
   - VS Code, Android Studio 등 모든 에디터 종료
   - 터미널 종료

2. **파일 탐색기에서 이동**
   - `C:\Users\WannaGoHome\Desktop\eco_navi` 폴더 선택
   - `Ctrl + X` (잘라내기)
   - `C:\` 폴더로 이동
   - `Ctrl + V` (붙여넣기)

3. **새 경로 확인**
   - `C:\eco_navi` 폴더가 생성되었는지 확인

#### 방법 2: 명령줄 사용

**PowerShell (관리자 권한):**
```powershell
# 현재 위치 확인
cd C:\Users\WannaGoHome\Desktop

# 프로젝트 이동
Move-Item -Path "eco_navi" -Destination "C:\eco_navi"

# 이동 확인
cd C:\eco_navi
```

**또는 robocopy 사용 (더 안전):**
```powershell
# 복사
robocopy "C:\Users\WannaGoHome\Desktop\eco_navi" "C:\eco_navi" /E /MOVE

# 원본 폴더가 비어있으면 삭제
Remove-Item "C:\Users\WannaGoHome\Desktop\eco_navi" -ErrorAction SilentlyContinue
```

### 3. 이동 후 확인 사항

#### 3.1 Git 저장소 확인

```bash
cd C:\eco_navi
git status
```

Git이 정상적으로 작동하는지 확인합니다.

#### 3.2 서브모듈 확인

```bash
git submodule status
```

서브모듈이 정상적으로 연결되어 있는지 확인합니다.

#### 3.3 Android 빌드 캐시 정리 (선택)

```bash
cd EcoNaviAR\android
gradlew.bat clean
```

이전 빌드 캐시를 정리합니다.

### 4. 에디터 재설정

#### VS Code
1. `File` → `Open Folder`
2. `C:\eco_navi` 선택

#### Android Studio
1. `File` → `Open`
2. `C:\eco_navi\EcoNaviAR\android` 선택

### 5. 빌드 테스트

```bash
cd C:\eco_navi\EcoNaviAR\android
gradlew.bat assembleRelease
```

빌드가 정상적으로 완료되는지 확인합니다.

## 📊 경로 길이 비교

| 항목 | 이전 경로 | 새 경로 |
|------|----------|---------|
| 프로젝트 루트 | `C:\Users\WannaGoHome\Desktop\eco_navi` (42자) | `C:\eco_navi` (12자) |
| Android 빌드 | `...\android\app\build\...` | `...\android\app\build\...` |
| 총 경로 길이 | ~200자 이상 | ~150자 이하 |

## ⚠️ 주의사항

1. **Git 원격 저장소**
   - 경로 이동 후에도 Git 원격 저장소는 그대로 유지됩니다
   - 별도 설정 불필요

2. **환경 변수**
   - 프로젝트 경로를 참조하는 환경 변수가 있다면 업데이트 필요

3. **바로가기**
   - 바탕화면의 바로가기가 있다면 새 경로로 업데이트

4. **백업**
   - 이동 전에 중요한 변경사항이 있다면 커밋/푸시 권장

## 🔄 되돌리기

만약 문제가 발생하면:

```powershell
# 원래 위치로 다시 이동
Move-Item -Path "C:\eco_navi" -Destination "C:\Users\WannaGoHome\Desktop\eco_navi"
```

## ✅ 완료 확인

이동 후 다음을 확인하세요:

- [ ] 프로젝트가 `C:\eco_navi`에 있음
- [ ] Git이 정상 작동
- [ ] 서브모듈이 정상 연결
- [ ] 빌드가 정상 완료

---

**추가 도움이 필요하시면 이슈를 생성해주세요!** 📁

