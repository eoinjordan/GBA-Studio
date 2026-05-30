#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import Ajv2020 from "ajv/dist/2020.js";

const COMMANDS = new Set([
  "validate",
  "inventory",
  "export-c",
  "make:gba",
  "create-scene",
  "create-actor",
  "set-start-scene",
]);
const SCHEMA_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "schemas",
  "gbasproj.schema.json",
);
const ajv = new Ajv2020({ allErrors: true, strict: false });
const projectSchema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
const validateSchema = ajv.compile(projectSchema);

function getFlagValue(flags, name) {
  const index = flags.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  if (index === flags.length - 1) {
    fail(`Missing value for ${name}`);
  }
  return flags[index + 1];
}

function hasFlag(flags, name) {
  return flags.includes(name);
}

function outputResult(value, json) {
  if (json) {
    process.stdout.write(JSON.stringify(value, null, 2) + "\n");
    return;
  }

  if (typeof value === "string") {
    process.stdout.write(value + "\n");
  } else {
    process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  }
}

function backupProject(projectPath) {
  const backupPath = `${projectPath}.bak`;
  fs.copyFileSync(projectPath, backupPath);
  return backupPath;
}

function loadProject(projectPath) {
  return readJson(projectPath);
}

function saveProject(projectPath, project) {
  fs.writeFileSync(projectPath, JSON.stringify(project, null, 2) + "\n", "utf8");
}

function parseIntegerFlag(value, name, fallback) {
  if (value === undefined) {
    return fallback;
  }
  if (!/^-?\d+$/.test(String(value))) {
    fail(`${name} must be an integer.`);
  }
  return Number(value);
}

function validateOrFail(project) {
  const errors = validateProject(project);
  if (errors.length > 0) {
    fail(`Project validation failed:\n- ${errors.join("\n- ")}`);
  }
}

function inventoryProject(project) {
  return {
    valid: validateProject(project).length === 0,
    sceneCount: project.scenes.length,
    actorCount: project.scenes.reduce(
      (count, scene) => count + (scene.actors?.length || 0),
      0,
    ),
    scenes: project.scenes.map((scene) => ({
      id: scene.id,
      name: scene.name,
      actorCount: scene.actors?.length || 0,
      triggerCount: scene.triggers?.length || 0,
    })),
    assets: {
      backgrounds: project.assets?.backgrounds?.length || 0,
      sprites: project.assets?.sprites?.length || 0,
      music: project.assets?.music?.length || 0,
      sfx: project.assets?.sfx?.length || 0,
    },
  };
}

function createScene(project, id, name) {
  if (!id) {
    fail("Scene id is required.");
  }
  if (!name) {
    fail("Scene name is required.");
  }
  if (project.scenes.some((scene) => scene.id === id)) {
    fail(`Scene id already exists: ${id}`);
  }

  const newScene = {
    id,
    name,
    backgroundColor: project.palette?.background || "#000000",
    message: name,
    actors: [],
    triggers: [],
  };

  project.scenes.push(newScene);
  return newScene;
}

function createActor(project, sceneId, actorId, name, options = {}) {
  if (!sceneId) {
    fail("Scene id is required.");
  }
  if (!actorId) {
    fail("Actor id is required.");
  }
  if (!name) {
    fail("Actor name is required.");
  }

  const scene = project.scenes.find((sceneItem) => sceneItem.id === sceneId);
  if (!scene) {
    fail(`Scene not found: ${sceneId}`);
  }
  if (scene.actors.some((actor) => actor.id === actorId)) {
    fail(`Actor id already exists in scene ${sceneId}: ${actorId}`);
  }

  const newActor = {
    id: actorId,
    name,
    x: parseIntegerFlag(options.x, "--x", 112),
    y: parseIntegerFlag(options.y, "--y", 72),
    width: parseIntegerFlag(options.width, "--width", 16),
    height: parseIntegerFlag(options.height, "--height", 16),
    color: options.color || "#ffffff",
  };

  scene.actors.push(newActor);
  return newActor;
}

function setStartScene(project, sceneId) {
  if (!sceneId) {
    fail("Scene id is required.");
  }
  const scene = project.scenes.find((sceneItem) => sceneItem.id === sceneId);
  if (!scene) {
    fail(`Scene not found: ${sceneId}`);
  }
  project.startScene = sceneId;
  return scene;
}

function usage(exitCode = 0) {
  const message = `GBA Studio CLI

Usage:
  gba-studio validate <project.gbasproj>
  gba-studio inventory <project.gbasproj>
  gba-studio export-c <project.gbasproj> <out-dir>
  gba-studio make:gba <project.gbasproj> <out-rom.gba> [--skip-build]
  gba-studio create-scene <project.gbasproj> --id <id> --name <name>
  gba-studio create-actor <project.gbasproj> --scene <sceneId> --id <actorId> --name <name>
  gba-studio set-start-scene <project.gbasproj> --scene <sceneId>

Examples:
  gba-studio validate examples/blank/project.gbasproj
  gba-studio inventory examples/blank/project.gbasproj
  gba-studio export-c examples/blank/project.gbasproj build/generated/blank
  gba-studio make:gba examples/blank/project.gbasproj build/rom/blank.gba
  gba-studio create-scene examples/blank/project.gbasproj --id town --name Town
  gba-studio create-actor examples/blank/project.gbasproj --scene start --id player --name Player
  gba-studio set-start-scene examples/blank/project.gbasproj --scene start

Notes:
  make:gba requires devkitPro/devkitARM and a GBA support library such as libtonc.
  Use --skip-build to generate C source without invoking make.
  Add --json to get machine-readable JSON output from commands.
`;
  process.stdout.write(message);
  process.exit(exitCode);
}

function fail(message, exitCode = 1) {
  process.stderr.write(`Error: ${message}\n`);
  process.exit(exitCode);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Could not parse JSON at ${filePath}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function isHexColor(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function normalizeProjectPath(projectPath) {
  assert(projectPath, "Missing project path.");
  const absolute = path.resolve(projectPath);
  assert(fs.existsSync(absolute), `Project does not exist: ${absolute}`);
  assert(path.extname(absolute) === ".gbasproj", `Expected a .gbasproj file: ${absolute}`);
  return absolute;
}

function validateProject(project) {
  const errors = [];
  const valid = validateSchema(project);
  if (!valid && validateSchema.errors) {
    for (const error of validateSchema.errors) {
      const dataPath = error.instancePath || error.schemaPath || "";
      errors.push(`${dataPath} ${error.message}`.trim());
    }
  }

  const sceneIds = new Set();
  for (const [sceneIndex, scene] of (project.scenes || []).entries()) {
    if (sceneIds.has(scene.id)) errors.push(`Duplicate scene id: ${scene.id}`);
    sceneIds.add(scene.id);
  }

  if (project.startScene && !sceneIds.has(project.startScene)) {
    errors.push(`startScene '${project.startScene}' does not match any scene id.`);
  }

  return errors;
}

function hexToGbaRgb15(hex) {
  assert(isHexColor(hex), `Invalid color: ${hex}`);
  const r8 = Number.parseInt(hex.slice(1, 3), 16);
  const g8 = Number.parseInt(hex.slice(3, 5), 16);
  const b8 = Number.parseInt(hex.slice(5, 7), 16);
  const r5 = Math.round((r8 / 255) * 31);
  const g5 = Math.round((g8 / 255) * 31);
  const b5 = Math.round((b8 / 255) * 31);
  return `((${r5}) | (${g5} << 5) | (${b5} << 10))`;
}

function cString(value) {
  return JSON.stringify(String(value ?? ""));
}

function sanitizeIdentifier(value) {
  const cleaned = String(value || "unnamed").replace(/[^A-Za-z0-9_]/g, "_");
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `_${cleaned}`;
}

function generateMainC(project) {
  const startScene = project.scenes.find((scene) => scene.id === project.startScene) || project.scenes[0];
  const background = startScene.backgroundColor || project.palette?.background || "#182030";
  const backgroundRgb = hexToGbaRgb15(background);
  const actors = startScene.actors || [];

  const actorDrawCalls = actors.map((actor) => {
    const color = hexToGbaRgb15(actor.color);
    return `    draw_rect(${actor.x}, ${actor.y}, ${actor.width}, ${actor.height}, ${color}); // ${actor.name}`;
  }).join("\n");

  return `// Generated by GBA Studio. Do not edit directly; edit project.gbasproj instead.
#include <tonc.h>

#define SCREEN_WIDTH 240
#define SCREEN_HEIGHT 160

static inline void put_pixel(int x, int y, COLOR color) {
    vid_mem[y * SCREEN_WIDTH + x] = color;
}

static void draw_rect(int x, int y, int width, int height, COLOR color) {
    for (int py = y; py < y + height; py++) {
        if (py < 0 || py >= SCREEN_HEIGHT) continue;
        for (int px = x; px < x + width; px++) {
            if (px < 0 || px >= SCREEN_WIDTH) continue;
            put_pixel(px, py, color);
        }
    }
}

static void draw_scene(void) {
    m3_fill(${backgroundRgb});
${actorDrawCalls || "    // No actors in this scene yet."}
}

int main(void) {
    irq_init(NULL);
    irq_enable(II_VBLANK);
    REG_DISPCNT = DCNT_MODE3 | DCNT_BG2;

    draw_scene();

    while (1) {
        vid_vsync();
        key_poll();
    }

    return 0;
}
`;
}

function generateMetadataH(project) {
  return `// Generated by GBA Studio.
#pragma once

#define GBA_STUDIO_PROJECT_NAME ${cString(project.name)}
#define GBA_STUDIO_PROJECT_SLUG ${cString(project.slug)}
#define GBA_STUDIO_ROM_TITLE ${cString(project.rom.title)}
#define GBA_STUDIO_ROM_GAME_CODE ${cString(project.rom.gameCode)}
#define GBA_STUDIO_ROM_MAKER_CODE ${cString(project.rom.makerCode)}
#define GBA_STUDIO_START_SCENE ${cString(project.startScene)}
`;
}

function generateMakefile(project) {
  const projectName = sanitizeIdentifier(project.slug).replace(/_/g, "-");
  return `# Generated by GBA Studio.
# Requires devkitPro/devkitARM with GBA libraries installed.

ifeq ($(strip $(DEVKITARM)),)
$(error "Please set DEVKITARM in your environment. Install devkitPro/devkitARM first.")
endif

include $(DEVKITARM)/gba_rules

TARGET      := ${projectName}
BUILD       := build
SOURCES     := source
INCLUDES    := include
DATA        := data
GRAPHICS    := graphics
AUDIO       := audio

ARCH        := -mthumb -mthumb-interwork
CFLAGS      := -g -Wall -O2 $(ARCH) $(INCLUDE)
CXXFLAGS    := $(CFLAGS) -fno-rtti -fno-exceptions
ASFLAGS     := -g $(ARCH)
LDFLAGS     := -g $(ARCH) -Wl,-Map,$(notdir $@).map
LIBS        := -ltonc
LIBDIRS     := $(LIBTONC)

ifneq ($(BUILD),$(notdir $(CURDIR)))
export OUTPUT := $(CURDIR)/$(TARGET)
export VPATH  := $(foreach dir,$(SOURCES),$(CURDIR)/$(dir)) \
                 $(foreach dir,$(DATA),$(CURDIR)/$(dir)) \
                 $(foreach dir,$(GRAPHICS),$(CURDIR)/$(dir)) \
                 $(foreach dir,$(AUDIO),$(CURDIR)/$(dir))
export DEPSDIR := $(CURDIR)/$(BUILD)

CFILES      := $(foreach dir,$(SOURCES),$(notdir $(wildcard $(dir)/*.c)))
CPPFILES    := $(foreach dir,$(SOURCES),$(notdir $(wildcard $(dir)/*.cpp)))
SFILES      := $(foreach dir,$(SOURCES),$(notdir $(wildcard $(dir)/*.s)))
BINFILES    := $(foreach dir,$(DATA),$(notdir $(wildcard $(dir)/*.*)))

export OFILES := $(CPPFILES:.cpp=.o) $(CFILES:.c=.o) $(SFILES:.s=.o) $(BINFILES:.bin=.o)
export INCLUDE := $(foreach dir,$(INCLUDES),-I$(CURDIR)/$(dir)) \
                  $(foreach dir,$(LIBDIRS),-I$(dir)/include) \
                  -I$(CURDIR)/$(BUILD)
export LIBPATHS := $(foreach dir,$(LIBDIRS),-L$(dir)/lib)

.PHONY: $(BUILD) clean run

$(BUILD):
	@[ -d $@ ] || mkdir -p $@
	@$(MAKE) --no-print-directory -C $(BUILD) -f $(CURDIR)/Makefile

clean:
	@echo clean ...
	@rm -rf $(BUILD) $(TARGET).elf $(TARGET).gba $(TARGET).map

run: $(BUILD)
	@mgba-qt $(TARGET).gba || mgba $(TARGET).gba || true

else

DEPENDS := $(OFILES:.o=.d)

$(OUTPUT).gba: $(OUTPUT).elf
$(OUTPUT).elf: $(OFILES)

%.o: %.bin
	@echo $(notdir $<)
	@$(bin2o)

-include $(DEPENDS)

endif
`;
}

function generateReadme(project) {
  return `# ${project.name}

This directory was generated by GBA Studio from \`${project.slug}.gbasproj\`.

## Build

\`\`\`bash
make
\`\`\`

The generated output should be:

\`\`\`text
${project.slug}.gba
\`\`\`

## Requirements

- devkitPro/devkitARM
- GBA development libraries, including libtonc
- Optional: mGBA for local emulator testing
`;
}

function copyProjectFile(projectPath, outDir, project) {
  const targetPath = path.join(outDir, `${project.slug}.gbasproj`);
  fs.copyFileSync(projectPath, targetPath);
}

function exportC(projectPath, outDir) {
  const project = readJson(projectPath);
  const errors = validateProject(project);
  if (errors.length > 0) {
    fail(`Project validation failed:\n- ${errors.join("\n- ")}`);
  }

  fs.mkdirSync(path.join(outDir, "source"), { recursive: true });
  fs.mkdirSync(path.join(outDir, "include"), { recursive: true });
  fs.mkdirSync(path.join(outDir, "data"), { recursive: true });
  fs.mkdirSync(path.join(outDir, "graphics"), { recursive: true });
  fs.mkdirSync(path.join(outDir, "audio"), { recursive: true });

  fs.writeFileSync(path.join(outDir, "source", "main.c"), generateMainC(project));
  fs.writeFileSync(path.join(outDir, "include", "gba_studio_metadata.h"), generateMetadataH(project));
  fs.writeFileSync(path.join(outDir, "Makefile"), generateMakefile(project));
  fs.writeFileSync(path.join(outDir, "README.md"), generateReadme(project));
  copyProjectFile(projectPath, outDir, project);

  return { project, outDir };
}

function assertBuildEnvironment() {
  const missing = [];
  if (!process.env.DEVKITPRO) missing.push("DEVKITPRO");
  if (!process.env.DEVKITARM) missing.push("DEVKITARM");
  if (missing.length > 0) {
    fail(`Missing build environment: ${missing.join(", ")}. Install devkitPro/devkitARM or run with --skip-build to generate source only.`);
  }
}

function runMake(buildDir) {
  const result = spawnSync("make", [], {
    cwd: buildDir,
    stdio: "inherit",
    env: process.env
  });
  if (result.error) fail(`Could not run make: ${result.error.message}`);
  if (result.status !== 0) fail(`make failed with exit code ${result.status}.`);
}

function copyRom(buildDir, project, outputRomPath) {
  const generatedRom = path.join(buildDir, `${project.slug}.gba`);
  assert(fs.existsSync(generatedRom), `Expected generated ROM was not found: ${generatedRom}`);
  fs.mkdirSync(path.dirname(outputRomPath), { recursive: true });
  fs.copyFileSync(generatedRom, outputRomPath);
  const stat = fs.statSync(outputRomPath);
  assert(stat.size > 0, `Generated ROM is empty: ${outputRomPath}`);
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const projectArg = args[1];
  const flags = args.slice(2);
  const json = hasFlag(flags, "--json");
  const skipBuild = hasFlag(flags, "--skip-build");

  if (!command || command === "--help" || command === "-h") usage(0);
  if (!COMMANDS.has(command)) usage(1);
  if (!projectArg) fail("Missing project path.");

  const projectPath = normalizeProjectPath(projectArg);
  const project = loadProject(projectPath);
  const errors = validateProject(project);

  if (command === "validate") {
    if (errors.length > 0) {
      const result = { valid: false, errors };
      if (json) {
        outputResult(result, true);
      }
      fail(`Project validation failed:\n- ${errors.join("\n- ")}`);
    }
    outputResult(json ? { valid: true } : `Valid GBA Studio project: ${projectPath}`, json);
    return;
  }

  if (command === "inventory") {
    outputResult(inventoryProject(project), json);
    return;
  }

  if (command === "create-scene") {
    validateOrFail(project);
    const sceneId = getFlagValue(flags, "--id");
    const name = getFlagValue(flags, "--name");
    const scene = createScene(project, sceneId, name);
    validateOrFail(project);
    backupProject(projectPath);
    saveProject(projectPath, project);
    outputResult(json ? { created: true, scene } : `Created scene ${sceneId} in ${projectPath}`, json);
    return;
  }

  if (command === "create-actor") {
    validateOrFail(project);
    const sceneId = getFlagValue(flags, "--scene");
    const actorId = getFlagValue(flags, "--id");
    const name = getFlagValue(flags, "--name");
    const actorOptions = {
      color: getFlagValue(flags, "--color"),
      x: getFlagValue(flags, "--x"),
      y: getFlagValue(flags, "--y"),
      width: getFlagValue(flags, "--width"),
      height: getFlagValue(flags, "--height"),
    };
    const actor = createActor(project, sceneId, actorId, name, actorOptions);
    validateOrFail(project);
    backupProject(projectPath);
    saveProject(projectPath, project);
    outputResult(json ? { created: true, actor } : `Created actor ${actorId} in scene ${sceneId}`, json);
    return;
  }

  if (command === "set-start-scene") {
    validateOrFail(project);
    const sceneId = getFlagValue(flags, "--scene");
    const scene = setStartScene(project, sceneId);
    validateOrFail(project);
    backupProject(projectPath);
    saveProject(projectPath, project);
    outputResult(json ? { updated: true, startScene: scene.id } : `Set start scene to ${scene.id}`, json);
    return;
  }

  const outputArg = args[2];
  if (!outputArg) fail(`Missing output path for ${command}.`);
  const outputPath = path.resolve(outputArg);

  if (command === "export-c") {
    const { outDir } = exportC(projectPath, outputPath);
    outputResult(json ? { outDir } : `Generated GBA C project: ${outDir}`, json);
    return;
  }

  if (command === "make:gba") {
    const buildDir = path.resolve("build", "generated", path.basename(outputPath, ".gba"));
    exportC(projectPath, buildDir);

    if (skipBuild) {
      outputResult(json ? { generatedSource: true, buildDir } : `Generated source only: ${buildDir}`, json);
      return;
    }

    assertBuildEnvironment();
    runMake(buildDir);
    const projectData = loadProject(projectPath);
    copyRom(buildDir, projectData, outputPath);
    outputResult(json ? { generatedRom: outputPath } : `Generated ROM: ${outputPath}`, json);
    return;
  }
}

main();
