#!/usr/bin/env bash
# Build extension and produce a zip that expands to a folder loadable by Chrome.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

die() {
  echo "error: $*" >&2
  exit 1
}

json_version() {
  python3 - "$1" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as source:
    print(json.load(source)["version"])
PY
}

sha256_file() {
  python3 - "$1" <<'PY'
import hashlib
import pathlib
import sys

digest = hashlib.sha256()
with pathlib.Path(sys.argv[1]).open("rb") as source:
    for chunk in iter(lambda: source.read(1024 * 1024), b""):
        digest.update(chunk)
print(digest.hexdigest())
PY
}

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  VERSION="$(json_version package.json)"
fi
ROOT_VER="$(json_version package.json)"
EXT_VER="$(json_version packages/extension/package.json)"
MAN_VER="$(json_version packages/extension/public/manifest.json)"

if [[ "$ROOT_VER" != "$VERSION" || "$EXT_VER" != "$VERSION" || "$MAN_VER" != "$VERSION" ]]; then
  die "version mismatch: requested=$VERSION root=$ROOT_VER extension=$EXT_VER manifest=$MAN_VER"
fi

OUT_DIR="$ROOT/release"
STAGE="$OUT_DIR/yindex-extension"
ZIP_NAME="yindex-extension-v${VERSION}.zip"
ZIP_PATH="$OUT_DIR/$ZIP_NAME"
LATEST_PATH="$OUT_DIR/yindex-extension-latest.zip"

[[ "$(basename "$STAGE")" == "yindex-extension" ]] || die "staged folder must be named yindex-extension"

echo "==> install deps (if needed)"
if [[ ! -d node_modules ]]; then
  bun install
fi

echo "==> test"
bun run test

echo "==> build"
bun run build

DIST="$ROOT/packages/extension/dist"
[[ -f "$DIST/manifest.json" ]] || die "missing $DIST/manifest.json"
[[ -f "$DIST/newtab.html" ]] || die "missing $DIST/newtab.html"

echo "==> stage release folder"
rm -rf "$STAGE"
mkdir -p "$STAGE"
cp -a "$DIST"/. "$STAGE"/
find "$STAGE" -name '*.map' -type f -delete

[[ -f "$STAGE/manifest.json" ]] || die "staged manifest.json is missing"
[[ -f "$STAGE/newtab.html" ]] || die "staged newtab.html is missing"
[[ -f "$STAGE/background.js" ]] || die "staged background.js is missing"
[[ -d "$STAGE/icons" ]] || die "staged icons directory is missing"
[[ -d "$STAGE/examples/pomodoro" ]] || die "staged examples/pomodoro package is missing"
[[ -f "$STAGE/examples/pomodoro/manifest.json" ]] || die "staged Pomodoro manifest is missing"
[[ -f "$STAGE/examples/pomodoro/timer.html" ]] || die "staged Pomodoro entry is missing"

MAP_PATH="$(find "$STAGE" -name '*.map' -type f -print -quit)"
[[ -z "$MAP_PATH" ]] || die "source map remains in staged output: $MAP_PATH"

python3 - "$STAGE" "$VERSION" <<'PY'
import json
import pathlib
import re
import sys

stage = pathlib.Path(sys.argv[1])
version = sys.argv[2]


def fail(message: str) -> None:
    raise SystemExit(f"error: {message}")


with (stage / "manifest.json").open(encoding="utf-8") as source:
    manifest = json.load(source)

if manifest.get("version") != version:
    fail(
        "staged manifest version mismatch: "
        f"requested={version} staged={manifest.get('version')}"
    )

permissions = manifest.get("permissions")
if not isinstance(permissions, list) or "unlimitedStorage" not in permissions:
    fail("staged manifest must grant unlimitedStorage")

content_security_policy = manifest.get("content_security_policy")
if not isinstance(content_security_policy, dict):
    fail("staged manifest content_security_policy must be an object")
csp = content_security_policy.get("extension_pages")
if not isinstance(csp, str):
    fail("staged manifest extension_pages CSP is missing")

directives: dict[str, list[str]] = {}
for raw_directive in csp.split(";"):
    tokens = raw_directive.split()
    if tokens:
        directives[tokens[0]] = tokens[1:]

if directives.get("worker-src") != ["'self'"]:
    fail("staged CSP must set worker-src 'self' only")
for directive in ("img-src", "media-src", "frame-src"):
    sources = directives.get(directive, [])
    if "'self'" not in sources or "blob:" not in sources:
        fail(f"staged CSP {directive} must contain 'self' and blob:")

if "sandbox" in manifest:
    fail("staged manifest must not declare the retired sandbox wrapper")
if "sandbox" in content_security_policy or "sandbox" in directives:
    fail("staged CSP must not declare a retired sandbox policy")
if (stage / "sandbox.html").exists():
    fail("retired sandbox.html must not be staged")

newtab = (stage / "newtab.html").read_text(encoding="utf-8")
if 'src="./' not in newtab:
    fail('staged newtab.html must contain src="./ relative assets')
asset_references = re.findall(r"\b(?:src|href)=[\"']([^\"']+)[\"']", newtab)
non_relative = [reference for reference in asset_references if not reference.startswith("./")]
if not asset_references or non_relative:
    fail(f"staged newtab.html contains non-relative assets: {non_relative}")

javascript = [path.read_text(encoding="utf-8") for path in stage.rglob("*.js")]
package_sandbox = "allow-scripts allow-forms allow-modals"
if not any(package_sandbox in source for source in javascript):
    fail("staged Package iframe sandbox decision is missing")
if any("allow-same-origin" in source for source in javascript):
    fail("staged Package iframe sandbox must not allow same-origin")
PY

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

python3 - "$ZIP_PATH" <<'PY'
import sys
import zipfile

with zipfile.ZipFile(sys.argv[1]) as archive:
    names = archive.namelist()

if not names or any(not name.startswith("yindex-extension/") for name in names):
    raise SystemExit("error: zip root must be yindex-extension/")
if "yindex-extension/manifest.json" not in names:
    raise SystemExit("error: zip is missing yindex-extension/manifest.json")
if any(name.endswith(".map") for name in names):
    raise SystemExit("error: zip must not contain source maps")
PY

cp -f "$ZIP_PATH" "$LATEST_PATH"
VERSIONED_SHA="$(sha256_file "$ZIP_PATH")"
LATEST_SHA="$(sha256_file "$LATEST_PATH")"
[[ "$VERSIONED_SHA" == "$LATEST_SHA" ]] || die "latest zip SHA-256 does not match versioned zip"
printf '%s  %s\n' "$VERSIONED_SHA" "$ZIP_NAME" > "${ZIP_PATH}.sha256"

SIZE=$(wc -c < "$ZIP_PATH" | tr -d ' ')
echo "==> done: $ZIP_PATH ($SIZE bytes)"
echo "==> latest: $LATEST_PATH"
echo "==> sha256: $VERSIONED_SHA"
echo "Unzip, then Chrome → 扩展程序 → 加载已解压的扩展程序 → 选择 yindex-extension/ 文件夹"
echo "Updates: overwrite the same yindex-extension/ folder, then click 重新加载"
