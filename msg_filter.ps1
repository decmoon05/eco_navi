# PowerShell 커밋 메시지 필터
$input = $input
$commit = $env:GIT_COMMIT

switch ($commit.Substring(0, 7)) {
    "2aa2a0e" { "docs: 보안 감사 보고서 및 긴급 조치 가이드 추가" }
    "82de042" { "docs: SHA-1 지문 확인 가이드 추가 및 현재 프로젝트 SHA-1 지문 정보 업데이트" }
    "77e8344" { "docs: API 키 교체 가이드 추가" }
    "9b0b048" { "security: API 키 노출 문제 해결" }
    "53ebe22" { "feat: 보안 개선 및 외부 접속 지원" }
    default { $input }
}

