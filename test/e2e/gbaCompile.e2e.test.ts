import os from "os";
import compile from "../../src/lib/compiler/compileData";
import { getTestScriptHandlers } from "../getTestScriptHandlers";
import { ProjectResources } from "shared/lib/resources/types";

test("GBA compile emits valid C for constant variable events", async () => {
  const scriptEventHandlers = await getTestScriptHandlers();
  const project = {
    settings: {
      startSceneId: "scene1",
      startX: 0,
      startY: 0,
      startDirection: "up",
      colorCorrection: "default",
      colorMode: "mono",
      defaultFontId: "font1",
      defaultPlayerSprites: {},
    },
    scenes: [
      {
        id: "scene1",
        name: "first_scene",
        symbol: "scene_1",
        type: "TOPDOWN",
        backgroundId: "bg1",
        tilesetId: "",
        colorModeOverride: "none",
        width: 20,
        height: 18,
        collisions: new Array(20 * 18).fill(0),
        actors: [],
        triggers: [
          {
            id: "trigger1",
            symbol: "trigger_1",
            x: 1,
            y: 2,
            width: 2,
            height: 2,
            script: [
              {
                command: "EVENT_SET_VALUE",
                args: { variable: "VAR_3", value: { type: "true" } },
              },
              {
                command: "EVENT_SET_VALUE",
                args: {
                  variable: "VAR_VARIABLE_4",
                  value: { type: "number", value: 7 },
                },
              },
              {
                command: "EVENT_SET_VALUE",
                args: { variable: "5", value: { type: "false" } },
              },
            ],
            leaveScript: [],
          },
        ],
        script: [],
        playerHit1Script: [],
        playerHit2Script: [],
        playerHit3Script: [],
      },
    ],
    backgrounds: [
      {
        id: "bg1",
        name: "forest_clearing",
        symbol: "bg_1",
        width: 20,
        height: 18,
        imageWidth: 160,
        imageHeight: 144,
        filename: "forest_clearing.png",
        tileColors: [],
      },
    ],
    tilesets: [],
    sprites: [],
    music: [],
    sounds: [],
    fonts: [
      {
        id: "font1",
        name: "gbs-mono",
        symbol: "font_1",
        filename: "gbs-mono.png",
      },
    ],
    palettes: [],
    avatars: [],
    emotes: [],
    variables: {
      variables: [],
      constants: [],
    },
    engineFieldValues: {
      engineFieldValues: [],
    },
  } as unknown as ProjectResources;

  const compiled = await compile(project, {
    projectRoot: `${__dirname}/../compiler/_files`,
    scriptEventHandlers,
    engineSchema: {
      fields: [],
      sceneTypes: [],
      consts: {},
    },
    tmpPath: os.tmpdir(),
    debugEnabled: false,
    progress: (_msg: string) => {},
    warnings: (_msg: string) => {},
    buildType: "gba",
  });

  const sceneData = compiled.files["gba_scene_data.c"];

  expect(sceneData).toContain("scene_1_trigger_0_script");
  expect(sceneData).not.toMatch(/NaN/i);
  expect(sceneData).toMatch(/0x04,\s+0x03,\s+0x01/);
  expect(sceneData).toMatch(/0x04,\s+0x04,\s+0x07/);
  expect(sceneData).toMatch(/0x04,\s+0x05,\s+0x00/);
  expect(sceneData).toMatch(
    /const gba_game_data_t gba_game_data = \{\s+1,\s+0,\s+0,\s+0,\s+3,/,
  );
});
