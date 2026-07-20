const fs = require("fs");
const path = require("path");
const {
  decompress8bitNumberString,
} = require("shared/lib/resources/compression");

const repoRoot = path.resolve(__dirname, "../..");
const exampleRoot = path.join(repoRoot, "examples/poachermon");
const templateRoot = path.join(repoRoot, "appData/templates/gba-poachermon");

const requiredEvents = [
  "EVENT_END",
  "EVENT_TEXT",
  "EVENT_SWITCH_SCENE",
  "EVENT_SET_VALUE",
  "EVENT_INC_VALUE",
  "EVENT_DEC_VALUE",
  "EVENT_VARIABLE_MATH",
  "EVENT_WAIT",
  "EVENT_PALETTE_SET_BACKGROUND",
  "EVENT_IF",
  "EVENT_IF_TRUE",
  "EVENT_IF_FALSE",
  "EVENT_IF_VALUE",
  "EVENT_GROUP",
  "EVENT_IF_COLOR_SUPPORTED",
  "EVENT_IF_INPUT",
  "EVENT_ACTOR_SET_POSITION",
  "EVENT_ACTOR_MOVE_RELATIVE",
  "EVENT_ACTOR_SET_DIRECTION",
  "EVENT_ACTOR_ACTIVATE",
  "EVENT_ACTOR_DEACTIVATE",
  "EVENT_ACTOR_COLLISIONS_ENABLE",
  "EVENT_ACTOR_COLLISIONS_DISABLE",
  "EVENT_IF_ACTOR_AT_POSITION",
  "EVENT_IF_ACTOR_RELATIVE_TO_ACTOR",
  "EVENT_CALL_CUSTOM_EVENT",
];

function filesUnder(root, directory = root) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory()
      ? filesUnder(root, filename)
      : [path.relative(root, filename)];
  });
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

function decodeSceneCollisions(resource) {
  return resource._resourceType === "scene"
    ? {
        ...resource,
        collisions: decompress8bitNumberString(resource.collisions),
      }
    : resource;
}

function loadResources(root) {
  return filesUnder(root)
    .filter((filename) => filename.endsWith(".gbsres"))
    .map((filename) => ({
      filename,
      resource: JSON.parse(
        fs
          .readFileSync(path.join(root, filename), "utf8")
          .replace(/^\uFEFF/, ""),
      ),
    }))
    .map(({ filename, resource }) => ({
      filename,
      resource: decodeSceneCollisions(resource),
    }));
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

function runCaseScript(events, state, context = {}) {
  for (const event of events || []) {
    const args = event.args || {};
    const branches = event.children || {};
    const variable = args.variable;
    let branch;

    switch (event.command) {
      case "EVENT_END":
        return;
      case "EVENT_TEXT":
      case "EVENT_WAIT":
      case "EVENT_PALETTE_SET_BACKGROUND":
        break;
      case "EVENT_GROUP":
        runCaseScript(branches.true, state, context);
        break;
      case "EVENT_SET_VALUE":
        state.variables[variable] = resolveValue(args.value, state.variables);
        break;
      case "EVENT_INC_VALUE":
        state.variables[variable] = (state.variables[variable] || 0) + 1;
        break;
      case "EVENT_DEC_VALUE":
        state.variables[variable] = (state.variables[variable] || 0) - 1;
        break;
      case "EVENT_VARIABLE_MATH": {
        const current = state.variables[args.vectorX] || 0;
        const operand =
          args.other === "var"
            ? state.variables[args.vectorY] || 0
            : args.other === "rnd"
              ? args.minValue
              : args.value;
        if (args.operation === "set") state.variables[args.vectorX] = operand;
        if (args.operation === "add") {
          state.variables[args.vectorX] = current + operand;
        }
        if (args.operation === "sub") {
          state.variables[args.vectorX] = current - operand;
        }
        break;
      }
      case "EVENT_IF":
        branch = Boolean(state.variables[args.condition.value]);
        runCaseScript(branch ? branches.true : branches.false, state, context);
        break;
      case "EVENT_IF_TRUE":
        runCaseScript(
          state.variables[variable] ? branches.true : branches.false,
          state,
          context,
        );
        break;
      case "EVENT_IF_FALSE":
        runCaseScript(
          state.variables[variable] ? branches.false : branches.true,
          state,
          context,
        );
        break;
      case "EVENT_IF_VALUE": {
        const left = state.variables[variable] || 0;
        const right = Number(args.comparator) || 0;
        const matches = args.operator === ">=" ? left >= right : left === right;
        runCaseScript(matches ? branches.true : branches.false, state, context);
        break;
      }
      case "EVENT_IF_COLOR_SUPPORTED":
        runCaseScript(branches.true, state, context);
        break;
      case "EVENT_IF_INPUT":
        runCaseScript(branches.false, state, context);
        break;
      case "EVENT_IF_ACTOR_AT_POSITION": {
        const actor =
          args.actorId === "$self$"
            ? context.actor
            : state.actors[args.actorId];
        const matches =
          actor &&
          actor.x === resolveValue(args.x, state.variables) &&
          actor.y === resolveValue(args.y, state.variables);
        runCaseScript(matches ? branches.true : branches.false, state, context);
        break;
      }
      case "EVENT_IF_ACTOR_RELATIVE_TO_ACTOR":
        // These branches only vary dialogue; take one deterministically.
        runCaseScript(branches.false, state, context);
        break;
      case "EVENT_CALL_CUSTOM_EVENT":
        runCaseScript(state.scripts[args.customEventId].script, state, context);
        break;
      case "EVENT_SWITCH_SCENE":
        state.sceneId = args.sceneId;
        break;
      case "EVENT_ACTOR_SET_POSITION": {
        const actor =
          args.actorId === "$self$"
            ? context.actor
            : state.actors[args.actorId];
        if (actor) {
          actor.x = resolveValue(args.x, state.variables);
          actor.y = resolveValue(args.y, state.variables);
        }
        break;
      }
      case "EVENT_ACTOR_MOVE_RELATIVE": {
        const actor =
          args.actorId === "$self$"
            ? context.actor
            : state.actors[args.actorId];
        if (actor) {
          actor.x += resolveValue(args.x, state.variables);
          actor.y += resolveValue(args.y, state.variables);
        }
        break;
      }
      case "EVENT_ACTOR_ACTIVATE":
      case "EVENT_ACTOR_DEACTIVATE":
      case "EVENT_ACTOR_SET_DIRECTION":
      case "EVENT_ACTOR_COLLISIONS_ENABLE":
      case "EVENT_ACTOR_COLLISIONS_DISABLE":
        break;
      default:
        throw new Error(`Unmodelled Poachermon event: ${event.command}`);
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
      scene.collisions[y * scene.width + x] !== 0
    ) {
      continue;
    }
    visited.add(key);
    queue.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
  }
  return visited;
}

function canInteract(reachable, actor) {
  for (let y = actor.y - 1; y <= actor.y + 1; y++) {
    for (let x = actor.x - 1; x <= actor.x + 1; x++) {
      if (reachable.has(`${x},${y}`)) return true;
    }
  }
  return false;
}

describe("Poachermon end-to-end demo", () => {
  test("keeps the distributable template byte-for-byte aligned with the example project", () => {
    const exampleFiles = filesUnder(exampleRoot).filter((filename) =>
      /^(project(?:[\\/]|\.gbsproj$)|README\.md$)/.test(filename),
    );
    const templateFiles = filesUnder(templateRoot).filter((filename) =>
      /^(project(?:[\\/]|\.gbsproj$)|README\.md$)/.test(filename),
    );
    expect(templateFiles.sort()).toEqual(exampleFiles.sort());
    for (const filename of exampleFiles) {
      expect(fs.readFileSync(path.join(templateRoot, filename))).toEqual(
        fs.readFileSync(path.join(exampleRoot, filename)),
      );
    }
  });

  test("contains a complete playable case and only GBA-supported script events", () => {
    const resources = loadResources(exampleRoot);
    const commands = new Set();
    for (const { resource } of resources) {
      collectEvents(resource.script, commands);
      collectEvents(resource.startScript, commands);
      collectEvents(resource.updateScript, commands);
    }

    const scenes = resources.filter(
      ({ resource }) => resource._resourceType === "scene",
    );
    const actors = resources.filter(
      ({ resource }) => resource._resourceType === "actor",
    );
    const triggers = resources.filter(
      ({ resource }) => resource._resourceType === "trigger",
    );
    const sprites = resources.filter(
      ({ resource }) => resource._resourceType === "sprite",
    );
    const variables = resources.find(
      ({ resource }) => resource._resourceType === "variables",
    ).resource.variables;

    expect(scenes).toHaveLength(2);
    expect(actors.length).toBeGreaterThanOrEqual(7);
    expect(triggers.length).toBeGreaterThanOrEqual(1);
    expect(
      sprites.every(({ resource }) => resource.transparentColor === "000000"),
    ).toBe(true);
    expect(variables.length).toBeGreaterThanOrEqual(15);
    expect([...commands].sort()).toEqual(requiredEvents.sort());
  });

  test("can reach every objective and execute the full case to its ending", () => {
    const resources = loadResources(exampleRoot).map(
      ({ resource }) => resource,
    );
    const scene = resources.find(
      (resource) => resource.symbol === "scene_poachermon_field_office",
    );
    const actors = resources.filter(
      (resource) => resource._resourceType === "actor",
    );
    const actorsBySymbol = Object.fromEntries(
      actors.map((actor) => [actor.symbol, actor]),
    );
    const reachable = reachableTiles(scene, [15, 18]);
    const objectives = [
      "actor_captain_rowan",
      "actor_left_snare",
      "actor_right_snare",
      "actor_poacher_ash",
      "actor_poacher_moss",
      "actor_trapped_creature",
    ];

    expect(scene.collisions).toHaveLength(scene.width * scene.height);
    for (const symbol of objectives) {
      expect(canInteract(reachable, actorsBySymbol[symbol])).toBe(true);
    }

    const state = {
      variables: {},
      actors: Object.fromEntries(
        actors.map((actor) => [actor.id, { ...actor }]),
      ),
      scripts: Object.fromEntries(
        resources
          .filter((resource) => resource._resourceType === "script")
          .map((script) => [script.id, script]),
      ),
      sceneId: scene.id,
    };
    const interact = (symbol) => {
      const actor = actorsBySymbol[symbol];
      runCaseScript(actor.script, state, { actor: state.actors[actor.id] });
    };

    runCaseScript(scene.script, state);
    interact("actor_captain_rowan");
    interact("actor_left_snare");
    interact("actor_right_snare");
    interact("actor_poacher_ash");
    interact("actor_poacher_moss");
    interact("actor_trapped_creature");
    interact("actor_captain_rowan");

    expect(state.variables).toMatchObject({
      0: 1,
      1: 2,
      2: 2,
      3: 1,
      4: 1,
      6: 0,
      8: 1,
      9: 1,
      11: 1,
      12: 1,
      13: 1,
    });
    expect(state.sceneId).toBe("5ce7e000-0000-4a00-8000-000000000099");
  });
});
