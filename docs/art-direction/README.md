# Showcase art direction

The published sample games use two deliberately separate visual identities:

- **Poachermon: Case 001** is a humane conservation mystery built around a warm ranger outpost, a branching evidence trail, a wetland boundary, readable field equipment, and a cast whose silhouettes and palette slots communicate their roles immediately.
- **The Sunstone Relay** is a hopeful isometric fantasy built around a floating highland, repeating limestone routes, a mountain dawn, three beacon landmarks, and a navy/gold relay keeper contrasted with Keeper Nia and the sunstone core.

The `v2` high-resolution target boards in this folder were generated with the
built-in OpenAI image-generation workflow as visual-development references.
The shipping PNGs are built deterministically from audited CC0 source sheets by
`scripts/generate-showcase-art.js` and `scripts/lib/cc0-showcase-art.js`.

## Shipping constraints

- Backgrounds are exactly 240x160 and align to 8x8 tiles.
- Showcase scenes stay below 180 unique background tiles to avoid object-VRAM/tile-index wrapping.
- No background tile exceeds 16 colors.
- Sprites use three visible colors plus alpha transparency.
- Every sprite tile is assigned to an explicit scene palette slot.
- `npm run test:showcase-art` validates dimensions, tile budgets, colors, and transparency before CI or Pages deployment.

## Reference prompts

The Poachermon v2 board requested a polished 240x160 top-down pixel-art
conservation mystery using the supplied CC0 16x16 RPG tiles as a style
reference: a forest ranger outpost, reed-lined wetland, looping trail, field
office, lookout, evidence tent, habitat fence, trail camera, footprints, snares,
the ranger cast, and a rescued creature, with no UI, text, logos, or watermark.

The Sunstone Relay v2 board requested a polished 240x160 isometric pixel-art
fantasy scene using the supplied CC0 landscape and hero sheets as projection
references: one coherent 8x7 floating sanctuary, connected limestone paths,
spring, shrine, pines, wildflowers, three beacons, the two keepers, and a glowing
sunstone, with no UI, text, logos, or watermark.
