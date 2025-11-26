# 🔧 Git 한글 인코딩 문제 해결 가이드

## 문제 상황

Git 커밋 메시지나 파일명의 한글이 깨져서 표시되는 문제입니다.

## 원인

Windows PowerShell의 기본 인코딩이 UTF-8이 아니거나, Git 설정이 올바르지 않을 수 있습니다.

## 해결 방법

### 1. Git 전역 설정 (이미 적용됨)

```bash
# 한글 파일명 정상 표시
git config --global core.quotepath false

# 커밋 메시지 인코딩
git config --global i18n.commitencoding utf-8

# 로그 출력 인코딩
git config --global i18n.logoutputencoding utf-8
```

### 2. PowerShell 인코딩 설정

PowerShell에서 한글이 깨질 때:

```powershell
# 현재 세션에서만 적용
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001

# 또는 PowerShell 프로필에 추가 (영구 적용)
# $PROFILE 파일에 다음 추가:
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
```

### 3. GitHub 웹에서 깨질 때

GitHub 웹 인터페이스에서 한글이 깨져 보이는 경우:

1. **브라우저 인코딩 확인**
   - 브라우저가 UTF-8로 설정되어 있는지 확인

2. **커밋 메시지 재작성** (필요한 경우)
   - 이미 푸시된 커밋 메시지를 수정하려면 히스토리 재작성 필요
   - ⚠️ 주의: 협업 중이라면 팀원들과 상의 필요

### 4. 이미 푸시된 커밋 메시지 수정 (선택사항)

만약 GitHub에서도 한글이 깨져 보인다면:

```bash
# 최근 커밋 메시지 수정 (아직 푸시 안 했을 때)
git commit --amend -m "새로운 커밋 메시지"

# 이미 푸시했다면
git commit --amend -m "새로운 커밋 메시지"
git push --force  # ⚠️ 주의: 협업 중이면 위험
```

### 5. 전체 히스토리 재작성 (고급, 주의 필요)

모든 커밋 메시지를 수정하려면:

```bash
# interactive rebase 사용
git rebase -i HEAD~10  # 최근 10개 커밋

# 또는 filter-branch 사용 (전체 히스토리)
# ⚠️ 매우 위험: 협업 중이면 절대 사용하지 마세요
```

## 확인 방법

설정이 올바르게 적용되었는지 확인:

```bash
# Git 설정 확인
git config --list | grep -i encoding

# 한글 커밋 메시지 테스트
git log --oneline -5
```

## 현재 상태

✅ Git 전역 설정 완료:
- `core.quotepath = false`
- `i18n.commitencoding = utf-8`
- `i18n.logoutputencoding = utf-8`

## 참고

- Git은 내부적으로 UTF-8을 사용하므로 커밋 메시지는 정상적으로 저장됩니다
- PowerShell이나 터미널의 인코딩 설정만 조정하면 됩니다
- GitHub 웹 인터페이스는 자동으로 UTF-8을 인식합니다

---

**추가 문제가 있으면 이슈를 생성해주세요!** 🚀



