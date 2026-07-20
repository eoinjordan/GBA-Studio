# GBA Studio - Isometric Scene Compiler Contract

This document describes the C data emitted for scenes whose project type is
`"ISOMETRIC"`. The compiler and `gba-engine` declarations must stay in sync.

## Scene type and structures

`ISOMETRIC` maps to scene type id `6` (`SCENE_TYPE_ISOMETRIC`). The extended
definition embeds the standard scene definition first, so a pointer can be
safely treated as `gba_scene_def_t *`:

```c
typedef struct gba_scene_def_t {
  uint8_t width;              // logical collision-grid width
  uint8_t height;             // logical collision-grid height
  uint8_t type;
  uint8_t player_sprite_index;
  uint8_t actor_count;
  uint8_t trigger_count;
  uint16_t tileset_len;
  const uint8_t *tileset;
  const uint8_t *tilemap;
  const uint8_t *tilemap_attr;
  const uint16_t *bg_palette;
  const uint16_t *sprite_palette;
  const uint8_t *collisions;
  const gba_actor_def_t *actors;
  uint8_t sprite_count;
  const gba_sprite_def_t *const *sprites;
  const gba_trigger_def_t *triggers;
  const uint8_t *start_script;
  uint8_t background_width;   // compiled tilemap width, in 8px tiles
  uint8_t background_height;  // compiled tilemap height, in 8px tiles
} gba_scene_def_t;

typedef struct gba_iso_scene_def_t {
  gba_scene_def_t base;
  uint8_t iso_tile_w;         // default 32 screen pixels
  uint8_t iso_tile_h;         // default 16 screen pixels
} gba_iso_scene_def_t;
```

Zero `background_width` or `background_height` preserves compatibility with
older data by falling back to the corresponding logical dimension.

## Emitted Sunstone Village shape

The complete demo deliberately uses a logical grid that is smaller than its
background:

```c
static const gba_iso_scene_def_t scene_iso_village = {
  .base = {
    .width = 8,
    .height = 7,
    .type = SCENE_TYPE_ISOMETRIC,
    /* palettes, tiles, sprites, scripts, actors and triggers omitted */
    .background_width = 30,
    .background_height = 20,
  },
  .iso_tile_w = 32,
  .iso_tile_h = 16,
};
```

The 8x7 logical grid occupies 240x120 projected pixels. The 30x20 tile
background occupies the full 240x160 GBA screen. Runtime tilemap indexing uses
30 as its stride; movement and collision indexing use 8 as their stride.

## Actor and sprite additions

Isometric actors use the standard actor definition. Their `x` and `y` fields
contain grid coordinates, and `iso_z` contains the signed height layer:

```c
typedef struct gba_actor_def_t {
  uint16_t x;
  uint16_t y;
  uint8_t sprite_index;
  uint8_t direction;          // down=0, left=1, right=2, up=3
  uint8_t move_speed;
  uint8_t anim_speed;
  bool collision_enabled;
  bool persistent;
  bool pinned;
  bool hidden;
  const uint8_t *interact_script;
  int8_t iso_z;
} gba_actor_def_t;
```

`gba_sprite_def_t` includes `obj_8x16`, allowing the renderer to select the
real GBA object shape and anchor the current metasprite frame correctly. The
compiler also converts `iso_movement` editor slots into the runtime's
down/right/up/left animation order.

## Coordinate model

Actors and triggers are compiled in logical tile coordinates. Collision bytes
are normalized to exactly `width * height` and indexed by `y * width + x`.

Given a background canvas in pixels, the runtime projection is:

```text
projected_width  = (width + height) * (iso_tile_w / 2)
projected_height = (width + height) * (iso_tile_h / 2)

origin_x = max(0, (background_width * 8 - projected_width) / 2)
         + height * (iso_tile_w / 2)
origin_y = max(0, (background_height * 8 - projected_height) / 2)

screen_x = origin_x + (x - y) * (iso_tile_w / 2)
screen_y = origin_y + (x + y) * (iso_tile_h / 2) - iso_z * iso_tile_h
```

Actors are depth sorted by `x + y + iso_z`. Higher values are nearer the
viewer and receive the front-most effective OAM order.

## Scripted scene transition ABI

The VM retains `VM_OP_LOAD_SCENE` (`0x01`) with a single scene operand for
legacy/bootstrap data. A compiled `EVENT_SWITCH_SCENE` emits:

```text
VM_OP_LOAD_SCENE_AT (0x18), scene_index, x, y, direction
```

All four operands are unsigned bytes. Direction uses down=0, left=1, right=2,
up=3. Transition `x` and `y` values are tile coordinates for both isometric
and non-isometric targets; the engine performs the non-isometric pixel
conversion after loading the target scene.

## Compatibility checklist

When the compiler or engine contract changes, validate that:

- the compiler's generated definitions match `include/gba_scene.h` field
  order and types;
- logical and background dimensions are both emitted;
- actor `iso_z` and sprite `obj_8x16` are emitted explicitly;
- collision arrays contain exactly `width * height` bytes;
- `EVENT_SWITCH_SCENE` supplies the positioned transition operands; and
- unit, integration, ROM-build, and emulator smoke tests pass.
