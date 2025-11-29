# 커밋 제목 한글 수정 스크립트
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

Write-Host "=== 커밋 제목 한글 수정 ===" -ForegroundColor Yellow

# 각 커밋을 개별적으로 수정
$commits = @(
    @{hash="2aa2a0e"; newTitle="docs: 보안 감사 보고서 및 긴급 조치 가이드 추가"},
    @{hash="82de042"; newTitle="docs: SHA-1 지문 확인 가이드 추가 및 현재 프로젝트 SHA-1 지문 정보 업데이트"},
    @{hash="77e8344"; newTitle="docs: API 키 교체 가이드 추가"},
    @{hash="9b0b048"; newTitle="security: API 키 노출 문제 해결"},
    @{hash="53ebe22"; newTitle="feat: 보안 개선 및 외부 접속 지원"}
)

Write-Host "`n수정할 커밋:" -ForegroundColor Cyan
foreach ($commit in $commits) {
    Write-Host "$($commit.hash) -> $($commit.newTitle)" -ForegroundColor White
}

Write-Host "`n각 커밋을 순서대로 수정합니다..." -ForegroundColor Green

# 역순으로 수정 (가장 오래된 것부터)
for ($i = $commits.Length - 1; $i -ge 0; $i--) {
    $commit = $commits[$i]
    Write-Host "`n[$($commits.Length - $i)/$($commits.Length)] $($commit.hash) 수정 중..." -ForegroundColor Yellow
    
    # 해당 커밋으로 이동하여 수정
    $newTitle = $commit.newTitle
    $newTitle | Out-File -Encoding utf8 -FilePath temp_commit_msg.txt
    
    # git commit --amend를 사용하려면 해당 커밋으로 checkout 필요
    # 대신 filter-branch 사용
}

Write-Host "`nfilter-branch를 사용하여 일괄 수정합니다..." -ForegroundColor Green

# filter-branch로 일괄 수정
$script = @"
case `$GIT_COMMIT in
    2aa2a0e*)
        echo "docs: 보안 감사 보고서 및 긴급 조치 가이드 추가"
        ;;
    82de042*)
        echo "docs: SHA-1 지문 확인 가이드 추가 및 현재 프로젝트 SHA-1 지문 정보 업데이트"
        ;;
    77e8344*)
        echo "docs: API 키 교체 가이드 추가"
        ;;
    9b0b048*)
        echo "security: API 키 노출 문제 해결"
        ;;
    53ebe22*)
        echo "feat: 보안 개선 및 외부 접속 지원"
        ;;
    *)
        cat
        ;;
esac
"@

$script | Out-File -Encoding utf8 -FilePath filter_script.sh

Write-Host "수정 스크립트를 생성했습니다. 계속하시겠습니까? (y/n): " -NoNewline -ForegroundColor Yellow
$response = Read-Host
if ($response -ne "y") {
    Write-Host "취소되었습니다." -ForegroundColor Red
    exit
}

# Git Bash를 통해 filter-branch 실행
Write-Host "`nGit Bash를 통해 filter-branch를 실행합니다..." -ForegroundColor Green
Write-Host "또는 수동으로 다음 명령어를 실행하세요:" -ForegroundColor Yellow
Write-Host "git filter-branch -f --msg-filter 'bash filter_script.sh' HEAD~5..HEAD" -ForegroundColor Cyan



