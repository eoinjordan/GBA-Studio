# Showcase art sources

The production showcase art is derived from the following CC0/public-domain
sources. The original source files required by the deterministic compositor are
vendored beside this document so builds never depend on a mutable download.

| Source                               | Files used                                         | License | Original page                                                      |
| ------------------------------------ | -------------------------------------------------- | ------- | ------------------------------------------------------------------ |
| Kenney Roguelike/RPG Pack            | `roguelikeSheet_transparent.png`, `sample_map.tmx` | CC0 1.0 | https://kenney.nl/assets/roguelike-rpg-pack                        |
| Kenney Isometric Tiles Landscape     | selected `landscapeTiles_*.png` files              | CC0 1.0 | https://kenney.nl/assets/isometric-tiles-landscape                 |
| Kenney Foliage Pack                  | selected `foliagePack_*.png` files                 | CC0 1.0 | https://kenney.nl/assets/foliage-pack                              |
| dutzy Man Sprite                     | `villager-cc0.png`                                 | CC0 1.0 | https://opengameart.org/content/man-sprite-16x16                   |
| DezrasDragons Isometric Classic Hero | `isometric-hero-cc0.png`                           | CC0 1.0 | https://opengameart.org/content/isometric-classic-hero-tiles-32x32 |

Kenney's original license notices are included unchanged in each Kenney source
directory. Attribution is not required by CC0, but the projects and artists are
credited here in appreciation.

The source assets are cropped, composited, scaled with nearest-neighbor
sampling, recolored, and palette-quantized by
`scripts/lib/cc0-showcase-art.js`. The resulting shipping assets remain CC0.
