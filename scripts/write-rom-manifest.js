#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const directory = path.resolve(process.argv[2] || "dist/player");
const games = ["isometric-adventure", "poachermon"].map((name) => {
  const bytes = fs.readFileSync(path.join(directory, "roms", `${name}.gba`));
  return {
    name,
    url: `roms/${name}.gba`,
    bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
});
fs.writeFileSync(
  path.join(directory, "rom-manifest.json"),
  JSON.stringify(
    {
      revision: process.env.GITHUB_SHA || "local",
      campaign: "title-and-three-scenes",
      games,
    },
    null,
    2,
  ) + "\n",
);
