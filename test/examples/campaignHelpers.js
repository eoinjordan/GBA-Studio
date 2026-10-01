import fs from "fs";
import path from "path";
import { decompress8bitNumberString } from "shared/lib/resources/compression";
import { compileGBAScript } from "lib/compiler/compileGBAEvents";

const root = path.resolve(__dirname, "../..");
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}
export function campaign(game) {
  const directory = path.join(root, "examples", game);
  const resources = files(path.join(directory, "project"))
    .filter((file) => file.endsWith(".gbsres"))
    .map((file) => ({ ...JSON.parse(fs.readFileSync(file, "utf8")), file }));
  const scenes = resources.filter((item) => item._resourceType === "scene");
  const bySymbol = Object.fromEntries(
    resources.filter((item) => item.symbol).map((item) => [item.symbol, item]),
  );
  const settings = resources.find((item) => item._resourceType === "settings");
  const state = {
    variables: {},
    sceneId: settings.startSceneId,
    pending: null,
    messages: [],
  };
  function run(script, self) {
    const queue = [...(script || [])];
    while (queue.length) {
      const event = queue.shift();
      const args = event.args || {};
      const variable = args.variable;
      switch (event.command) {
        case "EVENT_END":
          return;
        case "EVENT_SET_VALUE":
          state.variables[variable] = args.value.value;
          break;
        case "EVENT_INC_VALUE":
          state.variables[variable] = (state.variables[variable] || 0) + 1;
          break;
        case "EVENT_DEC_VALUE":
          state.variables[variable] = (state.variables[variable] || 0) - 1;
          break;
        case "EVENT_IF_TRUE":
          queue.unshift(
            ...(event.children[
              state.variables[variable] || 0 ? "true" : "false"
            ] || []),
          );
          break;
        case "EVENT_IF_VALUE":
          queue.unshift(
            ...(event.children[
              (state.variables[variable] || 0) >= args.comparator
                ? "true"
                : "false"
            ] || []),
          );
          break;
        case "EVENT_TEXT":
          state.messages.push(args.text);
          break;
        case "EVENT_ACTOR_DEACTIVATE":
          break;
        case "EVENT_AWAIT_INPUT":
          state.pending = { queue, self };
          return;
        case "EVENT_SWITCH_SCENE": {
          state.sceneId = args.sceneId;
          const scene = scenes.find((item) => item.id === args.sceneId);
          run(scene.script);
          return;
        }
        default:
          throw new Error(`Unsupported campaign command: ${event.command}`);
      }
    }
  }
  function start() {
    const pending = state.pending;
    state.pending = null;
    run(pending.queue, pending.self);
  }
  function use(symbol) {
    run(bySymbol[symbol].script, bySymbol[symbol].id);
  }
  function validate(template, spawns) {
    expect(scenes).toHaveLength(4);
    expect(scenes.filter((item) => item.type === "LOGO")).toHaveLength(1);
    expect(scenes.find((item) => item.id === settings.startSceneId).type).toBe(
      "LOGO",
    );
    const sceneIndexById = Object.fromEntries(
      scenes.map((scene, index) => [scene.id, index]),
    );
    for (const scene of scenes) {
      const directory = path.dirname(scene.file);
      const entities = resources.filter(
        (item) => item.file.startsWith(directory + path.sep) && item !== scene,
      );
      const actors = entities.filter((item) => item._resourceType === "actor");
      const warnings = jest.fn();
      const context = {
        sceneIndexById,
        actorIndexById: Object.fromEntries(
          actors.map((actor, i) => [actor.id, i + 1]),
        ),
        warnings,
      };
      for (const resource of [scene, ...entities]) {
        for (const property of [
          "script",
          "startScript",
          "updateScript",
          "leaveScript",
        ]) {
          if (resource[property]) compileGBAScript(resource[property], context);
        }
      }
      expect(warnings.mock.calls).toEqual([]);
      if (scene.type === "LOGO") continue;
      const w = scene.type === "ISOMETRIC" ? 8 : 30;
      const h = scene.type === "ISOMETRIC" ? 7 : 20;
      const cells = decompress8bitNumberString(scene.collisions);
      const origin = spawns[scene.symbol];
      const seen = new Set([origin.join(",")]);
      const queue = [origin];
      while (queue.length) {
        const [x, y] = queue.shift();
        for (const [nx, ny] of [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ]) {
          const key = `${nx},${ny}`;
          if (
            nx < 0 ||
            ny < 0 ||
            nx >= w ||
            ny >= h ||
            cells[ny * w + nx] ||
            seen.has(key)
          )
            continue;
          seen.add(key);
          queue.push([nx, ny]);
        }
      }
      for (const entity of entities.filter((item) =>
        ["actor", "trigger"].includes(item._resourceType),
      )) {
        const positions =
          entity._resourceType === "actor"
            ? [
                [entity.x - 1, entity.y],
                [entity.x + 1, entity.y],
                [entity.x, entity.y - 1],
                [entity.x, entity.y + 1],
              ]
            : [[entity.x, entity.y]];
        expect({
          symbol: entity.symbol,
          reachable: positions.some((p) => seen.has(p.join(","))),
        }).toEqual({ symbol: entity.symbol, reachable: true });
      }
    }
    for (const file of files(path.join(directory, "project"))) {
      const relative = path.relative(directory, file);
      expect(
        fs.readFileSync(
          path.join(root, "appData/templates", template, relative),
        ),
      ).toEqual(fs.readFileSync(file));
    }
  }
  run(scenes.find((scene) => scene.id === settings.startSceneId).script);
  return { state, start, use, validate, bySymbol };
}
