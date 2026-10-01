import { hardwareCommand, runTool } from "../../src/lib/handheld/run";
import type { HandheldConfig } from "../../src/shared/lib/handheld/types";
import fs from "fs";
import os from "os";
import Path from "path";

describe("handheld deployment", () => {
  const directory = fs.mkdtempSync(Path.join(os.tmpdir(), "studio space "));
  const config: HandheldConfig = {
    python: process.execPath,
    llvm: "",
    fpga: directory,
    gowin: "Gowin install",
    port: "COM5",
    cableIndex: 1,
    sram: true,
  };
  beforeAll(() => {
    fs.mkdirSync(Path.join(directory, "scripts"));
    for (const script of ["gbafpga.py", "load-studio-lcd.py"])
      fs.writeFileSync(Path.join(directory, "scripts", script), "");
  });
  afterAll(() => fs.rmSync(directory, { recursive: true, force: true }));
  test("flash selects native firmware, configured port, cable and SRAM", () => {
    const args = hardwareCommand("flash", config, directory);
    expect(args).toContain("studio_lcd");
    expect(args).toContain("--sram");
    expect(args[args.indexOf("--game") + 1]).toBe(
      Path.join(directory, "firmware"),
    );
    expect(args[args.indexOf("--port") + 1]).toBe("COM5");
  });
  test("invalid connection never produces a flash command", () => {
    expect(() =>
      hardwareCommand("flash", { ...config, port: "" }, directory),
    ).toThrow("UART");
    expect(() =>
      hardwareCommand("flash", { ...config, cableIndex: -1 }, directory),
    ).toThrow("Cable");
  });
  test("paths and shell characters stay literal; failures propagate", async () => {
    const log = jest.fn();
    await runTool(
      process.execPath,
      ["-e", "console.log(process.argv[1])", "path with spaces & $(echo no)"],
      log,
    );
    expect(log.mock.calls.map((call) => call[0]).join("")).toContain(
      "path with spaces & $(echo no)",
    );
    await expect(
      runTool(process.execPath, ["-e", "process.exit(7)"], log),
    ).rejects.toThrow("7");
  });
});
