#!/usr/bin/env bash
set -euo pipefail

PROJECT_PATH="${1:-examples/blank/project.gbasproj}"
OUTPUT_ROM="${2:-build/rom/game.gba}"

node src/cli.js validate "$PROJECT_PATH"
node src/cli.js make:gba "$PROJECT_PATH" "$OUTPUT_ROM"
