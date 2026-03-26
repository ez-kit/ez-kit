# ez-kit

Monorepo for UI-focused npm helper libraries.

## Packages

- `@ez-kit/ui` - common UI utilities
- `@ez-kit/styling` - class name and CSS variable helpers

## Stack

- `pnpm` workspaces
- `turborepo`
- `TypeScript` (`strict`)
- `Biome` (lint + format)
- `Vitest`
- `Changesets`
- `Fumadocs` docs app (`apps/docs`)

## Development

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Docs

```bash
pnpm docs:dev
```

## Release flow

```bash
pnpm changeset
pnpm version-packages
pnpm release
```

## Node support

Only active Node.js LTS versions are supported.