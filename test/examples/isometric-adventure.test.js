import fs from "fs";
import path from "path";

const repoRoot = path.resolve(__dirname, "../..");
const exampleRoot = path.join(repoRoot, "examples/isometric-adventure");
const templateRoot = path.join(repoRoot, "appData/templates/gba-iso");

const supportedEvents = [
  "EVENT_ACTOR_DEACTIVATE",
  "EVENT_ACTOR_SET_DIRECTION",
  "EVENT_END",
  "EVENT_IF_FALSE",
  "EVENT_IF_TRUE",
  "EVENT_IF_VALUE",
  "EVENT_INC_VALUE",
  "EVENT_PALETTE_SET_BACKGROUND",
  "EVENT_SET_VALUE",
  "EVENT_SWITCH_SCENE",
  "EVENT_TEXT",
  "EVENT_WAIT",
];

function filesUnder(root, directory = root) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory()
      ? filesUnder(root, filename)
      : [path.relative(root, filename)];
  });
}

function loadResources(root) {
  return filesUnder(root)
    .filter((filename) => filename.endsWith(".gbsres"))
    .map((filename) =>
      JSON.parse(
        fs
          .readFileSync(path.join(root, filename), "utf8")
          .replace(/^\uFEFF/, ""),
      ),
    );
}

function collectEvents(events, commands) {
  for (const event of events || []) {
    if (!event || !event.command) continue;
    commands.add(event.command);
    for (const branch of Object.values(event.children || {})) {
      collectEvents(branch, commands);
    }
    collectEvents(event.args && event.args.true, commands);
    collectEvents(event.args && event.args.false, commands);
  }
}

function resolveValue(value, variables) {
  if (value && typeof value === "object") {
    if (value.type === "true") return 1;
    if (value.type === "false") return 0;
    if (value.type === "number") return Number(value.value) || 0;
    if (value.type === "variable") return variables[value.value] || 0;
  }
  return Number(value) || 0;
}

function runEvents(events, state, context = {}) {
  for (const event of events || []) {
    const args = event.args || {};
    const branches = event.children || {};

    switch (event.command) {
      case "EVENT_END":
        return;
      case "EVENT_TEXT":
        state.text.push(String(args.text || ""));
        break;
      case "EVENT_WAIT":
      case "EVENT_PALETTE_SET_BACKGROUND":
      case "EVENT_ACTOR_SET_DIRECTION":
        break;
      case "EVENT_SET_VALUE":
        state.variables[args.variable] = resolveValue(
          args.value,
          state.variables,
        );
        break;
      case "EVENT_INC_VALUE":
        state.variables[args.variable] =
          (state.variables[args.variable] || 0) + 1;
        break;
      case "EVENT_IF_TRUE":
        runEvents(
          state.variables[args.variable] ? branches.true : branches.false,
          state,
          context,
        );
        break;
      case "EVENT_IF_FALSE":
        runEvents(
          state.variables[args.variable] ? branches.false : branches.true,
          state,
          context,
        );
        break;
      case "EVENT_IF_VALUE": {
        const left = state.variables[args.variable] || 0;
        const right = Number(args.comparator) || 0;
        const matches = args.operator === ">=" ? left >= right : left === right;
        runEvents(matches ? branches.true : branches.false, state, context);
        break;
      }
      case "EVENT_ACTOR_DEACTIVATE":
        if (args.actorId === "$self$" && context.actor) {
          state.inactiveActors.add(context.actor.id);
        }
        break;
      case "EVENT_SWITCH_SCENE":
        state.sceneId = args.sceneId;
        break;
      default:
        throw new Error(`Unmodelled isometric event: ${event.command}`);
    }
  }
}

function reachableTiles(scene, start) {
  const visited = new Set();
  const queue = [start];
  while (queue.length) {
    const [x, y] = queue.shift();
    const key = `${x},${y}`;
    if (
      visited.has(key) ||
      x < 0 ||
      y < 0 ||
      x >= scene.width ||
      y >= scene.height ||
      scene.collisions[y * scene.width + x] !== "0"
    ) {
      continue;
    }
    visited.add(key);
    queue.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
  }
  return visited;
}

function canApproach(reachable, actor) {
  return [
    [actor.x - 1, actor.y],
    [actor.x + 1, actor.y],
    [actor.x, actor.y - 1],
    [actor.x, actor.y + 1],
  ].some(([x, y]) => reachable.has(`${x},${y}`));
}

describe("The Sunstone Relay isometric end-to-end demo", () => {
  test("keeps all portable template content byte-aligned with the example", () => {
    const isPortable = (filename) =>
      filename !== ".gitignore" && filename !== "project.gbsproj";
    const exampleFiles = filesUnder(exampleRoot).filter(isPortable).sort();
    const templateFiles = filesUnder(templateRoot).filter(isPortable).sort();

    expect(templateFiles).toEqual(exampleFiles);
    for (const filename of exampleFiles) {
      expect(fs.readFileSync(path.join(templateRoot, filename))).toEqual(
        fs.readFileSync(path.join(exampleRoot, filename)),
      );
    }
  });

  test("uses a four-direction isometric player and only supported GBA events", () => {
    const resources = loadResources(exampleRoot);
    const scenes = resources.filter(
      (resource) => resource._resourceType === "scene",
    );
    const actors = resources.filter(
      (resource) => resource._resourceType === "actor",
    );
    const triggers = resources.filter(
      (resource) => resource._resourceType === "trigger",
    );
    const variables = resources.find(
      (resource) => resource._resourceType === "variables",
    ).variables;
    const hero = resources.find(
      (resource) => resource.symbol === "sprite_iso_hero",
    );
    const commands = new Set();

    for (const resource of resources) {
      collectEvents(resource.script, commands);
      collectEvents(resource.startScript, commands);
      collectEvents(resource.updateScript, commands);
    }

    expect(scenes).toHaveLength(2);
    expect(scenes.every((scene) => scene.type === "ISOMETRIC")).toBe(true);
    expect(actors.map((actor) => actor.symbol).sort()).toEqual([
      "actor_keeper_nia",
      "actor_sunstone_core",
    ]);
    expect(triggers.map((trigger) => trigger.symbol).sort()).toEqual([
      "trigger_east_beacon",
      "trigger_west_beacon",
    ]);
    expect(variables).toHaveLength(6);
    expect(hero.states[0].animationType).toBe("iso_movement");
    expect(hero.states[0].animations).toHaveLength(4);
    expect(
      hero.states[0].animations.every(
        (animation) => animation.frames[0].tiles.length > 0,
      ),
    ).toBe(true);
    expect([...commands].sort()).toEqual(supportedEvents.sort());
  });

  test("aligns the 8x7 grid to the art and reaches every objective through collision", () => {
    const resources = loadResources(exampleRoot);
    const settings = resources.find(
      (resource) => resource._resourceType === "settings",
    );
    const background = resources.find(
      (resource) => resource.symbol === "bg_iso_village",
    );
    const village = resources.find(
      (resource) => resource.symbol === "scene_iso_village",
    );
    const actors = resources.filter(
      (resource) => resource._resourceType === "actor",
    );
    const triggers = resources.filter(
      (resource) => resource._resourceType === "trigger",
    );
    const reachable = reachableTiles(village, [
      settings.startX,
      settings.startY,
    ]);
    const walkableCount = [...village.collisions].filter(
      (cell) => cell === "0",
    ).length;

    expect(village.width).toBe(8);
    expect(village.height).toBe(7);
    expect(village.collisions).toHaveLength(village.width * village.height);
    expect(village.collisions).toContain("0");
    expect(village.collisions).toContain("1");
    expect((village.width + village.height) * 16).toBe(background.imageWidth);
    expect(reachable.size).toBe(walkableCount);

    for (const trigger of triggers) {
      expect(reachable.has(`${trigger.x},${trigger.y}`)).toBe(true);
    }
    for (const actor of actors) {
      expect(canApproach(reachable, actor)).toBe(true);
    }

    const core = actors.find((actor) => actor.symbol === "actor_sunstone_core");
    expect(village.collisions[core.y * village.width + core.x]).toBe("1");
  });

  test("executes the complete quest, its prerequisite branches, and the ending", () => {
    const resources = loadResources(exampleRoot);
    const bySymbol = Object.fromEntries(
      resources
        .filter((resource) => resource.symbol)
        .map((resource) => [resource.symbol, resource]),
    );
    const village = bySymbol.scene_iso_village;
    const ending = bySymbol.scene_iso_relay_restored;
    const nia = bySymbol.actor_keeper_nia;
    const core = bySymbol.actor_sunstone_core;
    const west = bySymbol.trigger_west_beacon;
    const east = bySymbol.trigger_east_beacon;
    const state = {
      variables: {},
      inactiveActors: new Set(),
      sceneId: village.id,
      text: [],
    };

    runEvents(village.script, state);

    runEvents(west.script, state);
    expect(state.variables).toMatchObject({ 0: 0, 1: 0, 2: 0 });

    runEvents(nia.script, state, { actor: nia });
    expect(state.variables[0]).toBe(1);

    runEvents(core.script, state, { actor: core });
    expect(state.variables[4]).toBe(0);

    runEvents(west.script, state);
    runEvents(east.script, state);
    runEvents(west.script, state);
    expect(state.variables).toMatchObject({ 1: 2, 2: 1, 3: 1 });

    runEvents(nia.script, state, { actor: nia });
    expect(state.variables[5]).toBe(0);
    expect(state.sceneId).toBe(village.id);

    runEvents(core.script, state, { actor: core });
    expect(state.variables[4]).toBe(1);
    expect(state.inactiveActors.has(core.id)).toBe(true);

    runEvents(nia.script, state, { actor: nia });
    expect(state.variables).toMatchObject({
      0: 1,
      1: 2,
      2: 1,
      3: 1,
      4: 1,
      5: 1,
    });
    expect(state.sceneId).toBe(ending.id);

    runEvents(ending.script, state);
    expect(state.text.some((text) => text.includes("DEMO COMPLETE"))).toBe(
      true,
    );
  });
});
