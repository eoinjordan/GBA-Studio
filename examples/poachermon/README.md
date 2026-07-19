# Poachermon: Beige Crimes Unit

Case 001, “The Snare Affair,” is a complete one-screen conservation mystery built as the GBA Studio feature demo.

## Play loop

1. Talk to Captain Rowan with **A**.
2. Tag any two evidence sources: the west snare, east snare, or trail-camera zone near the office path.
3. Confront Poacher Ash on the west side and Poacher Moss on the east side.
4. Free the trapped pink creature, then report back to Rowan to close the case.

Hold **B** while talking to Witness Finn for the quiet clue. The final case screen reports the generated field score; **START** reopens the patrol.

## GBA feature coverage

The demo exercises scene-start and interaction scripts, custom events, variables and arithmetic, random values, branching, input checks, text interpolation, waits, palette tones, actor positioning/movement/direction, activation, collision toggles, scene triggers, runtime actor conditions, scene switching, background collision, and animated sprites.

`test/examples/poachermon.test.js` keeps the example and distributable template aligned and rejects unsupported script events. GitHub Actions compiles the ROM for CI and publishes it to the browser player.

All bundled art is original redistributable pixel art and contains no third-party ROM assets.
