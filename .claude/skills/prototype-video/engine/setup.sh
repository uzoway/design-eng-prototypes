#!/bin/sh
# One-time setup for the prototype video engine. Installs into ~/.cache/prototype-video
# so no project's package.json or lockfile changes. Safe to re-run.
set -e
C="$HOME/.cache/prototype-video"
mkdir -p "$C"
[ -f "$C/package.json" ] || echo '{"private":true}' > "$C/package.json"
[ -d "$C/node_modules/playwright-core" ] || npm --prefix "$C" install --silent playwright-core@1.64.1
[ -x "$C/venv/bin/python" ] || python3 -m venv "$C/venv"
"$C/venv/bin/python" -c "import PIL, numpy" 2>/dev/null || "$C/venv/bin/pip" install --quiet --disable-pip-version-check pillow==11.3.0 numpy
command -v ffmpeg >/dev/null || { echo "ffmpeg missing: brew install ffmpeg"; exit 1; }
[ -d "/Applications/Google Chrome.app" ] || { echo "Google Chrome missing"; exit 1; }
echo "ready: node + $C/venv/bin/python"
