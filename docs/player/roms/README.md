# Demo ROM output

The GitHub Pages workflow builds this directory at deploy time. ROM binaries
are intentionally not committed to the repository.

The current public demos are generated from:

- `examples/starter-project/project.gbsproj`
- `examples/isometric-adventure/project.gbsproj`

To add a demo, update the build commands in `.github/workflows/web.yml` and the
matching metadata in `docs/player/player.js`. `scripts/validate-pages.js`
requires every listed ROM to exist and contain a valid GBA header before the
Pages artifact can deploy.

Only publish projects and assets that are licensed for redistribution.
