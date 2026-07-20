# GBA Studio - Isometric Mode

GBA Studio supports `ISOMETRIC` scenes from the editor through the GBA
compiler and runtime. Isometric projects use the same actors, triggers,
collisions, scripts, variables, and scene transitions as other GBA projects,
with their grid projected as 2:1 diamonds.

## Quick start

1. Open the **New Project** wizard.
2. Choose **GBA Isometric Adventure**.
3. Open **Sunstone Village** and inspect its diamond grid, collision cells,
   actors, and beacon triggers.
4. Build the project and run the ROM on hardware, mGBA, or the
   [browser player](player/).

The included two-scene game, **The Sunstone Relay**, is also available at
`examples/isometric-adventure/`.

## Coordinates and projection

An isometric scene's `width` and `height` describe its logical grid. Actor,
trigger, and collision coordinates use this grid; they do not use background
pixels. The standard projection uses 32x16 pixel diamonds:

```text
projected_x = (tile_x - tile_y) * 16
projected_y = (tile_x + tile_y) * 8 - iso_z * 16
```

For a rectangular `W` by `H` grid, the projected diamond occupies:

```text
projected_width  = (W + H) * 16
projected_height = (W + H) * 8
```

The grid is centred inside the compiled background canvas. Its origin is:

```text
origin_x = max(0, (background_px_width - projected_width) / 2) + H * 16
origin_y = max(0, (background_px_height - projected_height) / 2)

screen_x = origin_x + projected_x
screen_y = origin_y + projected_y
```

Using `H` in `origin_x` is important: a width-based origin only aligns square
maps.

### Logical grid versus background

The Sunstone Village scenes demonstrate the distinction:

| Measurement            |                     Value |
| ---------------------- | ------------------------: |
| Logical collision grid |                 8x7 cells |
| Projected grid         |            240x120 pixels |
| Background tilemap     |           30x20 GBA tiles |
| Background canvas      |            240x160 pixels |
| Vertical letterboxing  | 20 pixels above and below |

The compiler writes both pairs of dimensions. The runtime uses logical
dimensions for movement and collision lookup, and background dimensions for
tilemap copying, rendering, and camera bounds.

## Editor behaviour

For `ISOMETRIC` scenes the editor:

- displays the complete background rather than cropping it to logical cells;
- centres the diamond grid on rectangular or letterboxed backgrounds;
- inverse-projects the mouse position when selecting or painting grid data;
- renders actors, multi-cell triggers, collision overlays, and the cursor on
  the same projection; and
- includes the projected canvas in World view extents.

The palette tool still addresses the physical background image. Grid tools
address logical cells.

## Actors, sprites, and interaction

Actor `x` and `y` are logical tile coordinates in isometric scenes. `isoZ`
raises an actor by one 16-pixel diamond height per level and participates in
depth ordering:

```text
depth_key = tile_x + tile_y + iso_z
```

The editor's four `iso_movement` directions are converted to the runtime's
direction and animation order during compilation. Metasprite bounds are used
to anchor an actor's feet to the diamond centre, and both 8x8 and 8x16 GBA
objects are supported.

Press GBA **A** while on the same tile as, or cardinally adjacent to, an
interactive actor. The nearest eligible actor receives the interaction.

## Movement, triggers, and collisions

The D-pad moves one logical cell at a time. Holding a direction repeats at a
controlled cadence without skipping intermediate collision cells. Only one
isometric axis is processed for a step, so diagonal key combinations cannot
bypass obstacles.

Collision data is a flat array of exactly `width * height` bytes, indexed as
`y * width + x`; non-zero values are blocked. The compiler pads missing cells
with zero and truncates surplus cells so the runtime cannot read beyond the
scene's logical collision data.

Trigger `x`, `y`, `width`, and `height` values are logical cells. A trigger
runs once when the player enters it and can run again after the player leaves
and re-enters.

## Scene transitions

Project startup retains the legacy two-byte `VM_OP_LOAD_SCENE` instruction.
Scripted **Switch Scene** events use `VM_OP_LOAD_SCENE_AT` (`0x18`) followed
by four one-byte operands:

```text
[scene_index, x, y, direction]
```

`x` and `y` are tile coordinates for every scene type. The runtime keeps them
as grid coordinates for isometric scenes and converts them to pixels for
non-isometric scenes. This lets the second Sunstone Relay scene start at the
position and facing configured by its Switch Scene event.

See [ISOMETRIC_SCENE_FORMAT.md](ISOMETRIC_SCENE_FORMAT.md) for the emitted C
contract.

## Play The Sunstone Relay

Controls on GBA or an emulator:

- D-pad / arrow keys: move on the diamond grid
- A / browser <kbd>X</kbd>: interact and advance text
- START / browser <kbd>Enter</kbd>: cycle to the other scene; from the ending,
  return to the village and replay

Complete the demo in this order:

1. Talk to Keeper Nia.
2. Walk onto the west and east signal markers, in either order.
3. Return to the green lake core and press A while adjacent to it.
4. Return to Nia to restore the relay and enter the ending scene.
5. Press START to replay.

## Browser player scope

GitHub Actions compiles the example with the same CLI and GBA engine used for
desktop builds, validates its GBA header, and publishes that ROM to GitHub
Pages. The Pages player runs the compiled ROM through EmulatorJS; it does not
run the GBA Studio editor or compiler in the browser. EmulatorJS is loaded
from its public CDN, so first launch requires a network connection. A ROM
chosen from disk is passed to the emulator through a local object URL and is
not uploaded by this page.
