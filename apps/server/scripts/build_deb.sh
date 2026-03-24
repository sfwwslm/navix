#!/usr/bin/env bash
set -euo pipefail

# sudo dpkg -i target/navix-server_0.1.0-alpha.1_amd64.deb
# sudo systemctl daemon-reload
# sudo systemctl enable navix-server
# sudo systemctl start navix-server

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SERVER_DIR/../.." && pwd)"

PACKAGE_DIR="$SERVER_DIR/package"
CONTROL_FILE="$PACKAGE_DIR/DEBIAN/control"
OUTPUT_DIR="$REPO_ROOT/target"
PRIMARY_BIN="$REPO_ROOT/target/release/navix-server"
FALLBACK_BIN="$SERVER_DIR/target/release/navix-server"

if [[ -x "$PRIMARY_BIN" ]]; then
  BIN_PATH="$PRIMARY_BIN"
elif [[ -x "$FALLBACK_BIN" ]]; then
  BIN_PATH="$FALLBACK_BIN"
else
  echo "未找到可执行文件: $PRIMARY_BIN 或 $FALLBACK_BIN" >&2
  echo "请先执行: cargo build --release -p navix-server" >&2
  exit 1
fi

version="$(awk '
  /^\[workspace\.package\]/ { in_section = 1; next }
  /^\[/ { if (in_section) exit }
  in_section && /version[[:space:]]*=/ {
    if (match($0, /"[^"]+"/)) {
      print substr($0, RSTART + 1, RLENGTH - 2)
      exit
    }
  }
' "$REPO_ROOT/Cargo.toml")"
version="${version:-latest}"

if [[ ! -f "$CONTROL_FILE" ]]; then
  echo "找不到 control 文件: $CONTROL_FILE" >&2
  exit 1
fi

CONTROL_BAK="${CONTROL_FILE}.bak"
cp "$CONTROL_FILE" "$CONTROL_BAK"
trap 'mv -f "$CONTROL_BAK" "$CONTROL_FILE" 2>/dev/null || true' EXIT
sed -i "s/^Version: .*/Version: ${version}/" "$CONTROL_FILE"

mkdir -p "$PACKAGE_DIR/usr/bin" "$OUTPUT_DIR"
install -m 0755 "$BIN_PATH" "$PACKAGE_DIR/usr/bin/navix-server"

# dpkg-deb 要求 maintainer scripts 具备可执行权限
for maintainer_script in preinst postinst prerm postrm; do
  script_path="$PACKAGE_DIR/DEBIAN/$maintainer_script"
  if [[ -f "$script_path" ]]; then
    chmod 0755 "$script_path"
  fi
done

OUTPUT_DEB="$OUTPUT_DIR/navix-server_${version}_amd64.deb"
rm -f "$OUTPUT_DEB"
dpkg-deb --build "$PACKAGE_DIR" "$OUTPUT_DEB"

echo "✅ .deb 打包完成: $OUTPUT_DEB"
