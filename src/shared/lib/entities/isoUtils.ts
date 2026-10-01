/**
 * Isometric coordinate utilities for GBA Studio.
 *
 * The editor uses a standard 2:1 isometric projection:
 *
 *   screen_x = (tile_x - tile_y) * (ISO_TILE_W / 2)
 *   screen_y = (tile_x + tile_y) * (ISO_TILE_H / 2)
 *
 * Tile sizes are intentionally double the base GBA tile so that one
 * isometric grid cell covers the same visual area as one 8 px screen tile
 * in a standard top-down scene.
 */

/** Width of one isometric tile in screen pixels (editor projection). */
export const ISO_TILE_W = 32;

/** Height of one isometric tile in screen pixels (editor projection). */
export const ISO_TILE_H = 16;

/** Half-width used in transform calculations. */
const HW = ISO_TILE_W / 2;

/** Half-height used in transform calculations. */
const HH = ISO_TILE_H / 2;

/**
 * Convert isometric grid coordinates to editor screen pixel coordinates.
 * The result is the top-left corner of the diamond tile.
 *
 * @param tileX  - horizontal grid index (increases to the right on the ground)
 * @param tileY  - depth grid index (increases away from viewer)
 * @param isoZ   - height layer (0 = ground; positive values raise the tile)
 */
export function isoToScreen(
  tileX: number,
  tileY: number,
  isoZ = 0,
): { x: number; y: number } {
  return {
    x: (tileX - tileY) * HW,
    y: (tileX + tileY) * HH - isoZ * ISO_TILE_H,
  };
}

/**
 * Convert an editor screen pixel position to the isometric grid tile that
 * contains it (always on the ground plane, isoZ = 0).
 *
 * @param screenX - pixel x relative to the scene's isometric origin
 * @param screenY - pixel y relative to the scene's isometric origin
 */
export function screenToIso(
  screenX: number,
  screenY: number,
): { tileX: number; tileY: number } {
  // Solve the 2x2 linear system derived from isoToScreen:
  //   screenX = (tx - ty) * HW   →  tx - ty = screenX / HW
  //   screenY = (tx + ty) * HH   →  tx + ty = screenY / HH
  const sum = screenY / HH;
  const diff = screenX / HW;
  return {
    tileX: Math.floor((sum + diff) / 2),
    tileY: Math.floor((sum - diff) / 2),
  };
}

export interface IsoTileAreaBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Bounding box for a rectangular area of ground tiles, relative to the
 * isometric origin. This is useful for editor cursors and hit targets.
 */
export function isoTileAreaBounds(
  tileX: number,
  tileY: number,
  width = 1,
  height = 1,
): IsoTileAreaBounds {
  const areaWidth = Math.max(1, width);
  const areaHeight = Math.max(1, height);
  const top = isoToScreen(tileX, tileY);

  return {
    left: top.x - areaHeight * HW,
    top: top.y,
    width: (areaWidth + areaHeight) * HW,
    height: (areaWidth + areaHeight) * HH,
  };
}

/** Horizontal offset that keeps an editor sprite's foot point on a tile. */
export function isoSpriteAnchorOffsetX(spriteWidth: number): number {
  return Math.min(Math.max(0, spriteWidth) / 2, ISO_TILE_W / 4);
}

/** Width in pixels occupied by a complete rectangular isometric grid. */
export function isoProjectedWidth(mapWidth: number, mapHeight: number): number {
  return (mapWidth + mapHeight) * HW;
}

/** Height in pixels occupied by a complete rectangular isometric grid. */
export function isoProjectedHeight(
  mapWidth: number,
  mapHeight: number,
): number {
  return (mapWidth + mapHeight) * HH;
}

/**
 * Pixel dimensions used to display an isometric scene. A compiled background
 * can include scenery or letterboxing outside the logical diamond grid, so it
 * must not be cropped to the collision-grid dimensions.
 */
export function isoCanvasDimensions(
  mapWidth: number,
  mapHeight: number,
  backgroundWidth = 0,
  backgroundHeight = 0,
): { width: number; height: number } {
  return {
    width: Math.max(backgroundWidth, isoProjectedWidth(mapWidth, mapHeight)),
    height: Math.max(backgroundHeight, isoProjectedHeight(mapWidth, mapHeight)),
  };
}

/**
 * Horizontal projection origin for tile (0,0). The grid is centred within
 * the scene canvas and uses the map height on its left-hand side; using the
 * map width only works accidentally for square maps.
 */
export function isoOriginX(
  mapWidth: number,
  mapHeight: number,
  canvasWidth = isoProjectedWidth(mapWidth, mapHeight),
): number {
  return (
    Math.floor((canvasWidth - isoProjectedWidth(mapWidth, mapHeight)) / 2) +
    mapHeight * HW
  );
}

/** Vertical projection origin, centred inside any background letterboxing. */
export function isoOriginY(
  mapWidth: number,
  mapHeight: number,
  canvasHeight = isoProjectedHeight(mapWidth, mapHeight),
): number {
  return Math.floor(
    (canvasHeight - isoProjectedHeight(mapWidth, mapHeight)) / 2,
  );
}

/**
 * Depth-sort key for isometric actors.
 * Higher values are drawn later (in front).
 *
 * @param tileX - actor's horizontal grid index
 * @param tileY - actor's depth grid index
 * @param isoZ  - actor's height layer
 */
export function isoDepthKey(tileX: number, tileY: number, isoZ = 0): number {
  return tileX + tileY + isoZ;
}

/**
 * Build the four corner points (screen-px) of a diamond tile for an SVG
 * `<polygon points="...">` attribute.
 *
 * @param screenX - screen x of the tile origin returned by isoToScreen
 * @param screenY - screen y of the tile origin returned by isoToScreen
 */
export function isoDiamondPoints(screenX: number, screenY: number): string {
  const top = `${screenX},${screenY}`;
  const right = `${screenX + HW},${screenY + HH}`;
  const bottom = `${screenX},${screenY + ISO_TILE_H}`;
  const left = `${screenX - HW},${screenY + HH}`;
  return `${top} ${right} ${bottom} ${left}`;
}
