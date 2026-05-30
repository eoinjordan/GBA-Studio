# Suggested MCP Tools for GBA Studio

The GBA agent should wrap the CLI and project JSON mutations. It should not call compiler internals directly.

## Tools

### find_gba_project

Finds a `.gbasproj` file under a workspace.

### validate_gba_project

Runs:

```bash
node src/cli.js validate <project.gbasproj>
```

### inventory_gba_project

Reads the project and returns scenes, actors, triggers, and assets.

### create_scene

Adds a scene object to `scenes[]`.

### create_actor

Adds an actor object to a chosen scene.

### set_start_scene

Updates `startScene` after verifying the scene exists.

### build_gba_rom

Runs:

```bash
node src/cli.js make:gba <project.gbasproj> <out-rom.gba>
```

### export_gba_source

Runs:

```bash
node src/cli.js export-c <project.gbasproj> <out-dir>
```

## Safety rules

- Always validate before writing generated source.
- Always back up the `.gbasproj` file before mutation.
- Never edit generated C files as the source of truth.
- Never overwrite an existing ROM unless the caller explicitly allows it.
- Keep build output under `build/`.
