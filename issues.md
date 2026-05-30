## Current Status

- Root wrapper scripts are in place:
  - `npm run fetch-deps`
  - `npm run make:cli`
  - `npm run build:gba -- <project.gbsproj> <out.gba>`
  - `npm run test:emu -- <out.gba>`
  - `npm run validate:rom -- <out.gba>`
- The standalone `.gbasproj` CLI is in place:
  - `validate`
  - `inventory`
  - `export-c`
  - `make:gba`
  - `create-scene`
  - `create-actor`
  - `set-start-scene`
- A stdio MCP server is in place at `src/mcp-server.js`.
- `npm test` passes for the standalone CLI/MCP-oriented project.
- `npm run make:cli` passes for the nested GB Studio fork.
- `npm run build:gba -- test/data/projects/RunProject/RunProject.gbsproj out/RunProject.gba` now creates a non-empty proof ROM locally with devkitPro installed at `C:\devkitPro`.
- `npm run validate:rom -- gba-studio\out\RunProject.gba` validates that the produced ROM exists and is non-empty.

## Verified Locally

From the workspace root:

```powershell
npm test
npm run validate:rom -- gba-studio\out\RunProject.gba
```

From `gba-studio` with devkitPro in the shell:

```powershell
$env:DEVKITPRO = "C:\devkitPro"
$env:DEVKITARM = "C:\devkitPro\devkitARM"
$env:Path = "$env:DEVKITARM\bin;$env:Path"
npm run make:cli
npm run build:gba -- test/data/projects/RunProject/RunProject.gbsproj out/RunProject.gba
```

## Current Limitation

The nested GB Studio fork currently produces a GBA proof ROM, not full GB Studio gameplay.

The proof build intentionally skips GB Studio VM script assembly and emits a minimal GBA-compatible C proof scene. This avoids passing GB Studio / GBDK-style assembly into devkitARM.

Examples of GB VM assembly that must not be sent to the ARM assembler:

- `.module`
- `.area`
- `vm_push_const`
- `vm_call_far`
- `vm_idle`
- `vm_stop`

The compiler now warns:

```text
GBA proof build: GB Studio VM scripts are currently skipped.
```

## Next Milestone

Implement a real GBA script backend:

```text
GB Studio events
  -> intermediate script representation
  -> GBA runtime calls in C or ARM assembly
  -> devkitARM build
```

Initial backend support should cover:

- idle
- stop
- call custom script
- actor references
- button checks, including L/R
- scene transition placeholder

## Remaining Tasks

1. Add mGBA/binjgb to the local machine or CI and run `npm run test:emu -- out/RunProject.gba`.
2. Expand the GBA proof runtime beyond the placeholder Mode 3 screen.
3. Add tests proving GBA builds do not emit `.module`, `.area`, or `vm_*` assembly into files compiled by devkitARM.
4. Decide whether `gba-studio-fixed` should be kept; it is currently a stale duplicate of the root standalone `.gbasproj` pipeline.
