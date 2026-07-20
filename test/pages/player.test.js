const fs = require("fs");
const path = require("path");
const player = require("../../docs/player/player.js");

describe("GBA Studio browser player", () => {
  test("accepts GBA filenames case-insensitively", () => {
    expect(player.isGbaFileName("demo.gba")).toBe(true);
    expect(player.isGbaFileName("DEMO.GBA")).toBe(true);
    expect(player.isGbaFileName("demo.zip")).toBe(false);
  });

  test("rejects truncated and non-GBA headers", () => {
    expect(player.hasValidGbaHeader(new Uint8Array(191))).toBe(false);
    expect(player.hasValidGbaHeader(new Uint8Array(192))).toBe(false);

    const valid = new Uint8Array(192);
    valid[0xb2] = 0x96;
    expect(player.hasValidGbaHeader(valid)).toBe(true);
  });

  test("derives a readable ROM name without trusting markup", () => {
    expect(player.romNameFromUrl("roms/My%20Game.gba?build=1")).toBe("My Game");
    expect(player.romNameFromUrl("%3Cb%3Edemo%3C%2Fb%3E.gba")).toBe(
      "<b>demo</b>",
    );
  });

  test("reads optional ROM query links", () => {
    expect(player.romUrlFromSearch("?rom=roms%2Fdemo.gba")).toBe(
      "roms/demo.gba",
    );
    expect(player.romUrlFromSearch("?other=1")).toBeNull();
  });

  test("matches a selected CI demo while ignoring cache parameters", () => {
    expect(
      player.demoFromUrl("roms/isometric-adventure.gba?build=123"),
    ).toMatchObject({
      title: "The Sunstone Relay",
      tag: "Isometric",
    });
    expect(player.demoFromUrl("roms/custom.gba")).toBeUndefined();
  });

  test("configures EmulatorJS for the GBA core", () => {
    const target = {};
    player.configureEmulator(target, "roms/demo.gba");
    expect(target).toMatchObject({
      EJS_player: "#game",
      EJS_core: "gba",
      EJS_controlScheme: "gba",
      EJS_gameUrl: "roms/demo.gba",
      EJS_startOnLoaded: false,
      EJS_startButtonName: "Play GBA Studio Game",
    });
  });

  test("launches each game in a clean isolated emulator frame", () => {
    expect(player.emulatorUrl("roms/My Game.gba", "My Game")).toBe(
      "emulator.html?rom=roms%2FMy+Game.gba&name=My+Game&player=2",
    );

    const html = fs.readFileSync(
      path.resolve(__dirname, "../../docs/player/emulator.html"),
      "utf8",
    );
    expect(html).toContain('window.EJS_core = "gba"');
    expect(html).toContain("4.2.3/data/");
    expect(html).toContain("window.EJS_startOnLoaded = false");
    expect(html).toContain("window.EJS_onGameStart = function ()");
    expect(html).toContain("Play GBA Studio Game");
    expect(html).toContain('bootStatus.addEventListener("click"');
  });

  test("keeps dynamic route targets in the published player markup", () => {
    const html = fs.readFileSync(
      path.resolve(__dirname, "../../docs/player/index.html"),
      "utf8",
    );
    expect(html).toContain('id="route-title"');
    expect(html).toContain('id="route-instructions"');
    expect(html).toContain('id="emulator-status"');
    expect(html).toContain("the editor and compiler remain desktop tools");
  });

  test("links the Pages UI preview to the interactive Studio workspace", () => {
    const html = fs.readFileSync(
      path.resolve(__dirname, "../../docs/index.html"),
      "utf8",
    );
    expect(html).toContain(
      "storybook/?path=/story/gba-studio-preview--studio-workspace-preview",
    );
    expect(html).toContain("player/gba-studio-mark.svg");
  });

  test("publishes only the two fully validated feature demos", () => {
    expect(player.DEMOS).toHaveLength(2);
    expect(player.DEMOS.map((demo) => demo.url)).toEqual([
      "roms/isometric-adventure.gba",
      "roms/poachermon.gba",
    ]);
    expect(player.DEMOS.every((demo) => demo.instructions.length > 20)).toBe(
      true,
    );
    expect(player.DEMOS[0]).toMatchObject({
      title: "The Sunstone Relay",
      instructions: expect.stringContaining("Keeper Nia"),
    });
  });
});
