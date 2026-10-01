#!/usr/bin/env node
// Build the authored campaigns and portable templates from repeatable data.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PNG } = require("pngjs");
const { renderIsometricBackground } = require("./lib/cc0-showcase-art");
const root = path.resolve(__dirname, "..");
const id = (seed) => {
  const h = crypto.createHash("sha256").update(seed).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const read = (file) =>
  JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const write = (file, data) => {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), JSON.stringify(data, null, 2) + "\n");
};
let eventNumber = 0;
const event = (command, args = {}, children) => ({
  id: id(`campaign-event-${eventNumber++}`),
  command,
  args,
  ...(children ? { children } : {}),
});
const text = (value) => event("EVENT_TEXT", { text: value });
const set = (variable, value) =>
  event("EVENT_SET_VALUE", {
    variable: String(variable),
    value: { type: "number", value },
  });
const inc = (variable) =>
  event("EVENT_INC_VALUE", { variable: String(variable) });
const branch = (variable, yes, no = []) =>
  event(
    "EVENT_IF_TRUE",
    { variable: String(variable) },
    { true: yes, false: no },
  );
const count = (variable, minimum, yes, no = []) =>
  event(
    "EVENT_IF_VALUE",
    { variable: String(variable), operator: ">=", comparator: minimum },
    { true: yes, false: no },
  );
const hide = (actorId) => event("EVENT_ACTOR_DEACTIVATE", { actorId });
const wait = () => event("EVENT_AWAIT_INPUT", { input: ["start"] });
const end = () => event("EVENT_END");
const go = (sceneId, x, y) =>
  event("EVENT_SWITCH_SCENE", {
    sceneId,
    x: { type: "number", value: x },
    y: { type: "number", value: y },
    direction: "up",
    fadeSpeed: "1",
  });
const pack = (cells) => {
  let output = "",
    previous = -1,
    total = 0;
  const flush = () => {
    if (total) output += total === 1 ? "!" : total.toString(16) + "+";
  };
  for (const cell of cells) {
    if (cell !== previous) {
      flush();
      output += cell.toString(16).padStart(2, "0");
      total = 0;
      previous = cell;
    }
    total++;
  }
  flush();
  return output;
};
const grid = (w, h, blocked = []) => {
  const cells = Array.from({ length: w * h }, (_, i) =>
    i % w === 0 || i % w === w - 1 || i < w || i >= w * (h - 1) ? 1 : 0,
  );
  for (const [x, y] of blocked) cells[y * w + x] = 1;
  return pack(cells);
};
const visit = (flag, introduction) => [
  branch(flag, [], [set(flag, 1), text(introduction)]),
  end(),
];
const oldSun = "examples/isometric-adventure";
const oldPoach = "examples/poachermon";
const sunScene = read(`${oldSun}/project/scenes/iso_village/scene.gbsres`);
const poachScene = read(`${oldPoach}/project/scenes/scene_1/scene.gbsres`);
const prototype = (game, original, current) =>
  read(
    `${game}/project/scenes/${fs.existsSync(path.join(root, game, "project/scenes", original)) ? original : current}`,
  );
const sunActor = prototype(
  oldSun,
  "iso_village/actors/npc.gbsres",
  "iso_village/actors/actor_keeper_nia.gbsres",
);
const coreActor = prototype(
  oldSun,
  "iso_village/actors/sunstone_core.gbsres",
  "relay_restored/actors/actor_sunstone_core.gbsres",
);
const poachActors = Object.fromEntries(
  [
    ["captain_rowan", "scene_1"],
    ["witness_finn", "scene_1"],
    ["left_snare", "snare_trail"],
    ["right_snare", "snare_trail"],
    ["poacher_ash", "snare_trail"],
    ["poacher_moss", "case_closed"],
    ["trapped_creature", "case_closed"],
  ].map(([name, slug]) => [
    name,
    prototype(
      oldPoach,
      `scene_1/actors/${name}.gbsres`,
      `${slug}/actors/actor_${name}.gbsres`,
    ),
  ]),
);

function clearScenes(gameRoot) {
  const target = path.resolve(root, gameRoot, "project/scenes");
  if (
    !target.startsWith(root + path.sep) ||
    !target.endsWith(path.join("project", "scenes"))
  )
    throw new Error("Invalid campaign directory");
  function walk(directory) {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, item.name);
      if (item.isDirectory()) walk(file);
      else if (item.name.endsWith(".gbsres")) fs.unlinkSync(file);
    }
  }
  walk(target);
}
function scene(
  game,
  base,
  slug,
  name,
  index,
  background,
  script,
  collisions,
  type = base.type,
) {
  const resource = {
    ...base,
    id: id(`${game}:${slug}`),
    _index: index,
    type,
    name,
    symbol: `scene_${slug}`,
    x: 100 + index * 350,
    y: 100,
    backgroundId: background,
    script,
    collisions,
  };
  if (type === "LOGO") {
    resource.width = 30;
    resource.height = 20;
    resource.collisions = grid(30, 20);
  }
  write(`${game}/project/scenes/${slug}/scene.gbsres`, resource);
  return resource;
}
function actor(game, slug, prototype, symbol, name, x, y, script) {
  const resource = {
    ...prototype,
    id: id(`${game}:${slug}:${symbol}`),
    symbol,
    name,
    x,
    y,
    _index: 0,
    script: [...script, end()],
    startScript: [],
    updateScript: [],
    hit1Script: [],
    hit2Script: [],
    hit3Script: [],
    persistent: true,
  };
  write(`${game}/project/scenes/${slug}/actors/${symbol}.gbsres`, resource);
  return resource;
}
function trigger(game, slug, symbol, x, y, script, width = 1, height = 1) {
  write(`${game}/project/scenes/${slug}/triggers/${symbol}.gbsres`, {
    _resourceType: "trigger",
    id: id(`${game}:${symbol}`),
    symbol,
    name: symbol.replaceAll("_", " "),
    _index: 0,
    x,
    y,
    width,
    height,
    script: [...script, end()],
    leaveScript: [],
  });
}
function png(file, image) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), PNG.sync.write(image));
}
function background(game, slug, image) {
  const resource = {
    _resourceType: "background",
    id: id(`${game}:bg:${slug}`),
    name: slug.replaceAll("_", " "),
    symbol: `bg_${slug}`,
    filename: `${slug}.png`,
    tileColors: "",
    width: 30,
    height: 20,
    imageWidth: 240,
    imageHeight: 160,
    autoColor: true,
  };
  png(`${game}/assets/backgrounds/${slug}.png`, image);
  write(`${game}/assets/backgrounds/${slug}.png.gbsres`, resource);
  return resource.id;
}
const font = {
  A: "01110100011000111111100011000110001",
  B: "11110100011000111110100011000111110",
  C: "01111100001000010000100001000001111",
  D: "11110100011000110001100011000111110",
  E: "11111100001000011110100001000011111",
  F: "11111100001000011110100001000010000",
  G: "01111100001000010111100011000101111",
  H: "10001100011000111111100011000110001",
  I: "11111001000010000100001000010011111",
  J: "00111000100001000010100101001001100",
  K: "10001100101010011000101001001010001",
  L: "10000100001000010000100001000011111",
  M: "10001110111010110101100011000110001",
  N: "10001110011010110011100011000110001",
  O: "01110100011000110001100011000101110",
  P: "11110100011000111110100001000010000",
  Q: "01110100011000110001101011001001101",
  R: "11110100011000111110101001001010001",
  S: "01111100001000001110000010000111110",
  T: "11111001000010000100001000010000100",
  U: "10001100011000110001100011000101110",
  V: "10001100011000110001100010101000100",
  W: "10001100011000110101101011101110001",
  X: "10001100010101000100010101000110001",
  Y: "10001100010101000100001000010000100",
  Z: "11111000010001000100010001000011111",
  1: "00100011000010000100001000010001110",
  2: "01110100010000100010001000100011111",
  3: "11110000010000101110000010000111110",
  ":": "00000001000010000000001000010000000",
};
const color = (hex) => [
  parseInt(hex.slice(0, 2), 16),
  parseInt(hex.slice(2, 4), 16),
  parseInt(hex.slice(4, 6), 16),
  255,
];
function fill(image, x, y, w, h, hex) {
  for (let py = y; py < y + h; py++)
    for (let px = x; px < x + w; px++)
      if (px >= 0 && px < 240 && py >= 0 && py < 160)
        image.data.set(color(hex), (py * 240 + px) * 4);
}
function lettering(image, label, y, scale = 1, ink = "F7EDC3") {
  const start = Math.floor((240 - (label.length * 6 - 1) * scale) / 2);
  [...label].forEach((c, i) => {
    const glyph = font[c] || "0".repeat(35);
    for (let p = 0; p < 35; p++)
      if (glyph[p] === "1")
        fill(
          image,
          start + i * 6 * scale + (p % 5) * scale,
          y + Math.floor(p / 5) * scale,
          scale,
          scale,
          ink,
        );
  });
}
function title(kind) {
  const image = new PNG({ width: 240, height: 160 });
  fill(image, 0, 0, 240, 160, "0B1628");
  fill(image, 8, 8, 224, 2, "46556A");
  fill(image, 8, 150, 224, 2, "46556A");
  fill(image, 8, 8, 2, 144, "46556A");
  fill(image, 230, 8, 2, 144, "46556A");
  if (kind === "sun") {
    for (let y = 0; y < 12; y++) {
      const span = y < 6 ? y + 1 : 12 - y;
      fill(image, 120 - span * 2, 18 + y * 2, span * 4, 2, "F0A732");
    }
    lettering(image, "SUNSTONE", 54, 2);
    lettering(image, "RELAY", 74, 2);
    lettering(image, "THE DAWN CIRCUIT", 105);
  } else {
    fill(image, 111, 20, 18, 12, "D3A474");
    for (const x of [104, 113, 122, 131]) fill(image, x, 15, 5, 5, "D3A474");
    lettering(image, "POACHERMON", 52, 2);
    lettering(image, "BEIGE CRIMES UNIT", 78);
    lettering(image, "CASE 001: THE SNARE AFFAIR", 101);
  }
  lettering(image, "PRESS START", 130, 1, "ABD26B");
  return image;
}
function field(stage) {
  const image = new PNG({ width: 240, height: 160 });
  fill(image, 0, 0, 240, 160, "638E43");
  fill(image, 104, 8, 24, 144, "D3A474");
  fill(image, 16, 88, 208, 16, "D3A474");
  fill(image, 110, 8, 12, 144, "F0D59B");
  const source = PNG.sync.read(
    fs.readFileSync(
      path.join(root, oldPoach, "assets/backgrounds/poachermon_field.png"),
    ),
  );
  const tree = (x, y) => {
    for (let dy = 0; dy < 24; dy++)
      for (let dx = 0; dx < 16; dx++)
        source.data.copy(
          image.data,
          ((y + dy) * 240 + x + dx) * 4,
          ((8 + dy) * 240 + 16 + dx) * 4,
          ((8 + dy) * 240 + 16 + dx) * 4 + 4,
        );
  };
  for (const x of [16, 40, 64, 160, 184, 208]) {
    tree(x, 0);
    tree(x, 136);
  }
  for (const y of [32, 64, 96]) {
    tree(0, y);
    tree(224, y);
  }
  if (stage === 2) {
    fill(image, 176, 24, 48, 112, "478795");
    fill(image, 172, 24, 4, 112, "72BAC1");
    fill(image, 176, 96, 48, 8, "AC7951");
    for (let x = 176; x < 224; x += 8) fill(image, x, 96, 1, 8, "463B32");
    for (let y = 32; y < 130; y += 16) fill(image, 190, y, 18, 1, "BDDEE0");
  } else {
    for (const [x, y] of [
      [40, 40],
      [176, 40],
      [48, 112],
      [184, 112],
    ])
      tree(x, y);
    fill(image, 64, 120, 8, 8, "F7EDC3");
    fill(image, 184, 120, 8, 8, "F7EDC3");
  }
  return image;
}

function makeSun() {
  const game = oldSun;
  const titleId = id(`${game}:title`),
    villageId = id(`${game}:iso_village`),
    ridgeId = id(`${game}:windridge`),
    finalId = id(`${game}:relay_restored`);
  clearScenes(game);
  const titleBg = background(game, "sunstone_title", title("sun"));
  const ridgeBg = background(game, "windridge", renderIsometricBackground(1));
  const finalBg = background(
    game,
    "relay_sanctum",
    renderIsometricBackground(2),
  );
  scene(
    game,
    sunScene,
    "title",
    "The Sunstone Relay",
    0,
    titleBg,
    [
      hide("player"),
      ...Array.from({ length: 9 }, (_, i) => set(i, 0)),
      wait(),
      go(villageId, 4, 5),
      end(),
    ],
    grid(30, 20),
    "LOGO",
  );
  scene(
    game,
    sunScene,
    "iso_village",
    "1: Keeper Village",
    1,
    sunScene.backgroundId,
    visit(6, "KEEPER VILLAGE\nTalk to Nia. A interacts."),
    grid(8, 7, [
      [1, 2],
      [1, 3],
      [2, 2],
      [5, 4],
    ]),
  );
  actor(game, "iso_village", sunActor, "actor_keeper_nia", "Keeper Nia", 5, 4, [
    branch(
      0,
      [text("Follow the gold east marker.\nTwo ridge beacons need waking.")],
      [
        text("Dawn has faded from our valley.\nWill you restore the relay?"),
        set(0, 1),
        text(
          "Wake both Windridge beacons.\nThen bring the core to the shrine.",
        ),
      ],
    ),
  ]);
  trigger(game, "iso_village", "trigger_village_exit", 6, 5, [
    branch(
      0,
      [go(ridgeId, 2, 5)],
      [text("Talk to Keeper Nia first.\nShe stands north of the start.")],
    ),
  ]);
  scene(
    game,
    sunScene,
    "windridge",
    "2: Windridge Beacons",
    2,
    ridgeBg,
    visit(7, "WINDRIDGE\nStep on the two gold beacons."),
    grid(8, 7),
  );
  for (const [flag, x, y, label] of [
    [2, 1, 2, "WEST"],
    [3, 6, 3, "EAST"],
  ])
    trigger(game, "windridge", `trigger_${label.toLowerCase()}_beacon`, x, y, [
      branch(
        flag,
        [],
        [
          set(flag, 1),
          inc(1),
          text(`${label} BEACON LIT\nBeacons restored: {1}/2.`),
        ],
      ),
    ]);
  trigger(game, "windridge", "trigger_ridge_return", 1, 5, [
    go(villageId, 5, 5),
  ]);
  trigger(game, "windridge", "trigger_ridge_exit", 6, 5, [
    count(
      1,
      2,
      [go(finalId, 4, 5)],
      [text("The shrine gate is still sealed.\nLight both beacons: {1}/2.")],
    ),
  ]);
  scene(
    game,
    sunScene,
    "relay_restored",
    "3: Sunstone Sanctum",
    3,
    finalBg,
    [
      ...visit(8, "SUNSTONE SANCTUM\nTake the lake core to Nia.").slice(0, -1),
      branch(4, [hide(id(`${game}:relay_restored:actor_sunstone_core`))]),
      end(),
    ],
    grid(8, 7, [
      [3, 2],
      [2, 2],
      [2, 1],
      [5, 5],
    ]),
  );
  actor(
    game,
    "relay_restored",
    coreActor,
    "actor_sunstone_core",
    "Sunstone Core",
    3,
    2,
    [
      branch(
        4,
        [text("The core is already yours.")],
        [
          set(4, 1),
          text("SUNSTONE RECOVERED\nBring its light to Keeper Nia."),
          hide("$self$"),
        ],
      ),
    ],
  );
  actor(
    game,
    "relay_restored",
    sunActor,
    "actor_sanctum_nia",
    "Keeper Nia",
    5,
    5,
    [
      branch(
        4,
        [
          set(5, 1),
          hide("player"),
          text("THE RELAY SHINES AGAIN\nBoth beacons guide dawn home."),
          text("THE SUNSTONE RELAY\nJourney complete. Thank you!"),
          text(
            "Beacons: {1}/2  Core: recovered\nPress A, then START to replay.",
          ),
          wait(),
          go(titleId, 15, 10),
        ],
        [
          text(
            "The core waits in the north pool.\nStand beside it and press A.",
          ),
        ],
      ),
    ],
  );
  trigger(game, "relay_restored", "trigger_sanctum_return", 1, 5, [
    go(ridgeId, 5, 5),
  ]);
  const settings = read(`${game}/project/settings.gbsres`);
  settings.startSceneId = titleId;
  settings.startX = 15;
  settings.startY = 10;
  write(`${game}/project/settings.gbsres`, settings);
  const variables = read(`${game}/project/variables.gbsres`);
  variables.variables = variables.variables.filter((v) => Number(v.id) < 6);
  for (let i = 6; i < 9; i++)
    variables.variables.push({
      id: String(i),
      name: `Area ${i - 5} visited`,
      symbol: `var_area_${i - 5}`,
    });
  write(`${game}/project/variables.gbsres`, variables);
}
function makePoach() {
  const game = oldPoach;
  const titleId = id(`${game}:title`),
    officeId = id(`${game}:scene_1`),
    trailId = id(`${game}:snare_trail`),
    finalId = id(`${game}:case_closed`);
  clearScenes(game);
  const titleBg = background(game, "poachermon_title", title("poach"));
  const trailBg = background(game, "snare_trail", field(1)),
    riverBg = background(game, "reedbank", field(2));
  scene(
    game,
    poachScene,
    "title",
    "Poachermon: Case 001",
    0,
    titleBg,
    [
      hide("player"),
      ...Array.from({ length: 18 }, (_, i) => set(i, 0)),
      wait(),
      go(officeId, 15, 18),
      end(),
    ],
    grid(30, 20),
    "LOGO",
  );
  scene(
    game,
    poachScene,
    "scene_1",
    "1: Ranger Outpost",
    1,
    poachScene.backgroundId,
    visit(15, "RANGER OUTPOST\nA talks. Ask Rowan for your case."),
    poachScene.collisions,
  );
  actor(
    game,
    "scene_1",
    poachActors.captain_rowan,
    "actor_captain_rowan",
    "Captain Rowan",
    15,
    17,
    [
      branch(
        0,
        [
          text(
            "Follow the west trail marker.\nTag two snares, then catch Ash.",
          ),
        ],
        [
          text("CASE 001: THE SNARE AFFAIR\nSnares threaten the reserve."),
          set(0, 1),
          set(6, 2),
          text(
            "Find evidence on Snare Trail.\nThen rescue the river creature.",
          ),
        ],
      ),
    ],
  );
  actor(
    game,
    "scene_1",
    poachActors.witness_finn,
    "actor_witness_finn",
    "Witness Finn",
    12,
    15,
    [text("Two snares lie beside the path.\nAsh waits just north of them.")],
  );
  trigger(
    game,
    "scene_1",
    "trigger_outpost_exit",
    5,
    18,
    [
      branch(
        0,
        [go(trailId, 14, 17)],
        [
          text(
            "Ask Captain Rowan for the case.\nHe is beside the outpost door.",
          ),
        ],
      ),
    ],
    2,
    1,
  );
  const trailBlocks = [
    [5, 5],
    [6, 5],
    [22, 5],
    [23, 5],
    [6, 14],
    [7, 14],
    [23, 14],
    [24, 14],
  ];
  scene(
    game,
    poachScene,
    "snare_trail",
    "2: Snare Trail",
    2,
    trailBg,
    [
      ...visit(
        16,
        "SNARE TRAIL\nTag both snares before confronting Ash.",
      ).slice(0, -1),
      branch(11, [hide(id(`${game}:snare_trail:actor_poacher_ash`))]),
      end(),
    ],
    grid(30, 20, trailBlocks),
  );
  const evidence = (flag, label) => [
    branch(
      flag,
      [text("This snare is already tagged.")],
      [
        set(flag, 1),
        inc(1),
        event("EVENT_DEC_VALUE", { variable: "6" }),
        text(`${label} SNARE TAGGED\nEvidence collected: {1}/2.`),
      ],
    ),
  ];
  actor(
    game,
    "snare_trail",
    poachActors.left_snare,
    "actor_left_snare",
    "West snare",
    8,
    15,
    evidence(8, "WEST"),
  );
  actor(
    game,
    "snare_trail",
    poachActors.right_snare,
    "actor_right_snare",
    "East snare",
    23,
    15,
    evidence(9, "EAST"),
  );
  actor(
    game,
    "snare_trail",
    poachActors.poacher_ash,
    "actor_poacher_ash",
    "Poacher Ash",
    14,
    10,
    [
      branch(
        11,
        [text("Ash is detained. The trail is safe.")],
        [
          count(
            1,
            2,
            [
              text("The snares match your pack, Ash.\nYou are under arrest."),
              set(11, 1),
              inc(2),
              hide("$self$"),
            ],
            [text("You have no proof, ranger.\nTag both snares first.")],
          ),
        ],
      ),
    ],
  );
  trigger(
    game,
    "snare_trail",
    "trigger_trail_return",
    14,
    18,
    [go(officeId, 7, 18)],
    2,
    1,
  );
  trigger(
    game,
    "snare_trail",
    "trigger_trail_exit",
    14,
    3,
    [
      branch(
        11,
        [go(finalId, 14, 17)],
        [
          text(
            "Ash must be detained first.\nEvidence: {1}/2. Find both snares.",
          ),
        ],
      ),
    ],
    2,
    1,
  );
  const riverBlocks = [];
  for (let y = 3; y < 17; y++)
    for (let x = 22; x < 28; x++) if (y !== 12) riverBlocks.push([x, y]);
  scene(
    game,
    poachScene,
    "case_closed",
    "3: Reedbank Rescue",
    3,
    riverBg,
    [
      ...visit(
        17,
        "REEDBANK RESCUE\nCatch Moss, then free the creature.",
      ).slice(0, -1),
      branch(12, [hide(id(`${game}:case_closed:actor_poacher_moss`))]),
      branch(13, [hide(id(`${game}:case_closed:actor_trapped_creature`))]),
      end(),
    ],
    grid(30, 20, riverBlocks),
  );
  actor(
    game,
    "case_closed",
    poachActors.poacher_moss,
    "actor_poacher_moss",
    "Poacher Moss",
    14,
    8,
    [
      branch(
        12,
        [text("Moss has been detained.")],
        [
          text(
            "Ash named your trapping route.\nThe riverbank is closed, Moss.",
          ),
          set(12, 1),
          inc(2),
          hide("$self$"),
        ],
      ),
    ],
  );
  actor(
    game,
    "case_closed",
    poachActors.trapped_creature,
    "actor_trapped_creature",
    "Trapped creature",
    18,
    10,
    [
      branch(
        13,
        [text("The creature is safe now.")],
        [
          branch(
            12,
            [
              text(
                "You cut the last snare free.\nThe creature returns to the reeds.",
              ),
              set(13, 1),
              set(3, 1),
              hide("$self$"),
            ],
            [
              text(
                "Moss still guards the snare.\nDetain him before the rescue.",
              ),
            ],
          ),
        ],
      ),
    ],
  );
  actor(
    game,
    "case_closed",
    poachActors.captain_rowan,
    "actor_field_rowan",
    "Captain Rowan",
    14,
    15,
    [
      branch(
        3,
        [
          set(4, 1),
          set(14, 100),
          hide("player"),
          text(
            "CASE CLOSED: THE SNARE AFFAIR\nTwo poachers detained. One life saved.",
          ),
          text("FIELD REPORT\nEvidence {1}/2  Arrests {2}/2"),
          text(
            "Reserve safe. Field score: {14}.\nPress A, then START for a new case.",
          ),
          wait(),
          go(titleId, 15, 10),
        ],
        [
          text(
            "Find Moss near the north path.\nFree the creature, then report here.",
          ),
        ],
      ),
    ],
  );
  trigger(
    game,
    "case_closed",
    "trigger_reedbank_return",
    14,
    18,
    [go(trailId, 14, 4)],
    2,
    1,
  );
  const settings = read(`${game}/project/settings.gbsres`);
  settings.startSceneId = titleId;
  settings.startX = 15;
  settings.startY = 10;
  write(`${game}/project/settings.gbsres`, settings);
  const variables = read(`${game}/project/variables.gbsres`);
  variables.variables = variables.variables.filter((v) => Number(v.id) < 15);
  for (let i = 15; i < 18; i++)
    variables.variables.push({
      id: String(i),
      name: `Area ${i - 14} visited`,
      symbol: `var_area_${i - 14}`,
    });
  write(`${game}/project/variables.gbsres`, variables);
}
function sync(game, template) {
  clearScenes(template);
  for (const sub of ["project", "assets/backgrounds"]) {
    const from = path.join(root, game, sub),
      to = path.join(root, template, sub);
    function walk(directory) {
      for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
        const file = path.join(directory, item.name);
        if (item.isDirectory()) walk(file);
        else if (item.name.endsWith(".gbsres") || item.name.endsWith(".png")) {
          const target = path.join(to, path.relative(from, file));
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.copyFileSync(file, target);
        }
      }
    }
    walk(from);
  }
}
makeSun();
makePoach();
sync(oldSun, "appData/templates/gba-iso");
sync(oldPoach, "appData/templates/gba-poachermon");
console.log(
  "Both campaigns now have a title, three playable scenes, objective gates and replay.",
);
