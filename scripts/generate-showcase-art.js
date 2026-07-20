#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const root = path.resolve(__dirname, "..");

function rgba(hex) {
  const value = hex.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
    255,
  ];
}

function canvas(width, height, background) {
  const png = new PNG({ width, height });
  const color = rgba(background);
  for (let offset = 0; offset < png.data.length; offset += 4) {
    png.data.set(color, offset);
  }
  return png;
}

function pixel(png, x, y, color) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  png.data.set(
    Array.isArray(color) ? color : rgba(color),
    (y * png.width + x) * 4,
  );
}

function rect(png, x, y, width, height, color) {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) pixel(png, px, py, color);
  }
}

function ellipse(png, cx, cy, rx, ry, color) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) pixel(png, x, y, color);
    }
  }
}

function polygon(png, points, color) {
  const minX = Math.floor(Math.min(...points.map(([x]) => x)));
  const maxX = Math.ceil(Math.max(...points.map(([x]) => x)));
  const minY = Math.floor(Math.min(...points.map(([, y]) => y)));
  const maxY = Math.ceil(Math.max(...points.map(([, y]) => y)));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i];
        const [xj, yj] = points[j];
        if (
          yi > y !== yj > y &&
          x < ((xj - xi) * (y - yi)) / (yj - yi || 1) + xi
        ) {
          inside = !inside;
        }
      }
      if (inside) pixel(png, x, y, color);
    }
  }
}

function line(png, x0, y0, x1, y1, color, width = 1) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  while (true) {
    rect(
      png,
      x0 - Math.floor(width / 2),
      y0 - Math.floor(width / 2),
      width,
      width,
      color,
    );
    if (x0 === x1 && y0 === y1) break;
    const twice = 2 * error;
    if (twice >= dy) {
      error += dy;
      x0 += sx;
    }
    if (twice <= dx) {
      error += dx;
      y0 += sy;
    }
  }
}

function seeded(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function writePng(relativePath, png) {
  const filename = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, PNG.sync.write(png, { colorType: 6 }));
  process.stdout.write(`[art] ${relativePath} (${png.width}x${png.height})\n`);
}

function syncPortableTemplate(sourceRelativePath, targetRelativePath) {
  const sourceRoot = path.join(root, sourceRelativePath);
  const targetRoot = path.join(root, targetRelativePath);
  const queue = [sourceRoot];
  let copied = 0;

  while (queue.length) {
    const directory = queue.shift();
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const source = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        queue.push(source);
        continue;
      }
      const relativePath = path.relative(sourceRoot, source);
      if (relativePath === ".gitignore" || relativePath === "project.gbsproj") {
        continue;
      }
      const target = path.join(targetRoot, relativePath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);
      copied += 1;
    }
  }

  process.stdout.write(
    `[art] synced ${copied} portable files to ${targetRelativePath}\n`,
  );
}

function drawTree(png, x, y, scale = 1) {
  rect(png, x - scale, y, scale * 2 + 1, scale * 5, "#5b3925");
  ellipse(png, x, y - scale * 3, scale * 5, scale * 4, "#173f32");
  ellipse(png, x - scale * 3, y - scale * 2, scale * 4, scale * 3, "#245b3a");
  ellipse(png, x + scale * 3, y - scale * 2, scale * 4, scale * 3, "#2f7042");
  rect(png, x - scale * 3, y - scale * 5, scale * 3, scale, "#4b8b4c");
}

function drawReeds(png, x, y, count = 6) {
  for (let i = 0; i < count; i += 1) {
    const px = x + i * 3;
    line(png, px, y, px + (i % 2), y - 8 - (i % 3), "#325b2e");
    rect(png, px, y - 9 - (i % 3), 2, 3, "#a46b2a");
  }
}

function poachermonBackground() {
  const png = canvas(240, 160, "#4f8f45");

  // The base grass stays intentionally clean so landmarks remain readable.

  // Accessible dirt trail, aligned with the existing quest actors.
  line(png, 120, 56, 120, 96, "#b58a55", 18);
  line(png, 120, 96, 72, 120, "#b58a55", 18);
  line(png, 120, 96, 184, 128, "#b58a55", 18);
  line(png, 120, 96, 120, 159, "#b58a55", 18);
  line(png, 120, 56, 120, 159, "#d0a868", 10);
  for (let y = 70; y < 158; y += 12) {
    pixel(png, 116 + (y % 3), y, "#8c613e");
    pixel(png, 124 - (y % 4), y + 3, "#8c613e");
  }

  // Wetland on the east side.
  polygon(
    png,
    [
      [168, 80],
      [239, 80],
      [239, 159],
      [184, 159],
      [168, 136],
      [176, 112],
    ],
    "#286a72",
  );
  for (let y = 88; y < 156; y += 9) {
    line(png, 177 + (y % 7), y, 232 - (y % 11), y, "#4f9a91");
    pixel(png, 209 + (y % 8), y - 2, "#9bcc68");
  }
  drawReeds(png, 174, 111, 7);
  drawReeds(png, 218, 101, 6);
  drawReeds(png, 190, 153, 8);

  // Ranger field office.
  rect(png, 72, 16, 96, 8, "#102f2b");
  polygon(
    png,
    [
      [72, 24],
      [168, 24],
      [160, 12],
      [80, 12],
    ],
    "#173f38",
  );
  rect(png, 72, 24, 96, 40, "#c18b4e");
  rect(png, 80, 32, 80, 32, "#d8ad69");
  for (let y = 32; y < 64; y += 8) line(png, 80, y, 159, y, "#b57b45");
  rect(png, 108, 40, 24, 24, "#553a2a");
  rect(png, 112, 40, 16, 24, "#745039");
  pixel(png, 124, 54, "#e9c45e");
  for (const x of [86, 145]) {
    rect(png, x, 38, 15, 13, "#173c48");
    rect(png, x + 2, 40, 11, 8, "#70b8bd");
    line(png, x + 7, 40, x + 7, 49, "#d9e4cf");
  }
  rect(png, 88, 16, 64, 8, "#214b3a");
  rect(png, 96, 16, 48, 6, "#e4c15c");
  rect(png, 104, 20, 32, 2, "#2a4a39");
  // Paw/sun badge instead of tiny text.
  ellipse(png, 120, 19, 3, 2, "#2a4a39");
  for (const [x, y] of [
    [116, 17],
    [119, 16],
    [122, 16],
    [125, 17],
  ])
    pixel(png, x, y, "#2a4a39");

  // Forest canopy border and framing trees.
  for (let x = 8; x < 240; x += 16) drawTree(png, x, 20, 2);

  // Fences and evidence zones.
  for (const [x0, x1, y] of [
    [7, 72, 137],
    [177, 232, 135],
  ]) {
    line(png, x0, y, x1, y, "#6d4930", 2);
    line(png, x0, y + 7, x1, y + 7, "#8f633a", 2);
    for (let x = x0; x <= x1; x += 13) rect(png, x, y - 3, 3, 14, "#513421");
  }

  // Trail camera at its trigger coordinates (14..16,14).
  rect(png, 123, 103, 3, 18, "#513421");
  rect(png, 116, 106, 16, 11, "#1b2b29");
  rect(png, 119, 108, 5, 5, "#6bb5bd");
  pixel(png, 128, 109, "#e9c45e");

  // Footprint trail and numbered evidence-card silhouettes.
  for (const [x, y] of [
    [90, 116],
    [96, 121],
    [102, 126],
    [164, 119],
    [171, 124],
  ]) {
    ellipse(png, x, y, 2, 3, "#5b4932");
    pixel(png, x + 2, y - 3, "#5b4932");
  }
  for (const [x, y] of [
    [34, 132],
    [201, 130],
  ]) {
    polygon(
      png,
      [
        [x, y],
        [x + 9, y - 3],
        [x + 11, y + 8],
        [x + 2, y + 10],
      ],
      "#e7c550",
    );
    rect(png, x + 4, y + 1, 3, 5, "#3e3a29");
  }

  // Dock planks make the wetland feel purposeful.
  rect(png, 189, 144, 50, 10, "#765035");
  for (let x = 190; x < 238; x += 6) line(png, x, 144, x, 153, "#a57845");
  rect(png, 193, 139, 3, 18, "#4f3324");
  rect(png, 232, 139, 3, 18, "#4f3324");

  return png;
}

function isoTree(png, x, y) {
  rect(png, x - 1, y, 3, 10, "#65412f");
  polygon(
    png,
    [
      [x, y - 12],
      [x - 8, y + 2],
      [x + 8, y + 2],
    ],
    "#153f3e",
  );
  polygon(
    png,
    [
      [x, y - 8],
      [x - 7, y + 5],
      [x + 7, y + 5],
    ],
    "#27634a",
  );
  rect(png, x - 3, y - 5, 4, 3, "#4d8a5b");
}

function beacon(png, x, y, lit = true) {
  polygon(
    png,
    [
      [x, y],
      [x + 9, y + 5],
      [x, y + 10],
      [x - 9, y + 5],
    ],
    "#d9d3b8",
  );
  polygon(
    png,
    [
      [x - 6, y + 4],
      [x, y + 7],
      [x, y + 16],
      [x - 6, y + 13],
    ],
    "#88836f",
  );
  polygon(
    png,
    [
      [x, y + 7],
      [x + 6, y + 4],
      [x + 6, y + 13],
      [x, y + 16],
    ],
    "#555c62",
  );
  if (lit) {
    polygon(
      png,
      [
        [x, y - 8],
        [x + 4, y - 2],
        [x, y + 4],
        [x - 4, y - 2],
      ],
      "#f4c542",
    );
    pixel(png, x, y - 5, "#fff3a0");
    pixel(png, x - 7, y - 4, "#f08a3e");
    pixel(png, x + 7, y - 3, "#f08a3e");
  }
}

function isometricBackground() {
  const png = canvas(240, 160, "#0b1628");

  // A clean sky saves tile budget for the shrine and route landmarks.
  for (const x of [0, 48, 96, 144, 192]) {
    polygon(
      png,
      [
        [x, 64],
        [x + 24, 32],
        [x + 48, 64],
      ],
      "#355887",
    );
    polygon(
      png,
      [
        [x + 12, 48],
        [x + 24, 32],
        [x + 34, 46],
        [x + 27, 42],
        [x + 22, 50],
      ],
      "#91b8d4",
    );
  }
  rect(png, 0, 59, 240, 9, "#16283d");
  for (const x of [8, 104, 200]) {
    rect(png, x, 48, 24, 3, "#b8ced2");
    rect(png, x + 4, 46, 16, 3, "#d6dfd5");
  }

  // Floating island body and stepped cliff strata.
  polygon(
    png,
    [
      [24, 88],
      [120, 40],
      [216, 88],
      [120, 136],
    ],
    "#342d46",
  );
  polygon(
    png,
    [
      [24, 84],
      [120, 36],
      [216, 84],
      [120, 132],
    ],
    "#714a45",
  );
  polygon(
    png,
    [
      [24, 76],
      [120, 28],
      [216, 76],
      [120, 124],
    ],
    "#78a95b",
  );
  polygon(
    png,
    [
      [32, 76],
      [120, 36],
      [208, 76],
      [120, 116],
    ],
    "#8fc56a",
  );
  // Cliff highlights and shadows.

  // Limestone relay paths and their darker insets.
  const pathColor = "#d8d0aa";
  const pathShadow = "#9b987e";
  for (const [[x0, y0], [x1, y1]] of [
    [
      [120, 106],
      [120, 53],
    ],
    [
      [120, 82],
      [57, 76],
    ],
    [
      [120, 82],
      [184, 76],
    ],
  ]) {
    line(png, x0, y0 + 2, x1, y1 + 2, pathShadow, 9);
    line(png, x0, y0, x1, y1, pathColor, 6);
    line(png, x0, y0, x1, y1, "#f1e6c6", 2);
  }
  for (const [x, y] of [
    [120, 105],
    [120, 82],
    [57, 76],
    [184, 76],
    [120, 53],
  ]) {
    polygon(
      png,
      [
        [x, y - 7],
        [x + 12, y],
        [x, y + 7],
        [x - 12, y],
      ],
      pathShadow,
    );
    polygon(
      png,
      [
        [x, y - 5],
        [x + 9, y],
        [x, y + 5],
        [x - 9, y],
      ],
      "#e4ddbd",
    );
    polygon(
      png,
      [
        [x, y - 2],
        [x + 4, y],
        [x, y + 2],
        [x - 4, y],
      ],
      "#b5aa86",
    );
  }

  // Shrine at the north point.
  polygon(
    png,
    [
      [120, 40],
      [145, 52],
      [120, 64],
      [95, 52],
    ],
    "#616676",
  );
  polygon(
    png,
    [
      [120, 36],
      [143, 48],
      [120, 59],
      [97, 48],
    ],
    "#d5ceb2",
  );
  polygon(
    png,
    [
      [120, 39],
      [136, 48],
      [120, 56],
      [104, 48],
    ],
    "#24385a",
  );
  polygon(
    png,
    [
      [120, 42],
      [130, 48],
      [120, 53],
      [110, 48],
    ],
    "#d99b32",
  );
  pixel(png, 120, 47, "#fff1a1");

  // Three relay beacons and environmental landmarks.
  beacon(png, 57, 67, true);
  beacon(png, 184, 67, true);
  beacon(png, 120, 95, false);
  isoTree(png, 80, 56);
  isoTree(png, 160, 56);
  // Small reflecting pool around the core position.
  polygon(
    png,
    [
      [72, 57],
      [87, 64],
      [72, 72],
      [57, 64],
    ],
    "#2f7180",
  );
  polygon(
    png,
    [
      [72, 60],
      [82, 64],
      [72, 69],
      [62, 64],
    ],
    "#66b4bb",
  );
  pixel(png, 68, 62, "#d6efe0");
  pixel(png, 76, 66, "#d6efe0");

  return png;
}

function spriteCanvas(width) {
  return new PNG({ width, height: 16, colorType: 6 });
}

function drawCharacter(png, offset, direction, step, style) {
  const outline = "#101820";
  const skin = style.skin;
  const hair = outline;
  const main = style.main;
  const light = main;
  const accent = skin;
  const boots = outline;
  const x = offset;

  if (direction === "down") {
    rect(png, x + 5, 2, 6, 5, outline);
    rect(png, x + 6, 3, 4, 4, skin);
    pixel(png, x + 6, 5, outline);
    pixel(png, x + 9, 5, outline);
    rect(png, x + 4, 7, 8, 6, outline);
    rect(png, x + 5, 8, 6, 5, main);
    rect(png, x + 6, 8, 4, 2, light);
    pixel(png, x + 7, 9, accent);
    rect(png, x + 3, 8, 2, 5, skin);
    rect(png, x + 11, 8, 2, 5, skin);
    rect(png, x + 5 + (step ? 1 : 0), 13, 3, 3, boots);
    rect(png, x + 8 - (step ? 1 : 0), 13, 3, 3, boots);
  } else if (direction === "right") {
    rect(png, x + 5, 2, 6, 5, outline);
    rect(png, x + 6, 3, 5, 4, skin);
    pixel(png, x + 10, 5, outline);
    pixel(png, x + 5, 4, hair);
    rect(png, x + 4, 7, 7, 6, outline);
    rect(png, x + 5, 8, 6, 5, main);
    rect(png, x + 8, 8, 3, 2, light);
    rect(png, x + 11, 9, 2, 4, skin);
    rect(png, x + 4, 8, 2, 5, accent);
    rect(png, x + 5 + (step ? 2 : 0), 13, 3, 3, boots);
    rect(png, x + 8 - (step ? 2 : 0), 13, 3, 3, boots);
  } else {
    rect(png, x + 5, 2, 6, 5, outline);
    rect(png, x + 6, 3, 4, 4, hair);
    rect(png, x + 4, 7, 8, 6, outline);
    rect(png, x + 5, 8, 6, 5, main);
    rect(png, x + 6, 8, 4, 3, accent);
    pixel(png, x + 7, 9, light);
    rect(png, x + 3, 8, 2, 5, main);
    rect(png, x + 11, 8, 2, 5, main);
    rect(png, x + 5 + (step ? 1 : 0), 13, 3, 3, boots);
    rect(png, x + 8 - (step ? 1 : 0), 13, 3, 3, boots);
  }

  // Character-specific headwear gives each silhouette instant identity.
  if (style.hat === "ranger") {
    rect(png, x + 5, 0, 6, 3, main);
    rect(png, x + 4, 2, 9, 2, outline);
    rect(png, x + 6, 1, 4, 1, accent);
  } else if (style.hat === "campaign") {
    rect(png, x + 5, 0, 6, 3, hair);
    rect(png, x + 3, 2, 10, 2, outline);
    rect(png, x + 5, 1, 6, 1, accent);
  } else if (style.hat === "beanie") {
    rect(png, x + 5, 0, 6, 3, main);
    rect(png, x + 4, 2, 8, 2, light);
  } else if (style.hat === "cap") {
    rect(png, x + 5, 1, 6, 3, main);
    rect(png, x + 9, 3, 4, 1, outline);
  } else {
    pixel(png, x + 5, 2, hair);
    rect(png, x + 6, 1, 5, 2, hair);
    pixel(png, x + 10, 3, hair);
  }
}

function characterSheet(style, frames = 6) {
  const png = spriteCanvas(frames * 16);
  const poses =
    frames === 3
      ? [
          ["down", 0],
          ["right", 0],
          ["up", 0],
        ]
      : [
          ["down", 0],
          ["down", 1],
          ["right", 0],
          ["right", 1],
          ["up", 0],
          ["up", 1],
        ];
  poses.forEach(([direction, step], index) =>
    drawCharacter(png, index * 16, direction, step, style),
  );
  return png;
}

function isoCharacterSheet(style) {
  const png = spriteCanvas(64);
  [
    ["right", 0],
    ["right", 1],
    ["up", 0],
    ["up", 1],
  ].forEach(([direction, step], index) =>
    drawCharacter(png, index * 16, direction, step, style),
  );
  return png;
}

function snareSprite() {
  const png = spriteCanvas(16);
  const dark = "#191d22";
  const metal = "#909b93";
  ellipse(png, 8, 9, 6, 4, dark);
  ellipse(png, 8, 9, 5, 3, metal);
  ellipse(png, 8, 9, 3, 1, dark);
  line(png, 12, 6, 15, 2, metal);
  rect(png, 1, 2, 5, 6, "#e6c34f");
  rect(png, 2, 3, 3, 3, dark);
  return png;
}

function creatureSprite() {
  const png = spriteCanvas(16);
  const outline = "#171c20";
  ellipse(png, 8, 9, 6, 6, outline);
  ellipse(png, 8, 9, 5, 5, "#8a5d3c");
  ellipse(png, 8, 8, 4, 3, "#ead7a0");
  pixel(png, 6, 7, outline);
  pixel(png, 10, 7, outline);
  pixel(png, 8, 9, outline);
  pixel(png, 4, 3, "#8a5d3c");
  pixel(png, 12, 3, "#8a5d3c");
  rect(png, 11, 10, 4, 3, "#8a5d3c");
  pixel(png, 13, 9, "#ead7a0");
  return png;
}

function sunstoneSprite() {
  const png = spriteCanvas(16);
  polygon(
    png,
    [
      [8, 1],
      [13, 7],
      [8, 15],
      [3, 7],
    ],
    "#f0a732",
  );
  polygon(
    png,
    [
      [8, 1],
      [11, 7],
      [8, 13],
      [5, 7],
    ],
    "#f0a732",
  );
  polygon(
    png,
    [
      [8, 2],
      [8, 12],
      [5, 7],
    ],
    "#ffe271",
  );
  pixel(png, 7, 4, "#fff5b3");
  pixel(png, 2, 4, "#f0a732");
  pixel(png, 14, 8, "#f0a732");
  return png;
}

function readJson(relativePath) {
  return JSON.parse(
    fs
      .readFileSync(path.join(root, relativePath), "utf8")
      .replace(/^\uFEFF/, ""),
  );
}

function stableId(seed) {
  const hex = crypto.createHash("sha1").update(seed).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20)}`;
}

function cloneSprite(templatePath, outputPath, options) {
  const value = readJson(templatePath);
  function refreshIds(node, trail = "root") {
    if (Array.isArray(node))
      return node.map((child, index) => refreshIds(child, `${trail}.${index}`));
    if (!node || typeof node !== "object") return node;
    const output = {};
    for (const [key, child] of Object.entries(node)) {
      output[key] =
        key === "id"
          ? stableId(`${options.seed}:${trail}:${child}`)
          : refreshIds(child, `${trail}.${key}`);
    }
    return output;
  }
  const sprite = refreshIds(value);
  sprite.id = options.id;
  sprite.name = options.name;
  sprite.symbol = options.symbol;
  sprite.filename = options.filename;
  sprite.width = options.width;
  sprite.height = 16;
  sprite.numFrames = options.frames;
  sprite.numTiles = options.frames * 2;
  sprite.checksum = "";
  assignPaletteSlot(sprite, options.paletteSlot ?? 0);
  fs.writeFileSync(
    path.join(root, outputPath),
    `${JSON.stringify(sprite, null, 2)}\n`,
  );
  process.stdout.write(`[art] ${outputPath}\n`);
}

function assignPaletteSlot(node, paletteSlot) {
  if (Array.isArray(node)) {
    node.forEach((child) => assignPaletteSlot(child, paletteSlot));
    return;
  }
  if (!node || typeof node !== "object") return;
  for (const [key, child] of Object.entries(node)) {
    if (key === "palette" || key === "paletteIndex") {
      node[key] = paletteSlot;
    } else {
      assignPaletteSlot(child, paletteSlot);
    }
  }
}

function updateSpritePaletteSlot(relativePath, paletteSlot) {
  const sprite = readJson(relativePath);
  assignPaletteSlot(sprite, paletteSlot);
  fs.writeFileSync(
    path.join(root, relativePath),
    `${JSON.stringify(sprite, null, 2)}\n`,
  );
}

function updateSpriteMetadata(relativePath, options) {
  const sprite = readJson(relativePath);
  sprite.width = options.width;
  sprite.height = 16;
  sprite.numFrames = options.frames;
  sprite.numTiles = options.frames * 2;
  sprite.checksum = "";
  fs.writeFileSync(
    path.join(root, relativePath),
    `${JSON.stringify(sprite, null, 2)}\n`,
  );
}

function updateActor(relativePath, spriteSheetId, paletteId) {
  const actor = readJson(relativePath);
  actor.spriteSheetId = spriteSheetId;
  if (paletteId) actor.paletteId = paletteId;
  fs.writeFileSync(
    path.join(root, relativePath),
    `${JSON.stringify(actor, null, 2)}\n`,
  );
}

function writePalette(relativePath, id, name, colors) {
  const palette = {
    _resourceType: "palette",
    id,
    name,
    colors,
    defaultName: name,
    defaultColors: colors,
  };
  fs.writeFileSync(
    path.join(root, relativePath),
    `${JSON.stringify(palette, null, 2)}\n`,
  );
  process.stdout.write(`[art] ${relativePath}\n`);
}

function updatePlayerPalette(relativePath, paletteId, romFilename) {
  const settings = readJson(relativePath);
  settings.playerPaletteId = paletteId;
  settings.romFilename = romFilename;
  fs.writeFileSync(
    path.join(root, relativePath),
    `${JSON.stringify(settings, null, 2)}\n`,
  );
}

function updateScenePalettes(relativePath, paletteIds) {
  const scene = readJson(relativePath);
  scene.spritePaletteIds = paletteIds;
  fs.writeFileSync(
    path.join(root, relativePath),
    `${JSON.stringify(scene, null, 2)}\n`,
  );
}

const poacherSprites = "examples/poachermon/assets/sprites";
const isoSprites = "examples/isometric-adventure/assets/sprites";
const poacherCharacterTemplate = `${poacherSprites}/actor_animated.png.gbsres`;
const poacherFixedTemplate = `${poacherSprites}/static.png.gbsres`;
const isoCharacterTemplate = `${isoSprites}/iso_hero.png.gbsres`;
const isoFixedTemplate = `${isoSprites}/static.png.gbsres`;

const styles = {
  ranger: {
    skin: "#d7a06e",
    hair: "#382a27",
    main: "#214b3b",
    light: "#3f7652",
    accent: "#e2bc4b",
    boots: "#51392b",
    hat: "ranger",
  },
  rowan: {
    skin: "#c99062",
    hair: "#d5d0bf",
    main: "#203e55",
    light: "#43677b",
    accent: "#d5a843",
    boots: "#44352b",
    hat: "campaign",
  },
  finn: {
    skin: "#e0a675",
    hair: "#68462e",
    main: "#5b9cad",
    light: "#8cc6c7",
    accent: "#d6a34f",
    boots: "#57402e",
    hat: "none",
  },
  ash: {
    skin: "#c8875d",
    hair: "#422827",
    main: "#883b2d",
    light: "#b65a3c",
    accent: "#e0a34b",
    boots: "#343139",
    hat: "beanie",
  },
  moss: {
    skin: "#bf865d",
    hair: "#342f25",
    main: "#465838",
    light: "#718052",
    accent: "#b58b44",
    boots: "#302f29",
    hat: "cap",
  },
  relayHero: {
    skin: "#d8a16e",
    hair: "#202b49",
    main: "#1d365d",
    light: "#315a80",
    accent: "#efb83e",
    boots: "#4b342b",
    hat: "none",
  },
  nia: {
    skin: "#c98663",
    hair: "#ded3bd",
    main: "#6f304f",
    light: "#99506d",
    accent: "#e0ae43",
    boots: "#3b2c32",
    hat: "none",
  },
};

writePng(
  "examples/poachermon/assets/backgrounds/poachermon_field.png",
  poachermonBackground(),
);
writePng(`${poacherSprites}/actor_animated.png`, characterSheet(styles.ranger));
writePng(`${poacherSprites}/actor.png`, characterSheet(styles.finn, 3));
writePng(`${poacherSprites}/captain_rowan.png`, characterSheet(styles.rowan));
writePng(`${poacherSprites}/poacher_ash.png`, characterSheet(styles.ash));
writePng(`${poacherSprites}/poacher_moss.png`, characterSheet(styles.moss));
writePng(`${poacherSprites}/static.png`, snareSprite());
writePng(`${poacherSprites}/forest_creature.png`, creatureSprite());

updateSpriteMetadata(`${poacherSprites}/actor_animated.png.gbsres`, {
  width: 96,
  frames: 6,
});
updateSpriteMetadata(`${poacherSprites}/actor.png.gbsres`, {
  width: 48,
  frames: 3,
});
updateSpriteMetadata(`${poacherSprites}/static.png.gbsres`, {
  width: 16,
  frames: 1,
});
updateSpritePaletteSlot(`${poacherSprites}/actor_animated.png.gbsres`, 0);
updateSpritePaletteSlot(`${poacherSprites}/actor.png.gbsres`, 2);
updateSpritePaletteSlot(`${poacherSprites}/static.png.gbsres`, 5);

const rowanId = stableId("poachermon:captain-rowan");
const ashId = stableId("poachermon:poacher-ash");
const mossId = stableId("poachermon:poacher-moss");
const creatureId = stableId("poachermon:forest-creature");
const poacherPalettes = {
  ranger: stableId("poachermon:palette:ranger"),
  rowan: stableId("poachermon:palette:rowan"),
  finn: stableId("poachermon:palette:finn"),
  ash: stableId("poachermon:palette:ash"),
  moss: stableId("poachermon:palette:moss"),
  snare: stableId("poachermon:palette:snare"),
  creature: stableId("poachermon:palette:creature"),
};

for (const [filename, name, id, colors] of [
  [
    "ranger",
    "Field Ranger",
    poacherPalettes.ranger,
    ["D7A06E", "214B3B", "101820", "101820"],
  ],
  [
    "rowan",
    "Captain Rowan",
    poacherPalettes.rowan,
    ["C99062", "203E55", "101820", "101820"],
  ],
  [
    "finn",
    "Witness Finn",
    poacherPalettes.finn,
    ["E0A675", "5B9CAD", "101820", "101820"],
  ],
  [
    "ash",
    "Poacher Ash",
    poacherPalettes.ash,
    ["C8875D", "883B2D", "101820", "101820"],
  ],
  [
    "moss",
    "Poacher Moss",
    poacherPalettes.moss,
    ["BF865D", "465838", "101820", "101820"],
  ],
  [
    "snare",
    "Evidence Snare",
    poacherPalettes.snare,
    ["E6C34F", "909B93", "191D22", "191D22"],
  ],
  [
    "creature",
    "Forest Creature",
    poacherPalettes.creature,
    ["EAD7A0", "8A5D3C", "171C20", "171C20"],
  ],
]) {
  writePalette(
    `examples/poachermon/project/palettes/showcase_${filename}.gbsres`,
    id,
    name,
    colors,
  );
}

for (const [filename, name, symbol, id, paletteSlot] of [
  ["captain_rowan", "Captain Rowan", "sprite_captain_rowan", rowanId, 1],
  ["poacher_ash", "Poacher Ash", "sprite_poacher_ash", ashId, 3],
  ["poacher_moss", "Poacher Moss", "sprite_poacher_moss", mossId, 4],
]) {
  cloneSprite(
    poacherCharacterTemplate,
    `${poacherSprites}/${filename}.png.gbsres`,
    {
      seed: `poachermon:${filename}`,
      id,
      name,
      symbol,
      filename: `${filename}.png`,
      width: 96,
      frames: 6,
      paletteSlot,
    },
  );
}
cloneSprite(
  poacherFixedTemplate,
  `${poacherSprites}/forest_creature.png.gbsres`,
  {
    seed: "poachermon:forest-creature",
    id: creatureId,
    name: "Forest Creature",
    symbol: "sprite_forest_creature",
    filename: "forest_creature.png",
    width: 16,
    frames: 1,
    paletteSlot: 6,
  },
);

updateActor(
  "examples/poachermon/project/scenes/scene_1/actors/captain_rowan.gbsres",
  rowanId,
  poacherPalettes.rowan,
);
updateActor(
  "examples/poachermon/project/scenes/scene_1/actors/poacher_ash.gbsres",
  ashId,
  poacherPalettes.ash,
);
updateActor(
  "examples/poachermon/project/scenes/scene_1/actors/poacher_moss.gbsres",
  mossId,
  poacherPalettes.moss,
);
updateActor(
  "examples/poachermon/project/scenes/scene_1/actors/trapped_creature.gbsres",
  creatureId,
  poacherPalettes.creature,
);
updateActor(
  "examples/poachermon/project/scenes/scene_1/actors/witness_finn.gbsres",
  "11b5452b-187c-43a3-afb1-a1f4f74ffda2",
  poacherPalettes.finn,
);
for (const snare of ["left_snare", "right_snare"]) {
  updateActor(
    `examples/poachermon/project/scenes/scene_1/actors/${snare}.gbsres`,
    "daf95270-e30d-423b-9ee7-990ae29f57f6",
    poacherPalettes.snare,
  );
}
updatePlayerPalette(
  "examples/poachermon/project/settings.gbsres",
  poacherPalettes.ranger,
  "Poachermon Case 001",
);
for (const scene of [
  "examples/poachermon/project/scenes/scene_1/scene.gbsres",
  "examples/poachermon/project/scenes/case_closed/scene.gbsres",
]) {
  updateScenePalettes(scene, [
    poacherPalettes.ranger,
    poacherPalettes.rowan,
    poacherPalettes.finn,
    poacherPalettes.ash,
    poacherPalettes.moss,
    poacherPalettes.snare,
    poacherPalettes.creature,
    poacherPalettes.ranger,
  ]);
}

writePng(
  "examples/isometric-adventure/assets/backgrounds/iso_village.png",
  isometricBackground(),
);
writePng(`${isoSprites}/iso_hero.png`, isoCharacterSheet(styles.relayHero));
writePng(`${isoSprites}/actor.png`, characterSheet(styles.nia, 3));
writePng(`${isoSprites}/actor_animated.png`, characterSheet(styles.nia));
writePng(`${isoSprites}/static.png`, sunstoneSprite());
writePng(`${isoSprites}/keeper_nia.png`, isoCharacterSheet(styles.nia));
writePng(`${isoSprites}/sunstone_core.png`, sunstoneSprite());

updateSpriteMetadata(`${isoSprites}/iso_hero.png.gbsres`, {
  width: 64,
  frames: 4,
  paletteSlot: 1,
});
updateSpriteMetadata(`${isoSprites}/actor.png.gbsres`, {
  width: 48,
  frames: 3,
});
updateSpriteMetadata(`${isoSprites}/actor_animated.png.gbsres`, {
  width: 96,
  frames: 6,
});
updateSpriteMetadata(`${isoSprites}/static.png.gbsres`, {
  width: 16,
  frames: 1,
  paletteSlot: 2,
});
updateSpritePaletteSlot(`${isoSprites}/iso_hero.png.gbsres`, 0);
updateSpritePaletteSlot(`${isoSprites}/actor.png.gbsres`, 1);
updateSpritePaletteSlot(`${isoSprites}/actor_animated.png.gbsres`, 1);
updateSpritePaletteSlot(`${isoSprites}/static.png.gbsres`, 2);

const niaId = stableId("sunstone-relay:keeper-nia");
const sunstoneId = stableId("sunstone-relay:sunstone-core");
const relayPalettes = {
  hero: stableId("sunstone-relay:palette:hero"),
  nia: stableId("sunstone-relay:palette:nia"),
  sunstone: stableId("sunstone-relay:palette:sunstone"),
};
for (const [filename, name, id, colors] of [
  [
    "hero",
    "Relay Keeper",
    relayPalettes.hero,
    ["D8A16E", "1D365D", "101820", "101820"],
  ],
  [
    "nia",
    "Keeper Nia",
    relayPalettes.nia,
    ["C98663", "6F304F", "101820", "101820"],
  ],
  [
    "sunstone",
    "Sunstone",
    relayPalettes.sunstone,
    ["FFF5B3", "F0A732", "A9542A", "A9542A"],
  ],
]) {
  writePalette(
    `examples/isometric-adventure/project/palettes/showcase_${filename}.gbsres`,
    id,
    name,
    colors,
  );
}
cloneSprite(isoCharacterTemplate, `${isoSprites}/keeper_nia.png.gbsres`, {
  seed: "sunstone-relay:keeper-nia",
  id: niaId,
  name: "Keeper Nia",
  symbol: "sprite_keeper_nia",
  filename: "keeper_nia.png",
  width: 64,
  frames: 4,
  paletteSlot: 1,
});
cloneSprite(isoFixedTemplate, `${isoSprites}/sunstone_core.png.gbsres`, {
  seed: "sunstone-relay:sunstone-core",
  id: sunstoneId,
  name: "Sunstone Core",
  symbol: "sprite_sunstone_core",
  filename: "sunstone_core.png",
  width: 16,
  frames: 1,
  paletteSlot: 2,
});
updateActor(
  "examples/isometric-adventure/project/scenes/iso_village/actors/npc.gbsres",
  niaId,
  relayPalettes.nia,
);
updateActor(
  "examples/isometric-adventure/project/scenes/iso_village/actors/sunstone_core.gbsres",
  sunstoneId,
  relayPalettes.sunstone,
);
updatePlayerPalette(
  "examples/isometric-adventure/project/settings.gbsres",
  relayPalettes.hero,
  "The Sunstone Relay",
);
for (const scene of [
  "examples/isometric-adventure/project/scenes/iso_village/scene.gbsres",
  "examples/isometric-adventure/project/scenes/relay_restored/scene.gbsres",
]) {
  updateScenePalettes(scene, [
    relayPalettes.hero,
    relayPalettes.nia,
    relayPalettes.sunstone,
    relayPalettes.hero,
    relayPalettes.hero,
    relayPalettes.hero,
    relayPalettes.hero,
    relayPalettes.hero,
  ]);
}

syncPortableTemplate("examples/poachermon", "appData/templates/gba-poachermon");
syncPortableTemplate(
  "examples/isometric-adventure",
  "appData/templates/gba-iso",
);

process.stdout.write("[art] showcase asset generation complete\n");
