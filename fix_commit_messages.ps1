# Git 커밋 메시지 한글 깨짐 수정 스크립트
# ⚠️ 주의: 이 스크립트는 force push를 수행합니다. 협업 중이면 사용하지 마세요.

Write-Host "=== Git 커밋 메시지 수정 스크립트 ===" -ForegroundColor Yellow
Write-Host "`n수정할 커밋:" -ForegroundColor Cyan
Write-Host "1. 2aa2a0e - docs: 보안 감사 보고서 및 긴급 조치 가이드 추가"
Write-Host "2. 82de042 - docs: SHA-1 지문 확인 가이드 추가 및 현재 프로젝트 SHA-1 지문 정보 업데이트"
Write-Host "3. 77e8344 - docs: API 키 교체 가이드 추가"
Write-Host "4. 9b0b048 - security: API 키 노출 문제 해결"
Write-Host "5. 53ebe22 - feat: 보안 개선 및 외부 접속 지원"
Write-Host "`n⚠️ 이 작업은 force push가 필요합니다!" -ForegroundColor Red
Write-Host "계속하시겠습니까? (y/n): " -NoNewline -ForegroundColor Yellow

$response = Read-Host
if ($response -ne "y") {
    Write-Host "취소되었습니다." -ForegroundColor Red
    exit
}

# Interactive rebase 시작
Write-Host "`n최근 5개 커밋을 수정합니다..." -ForegroundColor Green
Write-Host "편집기가 열리면 각 커밋의 'pick'을 'reword' 또는 'r'로 변경하세요." -ForegroundColor Yellow
Write-Host "그리고 각 커밋 메시지를 올바른 한글로 수정하세요." -ForegroundColor Yellow
Write-Host "`n계속하려면 Enter를 누르세요..." -NoNewline
Read-Host

git rebase -i HEAD~5

Write-Host "`n수정이 완료되었습니다. GitHub에 푸시하시겠습니까? (y/n): " -NoNewline -ForegroundColor Yellow
$push = Read-Host
if ($push -eq "y") {
    git push --force origin main
    Write-Host "푸시 완료!" -ForegroundColor Green
} else {
    Write-Host "푸시를 취소했습니다. 나중에 'git push --force origin main'으로 푸시하세요." -ForegroundColor Yellow
}



