# GBA Studio

Based on GB Studio concepts and repository structure, this project deliberately diverges to support native Game Boy Advance development.

This repo reuses the `.gbasproj` workflow and CLI architecture, but it is not a simple GB Studio patch. GB Studio targets Game Boy and Game Boy Color. GBA Studio targets GBA hardware, with its own build backend, asset rules, and output format.

## Why this repo exists separately from GB Studio

GB Studio and GBA Studio should not share a backend. Game Boy and Game Boy Advance development have different hardware targets, compilers, graphics models, audio constraints, and ROM formats.

This repo provides the minimum viable GBA-specific spine that an editor or agent can call. The divergence exists so we can build a clean GBA toolchain and release workflow without inheriting GB Studio-specific engine/compiler assumptions.

| Area | GB Studio | GBA Studio |
| --- | --- | --- |
| Hardware target | Game Boy / Game Boy Color | Game Boy Advance |
| Rendering model | GB tile modes, 160x144 display | GBA Mode 3/4, 240x160 display, sprites |
| Output format | `.gb` | `.gba` |
| Build toolchain | GB Studio backend, GBDK for GB | devkitARM / GBDK / libtonc for GBA |
| Asset rules | 160x144 backgrounds, limited palettes | 240x160 backgrounds, richer color, larger assets |
| Engine backend | GB Studio engine and editor logic | GBA-specific engine and build workflow |
| Release flow | GB Studio editor releases | ROM artifacts and companion app installers |
| Repo role | Main GB Studio project | GBA-specific fork/divergence for native GBA support |

## Maintenance model

```text
.gbasproj project file
  -> validator
  -> generated GBA C project
  -> devkitARM/libtonc build
  -> .gba ROM
```

## Maintenance model

This project is being maintained as an independent GBA Studio workflow under Eoin Jordan's personal repos first. Upstream PRs can wait until the GBA editor, ROM backend, and workflow are stable enough to share.

Current personal repo layout:

- Wrapper, CLI, MCP, and release workflow: `eoinjordan/gba-rom-release-workflow`
- Editor fork and GBA proof ROM path: `eoinjordan/gb-studio`, branch `gba-rom-release-workflow`
- GB Studio MCP companion work: `eoinjordan/gb-studio-agent`

Do not rely on the Blue Heron upstream remote for day-to-day maintenance. Keep GBA Studio changes on the personal branch, build and test there, then decide later whether any part should be proposed upstream.

## Repository layout

```text
.
├── .github/workflows/
│   ├── ci.yml
│   └── release-gba.yml
├── examples/
│   └── blank/
│       ├── assets/
│       └── project.gbasproj
├── schemas/
│   └── gbasproj.schema.json
├── scripts/
│   ├── build-gba.sh
│   └── validate-rom.sh
├── src/
│   └── cli.js
├── package.json
└── README.md
```

## Requirements

For validation and source generation:

- Node.js 20 or newer

For actual `.gba` ROM building:

- devkitPro/devkitARM
- GBA development libraries, including libtonc
- Optional: mGBA for local emulator testing

## Install

```bash
npm install
```

## Validate the example project

```bash
npm run validate
```

Equivalent direct command:

```bash
node src/cli.js validate examples/blank/project.gbasproj
```

## Generate the GBA C project

```bash
npm run export:c
```

Equivalent direct command:

```bash
node src/cli.js export-c examples/blank/project.gbasproj build/generated/blank
```

This creates:

```text
build/generated/blank/
├── Makefile
├── README.md
├── blank-gba-studio-demo.gbasproj
├── audio/
├── data/
├── graphics/
├── include/
│   └── gba_studio_metadata.h
└── source/
    └── main.c
```

## Build a ROM

With devkitPro/devkitARM installed:

```bash
npm run make:gba
```

Equivalent direct command:

```bash
node src/cli.js make:gba examples/blank/project.gbasproj build/rom/blank.gba
```

To generate source without invoking `make`:

```bash
node src/cli.js make:gba examples/blank/project.gbasproj build/rom/blank.gba --skip-build
```

## Project format

The GBA Studio project format is `.gbasproj`.

Minimal example:

```json
{
  "schemaVersion": 1,
  "name": "Blank GBA Studio Demo",
  "slug": "blank-gba-studio-demo",
  "target": "gba",
  "rom": {
    "title": "GBASTUDIO",
    "gameCode": "GBAS",
    "makerCode": "EJ"
  },
  "screen": {
    "width": 240,
    "height": 160
  },
  "startScene": "start",
  "palette": {
    "background": "#182030",
    "text": "#ffffff"
  },
  "scenes": [
    {
      "id": "start",
      "name": "Start",
      "backgroundColor": "#182030",
      "message": "GBA Studio booted",
      "actors": [
        {
          "id": "player",
          "name": "Player",
          "x": 112,
          "y": 72,
          "width": 16,
          "height": 16,
          "color": "#f8d060"
        }
      ],
      "triggers": []
    }
  ],
  "assets": {
    "backgrounds": [],
    "sprites": [],
    "music": [],
    "sfx": []
  }
}
```

## CLI commands

```bash
gba-studio validate <project.gbasproj>
gba-studio inventory <project.gbasproj>
gba-studio export-c <project.gbasproj> <outDir>
gba-studio make:gba <project.gbasproj> <out-rom.gba> [--skip-build]
gba-studio create-scene <project.gbasproj> --id <id> --name <name>
gba-studio create-actor <project.gbasproj> --scene <sceneId> --id <actorId> --name <name>
gba-studio set-start-scene <project.gbasproj> --scene <sceneId>
```

## MCP server

This repo includes a small stdio MCP server that wraps the CLI with guarded tools for agent workflows.

```bash
npm run mcp
```

Available tools:

- `find_gba_project`
- `validate_gba_project`
- `inventory_gba_project`
- `create_scene`
- `create_actor`
- `set_start_scene`
- `export_gba_source`
- `build_gba_rom`

## Town demo

A second example project is available at `examples/town-demo/project.gbasproj`.

Validate it with:

```bash
node src/cli.js validate examples/town-demo/project.gbasproj
```

Generate C source for the town demo with:

```bash
node src/cli.js export-c examples/town-demo/project.gbasproj build/generated/town-demo
```

## GitHub Actions

### CI

`.github/workflows/ci.yml` validates the example project and generates the C source tree. It does not require the GBA toolchain.

### Release

`.github/workflows/release-gba.yml` builds the `.gba` ROM inside a devkitARM container and publishes the ROM as a release asset when a tag is pushed.

```bash
git tag v0.1.0
git push origin v0.1.0
```

## Release tags and build artifacts

- Use semantic release tags with a `v` prefix, for example `v0.1.0` or `v1.0.0`.
- The release workflow attaches the built `.gba` ROM to the GitHub Release for that tag.
- Local build artifact outputs:
  - ROM: `build/rom/blank.gba`
  - Generated source tree: `build/generated/<project>/`
  - Example generated project: `build/generated/blank/`
- If you build editor/installer packages from the companion `gba-studio` app, those artifacts are written under `gba-studio/out/make`.

## Screenshot preview

If you add UI screenshots, store them under `docs/screenshots/` and reference them here.

Suggested screenshot files:

- `docs/screenshots/starter-screen.png` — starter scene / project boot screen
- `docs/screenshots/build-output.png` — generated build artifacts and ROM output
- `docs/screenshots/release-artifacts.png` — app package or ROM release artifacts

Example markdown for an image:

```md
![GBA Studio starter screen](docs/screenshots/starter-screen.png)
```

## Starter screen / UI notes

This repo is built around a minimal GBA proof-of-concept workflow:

- `screen.width` is `240` and `screen.height` is `160`, matching GBA native resolution.
- The starter scene is a simple boot screen with a message and a placeholder actor.
- The `.gbasproj` project includes `target: "gba"`, ROM metadata, and GBA-specific build settings.
- The current workflow is proof-of-concept for GBA assets, source generation, and ROM output.

## Intended next steps

1. Add a real tile/sprite/background asset pipeline.
2. Replace Mode 3 rectangle rendering with tiled backgrounds and object attribute memory sprites.
3. Add scene transitions.
4. Add button-driven movement.
5. Add audio conversion.
6. Add an MCP agent layer that calls this CLI through guarded tools.

## Why this repo exists separately from GB Studio

See the introduction above for the core rationale: Game Boy and Game Boy Advance development have different hardware targets, compilers, graphics models, audio constraints, and ROM formats.

This repo provides the minimum viable GBA-specific spine that an editor or agent can call.
