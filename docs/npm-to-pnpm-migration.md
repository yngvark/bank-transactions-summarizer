# Migration: npm to pnpm

## Context

The project used npm as its package manager. pnpm was chosen as a replacement for its faster install times, stricter dependency resolution (no phantom dependencies), and efficient disk usage via content-addressable storage.

## What changed

All npm references across the project were replaced with pnpm equivalents:

- **Lockfiles**: `package-lock.json` files replaced by `pnpm-lock.yaml` (generated via `pnpm import` to preserve exact versions)
- **Makefile**: All `npm install`/`npm run`/`npm test` → `pnpm install`/`pnpm run`/`pnpm test`
- **CI/CD (GitHub Actions)**: Added `pnpm/action-setup@v4` step, switched caching from `npm` to `pnpm`, replaced `npm ci` with `pnpm install --frozen-lockfile`
- **Playwright config**: `npm run dev` → `pnpm run dev` in webServer command
- **VS Code launch config**: Updated debug command
- **Claude settings**: Updated permission allowlist from npm to pnpm commands
- **Documentation**: README.md, v2/README.md, v2/TESTING.md updated with pnpm commands

## Command mapping

| npm | pnpm |
|-----|------|
| `npm install` | `pnpm install` |
| `npm ci` | `pnpm install --frozen-lockfile` |
| `npm run <script>` | `pnpm run <script>` |
| `npm test` | `pnpm test` |
| `npx <cmd>` | `pnpm exec <cmd>` (project-local) |

## Notes

- Dependabot's `package-ecosystem: "npm"` was kept as-is — it works for pnpm projects too.
- The `.idea/workspace.xml` (JetBrains IDE) was not modified as it's a local IDE artifact.
- pnpm lockfiles were generated using `pnpm import` from existing `package-lock.json` to ensure dependency version continuity.
