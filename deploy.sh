#!/usr/bin/env bash
# =============================================================================
# deploy.sh — sziklaizsolt.hu deploy
#
# Egysoros deploy a Claude CLI website skill-jén keresztül.
# Nincs interaktív kérdés: a script automatikusan jóváhagyja a műveleteket.
#
# Használat:
#   ./deploy.sh           # teljes site deploy
#   ./deploy.sh avc       # csak az /avc/ alkönyvtár deploy-ja
#   ./deploy.sh dry       # dry-run (rsync --dry-run) — semmit nem ír felül
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# claude CLI elérhetőség
if ! command -v claude >/dev/null 2>&1; then
  echo "✗ Hiányzó parancs: claude (Claude Code CLI)"
  echo "  Telepítés: https://docs.anthropic.com/claude/code"
  exit 1
fi

MODE="${1:-full}"

case "$MODE" in
  full)
    TARGET="."
    SCOPE="teljes site"
    REMOTE_PATH="webroot"
    ;;
  avc)
    TARGET="avc/"
    SCOPE="/avc/ alkönyvtár"
    REMOTE_PATH="webroot/avc/"
    ;;
  dry)
    TARGET="."
    SCOPE="teljes site (DRY-RUN)"
    REMOTE_PATH="webroot"
    ;;
  *)
    echo "Ismeretlen mód: $MODE (használat: full | avc | dry)"
    exit 2
    ;;
esac

echo "→ Deploy: $SCOPE → sziklaizsolt.hu:$REMOTE_PATH"
echo "→ Forrás: $ROOT/$TARGET"
echo

# Kihagyandó fájlok / mappák — fejlesztési artefaktok
EXCLUDES=(
  ".git"
  ".gitignore"
  ".DS_Store"
  "deploy.sh"
  "screenshots"
  "uploads"
  "v1"
  "*.md"
)
EXCLUDE_ARGS=""
for e in "${EXCLUDES[@]}"; do
  EXCLUDE_ARGS+=" --exclude '$e'"
done

# A Claude CLI-nek átadott utasítás. A website skill ismeri a kapcsolatot.
# A --dangerously-skip-permissions flag automatikusan jóváhagyja a fájlmûveleteket.
PROMPT="A website skill segítségével deployold a '$TARGET' tartalmát a sziklaizsolt.hu $REMOTE_PATH-ba. \
Használd rsync-et a következő kizárásokkal:$EXCLUDE_ARGS. \
$([ "$MODE" = "dry" ] && echo "DRY-RUN módban — semmit nem írj felül." || echo "Hajtsd végre a deploy-t.") \
Ne kérdezz semmit, ne kérj megerősítést. Végén csak a végeredményt jelentsd: hány fájl módosult, hány új, hány törlésre került."

echo "→ Claude utasítás:"
echo "  $PROMPT"
echo

claude --dangerously-skip-permissions -p "$PROMPT"
