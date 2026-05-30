#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

echo "[bootstrap] repo: ${ROOT_DIR}"

if [[ -f ".nvmrc" ]]; then
  if command -v nvm >/dev/null 2>&1; then
    echo "[bootstrap] using nvm + .nvmrc"
    nvm install
    nvm use
  else
    echo "[bootstrap] .nvmrc present but nvm not found; continuing with current node"
  fi
fi

echo "[bootstrap] node: $(node -v)"
echo "[bootstrap] npm:  $(npm -v)"

echo "[bootstrap] enabling corepack (yarn via corepack)"
corepack enable

echo "[bootstrap] installing dependencies with yarn"
yarn install --immutable || yarn install

echo "[bootstrap] fetching toolchain/external deps"
npm run fetch-deps

echo "[bootstrap] starting app"
npm start
