# Showcase art direction

The published sample games use two deliberately separate visual identities:

- **Poachermon: Case 001** is a humane conservation mystery built around a warm ranger outpost, a branching evidence trail, a wetland boundary, readable field equipment, and a cast whose silhouettes and palette slots communicate their roles immediately.
- **The Sunstone Relay** is a hopeful isometric fantasy built around a floating highland, repeating limestone routes, a mountain dawn, three beacon landmarks, and a navy/gold relay keeper contrasted with Keeper Nia and the sunstone core.

The high-resolution target boards in this folder were generated with the built-in OpenAI image-generation workflow as original visual-development references. The shipping PNGs were then rebuilt deterministically by `scripts/generate-showcase-art.js` for the actual engine constraints.

## Shipping constraints

- Backgrounds are exactly 240x160 and align to 8x8 tiles.
- Showcase scenes stay below 180 unique background tiles to avoid object-VRAM/tile-index wrapping.
- No background tile exceeds 16 colors.
- Sprites use three visible colors plus alpha transparency.
- Every sprite tile is assigned to an explicit scene palette slot.
- `npm run test:showcase-art` validates dimensions, tile budgets, colors, and transparency before CI or Pages deployment.

## Reference prompts

The Poachermon board requested a professional handheld pixel-art conservation mystery: a field ranger, Captain Rowan, witness Finn, distinct poachers Ash and Moss, a rescued forest creature, an outpost, wetland, trail cameras, footprints, fencing, snares, and evidence markers in pine, fern, ochre, navy, rust, sky blue, and cream.

The Sunstone board requested a professional handheld isometric fantasy: a navy/gold relay keeper, burgundy elder warden, faceted sunstone, beacon pedestal, floating highland, limestone diamond paths, shrine, wildflowers, pines, pools, masonry, sunrise rim light, and cool mountain shadows.
