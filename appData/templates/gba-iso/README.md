# The Sunstone Relay

The Sunstone Relay is a complete isometric GBA Studio mini-adventure. Restore a village signal by navigating the diamond grid, activating both path beacons, recovering the lake core, and reporting back to Keeper Nia.

## Play loop

1. Talk to **Keeper Nia** with **A**.
2. Follow the path west and step on the **west signal marker**.
3. Follow the path east and step on the **east signal marker**.
4. Return to the lake and press **A** beside the green **Sunstone Core**.
5. Report back to Nia to reach the completion scene.

The isometric D-pad mapping follows the diamond axes: **Up = north-east**, **Down = south-west**, **Left = north-west**, and **Right = south-east**. Press **START** on the ending scene to replay.

## Feature coverage

The demo exercises native isometric projection and four-direction movement, a complete 8x7 collision grid aligned to the 240-pixel-wide world art, trigger entry scripts, NPC and object interaction, persistent variables, conditional branches, objective counters, palette feedback, actor deactivation, scene switching, and a deterministic ending.

`test/examples/isometric-adventure.test.js` keeps the distributable template aligned with this example, verifies every objective is reachable through collision, rejects unsupported events, and executes the complete quest as a state-machine test.

All bundled art is original redistributable pixel art and contains no third-party ROM assets.
