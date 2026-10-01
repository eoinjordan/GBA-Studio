import { spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import Path from "path";
import type { HandheldAction, HandheldConfig } from "shared/lib/handheld/types";

export function hardwareCommand(
  action: HandheldAction,
  config: HandheldConfig,
  output: string,
) {
  if (!["build", "load", "flash"].includes(action))
    throw new Error("Unknown handheld action");
  if (!config.python.trim()) throw new Error("Choose a Python executable");
  if (action === "build") return [];
  if (!config.port.trim()) throw new Error("Choose the board's USB UART port");
  const script = Path.join(
    config.fpga,
    "scripts",
    action === "flash" ? "gbafpga.py" : "load-studio-lcd.py",
  );
  if (!existsSync(script))
    throw new Error(
      "Select a GBA-FPGA checkout containing the hardware scripts",
    );
  const report = Path.join(output, "hardware.json");
  if (action === "load")
    return [
      script,
      "--port",
      config.port,
      "--firmware",
      Path.join(output, "firmware", "game.tang.bin"),
      "--report",
      report,
    ];
  if (!Number.isInteger(config.cableIndex) || config.cableIndex < 0)
    throw new Error("Cable index must be a non-negative integer");
  return [
    script,
    "flash",
    "studio_lcd",
    "--game",
    Path.join(output, "firmware"),
    "--port",
    config.port,
    "--cable-index",
    String(config.cableIndex),
    ...(config.location?.trim() ? ["--location", config.location.trim()] : []),
    "--report",
    report,
    ...(config.sram ? ["--sram"] : []),
    ...(config.gowin ? ["--tool", "gowin", "--gowin", config.gowin] : []),
  ];
}

export function runTool(
  executable: string,
  args: string[],
  log: (text: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Argument arrays preserve paths with spaces; never invoke a shell.
    const child = spawn(executable, args, {
      windowsHide: true,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });
    child.stdout.on("data", (chunk) => log(chunk.toString()));
    child.stderr.on("data", (chunk) => log(chunk.toString()));
    child.on("error", (error) =>
      reject(new Error(`Could not start ${executable}: ${error.message}`)),
    );
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(`Hardware command failed (${code}). See the log above.`),
          ),
    );
  });
}

export function readHardwareReport(output: string) {
  return JSON.parse(readFileSync(Path.join(output, "hardware.json"), "utf8"));
}
