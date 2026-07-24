#!/usr/bin/env bash
# Build extension and produce a zip that expands to a folder loadable by Chrome.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  VERSION="$(python3 -c "import json; print(json.load(open('package.json'))['version'])")"
fi
OUT_DIR="$ROOT/release"
STAGE="$OUT_DIR/yindex-extension"
ZIP_NAME="yindex-extension-v${VERSION}.zip"
ZIP_PATH="$OUT_DIR/$ZIP_NAME"

echo "==> install deps (if needed)"
if [[ ! -d node_modules ]]; then
  bun install
fi

echo "==> test"
bun test

echo "==> build"
bun run build

DIST="$ROOT/packages/extension/dist"
if [[ ! -f "$DIST/manifest.json" ]]; then
  echo "error: missing $DIST/manifest.json" >&2
  exit 1
fi
if ! grep -q 'src="\./' "$DIST/newtab.html"; then
  echo "error: newtab.html must use relative asset paths" >&2
  exit 1
fi

echo "==> stage release folder"
rm -rf "$STAGE"
mkdir -p "$STAGE"
cp -a "$DIST"/. "$STAGE"/
find "$STAGE" -name '*.map' -type f -delete

test -f "$STAGE/manifest.json"
test -f "$STAGE/newtab.html"
test -f "$STAGE/background.js"
test -d "$STAGE/icons"
test -d "$STAGE/examples/pomodoro"

echo "==> zip"
mkdir -p "$OUT_DIR"
rm -f "$ZIP_PATH"
(
  cd "$OUT_DIR"
  if command -v zip >/dev/null 2>&1; then
    zip -r -q "$ZIP_NAME" "yindex-extension"
  else
    python3 - "$ZIP_NAME" <<'PY'
import sys, zipfile, pathlib
name = sys.argv[1]
root = pathlib.Path("yindex-extension")
with zipfile.ZipFile(name, "w", zipfile.ZIP_DEFLATED) as z:
    for p in root.rglob("*"):
        if p.is_file():
            z.write(p, p.as_posix())
print("wrote", name)
PY
  fi
)

cp -f "$ZIP_PATH" "$OUT_DIR/yindex-extension-latest.zip"
SIZE=$(wc -c < "$ZIP_PATH" | tr -d ' ')
echo "==> done: $ZIP_PATH ($SIZE bytes)"
echo "Unzip, then Chrome → 扩展程序 → 加载已解压的扩展程序 → 选择 yindex-extension 文件夹"
