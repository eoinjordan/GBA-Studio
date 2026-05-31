# GBA Studio Agent Commands

This document describes the CLI commands available for agent-driven automation.

## Supported commands

- `gba-studio validate <project.gbasproj>`
  - Validate a GBA Studio project file.
  - Use `--json` to output machine-readable validation results.

- `gba-studio inventory <project.gbasproj>`
  - Inspect scenes, actor counts, and asset counts.
  - Returns JSON by default when `--json` is supplied.

- `gba-studio export-c <project.gbasproj> <outDir>`
  - Generate a C project from a `.gbasproj` file.

- `gba-studio make:gba <project.gbasproj> <outFile>`
  - Build or generate the GBA ROM project.
  - Add `--skip-build` to generate source only.

- `gba-studio create-scene <project.gbasproj> --id <id> --name <name>`
  - Add a new scene to the project.
  - Creates an automatic default scene object with empty actors/triggers.
  - Backs up the project file to `<project>.bak` before modifying.

- `gba-studio create-actor <project.gbasproj> --scene <sceneId> --id <actorId> --name <name>`
  - Create a new actor inside an existing scene.
  - Uses default position and size values unless additional flags are added.
  - Backs up the project file to `<project>.bak` before modifying.

- `gba-studio set-start-scene <project.gbasproj> --scene <sceneId>`
  - Set the project start scene to an existing scene.
  - Backs up the project file to `<project>.bak` before modifying.

## MCP server

Start the stdio MCP server with:

```bash
npm run mcp
```

or:

```bash
gba-studio-mcp
```

The server exposes guarded tools around the CLI:

- `find_gba_project`
- `validate_gba_project`
- `inventory_gba_project`
- `create_scene`
- `create_actor`
- `set_start_scene`
- `export_gba_source`
- `build_gba_rom`

## JSON output

Any command supports `--json` to return machine-readable output. Example:

```bash
gba-studio validate examples/blank/project.gbasproj --json
```

## Backup behavior

Commands that modify the project file create a backup at:

```bash
<project.gbasproj>.bak
```

This preserves the previous project state in case the agent needs to revert.
