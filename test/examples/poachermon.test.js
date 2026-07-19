const fs = require("fs");
const path = require("path");

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
    }));
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
    const variables = resources.find(
      ({ resource }) => resource._resourceType === "variables",
    ).resource.variables;

    expect(scenes).toHaveLength(2);
    expect(actors.length).toBeGreaterThanOrEqual(7);
    expect(triggers.length).toBeGreaterThanOrEqual(1);
    expect(variables.length).toBeGreaterThanOrEqual(15);
    expect([...commands].sort()).toEqual(requiredEvents.sort());
  });
});
