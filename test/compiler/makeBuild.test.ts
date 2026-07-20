import fs from "fs-extra";
import os from "os";
import Path from "path";
import makeBuild from "lib/compiler/makeBuild";
import spawn from "lib/helpers/cli/spawn";
import ensureBuildTools from "lib/compiler/ensureBuildTools";
import {
  buildLinkFile,
  buildLinkFlags,
  getBuildCommands,
} from "lib/compiler/buildMakeScript";
import { cacheObjData, fetchCachedObjData } from "lib/compiler/objCache";
import {
  getDevKitProPaths,
  isUsableGcc,
  validateDevKitPro,
} from "lib/helpers/devkitpro";
import { ProjectResources } from "shared/lib/resources/types";

jest.mock("lib/helpers/cli/spawn");
jest.mock("lib/compiler/ensureBuildTools");
jest.mock("lib/compiler/buildMakeScript");
jest.mock("lib/compiler/objCache");
jest.mock("lib/helpers/devkitpro");

const spawnMock = spawn as jest.MockedFunction<typeof spawn>;
const ensureBuildToolsMock = ensureBuildTools as jest.MockedFunction<
  typeof ensureBuildTools
>;
const getBuildCommandsMock = getBuildCommands as jest.MockedFunction<
  typeof getBuildCommands
>;
const buildLinkFileMock = buildLinkFile as jest.MockedFunction<
  typeof buildLinkFile
>;
const buildLinkFlagsMock = buildLinkFlags as jest.MockedFunction<
  typeof buildLinkFlags
>;
const cacheObjDataMock = cacheObjData as jest.MockedFunction<
  typeof cacheObjData
>;
const fetchCachedObjDataMock = fetchCachedObjData as jest.MockedFunction<
  typeof fetchCachedObjData
>;
const getDevKitProPathsMock = getDevKitProPaths as jest.MockedFunction<
  typeof getDevKitProPaths
>;
const isUsableGccMock = isUsableGcc as jest.MockedFunction<typeof isUsableGcc>;
const validateDevKitProMock = validateDevKitPro as jest.MockedFunction<
  typeof validateDevKitPro
>;

describe("GBA build process invocation", () => {
  let testRoot = "";
  let buildRoot = "";
  let toolsRoot = "";
  const originalDevKitPro = process.env.DEVKITPRO;
  const originalDevKitArm = process.env.DEVKITARM;

  beforeEach(async () => {
    jest.clearAllMocks();
    testRoot = await fs.mkdtemp(Path.join(os.tmpdir(), "gba-make-build-"));
    buildRoot = Path.join(testRoot, "build-root");
    toolsRoot = Path.join(testRoot, "tools");
    await fs.outputFile(Path.join(toolsRoot, "tools_version"), "test-tools");
    await fs.outputFile(
      Path.join(buildRoot, "include", "data", "game_globals.i"),
      "TEST_GLOBAL = 0\n",
    );
    await fs.ensureDir(Path.join(buildRoot, "obj"));
    await fs.ensureDir(Path.join(buildRoot, "build", "rom"));

    ensureBuildToolsMock.mockResolvedValue(toolsRoot);
    getBuildCommandsMock.mockResolvedValue([]);
    buildLinkFileMock.mockResolvedValue("obj/main.o\n");
    buildLinkFlagsMock.mockReturnValue([
      "-o",
      "build/rom/My Isometric Game.elf",
      "@obj/linkfile.lk",
    ]);
    fetchCachedObjDataMock.mockResolvedValue(undefined);
    cacheObjDataMock.mockResolvedValue(undefined);
    getDevKitProPathsMock.mockReturnValue({
      devkitPro: "C:/devkitPro",
      devkitArm: "C:/devkitPro/devkitARM",
      gccPath: "C:/devkitPro/devkitARM/bin/arm-none-eabi-gcc.exe",
      isValid: true,
    });
    isUsableGccMock.mockReturnValue(true);
    validateDevKitProMock.mockReturnValue(undefined);
    spawnMock.mockReturnValue({
      child: { pid: 123 } as ReturnType<typeof spawn>["child"],
      completed: Promise.resolve(),
    });
  });

  afterEach(async () => {
    if (originalDevKitPro === undefined) {
      delete process.env.DEVKITPRO;
    } else {
      process.env.DEVKITPRO = originalDevKitPro;
    }
    if (originalDevKitArm === undefined) {
      delete process.env.DEVKITARM;
    } else {
      process.env.DEVKITARM = originalDevKitArm;
    }
    await fs.remove(testRoot);
  });

  it("bypasses the shell so ROM filenames containing spaces stay one argument", async () => {
    const data = {
      metadata: { name: "Isometric Adventure" },
      settings: {
        colorMode: "color",
        sgbEnabled: false,
        batterylessEnabled: false,
        musicDriver: "huge",
        cartType: "mbc5",
        compilerPreset: 3000,
      },
    } as ProjectResources;

    await makeBuild({
      buildRoot,
      romFilename: "My Isometric Game.gba",
      tmpPath: testRoot,
      data,
      buildType: "gba",
      debug: false,
      progress: jest.fn(),
      warnings: jest.fn(),
    });

    expect(spawnMock).toHaveBeenCalledTimes(3);
    for (const [, , options] of spawnMock.mock.calls) {
      expect(options.shell).toBe(false);
    }

    const gbafixExecutable =
      process.platform === "win32" ? "gbafix.exe" : "gbafix";
    const gbafixCall = spawnMock.mock.calls.find(([command]) =>
      command
        .replace(/\\/g, "/")
        .endsWith(`/tools/bin/${gbafixExecutable}`),
    );
    expect(gbafixCall?.[1]).toEqual(["build/rom/My Isometric Game.gba"]);
  });
});
