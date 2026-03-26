# ez-kit

Monorepo for UI-focused npm helper libraries.

## Packages

- `@ez-kit/ui` - common UI utilities
- `@ez-kit/styling` - class name and CSS variable helpers

## Stack

- `pnpm` workspaces
- `turborepo`
- `TypeScript` (`strict`)
- `ESlint + Prettier` (lint + format)
- `Vitest`
- `Changesets`
- `Fumadocs` docs app (`apps/docs`)

## Development

```bash
pnpm install
pnpm new:pkg
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Generate a package

Use the repository generator:

```bash
pnpm new:pkg
```

It scaffolds packages in both supported locations:

- `packages/<name>`
- `packages/<group>/<name>`

Generated packages follow current repository conventions:

- package name format: `@ez-kit/<kebab-name>`
- `tsconfig.json` with `@/*` alias to `src/*`
- `vitest.config.ts` that extends root `vitest.shared.ts`
- starter test at `src/index.test.ts` by default

The generator includes a prompt `includeTests` (default: `true`) so tests can be skipped when needed.

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
