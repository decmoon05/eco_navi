# 안전한 커밋 제목 수정 스크립트
# ⚠️ 주의: Force push가 필요하지만, 코드 변경은 없습니다.

Write-Host "=== 커밋 제목 한글 수정 (안전 모드) ===" -ForegroundColor Yellow
Write-Host "`n이 스크립트는 커밋 제목만 수정합니다. 코드는 변경되지 않습니다." -ForegroundColor Green
Write-Host "`n수정할 커밋:" -ForegroundColor Cyan

$commits = @(
    @{hash="2aa2a0e"; title="docs: 보안 감사 보고서 및 긴급 조치 가이드 추가"},
    @{hash="82de042"; title="docs: SHA-1 지문 확인 가이드 추가 및 현재 프로젝트 SHA-1 지문 정보 업데이트"},
    @{hash="77e8344"; title="docs: API 키 교체 가이드 추가"},
    @{hash="9b0b048"; title="security: API 키 노출 문제 해결"},
    @{hash="53ebe22"; title="feat: 보안 개선 및 외부 접속 지원"}
)

for ($i = 0; $i -lt $commits.Length; $i++) {
    Write-Host "$($i+1). $($commits[$i].hash) - $($commits[$i].title)" -ForegroundColor White
}

Write-Host "`n⚠️ 주의사항:" -ForegroundColor Red
Write-Host "1. Force push가 필요합니다 (git push --force)" -ForegroundColor Yellow
Write-Host "2. 다른 사람이 이미 pull 받았다면 문제가 될 수 있습니다" -ForegroundColor Yellow
Write-Host "3. 혼자 작업 중이라면 안전합니다" -ForegroundColor Green
Write-Host "4. 백업 브랜치를 먼저 생성하는 것을 권장합니다" -ForegroundColor Yellow

Write-Host "`n계속하시겠습니까? (y/n): " -NoNewline -ForegroundColor Yellow
$response = Read-Host
if ($response -ne "y") {
    Write-Host "취소되었습니다." -ForegroundColor Red
    exit
}

# 백업 브랜치 생성
Write-Host "`n백업 브랜치를 생성합니다..." -ForegroundColor Green
$backupBranch = "backup-before-rewrite-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
git branch $backupBranch
Write-Host "백업 브랜치 생성 완료: $backupBranch" -ForegroundColor Green

Write-Host "`nInteractive rebase를 시작합니다..." -ForegroundColor Green
Write-Host "편집기가 열리면:" -ForegroundColor Yellow
Write-Host "1. 각 커밋의 'pick'을 'reword' 또는 'r'로 변경" -ForegroundColor White
Write-Host "2. 저장하고 닫으면 각 커밋의 메시지 편집기가 열립니다" -ForegroundColor White
Write-Host "3. 각 커밋의 제목을 위에 표시된 한글로 수정" -ForegroundColor White
Write-Host "`n계속하려면 Enter를 누르세요..." -NoNewline
Read-Host

# 최근 5개 커밋 수정
git rebase -i HEAD~5

Write-Host "`n수정이 완료되었습니다!" -ForegroundColor Green
Write-Host "`nGitHub에 푸시하시겠습니까? (y/n): " -NoNewline -ForegroundColor Yellow
$push = Read-Host
if ($push -eq "y") {
    Write-Host "`nForce push를 수행합니다..." -ForegroundColor Yellow
    git push --force origin main
    Write-Host "`n✅ 푸시 완료!" -ForegroundColor Green
    Write-Host "GitHub에서 커밋 메시지가 정상적으로 표시되는지 확인하세요." -ForegroundColor Cyan
} else {
    Write-Host "`n푸시를 취소했습니다." -ForegroundColor Yellow
    Write-Host "나중에 'git push --force origin main'으로 푸시하세요." -ForegroundColor Yellow
    Write-Host "백업 브랜치: $backupBranch" -ForegroundColor Cyan
}



