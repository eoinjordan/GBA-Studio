import { PNG } from "pngjs";
import { writeFile } from "fs-extra";
import { readFileToPalettes } from "lib/tiles/readFileToPalettes";
import { IndexedImage } from "shared/lib/tiles/indexedImage";

test("reduces the town background to GBA palette limits", async () => {
  const filename = `${__dirname}/_files/test/color_town.png`;
  const paletteData = await readFileToPalettes(filename, "default");
  expect(paletteData.palettes.length).toBeLessThanOrEqual(8);
  expect(Math.max(...paletteData.map)).toBeLessThan(8);
  writeIndexedImagePNG(
    `${__dirname}/_tmp/color_town_tiles.png`,
    paletteData.indexedImage,
  );
});

test("reduces the parallax background to GBA palette limits", async () => {
  const filename = `${__dirname}/_files/test/parallax_color.png`;
  const paletteData = await readFileToPalettes(filename, "default");
  expect(paletteData.palettes.length).toBeLessThanOrEqual(8);
  expect(Math.max(...paletteData.map)).toBeLessThan(8);
  writeIndexedImagePNG(
    `${__dirname}/_tmp/parallax_color_tiles.png`,
    paletteData.indexedImage,
  );
});

test.each([
  "examples/isometric-adventure/assets/backgrounds/iso_village.png",
  "examples/poachermon/assets/backgrounds/poachermon_field.png",
])("keeps the published demo %s within GBA palette limits", async (asset) => {
  const filename = `${process.cwd()}/${asset}`;
  const paletteData = await readFileToPalettes(filename, "default");

  expect(paletteData.palettes.length).toBeLessThanOrEqual(8);
  expect(Math.max(...paletteData.map)).toBeLessThan(8);
  expect(paletteData.indexedImage.data).toHaveLength(
    paletteData.indexedImage.width * paletteData.indexedImage.height,
  );
});

const writeIndexedImagePNG = async (
  filename: string,
  img: IndexedImage,
): Promise<void> => {
  const png = new PNG({
    width: img.width,
    height: img.height,
  });
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) << 2;
      const dataIdx = img.data[idx / 4];

      if (dataIdx === 3) {
        png.data[idx] = 7;
        png.data[idx + 1] = 24;
        png.data[idx + 2] = 33;
      } else if (dataIdx === 2) {
        png.data[idx] = 48;
        png.data[idx + 1] = 104;
        png.data[idx + 2] = 80;
      } else if (dataIdx === 1) {
        png.data[idx] = 134;
        png.data[idx + 1] = 192;
        png.data[idx + 2] = 108;
      } else {
        png.data[idx] = 224;
        png.data[idx + 1] = 248;
        png.data[idx + 2] = 207;
      }

      png.data[idx + 3] = 255; // Alpha
    }
  }
  const options = { colorType: 6 } as const;
  const buffer = PNG.sync.write(png, options);
  await writeFile(filename, buffer);
};
