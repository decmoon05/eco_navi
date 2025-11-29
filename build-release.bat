@echo off
echo ========================================
echo EcoNaviAR 릴리즈 빌드 시작
echo ========================================
echo.

REM 현재 경로 확인
echo 현재 경로: %CD%
echo.

REM 경로가 너무 긴지 확인 (경고만 표시)
set "current_path=%CD%"
if /i "%current_path:~0,1%"=="C" (
    set "path_length=%current_path:~0,50%"
    if not "%path_length:Users\WannaGoHome\Desktop=%"=="%path_length%" (
        echo ⚠️  경고: 프로젝트 경로가 깁니다.
        echo    빌드 실패 시 프로젝트를 C:\eco_navi로 이동하세요.
        echo    자세한 내용: docs\PROJECT_PATH_MOVE_GUIDE.md
        echo.
    )
)

cd EcoNaviAR\android

echo Gradle 빌드 실행 중...
call gradlew.bat assembleRelease

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✅ 빌드 완료!
    echo ========================================
    echo.
    echo APK 위치:
    echo %CD%\app\build\outputs\apk\release\app-release.apk
    echo.
    echo 이 파일을 휴대폰으로 전송하여 설치하세요.
    echo.
) else (
    echo.
    echo ❌ 빌드 실패!
    echo.
    echo 가능한 원인:
    echo 1. 프로젝트 경로가 너무 깁니다
    echo    → C:\eco_navi로 이동하세요 (docs\PROJECT_PATH_MOVE_GUIDE.md 참고)
    echo 2. Gradle 캐시 문제
    echo    → gradlew.bat clean 실행 후 다시 시도
    echo 3. 메모리 부족
    echo    → 다른 프로그램 종료 후 다시 시도
    echo.
)

pause

