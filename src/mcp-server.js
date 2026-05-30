#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(repoRoot, "src", "cli.js");

const tools = [
  {
    name: "find_gba_project",
    description: "Find .gbasproj files under a workspace.",
    inputSchema: {
      type: "object",
      properties: {
        workspaceRoot: { type: "string", description: "Workspace folder to search. Defaults to the current repository." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "validate_gba_project",
    description: "Validate a .gbasproj file against the GBA Studio schema.",
    inputSchema: {
      type: "object",
      required: ["projectPath"],
      properties: {
        projectPath: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "inventory_gba_project",
    description: "Return scenes, actor counts, trigger counts, and asset counts for a .gbasproj file.",
    inputSchema: {
      type: "object",
      required: ["projectPath"],
      properties: {
        projectPath: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_scene",
    description: "Add a scene to a .gbasproj file after creating a .bak backup.",
    inputSchema: {
      type: "object",
      required: ["projectPath", "id", "name"],
      properties: {
        projectPath: { type: "string" },
        id: { type: "string" },
        name: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_actor",
    description: "Add an actor to an existing scene after creating a .bak backup.",
    inputSchema: {
      type: "object",
      required: ["projectPath", "sceneId", "id", "name"],
      properties: {
        projectPath: { type: "string" },
        sceneId: { type: "string" },
        id: { type: "string" },
        name: { type: "string" },
        x: { type: "integer" },
        y: { type: "integer" },
        width: { type: "integer" },
        height: { type: "integer" },
        color: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "set_start_scene",
    description: "Set the project startScene to an existing scene after creating a .bak backup.",
    inputSchema: {
      type: "object",
      required: ["projectPath", "sceneId"],
      properties: {
        projectPath: { type: "string" },
        sceneId: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "export_gba_source",
    description: "Generate a GBA C project from a .gbasproj file.",
    inputSchema: {
      type: "object",
      required: ["projectPath", "outDir"],
      properties: {
        projectPath: { type: "string" },
        outDir: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "build_gba_rom",
    description: "Build a .gba ROM, or generate source only with skipBuild.",
    inputSchema: {
      type: "object",
      required: ["projectPath", "outRom"],
      properties: {
        projectPath: { type: "string" },
        outRom: { type: "string" },
        skipBuild: { type: "boolean", default: false },
        allowOverwrite: { type: "boolean", default: false },
      },
      additionalProperties: false,
    },
  },
];

function respond(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
}

function respondError(id, code, message) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }) + "\n");
}

function textResult(text, isError = false) {
  return {
    content: [{ type: "text", text }],
    isError,
  };
}

function resolveWorkspacePath(inputPath) {
  return path.resolve(repoRoot, inputPath || ".");
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });
  const stdout = result.stdout.trim();
  const stderr = result.stderr.trim();
  if (result.error) {
    return textResult(result.error.message, true);
  }
  if (result.status !== 0) {
    return textResult(stderr || stdout || `Command failed: ${args.join(" ")}`, true);
  }
  return textResult(stdout);
}

function findProjects(workspaceRoot) {
  const root = resolveWorkspacePath(workspaceRoot);
  const ignored = new Set([".git", "node_modules", "build", "dist", "out", "gba-studio"]);
  const matches = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!ignored.has(entry.name)) {
          walk(path.join(dir, entry.name));
        }
      } else if (entry.isFile() && entry.name.endsWith(".gbasproj")) {
        matches.push(path.relative(root, path.join(dir, entry.name)).replace(/\\/g, "/"));
      }
    }
  }

  if (!fs.existsSync(root)) {
    return textResult(`Workspace does not exist: ${root}`, true);
  }
  walk(root);
  return textResult(JSON.stringify({ root, projects: matches }, null, 2));
}

function callTool(name, input = {}) {
  switch (name) {
    case "find_gba_project":
      return findProjects(input.workspaceRoot);
    case "validate_gba_project":
      return runCli(["validate", input.projectPath, "--json"]);
    case "inventory_gba_project":
      return runCli(["inventory", input.projectPath, "--json"]);
    case "create_scene":
      return runCli(["create-scene", input.projectPath, "--id", input.id, "--name", input.name, "--json"]);
    case "create_actor": {
      const args = [
        "create-actor",
        input.projectPath,
        "--scene",
        input.sceneId,
        "--id",
        input.id,
        "--name",
        input.name,
      ];
      for (const flag of ["x", "y", "width", "height", "color"]) {
        if (input[flag] !== undefined) {
          args.push(`--${flag}`, String(input[flag]));
        }
      }
      args.push("--json");
      return runCli(args);
    }
    case "set_start_scene":
      return runCli(["set-start-scene", input.projectPath, "--scene", input.sceneId, "--json"]);
    case "export_gba_source":
      return runCli(["export-c", input.projectPath, input.outDir, "--json"]);
    case "build_gba_rom": {
      const outRom = path.resolve(repoRoot, input.outRom);
      if (fs.existsSync(outRom) && !input.allowOverwrite) {
        return textResult(`Refusing to overwrite existing ROM without allowOverwrite: ${outRom}`, true);
      }
      const args = ["make:gba", input.projectPath, input.outRom];
      if (input.skipBuild) {
        args.push("--skip-build");
      }
      args.push("--json");
      return runCli(args);
    }
    default:
      return textResult(`Unknown tool: ${name}`, true);
  }
}

function handleMessage(message) {
  if (message.method === "initialize") {
    respond(message.id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "gba-studio-mcp", version: "0.1.0" },
    });
    return;
  }

  if (message.method === "tools/list") {
    respond(message.id, { tools });
    return;
  }

  if (message.method === "tools/call") {
    const { name, arguments: input } = message.params || {};
    respond(message.id, callTool(name, input || {}));
    return;
  }

  if (message.id !== undefined) {
    respondError(message.id, -32601, `Unsupported method: ${message.method}`);
  }
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let newlineIndex = buffer.indexOf("\n");
  while (newlineIndex !== -1) {
    const line = buffer.slice(0, newlineIndex).trim();
    buffer = buffer.slice(newlineIndex + 1);
    newlineIndex = buffer.indexOf("\n");
    if (!line) continue;
    try {
      handleMessage(JSON.parse(line));
    } catch (error) {
      respondError(null, -32700, error.message);
    }
  }
});
