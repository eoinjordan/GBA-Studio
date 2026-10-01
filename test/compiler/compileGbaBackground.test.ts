import { PNG } from "pngjs";
import { compileGbaBackground } from "../../src/lib/compiler/compileGbaBackground";

test("authored RGB survives 4bpp tile packing with sixteen colors", () => {
  const image = new PNG({ width: 16, height: 8 });
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 16; x++) {
      image.data.set([x * 16, y * 0, 64, 255], (y * 16 + x) * 4);
    }
  const result = compileGbaBackground(PNG.sync.write(image))!;
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 16; x++) {
      const tile = result.tilemap[Math.floor(x / 8)];
      const packed =
        result.tileset[tile * 32 + y * 4 + Math.floor((x % 8) / 2)];
      const color = result.palette[(x % 2 ? packed >> 4 : packed) & 15];
      expect(color & 31).toBe(x * 2);
      expect((color >> 10) & 31).toBe(8);
    }
});
test("multi-bank images continue to the existing compiler path", () => {
  const image = new PNG({ width: 24, height: 8 });
  for (let i = 0; i < image.data.length; i += 4)
    image.data.set([((i / 4) % 24) * 8, 0, 0, 255], i);
  expect(compileGbaBackground(PNG.sync.write(image))).toBeUndefined();
});
