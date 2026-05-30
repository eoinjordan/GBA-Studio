# GBA Studio Flow

## Core flow

```text
Prompt, UI, or manual edit
        |
        v
project.gbasproj
        |
        v
validator
        |
        v
source generator
        |
        v
generated GBA C project
        |
        v
devkitARM build
        |
        v
game.gba
        |
        v
GitHub Actions artifact/release
```

## Local developer flow

```bash
npm install
npm run validate
npm run export:c
node src/cli.js make:gba examples/blank/project.gbasproj build/rom/blank.gba --skip-build
```

When devkitARM is installed:

```bash
npm run make:gba
```

## Agent flow

The agent should not directly edit generated C files. It should edit `.gbasproj`, then call the CLI.

```text
find_gba_project
inventory_gba_project
create_scene
create_actor
validate_gba_project
build_gba_rom
```

## Release flow

```bash
git tag v0.1.0
git push origin v0.1.0
```

The release workflow builds `build/rom/blank.gba`, validates that it exists and is non-empty, uploads it as an artifact, and attaches it to the GitHub Release.
