# 🔧 커밋 메시지 한글 깨짐 수정 가이드

## 문제 확인

커밋 메시지가 잘못된 인코딩으로 저장되어 GitHub에서도 깨져 보입니다.

## 해결 방법

### 옵션 1: 최근 커밋만 수정 (권장)

가장 최근 커밋 메시지만 수정:

```bash
# 최근 커밋 메시지 수정
git commit --amend -m "docs: 보안 감사 보고서 및 긴급 조치 가이드 추가"

# GitHub에 푸시 (force push 필요)
git push --force origin main
```

### 옵션 2: 여러 커밋 수정 (Interactive Rebase)

최근 여러 커밋의 메시지를 수정:

```bash
# 최근 5개 커밋 수정
git rebase -i HEAD~5

# 편집기에서 'pick'을 'reword' 또는 'r'로 변경
# 각 커밋의 메시지를 올바른 한글로 수정

# 완료 후
git push --force origin main
```

### 옵션 3: 전체 히스토리 재작성 (고급, 주의 필요)

모든 커밋 메시지를 수정하려면:

```bash
# ⚠️ 매우 위험: 협업 중이면 절대 사용하지 마세요
git filter-branch -f --msg-filter '
  case "$GIT_COMMIT" in
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
' -- --all

git push --force origin main
```

## ⚠️ 주의사항

1. **Force Push는 위험합니다**
   - 이미 다른 사람이 클론했다면 문제 발생 가능
   - 협업 중이라면 팀원들과 반드시 상의

2. **백업 권장**
   - 히스토리 재작성 전에 백업 브랜치 생성:
   ```bash
   git branch backup-before-rewrite
   ```

3. **GitHub에서 확인**
   - 푸시 후 GitHub 웹에서 한글이 정상 표시되는지 확인

## 권장 방법

**가장 안전한 방법:**
1. 앞으로는 영어로 커밋 메시지 작성
2. 또는 PowerShell 인코딩 설정 후 새 커밋만 올바르게 작성
3. 기존 커밋은 그대로 두고, 앞으로만 주의

**수정이 꼭 필요하다면:**
- 최근 1-2개 커밋만 수정 (옵션 1)
- 협업 중이 아니고 혼자 작업 중이라면 옵션 2 사용 가능



