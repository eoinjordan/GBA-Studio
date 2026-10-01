# Three-scene game validation — 1 October 2026

Both games now have a separate opening title, three playable areas, an ending and replay. Their example projects and portable templates contain matching resources.

| Game | Playable areas | Completion |
| --- | --- | --- |
| The Sunstone Relay | Keeper Village, Windridge, Sunstone Sanctum | Two beacons, lake core, report to Nia |
| Poachermon: Case 001 | Ranger Outpost, Snare Trail, Reedbank | Two snares, two arrests, rescue, report to Rowan |

Returning to an earlier area preserves progress. Repeated objectives cannot award credit twice. START advances the title or completed ending; it cannot skip unfinished areas. Replay resets the campaign.

The GBA engine uses halfword writes for background VRAM, correcting distorted pixels and title lettering on GBA/mGBA. Dialogue compiles into 28-column, two-line pages, so later instructions remain visible.

Browser controls stay below the game inside a viewport-sized frame. Keyboard and pointer taps last at least 85 ms; held directions continue until release. Losing focus releases held inputs. Keyboard input works from the game or the surrounding player page. Published ROMs use their SHA-256 in the launch URL to avoid stale game caches; `player/rom-manifest.json` records each deployed revision and ROM hash.

Validation:

- 63 compiler, player and campaign checks passed.
- Engine host tests: 92 VM/unit, 23 integration and one textbox test passed. Tang renderer tests passed.
- Both exported campaigns ran through the actual C engine with mock hardware: title, objective gates, repeat interactions, return visits, ending and replay passed. Test placements exercise interactions and trigger entry; separate collision searches verify reachable routes.
- Both ARM GBA ROMs and RV32IM Tang firmware compiled successfully.
- Both games completed through all three areas using normal browser keyboard input. Sunstone replay returned to the title. Poachermon reached its closed-case ending.

The current hardware upload could not run because the previously used COM5 device is absent. This build has no new camera or LCD measurement. The earlier Windows installation and hardware test remain recorded separately in `windows-local-e2e-2026-10-01.json`.

Reproduce the campaign checks after exporting a game:

```sh
python3 scripts/test-campaign-runtime.py out/campaign-sunstone --sunstone
python3 scripts/test-campaign-runtime.py out/campaign-poachermon
```

The Pages workflow compiles and checks both exported campaigns before deployment, then verifies ROM headers and manifest hashes.
