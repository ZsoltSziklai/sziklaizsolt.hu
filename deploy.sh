#!/usr/bin/env bash
# =============================================================================
# deploy.sh — sziklaizsolt.hu deploy
#
# Közvetlen rsync SSH-n keresztül. Nem hív Claude CLI-t — determinisztikus.
#
# Használat:
#   ./deploy.sh           # teljes site deploy (--delete NÉLKÜL, biztonságos)
#   ./deploy.sh avc       # csak az /avc/ alkönyvtár (--delete ON, teljes sync)
#   ./deploy.sh dry       # dry-run (rsync -n) — semmit nem ír felül
#
# Webroot: ~/public_html/ (fő domain a cPanel gyökeréből szolgál!)
# Lásd: memory/deploy_sziklaizsolt_hu.md
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

SSH_KEY="$HOME/.ssh/id_rsa_sziklaizsolt_hu"
REMOTE_USER="sziklaiz"
REMOTE_HOST="sziklaizsolt.hu"
REMOTE_WEBROOT="~/public_html"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "✗ SSH kulcs nem található: $SSH_KEY" >&2
  exit 1
fi

MODE="${1:-full}"

# Közös rsync flag-ek
RSYNC_BASE=(rsync -avz --human-readable
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new")

# Kihagyandó fájlok / mappák
EXCLUDES=(
  --exclude='.git'
  --exclude='.gitignore'
  --exclude='.gitattributes'
  --exclude='.claude'
  --exclude='.vscode'
  --exclude='.idea'
  --exclude='.DS_Store'
  --exclude='._*'
  --exclude='deploy.sh'
  --exclude='node_modules'
  --exclude='screenshots'
  --exclude='uploads'
  --exclude='v1'
  --exclude='sourcefiles'
  --exclude='.deploy-backup-*'
  --exclude='.env'
  --exclude='.env.*'
)

case "$MODE" in
  full)
    SRC="./"
    DST="$REMOTE_USER@$REMOTE_HOST:$REMOTE_WEBROOT/"
    SCOPE="teljes site → $DST (--delete NÉLKÜL)"
    DELETE_FLAG=()
    DRY_FLAG=()
    ;;
  avc)
    SRC="./avc/"
    DST="$REMOTE_USER@$REMOTE_HOST:$REMOTE_WEBROOT/avc/"
    SCOPE="/avc/ alkönyvtár → $DST (--delete ON)"
    DELETE_FLAG=(--delete)
    DRY_FLAG=()
    ;;
  dry)
    SRC="./"
    DST="$REMOTE_USER@$REMOTE_HOST:$REMOTE_WEBROOT/"
    SCOPE="teljes site DRY-RUN → $DST"
    DELETE_FLAG=()
    DRY_FLAG=(--dry-run)
    ;;
  *)
    echo "Ismeretlen mód: $MODE (használat: full | avc | dry)" >&2
    exit 2
    ;;
esac

echo "→ Deploy: $SCOPE"
echo "→ Forrás: $ROOT/${SRC#./}"
echo

"${RSYNC_BASE[@]}" \
  "${EXCLUDES[@]}" \
  ${DELETE_FLAG[@]+"${DELETE_FLAG[@]}"} \
  ${DRY_FLAG[@]+"${DRY_FLAG[@]}"} \
  "$SRC" "$DST"

echo
echo "→ Verifikáció (cache-busted):"
TS=$(date +%s)
for path in "" "styles.css" "app.jsx" "avc/"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://sziklaizsolt.hu/${path}?v=$TS")
  echo "  $code  https://sziklaizsolt.hu/${path}"
done
