# Build a Studio game for Tang Nano 20K

The Tang export compiles the same Studio project and GBA-engine C runtime
for a RISC-V CPU on the Nano 20K. It produces `game.tang.bin`. The existing
`.gba` export compiles for the Game Boy Advance's ARM CPU.

The Tang platform uses the 4.3-inch 480x272 RGB565 panel already used by
GBA-FPGA. It displays a centred 240x160 game image. ROM assets, scripts and
runtime state use SDRAM, while the FPGA draws tiles, sprites and dialogue.
Games load over the board's USB UART without an SD card.

## Desktop controls

Open a project and choose **Handheld** in the toolbar. Configure Python,
the GBA-FPGA checkout, USB UART and programmer. **Build game** exports the
current editor state to `build/tang/firmware/game.tang.bin`.
**Build + load game** uploads it to the installed platform.
**Flash FPGA + load** programs the platform and then uploads the game.
The panel shows the build log, CRC, CPU status and measured frame rate.

SRAM configuration is selected by default for temporary tests. Uncheck it
to write the FPGA configuration to flash. The game itself remains in SDRAM
and needs another upload after power-off or FPGA reprogramming.

The tested Windows cable uses index **4** (USB Debugger A), USB location
**289**, and UART **COM5**. Get current locations with Gowin's
`programmer_cli --scan-cables`; enumeration and driver types can change.
Builds require Python, LLVM and the GBA-FPGA checkout even in the installed
Studio application. USB loading additionally requires pyserial.

## One-command build, flash and load

```sh
python scripts/build-tang.py examples/isometric-adventure/project.gbsproj out/tang/relay --port COM5 --flash --sram --cable-index 4 --location 289
```

To use a game directory directly, copy `game.tang.bin` and `build.json` into
GBA-FPGA's `tangnano20k/studio_lcd/game/`. Its `flash studio_lcd --port ...`
command finds and loads that game automatically. An ARM `.gba` file cannot
replace the native Tang export.

1. Update the bundled engine: `git submodule update --init --recursive`.
2. Install Node.js, Python 3, LLVM (clang, LLD, llvm-objcopy), and pyserial:
   `python -m pip install pyserial`.
3. Clone [GBA-FPGA](https://github.com/eoinjordan/GBA-FPGA), check out its
   `tangnano20k` branch, and follow
   [studio_lcd](https://github.com/eoinjordan/GBA-FPGA/tree/tangnano20k/tangnano20k/studio_lcd)
   to build/import its Gowin project and program SRAM once.
4. In this Studio checkout, run `npm ci`, then `npm run make:cli` once.
5. Build and load your project:

```sh
python scripts/build-tang.py path/to/project.gbsproj out/tang/my-game --port COM5
```

For the built-in Blank GBA project:

```sh
python scripts/build-tang.py appData/templates/gba-blank/project.gbsproj out/tang/blank --port COM5
```

For the Poachermon game:

```sh
python scripts/build-tang.py examples/poachermon/project.gbsproj out/tang/poachermon --port COM5
```

Press A to advance its opening dialogue, then use the D-pad to move.
Poachermon measured about 29 game fps on the LCD.

Omit `--port` to compile without loading hardware. The output directory
contains `data/` (exported C), `firmware/game.tang.bin`, `game.elf`, a linker
map, `build.json` with firmware/source hashes, and `hardware.json` after
upload. The hardware report records transfer CRC, CPU faults, program
counter and measured game frames per second.

The default engine is the bundled `appData/engine/gbavm` submodule.
`--engine PATH` selects another GBA-engine checkout. The FPGA checkout
defaults to the sibling `GBA-FPGA` folder; set `--fpga PATH` when elsewhere.
Set `--llvm PATH` to LLVM's bin directory or `--node PATH` to Node's binary
if those tools are not on PATH. Windows also checks LLVM's usual
`C:/Program Files/LLVM/bin` location.

Windows, Linux and macOS support the export, firmware compile and USB
loading steps. Use `/dev/ttyUSB*` on Linux or `/dev/cu.*` on macOS. Gowin's
FPGA build runs on Windows/Linux; macOS can program a prebuilt image with
openFPGALoader. Close Gowin Programmer before opening the UART.

On Linux, install `clang`, `lld` and `llvm` from your distribution.
On macOS, install Homebrew's `llvm` and pass
`--llvm "$(brew --prefix llvm)/bin"`. Apple's system Clang alone does not
provide the complete cross-compilation toolchain. Hardware validation was
performed on Windows; Linux/macOS instructions use the same portable scripts.
Use `python3` in place of `python` on Linux/macOS. If your Python installation
requires a virtual environment, create one with `python3 -m venv .venv`,
activate it with `source .venv/bin/activate`, and install pyserial there.

S1 is Start and S2 is A. Serial input can also drive the D-pad:

```sh
python ../GBA-FPGA/scripts/load-studio-lcd.py --port COM5 --keys 16 --hold 0.5
```

Masks: A=1, B=2, Select=4, Start=8, Right=16, Left=32, Up=64, Down=128.
The engine's Start shortcut changes scenes once per press. Buttons on
external passive PCBs still require a verified GPIO assignment.

Supported graphics are Mode 0 BG0/BG1 with 4bpp tiles, scrolling, flips,
palette banks and regular 1D-mapped sprites. The engine handles supported
movement, collision, scripts and dialogue. Affine sprites, 8bpp graphics,
blending, audio and persistent saves are not implemented. The single
framebuffer can tear. The Studio starter title measured 57.9 game fps
on hardware; its menu scenes measured about 29 fps. Scene complexity can
reduce the update rate while the LCD continues scanning at 58 Hz.
The GBA compiler warns about unsupported Studio events and skips them;
check the export log when porting an existing project.

For an independent C export, use:

```sh
node out/cli/gb-studio-cli.js export path/to/project.gbsproj out/gba-data --target gba
```

The Tang workflow calls this GBA data compiler directly, so an intermediate
ARM ROM and devkitARM installation are not required.
