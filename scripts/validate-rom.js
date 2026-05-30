#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const romPath = process.argv[2];

if (!romPath) {
  process.stderr.write("Usage: node scripts/validate-rom.js path/to/game.gba\n");
  process.exit(1);
}

if (path.extname(romPath).toLowerCase() !== ".gba") {
  process.stderr.write(`ROM path must end in .gba: ${romPath}\n`);
  process.exit(1);
}

if (!fs.existsSync(romPath)) {
  process.stderr.write(`ROM not found: ${romPath}\n`);
  process.exit(1);
}

const stat = fs.statSync(romPath);
if (stat.size <= 0) {
  process.stderr.write(`ROM is empty: ${romPath}\n`);
  process.exit(1);
}

process.stdout.write(`ROM exists and is non-empty: ${romPath} (${stat.size} bytes)\n`);
