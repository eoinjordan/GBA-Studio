import { PNG } from "pngjs";

// Auto-color GBA backgrounds with one 16-color bank retain their authored
// colors. Sending them through GB's four-colors-per-tile quantizer loses
// colors before the 4bpp conversion, especially grass and water in the demos.
export function compileGbaBackground(bytes: Buffer) {
  const image = PNG.sync.read(bytes);
  if (image.width % 8 || image.height % 8)
    throw new Error("GBA backgrounds must align to 8x8 tiles");
  const colorAt = (x: number, y: number) => {
    const i = (y * image.width + x) * 4;
    if (image.data[i + 3] === 0) return 0;
    return (
      (image.data[i] >> 3) |
      ((image.data[i + 1] >> 3) << 5) |
      ((image.data[i + 2] >> 3) << 10)
    );
  };
  const colors = new Map<number, number>();
  const palette = Array<number>(128).fill(0);
  // Bank index zero uses the backdrop color for transparent BG pixels.
  colors.set(colorAt(0, 0), 0);
  palette[0] = colorAt(0, 0);
  for (let y = 0; y < image.height; y++)
    for (let x = 0; x < image.width; x++) {
      const color = colorAt(x, y);
      if (!colors.has(color)) {
        if (colors.size === 16) return undefined; // Keep existing multi-bank/manual compiler path.
        palette[colors.size] = color;
        colors.set(color, colors.size);
      }
    }
  const tiles: number[] = [],
    tilemap: number[] = [];
  const unique = new Map<string, number>();
  for (let y = 0; y < image.height; y += 8)
    for (let x = 0; x < image.width; x += 8) {
      const tile: number[] = [];
      for (let py = 0; py < 8; py++)
        for (let px = 0; px < 8; px += 2) {
          tile.push(
            colors.get(colorAt(x + px, y + py))! |
              (colors.get(colorAt(x + px + 1, y + py))! << 4),
          );
        }
      const key = tile.join(",");
      let index = unique.get(key);
      if (index === undefined) {
        index = unique.size;
        if (index >= 180)
          throw new Error(
            "GBA background exceeds the 180 unique-tile budget; simplify its art",
          );
        unique.set(key, index);
        tiles.push(...tile);
      }
      tilemap.push(index);
    }
  return {
    tileset: Uint8Array.from(tiles),
    tilemap: Uint8Array.from(tilemap),
    attributes: new Uint8Array(tilemap.length),
    palette,
  };
}
