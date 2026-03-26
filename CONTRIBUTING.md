# Contributing

## Prerequisites

- Node.js active LTS
- `pnpm` installed globally

## Setup

```bash
pnpm install
```

## Daily workflow

1. Create a branch from `main`.
2. Implement changes in one or more packages.
3. Run checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm size
```

4. If a public package changes, add a changeset:

```bash
pnpm changeset
```

5. Open a pull request.

## Package conventions

- Export public API only through `src/index.ts`.
- Keep each package `ESM-only`.
- Include tests for happy-path and key edge-cases.
- Add examples to package `README.md` and docs app when API changes.
