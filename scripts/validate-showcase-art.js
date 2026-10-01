#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const root = path.resolve(__dirname, "..");

function fail(message) {
  throw new Error(`[showcase-art] ${message}`);
}

function readPng(relativePath) {
  const filename = path.join(root, relativePath);
  if (!fs.existsSync(filename)) fail(`missing ${relativePath}`);
  return PNG.sync.read(fs.readFileSync(filename));
}

function readJson(relativePath) {
  const filename = path.join(root, relativePath);
  if (!fs.existsSync(filename)) fail(`missing ${relativePath}`);
  return JSON.parse(fs.readFileSync(filename, "utf8"));
}

function collectPaletteSlots(value, slots = new Set()) {
  if (!value || typeof value !== "object") return slots;
  if (Number.isInteger(value.palette)) slots.add(value.palette);
  for (const child of Object.values(value)) collectPaletteSlots(child, slots);
  return slots;
}

function colorsIn(
  png,
  startX = 0,
  startY = 0,
  width = png.width,
  height = png.height,
) {
  const colors = new Set();
  for (let y = startY; y < startY + height; y += 1) {
    for (let x = startX; x < startX + width; x += 1) {
      const offset = (y * png.width + x) * 4;
      colors.add(png.data.subarray(offset, offset + 4).join(","));
    }
  }
  return colors;
}

function uniqueTiles(png) {
  const tiles = new Set();
  for (let tileY = 0; tileY < png.height; tileY += 8) {
    for (let tileX = 0; tileX < png.width; tileX += 8) {
      const pixels = [];
      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
          const offset = ((tileY + y) * png.width + tileX + x) * 4;
          pixels.push(png.data.subarray(offset, offset + 4).join(","));
        }
      }
      tiles.add(
        crypto.createHash("sha1").update(pixels.join("|")).digest("hex"),
      );
    }
  }
  return tiles.size;
}

for (const relativePath of [
  "docs/art-direction/poachermon-visual-target-v1.png",
  "docs/art-direction/poachermon-visual-target-v2.png",
  "docs/art-direction/sunstone-relay-visual-target-v1.png",
  "docs/art-direction/sunstone-relay-visual-target-v2.png",
  "third_party/showcase-art/kenney-roguelike-rpg/LICENSE.txt",
  "third_party/showcase-art/kenney-isometric-landscape/LICENSE.txt",
  "third_party/showcase-art/kenney-foliage-pack/LICENSE.txt",
  "third_party/showcase-art/opengameart/villager-cc0.png",
  "third_party/showcase-art/opengameart/isometric-hero-cc0.png",
]) {
  if (!fs.existsSync(path.join(root, relativePath)))
    fail(`missing ${relativePath}`);
}

for (const relativePath of [
  "examples/poachermon/assets/backgrounds/poachermon_field.png",
  "examples/isometric-adventure/assets/backgrounds/iso_village.png",
]) {
  const png = readPng(relativePath);
  if (png.width !== 240 || png.height !== 160) {
    fail(`${relativePath} must be exactly 240x160`);
  }
  const tileCount = uniqueTiles(png);
  if (tileCount > 180) {
    fail(`${relativePath} uses ${tileCount} unique tiles; safe maximum is 180`);
  }
  let maxTileColors = 0;
  for (let y = 0; y < png.height; y += 8) {
    for (let x = 0; x < png.width; x += 8) {
      maxTileColors = Math.max(maxTileColors, colorsIn(png, x, y, 8, 8).size);
    }
  }
  if (maxTileColors > 16) {
    fail(`${relativePath} has an 8x8 tile with ${maxTileColors} colors`);
  }
  process.stdout.write(
    `[showcase-art] ${relativePath}: ${tileCount} tiles, <=${maxTileColors} colors/tile\n`,
  );
}

const sprites = [
  ["examples/poachermon/assets/sprites/actor_animated.png", 96, 16],
  ["examples/poachermon/assets/sprites/actor.png", 48, 16],
  ["examples/poachermon/assets/sprites/captain_rowan.png", 96, 16],
  ["examples/poachermon/assets/sprites/poacher_ash.png", 96, 16],
  ["examples/poachermon/assets/sprites/poacher_moss.png", 96, 16],
  ["examples/poachermon/assets/sprites/static.png", 16, 16],
  ["examples/poachermon/assets/sprites/forest_creature.png", 16, 16],
  ["examples/isometric-adventure/assets/sprites/iso_hero.png", 64, 16],
  ["examples/isometric-adventure/assets/sprites/keeper_nia.png", 64, 16],
  ["examples/isometric-adventure/assets/sprites/sunstone_core.png", 16, 16],
];

for (const [relativePath, width, height] of sprites) {
  const png = readPng(relativePath);
  if (png.width !== width || png.height !== height) {
    fail(`${relativePath} must be exactly ${width}x${height}`);
  }
  const colors = colorsIn(png).size;
  if (colors > 4) fail(`${relativePath} uses ${colors} colors; maximum is 4`);
  const alphas = new Set();
  for (let offset = 3; offset < png.data.length; offset += 4) {
    alphas.add(png.data[offset]);
  }
  if (!alphas.has(0) || !alphas.has(255)) {
    fail(`${relativePath} must contain transparent and opaque pixels`);
  }
  process.stdout.write(`[showcase-art] ${relativePath}: ${colors} colors\n`);
}

const paletteAssignments = [
  ["examples/poachermon/assets/sprites/actor_animated.png.gbsres", 0],
  ["examples/poachermon/assets/sprites/captain_rowan.png.gbsres", 1],
  ["examples/poachermon/assets/sprites/actor.png.gbsres", 2],
  ["examples/poachermon/assets/sprites/poacher_ash.png.gbsres", 3],
  ["examples/poachermon/assets/sprites/poacher_moss.png.gbsres", 4],
  ["examples/poachermon/assets/sprites/static.png.gbsres", 5],
  ["examples/poachermon/assets/sprites/forest_creature.png.gbsres", 6],
  ["examples/isometric-adventure/assets/sprites/iso_hero.png.gbsres", 0],
  ["examples/isometric-adventure/assets/sprites/keeper_nia.png.gbsres", 1],
  ["examples/isometric-adventure/assets/sprites/sunstone_core.png.gbsres", 2],
];

for (const [relativePath, expectedSlot] of paletteAssignments) {
  const slots = collectPaletteSlots(readJson(relativePath));
  if (slots.size !== 1 || !slots.has(expectedSlot)) {
    fail(
      `${relativePath} must use only sprite palette slot ${expectedSlot}; found ${[
        ...slots,
      ].join(", ")}`,
    );
  }
}

for (const relativePath of [
  "examples/poachermon/project/scenes/scene_1/scene.gbsres",
  "examples/isometric-adventure/project/scenes/iso_village/scene.gbsres",
]) {
  const scene = readJson(relativePath);
  if (
    !Array.isArray(scene.spritePaletteIds) ||
    scene.spritePaletteIds.length !== 8
  ) {
    fail(`${relativePath} must define all 8 GBA sprite palette slots`);
  }
}

process.stdout.write("[showcase-art] all showcase assets validated\n");
