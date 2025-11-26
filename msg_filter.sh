#!/bin/bash
# Git 커밋 메시지 한글 수정 스크립트

# 현재 커밋 해시 읽기
COMMIT_HASH=$(git rev-parse HEAD)

case "$COMMIT_HASH" in
    2aa2a0e3814b8bc7d58d33695c68830c236d4a32)
        echo "docs: 보안 감사 보고서 및 긴급 조치 가이드 추가"
        ;;
    82de042edb9c8ca10164b5de7584e38d9581d1a7)
        echo "docs: SHA-1 지문 확인 가이드 추가 및 현재 프로젝트 SHA-1 지문 정보 업데이트"
        ;;
    77e83448a536032e03150886f18453f40ce0d99c)
        echo "docs: API 키 교체 가이드 추가"
        ;;
    9b0b048b0792054dddafc16eeffc130f3c009aa7)
        echo "security: API 키 노출 문제 해결"
        ;;
    53ebe22557184a30a3acb3924705a5ebe2eb83d1)
        echo "feat: 보안 개선 및 외부 접속 지원"
        ;;
    *)
        cat
        ;;
esac



