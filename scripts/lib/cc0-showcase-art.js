const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { PNG } = require("pngjs");

const repoRoot = path.resolve(__dirname, "../..");
const vendorRoot = path.join(repoRoot, "third_party/showcase-art");

const readPng = (relativePath) =>
  PNG.sync.read(fs.readFileSync(path.join(repoRoot, relativePath)));

function writePng(relativePath, png) {
  const filename = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, PNG.sync.write(png));
  process.stdout.write(
    `[cc0-art] ${relativePath} (${png.width}x${png.height})\n`,
  );
}

function image(width, height, color = [0, 0, 0, 0]) {
  const output = new PNG({ width, height });
  for (let offset = 0; offset < output.data.length; offset += 4) {
    output.data[offset] = color[0];
    output.data[offset + 1] = color[1];
    output.data[offset + 2] = color[2];
    output.data[offset + 3] = color[3];
  }
  return output;
}

function compositePixel(target, targetOffset, source, sourceOffset) {
  const alpha = source.data[sourceOffset + 3] / 255;
  if (alpha <= 0) return;
  const inverse = 1 - alpha;
  target.data[targetOffset] = Math.round(
    source.data[sourceOffset] * alpha + target.data[targetOffset] * inverse,
  );
  target.data[targetOffset + 1] = Math.round(
    source.data[sourceOffset + 1] * alpha +
      target.data[targetOffset + 1] * inverse,
  );
  target.data[targetOffset + 2] = Math.round(
    source.data[sourceOffset + 2] * alpha +
      target.data[targetOffset + 2] * inverse,
  );
  target.data[targetOffset + 3] = Math.max(
    target.data[targetOffset + 3],
    source.data[sourceOffset + 3],
  );
}

function blit(target, source, targetX, targetY) {
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const dx = targetX + x;
      const dy = targetY + y;
      if (dx < 0 || dy < 0 || dx >= target.width || dy >= target.height) {
        continue;
      }
      compositePixel(
        target,
        (dy * target.width + dx) * 4,
        source,
        (y * source.width + x) * 4,
      );
    }
  }
}

function resizeNearest(source, width, height) {
  const target = image(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(
        source.width - 1,
        Math.floor((x * source.width) / width),
      );
      const sy = Math.min(
        source.height - 1,
        Math.floor((y * source.height) / height),
      );
      const sourceOffset = (sy * source.width + sx) * 4;
      const targetOffset = (y * width + x) * 4;
      source.data.copy(
        target.data,
        targetOffset,
        sourceOffset,
        sourceOffset + 4,
      );
    }
  }
  return target;
}

function renderPoachermonBackground() {
  const directory = path.join(vendorRoot, "kenney-roguelike-rpg");
  const xml = fs.readFileSync(path.join(directory, "sample_map.tmx"), "utf8");
  const sheet = PNG.sync.read(
    fs.readFileSync(path.join(directory, "roguelikeSheet_transparent.png")),
  );
  const layers = [
    ...xml.matchAll(
      /<layer name="([^"]+)"[^>]*>[\s\S]*?<data[^>]*>([\s\S]*?)<\/data>/g,
    ),
  ].map((match) =>
    zlib.inflateSync(Buffer.from(match[2].replace(/\s/g, ""), "base64")),
  );

  // This authored 30x20 crop contains a ranger station, woodland, wetland,
  // evidence trail, and clear walkable space. It is reduced exactly 2:1 so
  // every source tile becomes one native 8x8 GBA scene tile.
  const cropX = 15;
  const cropY = 20;
  const large = image(480, 320, [127, 199, 87, 255]);
  for (const layer of layers) {
    for (let tileY = 0; tileY < 20; tileY += 1) {
      for (let tileX = 0; tileX < 30; tileX += 1) {
        const raw = layer.readUInt32LE(
          ((cropY + tileY) * 100 + cropX + tileX) * 4,
        );
        const tileId = raw & 0x1fffffff;
        if (!tileId) continue;
        const index = tileId - 1;
        const sourceX = (index % 57) * 17;
        const sourceY = Math.floor(index / 57) * 17;
        for (let y = 0; y < 16; y += 1) {
          for (let x = 0; x < 16; x += 1) {
            const sourceOffset =
              ((sourceY + y) * sheet.width + sourceX + x) * 4;
            if (!sheet.data[sourceOffset + 3]) continue;
            const targetOffset =
              ((tileY * 16 + y) * large.width + tileX * 16 + x) * 4;
            sheet.data.copy(
              large.data,
              targetOffset,
              sourceOffset,
              sourceOffset + 4,
            );
          }
        }
      }
    }
  }
  return resizeNearest(large, 240, 160);
}

function parseHex(color) {
  const value = color.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function quantize(png, colors) {
  const palette = colors.map(parseHex);
  for (let offset = 0; offset < png.data.length; offset += 4) {
    if (!png.data[offset + 3]) continue;
    let best = palette[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const candidate of palette) {
      const red = png.data[offset] - candidate[0];
      const green = png.data[offset + 1] - candidate[1];
      const blue = png.data[offset + 2] - candidate[2];
      const distance = red * red + green * green + blue * blue;
      if (distance < bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }
    png.data[offset] = best[0];
    png.data[offset + 1] = best[1];
    png.data[offset + 2] = best[2];
    png.data[offset + 3] = 255;
  }
  return png;
}

function loadIsoTile(id) {
  const filename = `landscapeTiles_${String(id).padStart(3, "0")}.png`;
  return resizeNearest(
    readPng(
      `third_party/showcase-art/kenney-isometric-landscape/PNG/${filename}`,
    ),
    33,
    25,
  );
}

function loadFoliage(id, width, height) {
  const filename = `foliagePack_${String(id).padStart(3, "0")}.png`;
  return resizeNearest(
    readPng(`third_party/showcase-art/kenney-foliage-pack/PNG/${filename}`),
    width,
    height,
  );
}

function renderIsometricBackground() {
  const output = image(240, 160, [11, 22, 40, 255]);
  for (const [id, width, height, x, y] of [
    [55, 34, 25, 14, 31],
    [57, 34, 17, 190, 34],
  ]) {
    blit(output, loadFoliage(id, width, height), x, y);
  }
  const tiles = new Map(
    [22, 53, 83, 100, 104, 107].map((id) => [id, loadIsoTile(id)]),
  );
  const water = new Set(["1,2", "1,3", "2,2"]);
  const beacons = new Set(["3,0", "0,3", "7,3"]);
  const cells = [];
  for (let y = 0; y < 7; y += 1) {
    for (let x = 0; x < 8; x += 1) cells.push({ x, y });
  }
  cells.sort((a, b) => a.x + a.y - (b.x + b.y) || a.x - b.x);

  for (const { x, y } of cells) {
    const key = `${x},${y}`;
    let tileId = 22;
    if (water.has(key)) tileId = 53;
    else if (beacons.has(key)) tileId = 100;
    else if (x === 3 || y === 3) tileId = (x + y) % 2 ? 104 : 107;
    else if ((x === 0 || x === 7) && (y === 0 || y === 6)) tileId = 83;
    const targetX = 96 + (x - y) * 16;
    const targetY = 16 + (x + y) * 8;
    blit(output, tiles.get(tileId), targetX, targetY);
  }

  const decorations = [
    [0, 1, 4, 14, 39],
    [6, 0, 6, 14, 34],
    [6, 5, 7, 15, 27],
    [2, 4, 49, 20, 11],
    [4, 5, 49, 18, 10],
    [1, 1, 1, 7, 10],
    [5, 4, 3, 6, 10],
    [4, 1, 62, 7, 9],
  ];
  for (const [x, y, id, width, height] of decorations) {
    const rootX = 96 + (x - y) * 16 + 16;
    const rootY = 16 + (x + y) * 8 + 14;
    blit(
      output,
      loadFoliage(id, width, height),
      Math.round(rootX - width / 2),
      rootY - height,
    );
  }

  return quantize(output, [
    "#0b1628",
    "#17243d",
    "#2b3d54",
    "#46556a",
    "#4a382f",
    "#6e4c39",
    "#916446",
    "#bb8b60",
    "#d6c39b",
    "#eef0d2",
    "#294e36",
    "#40713b",
    "#66a044",
    "#96cb57",
    "#397b91",
    "#79bac1",
  ]);
}

function recolorVillager(palette, frames, role) {
  const source = readPng(
    "third_party/showcase-art/opengameart/villager-cc0.png",
  );
  const output = image(frames * 16, 16);
  const sourceFrames = frames === 3 ? [0, 2, 1] : [0, 8, 2, 10, 1, 9];
  const colors = palette.map(parseHex);
  sourceFrames.forEach((frame, frameIndex) => {
    const sourceX = (frame % 8) * 16;
    const sourceY = Math.floor(frame / 8) * 16;
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        const sourceOffset = ((sourceY + y) * source.width + sourceX + x) * 4;
        if (!source.data[sourceOffset + 3]) continue;
        const luminance =
          source.data[sourceOffset] * 0.2126 +
          source.data[sourceOffset + 1] * 0.7152 +
          source.data[sourceOffset + 2] * 0.0722;
        const color =
          luminance < 70 ? colors[2] : y < 8 ? colors[0] : colors[1];
        const targetOffset = (y * output.width + frameIndex * 16 + x) * 4;
        output.data[targetOffset] = color[0];
        output.data[targetOffset + 1] = color[1];
        output.data[targetOffset + 2] = color[2];
        output.data[targetOffset + 3] = 255;
      }
    }
    addRoleDetail(output, frameIndex * 16, role, colors);
  });
  return output;
}

function setPixel(png, x, y, color) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const offset = (y * png.width + x) * 4;
  png.data[offset] = color[0];
  png.data[offset + 1] = color[1];
  png.data[offset + 2] = color[2];
  png.data[offset + 3] = 255;
}

function addRoleDetail(png, offsetX, role, colors) {
  if (role === "ranger" || role === "rowan") {
    for (let x = 5; x <= 10; x += 1) setPixel(png, offsetX + x, 1, colors[1]);
    for (let x = 3; x <= 12; x += 1) setPixel(png, offsetX + x, 3, colors[2]);
  } else if (role === "ash") {
    for (let x = 5; x <= 10; x += 1) setPixel(png, offsetX + x, 1, colors[1]);
    setPixel(png, offsetX + 4, 2, colors[1]);
    setPixel(png, offsetX + 11, 2, colors[1]);
  } else if (role === "moss") {
    for (let x = 5; x <= 10; x += 1) setPixel(png, offsetX + x, 2, colors[1]);
    for (let x = 8; x <= 12; x += 1) setPixel(png, offsetX + x, 3, colors[2]);
  } else if (role === "finn") {
    setPixel(png, offsetX + 5, 8, colors[2]);
    setPixel(png, offsetX + 10, 8, colors[2]);
  }
}

function recolorIsoCharacter(groupX, palette) {
  const source = readPng(
    "third_party/showcase-art/opengameart/isometric-hero-cc0.png",
  );
  const output = image(64, 16);
  const colors = palette.map(parseHex);
  const directions = [
    [0, false],
    [2, false],
    [4, false],
    [2, true],
  ];
  directions.forEach(([row, flip], frame) => {
    const pixels = [];
    for (let y = 1; y < 32; y += 1) {
      for (let x = 1; x < 32; x += 1) {
        const offset = ((row * 33 + y) * source.width + groupX + x) * 4;
        const red = source.data[offset];
        const green = source.data[offset + 1];
        const blue = source.data[offset + 2];
        const background =
          Math.abs(red - 200) < 14 &&
          Math.abs(green - 191) < 14 &&
          Math.abs(blue - 231) < 14;
        if (!background) pixels.push({ x, y });
      }
    }
    const minX = Math.min(...pixels.map(({ x }) => x));
    const maxX = Math.max(...pixels.map(({ x }) => x));
    const minY = Math.min(...pixels.map(({ y }) => y));
    const maxY = Math.max(...pixels.map(({ y }) => y));
    const sourceWidth = maxX - minX + 1;
    const sourceHeight = maxY - minY + 1;
    const scale = Math.min(14 / sourceWidth, 16 / sourceHeight);
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const startX = Math.floor((16 - width) / 2);
    const startY = 16 - height;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let sampleX = Math.min(sourceWidth - 1, Math.floor(x / scale));
        if (flip) sampleX = sourceWidth - sampleX - 1;
        const sampleY = Math.min(sourceHeight - 1, Math.floor(y / scale));
        const sourceOffset =
          ((row * 33 + minY + sampleY) * source.width +
            groupX +
            minX +
            sampleX) *
          4;
        const red = source.data[sourceOffset];
        const green = source.data[sourceOffset + 1];
        const blue = source.data[sourceOffset + 2];
        const background =
          Math.abs(red - 200) < 14 &&
          Math.abs(green - 191) < 14 &&
          Math.abs(blue - 231) < 14;
        if (background) continue;
        const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
        const color =
          luminance < 65 ? colors[2] : luminance < 150 ? colors[1] : colors[0];
        const targetOffset =
          ((startY + y) * output.width + frame * 16 + startX + x) * 4;
        output.data[targetOffset] = color[0];
        output.data[targetOffset + 1] = color[1];
        output.data[targetOffset + 2] = color[2];
        output.data[targetOffset + 3] = 255;
      }
    }
  });
  return output;
}

function recolorRoguelikeTile(tileId, palette) {
  const sheet = readPng(
    "third_party/showcase-art/kenney-roguelike-rpg/roguelikeSheet_transparent.png",
  );
  const output = image(16, 16);
  const colors = palette.map(parseHex);
  const index = tileId - 1;
  const sourceX = (index % 57) * 17;
  const sourceY = Math.floor(index / 57) * 17;
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const sourceOffset = ((sourceY + y) * sheet.width + sourceX + x) * 4;
      if (!sheet.data[sourceOffset + 3]) continue;
      const luminance =
        sheet.data[sourceOffset] * 0.2126 +
        sheet.data[sourceOffset + 1] * 0.7152 +
        sheet.data[sourceOffset + 2] * 0.0722;
      const color =
        luminance < 90 ? colors[2] : luminance < 180 ? colors[1] : colors[0];
      const targetOffset = (y * 16 + x) * 4;
      output.data[targetOffset] = color[0];
      output.data[targetOffset + 1] = color[1];
      output.data[targetOffset + 2] = color[2];
      output.data[targetOffset + 3] = 255;
    }
  }
  return output;
}

function applyCc0ShowcaseArt() {
  const poacherSprites = "examples/poachermon/assets/sprites";
  writePng(
    "examples/poachermon/assets/backgrounds/poachermon_field.png",
    renderPoachermonBackground(),
  );
  writePng(
    `${poacherSprites}/actor_animated.png`,
    recolorVillager(["#d7a06e", "#214b3b", "#101820"], 6, "ranger"),
  );
  writePng(
    `${poacherSprites}/actor.png`,
    recolorVillager(["#e0a675", "#5b9cad", "#101820"], 3, "finn"),
  );
  writePng(
    `${poacherSprites}/captain_rowan.png`,
    recolorVillager(["#c99062", "#203e55", "#101820"], 6, "rowan"),
  );
  writePng(
    `${poacherSprites}/poacher_ash.png`,
    recolorVillager(["#c8875d", "#883b2d", "#101820"], 6, "ash"),
  );
  writePng(
    `${poacherSprites}/poacher_moss.png`,
    recolorVillager(["#bf865d", "#465838", "#101820"], 6, "moss"),
  );
  writePng(
    `${poacherSprites}/static.png`,
    recolorRoguelikeTile(912, ["#e6c34f", "#909b93", "#191d22"]),
  );
  writePng(
    `${poacherSprites}/forest_creature.png`,
    recolorRoguelikeTile(967, ["#ead7a0", "#8a5d3c", "#171c20"]),
  );

  const isoSprites = "examples/isometric-adventure/assets/sprites";
  writePng(
    "examples/isometric-adventure/assets/backgrounds/iso_village.png",
    renderIsometricBackground(),
  );
  writePng(
    `${isoSprites}/iso_hero.png`,
    recolorIsoCharacter(0, ["#d8a16e", "#1d365d", "#101820"]),
  );
  writePng(
    `${isoSprites}/keeper_nia.png`,
    recolorIsoCharacter(826, ["#c98663", "#6f304f", "#101820"]),
  );
  writePng(
    `${isoSprites}/actor.png`,
    recolorVillager(["#c98663", "#6f304f", "#101820"], 3, "nia"),
  );
  writePng(
    `${isoSprites}/actor_animated.png`,
    recolorVillager(["#c98663", "#6f304f", "#101820"], 6, "nia"),
  );
  const sunstone = recolorRoguelikeTile(1355, [
    "#fff5b3",
    "#f0a732",
    "#a9542a",
  ]);
  writePng(`${isoSprites}/static.png`, sunstone);
  writePng(`${isoSprites}/sunstone_core.png`, sunstone);
}

module.exports = { applyCc0ShowcaseArt };
