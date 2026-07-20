#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const player = require("../docs/player/player.js");

const root = path.resolve(process.argv[2] || "dist");

function fail(message) {
  throw new Error(`[pages] ${message}`);
}

function requireFile(relativePath) {
  const filename = path.join(root, relativePath);
  if (!fs.existsSync(filename)) fail(`missing ${relativePath}`);
  return filename;
}

const landing = fs.readFileSync(requireFile("index.html"), "utf8");
const playerHtml = fs.readFileSync(requireFile("player/index.html"), "utf8");
requireFile("styles.css");
requireFile("player/player.js");
requireFile("player/emulator.html");
requireFile("player/gba-studio-mark.svg");

if (!landing.includes('href="player/"'))
  fail("landing page does not link to player");
if (
  !landing.includes(
    "storybook/?path=/story/gba-studio-preview--studio-workspace-preview",
  )
) {
  fail("landing page does not link to the interactive Studio preview");
}
if (!playerHtml.includes('src="player.js"'))
  fail("player script is not loaded");

const storybook = JSON.parse(
  fs.readFileSync(requireFile("storybook/index.json"), "utf8"),
);
if (
  !storybook.entries ||
  !storybook.entries["gba-studio-preview--studio-workspace-preview"]
) {
  fail("interactive Studio preview story is missing");
}

for (const demo of player.DEMOS) {
  const relativePath = path.posix.join("player", demo.url);
  const rom = fs.readFileSync(requireFile(relativePath));
  if (!player.hasValidGbaHeader(rom))
    fail(`${relativePath} has an invalid GBA header`);
  process.stdout.write(`[pages] valid ${relativePath} (${rom.length} bytes)\n`);
}

process.stdout.write(`[pages] site validated at ${root}\n`);
