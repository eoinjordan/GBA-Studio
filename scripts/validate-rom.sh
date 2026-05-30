#!/usr/bin/env bash
set -euo pipefail

ROM_PATH="${1:?Usage: scripts/validate-rom.sh path/to/game.gba}"

if [[ ! -f "$ROM_PATH" ]]; then
  echo "ROM not found: $ROM_PATH" >&2
  exit 1
fi

if [[ ! "$ROM_PATH" =~ \.gba$ ]]; then
  echo "ROM path must end in .gba: $ROM_PATH" >&2
  exit 1
fi

SIZE_BYTES=$(wc -c < "$ROM_PATH" | tr -d ' ')
if [[ "$SIZE_BYTES" -le 0 ]]; then
  echo "ROM is empty: $ROM_PATH" >&2
  exit 1
fi

echo "ROM exists and is non-empty: $ROM_PATH ($SIZE_BYTES bytes)"
