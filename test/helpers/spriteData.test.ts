import {
  spriteDataIndexFn,
  spriteDataIndexFnWithTransparentColor,
} from "shared/lib/sprites/spriteData";

describe("sprite transparency indexing", () => {
  test("keeps black available as the darkest sprite color by default", () => {
    expect(spriteDataIndexFn(0, 0, 0, 255)).toBe(3);
  });

  test("supports an explicit legacy sprite transparency key", () => {
    const keyed = spriteDataIndexFnWithTransparentColor("000000");

    expect(keyed(0, 0, 0, 255)).toBe(0);
    expect(keyed(29, 37, 63, 255)).toBe(3);
    expect(keyed(255, 255, 255, 255)).toBe(1);
  });
});
