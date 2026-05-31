import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, "..");
const cli = path.join(repo, "src", "cli.js");
const tempRoot = path.join(repo, "test", "tmp");

function runCli(args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: repo,
    encoding: "utf8",
  });
  return result;
}

function expectOk(args) {
  const result = runCli(args);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`Command failed: ${args.join(" ")} (exit ${result.status})`);
  }
  return result.stdout.trim();
}

function expectJson(args) {
  const stdout = expectOk(args);
  return JSON.parse(stdout);
}

function cleanTemp() {
  fs.rmSync(tempRoot, { recursive: true, force: true });
  fs.mkdirSync(tempRoot, { recursive: true });
}

function main() {
  cleanTemp();

  console.log("Running CLI smoke tests...");

  const validOutput = expectOk(["validate", "examples/blank/project.gbasproj"]);
  assert(validOutput.includes("Valid GBA Studio project"));

  const inventory = expectJson(["inventory", "examples/blank/project.gbasproj", "--json"]);
  assert.strictEqual(inventory.sceneCount, 1);
  assert.strictEqual(inventory.actorCount, 1);
  assert.strictEqual(inventory.assets.backgrounds, 0);

  const tempProject = path.join(tempRoot, "blank-copy.gbasproj");
  fs.copyFileSync(path.join(repo, "examples", "blank", "project.gbasproj"), tempProject);

  const sceneResult = expectJson([
    "create-scene",
    tempProject,
    "--id",
    "town",
    "--name",
    "Town",
    "--json",
  ]);
  assert.strictEqual(sceneResult.created, true);
  assert.strictEqual(sceneResult.scene.id, "town");

  const actorResult = expectJson([
    "create-actor",
    tempProject,
    "--scene",
    "town",
    "--id",
    "signpost",
    "--name",
    "Signpost",
    "--json",
  ]);
  assert.strictEqual(actorResult.created, true);
  assert.strictEqual(actorResult.actor.id, "signpost");

  const startSceneResult = expectJson([
    "set-start-scene",
    tempProject,
    "--scene",
    "town",
    "--json",
  ]);
  assert.strictEqual(startSceneResult.updated, true);
  assert.strictEqual(startSceneResult.startScene, "town");

  const invalidActorResult = runCli([
    "create-actor",
    tempProject,
    "--scene",
    "town",
    "--id",
    "bad",
    "--name",
    "Bad",
    "--x",
    "not-a-number",
  ]);
  assert.notStrictEqual(invalidActorResult.status, 0);
  assert(invalidActorResult.stderr.includes("--x must be an integer"));

  const validateTemp = expectJson(["validate", tempProject, "--json"]);
  assert.strictEqual(validateTemp.valid, true);

  expectOk(["export-c", "examples/blank/project.gbasproj", "build/generated/blank-test"]);
  expectOk(["make:gba", "examples/blank/project.gbasproj", "build/rom/blank.gba", "--skip-build"]);

  if (fs.existsSync(path.join(repo, "examples", "town-demo", "project.gbasproj"))) {
    expectOk(["validate", "examples/town-demo/project.gbasproj"]);
    expectOk(["export-c", "examples/town-demo/project.gbasproj", "build/generated/town-demo"]);
  }

  console.log("All tests passed.");
}

main();
